// js/app.js - Главный файл инициализации

import * as api from './api.js';
import { websocketClient } from './websocket.js';
import { registerHandlers } from './handlers.js';
import { gameState } from './state.js';
import { ui } from './ui.js';

// Глобальные переменные
let hostToken = null;
let currentRoomId = null;
let currentPlayerId = null;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('AI Mafia Dev Server initialized');
    
    // Регистрируем WebSocket обработчики
    registerHandlers(websocketClient);
    
    // Привязываем обработчики UI
    bindUIEvents();
    
    // Инициализируем UI
    ui.updateConnectionStatus(false);
    ui.updatePlayersList();
    ui.updateGameInfo();
    
    // Логируем информацию
    log('Добро пожаловать в AI Mafia Dev Server!');
    log('Выберите сервер и создайте или присоединитесь к комнате.');
});

// ==================== UI СОБЫТИЯ ====================

function bindUIEvents() {
    // Селектор сервера
    const serverSelect = document.getElementById('select-server');
    if (serverSelect) {
        serverSelect.addEventListener('change', (e) => {
            api.setBaseUrl(e.target.value);
            log(`Сервер изменен на: ${e.target.value}`);
        });
    }
    
    // Создание комнаты
    const btnCreateRoom = document.getElementById('btn-create-room');
    if (btnCreateRoom) {
        btnCreateRoom.addEventListener('click', handleCreateRoom);
    }
    
    // Создание комнаты со всеми AI
    const btnCreateAllAi = document.getElementById('btn-create-all-ai');
    if (btnCreateAllAi) {
        btnCreateAllAi.addEventListener('click', handleCreateAllAiRoom);
    }
    
    // Присоединение к комнате
    const btnJoinRoom = document.getElementById('btn-join-room');
    if (btnJoinRoom) {
        btnJoinRoom.addEventListener('click', handleJoinRoom);
    }
    
    // WebSocket подключение
    const btnWsConnect = document.getElementById('btn-ws-connect');
    if (btnWsConnect) {
        btnWsConnect.addEventListener('click', handleWsConnect);
    }
    
    // WebSocket отключение
    const btnWsDisconnect = document.getElementById('btn-ws-disconnect');
    if (btnWsDisconnect) {
        btnWsDisconnect.addEventListener('click', handleWsDisconnect);
    }
    
    // Готовность
    const btnWsReady = document.getElementById('btn-ws-ready');
    if (btnWsReady) {
        btnWsReady.addEventListener('click', handleWsReady);
    }
    
    // Начать игру
    const btnWsStart = document.getElementById('btn-ws-start');
    if (btnWsStart) {
        btnWsStart.addEventListener('click', handleWsStart);
    }
    
    // Ночное действие
    const btnWsNightAction = document.getElementById('btn-ws-night-action');
    if (btnWsNightAction) {
        btnWsNightAction.addEventListener('click', handleWsNightAction);
    }
    
    // Голосование
    const btnWsVote = document.getElementById('btn-ws-vote');
    if (btnWsVote) {
        btnWsVote.addEventListener('click', handleWsVote);
    }
    
    // Отправка сообщения в чат
    const btnWsChat = document.getElementById('btn-ws-chat');
    if (btnWsChat) {
        btnWsChat.addEventListener('click', handleWsChat);
    }
    
    // Enter для отправки сообщения
    const inputChatMsg = document.getElementById('input-chat-msg');
    if (inputChatMsg) {
        inputChatMsg.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleWsChat();
            }
        });
    }
    
    // Turing Test
    const btnSubmitTuring = document.getElementById('btn-submit-turing');
    if (btnSubmitTuring) {
        btnSubmitTuring.addEventListener('click', handleSubmitTuring);
    }
    
    // Обновление списка игроков
    const btnRefreshPlayers = document.getElementById('btn-refresh-players');
    if (btnRefreshPlayers) {
        btnRefreshPlayers.addEventListener('click', handleRefreshPlayers);
    }
    
    // Очистка логов
    const btnClearLogs = document.getElementById('btn-clear-logs');
    if (btnClearLogs) {
        btnClearLogs.addEventListener('click', () => {
            const logsContainer = document.getElementById('logs-container');
            if (logsContainer) {
                logsContainer.innerHTML = '';
            }
        });
    }
    
    // Обновление списка комнат
    const btnRefreshRooms = document.getElementById('btn-refresh-rooms');
    if (btnRefreshRooms) {
        btnRefreshRooms.addEventListener('click', handleRefreshRoomsList);
    }
    
    // Фильтр по статусу комнаты
    const selectRoomStatus = document.getElementById('select-room-status');
    if (selectRoomStatus) {
        selectRoomStatus.addEventListener('change', (e) => {
            handleRefreshRoomsList(e.target.value);
        });
    }
    
    // Фильтр AI сообщений
    const checkboxShowAi = document.getElementById('checkbox-show-ai-messages');
    if (checkboxShowAi) {
        checkboxShowAi.addEventListener('change', (e) => {
            ui.setShowAiMessages(e.target.checked);
            log(`AI сообщения: ${e.target.checked ? 'показываются' : 'скрыты'}`);
        });
    }
    
    // Вкладки чата
    const chatTabs = document.querySelectorAll('.chat-tab');
    chatTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const chatId = tab.dataset.chat;
            if (!tab.classList.contains('disabled')) {
                ui.switchChatTab(chatId);
                log(`Переключен чат: ${chatId}`);
            }
        });
    });
}

// ==================== ОБРАБОТЧИКИ ====================

async function handleCreateRoom() {
    try {
        const totalPlayers = parseInt(document.getElementById('input-total-players').value) || 8;
        const aiCount = parseInt(document.getElementById('input-ai-count').value) || 3;
        const peopleCount = totalPlayers - aiCount;
        
        log(`Создание комнаты: ${totalPlayers} игроков (${peopleCount} людей, ${aiCount} AI)`);
        
        // Генерируем host token
        hostToken = generateToken();
        
        // Роли по умолчанию
        const roles = getDefaultRoles(totalPlayers);
        
        const room = await api.createRoom(hostToken, totalPlayers, peopleCount, aiCount, roles);
        
        currentRoomId = room.roomId;
        
        // Сохраняем host token
        gameState.setRoom({
            room_id: room.roomId,
            short_id: room.shortId,
            name: room.name,
            status: 'lobby',
            total_players: totalPlayers,
            current_players: 0,
            human_players: peopleCount,
            ai_players: aiCount,
        });
        
        // Обновляем UI
        document.getElementById('display-room-id').textContent = room.roomId;
        document.getElementById('display-short-id').textContent = room.shortId || '-';
        document.getElementById('display-host-token').textContent = hostToken.substring(0, 20) + '...';
        
        log(`Комната создана! Room ID: ${room.roomId}, Short ID: ${room.shortId}`);
        
        // Автоматически присоединяемся как хост
        await autoJoinAsHost(room.roomId);
        
    } catch (error) {
        log(`Ошибка создания комнаты: ${error.message}`, 'error');
        console.error(error);
    }
}

async function handleCreateAllAiRoom() {
    try {
        const totalPlayers = parseInt(document.getElementById('input-total-players').value) || 8;
        const aiCount = totalPlayers - 1; // 1 человек (мы)
        const peopleCount = 1;
        
        log(`Создание комнаты (все AI): ${totalPlayers} игроков (${peopleCount} людей, ${aiCount} AI)`);
        
        hostToken = generateToken();
        const roles = getDefaultRoles(totalPlayers);
        
        const room = await api.createRoom(hostToken, totalPlayers, peopleCount, aiCount, roles);
        
        currentRoomId = room.roomId;
        
        gameState.setRoom({
            room_id: room.roomId,
            short_id: room.shortId,
            name: room.name,
            status: 'lobby',
            total_players: totalPlayers,
            current_players: 0,
            human_players: peopleCount,
            ai_players: aiCount,
        });
        
        document.getElementById('display-room-id').textContent = room.roomId;
        document.getElementById('display-short-id').textContent = room.shortId || '-';
        document.getElementById('display-host-token').textContent = hostToken.substring(0, 20) + '...';
        
        log(`Комната создана! Room ID: ${room.roomId}`);
        
        await autoJoinAsHost(room.roomId);
        
    } catch (error) {
        log(`Ошибка создания комнаты: ${error.message}`, 'error');
        console.error(error);
    }
}

async function autoJoinAsHost(roomId) {
    try {
        const nickname = 'Host';
        const joinResponse = await api.joinRoom(roomId, nickname, false, hostToken);
        
        currentPlayerId = joinResponse.id;
        
        gameState.setCurrentPlayer({
            id: joinResponse.id,
            player_id: joinResponse.playerId,
            nickname: joinResponse.nickname,
            is_ai: joinResponse.isAI,
            is_alive: joinResponse.isAlive,
            is_connected: true,
            role: null,
            session_token: joinResponse.sessionToken,
        }, joinResponse.sessionToken);
        
        document.getElementById('input-session-token').value = joinResponse.sessionToken || '';
        
        log(`Присоединен как хост! Player ID: ${joinResponse.id}`);
        
        // Обновляем список игроков
        await handleRefreshPlayers();
        
        // Включаем кнопки
        enableGameControls(true);
        
    } catch (error) {
        log(`Ошибка присоединения: ${error.message}`, 'error');
        console.error(error);
    }
}

async function handleJoinRoom() {
    try {
        const roomId = document.getElementById('input-room-id').value.trim();
        const nickname = document.getElementById('input-nickname').value.trim() || 'Player1';
        const isAi = document.getElementById('checkbox-is-ai').checked;
        
        if (!roomId) {
            log('Введите Room ID или Short ID', 'error');
            return;
        }
        
        log(`Присоединение к комнате: ${roomId} как ${nickname}`);
        
        const joinResponse = await api.joinRoom(roomId, nickname, isAi);
        
        currentRoomId = roomId;
        currentPlayerId = joinResponse.id;
        
        gameState.setCurrentPlayer({
            id: joinResponse.id,
            player_id: joinResponse.playerId,
            nickname: joinResponse.nickname,
            is_ai: joinResponse.isAI,
            is_alive: joinResponse.isAlive,
            is_connected: true,
            role: null,
            session_token: joinResponse.sessionToken,
        }, joinResponse.sessionToken);
        
        document.getElementById('input-session-token').value = joinResponse.sessionToken || '';
        
        log(`Присоединен! Player ID: ${joinResponse.id}`);
        
        // Получаем информацию о комнате
        try {
            const room = await api.getRoom(roomId);
            gameState.setRoom({
                room_id: room.roomId,
                short_id: room.shortId,
                name: room.name,
                status: room.status,
                total_players: room.totalPlayers,
                current_players: room.currentPlayers,
                human_players: room.humanPlayers,
                ai_players: room.aiPlayers,
            });
        } catch (e) {
            console.error('Не удалось получить информацию о комнате:', e);
        }
        
        await handleRefreshPlayers();
        enableGameControls(true);
        
    } catch (error) {
        log(`Ошибка присоединения: ${error.message}`, 'error');
        console.error(error);
    }
}

async function handleWsConnect() {
    const sessionToken = document.getElementById('input-session-token').value;
    
    if (!currentRoomId || !sessionToken) {
        log('Нет Room ID или Session Token', 'error');
        return;
    }
    
    log('Подключение к WebSocket...');
    
    websocketClient.connect(currentRoomId, sessionToken);
    
    // Ждём подключения
    setTimeout(() => {
        if (websocketClient.isConnected()) {
            ui.updateConnectionStatus(true);
            log('WebSocket подключен!');
        } else {
            log('WebSocket не подключен. Проверьте консоль.', 'error');
        }
    }, 1000);
}

function handleWsDisconnect() {
    log('Отключение от WebSocket...');
    websocketClient.disconnect();
    ui.updateConnectionStatus(false);
    log('WebSocket отключен');
    enableWsControls(false);
}

function handleWsReady() {
    log('Отправка ready...');
    websocketClient.send({ type: 'ready', is_ready: true });
}

async function handleWsStart() {
    if (!currentRoomId) {
        log('Нет Room ID', 'error');
        return;
    }
    
    try {
        log('Запуск игры...');
        const result = await api.startGame(currentRoomId);
        log(`Игра началась! ${result.message}`);
    } catch (error) {
        log(`Ошибка запуска игры: ${error.message}`, 'error');
        console.error(error);
    }
}

function handleWsNightAction() {
    const action = document.getElementById('select-night-action').value;
    const targetId = document.getElementById('select-night-target').value;
    
    if (!targetId) {
        log('Выберите цель для ночного действия', 'error');
        return;
    }
    
    log(`Отправка ночного действия: ${action} -> ${targetId}`);
    websocketClient.send({
        type: 'night_action',
        action: action,
        target_id: parseInt(targetId),
    });
}

function handleWsVote() {
    const targetId = document.getElementById('select-vote-target').value;
    
    if (!targetId) {
        log('Выберите цель для голосования', 'error');
        return;
    }
    
    const voting = gameState.getState().voting;
    
    log(`Отправка голоса за: ${targetId}`);
    websocketClient.send({
        type: 'vote',
        voting_id: voting?.id,
        target_id: parseInt(targetId),
    });
}

function handleWsChat() {
    const inputChatMsg = document.getElementById('input-chat-msg');
    const message = inputChatMsg?.value.trim();
    
    if (!message) {
        return;
    }
    
    // Определяем текущий чат
    const activeTab = document.querySelector('.chat-tab.active');
    const chatType = activeTab?.dataset.chat || 'cityGroup';
    
    // Генерируем clientMessageId для дедупликации
    const clientMessageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let wsMessage;
    
    if (chatType === 'cityGroup') {
        wsMessage = {
            type: 'chat_message',
            content: message,
            clientMessageId,
        };
    } else if (chatType === 'mafiaGroup') {
        wsMessage = {
            type: 'chat_message_extended',
            chatName: 'mafiaGroup',
            body: message,
            clientMessageId,
        };
    } else if (chatType === 'roleChat') {
        wsMessage = {
            type: 'chat_message_extended',
            chatName: 'roleChat',
            body: message,
            clientMessageId,
        };
    }
    
    websocketClient.send(wsMessage);
    
    if (inputChatMsg) {
        inputChatMsg.value = '';
    }
}

function handleSubmitTuring() {
    const buttons = document.querySelectorAll('.turing-vote-btn.selected');
    const votes = [];
    
    buttons.forEach(btn => {
        votes.push({
            player_id: parseInt(btn.dataset.playerId),
            is_ai: btn.dataset.isAi === 'true',
        });
    });
    
    log(`Отправка Turing Test результатов: ${votes.length} голосов`);
    websocketClient.send({
        type: 'turing_test_vote',
        votes: votes,
    });
    
    ui.hideTuringTest();
}

async function handleRefreshPlayers() {
    if (!currentRoomId) {
        return;
    }
    
    try {
        const players = await api.getPlayers(currentRoomId);
        gameState.setPlayers(players);
        ui.updatePlayersList();
        ui.updateNightTargets();
        ui.updateVoteTargets();
        log(`Обновлен список игроков: ${players.length}`);
    } catch (error) {
        log(`Ошибка обновления игроков: ${error.message}`, 'error');
    }
}

async function handleRefreshRoomsList(status = '') {
    try {
        log(`Загрузка списка комнат${status ? ` (статус: ${status})` : ''}...`);
        const rooms = await ui.fetchRooms(status);
        if (rooms) {
            log(`Загружено комнат: ${rooms.length}`);
        }
    } catch (error) {
        log(`Ошибка загрузки комнат: ${error.message}`, 'error');
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function enableGameControls(enabled) {
    const btnWsConnect = document.getElementById('btn-ws-connect');
    const btnWsReady = document.getElementById('btn-ws-ready');
    const btnWsStart = document.getElementById('btn-ws-start');
    
    if (btnWsConnect) btnWsConnect.disabled = !enabled;
    if (btnWsReady) btnWsReady.disabled = !enabled;
    if (btnWsStart) btnWsStart.disabled = !enabled;
}

function enableWsControls(enabled) {
    const btnWsConnect = document.getElementById('btn-ws-connect');
    const btnWsDisconnect = document.getElementById('btn-ws-disconnect');
    
    if (btnWsConnect) btnWsConnect.disabled = enabled;
    if (btnWsDisconnect) btnWsDisconnect.disabled = !enabled;
}

function generateToken() {
    return 'token_' + Math.random().toString(36).substr(2) + Date.now().toString(36);
}

function getDefaultRoles(totalPlayers) {
    const roles = [];
    
    // Мафия
    const mafiaCount = Math.floor(totalPlayers / 4);
    for (let i = 0; i < mafiaCount; i++) {
        roles.push({ name: 'mafia', count: 1, canBeHuman: true, canBeAI: true });
    }
    
    // Доктор
    roles.push({ name: 'doctor', count: 1, canBeHuman: true, canBeAI: true });
    
    // Комиссар
    roles.push({ name: 'commissioner', count: 1, canBeHuman: true, canBeAI: true });
    
    // Мирные жители
    const citizenCount = totalPlayers - mafiaCount - 2;
    if (citizenCount > 0) {
        roles.push({ name: 'civilian', count: citizenCount, canBeHuman: true, canBeAI: true });
    }
    
    return roles;
}

function log(message, type = 'info') {
    const logsContainer = document.getElementById('logs-container');
    if (!logsContainer) return;
    
    const time = new Date().toLocaleTimeString();
    const logEl = document.createElement('div');
    logEl.className = `log-entry log-${type}`;
    logEl.innerHTML = `<span class="log-time">${time}</span> ${message}`;
    
    logsContainer.appendChild(logEl);
    logsContainer.scrollTop = logsContainer.scrollHeight;
    
    console.log(`[LOG] ${message}`);
}

// Экспорт для отладки
window.gameState = gameState;
window.websocketClient = websocketClient;
window.api = api;
window.ui = ui;
