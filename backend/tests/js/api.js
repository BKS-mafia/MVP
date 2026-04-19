// js/api.js - HTTP API запросы

// Базовый URL API (будет установлен из UI)
let BASE_URL = 'http://localhost:8000';

// Установить базовый URL
export function setBaseUrl(url) {
    BASE_URL = url;
}

// Получить базовый URL
export function getBaseUrl() {
    return BASE_URL;
}

// Вспомогательная функция для преобразования snake_case в camelCase
function toCamelCase(obj) {
    if (Array.isArray(obj)) {
        return obj.map(toCamelCase);
    }
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = toCamelCase(obj[key]);
            return result;
        }, {});
    }
    return obj;
}

// Вспомогательная функция для преобразования массива ролей в объект
function rolesArrayToObject(roles) {
    const obj = {};
    roles.forEach((role, index) => {
        obj[index.toString()] = role;
    });
    return obj;
}

// POST /api/rooms/ - создание комнаты
export async function createRoom(hostToken, totalPlayers, peopleCount, aiCount, rolesArray, name = "Комната Мафии") {
    const response = await fetch(`${BASE_URL}/api/rooms/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            host_token: hostToken,
            name: name,
            totalPlayers,
            peopleCount,
            aiCount,
            roles: rolesArrayToObject(rolesArray),
            settings: {},
        }),
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
}

// GET /api/rooms/ - список комнат
export async function getRooms(status) {
    const params = status ? `?status=${status}` : '';
    const response = await fetch(`${BASE_URL}/api/rooms/${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
}

// GET /api/rooms/?status={status} - список комнат с фильтром
export async function getRoomsFiltered(status) {
    const params = status ? `?status=${status}` : '';
    const response = await fetch(`${BASE_URL}/api/rooms/${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
}

// GET /api/rooms/{room_id} - информация о комнате
export async function getRoom(roomId) {
    const response = await fetch(`${BASE_URL}/api/rooms/${roomId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
}

// PATCH /api/rooms/{room_id} - обновление настроек
export async function updateRoom(roomId, data) {
    const response = await fetch(`${BASE_URL}/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return toCamelCase(result);
}

// POST /api/rooms/{room_id}/join - присоединение к комнате
export async function joinRoom(roomId, nickname, isAi = false, sessionToken = null) {
    const requestData = {
        nickname,
        isAI: isAi,
    };
    
    if (sessionToken) {
        requestData.sessionToken = sessionToken;
    }
    
    const response = await fetch(`${BASE_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
}

// GET /api/rooms/{room_id}/players - список игроков
export async function getPlayers(roomId) {
    const response = await fetch(`${BASE_URL}/api/rooms/${roomId}/players`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
}

// POST /api/rooms/{room_id}/game/start - запуск игры
export async function startGame(roomId) {
    const response = await fetch(`${BASE_URL}/api/rooms/${roomId}/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
}

// GET /api/players/me - текущий игрок
export async function getCurrentPlayer(sessionToken) {
    const response = await fetch(`${BASE_URL}/api/players/me?session_token=${sessionToken}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
}

// GET /api/players/me/room - комната игрока
export async function getCurrentPlayerRoom(sessionToken) {
    const response = await fetch(`${BASE_URL}/api/players/me/room?session_token=${sessionToken}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
}

// POST /api/players/me/register - регистрация никнейма
export async function registerNickname(sessionToken, nickname) {
    const response = await fetch(`${BASE_URL}/api/players/me/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionToken,
            nickname,
        }),
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return toCamelCase(data);
}

// DELETE /api/players/me - покинуть комнату
export async function leaveGame(sessionToken) {
    const response = await fetch(`${BASE_URL}/api/players/me?session_token=${sessionToken}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return true;
}
