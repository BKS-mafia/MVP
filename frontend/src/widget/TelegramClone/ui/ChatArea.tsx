'use client';

import React, { useRef, useEffect } from 'react';
import { Avatar, Typography, Input, Button, Empty } from 'antd';
import { SendOutlined, TeamOutlined } from '@ant-design/icons';
import { ChatMessage, SystemNotification } from '@/src/entities/chat';
import type { ChatMessageType, SystemNotificationType } from '@/src/entities/chat';
import { VotingMessageComponent } from '@/src/entities/voting';
import { VotingMessage } from '@/src/entities/voting';
import { formatTime } from '../lib/helpers';

const { Text } = Typography;

interface ChatAreaProps {
    chatName: string;
    roomId: string | string[];
    items: (ChatMessageType | SystemNotificationType | { type: 'voting'; data: VotingMessage })[];
    newMessageText: string;
    onNewMessageChange: (text: string) => void;
    onSendMessage: () => void;
    onVote: (selectedUserId: string, votingId: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
                                                      chatName,
                                                      roomId,
                                                      items,
                                                      newMessageText,
                                                      onNewMessageChange,
                                                      onSendMessage,
                                                      onVote,
                                                  }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [items]);

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendMessage();
        }
    };

    const renderItem = (item: any) => {
        if (item.type === 'voting') {
            return (
                <VotingMessageComponent
                    key={item.data.id}
                    voting={item.data}
                    onVote={onVote}
                    disabled={false}
                />
            );
        }
        if ('type' in item && (item.type === 'join' || item.type === 'leave' || item.type === 'role_assigned' || item.type === 'phase_change')) {
            return <SystemNotification key={item.id} notification={item} />;
        }
        return <ChatMessage key={item.id} message={item} />;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e5e5', backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar size={40} icon={<TeamOutlined />} style={{ backgroundColor: '#3b82f6' }} />
                    <div style={{ marginLeft: 12 }}>
                        <div style={{ fontWeight: 500, fontSize: 16 }}>{chatName}</div>
                        <Text type="secondary" style={{ fontSize: 13 }}>Комната #{roomId}</Text>
                    </div>
                </div>
            </div>
            <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', backgroundColor: '#f9fafb' }}>
                {items.length === 0 ? (
                    <Empty description="Нет сообщений" />
                ) : (
                    items.map((item, idx) => renderItem(item))
                )}
                <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e5e5', backgroundColor: '#fff' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Input
                        placeholder="Написать сообщение..."
                        value={newMessageText}
                        onChange={(e) => onNewMessageChange(e.target.value)}
                        onKeyPress={handleKeyPress}
                        size="large"
                    />
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        onClick={onSendMessage}
                        disabled={!newMessageText.trim()}
                    />
                </div>
            </div>
        </div>
    );
};