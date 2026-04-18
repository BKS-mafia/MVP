"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Spin, message } from 'antd';
import { TelegramClone } from '@/src/widget/TelegramClone';
import { websocketClient } from '@/src/shared/api/websocket';
import { useGameStore, ChatMessage, Player, Voting } from '@/src/shared/store/gameStore';
import { getRoom, getPlayers } from '@/src/shared/api/endpoints/rooms';
import { getToken } from '@/src/shared/lib/getToken';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.id as string;
    
    const [loading, setLoading] = useState(true);
    const [messageApi, contextHolder] = message.useMessage();
    
    const {
        room,
        currentPlayer,
        sessionToken,
        players,
        messages,
        voting,
        setRoom,
        setCurrentPlayer,
        setPlayers: setStorePlayers,
        setConnected,
        addMessage,
        setVoting,
        setGamePhase,
        setDayNumber,
        setGameStatus,
    } = useGameStore();

    // Инициализация при загрузке страницы
    useEffect(() => {
        const initialize = async () => {
            if (!roomId) return;
            
            try {
                // Загружаем данные комнаты
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

                // Загружаем игроков
                const playersData = await getPlayers(roomId);
                setStorePlayers(playersData.map((p) => ({
                    id: p.id,
                    player_id: p.player_id,
                    nickname: p.nickname,
                    is_ai: p.is_ai,
                    is_alive: p.is_alive,
                    is_connected: p.is_connected,
                    role: p.role,
                    session_token: p.session_token,
                })));

                // Находим текущего игрока по токену
                const token = getToken();
                const current = playersData.find(p => p.session_token === token);
                if (current) {
                    setCurrentPlayer({
                        id: current.id,
                        player_id: current.player_id,
                        nickname: current.nickname,
                        is_ai: current.is_ai,
                        is_alive: current.is_alive,
                        is_connected: current.is_connected,
                        role: current.role,
                        session_token: current.session_token,
                    }, current.session_token || undefined);
                }
            } catch (error) {
                console.error('Ошибка инициализации:', error);
                messageApi.error('Не удалось загрузить данные игры');
                router.push('/');
            } finally {
                setLoading(false);
            }
        };

        initialize();
    }, [roomId, router, messageApi, setRoom, setStorePlayers, setCurrentPlayer]);

    // Подключение к WebSocket
    useEffect(() => {
        // Используем токен из store или из localStorage как резервный
        const token = sessionToken || getToken();
        
        if (!roomId || !token || loading) {
            console.warn('No token available for WebSocket connection');
            return;
        }

        // Подключаемся к WebSocket
        websocketClient.connect(roomId, token);
        setConnected(true);

        // Обработчики событий
        const handleConnect = () => {
            console.log('WebSocket connected in game');
            setConnected(true);
        };

        const handleDisconnect = (data: unknown) => {
            console.log('WebSocket disconnected in game', data);
            setConnected(false);
        };

        const handleError = (error: unknown) => {
            console.error('WebSocket error in game:', error);
        };

        // Обработка сообщений чата
        const handleChatMessage = (data: unknown) => {
            const msg = data as {
                type: string;
                player_id: number;
                nickname: string;
                content: string;
                is_ai: boolean;
                timestamp: number;
                chatName?: string;
            };
            
            if (msg.type === 'chat_message') {
                const chatMsg: ChatMessage = {
                    id: `msg-${Date.now()}-${Math.random()}`,
                    player_id: msg.player_id,
                    nickname: msg.nickname,
                    content: msg.content,
                    is_ai: msg.is_ai,
                    timestamp: msg.timestamp,
                    chatName: msg.chatName,
                };
                addMessage(chatMsg);
            }
        };

        // Обработка системных уведомлений
        const handleSystemNotification = (data: unknown) => {
            const msg = data as {
                type: string;
                message: string;
                timestamp: number;
            };
            
            if (msg.type === 'system_notification') {
                const chatMsg: ChatMessage = {
                    id: `sys-${Date.now()}-${Math.random()}`,
                    player_id: 0,
                    nickname: 'Система',
                    content: msg.message,
                    is_ai: false,
                    timestamp: msg.timestamp,
                };
                addMessage(chatMsg);
            }
        };

        // Обработка голосования
        const handleVoting = (data: unknown) => {
            const vote = data as {
                type: string;
                id: string;
                target_player_id?: number;
                votes: Record<number, number>;
                is_active: boolean;
                day_number?: number;
            };
            
            if (vote.type === 'voting_started' || vote.type === 'voting_update') {
                setVoting({
                    id: vote.id,
                    type: 'day',
                    target_player_id: vote.target_player_id,
                    votes: vote.votes,
                    is_active: vote.is_active,
                    day_number: vote.day_number,
                });
            } else if (vote.type === 'voting_ended') {
                setVoting(null);
            }
        };

        // Обработка смены фазы игры
        const handlePhaseChange = (data: unknown) => {
            const phaseData = data as {
                type: string;
                phase: string;
                day_number: number;
            };
            
            if (phaseData.type === 'phase_changed') {
                setGamePhase(phaseData.phase);
                setDayNumber(phaseData.day_number);
            }
        };

        // Обработка обновления игроков
        const handlePlayerUpdate = (data: unknown) => {
            const update = data as {
                type: string;
                player_id: number;
                is_alive?: boolean;
                is_connected?: boolean;
            };
            
            if (update.type === 'player_updated') {
                useGameStore.getState().updatePlayer(update.player_id, {
                    is_alive: update.is_alive,
                    is_connected: update.is_connected,
                });
            }
        };

        // Обработка событий игры
        const handleGameEvent = (data: unknown) => {
            const event = data as {
                type: string;
                message: string;
                timestamp: number;
            };
            
            if (event.type === 'game_event') {
                const chatMsg: ChatMessage = {
                    id: `event-${Date.now()}-${Math.random()}`,
                    player_id: 0,
                    nickname: 'Игра',
                    content: event.message,
                    is_ai: false,
                    timestamp: event.timestamp,
                };
                addMessage(chatMsg);
            }
        };

        // Обработка конца игры
        const handleGameEnd = (data: unknown) => {
            const endData = data as {
                type: string;
                winner: string;
                message: string;
            };
            
            if (endData.type === 'game_ended') {
                setGameStatus('finished');
                const chatMsg: ChatMessage = {
                    id: `end-${Date.now()}`,
                    player_id: 0,
                    nickname: 'Игра завершена',
                    content: `${endData.winner} победили! ${endData.message}`,
                    is_ai: false,
                    timestamp: Date.now(),
                };
                addMessage(chatMsg);
            }
        };

        // Подписываемся на события
        websocketClient.on('connect', handleConnect);
        websocketClient.on('disconnect', handleDisconnect);
        websocketClient.on('error', handleError);
        websocketClient.on('chat_message', handleChatMessage);
        websocketClient.on('system_notification', handleSystemNotification);
        websocketClient.on('voting_started', handleVoting);
        websocketClient.on('voting_update', handleVoting);
        websocketClient.on('voting_ended', handleVoting);
        websocketClient.on('phase_changed', handlePhaseChange);
        websocketClient.on('player_updated', handlePlayerUpdate);
        websocketClient.on('game_event', handleGameEvent);
        websocketClient.on('game_ended', handleGameEnd);

        // Отключение при размонтировании
        return () => {
            websocketClient.off('connect', handleConnect);
            websocketClient.off('disconnect', handleDisconnect);
            websocketClient.off('error', handleError);
            websocketClient.off('chat_message', handleChatMessage);
            websocketClient.off('system_notification', handleSystemNotification);
            websocketClient.off('voting_started', handleVoting);
            websocketClient.off('voting_update', handleVoting);
            websocketClient.off('voting_ended', handleVoting);
            websocketClient.off('phase_changed', handlePhaseChange);
            websocketClient.off('player_updated', handlePlayerUpdate);
            websocketClient.off('game_event', handleGameEvent);
            websocketClient.off('game_ended', handleGameEnd);
            websocketClient.disconnect();
        };
    }, [roomId, sessionToken, loading, setConnected, addMessage, setVoting, setGamePhase, setDayNumber, setGameStatus]);

    // Обработчик отправки сообщения
    const handleSendMessage = useCallback((text: string, chatName?: string) => {
        const token = sessionToken || getToken();
        if (!text.trim() || !token) return;
        
        websocketClient.send({
            type: 'send_message',
            content: text.trim(),
            chatName: chatName || 'general',
        });
    }, [sessionToken]);

    // Обработчик голосования
    const handleVote = useCallback((targetPlayerId: number, votingId: string) => {
        const token = sessionToken || getToken();
        if (!token) return;
        
        websocketClient.send({
            type: 'vote',
            voting_id: votingId,
            target_player_id: targetPlayerId,
        });
    }, [sessionToken]);

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
            <TelegramCloneWrapper
                messages={messages}
                players={players}
                currentPlayer={currentPlayer}
                voting={voting}
                onSendMessage={handleSendMessage}
                onVote={handleVote}
            />
        </div>
    );
}

// Компонент-обёртка для передачи данных в TelegramClone
interface TelegramCloneWrapperProps {
    messages: ChatMessage[];
    players: Player[];
    currentPlayer: Player | null;
    voting: Voting | null;
    onSendMessage: (text: string, chatName?: string) => void;
    onVote: (targetPlayerId: number, votingId: string) => void;
}

function TelegramCloneWrapper({
    messages,
    players,
    currentPlayer,
    voting,
    onSendMessage,
    onVote
}: TelegramCloneWrapperProps) {
    // Здесь мы передаём данные в существующий виджет
    // Пока возвращаем стандартный компонент - данные будут приходить через WebSocket
    return <TelegramClone />;
}