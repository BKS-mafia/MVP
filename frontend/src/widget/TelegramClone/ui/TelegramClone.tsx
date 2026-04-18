'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Layout, ConfigProvider } from 'antd';
import { ChatSidebar } from './ChatSidebar';
import { ChatArea } from './ChatArea';
import { mockChats, getChatData, mockPlayers } from '../model/mockData';
import type { ChatMessageType, SystemNotificationType } from '@/src/entities/chat';
import { VotingMessage } from '@/src/entities/voting';

const { Sider, Content } = Layout;
const CURRENT_USER_ID = 'user-1';
const CURRENT_USER_NAME = 'Алексей';

export const TelegramClone: React.FC = () => {
    const params = useParams();
    const roomId = params.id;

    const [chats, setChats] = useState(mockChats);
    const [selectedChatId, setSelectedChatId] = useState<string>('general');
    const [searchQuery, setSearchQuery] = useState('');
    const [newMessageText, setNewMessageText] = useState('');

    // Данные выбранного чата
    const [chatData, setChatData] = useState(getChatData(selectedChatId));
    const [votingMessages, setVotingMessages] = useState<VotingMessage[]>(chatData.votingMessages);

    // Обновляем данные при смене чата
    useEffect(() => {
        const data = getChatData(selectedChatId);
        setChatData(data);
        setVotingMessages(data.votingMessages);
    }, [selectedChatId]);

    // Объединяем всё в хронологическом порядке
    const allItems = useMemo(() => {
        const items: (ChatMessageType | SystemNotificationType | { type: 'voting'; data: VotingMessage })[] = [
            ...chatData.messages,
            ...chatData.notifications,
            ...votingMessages.map(vm => ({ type: 'voting' as const, data: vm })),
        ];
        return items.sort((a, b) => {
            const aTime = 'timestamp' in a ? a.timestamp : 0;
            const bTime = 'timestamp' in b ? b.timestamp : 0;
            return aTime - bTime;
        });
    }, [chatData.messages, chatData.notifications, votingMessages]);

    const handleSendMessage = () => {
        if (!newMessageText.trim()) return;
        const newMessage: ChatMessageType = {
            id: `msg-${Date.now()}`,
            userId: CURRENT_USER_ID,
            userName: CURRENT_USER_NAME,
            text: newMessageText.trim(),
            timestamp: Date.now(),
            isOwn: true,
        };
        // Обновляем локальные данные (в реальном приложении отправляем на бэк)
        chatData.messages.push(newMessage);
        setChatData({ ...chatData });
        setChats(prev => prev.map(chat =>
            chat.id === selectedChatId
                ? { ...chat, lastMessage: newMessage.text, lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
                : chat
        ));
        setNewMessageText('');
    };

    const handleVote = useCallback((selectedUserId: string, votingId: string) => {
        setVotingMessages(prev => prev.filter(vm => vm.id !== votingId));
        const votedPlayer = mockPlayers.find(p => p.userId === selectedUserId);
        if (votedPlayer) {
            const newNotification: SystemNotificationType = {
                id: `vote-result-${Date.now()}`,
                type: 'phase_change',
                message: `🗳️ Вы проголосовали за ${votedPlayer.userName}`,
                timestamp: Date.now(),
            };
            chatData.notifications.push(newNotification);
            setChatData({ ...chatData });
        }
    }, [chatData]);

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