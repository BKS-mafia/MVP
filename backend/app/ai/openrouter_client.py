import json
import logging
from typing import Dict, Any, Optional, List
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterClient:
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.default_model = settings.DEFAULT_AI_MODEL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            # Optional: for tracking usage
            "HTTP-Referer": "https://github.com/yourusername/ai-mafia",  # Change to your actual site
            "X-Title": "AI Mafia",
        }
        self._rate_limiter = None  # Устанавливается через set_rate_limiter
    
    def set_rate_limiter(self, rate_limiter):
        """Установить rate limiter для управления запросами."""
        self._rate_limiter = rate_limiter
    
    async def _make_request(
        self,
        payload: Dict[str, Any],
        timeout: float = 60.0,
    ) -> Dict[str, Any]:
        """
        Выполнить HTTP запрос к OpenRouter API.
        
        Args:
            payload: Тело запроса
            timeout: Таймаут в секундах
            
        Returns:
            JSON ответ от API
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=self.headers,
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()
            return response.json()
    
    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_choice: Any = "auto",
    ) -> Dict[str, Any]:
        """
        Generate a response from the OpenRouter API.

        Returns the full ``message`` object from ``choices[0]``, which includes
        ``content`` as well as ``tool_calls`` when the model invokes a tool.

        Backward-compatible: callers that don't pass ``tools`` continue to work
        because the returned message still has a ``content`` key.
        
        Автоматически использует rate limiting и retry при 429 ошибках.
        """
        payload: Dict[str, Any] = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = tool_choice

        # Если есть rate limiter, используем его
        if self._rate_limiter:
            return await self._rate_limiter.execute(
                coro_factory=lambda: self._make_request(payload),
            )
        
        # Иначе делаем прямой запрос с базовым retry
        return await self._request_with_retry(payload)
    
    async def _request_with_retry(
        self,
        payload: Dict[str, Any],
        max_retries: int = 5,
        base_delay: float = 2.0,
    ) -> Dict[str, Any]:
        """
        Выполнить запрос с retry при 429 ошибках.
        
        Args:
            payload: Тело запроса
            max_retries: Максимум попыток
            base_delay: Базовая задержка в секундах
        """
        import asyncio
        import random
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        OPENROUTER_API_URL,
                        headers=self.headers,
                        json=payload,
                        timeout=60.0,
                    )
                    
                    # Проверяем код ошибки
                    if response.status_code == 429:
                        # Rate limit - вычисляем задержку
                        retry_after = response.headers.get("retry-after")
                        if retry_after:
                            delay = float(retry_after)
                        else:
                            delay = base_delay * (2 ** attempt)
                            # Добавляем случайность
                            delay += random.uniform(0, delay * 0.5)
                        
                        logger.warning(
                            f"OpenRouter rate limit (429), attempt {attempt + 1}. "
                            f"Waiting {delay:.2f}s before retry..."
                        )
                        await asyncio.sleep(delay)
                        continue
                    
                    response.raise_for_status()
                    data = response.json()
                    return data["choices"][0]["message"]
                    
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    delay = base_delay * (2 ** attempt)
                    delay += random.uniform(0, delay * 0.5)
                    logger.warning(
                        f"OpenRouter rate limit (429), attempt {attempt + 1}. "
                        f"Waiting {delay:.2f}s before retry..."
                    )
                    await asyncio.sleep(delay)
                    continue
                else:
                    logger.error(f"OpenRouter API returned an error: {e.response.text}")
                    raise
            except httpx.RequestError as e:
                logger.error(f"Request to OpenRouter failed: {e}")
                raise
        
        # Все попытки исчерпаны
        raise Exception("Max retries exceeded for OpenRouter API (429 errors)")

    async def generate_structured_response(
        self,
        messages: List[Dict[str, str]],
        schema: Dict[str, Any],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Generate a response that conforms to a given JSON schema.
        We use the OpenRouter API's ability to enforce JSON schema via the `response_format` parameter.
        Note: This requires the model to support structured outputs.
        
        Автоматически использует rate limiting и retry при 429 ошибках.
        """
        payload = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": "mafia_response", "schema": schema},
            },
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        # Если есть rate limiter, используем его
        if self._rate_limiter:
            return await self._rate_limiter.execute(
                coro_factory=lambda: self._make_request(payload),
            )
        
        # Иначе делаем прямой запрос с базовым retry
        return await self._request_with_retry(payload)
