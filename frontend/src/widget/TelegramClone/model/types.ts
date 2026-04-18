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