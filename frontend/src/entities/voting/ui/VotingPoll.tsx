'use client';

import React, { useState } from 'react';
import { Card, Radio, Button, Typography, Space, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export interface VotingOption {
    userId: string;
    userName: string;
}

interface VotingPollProps {
    title?: string;
    options: VotingOption[];
    onVote: (selectedUserId: string) => void;
    disabled?: boolean;
    timeLeft?: number; // опционально таймер
}

export const VotingPoll: React.FC<VotingPollProps> = ({
                                                          title = 'Голосование',
                                                          options,
                                                          onVote,
                                                          disabled = false,
                                                          timeLeft,
                                                      }) => {
    const [selected, setSelected] = useState<string | null>(null);

    const handleSubmit = () => {
        if (selected) {
            onVote(selected);
            setSelected(null);
        }
    };

    return (
        <Card
            style={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                width: 320,
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: 16,
            }}
            bodyStyle={{ padding: '16px' }}
        >
            <Title level={5} style={{ margin: 0, marginBottom: 12 }}>{title}</Title>
            {timeLeft !== undefined && (
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Осталось: {Math.floor(timeLeft / 1000)} сек.
                </Text>
            )}
            <Radio.Group
                onChange={(e) => setSelected(e.target.value)}
                value={selected}
                disabled={disabled}
                style={{ width: '100%', marginBottom: 16 }}
            >
                <Space orientation="vertical" style={{ width: '100%' }}>
                    {options.map((opt) => (
                        <Radio key={opt.userId} value={opt.userId} style={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar size={24} icon={<UserOutlined />} style={{ marginRight: 8 }} />
                            {opt.userName}
                        </Radio>
                    ))}
                </Space>
            </Radio.Group>
            <Button
                type="primary"
                block
                onClick={handleSubmit}
                disabled={!selected || disabled}
            >
                Проголосовать
            </Button>
        </Card>
    );
};