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
    is_ai?: boolean;
}

export interface JoinRoomResponse {
    id: number;
    player_id: string;
    nickname: string;
    is_ai: boolean;
    is_alive: boolean;
    is_connected: boolean;
    role?: string;
    session_token: string;
    room_id: number;
}

// POST /rooms/{room_id}/join - присоединиться к комнате
export const joinRoom = async (roomId: string, nickname: string, isAi: boolean = false): Promise<JoinRoomResponse> => {
    const requestData: JoinRoomRequest = {
        nickname,
        is_ai: isAi,
    };
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