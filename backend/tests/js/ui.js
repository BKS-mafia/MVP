// js/ui.js - UI функции

import { gameState } from './state.js';
import { getRooms } from './api.js';

// Фильтрация AI сообщений
let showAiMessages = true;

// Установить фильтр AI сообщений
export function setShowAiMessages(show) {
    showAiMessages = show;
}

// Получить текущий активный чат
let currentChatId = 'cityGroup';

// Маппинг ID чата в UI элементы
const CHAT_ID_TO_TAB = {
    'general': 'cityGroup',
    'mafia': 'mafiaGroup',
    'commissioner': 'roleChat',
};

const TAB_TO_CHAT_ID = {
    'cityGroup': 'general',
    'mafiaGroup': 'mafia',
    'roleChat': 'commissioner',
};

/**
 * Обновить список игроков
 */
export function updatePlayersList() {
    const players = gameState.getState().players;
    const currentPlayer = gameState.getState().currentPlayer;
    const playersListEl = document.getElementById('players-list');
    
    if (!playersListEl) return;
    
    if (players.length === 0) {
        playersListEl.innerHTML = `
            <div style="text-align: center; color: #6b7280; padding: 20px;">
                Нет игроков в комнате
            </div>
        `;
        return;
    }
    
    playersListEl.innerHTML = players.map(player => {
        const isCurrentPlayer = currentPlayer && currentPlayer.id === player.id;
        const statusClass = player.is_alive ? 'alive' : 'dead';
        const roleClass = player.role ? player.role.toLowerCase().replace(' ', '-') : '';
        
        return `
            <div class="player-item ${statusClass} ${isCurrentPlayer ? 'current' : ''} ${roleClass}">
                <div class="player-avatar">
                    ${player.is_ai ? '🤖' : '👤'}
                </div>
                <div class="player-info">
                    <div class="player-name">
                        ${player.nickname}
                        ${isCurrentPlayer ? ' (Вы)' : ''}
                    </div>
                    <div class="player-status">
                        ${player.role ? player.role : (player.is_alive ? 'Жив' : 'Мёртв')}
                    </div>
                </div>
                ${!player.is_alive ? '<div class="dead-badge">💀</div>' : ''}
            </div>
        `;
    }).join('');
}

/**
 * Добавить сообщение в чат
 */
export function addChatMessage(message, chatId) {
    // Фильтрация AI сообщений
    if (!showAiMessages && message.is_ai) {
        return;
    }
    
    const chatMessagesEl = document.getElementById('chat-messages');
    if (!chatMessagesEl) return;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isOwn = gameState.getState().currentPlayer?.id === message.player_id;
    
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${isOwn ? 'own' : 'other'}`;
    messageEl.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${message.nickname}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(message.content)}</div>
    `;
    
    chatMessagesEl.appendChild(messageEl);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

/**
 * Добавить системное уведомление
 */
export function addSystemNotification(text) {
    const chatMessagesEl = document.getElementById('chat-messages');
    if (!chatMessagesEl) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message system';
    messageEl.innerHTML = `
        <div class="message-content system-notification">${escapeHtml(text)}</div>
    `;
    
    chatMessagesEl.appendChild(messageEl);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

/**
 * Обновить информацию об игре (фаза, день, роль, статус)
 */
export function updateGameInfo() {
    const state = gameState.getState();
    
    // Фаза
    const phaseEl = document.getElementById('display-phase');
    if (phaseEl) {
        const phase = state.gamePhase || 'LOBBY';
        phaseEl.textContent = phase.toUpperCase();
        phaseEl.className = `game-info-value phase-badge phase-${phase}`;
    }
    
    // День
    const dayEl = document.getElementById('display-day');
    if (dayEl) {
        dayEl.textContent = state.dayNumber || '-';
    }
    
    // Роль
    const roleEl = document.getElementById('display-role');
    if (roleEl) {
        const role = state.currentPlayer?.role || '-';
        roleEl.textContent = role;
        roleEl.className = `game-info-value role-badge role-${role.toLowerCase().replace(' ', '-')}`;
    }
    
    // Статус
    const statusEl = document.getElementById('display-status');
    if (statusEl) {
        const isAlive = state.currentPlayer?.is_alive !== false;
        statusEl.textContent = isAlive ? 'В игре' : 'Мёртв';
        statusEl.className = `game-info-value status-badge ${isAlive ? 'alive' : 'dead'}`;
    }
}

/**
 * Показать ночные действия
 */
export function showNightActions() {
    const nightActionsEl = document.getElementById('night-actions');
    if (nightActionsEl) {
        nightActionsEl.style.display = 'block';
    }
    
    // Обновляем список целей
    updateNightTargets();
}

/**
 * Скрыть ночные действия
 */
export function hideNightActions() {
    const nightActionsEl = document.getElementById('night-actions');
    if (nightActionsEl) {
        nightActionsEl.style.display = 'none';
    }
}

/**
 * Обновить список целей для ночных действий
 */
export function updateNightTargets() {
    const players = gameState.getState().players;
    const currentPlayer = gameState.getState().currentPlayer;
    const targetSelect = document.getElementById('select-night-target');
    
    if (!targetSelect) return;
    
    const alivePlayers = players.filter(p => p.is_alive && p.id !== currentPlayer?.id);
    
    targetSelect.innerHTML = `
        <option value="">Выберите игрока</option>
        ${alivePlayers.map(p => `
            <option value="${p.id}">${p.nickname}</option>
        `).join('')}
    `;
}

/**
 * Показать голосование
 */
export function showVotingActions() {
    const votingActionsEl = document.getElementById('voting-actions');
    if (votingActionsEl) {
        votingActionsEl.style.display = 'block';
    }
    
    // Обновляем список целей
    updateVoteTargets();
}

/**
 * Скрыть голосование
 */
export function hideVotingActions() {
    const votingActionsEl = document.getElementById('voting-actions');
    if (votingActionsEl) {
        votingActionsEl.style.display = 'none';
    }
}

/**
 * Обновить список целей для голосования
 */
export function updateVoteTargets() {
    const players = gameState.getState().players;
    const currentPlayer = gameState.getState().currentPlayer;
    const targetSelect = document.getElementById('select-vote-target');
    
    if (!targetSelect) return;
    
    const alivePlayers = players.filter(p => p.is_alive && p.id !== currentPlayer?.id);
    
    targetSelect.innerHTML = `
        <option value="">Выберите игрока</option>
        ${alivePlayers.map(p => `
            <option value="${p.id}">${p.nickname}</option>
        `).join('')}
    `;
}

/**
 * Показать результаты голосования
 */
export function showVotingResults(results) {
    const votingResultsEl = document.getElementById('voting-results');
    const voteBarsEl = document.getElementById('vote-bars');
    
    if (!votingResultsEl || !voteBarsEl) return;
    
    votingResultsEl.style.display = 'block';
    
    if (!results || !results.votes) {
        voteBarsEl.innerHTML = '<p>Нет данных о голосовании</p>';
        return;
    }
    
    // Подсчитываем голоса
    const voteCounts = {};
    Object.values(results.votes).forEach(targetId => {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });
    
    const players = gameState.getState().players;
    const maxVotes = Math.max(...Object.values(voteCounts), 1);
    
    voteBarsEl.innerHTML = Object.entries(voteCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([playerId, count]) => {
            const player = players.find(p => p.id === parseInt(playerId));
            const percentage = (count / maxVotes) * 100;
            
            return `
                <div class="vote-bar-item">
                    <div class="vote-bar-label">${player?.nickname || 'Неизвестный'}</div>
                    <div class="vote-bar-container">
                        <div class="vote-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="vote-bar-count">${count} голосов</div>
                </div>
            `;
        }).join('');
}

/**
 * Обновить отображение голосования
 */
export function updateVotingDisplay() {
    const voting = gameState.getState().voting;
    if (!voting) return;
    
    // Можно добавить live обновление голосов
    console.log('Voting update:', voting);
}

/**
 * Показать Turing Test
 */
export function showTuringTest(players) {
    const turingSectionEl = document.getElementById('turing-test-section');
    const turingPlayersListEl = document.getElementById('turing-players-list');
    
    if (!turingSectionEl || !turingPlayersListEl) return;
    
    turingSectionEl.style.display = 'block';
    
    turingPlayersListEl.innerHTML = players.map(player => `
        <div class="turing-player-item">
            <div class="turing-player-name">${player.nickname}</div>
            <div class="turing-player-vote">
                <button class="turing-vote-btn human" data-player-id="${player.id}" data-is-ai="false">
                    👤 Человек
                </button>
                <button class="turing-vote-btn ai" data-player-id="${player.id}" data-is-ai="true">
                    🤖 AI
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Обновить результат Turing Test
 */
export function updateTuringTestResult(data) {
    console.log('Turing test result:', data);
}

/**
 * Показать результаты Turing Test
 */
export function showTuringTestResults(results) {
    const turingSectionEl = document.getElementById('turing-test-section');
    
    if (!turingSectionEl) return;
    
    turingSectionEl.style.display = 'none';
    
    // Показываем результаты в чате
    if (results && results.correct) {
        addSystemNotification(`🤖 Turing Test: Вы правильно определили ${results.correct} из ${results.total} AI игроков!`);
    }
}

/**
 * Скрыть Turing Test
 */
export function hideTuringTest() {
    const turingSectionEl = document.getElementById('turing-test-section');
    if (turingSectionEl) {
        turingSectionEl.style.display = 'none';
    }
}

/**
 * Показать победителя
 */
export function showWinner(winner) {
    const winnerSectionEl = document.getElementById('winner-section');
    const winnerTeamEl = document.getElementById('winner-team');
    
    if (winnerSectionEl) {
        winnerSectionEl.style.display = 'block';
    }
    
    if (winnerTeamEl) {
        winnerTeamEl.textContent = `Победила команда: ${winner}`;
    }
}

/**
 * Показать уведомление о роли
 */
export function showRoleNotification(role) {
    const roleMessages = {
        'Mafia': '🔪 Вы - Мафия! Ваша цель - уничтожить всех мирных жителей.',
        'Doctor': '💉 Вы - Доктор! Ваша цель - защищать мирных жителей.',
        'Commissioner': '🔍 Вы - Комиссар! Ваша цель - найти и выгнать мафию.',
        'Citizen': '👥 Вы - Мирный житель! Ваша цель - найти и выгнать мафию.',
    };
    
    const message = roleMessages[role] || `Ваша роль: ${role}`;
    addSystemNotification(message);
    
    // Обновляем доступность вкладок
    updateChatAccess(role);
}

/**
 * Обновить доступность чатов по роли
 */
export function updateChatAccess(role) {
    const mafiaTab = document.getElementById('tab-mafiaGroup');
    const roleTab = document.getElementById('tab-roleChat');
    
    if (!mafiaTab || !roleTab) return;
    
    // Мафия видит чат мафии
    if (role === 'Mafia') {
        mafiaTab.classList.remove('disabled');
        const tabStatus = mafiaTab.querySelector('.tab-status');
        if (tabStatus) {
            tabStatus.textContent = 'Активен';
            tabStatus.classList.remove('inactive');
        }
    }
    
    // Комиссар и Доктор видят чат ролей
    if (role === 'Commissioner' || role === 'Doctor') {
        roleTab.classList.remove('disabled');
        const tabStatus = roleTab.querySelector('.tab-status');
        if (tabStatus) {
            tabStatus.textContent = 'Активен';
            tabStatus.classList.remove('inactive');
        }
    }
}

/**
 * Обновить таймер фазы
 */
export function updatePhaseTimer(data) {
    console.log('Phase timer update:', data);
    // Можно добавить визуальное отображение таймера
}

/**
 * Переключить вкладку чата
 */
export function switchChatTab(tabId) {
    const tabs = document.querySelectorAll('.chat-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === `tab-${tabId}`) {
            tab.classList.add('active');
        }
    });
    
    currentChatId = tabId;
}

/**
 * Очистить чат
 */
export function clearChat() {
    const chatMessagesEl = document.getElementById('chat-messages');
    if (chatMessagesEl) {
        chatMessagesEl.innerHTML = '';
    }
}

/**
 * Обновить статус подключения WebSocket
 */
export function updateConnectionStatus(connected) {
    const indicator = document.getElementById('ws-status-indicator');
    const text = document.getElementById('ws-status-text');
    
    if (indicator) {
        indicator.className = `status-indicator ${connected ? 'connected' : 'disconnected'}`;
    }
    
    if (text) {
        text.textContent = connected ? 'Подключено' : 'Отключено';
    }
}

/**
 * Прокрутить чат вниз
 */
export function scrollChatToBottom() {
    const chatMessagesEl = document.getElementById('chat-messages');
    if (chatMessagesEl) {
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }
}

/**
 * Вспомогательная функция для экранирования HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Получить и отобразить список комнат
 */
export async function fetchRooms(status = '') {
    try {
        const rooms = await getRooms(status);
        renderRoomsList(rooms);
        return rooms;
    } catch (error) {
        console.error('Ошибка загрузки комнат:', error);
        const roomsListEl = document.getElementById('rooms-list');
        if (roomsListEl) {
            roomsListEl.innerHTML = `
                <div style="text-align: center; color: #ef4444; padding: 20px;">
                    Ошибка загрузки: ${error.message}
                </div>
            `;
        }
        return null;
    }
}

/**
 * Отобразить список комнат
 */
export function renderRoomsList(rooms) {
    const roomsListEl = document.getElementById('rooms-list');
    if (!roomsListEl) return;
    
    if (!rooms || rooms.length === 0) {
        roomsListEl.innerHTML = `
            <div style="text-align: center; color: #6b7280; padding: 20px;">
                Нет комнат для отображения
            </div>
        `;
        return;
    }
    
    roomsListEl.innerHTML = rooms.map(room => {
        const statusClass = `status-${room.status || 'lobby'}`;
        const playerCount = room.currentPlayers || room.current_players || 0;
        const totalPlayers = room.totalPlayers || room.total_players || 0;
        const aiCount = room.aiCount || room.ai_count || 0;
        
        return `
            <div class="room-item ${statusClass}" data-room-id="${room.id}" data-short-id="${room.shortId || room.short_id || ''}">
                <div class="room-header">
                    <span class="room-name">${escapeHtml(room.name || 'Комната')}</span>
                    <span class="room-status-badge ${statusClass}">${room.status || 'lobby'}</span>
                </div>
                <div class="room-details">
                    <div class="room-detail">
                        <span class="room-detail-label">ID:</span>
                        <span class="room-detail-value">${room.shortId || room.short_id || room.id}</span>
                    </div>
                    <div class="room-detail">
                        <span class="room-detail-label">Игроки:</span>
                        <span class="room-detail-value">${playerCount}/${totalPlayers}</span>
                    </div>
                    <div class="room-detail">
                        <span class="room-detail-label">AI:</span>
                        <span class="room-detail-value">${aiCount}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Добавляем обработчики клика
    roomsListEl.querySelectorAll('.room-item').forEach(item => {
        item.addEventListener('click', () => {
            const roomId = item.dataset.shortId || item.dataset.roomId;
            const inputRoomId = document.getElementById('input-room-id');
            if (inputRoomId) {
                inputRoomId.value = roomId;
            }
        });
    });
}

// Экспорт для использования в app.js
export const ui = {
    updatePlayersList,
    addChatMessage,
    addSystemNotification,
    updateGameInfo,
    showNightActions,
    hideNightActions,
    updateNightTargets,
    showVotingActions,
    hideVotingActions,
    updateVoteTargets,
    showVotingResults,
    updateVotingDisplay,
    showTuringTest,
    updateTuringTestResult,
    showTuringTestResults,
    hideTuringTest,
    showWinner,
    showRoleNotification,
    updateChatAccess,
    updatePhaseTimer,
    switchChatTab,
    clearChat,
    updateConnectionStatus,
    scrollChatToBottom,
    setShowAiMessages,
    fetchRooms,
    renderRoomsList,
};
