export interface RoleSettings {
    name: string;
    count: number;
    canBeHuman: boolean;
    canBeAI: boolean;
}

// Для отправки: roles — это объект с числовыми ключами
export type RolesObject = Record<string, RoleSettings>;

export interface CreateRoomRequest {
    host_token: string;        // вместо userId
    // Исправление: добавлено поле name
    name?: string;
    totalPlayers: number;
    aiCount: number;
    peopleCount: number;
    roles: RolesObject;        // объект, где ключи "0", "1", ...
    settings?: Record<string, any>; // если нужно, пока пустой объект
}

export interface CreateRoomResponse {
    hostToken: string;
    // Исправление: добавлено поле name
    name: string;
    status: 'lobby' | 'archiv' | 'active';
    totalPlayers: number;
    aiCount: number;
    peopleCount: number;
    roles: RolesObject;
    currentPlayers: number;
    aiPlayers: number;
    humanPlayers: number;
    settings: Record<string, any>;
    id: number;
    roomId: string;
    shortId: string;
    creationTime: string;
    updateTime: string | null;
}