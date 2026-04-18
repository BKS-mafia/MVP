'use client';

import React from 'react';
import { Avatar, Typography, Space } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ChatMessageProps {
    message: {
        id: string;
        userName: string;
        text: string;
        timestamp: number;
        isOwn?: boolean;
    };
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const { userName, text, timestamp, isOwn = false } = message;

    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                marginBottom: 12,
            }}
        >
            <div
                style={{
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: isOwn ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 8,
                }}
            >
                <Avatar size={36} icon={<UserOutlined />} style={{ backgroundColor: isOwn ? '#1677ff' : '#52c41a' }} />
                <div
                    style={{
                        backgroundColor: isOwn ? '#e6f7ff' : '#f5f5f5',
                        borderRadius: 12,
                        padding: '8px 12px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}
                >
                    <Text strong style={{ fontSize: 12, display: 'block', color: isOwn ? '#1677ff' : '#52c41a' }}>
                        {userName} {isOwn && '(Вы)'}
                    </Text>
                    <Text style={{ fontSize: 14, wordBreak: 'break-word' }}>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block', textAlign: isOwn ? 'right' : 'left', marginTop: 4 }}>
                        {timeStr}
                    </Text>
                </div>
            </div>
        </div>
    );
};