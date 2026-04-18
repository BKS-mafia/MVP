"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Button, Card, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getRoom, joinRoom } from '@/src/shared/api/endpoints/rooms';
import { getToken } from '@/src/shared/lib/getToken';
import { useGameStore } from '@/src/shared/store/gameStore';

const { Title, Text } = Typography;

function JoinContent() {
    const [roomCode, setRoomCode] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const [messageApi, contextHolder] = message.useMessage();
    const { setRoom, setCurrentPlayer, setPlayers } = useGameStore();

    // Извлечение параметра code из URL при загрузке страницы
    useEffect(() => {
        const codeFromUrl = searchParams.get('code');
        if (codeFromUrl) {
            setRoomCode(codeFromUrl);
        }
    }, [searchParams]);

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
                room_id: roomData.roomId,
                short_id: roomData.shortId,
                name: roomData.name,
                status: roomData.status as 'lobby' | 'starting' | 'playing' | 'finished',
                total_players: roomData.totalPlayers,
                current_players: roomData.currentPlayers,
                human_players: roomData.humanPlayers,
                ai_players: roomData.aiPlayers,
            });

            // 2. Вызываем joinRoom для присоединения
            // Используем существующий токен, если есть
            const existingToken = getToken() || undefined;
            const nickname = `Player_${Math.floor(Math.random() * 10000)}`;
            
            const playerResponse = await joinRoom(
                roomCode.trim(),
                nickname,
                false, // не AI
                existingToken
            );

            // Сохраняем текущего игрока
            setCurrentPlayer({
                id: playerResponse.id,
                player_id: playerResponse.playerId,
                nickname: playerResponse.nickname,
                is_ai: playerResponse.isAI,
                is_alive: playerResponse.isAlive,
                is_connected: playerResponse.isConnected,
                role: playerResponse.role,
                session_token: playerResponse.sessionToken,
            }, playerResponse.sessionToken);

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
}

export default function JoinPage() {
    return (
        <Suspense fallback={
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                }}
            >
                <Card style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
                    <Title level={2}>Загрузка...</Title>
                </Card>
            </div>
        }>
            <JoinContent />
        </Suspense>
    );
}