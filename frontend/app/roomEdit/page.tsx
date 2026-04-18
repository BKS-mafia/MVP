"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { message, Spin } from 'antd';
import LobbySettings from "@/src/widget/LobbySettings";
import { getRoom, updateRoom } from '@/src/shared/api/endpoints/rooms';
import { useGameStore } from '@/src/shared/store/gameStore';
import { GameSettingsDTO } from '@/src/widget/LobbySettings';

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

    const handleStart = async (settings: GameSettingsDTO) => {
        if (!roomId) return;

        setLoading(true);
        try {
            // Обновляем настройки комнаты
            await updateRoom(roomId, {
                totalPlayers: settings.totalPlayers,
                peopleCount: settings.peopleCount,
                aiCount: settings.aiCount,
                roles: settings.roles.reduce((acc, role, index) => {
                    acc[index.toString()] = role;
                    return acc;
                }, {} as Record<string, { name: string; count: number; canBeHuman: boolean; canBeAI: boolean }>),
            });
            
            // Перенаправляем в лобби комнаты для ожидания игроков
            router.push(`/room/${roomId}/lobby`);
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            messageApi.error('Не удалось сохранить настройки. Попробуйте позже.');
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