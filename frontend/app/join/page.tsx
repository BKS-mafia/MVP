"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button, Card, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getRoom, joinRoom } from '@/src/shared/api/endpoints/rooms';
import { getToken } from '@/src/shared/lib/getToken';
import { useGameStore } from '@/src/shared/store/gameStore';

const { Title, Text } = Typography;

const JoinPage: React.FC = () => {
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [messageApi, contextHolder] = message.useMessage();
    const { setRoom, setCurrentPlayer, setPlayers } = useGameStore();

    const handleJoin = async () => {
        if (!roomCode.trim()) {
            messageApi.error('Введите код комнаты');
            return;
        }

        setLoading(true);
        try {
            // 1. Вызываем API getRoom для проверки
            const roomData = await getRoom(roomCode.trim());
            
            // Проверяем, что комната существует и находится в лобби
            if (roomData.status !== 'lobby' && roomData.status !== 'starting') {
                messageApi.error('Комната уже начала игру или завершена');
                setLoading(false);
                return;
            }

            // Сохраняем данные комнаты в store
            setRoom({
                room_id: roomData.room_id,
                short_id: roomData.short_id,
                name: roomData.name,
                status: roomData.status as 'lobby' | 'starting' | 'playing' | 'finished',
                total_players: roomData.total_players,
                current_players: roomData.current_players,
                human_players: roomData.human_players,
                ai_players: roomData.ai_players,
            });

            // 2. Вызываем joinRoom для присоединения
            const token = getToken();
            const nickname = `Player_${Math.floor(Math.random() * 10000)}`;
            
            const playerResponse = await joinRoom(
                roomCode.trim(),
                nickname,
                false // не AI
            );

            // Сохраняем текущего игрока
            setCurrentPlayer({
                id: playerResponse.id,
                player_id: playerResponse.player_id,
                nickname: playerResponse.nickname,
                is_ai: playerResponse.is_ai,
                is_alive: playerResponse.is_alive,
                is_connected: playerResponse.is_connected,
                role: playerResponse.role,
                session_token: playerResponse.session_token,
            }, playerResponse.session_token);

            // Сохраняем токен в localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('token', playerResponse.session_token);
            }

            // 3. Перенаправляем в лобби
            router.push(`/room/${roomCode.trim()}/lobby`);
        } catch (error: unknown) {
            console.error('Ошибка присоединения к комнате:', error);
            const err = error as { response?: { status?: number } };
            if (err.response?.status === 404) {
                messageApi.error('Комната не найдена. Проверьте код.');
            } else {
                messageApi.error('Не удалось присоединиться к комнате. Попробуйте позже.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            }}
        >
            {contextHolder}
            <Card style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
                <Title level={2}>Присоединиться к игре</Title>
                <Text type="secondary">Введите код комнаты</Text>
                <Input
                    placeholder="Код комнаты"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    onPressEnter={handleJoin}
                    style={{ marginTop: 24, marginBottom: 24 }}
                    size="large"
                    disabled={loading}
                />
                <Button
                    type="primary"
                    size="large"
                    onClick={handleJoin}
                    block
                    loading={loading}
                >
                    Подключиться
                </Button>
                <Button
                    style={{ marginTop: 12 }}
                    size="large"
                    onClick={() => router.push('/')}
                    block
                    disabled={loading}
                    icon={<ArrowLeftOutlined />}
                >
                    Назад
                </Button>
            </Card>
        </div>
    );
};

export default JoinPage;