// src/shared/store/gameStore.ts

import { create } from 'zustand';

// Типы игроков
export interface Player {
    id: number;
    player_id: string;
    nickname: string;
    is_ai: boolean;
    is_alive: boolean;
    is_connected: boolean;
    role?: string;
    session_token?: string;
}

// Типы сообщений чата
export interface ChatMessage {
    id: string;
    player_id: number;
    nickname: string;
    content: string;
    is_ai: boolean;
    timestamp: number;
    chatName?: string; // Для расширенного чата (cityGroup, mafiaGroup, roleChat)
}

// Типы голосования
export interface Voting {
    id: string;
    type: 'day' | 'night' | 'turing_test';
    target_player_id?: number;
    votes: Record<number, number>; // player_id -> target_player_id
    is_active: boolean;
    day_number?: number;
}

// Типы состояния комнаты
export interface RoomState {
    room_id: string;
    short_id?: string;
    name: string;
    status: 'lobby' | 'starting' | 'playing' | 'finished';
    total_players: number;
    current_players: number;
    human_players: number;
    ai_players: number;
}

// Интерфейс состояния игры
interface GameState {
    // Состояние комнаты
    room: RoomState | null;
    
    // Текущий игрок
    currentPlayer: Player | null;
    sessionToken: string | null;
    
    // Игроки в комнате
    players: Player[];
    
    // Сообщения чата
    messages: ChatMessage[];
    
    // Голосования
    voting: Voting | null;
    
    // Фаза игры
    gamePhase: string | null;
    dayNumber: number;
    gameStatus: string | null;
    
    // Флаги
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    
    // Методы для работы с комнатой
    setRoom: (room: RoomState | null) => void;
    updateRoomStatus: (status: RoomState['status']) => void;
    
    // Методы для работы с игроками
    setCurrentPlayer: (player: Player | null, token?: string) => void;
    setPlayers: (players: Player[]) => void;
    addPlayer: (player: Player) => void;
    removePlayer: (playerId: number) => void;
    updatePlayer: (playerId: number, updates: Partial<Player>) => void;
    
    // Методы для работы с чатом
    addMessage: (message: ChatMessage) => void;
    clearMessages: () => void;
    
    // Методы для работы с голосованием
    setVoting: (voting: Voting | null) => void;
    updateVoting: (updates: Partial<Voting>) => void;
    
    // Методы для игрового состояния
    setGamePhase: (phase: string | null) => void;
    setDayNumber: (day: number) => void;
    setGameStatus: (status: string | null) => void;
    
    // Методы для соединения
    setConnected: (connected: boolean) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    
    // Сброс состояния
    reset: () => void;
}

const initialState = {
    room: null,
    currentPlayer: null,
    sessionToken: null,
    players: [],
    messages: [],
    voting: null,
    gamePhase: null,
    dayNumber: 1,
    gameStatus: null,
    isConnected: false,
    isLoading: false,
    error: null,
};

export const useGameStore = create<GameState>((set, get) => ({
    ...initialState,
    
    // Работа с комнатой
    setRoom: (room) => set({ room }),
    
    updateRoomStatus: (status) => set((state) => ({
        room: state.room ? { ...state.room, status } : null,
    })),
    
    // Работа с игроками
    setCurrentPlayer: (player, token) => set({ 
        currentPlayer: player,
        sessionToken: token || player?.session_token || null,
    }),
    
    setPlayers: (players) => set({ players }),
    
    addPlayer: (player) => set((state) => ({
        players: [...state.players, player],
        room: state.room ? {
            ...state.room,
            current_players: state.room.current_players + 1,
        } : null,
    })),
    
    removePlayer: (playerId) => set((state) => ({
        players: state.players.filter((p) => p.id !== playerId),
        room: state.room ? {
            ...state.room,
            current_players: Math.max(0, state.room.current_players - 1),
        } : null,
    })),
    
    updatePlayer: (playerId, updates) => set((state) => ({
        players: state.players.map((p) => 
            p.id === playerId ? { ...p, ...updates } : p
        ),
    })),
    
    // Работа с чатом
    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
    })),
    
    clearMessages: () => set({ messages: [] }),
    
    // Работа с голосованием
    setVoting: (voting) => set({ voting }),
    
    updateVoting: (updates) => set((state) => ({
        voting: state.voting ? { ...state.voting, ...updates } : null,
    })),
    
    // Игровое состояние
    setGamePhase: (phase) => set({ gamePhase: phase }),
    setDayNumber: (day) => set({ dayNumber: day }),
    setGameStatus: (status) => set({ gameStatus: status }),
    
    // Соединение
    setConnected: (connected) => set({ isConnected: connected }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    
    // Сброс
    reset: () => set(initialState),
}));

// Селекторы для удобного доступа
export const selectRoom = (state: GameState) => state.room;
export const selectCurrentPlayer = (state: GameState) => state.currentPlayer;
export const selectPlayers = (state: GameState) => state.players;
export const selectMessages = (state: GameState) => state.messages;
export const selectVoting = (state: GameState) => state.voting;
export const selectIsConnected = (state: GameState) => state.isConnected;
export const selectGamePhase = (state: GameState) => state.gamePhase;
export const selectDayNumber = (state: GameState) => state.dayNumber;