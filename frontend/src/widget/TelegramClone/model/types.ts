import { VotingMessage } from '@/src/entities/voting';
import type { ChatMessageType, SystemNotificationType } from '@/src/entities/chat';

export type { ChatMessageType, SystemNotificationType };

export interface Chat {
    id: string;
    name: string;
    type: 'general' | 'mafia' | 'commissioner' | 'private';
    icon?: React.ReactNode;
    lastMessage?: string;
    lastMessageTime?: string;
    unread?: number;
}

export interface ChatData {
    messages: ChatMessageType[];
    notifications: SystemNotificationType[];
    votingMessages: VotingMessage[];
}

// Типы для входящих WebSocket сообщений от бекенда

// chat_event - сообщение в общий чат
export interface ChatEventMessage {
    type: 'chat_event';
    player_id: number;
    nickname: string;
    content: string;
    is_ai: boolean;
    is_mafia_channel: boolean;
    clientMessageId?: string; // ID сообщения для дедупликации
}

// chat_event_extended - сообщение в конкретный чат (cityGroup, mafiaGroup, roleChat)
export interface ChatEventExtendedMessage {
    type: 'chat_event_extended';
    chatName: string;
    body: string;
    player_id: number;
    nickname: string;
    is_ai: boolean;
    clientMessageId?: string; // ID сообщения для дедупликации
}

// ghost_chat_message - сообщение от призрака
export interface GhostChatMessage {
    event: 'ghost_chat_message';
    data: {
        sender_id: number;
        sender_name: string;
        content: string;
        is_ghost: boolean;
    };
}

// Объединённый тип для всех входящих сообщений
export type IncomingWebSocketMessage = 
    | ChatEventMessage 
    | ChatEventExtendedMessage 
    | GhostChatMessage;

// Типы для исходящих WebSocket сообщений

// chat_message - отправка в общий чат
export interface OutgoingChatMessage {
    type: 'chat_message';
    content: string;
    clientMessageId: string; // Уникальный ID для дедупликации
}

// chat_message_extended - отправка в конкретный чат
export interface OutgoingChatMessageExtended {
    type: 'chat_message_extended';
    chatName: 'cityGroup' | 'mafiaGroup' | 'roleChat';
    body: string;
    clientMessageId: string; // Уникальный ID для дедупликации
}

// ghost_chat - отправка сообщения призрака
export interface OutgoingGhostChat {
    type: 'ghost_chat';
    content: string;
    clientMessageId: string; // Уникальный ID для дедупликации
}

// Объединённый тип для всех исходящих сообщений
export type OutgoingWebSocketMessage = 
    | OutgoingChatMessage 
    | OutgoingChatMessageExtended 
    | OutgoingGhostChat;