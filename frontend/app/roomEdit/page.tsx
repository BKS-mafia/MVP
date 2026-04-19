"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { message, Spin } from 'antd';
import LobbySettings from "@/src/widget/LobbySettings";
import { getRoom, updateRoom, createRoom } from '@/src/shared/api/endpoints/rooms';
import { useGameStore } from '@/src/shared/store/gameStore';
import { GameSettingsDTO } from '@/src/widget/LobbySettings';
import { getToken } from '@/src/shared/lib/getToken';

// Исправление: добавляем поле name в интерфейс
export interface GameSettingsDTOWithName extends GameSettingsDTO {
    name?: string;
}

function RoomEditContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomId = searchParams.get('room_id');
    const isNewRoom = !roomId;
    const [loading, setLoading] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const { setRoom, setCurrentPlayer } = useGameStore();

    useEffect(() => {
        // Если room_id есть - загружаем данные комнаты
        if (!roomId) {
            // Новую комнату пока не создаём - это произойдёт при нажатии "Начать"
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
        setLoading(true);
        try {
            if (isNewRoom) {
                // Создаём новую комнату
                const hostToken = getToken();
                if (!hostToken) {
                    messageApi.error('Ошибка идентификации. Перезагрузите страницу.');
                    setLoading(false);
                    return;
                }

                // Исправление: передаём имя комнаты
                const response = await createRoom(
                    hostToken,
                    settings.totalPlayers,
                    settings.peopleCount,
                    settings.aiCount,
                    settings.roles,
                    "Комната Мафии"
                );

                // Перенаправляем в лобби созданной комнаты
                // Исправление: используем правильное поле shortId
                const newRoomId = response.shortId || response.roomId;
                if (!newRoomId) {
                    messageApi.error('Не удалось получить ID комнаты.');
                    setLoading(false);
                    return;
                }
                router.push(`/room/${newRoomId}/lobby`);
            } else {
                // Обновляем настройки существующей комнаты
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
            }
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            messageApi.error('Не удалось сохранить настройки. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

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