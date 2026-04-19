'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, createElement } from 'react';
import { useParams } from 'next/navigation';
import { Layout, ConfigProvider } from 'antd';
import { ChatSidebar } from './ChatSidebar';
import { ChatArea } from './ChatArea';
import { getToken } from '@/src/shared/lib/getToken';
import { websocketClient } from '@/src/shared/api/websocket';
import type { ChatMessageType, SystemNotificationType } from '@/src/entities/chat';
import { VotingMessage } from '@/src/entities/voting';
import type { Chat, ChatData, ChatEventMessage, ChatEventExtendedMessage, GhostChatMessage } from '../model/types';
import { TeamOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';

// Алиас для createElement
const createEl = createElement;

const { Sider, Content } = Layout;

// Маппинг типов чатов из бекенда
const CHAT_NAME_MAPPING: Record<string, string> = {
    'cityGroup': 'general',
    'mafiaGroup': 'mafia',
    'roleChat': 'commissioner',
};

const BACKEND_CHAT_MAPPING: Record<string, string> = {
    'general': 'cityGroup',
    'mafia': 'mafiaGroup',
    'commissioner': 'roleChat',
};

export const TelegramClone: React.FC = () => {
    const params = useParams();
    const roomId = params.id as string;
    const token = getToken();

    // Состояние чатов
    const [chats, setChats] = useState<Chat[]>([
        { id: 'general', name: 'Общий чат', type: 'general', icon: createEl(TeamOutlined), lastMessage: '', lastMessageTime: '', unread: 0 },
        { id: 'mafia', name: 'Шёпот мафии', type: 'mafia', icon: createEl(LockOutlined), lastMessage: '', lastMessageTime: '', unread: 0 },
        { id: 'commissioner', name: 'Комиссар', type: 'commissioner', icon: createEl(UserOutlined), lastMessage: '', lastMessageTime: '', unread: 0 },
    ]);
    const [selectedChatId, setSelectedChatId] = useState<string>('general');
    const [searchQuery, setSearchQuery] = useState('');
    const [newMessageText, setNewMessageText] = useState('');

    // Данные сообщений для каждого чата
    const [chatMessages, setChatMessages] = useState<Record<string, ChatMessageType[]>>({});
    const [chatNotifications, setChatNotifications] = useState<Record<string, SystemNotificationType[]>>({});
    const [votingMessages, setVotingMessages] = useState<VotingMessage[]>([]);

    // Текущий ID пользователя (получим из WebSocket при подключении)
    const currentUserIdRef = useRef<number | null>(null);
    const currentUserNameRef = useRef<string>('');

    // Множество для дедупликации сообщений (clientMessageId -> true)
    const processedMessageIdsRef = useRef<Set<string>>(new Set());

    // Подключение к WebSocket при монтировании
    useEffect(() => {
        if (!roomId || !token) {
            console.warn('No roomId or token available');
            return;
        }

        console.log('Connecting to WebSocket:', { roomId, token });

        // Подключаемся к WebSocket
        websocketClient.connect(roomId, token);

        // Подписка на входящие сообщения
        const handleChatEvent = (data: unknown) => {
            const message = data as ChatEventMessage;
            console.log('Received chat_event:', message);
            
            // Дедупликация: проверяем clientMessageId
            if (message.clientMessageId && processedMessageIdsRef.current.has(message.clientMessageId)) {
                console.log('Duplicate message ignored:', message.clientMessageId);
                return;
            }
            if (message.clientMessageId) {
                processedMessageIdsRef.current.add(message.clientMessageId);
            }
            
            // Определяем ID чата на основе is_mafia_channel
            const chatId = message.is_mafia_channel ? 'mafia' : 'general';
            
            const newMessage: ChatMessageType = {
                id: message.clientMessageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: String(message.player_id),
                userName: message.nickname,
                text: message.content,
                timestamp: Date.now(),
                isOwn: message.clientMessageId ? false : (message.player_id === currentUserIdRef.current),
            };

            setChatMessages(prev => ({
                ...prev,
                [chatId]: [...(prev[chatId] || []), newMessage],
            }));

            // Обновляем lastMessage в списке чатов
            setChats(prev => prev.map(chat =>
                chat.id === chatId
                    ? { ...chat, lastMessage: message.content, lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                    : chat
            ));
        };

        const handleChatEventExtended = (data: unknown) => {
            const message = data as ChatEventExtendedMessage;
            console.log('Received chat_event_extended:', message);
            
            // Дедупликация: проверяем clientMessageId
            if (message.clientMessageId && processedMessageIdsRef.current.has(message.clientMessageId)) {
                console.log('Duplicate message ignored:', message.clientMessageId);
                return;
            }
            if (message.clientMessageId) {
                processedMessageIdsRef.current.add(message.clientMessageId);
            }
            
            // Маппим имя чата из бекенда в локальный ID
            const chatId = CHAT_NAME_MAPPING[message.chatName] || message.chatName;
            
            const newMessage: ChatMessageType = {
                id: message.clientMessageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: String(message.player_id),
                userName: message.nickname,
                text: message.body,
                timestamp: Date.now(),
                isOwn: message.clientMessageId ? false : (message.player_id === currentUserIdRef.current),
            };

            setChatMessages(prev => ({
                ...prev,
                [chatId]: [...(prev[chatId] || []), newMessage],
            }));

            // Обновляем lastMessage в списке чатов
            setChats(prev => prev.map(chat =>
                chat.id === chatId
                    ? { ...chat, lastMessage: message.body, lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                    : chat
            ));
        };

        const handleGhostChatMessage = (data: unknown) => {
            const message = data as GhostChatMessage;
            console.log('Received ghost_chat_message:', message);
            
            const newMessage: ChatMessageType = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: String(message.data.sender_id),
                userName: `👻 ${message.data.sender_name}`,
                text: message.data.content,
                timestamp: Date.now(),
                isOwn: false,
            };

            // Призраки показываются в общем чате
            setChatMessages(prev => ({
                ...prev,
                'general': [...(prev['general'] || []), newMessage],
            }));

            setChats(prev => prev.map(chat =>
                chat.id === 'general'
                    ? { ...chat, lastMessage: message.data.content, lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                    : chat
            ));
        };

        const handleConnect = (data: unknown) => {
            console.log('WebSocket connected:', data);
        };

        const handleDisconnect = (data: unknown) => {
            console.log('WebSocket disconnected:', data);
        };

        const handleError = (error: unknown) => {
            console.error('WebSocket error:', error);
        };

        // Регистрируем обработчики
        websocketClient.on('chat_event', handleChatEvent);
        websocketClient.on('chat_event_extended', handleChatEventExtended);
        websocketClient.on('ghost_chat_message', handleGhostChatMessage);
        websocketClient.on('connect', handleConnect);
        websocketClient.on('disconnect', handleDisconnect);
        websocketClient.on('error', handleError);

        // Отписка при размонтировании
        return () => {
            websocketClient.off('chat_event', handleChatEvent);
            websocketClient.off('chat_event_extended', handleChatEventExtended);
            websocketClient.off('ghost_chat_message', handleGhostChatMessage);
            websocketClient.off('connect', handleConnect);
            websocketClient.off('disconnect', handleDisconnect);
            websocketClient.off('error', handleError);
            websocketClient.disconnect();
        };
    }, [roomId, token]);

    // Получаем данные для текущего чата
    const currentMessages = chatMessages[selectedChatId] || [];
    const currentNotifications = chatNotifications[selectedChatId] || [];

    // Объединяем всё в хронологическом порядке
    const allItems = useMemo(() => {
        const items: (ChatMessageType | SystemNotificationType | { type: 'voting'; data: VotingMessage })[] = [
            ...currentMessages,
            ...currentNotifications,
            ...votingMessages.map(vm => ({ type: 'voting' as const, data: vm })),
        ];
        return items.sort((a, b) => {
            const aTime = 'timestamp' in a ? a.timestamp : 0;
            const bTime = 'timestamp' in b ? b.timestamp : 0;
            return aTime - bTime;
        });
    }, [currentMessages, currentNotifications, votingMessages]);

    const handleSendMessage = useCallback(() => {
        if (!newMessageText.trim()) return;

        // Генерируем уникальный ID для дедупликации
        const clientMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Определяем тип сообщения на основе выбранного чата
        let wsMessage: { type: string; content?: string; chatName?: string; body?: string; clientMessageId: string };
        
        if (selectedChatId === 'general') {
            wsMessage = {
                type: 'chat_message',
                content: newMessageText.trim(),
                clientMessageId,
            };
        } else if (selectedChatId === 'mafia') {
            wsMessage = {
                type: 'chat_message_extended',
                chatName: 'mafiaGroup',
                body: newMessageText.trim(),
                clientMessageId,
            };
        } else if (selectedChatId === 'commissioner') {
            wsMessage = {
                type: 'chat_message_extended',
                chatName: 'roleChat',
                body: newMessageText.trim(),
                clientMessageId,
            };
        } else {
            wsMessage = {
                type: 'chat_message',
                content: newMessageText.trim(),
                clientMessageId,
            };
        }

        // Отправляем сообщение через WebSocket
        websocketClient.send(wsMessage);

        // НЕ добавляем сообщение локально - ждём ответа от сервера с clientMessageId
        // Это предотвращает дублирование

        // Обновляем lastMessage в списке чатов (визуальная обратная связь)
        setChats(prev => prev.map(chat =>
            chat.id === selectedChatId
                ? { ...chat, lastMessage: newMessageText.trim(), lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                : chat
        ));

        setNewMessageText('');
    }, [newMessageText, selectedChatId]);

    const handleVote = useCallback((selectedUserId: string, votingId: string) => {
        setVotingMessages(prev => prev.filter(vm => vm.id !== votingId));
        
        const newNotification: SystemNotificationType = {
            id: `vote-result-${Date.now()}`,
            type: 'phase_change',
            message: `🗳️ Вы проголосовали за пользователя`,
            timestamp: Date.now(),
        };

        setChatNotifications(prev => ({
            ...prev,
            [selectedChatId]: [...(prev[selectedChatId] || []), newNotification],
        }));
    }, [selectedChatId]);

    const handleSelectChat = (chatId: string) => {
        setSelectedChatId(chatId);
    };

    const currentChat = chats.find(c => c.id === selectedChatId);

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#3b82f6' } }}>
            <Layout style={{ height: '100vh' }}>
                <Sider width={340} style={{ backgroundColor: '#fff', borderRight: '1px solid #e5e5e5' }}>
                    <ChatSidebar
                        chats={chats}
                        selectedChatId={selectedChatId}
                        onSelectChat={handleSelectChat}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                </Sider>
                <Content>
                    <ChatArea
                        chatName={currentChat?.name || 'Чат'}
                        roomId={roomId || ''}
                        items={allItems}
                        newMessageText={newMessageText}
                        onNewMessageChange={setNewMessageText}
                        onSendMessage={handleSendMessage}
                        onVote={handleVote}
                    />
                </Content>
            </Layout>
        </ConfigProvider>
    );
};