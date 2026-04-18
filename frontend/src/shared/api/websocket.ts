// src/shared/api/websocket.ts

type EventCallback = (data: unknown) => void;

export type WebSocketEventType = 'message' | 'connect' | 'disconnect' | 'error';

interface WebSocketMessage {
    type: string;
    [key: string]: unknown;
}

class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string = '';
    private token: string = '';
    private roomId: string = '';
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;
    private isConnecting: boolean = false;
    private eventListeners: Map<WebSocketEventType, Set<EventCallback>> = new Map();
    private messageListeners: Map<string, Set<EventCallback>> = new Map();

    constructor() {
        // Инициализируем пустые сеты для всех типов событий
        this.eventListeners.set('message', new Set());
        this.eventListeners.set('connect', new Set());
        this.eventListeners.set('disconnect', new Set());
        this.eventListeners.set('error', new Set());
    }

    /**
     * Подключиться к WebSocket серверу
     * @param roomId - ID комнаты
     * @param token - токен сессии игрока
     */
    connect(roomId: string, token: string): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn('WebSocket already connected');
            return;
        }

        this.roomId = roomId;
        this.token = token;
        this.url = `ws://localhost:8000/ws/rooms/${roomId}?token=${token}`;

        this.isConnecting = true;
        
        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.emit('connect', { roomId, token });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data: WebSocketMessage = JSON.parse(event.data);
                    
                    // Эмитим событие message
                    this.emit('message', data);

                    // Эмитим специфичное событие по type
                    if (data.type) {
                        this.emitMessage(data.type, data);
                    }
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected', event.code, event.reason);
                this.isConnecting = false;
                this.emit('disconnect', { code: event.code, reason: event.reason });
                
                // Автоматическое переподключение
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.isConnecting = false;
            this.emit('error', error);
        }
    }

    /**
     * Отключиться от WebSocket сервера
     */
    disconnect(): void {
        if (this.ws) {
            this.reconnectAttempts = this.maxReconnectAttempts; // Блокируем переподключение
            this.ws.close(1000, 'Client disconnected');
            this.ws = null;
        }
    }

    /**
     * Отправить сообщение на сервер
     * @param message - объект сообщения
     */
    send(message: Record<string, unknown>): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected. Message not sent:', message);
        }
    }

    /**
     * Подписаться на событие
     * @param event - тип события ('message', 'connect', 'disconnect', 'error') или конкретный тип сообщения
     * @param callback - функция обратного вызова
     */
    on(event: string, callback: EventCallback): void {
        if (['message', 'connect', 'disconnect', 'error'].includes(event)) {
            const eventType = event as WebSocketEventType;
            const listeners = this.eventListeners.get(eventType);
            if (listeners) {
                listeners.add(callback);
            }
        } else {
            // Это конкретный тип сообщения
            if (!this.messageListeners.has(event)) {
                this.messageListeners.set(event, new Set());
            }
            this.messageListeners.get(event)!.add(callback);
        }
    }

    /**
     * Отписаться от события
     * @param event - тип события
     * @param callback - функция обратного вызова
     */
    off(event: string, callback: EventCallback): void {
        if (['message', 'connect', 'disconnect', 'error'].includes(event)) {
            const eventType = event as WebSocketEventType;
            const listeners = this.eventListeners.get(eventType);
            if (listeners) {
                listeners.delete(callback);
            }
        } else {
            const listeners = this.messageListeners.get(event);
            if (listeners) {
                listeners.delete(callback);
            }
        }
    }

    /**
     * Проверить, подключен ли клиент
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Получить текущий roomId
     */
    getRoomId(): string {
        return this.roomId;
    }

    /**
     * Получить текущий токен
     */
    getToken(): string {
        return this.token;
    }

    // Приватные методы

    private emit(eventType: WebSocketEventType, data: unknown): void {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    private emitMessage(type: string, data: WebSocketMessage): void {
        const listeners = this.messageListeners.get(type);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    private scheduleReconnect(): void {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Экспоненциальная задержка
        
        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (this.roomId && this.token) {
                console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
                this.connect(this.roomId, this.token);
            }
        }, delay);
    }
}

// Экспортируем singleton инстанс
export const websocketClient = new WebSocketClient();

// Экспортируем типы для удобства
export type { WebSocketClient as WebSocketClientClass };