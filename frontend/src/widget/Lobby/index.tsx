"use client";

import React from 'react';

import { Avatar, Typography, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface Player {
    id: string;
    name: string;
    avatar?: string | null;
}

interface LobbyProps {
    maxPlayers: number;
    players: Player[];
    onReady?: () => void; // опционально, когда все собрались
}

function getPlayerWord(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'игроков';
    if (lastDigit === 1) return 'игрока';
    if (lastDigit >= 2 && lastDigit <= 4) return 'игроков';
    return 'игроков';
}


const Lobby: React.FC<LobbyProps> = ({ maxPlayers, players, onReady }) => {
    const connectedCount = players.length;
    const remaining = maxPlayers - connectedCount;

    // Создаём массив для отображения: сначала реальные игроки, потом пустые слоты
    const slots = [
        ...players.map((p) => ({ type: 'player' as const, player: p })),
        ...Array.from({ length: remaining }, (_, i) => ({ type: 'empty' as const, id: `empty-${i}` })),
    ];

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                backgroundColor: '#f9fafb',
                backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                padding: 24,
            }}
        >
            <div
                style={{
                    maxWidth: 480,
                    width: '100%',
                    backgroundColor: '#ffffff',
                    borderRadius: 24,
                    padding: 40,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    textAlign: 'center',
                }}
            >
                <Title level={2} style={{ marginBottom: 32, fontWeight: 400, color: '#1e293b' }}>
                    Ожидание игроков
                </Title>

                {/* Сетка аватаров */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.min(maxPlayers, 4)}, 1fr)`,
                        gap: 24,
                        justifyContent: 'center',
                        marginBottom: 32,
                    }}
                >
                    {slots.map((slot, index) => (
                        <div key={slot.type === 'player' ? slot.player.id : slot.id} style={{ textAlign: 'center' }}>
                            {slot.type === 'player' ? (
                                <>
                                    <Avatar
                                        size={80}
                                        src={slot.player.avatar}
                                        icon={<UserOutlined />}
                                        style={{
                                            backgroundColor: '#3b82f6',
                                            border: '2px solid #e2e8f0',
                                        }}
                                    />
                                    <Text
                                        style={{
                                            display: 'block',
                                            marginTop: 8,
                                            fontSize: 14,
                                            color: '#334155',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {slot.player.name}
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <div
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '50%',
                                            backgroundColor: '#f1f5f9',
                                            border: '2px dashed #cbd5e1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto',
                                        }}
                                    >
                                        <UserOutlined style={{ fontSize: 32, color: '#94a3b8' }} />
                                    </div>
                                    <Text
                                        style={{
                                            display: 'block',
                                            marginTop: 8,
                                            fontSize: 14,
                                            color: '#94a3b8',
                                        }}
                                    >
                                        ожидание
                                    </Text>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Статус и анимация */}
                <div style={{ marginBottom: 24 }}>
                    {remaining > 0 ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Spin size="small" />
                                <Text style={{ fontSize: 16, color: '#64748b' }}>
                                    Ждём ещё {remaining} {getPlayerWord(remaining)}…
                                </Text>
                            </div>
                            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 14 }}>
                                {connectedCount} из {maxPlayers} подключено
                            </Text>
                        </>
                    ) : (
                        <Text style={{ fontSize: 16, color: '#22c55e', fontWeight: 500 }}>
                            Все в сборе! Начинаем…
                        </Text>
                    )}
                </div>

                {/* Декоративная анимация пульсации (чистый CSS) */}
                <div className="lobby-pulse-container">
                    <div className="lobby-pulse" />
                    <div className="lobby-pulse" style={{ animationDelay: '0.5s' }} />
                    <div className="lobby-pulse" style={{ animationDelay: '1s' }} />
                </div>
            </div>
        </div>
    );
};

export default Lobby;