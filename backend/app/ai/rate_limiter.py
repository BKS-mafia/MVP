"""
Модуль для управления запросами к AI API.

Предотвращает 429 (Too Many Requests) ошибки через:
1. Очередь запросов - если предыдущий запрос ещё обрабатывается, следующий ждёт
2. Rate limiting - ограничение количества запросов в единицу времени
3. Retry с exponential backoff - автоматический повтор при 429 ошибке
4. Индикатор "AI думает..." - отправка событий клиентам
"""
import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class QueuedRequest:
    """Запрос в очереди."""
    future: asyncio.Future = field(default_factory=asyncio.Future)
    priority: int = 0  # Приоритет (меньше = выше приоритет)


class RateLimiter:
    """
    Rate limiter с sliding window algorithm.
    Ограничивает количество запросов к API в единицу времени.
    """
    
    def __init__(
        self,
        max_requests: int = 10,  # Максимум запросов
        window_seconds: float = 60.0,  # Окно в секундах
    ):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: deque = deque()  # Время каждого запроса
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> float:
        """
        Получить разрешение на запрос.
        Если лимит превышен - ждёт необходимое время.
        
        Returns:
            Время до следующего возможного запроса (0 если запрос разрешён)
        """
        async with self._lock:
            now = time.time()
            
            # Удаляем устаревшие запросы из окна
            while self.requests and self.requests[0] < now - self.window_seconds:
                self.requests.popleft()
            
            # Проверяем лимит
            if len(self.requests) < self.max_requests:
                self.requests.append(now)
                return 0.0
            
            # Вычисляем время до освобождения слота
            oldest = self.requests[0]
            wait_time = self.window_seconds - (now - oldest)
            
            logger.debug(
                f"Rate limit reached ({len(self.requests)}/{self.max_requests}). "
                f"Waiting {wait_time:.2f}s"
            )
            
            return max(0.0, wait_time)
    
    async def wait_and_acquire(self) -> None:
        """Ждать пока не появится слот для запроса."""
        while True:
            wait_time = await self.acquire()
            if wait_time <= 0:
                return
            await asyncio.sleep(wait_time)
    
    def get_stats(self) -> Dict[str, Any]:
        """Получить статистику rate limiter."""
        now = time.time()
        # Удаляем устаревшие запросы для подсчёта
        active = sum(1 for t in self.requests if t >= now - self.window_seconds)
        return {
            "active_requests": active,
            "max_requests": self.max_requests,
            "window_seconds": self.window_seconds,
            "utilization": active / self.max_requests if self.max_requests > 0 else 0,
        }


class AIRequestQueue:
    """
    Очередь запросов к AI с семафором.
    Гарантирует что запросы выполняются последовательно или с ограниченным параллелизмом.
    """
    
    def __init__(
        self,
        max_concurrent: int = 3,  # Максимум параллельных запросов
        max_queue_size: int = 100,  # Максимум запросов в очереди
    ):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.max_concurrent = max_concurrent
        self.max_queue_size = max_queue_size
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=max_queue_size)
        self.active_count = 0
        self._lock = asyncio.Lock()
        self._total_processed = 0
        self._total_failed = 0
    
    async def enqueue(
        self,
        coro: Callable[[], Any],
        priority: int = 0,
    ) -> Any:
        """
        Поставить запрос в очередь и выполнить его.
        
        Args:
            coro: Корутина для выполнения
            priority: Приоритет (меньше = выше приоритет)
            
        Returns:
            Результат выполнения корутины
        """
        # Ограничиваем размер очереди
        if self.queue.full():
            logger.warning(f"AI request queue full ({self.max_queue_size}), waiting...")
            # Ждём пока освободится место
            await asyncio.sleep(0.1)
        
        async with self._lock:
            self.active_count += 1
        
        try:
            # Используем семафор для ограничения параллелизма
            async with self.semaphore:
                result = await coro()
                self._total_processed += 1
                return result
        except Exception as e:
            self._total_failed += 1
            raise
        finally:
            async with self._lock:
                self.active_count -= 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Получить статистику очереди."""
        return {
            "active_count": self.active_count,
            "max_concurrent": self.max_concurrent,
            "queue_size": self.queue.qsize(),
            "max_queue_size": self.max_queue_size,
            "total_processed": self._total_processed,
            "total_failed": self._total_failed,
        }


class ExponentialBackoff:
    """
    Exponential backoff для retry при ошибках.
    """
    
    def __init__(
        self,
        base_delay: float = 1.0,  # Базовая задержка в секундах
        max_delay: float = 60.0,  # Максимальная задержка
        max_retries: int = 5,  # Максимум попыток
        multiplier: float = 2.0,  # Множитель для каждой попытки
        jitter: bool = True,  # Добавлять случайность
    ):
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.max_retries = max_retries
        self.multiplier = multiplier
        self.jitter = jitter
    
    def get_delay(self, attempt: int) -> float:
        """
        Получить задержку для попытки номер attempt.
        
        Args:
            attempt: Номер попытки (0-based)
            
        Returns:
            Задержка в секундах
        """
        import random
        
        delay = min(self.base_delay * (self.multiplier ** attempt), self.max_delay)
        
        if self.jitter:
            # Добавляем случайность ±25%
            jitter_range = delay * 0.25
            delay += random.uniform(-jitter_range, jitter_range)
        
        return max(0.0, delay)
    
    def should_retry(self, attempt: int, error: Exception) -> bool:
        """
        Определить, нужно ли повторять запрос.
        
        Args:
            attempt: Номер попытки (0-based)
            error: Исключение
            
        Returns:
            True если нужно повторить
        """
        if attempt >= self.max_retries:
            return False
        
        # Повторяем при 429 (Too Many Requests) и 500-503 ошибках
        error_str = str(error).lower()
        if "429" in error_str or "429" in repr(error):
            return True
        if "500" in error_str or "502" in error_str or "503" in error_str:
            return True
        if "rate limit" in error_str or "rate_limit" in error_str:
            return True
        
        return False


class AIRequestManager:
    """
    Главный менеджер для управления запросами к AI API.
    Объединяет queue, rate limiting и retry.
    
    Использование:
        manager = AIRequestManager()
        
        # Простой запрос
        result = await manager.execute(
            lambda: client.generate_response(messages)
        )
        
        # Запрос с уведомлением клиентов
        result = await manager.execute(
            lambda: client.generate_response(messages),
            room_id=room_id,
            player_ids=[p1.id, p2.id],
            notify_thinking=True
        )
    """
    
    def __init__(
        self,
        max_concurrent: int = 3,
        max_requests_per_minute: int = 10,
        max_retries: int = 5,
        base_delay: float = 2.0,
    ):
        self.queue = AIRequestQueue(max_concurrent=max_concurrent)
        self.rate_limiter = RateLimiter(
            max_requests=max_requests_per_minute,
            window_seconds=60.0,
        )
        self.backoff = ExponentialBackoff(
            base_delay=base_delay,
            max_delay=60.0,
            max_retries=max_retries,
        )
        self._ws_manager = None  # Устанавливается отдельно
    
    def set_ws_manager(self, ws_manager) -> None:
        """Установить WebSocket manager для отправки уведомлений."""
        self._ws_manager = ws_manager
    
    async def _notify_thinking(
        self,
        room_id: int,
        player_ids: List[int],
        status: str = "thinking",
    ) -> None:
        """Отправить уведомление 'AI думает' клиентам."""
        if not self._ws_manager:
            return
        
        message = {
            "type": "ai_thinking",
            "status": status,  # "thinking" | "finished" | "error"
        }
        
        try:
            if player_ids:
                await self._ws_manager.broadcast_to_players(player_ids, message)
            elif room_id:
                await self._ws_manager.broadcast_to_room(room_id, message)
        except Exception as e:
            logger.warning(f"Failed to send AI thinking notification: {e}")
    
    async def execute(
        self,
        coro_factory: Callable[[], Any],
        room_id: Optional[int] = None,
        player_ids: Optional[List[int]] = None,
        notify_thinking: bool = False,
        thinking_duration_hint: float = 5.0,
    ) -> Any:
        """
        Выполнить запрос к AI с автоматическим retry и rate limiting.
        
        Args:
            coro_factory: Фабрика корутины (создаёт новую корутину для выполнения)
            room_id: ID комнаты для уведомлений
            player_ids: Список ID игроков для уведомлений
            notify_thinking: Отправлять ли уведомления "AI думает"
            thinking_duration_hint: Ожидаемая длительность для отправки событий
            
        Returns:
            Результат выполнения
            
        Raises:
            Последнее исключение если все попытки исчерпаны
        """
        attempt = 0
        last_error = None
        
        while True:
            try:
                # Ждём разрешения rate limiter
                await self.rate_limiter.wait_and_acquire()
                
                # Отправляем уведомление о начале
                if notify_thinking and attempt == 0:
                    await self._notify_thinking(
                        room_id, player_ids, "thinking"
                    )
                
                # Выполняем запрос через очередь
                async def execute_request():
                    return await coro_factory()
                
                result = await self.queue.enqueue(execute_request)
                
                # Отправляем уведомление о завершении
                if notify_thinking:
                    await self._notify_thinking(
                        room_id, player_ids, "finished"
                    )
                
                return result
                
            except Exception as e:
                last_error = e
                
                # Проверяем нужно ли повторять
                if not self.backoff.should_retry(attempt, e):
                    logger.error(
                        f"AI request failed after {attempt + 1} attempts: {e}"
                    )
                    if notify_thinking:
                        await self._notify_thinking(
                            room_id, player_ids, "error"
                        )
                    raise
                
                attempt += 1
                delay = self.backoff.get_delay(attempt - 1)
                
                logger.warning(
                    f"AI request failed (attempt {attempt}): {e}. "
                    f"Retrying in {delay:.2f}s..."
                )
                
                # Отправляем уведомление о повторе
                if notify_thinking:
                    await self._notify_thinking(
                        room_id, player_ids, "retry"
                    )
                
                await asyncio.sleep(delay)
        
        # Технически сюда не попадём, но для типизации
        raise last_error
    
    def get_stats(self) -> Dict[str, Any]:
        """Получить статистику менеджера."""
        return {
            "queue": self.queue.get_stats(),
            "rate_limiter": self.rate_limiter.get_stats(),
            "backoff": {
                "base_delay": self.backoff.base_delay,
                "max_delay": self.backoff.max_delay,
                "max_retries": self.backoff.max_retries,
            },
        }


# Глобальный экземпляр
ai_request_manager = AIRequestManager()
