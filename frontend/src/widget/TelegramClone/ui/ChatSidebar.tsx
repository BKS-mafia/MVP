'use client';

import React from 'react';
import { Input, Divider, Badge, Avatar, Typography, Empty } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { Chat } from '../model/types';

const { Text } = Typography;

interface ChatSidebarProps {
    chats: Chat[];
    selectedChatId: string;
    onSelectChat: (chatId: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
                                                            chats,
                                                            selectedChatId,
                                                            onSelectChat,
                                                            searchQuery,
                                                            onSearchChange,
                                                        }) => {
    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '16px 12px' }}>
                <Input
                    placeholder="Поиск чатов"
                    prefix={<MessageOutlined />}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <Divider style={{ margin: 0 }} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                {filteredChats.length === 0 ? (
                    <Empty description="Чаты не найдены" style={{ marginTop: 40 }} />
                ) : (
                    filteredChats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => onSelectChat(chat.id)}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderRadius: 12,
                                margin: '2px 4px',
                                backgroundColor: selectedChatId === chat.id ? '#f0f7ff' : 'transparent',
                                transition: 'background-color 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Badge dot={!!chat.unread && chat.unread > 0} color="#3b82f6" offset={[-4, 36]}>
                                    <Avatar size={48} icon={chat.icon} style={{ backgroundColor: '#64748b' }} />
                                </Badge>
                                <div style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text strong style={{ fontSize: 15, color: '#1e293b' }}>{chat.name}</Text>
                                        <Text style={{ fontSize: 12, color: '#94a3b8' }}>{chat.lastMessageTime}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, color: '#64748b' }}>
                                            {chat.lastMessage}
                                        </Text>
                                        {chat.unread && chat.unread > 0 && (
                                            <Badge count={chat.unread} style={{ backgroundColor: '#3b82f6' }} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};