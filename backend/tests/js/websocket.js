// js/websocket.js - WebSocket менеджер с reconnection (Singleton паттерн)

import { getBaseUrl } from './api.js';

class WebSocketClient {
    constructor() {
        this.ws = null;
        this.url = '';
        this.token = '';
        this.roomId = '';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
        this.eventListeners = new Map();
        this.messageListeners = new Map();
        this.reconnectTimeout = null;
        
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
    connect(roomId, token) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn('WebSocket already connected');
            return;
        }

        this.roomId = roomId;
        this.token = token;
        
        const baseUrl = getBaseUrl().replace('http://', 'ws://').replace('https://', 'wss://');
        this.url = `${baseUrl}/ws/rooms/${roomId}?token=${token}`;

        this.isConnecting = true;
        this.reconnectAttempts = 0;
        
        this.doConnect();
    }

    /**
     * Выполнить подключение
     */
    doConnect() {
        try {
            console.log(`Connecting to WebSocket: ${this.url}`);
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.emit('connect', { roomId: this.roomId, token: this.token });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Логируем все входящие сообщения
                    console.log('WS <-', data.type, data);
                    
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
                
                // Автоматическое переподключение (если не закрыто намеренно)
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
    disconnect() {
        // Блокируем переподключение
        this.reconnectAttempts = this.maxReconnectAttempts;
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnected');
            this.ws = null;
        }
    }

    /**
     * Отправить сообщение на сервер
     * @param message - объект сообщения
     */
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('WS ->', message.type, message);
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
    on(event, callback) {
        if (['message', 'connect', 'disconnect', 'error'].includes(event)) {
            const eventType = event;
            const listeners = this.eventListeners.get(eventType);
            if (listeners) {
                listeners.add(callback);
            }
        } else {
            // Это конкретный тип сообщения
            if (!this.messageListeners.has(event)) {
                this.messageListeners.set(event, new Set());
            }
            this.messageListeners.get(event).add(callback);
        }
    }

    /**
     * Отписаться от события
     * @param event - тип события
     * @param callback - функция обратного вызова
     */
    off(event, callback) {
        if (['message', 'connect', 'disconnect', 'error'].includes(event)) {
            const eventType = event;
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
    isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Получить текущий roomId
     */
    getRoomId() {
        return this.roomId;
    }

    /**
     * Получить текущий токен
     */
    getToken() {
        return this.token;
    }

    // Приватные методы

    emit(eventType, data) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    emitMessage(type, data) {
        const listeners = this.messageListeners.get(type);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Экспоненциальная задержка
        
        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimeout = setTimeout(() => {
            if (this.roomId && this.token) {
                console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
                this.doConnect();
            }
        }, delay);
    }
}

// Экспортируем singleton инстанс
export const websocketClient = new WebSocketClient();
