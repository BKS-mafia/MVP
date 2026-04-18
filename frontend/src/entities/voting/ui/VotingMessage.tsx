'use client';

import React, { useState } from 'react';
import { Avatar, Button, Radio, Space, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { VotingMessage as VotingMessageType } from '../model/types';

const { Text } = Typography;

interface VotingMessageProps {
    voting: VotingMessageType;
    onVote: (selectedUserId: string, votingId: string) => void;
    disabled?: boolean;
}

export const VotingMessageComponent: React.FC<VotingMessageProps> = ({ voting, onVote, disabled = false }) => {
    const [selected, setSelected] = useState<string | null>(null);

    const handleSubmit = () => {
        if (selected) onVote(selected, voting.id);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
            <div style={{ maxWidth: '70%' }}>
                <div
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 18,
                        padding: '10px 14px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        border: '1px solid #e2e8f0',
                    }}
                >
                    <Text strong style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 8 }}>
                        🎭 Ведущий
                    </Text>
                    <div style={{ fontWeight: 500, marginBottom: 12 }}>{voting.title}</div>
                    <Radio.Group onChange={(e) => setSelected(e.target.value)} value={selected} disabled={disabled} style={{ width: '100%', marginBottom: 12 }}>
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            {voting.options.map(opt => (
                                <Radio key={opt.userId} value={opt.userId}>
                                    <Avatar size={24} icon={<UserOutlined />} style={{ marginRight: 8 }} />
                                    {opt.userName}
                                </Radio>
                            ))}
                        </Space>
                    </Radio.Group>
                    <Button type="primary" size="small" block onClick={handleSubmit} disabled={!selected || disabled}>
                        Проголосовать
                    </Button>
                </div>
            </div>
        </div>
    );
};