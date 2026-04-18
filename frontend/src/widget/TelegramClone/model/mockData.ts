import { Chat, ChatData } from './types';
import { VotingMessage } from '@/src/entities/voting';
import type { ChatMessageType, SystemNotificationType } from '@/src/entities/chat';
import { TeamOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import React from 'react';

const CURRENT_USER_ID = 'user-1';
const CURRENT_USER_NAME = 'Алексей';

export const mockPlayers = [
    { userId: 'user-1', userName: 'Алексей (Вы)' },
    { userId: 'user-2', userName: 'Мафия Игорь' },
    { userId: 'user-3', userName: 'Комиссар Анна' },
    { userId: 'user-4', userName: 'Мирный Дмитрий' },
    { userId: 'user-5', userName: 'Доктор Елена' },
    { userId: 'ai-1', userName: '🤖 AI-Мафия' },
    { userId: 'ai-2', userName: '🤖 AI-Мирный' },
    { userId: 'ai-3', userName: '🤖 AI-Комиссар' },
];

export const mockChats: Chat[] = [
    { id: 'general', name: 'Общий чат', type: 'general', icon: React.createElement(TeamOutlined), lastMessage: 'Голосуем!', lastMessageTime: '12:34', unread: 2 },
    { id: 'mafia', name: 'Шёпот мафии', type: 'mafia', icon: React.createElement(LockOutlined), lastMessage: 'Убиваем Анну?', lastMessageTime: '12:30', unread: 1 },
    { id: 'commissioner', name: 'Комиссар', type: 'commissioner', icon: React.createElement(UserOutlined), lastMessage: 'Проверь Игоря', lastMessageTime: '12:28', unread: 0 },
];

const messagesByChat: Record<string, ChatMessageType[]> = {
    general: [
        { id: 'g1', userId: 'user-2', userName: 'Мафия Игорь', text: 'Всем привет!', timestamp: Date.now() - 3600000, isOwn: false },
        { id: 'g2', userId: CURRENT_USER_ID, userName: CURRENT_USER_NAME, text: 'Привет! Как игра?', timestamp: Date.now() - 3500000, isOwn: true },
        { id: 'g3', userId: 'ai-1', userName: '🤖 AI-Мафия', text: 'Я думаю, что Мирные должны объединиться', timestamp: Date.now() - 3400000, isOwn: false },
    ],
    mafia: [
        { id: 'm1', userId: 'user-2', userName: 'Мафия Игорь', text: 'Кого убираем?', timestamp: Date.now() - 2000000, isOwn: false },
        { id: 'm2', userId: 'ai-1', userName: '🤖 AI-Мафия', text: 'Предлагаю Анну', timestamp: Date.now() - 1900000, isOwn: false },
    ],
    commissioner: [
        { id: 'c1', userId: 'user-3', userName: 'Комиссар Анна', text: 'Проверил Игоря — он мафия', timestamp: Date.now() - 1500000, isOwn: false },
    ],
};

const notificationsByChat: Record<string, SystemNotificationType[]> = {
    general: [
        { id: 's1', type: 'join', message: 'Алексей присоединился к комнате', timestamp: Date.now() - 7200000 },
        { id: 's2', type: 'phase_change', message: '🌙 Началась ночь. Мафия просыпается', timestamp: Date.now() - 6000000 },
        { id: 's3', type: 'phase_change', message: '☀️ Наступил день. Общее голосование!', timestamp: Date.now() - 4000000 },
    ],
    mafia: [
        { id: 'sm1', type: 'phase_change', message: '🔪 Мафия, выберите жертву', timestamp: Date.now() - 5000000 },
    ],
    commissioner: [
        { id: 'sc1', type: 'phase_change', message: '🕵️ Комиссар, ваш ход', timestamp: Date.now() - 4500000 },
    ],
};

const votingMessagesByChat: Record<string, VotingMessage[]> = {
    general: [
        {
            id: 'v1',
            type: 'voting',
            title: 'Кого исключить из игры?',
            options: mockPlayers.filter(p => p.userId !== CURRENT_USER_ID),
            chatId: 'general',
        },
    ],
    mafia: [],
    commissioner: [],
};

export const getChatData = (chatId: string): ChatData => ({
    messages: messagesByChat[chatId] || [],
    notifications: notificationsByChat[chatId] || [],
    votingMessages: votingMessagesByChat[chatId] || [],
});