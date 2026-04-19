"use client";

import React from 'react';
import { Tag, Typography } from 'antd';
import { ClockCircleOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useGameStore } from '@/src/shared/store/gameStore';

const { Text } = Typography;

// Маппинг фаз для отображения на русском
const PHASE_NAMES: Record<string, string> = {
    'lobby': 'Ожидание',
    'role_assignment': 'Распределение ролей',
    'night': 'Ночь',
    'day': 'День',
    'voting': 'Голосование',
    'turing_test': 'Тест Тьюринга',
    'finished': 'Игра завершена',
};

// Маппинг цветов для фаз
const PHASE_COLORS: Record<string, string> = {
    'lobby': 'default',
    'role_assignment': 'purple',
    'night': 'blue',
    'day': 'orange',
    'voting': 'red',
    'turing_test': 'green',
    'finished': 'gray',
};

// Маппинг ролей для отображения
const ROLE_NAMES: Record<string, string> = {
    'Mafia': 'Мафия',
    'Doctor': 'Доктор',
    'Commissioner': 'Комиссар',
    'Civilian': 'Мирный житель',
};

// Цвета для ролей
const ROLE_COLORS: Record<string, string> = {
    'Mafia': 'red',
    'Doctor': 'green',
    'Commissioner': 'blue',
    'Civilian': 'default',
};

interface GameHeaderWidgetProps {
    className?: string;
}

export const GameHeaderWidget: React.FC<GameHeaderWidgetProps> = ({ className }) => {
    const { 
        currentPlayer, 
        gamePhase, 
        dayNumber, 
        phaseTimer,
        players,
    } = useGameStore();

    // Получаем информацию о живых игроках
    const alivePlayers = players.filter(p => p.is_alive).length;
    const totalPlayers = players.length || 0;

    // Форматируем время для отображения (ММ:СС)
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Определяем прогресс для таймера (0-100)
    const getTimerProgress = (): number => {
        if (!phaseTimer || phaseTimer.duration_seconds === 0) return 100;
        return (phaseTimer.remaining_seconds / phaseTimer.duration_seconds) * 100;
    };

    // Определяем цвет для таймера (становится красным когда мало времени)
    const getTimerColor = (): string => {
        if (!phaseTimer) return '#1890ff';
        if (phaseTimer.remaining_seconds <= 10) return '#ff4d4f';
        if (phaseTimer.remaining_seconds <= 30) return '#faad14';
        return '#1890ff';
    };

    return (
        <div 
            className={className}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                background: '#f5f5f5',
                borderRadius: '8px',
            }}
        >
            {/* Информация о фазе и таймере */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
            }}>
                {/* Фаза игры */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag color={PHASE_COLORS[gamePhase || 'lobby'] || 'default'}>
                        {PHASE_NAMES[gamePhase || 'lobby'] || gamePhase || 'Неизвестно'}
                    </Tag>
                    {gamePhase !== 'lobby' && gamePhase !== 'finished' && (
                        <Text type="secondary">День {dayNumber}</Text>
                    )}
                </div>

                {/* Таймер */}
                {phaseTimer && gamePhase !== 'lobby' && gamePhase !== 'finished' && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 12px',
                        background: '#fff',
                        borderRadius: '16px',
                        border: `2px solid ${getTimerColor()}`,
                    }}>
                        <ClockCircleOutlined style={{ color: getTimerColor() }} />
                        <Text strong style={{ 
                            color: getTimerColor(),
                            fontSize: '16px',
                            fontFamily: 'monospace',
                        }}>
                            {formatTime(phaseTimer.remaining_seconds)}
                        </Text>
                    </div>
                )}

                {/* Счётчик живых игроков */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TeamOutlined />
                    <Text type="secondary">
                        {alivePlayers} / {totalPlayers} живы
                    </Text>
                </div>
            </div>

            {/* Роль игрока */}
            {currentPlayer?.role && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#fff',
                    borderRadius: '8px',
                }}>
                    <UserOutlined style={{ fontSize: '18px' }} />
                    <Text>Ваша роль:</Text>
                    <Tag color={ROLE_COLORS[currentPlayer.role] || 'default'} style={{ margin: 0 }}>
                        {ROLE_NAMES[currentPlayer.role] || currentPlayer.role}
                    </Tag>
                </div>
            )}

            {/* Прогресс-бар таймера (если есть активный таймер) */}
            {phaseTimer && phaseTimer.remaining_seconds > 0 && gamePhase !== 'lobby' && (
                <div style={{
                    width: '100%',
                    height: '4px',
                    background: '#e8e8e8',
                    borderRadius: '2px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${getTimerProgress()}%`,
                        height: '100%',
                        background: getTimerColor(),
                        transition: 'width 1s linear, background 0.3s',
                    }} />
                </div>
            )}
        </div>
    );
};

export default GameHeaderWidget;