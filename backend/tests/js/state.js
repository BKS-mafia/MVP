// js/state.js - Zustand-like store для управления состоянием игры

// Типы игроков
export const Player = {
    id: 0,
    player_id: '',
    nickname: '',
    is_ai: false,
    is_alive: true,
    is_connected: true,
    role: null,
    session_token: null,
};

// Типы сообщений чата
export const ChatMessage = {
    id: '',
    player_id: 0,
    nickname: '',
    content: '',
    is_ai: false,
    timestamp: 0,
    chatName: null,
};

// Типы голосования
export const Voting = {
    id: '',
    type: 'day',
    target_player_id: null,
    votes: {},
    is_active: false,
    day_number: null,
};

// Типы состояния комнаты
export const RoomState = {
    room_id: '',
    short_id: null,
    name: '',
    status: 'lobby',
    total_players: 0,
    current_players: 0,
    human_players: 0,
    ai_players: 0,
};

// Начальное состояние
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
    phaseTimer: null,
    isConnected: false,
    isLoading: false,
    error: null,
};

// Хранилище состояния
class GameStateStore {
    constructor() {
        this.state = { ...initialState };
        this.listeners = new Set();
    }

    // Получить текущее состояние
    getState() {
        return this.state;
    }

    // Подписаться на изменения
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // Уведомить всех слушателей
    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // Обновить состояние
    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.notify();
    }

    // Работа с комнатой
    setRoom(room) {
        this.setState({ room });
    }

    updateRoomStatus(status) {
        if (this.state.room) {
            this.setState({
                room: { ...this.state.room, status }
            });
        }
    }

    // Работа с игроками
    setCurrentPlayer(player, token) {
        this.setState({
            currentPlayer: player,
            sessionToken: token || player?.session_token || null,
        });
    }

    setPlayers(players) {
        this.setState({ players });
    }

    addPlayer(player) {
        const newPlayers = [...this.state.players, player];
        this.setState({
            players: newPlayers,
            room: this.state.room ? {
                ...this.state.room,
                current_players: newPlayers.length,
            } : null,
        });
    }

    removePlayer(playerId) {
        const newPlayers = this.state.players.filter(p => p.id !== playerId);
        this.setState({
            players: newPlayers,
            room: this.state.room ? {
                ...this.state.room,
                current_players: Math.max(0, newPlayers.length),
            } : null,
        });
    }

    updatePlayer(playerId, updates) {
        this.setState({
            players: this.state.players.map(p =>
                p.id === playerId ? { ...p, ...updates } : p
            ),
        });
    }

    // Работа с чатом
    addMessage(message) {
        this.setState({
            messages: [...this.state.messages, message],
        });
    }

    clearMessages() {
        this.setState({ messages: [] });
    }

    // Работа с голосованием
    setVoting(voting) {
        this.setState({ voting });
    }

    updateVoting(updates) {
        if (this.state.voting) {
            this.setState({
                voting: { ...this.state.voting, ...updates },
            });
        }
    }

    // Игровое состояние
    setGamePhase(phase) {
        this.setState({ gamePhase: phase });
    }

    setDayNumber(day) {
        this.setState({ dayNumber: day });
    }

    setGameStatus(status) {
        this.setState({ gameStatus: status });
    }

    setPhaseTimer(timer) {
        this.setState({ phaseTimer: timer });
    }

    // Соединение
    setConnected(connected) {
        this.setState({ isConnected: connected });
    }

    setLoading(loading) {
        this.setState({ isLoading: loading });
    }

    setError(error) {
        this.setState({ error });
    }

    // Сброс
    reset() {
        this.state = { ...initialState };
        this.notify();
    }
}

// Экспортируем singleton инстанс
export const gameState = new GameStateStore();

// Селекторы для удобного доступа
export const selectRoom = () => gameState.getState().room;
export const selectCurrentPlayer = () => gameState.getState().currentPlayer;
export const selectPlayers = () => gameState.getState().players;
export const selectMessages = () => gameState.getState().messages;
export const selectVoting = () => gameState.getState().voting;
export const selectIsConnected = () => gameState.getState().isConnected;
export const selectGamePhase = () => gameState.getState().gamePhase;
export const selectDayNumber = () => gameState.getState().dayNumber;
export const selectPhaseTimer = () => gameState.getState().phaseTimer;
