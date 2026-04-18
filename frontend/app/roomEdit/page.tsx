"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { message, Spin } from 'antd';
import LobbySettings from "@/src/widget/LobbySettings";
import { getRoom, startGame } from '@/src/shared/api/endpoints/rooms';
import { useGameStore } from '@/src/shared/store/gameStore';

function RoomEditContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomId = searchParams.get('room_id');
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const { setRoom, setCurrentPlayer } = useGameStore();

    useEffect(() => {
        if (!roomId) {
            messageApi.error('ID комнаты не найден. Создайте комнату заново.');
            router.push('/');
            return;
        }

        // Загружаем данные комнаты
        const loadRoom = async () => {
            try {
                const roomData = await getRoom(roomId);
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
            } catch (error) {
                console.error('Ошибка загрузки комнаты:', error);
                messageApi.error('Не удалось загрузить данные комнаты.');
                router.push('/');
            }
        };

        loadRoom();
    }, [roomId, router, messageApi, setRoom]);

    const handleStart = async (settings: unknown) => {
        if (!roomId) return;

        setLoading(true);
        try {
            // Вызываем API старта игры
            await startGame(roomId);
            
            // Перенаправляем в лобби комнаты
            router.push(`/room/${roomId}/lobby`);
        } catch (error) {
            console.error('Ошибка старта игры:', error);
            messageApi.error('Не удалось начать игру. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    if (!roomId) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            {contextHolder}
            <LobbySettings onStart={handleStart} />
        </div>
    );
}

function LoadingFallback() {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Spin size="large" />
        </div>
    );
}

const Page = () => {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <RoomEditContent />
        </Suspense>
    );
};

export default Page;