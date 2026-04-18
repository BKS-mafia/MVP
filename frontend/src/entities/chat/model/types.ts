export interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    text: string;
    timestamp: number;
    isOwn?: boolean;
}

export interface SystemNotification {
    id: string;
    type: 'join' | 'leave' | 'role_assigned' | 'phase_change';
    message: string;
    timestamp: number;
}