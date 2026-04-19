// js/handlers.js - Все WebSocket обработчики событий

import { gameState } from './state.js';
import { ui } from './ui.js';

// Маппинг chatName из бекенда в локальные ID
const CHAT_NAME_MAPPING = {
    'cityGroup': 'general',
    'mafiaGroup': 'mafia',
    'roleChat': 'commissioner',
};

// Множество для дедупликации сообщений
const processedMessageIds = new Set();

/**
 * Обработчик player_joined / player_joined_event
 */
export function handlePlayerJoined(data) {
    console.log('handlePlayerJoined', data);
    
    const player = {
        id: data.player?.id || data.id,
        player_id: data.player?.player_id || data.player_id,
        nickname: data.player?.nickname || data.nickname,
        is_ai: data.player?.is_ai || data.is_ai || false,
        is_alive: true,
        is_connected: true,
        role: data.player?.role || null,
        session_token: data.player?.session_token || null,
    };
    
    gameState.addPlayer(player);
    ui.updatePlayersList();
    ui.addSystemNotification(`${player.nickname} присоединился к игре`);
}

/**
 * Обработчик player_left
 */
export function handlePlayerLeft(data) {
    console.log('handlePlayerLeft', data);
    
    const playerId = data.player_id || data.id;
    const nickname = data.nickname || 'Игрок';
    
    gameState.removePlayer(playerId);
    ui.updatePlayersList();
    ui.addSystemNotification(`${nickname} покинул игру`);
}

/**
 * Обработчик game_started
 */
export function handleGameStarted(data) {
    console.log('handleGameStarted', data);
    
    gameState.updateRoomStatus('playing');
    gameState.setGamePhase('night');
    gameState.setDayNumber(1);
    gameState.setGameStatus('playing');
    
    ui.updateGameInfo();
    ui.addSystemNotification('🎮 Игра началась!');
}

/**
 * Обработчик phase_changed
 */
export function handlePhaseChanged(data) {
    console.log('handlePhaseChanged', data);
    
    const phase = data.phase || data.new_phase;
    gameState.setGamePhase(phase);
    
    if (phase === 'day') {
        gameState.setDayNumber(data.day_number || gameState.getState().dayNumber);
    }
    
    ui.updateGameInfo();
    ui.addSystemNotification(`Фаза изменена: ${phase}`);
}

/**
 * Обработчик night_started
 */
export function handleNightStarted(data) {
    console.log('handleNightStarted', data);
    
    gameState.setGamePhase('night');
    ui.updateGameInfo();
    ui.addSystemNotification('🌙 Наступила ночь...');
    ui.showNightActions();
}

/**
 * Обработчик day_started
 */
export function handleDayStarted(data) {
    console.log('handleDayStarted', data);
    
    gameState.setGamePhase('day');
    if (data.day_number) {
        gameState.setDayNumber(data.day_number);
    }
    
    ui.updateGameInfo();
    ui.addSystemNotification(`☀️ День ${data.day_number || gameState.getState().dayNumber}`);
    ui.hideNightActions();
}

/**
 * Обработчик voting_started
 */
export function handleVotingStarted(data) {
    console.log('handleVotingStarted', data);
    
    gameState.setVoting({
        id: data.voting_id || `vote-${Date.now()}`,
        type: data.voting_type || 'day',
        votes: {},
        is_active: true,
        day_number: data.day_number,
    });
    
    ui.updateGameInfo();
    ui.addSystemNotification('🗳️ Началось голосование!');
    ui.showVotingActions();
}

/**
 * Обработчик role_assigned
 */
export function handleRoleAssigned(data) {
    console.log('handleRoleAssigned', data);
    
    const role = data.role;
    const playerId = data.player_id;
    
    if (playerId && role) {
        gameState.updatePlayer(playerId, { role });
    }
    
    // Обновляем текущего игрока если это он
    const currentPlayer = gameState.getState().currentPlayer;
    if (currentPlayer && currentPlayer.id === playerId) {
        gameState.setCurrentPlayer({ ...currentPlayer, role }, null);
    }
    
    ui.updatePlayersList();
    ui.updateGameInfo();
    ui.addSystemNotification(`Ваша роль: ${role}`);
    ui.showRoleNotification(role);
}

/**
 * Обработчик chat_event (обычный чат)
 */
export function handleChatEvent(data) {
    console.log('handleChatEvent', data);
    
    // Дедупликация
    if (data.clientMessageId && processedMessageIds.has(data.clientMessageId)) {
        console.log('Duplicate message ignored:', data.clientMessageId);
        return;
    }
    if (data.clientMessageId) {
        processedMessageIds.add(data.clientMessageId);
    }
    
    const chatId = data.is_mafia_channel ? 'mafia' : 'general';
    
    ui.addChatMessage({
        id: data.clientMessageId || `msg-${Date.now()}`,
        player_id: data.player_id,
        nickname: data.nickname,
        content: data.content,
        is_ai: data.is_ai || false,
        timestamp: Date.now(),
        chatName: chatId,
    }, chatId);
}

/**
 * Обработчик chat_event_extended (расширенный чат с chatName)
 */
export function handleChatEventExtended(data) {
    console.log('handleChatEventExtended', data);
    
    // Дедупликация
    if (data.clientMessageId && processedMessageIds.has(data.clientMessageId)) {
        console.log('Duplicate message ignored:', data.clientMessageId);
        return;
    }
    if (data.clientMessageId) {
        processedMessageIds.add(data.clientMessageId);
    }
    
    // Маппим chatName из бекенда в локальный ID
    const chatId = CHAT_NAME_MAPPING[data.chatName] || data.chatName;
    
    ui.addChatMessage({
        id: data.clientMessageId || `msg-${Date.now()}`,
        player_id: data.player_id,
        nickname: data.nickname,
        content: data.body || data.content,
        is_ai: data.is_ai || false,
        timestamp: Date.now(),
        chatName: chatId,
    }, chatId);
}

/**
 * Обработчик ghost_chat_message (для мёртвых игроков)
 */
export function handleGhostChatMessage(data) {
    console.log('handleGhostChatMessage', data);
    
    const senderId = data.data?.sender_id;
    const senderName = data.data?.sender_name;
    const content = data.data?.content;
    
    ui.addChatMessage({
        id: `msg-${Date.now()}`,
        player_id: senderId,
        nickname: `👻 ${senderName}`,
        content: content,
        is_ai: false,
        timestamp: Date.now(),
        chatName: 'general',
    }, 'general');
}

/**
 * Обработчик chat_history (загрузка истории)
 */
export function handleChatHistory(data) {
    console.log('handleChatHistory', data);
    
    if (!data.messages || !Array.isArray(data.messages)) {
        return;
    }
    
    data.messages.forEach(msg => {
        // Дедупликация
        if (msg.clientMessageId && processedMessageIds.has(msg.clientMessageId)) {
            return;
        }
        if (msg.clientMessageId) {
            processedMessageIds.add(msg.clientMessageId);
        }
        
        const chatId = msg.is_mafia_channel ? 'mafia' : 'general';
        
        ui.addChatMessage({
            id: msg.clientMessageId || `msg-${Date.now()}`,
            player_id: msg.player_id,
            nickname: msg.nickname,
            content: msg.content,
            is_ai: msg.is_ai || false,
            timestamp: Date.now(),
            chatName: chatId,
        }, chatId);
    });
    
    console.log(`Loaded ${data.messages.length} messages from chat history`);
}

/**
 * Обработчик vote_received
 */
export function handleVoteReceived(data) {
    console.log('handleVoteReceived', data);
    
    const voting = gameState.getState().voting;
    if (voting) {
        const newVotes = { ...voting.votes };
        newVotes[data.voter_id] = data.target_id;
        gameState.updateVoting({ votes: newVotes });
    }
}

/**
 * Обработчик vote_update
 */
export function handleVoteUpdate(data) {
    console.log('handleVoteUpdate', data);
    
    gameState.setVoting({
        id: data.voting_id,
        type: data.voting_type || 'day',
        votes: data.votes || {},
        is_active: true,
        day_number: data.day_number,
    });
    
    ui.updateVotingDisplay();
}

/**
 * Обработчик vote_ended
 */
export function handleVoteEnded(data) {
    console.log('handleVoteEnded', data);
    
    gameState.updateVoting({ is_active: false });
    ui.hideVotingActions();
    ui.showVotingResults(data.results || data);
    ui.addSystemNotification('🗳️ Голосование завершено!');
}

/**
 * Обработчик you_died
 */
export function handleYouDied(data) {
    console.log('handleYouDied', data);
    
    const currentPlayer = gameState.getState().currentPlayer;
    if (currentPlayer) {
        gameState.updatePlayer(currentPlayer.id, { is_alive: false });
        gameState.setCurrentPlayer({ ...currentPlayer, is_alive: false }, null);
    }
    
    ui.updatePlayersList();
    ui.updateGameInfo();
    ui.addSystemNotification('💀 Вы погибли! Теперь вы можете только наблюдать.');
}

/**
 * Обработчик turing_test_started
 */
export function handleTuringTestStarted(data) {
    console.log('handleTuringTestStarted', data);
    
    ui.showTuringTest(data.players || []);
}

/**
 * Обработчик turing_test_result
 */
export function handleTuringTestResult(data) {
    console.log('handleTuringTestResult', data);
    
    ui.updateTuringTestResult(data);
}

/**
 * Обработчик turing_test_results
 */
export function handleTuringTestResults(data) {
    console.log('handleTuringTestResults', data);
    
    ui.showTuringTestResults(data.results || data);
    ui.hideTuringTest();
}

/**
 * Обработчик game_over
 */
export function handleGameOver(data) {
    console.log('handleGameOver', data);
    
    gameState.setGameStatus('finished');
    gameState.setGamePhase('game_over');
    
    ui.updateGameInfo();
    ui.showWinner(data.winner || data.winning_team || 'Неизвестно');
    ui.addSystemNotification(`🏆 Игра окончена! Победила команда: ${data.winner || data.winning_team}`);
}

/**
 * Обработчик game_ended
 */
export function handleGameEnded(data) {
    console.log('handleGameEnded', data);
    
    gameState.setGameStatus('finished');
    gameState.updateRoomStatus('finished');
    
    ui.updateGameInfo();
    ui.addSystemNotification('🎭 Игра завершена!');
}

/**
 * Обработчик investigation_result
 */
export function handleInvestigationResult(data) {
    console.log('handleInvestigationResult', data);
    
    const result = data.is_mafia ? 'Мафия' : 'Не мафия';
    ui.addSystemNotification(`🔍 Результат проверки: ${data.target_name} - ${result}`);
}

/**
 * Обработчик phase_timer_update
 */
export function handlePhaseTimerUpdate(data) {
    console.log('handlePhaseTimerUpdate', data);
    
    gameState.setPhaseTimer({
        phase: data.phase,
        remaining_seconds: data.remaining_seconds,
        duration_seconds: data.duration_seconds,
        day_number: data.day_number,
    });
    
    ui.updatePhaseTimer(data);
}

/**
 * Обработчик ready
 */
export function handleReady(data) {
    console.log('handleReady', data);
    
    const playerId = data.player_id;
    const isReady = data.is_ready;
    
    if (playerId) {
        gameState.updatePlayer(playerId, { is_ready: isReady });
        ui.updatePlayersList();
    }
}

/**
 * Обработчик night_action
 */
export function handleNightAction(data) {
    console.log('handleNightAction', data);
    
    const action = data.action;
    const targetId = data.target_id;
    const targetName = data.target_name;
    
    let message = '';
    switch (action) {
        case 'kill':
            message = `🔪 Мафия выбрала жертву: ${targetName}`;
            break;
        case 'heal':
            message = `💉 Доктор защитил: ${targetName}`;
            break;
        case 'check':
            message = `🔍 Комиссар проверил: ${targetName}`;
            break;
        default:
            message = `🌙 Ночное действие на ${targetName}`;
    }
    
    ui.addSystemNotification(message);
}

/**
 * Обработчик vote
 */
export function handleVote(data) {
    console.log('handleVote', data);
    
    const voterId = data.voter_id;
    const targetId = data.target_id;
    const voterName = data.voter_name || 'Игрок';
    const targetName = data.target_name || 'Игрок';
    
    ui.addSystemNotification(`🗳️ ${voterName} голосует за ${targetName}`);
}

/**
 * Обработчик turing_test_vote
 */
export function handleTuringTestVote(data) {
    console.log('handleTuringTestVote', data);
    
    const playerId = data.player_id;
    const isAi = data.is_ai;
    
    ui.addSystemNotification(`🤖 ${data.nickname || 'Игрок'} определил ${isAi ? 'как AI' : 'как человека'}`);
}

/**
 * Регистрация всех обработчиков
 */
export function registerHandlers(ws) {
    // Основные события
    ws.on('connect', (data) => {
        console.log('WebSocket connected:', data);
        gameState.setConnected(true);
    });
    
    ws.on('disconnect', (data) => {
        console.log('WebSocket disconnected:', data);
        gameState.setConnected(false);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        gameState.setError('WebSocket error');
    });
    
    // Игровые события
    ws.on('player_joined', handlePlayerJoined);
    ws.on('player_joined_event', handlePlayerJoined);
    ws.on('player_left', handlePlayerLeft);
    ws.on('game_started', handleGameStarted);
    ws.on('phase_changed', handlePhaseChanged);
    ws.on('night_started', handleNightStarted);
    ws.on('day_started', handleDayStarted);
    ws.on('voting_started', handleVotingStarted);
    ws.on('role_assigned', handleRoleAssigned);
    
    // Чаты
    ws.on('chat_event', handleChatEvent);
    ws.on('chat_event_extended', handleChatEventExtended);
    ws.on('ghost_chat_message', handleGhostChatMessage);
    ws.on('chat_history', handleChatHistory);
    
    // Голосование
    ws.on('vote_received', handleVoteReceived);
    ws.on('vote_update', handleVoteUpdate);
    ws.on('vote_ended', handleVoteEnded);
    
    // Смерть и Turing Test
    ws.on('you_died', handleYouDied);
    ws.on('turing_test_started', handleTuringTestStarted);
    ws.on('turing_test_result', handleTuringTestResult);
    ws.on('turing_test_results', handleTuringTestResults);
    
    // Игра окончена
    ws.on('game_over', handleGameOver);
    ws.on('game_ended', handleGameEnded);
    
    // Разное
    ws.on('investigation_result', handleInvestigationResult);
    ws.on('phase_timer_update', handlePhaseTimerUpdate);
    ws.on('ready', handleReady);
    ws.on('night_action', handleNightAction);
    ws.on('vote', handleVote);
    ws.on('turing_test_vote', handleTuringTestVote);
}
