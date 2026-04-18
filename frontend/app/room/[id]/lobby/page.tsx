"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { message, Spin, Button } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

import './Lobby.css';
import Lobby from "@/src/widget/Lobby";
import { getPlayers, startGame, RoomPlayer } from '@/src/shared/api/endpoints/rooms';
import { websocketClient } from '@/src/shared/api/websocket';
import { useGameStore } from '@/src/shared/store/gameStore';
import { getToken } from '@/src/shared/lib/getToken';

interface Player {
    id: string;
    name: string;
    avatar?: string | null;
}

export default function LobbyPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;
    
    const [players, setPlayers] = useState<Player[]>([]);
    const [maxPlayers, setMaxPlayers] = useState(10);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    
    const {
        room,
        currentPlayer,
        sessionToken,
        setPlayers: setStorePlayers,
        setConnected,
        addPlayer,
        removePlayer,
    } = useGameStore();

    // Проверка, является ли текущий игрок хостом
    const isHost = currentPlayer?.session_token === getToken();

    // Загрузка игроков при монтировании
    useEffect(() => {
        const loadPlayers = async () => {
            if (!roomId) return;
            
            try {
                const playersData = await getPlayers(roomId);
                
                // Преобразуем данные игроков в формат для отображения
                const formattedPlayers: Player[] = playersData.map((p: RoomPlayer) => ({
                    id: p.player_id || String(p.id),
                    name: p.nickname,
                    avatar: p.is_ai ? null : null,
                }));
                
                setPlayers(formattedPlayers);
                setStorePlayers(playersData.map((p: RoomPlayer) => ({
                    id: p.id,
                    player_id: p.player_id,
                    nickname: p.nickname,
                    is_ai: p.is_ai,
                    is_alive: p.is_alive,
                    is_connected: p.is_connected,
                    role: p.role,
                    session_token: p.session_token,
                })));
                
                // Получаем данные комнаты для maxPlayers
                if (room) {
                    setMaxPlayers(room.total_players);
                }
            } catch (error) {
                console.error('Ошибка загрузки игроков:', error);
                messageApi.error('Не удалось загрузить список игроков');
            } finally {
                setLoading(false);
            }
        };

        loadPlayers();
    }, [roomId, room, setStorePlayers, messageApi]);

    // Подключение к WebSocket
    useEffect(() => {
        if (!roomId || !sessionToken) return;

        // Подключаемся к WebSocket
        websocketClient.connect(roomId, sessionToken);
        setConnected(true);

        // Обработчики событий
        const handleConnect = () => {
            console.log('WebSocket connected in lobby');
            setConnected(true);
        };

        const handleDisconnect = () => {
            console.log('WebSocket disconnected in lobby');
            setConnected(false);
        };

        const handlePlayerJoined = (data: unknown) => {
            const playerData = data as { player_id: string; nickname: string; is_ai: boolean };
            const newPlayer: Player = {
                id: playerData.player_id,
                name: playerData.nickname,
                avatar: null,
            };
            setPlayers(prev => [...prev, newPlayer]);
            addPlayer({
                id: Date.now(),
                player_id: playerData.player_id,
                nickname: playerData.nickname,
                is_ai: playerData.is_ai,
                is_alive: true,
                is_connected: true,
            });
        };

        const handlePlayerLeft = (data: unknown) => {
            const playerData = data as { player_id: string };
            setPlayers(prev => prev.filter(p => p.id !== playerData.player_id));
        };

        const handleGameStarted = (data: unknown) => {
            // Перенаправляем на страницу игры
            router.push(`/room/${roomId}`);
        };

        // Подписываемся на события
        websocketClient.on('connect', handleConnect);
        websocketClient.on('disconnect', handleDisconnect);
        websocketClient.on('player_joined', handlePlayerJoined);
        websocketClient.on('player_left', handlePlayerLeft);
        websocketClient.on('game_started', handleGameStarted);

        // Отключение при размонтировании
        return () => {
            websocketClient.off('connect', handleConnect);
            websocketClient.off('disconnect', handleDisconnect);
            websocketClient.off('player_joined', handlePlayerJoined);
            websocketClient.off('player_left', handlePlayerLeft);
            websocketClient.off('game_started', handleGameStarted);
            websocketClient.disconnect();
        };
    }, [roomId, sessionToken, router, setConnected, addPlayer]);

    // Обработчик старта игры (для хоста)
    const handleStartGame = useCallback(async () => {
        if (!roomId) return;
        
        setStarting(true);
        try {
            await startGame(roomId);
            // Перенаправление произойдет через WebSocket событие или сразу
            router.push(`/room/${roomId}`);
        } catch (error) {
            console.error('Ошибка старта игры:', error);
            messageApi.error('Не удалось начать игру. Убедитесь, что все игроки подключены.');
        } finally {
            setStarting(false);
        }
    }, [roomId, router, messageApi]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            {contextHolder}
            {isHost && players.length >= 2 && (
                <div style={{
                    position: 'fixed',
                    top: 20,
                    right: 20,
                    zIndex: 1000
                }}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlayCircleOutlined />}
                        onClick={handleStartGame}
                        loading={starting}
                    >
                        Начать игру
                    </Button>
                </div>
            )}
            <Lobby
                maxPlayers={maxPlayers}
                players={players}
            />
        </div>
    );
}