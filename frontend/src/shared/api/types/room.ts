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
    totalPlayers: number;
    aiCount: number;
    peopleCount: number;
    roles: RolesObject;        // объект, где ключи "0", "1", ...
    settings?: Record<string, any>; // если нужно, пока пустой объект
}

export interface CreateRoomResponse {
    host_token: string;
    status: 'lobby' | 'archiv' | 'active';
    totalPlayers: number;
    aiCount: number;
    peopleCount: number;
    roles: RolesObject;
    current_players: number;
    ai_players: number;
    human_players: number;
    settings: Record<string, any>;
    id: number;
    room_id: string;
    short_id: string;
    created_at: string;
    updated_at: string | null;
}