'use client';

import React from 'react';
import { Typography, Alert } from 'antd';
import { InfoCircleOutlined, UserAddOutlined, UserDeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface SystemNotificationProps {
    notification: {
        id: string;
        type: 'join' | 'leave' | 'role_assigned' | 'phase_change';
        message: string;
        timestamp: number;
    };
}

const iconMap = {
    join: <UserAddOutlined style={{ color: '#52c41a' }} />,
    leave: <UserDeleteOutlined style={{ color: '#ff4d4f' }} />,
    role_assigned: <InfoCircleOutlined style={{ color: '#1677ff' }} />,
    phase_change: <InfoCircleOutlined style={{ color: '#faad14' }} />,
};

export const SystemNotification: React.FC<SystemNotificationProps> = ({ notification }) => {
    const { type, message, timestamp } = notification;
    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <Alert
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {iconMap[type]}
                        <Text>{message}</Text>
                        <Text type="secondary" style={{ fontSize: 10, marginLeft: 'auto' }}>{timeStr}</Text>
                    </div>
                }
                type="info"
                showIcon={false}
                style={{
                    backgroundColor: '#f6f6f6',
                    border: 'none',
                    borderRadius: 16,
                    width: 'auto',
                    maxWidth: '80%',
                    padding: '4px 12px',
                }}
            />
        </div>
    );
};