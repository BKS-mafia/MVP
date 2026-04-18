import { axiosInstance } from '../axiosInstance';
import { CreateRoomRequest, CreateRoomResponse, RoleSettings } from '../types/room';

// Вспомогательная функция для преобразования массива ролей в объект
const rolesArrayToObject = (roles: RoleSettings[]): Record<string, RoleSettings> => {
    const obj: Record<string, RoleSettings> = {};
    roles.forEach((role, index) => {
        obj[index.toString()] = role;
    });
    return obj;
};

export const createRoom = async (
    host_token: string,
    totalPlayers: number,
    peopleCount: number,
    aiCount: number,
    rolesArray: RoleSettings[]
): Promise<CreateRoomResponse> => {
    const requestData: CreateRoomRequest = {
        host_token,
        totalPlayers,
        peopleCount,
        aiCount,
        roles: rolesArrayToObject(rolesArray),
        settings: {},
    };
    const response = await axiosInstance.post<CreateRoomResponse>('/rooms/', requestData);
    return response.data;
};

// Типы для ответа getRoom
export interface RoomPlayer {
    id: number;
    player_id: string;
    nickname: string;
    is_ai: boolean;
    is_alive: boolean;
    is_connected: boolean;
    role?: string;
    session_token?: string;
}

export interface RoomResponse {
    roomId: string;
    shortId?: string;
    name: string;
    status: string;
    totalPlayers: number;
    currentPlayers: number;
    humanPlayers: number;
    aiPlayers: number;
    settings: Record<string, unknown>;
    Players: RoomPlayer[];
    chats?: unknown[];
    creationTime?: string;
}

// GET /rooms - получить список комнат (с фильтрацией по статусу)
export const getRooms = async (status?: string): Promise<RoomResponse[]> => {
    const params = status ? { status } : {};
    const response = await axiosInstance.get<RoomResponse[]>('/rooms/', { params });
    return response.data;
};

// GET /rooms/{room_id} - получить комнату
export const getRoom = async (roomId: string): Promise<RoomResponse> => {
    const response = await axiosInstance.get<RoomResponse>(`/rooms/${roomId}`);
    return response.data;
};

// Типы для joinRoom
export interface JoinRoomRequest {
    nickname: string;
    isAI?: boolean;
}

export interface JoinRoomResponse {
    id: number;
    playerId: string;
    nickname: string;
    isAI: boolean;
    isAlive: boolean;
    isConnected: boolean;
    role?: string;
    sessionToken: string;
    roomId: number;
}

// POST /rooms/{room_id}/join - присоединиться к комнате
export const joinRoom = async (roomId: string, nickname: string, isAi: boolean = false, sessionToken?: string): Promise<JoinRoomResponse> => {
    const requestData: { nickname: string; isAI: boolean; sessionToken?: string } = {
        nickname,
        isAI: isAi,  // Backend expects camelCase
    };
    if (sessionToken) {
        requestData.sessionToken = sessionToken;
    }
    const response = await axiosInstance.post<JoinRoomResponse>(`/rooms/${roomId}/join`, requestData);
    return response.data;
};

// GET /rooms/{room_id}/players - получить список игроков
export const getPlayers = async (roomId: string): Promise<RoomPlayer[]> => {
    const response = await axiosInstance.get<RoomPlayer[]>(`/rooms/${roomId}/players`);
    return response.data;
};

// Типы для startGame
export interface StartGameResponse {
    room_id: string;
    game_id: number;
    message: string;
}

// POST /rooms/{room_id}/game/start - начать игру
export const startGame = async (roomId: string): Promise<StartGameResponse> => {
    const response = await axiosInstance.post<StartGameResponse>(`/rooms/${roomId}/game/start`);
    return response.data;
};

// Типы для updateRoom
export interface UpdateRoomRequest {
    totalPlayers?: number;
    aiCount?: number;
    peopleCount?: number;
    roles?: Record<string, RoleSettings>;
    settings?: Record<string, unknown>;
}

// PATCH /rooms/{room_id} - обновить настройки комнаты
export const updateRoom = async (roomId: string, data: UpdateRoomRequest): Promise<RoomResponse> => {
    const response = await axiosInstance.patch<RoomResponse>(`/rooms/${roomId}`, data);
    return response.data;
};

// Типы для работы с текущим игроком
export interface CurrentPlayerResponse {
    // Информация об игроке
    player_id: string;
    nickname: string;
    is_ai: boolean;
    is_registered: boolean;
    
    // Информация о комнате
    in_room: boolean;
    room_id?: string;
    short_id?: string;
    room_name?: string;
    status?: string;
}

export interface PlayerRoomResponse {
    in_room: boolean;
    room_id?: string;
    short_id?: string;
    room_name?: string;
    status?: string;
    is_registered?: boolean;
}

// GET /players/me - получить текущего игрока по session_token
export const getCurrentPlayer = async (sessionToken: string): Promise<CurrentPlayerResponse> => {
    const response = await axiosInstance.get<CurrentPlayerResponse>('/players/me', {
        params: { session_token: sessionToken },
    });
    return response.data;
};

// GET /players/me/room - получить информацию о комнате текущего игрока
export const getCurrentPlayerRoom = async (sessionToken: string): Promise<PlayerRoomResponse> => {
    const response = await axiosInstance.get<PlayerRoomResponse>('/players/me/room', {
        params: { session_token: sessionToken },
    });
    return response.data;
};

// DELETE /players/me - покинуть игру (выйти из комнаты)
export const leaveGame = async (sessionToken: string): Promise<void> => {
    await axiosInstance.delete('/players/me', {
        params: { session_token: sessionToken },
    });
};

// Типы для регистрации никнейма
export interface RegisterNicknameRequest {
    sessionToken: string;
    nickname: string;
}

// POST /players/me/register - зарегистрировать никнейм игрока
export const registerNickname = async (sessionToken: string, nickname: string): Promise<CurrentPlayerResponse> => {
    const requestData: RegisterNicknameRequest = {
        sessionToken,
        nickname,
    };
    const response = await axiosInstance.post<CurrentPlayerResponse>('/players/me/register', requestData);
    return response.data;
};