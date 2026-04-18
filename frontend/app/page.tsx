"use client";

import React, { useState, useEffect } from 'react';
import { Button, Typography, Space, Card, message, Tag, List, Empty, Spin, Divider, Alert, Modal, Input } from 'antd';
import { PlusOutlined, LinkOutlined, ReloadOutlined, UserOutlined, TeamOutlined, LogoutOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { createRoom, getRooms, RoomResponse, getCurrentPlayerRoom, leaveGame, PlayerRoomResponse, registerNickname } from '@/src/shared/api/endpoints/rooms';
import { getToken } from '@/src/shared/lib/getToken';

const { Title, Text } = Typography;

export default function HomePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [rooms, setRooms] = useState<RoomResponse[]>([]);
    const [messageApi, contextHolder] = message.useMessage();
    const [playerRoom, setPlayerRoom] = useState<PlayerRoomResponse | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [leavingGame, setLeavingGame] = useState(false);
    
    // Состояние для модального окна регистрации никнейма
    const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
    const [registerNicknameValue, setRegisterNickname] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [isPlayerRegistered, setIsPlayerRegistered] = useState(true);

    // Загрузка списка комнат и проверка статуса игрока
    useEffect(() => {
        loadRooms();
        checkPlayerStatus();
    }, []);

    // Проверка URL на наличие session_token при загрузке
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('session_token');
        
        if (urlToken) {
            // Сохраняем токен в localStorage если его там нет
            const storedToken = getToken();
            if (!storedToken) {
                localStorage.setItem('session_token', urlToken);
            }
            // Проверяем статус игрока с токеном из URL
            checkPlayerStatusWithToken(urlToken);
        }
    }, []);

    // Проверка статуса игрока - находится ли он в комнате
    const checkPlayerStatus = async () => {
        setCheckingStatus(true);
        try {
            const token = getToken();
            if (token) {
                const roomInfo = await getCurrentPlayerRoom(token);
                setPlayerRoom(roomInfo);
                // Проверяем, зарегистрирован ли игрок
                if (roomInfo.is_registered === false) {
                    setIsPlayerRegistered(false);
                    setIsRegisterModalVisible(true);
                } else {
                    setIsPlayerRegistered(true);
                }
            }
        } catch (error: unknown) {
            // Проверяем, если ошибка 404 - игрок не найден, показываем модальное окно регистрации
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number } };
                if (axiosError.response?.status === 404) {
                    console.log('Player not found - показываем модальное окно регистрации');
                    setIsPlayerRegistered(false);
                    setIsRegisterModalVisible(true);
                    setCheckingStatus(false);
                    return;
                }
            }
            // Игрок не в комнате или другая ошибка - это нормально
            console.log('Игрок не в комнате');
            setPlayerRoom(null);
            setIsPlayerRegistered(true);
        } finally {
            setCheckingStatus(false);
        }
    };

    // Проверка статуса игрока с конкретным токеном (из URL)
    const checkPlayerStatusWithToken = async (token: string) => {
        setCheckingStatus(true);
        try {
            const roomInfo = await getCurrentPlayerRoom(token);
            setPlayerRoom(roomInfo);
            // Проверяем, зарегистрирован ли игрок
            if (roomInfo.is_registered === false) {
                setIsPlayerRegistered(false);
                setIsRegisterModalVisible(true);
            } else {
                setIsPlayerRegistered(true);
            }
        } catch (error: unknown) {
            // Проверяем, если ошибка 404 - игрок не найден, показываем модальное окно регистрации
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number } };
                if (axiosError.response?.status === 404) {
                    console.log('Player not found - показываем модальное окно регистрации');
                    setIsPlayerRegistered(false);
                    setIsRegisterModalVisible(true);
                    setCheckingStatus(false);
                    return;
                }
            }
            // Игрок не в комнате или другая ошибка
            console.log('Игрок не в комнате');
            setPlayerRoom(null);
            setIsPlayerRegistered(true);
        } finally {
            setCheckingStatus(false);
        }
    };

    // Выход из игры
    const handleLeaveGame = async () => {
        const token = getToken();
        if (!token) {
            messageApi.error('Ошибка идентификации. Перезагрузите страницу.');
            return;
        }

        setLeavingGame(true);
        try {
            await leaveGame(token);
            messageApi.success('Вы покинули игру');
            setPlayerRoom(null);
            // Обновляем список комнат
            loadRooms();
        } catch (error) {
            console.error('Ошибка выхода из игры:', error);
            messageApi.error('Не удалось покинуть игру. Попробуйте позже.');
        } finally {
            setLeavingGame(false);
        }
    };

    // Переход в комнату
    const handleGoToRoom = () => {
        if (playerRoom?.short_id) {
            router.push(`/room/${playerRoom.short_id}`);
        } else if (playerRoom?.room_id) {
            router.push(`/room/${playerRoom.room_id}`);
        }
    };
    
    // Обработчик регистрации никнейма
    const handleRegister = async () => {
        if (!registerNicknameValue.trim()) {
            messageApi.error('Введите никнейм');
            return;
        }
        
        if (registerNicknameValue.length < 2) {
            messageApi.error('Никнейм должен содержать минимум 2 символа');
            return;
        }
        
        if (registerNicknameValue.length > 20) {
            messageApi.error('Никнейм не может превышать 20 символов');
            return;
        }
        
        // Пробуем получить токен из URL или из localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('session_token');
        const token = urlToken || getToken();
        
        if (!token) {
            messageApi.error('Токен сессии не найден');
            return;
        }
        
        setIsRegistering(true);
        try {
            await registerNickname(token, registerNicknameValue.trim());
            setIsRegisterModalVisible(false);
            setIsPlayerRegistered(true);
            messageApi.success('Никнейм успешно сохранён!');
            
            // Очищаем URL от параметра session_token
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Повторяем запрос к getCurrentPlayerRoom после успешной регистрации
            const roomInfo = await getCurrentPlayerRoom(token);
            setPlayerRoom(roomInfo);
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            messageApi.error('Не удалось сохранить никнейм. Попробуйте ещё раз.');
        } finally {
            setIsRegistering(false);
        }
    };

    const loadRooms = async () => {
        setRoomsLoading(true);
        try {
            const roomsList = await getRooms('lobby');
            setRooms(roomsList);
        } catch (error) {
            console.error('Ошибка загрузки комнат:', error);
            messageApi.error('Не удалось загрузить список комнат');
        } finally {
            setRoomsLoading(false);
        }
    };

    const handleCreateRoom = async () => {
        setLoading(true);
        try {
            const hostToken = getToken();
            if (!hostToken) {
                messageApi.error('Ошибка идентификации. Перезагрузите страницу.');
                setLoading(false);
                return;
            }

            // Вызываем API создания комнаты с минимальными параметрами
            const response = await createRoom(
                hostToken,
                8,  // totalPlayers
                5,  // peopleCount
                3,  // aiCount
                [
                    { name: 'Мирный', count: 4, canBeHuman: true, canBeAI: true },
                    { name: 'Мафия', count: 2, canBeHuman: true, canBeAI: true },
                    { name: 'Комиссар', count: 1, canBeHuman: true, canBeAI: true },
                    { name: 'Доктор', count: 1, canBeHuman: true, canBeAI: true },
                ]
            );

            // Перенаправляем на страницу настроек комнаты с room_id
            const roomId = response.shortId || response.roomId;
            router.push(`/roomEdit?room_id=${roomId}`);
        } catch (error) {
            console.error('Ошибка создания комнаты:', error);
            messageApi.error('Не удалось создать комнату. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = () => {
        // Переход на страницу ввода кода комнаты
        router.push('/join');
    };

    const handleJoinRoomById = (shortId: string) => {
        // Переход на страницу ввода кода комнаты с предзаполненным кодом
        router.push(`/join?code=${shortId}`);
    };

    // Получение текста статуса комнаты
    const getRoomStatusText = (status?: string) => {
        switch (status) {
            case 'lobby':
                return 'Ожидание игроков';
            case 'starting':
                return 'Начало игры';
            case 'playing':
                return 'Игра идёт';
            case 'finished':
                return 'Игра завершена';
            default:
                return status || 'Неизвестно';
        }
    };

    // Получение цвета статуса комнаты
    const getRoomStatusColor = (status?: string) => {
        switch (status) {
            case 'lobby':
                return 'green';
            case 'starting':
                return 'orange';
            case 'playing':
                return 'blue';
            case 'finished':
                return 'default';
            default:
                return 'default';
        }
    };

    // Получение цвета тега в зависимости от статуса
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'lobby':
                return 'green';
            case 'starting':
                return 'orange';
            case 'playing':
                return 'blue';
            case 'finished':
                return 'default';
            default:
                return 'default';
        }
    };

    // Получение текста статуса на русском
    const getStatusText = (status: string) => {
        switch (status) {
            case 'lobby':
                return 'Ожидание игроков';
            case 'starting':
                return 'Начало игры';
            case 'playing':
                return 'Игра идёт';
            case 'finished':
                return 'Игра завершена';
            default:
                return status;
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '40px 20px',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            }}
        >
            {contextHolder}
            
            {/* Модальное окно регистрации никнейма */}
            <Modal
                title="Добро пожаловать!"
                open={isRegisterModalVisible}
                closable={false}
                maskClosable={false}
                footer={null}
                width={400}
                style={{ top: '20%' }}
            >
                <div style={{ padding: '10px 0' }}>
                    <p style={{ marginBottom: 16, color: '#666' }}>
                        Для продолжения игры введите ваш никнейм:
                    </p>
                    <Input
                        placeholder="Ваш никнейм"
                        value={registerNicknameValue}
                        onChange={(e) => setRegisterNickname(e.target.value)}
                        onPressEnter={handleRegister}
                        maxLength={20}
                        size="large"
                        style={{ marginBottom: 16 }}
                        autoFocus
                    />
                    <Button
                        type="primary"
                        size="large"
                        block
                        onClick={handleRegister}
                        loading={isRegistering}
                    >
                        Продолжить
                    </Button>
                </div>
            </Modal>
            
            {/* Карточка с информацией о текущей игре */}
            {!checkingStatus && playerRoom?.in_room && (
                <Card
                    style={{
                        width: '100%',
                        maxWidth: 500,
                        marginBottom: 32,
                        borderRadius: 24,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        background: 'var(--ant-color-bg-container)',
                        border: '2px solid #1890ff',
                    }}
                >
                    <Alert
                        message="Вы находитесь в игре"
                        description={
                            <div>
                                <div style={{ marginBottom: 8 }}>
                                    <Text strong>Комната: </Text>
                                    <Tag color="blue">{playerRoom.short_id || playerRoom.room_id?.slice(0, 8)}</Tag>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <Text strong>Статус: </Text>
                                    <Tag color={getRoomStatusColor(playerRoom.status)}>
                                        {getRoomStatusText(playerRoom.status)}
                                    </Tag>
                                </div>
                                <Space>
                                    <Button
                                        type="primary"
                                        icon={<PlayCircleOutlined />}
                                        onClick={handleGoToRoom}
                                    >
                                        Вернуться в игру
                                    </Button>
                                    <Button
                                        danger
                                        icon={<LogoutOutlined />}
                                        onClick={handleLeaveGame}
                                        loading={leavingGame}
                                    >
                                        Покинуть игру
                                    </Button>
                                </Space>
                            </div>
                        }
                        type="info"
                        showIcon
                    />
                </Card>
            )}

            {/* Основная карточка с кнопками */}
            <Card
                style={{
                    width: '100%',
                    maxWidth: 500,
                    textAlign: 'center',
                    borderRadius: 24,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    background: 'var(--ant-color-bg-container)',
                    marginBottom: 32,
                }}
            >
                <Title
                    level={1}
                    style={{
                        fontSize: '4rem',
                        marginBottom: 8,
                        background: 'linear-gradient(45deg, #667eea, #764ba2)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                    }}
                >
                    MafAI
                </Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 48 }}>
                    Мафия с нейросетевыми игроками
                </Text>

                <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<PlusOutlined />}
                        onClick={handleCreateRoom}
                        loading={loading}
                        block
                        style={{ height: 48, fontSize: '1.2rem' }}
                    >
                        Создать комнату
                    </Button>
                    <Button
                        size="large"
                        icon={<LinkOutlined />}
                        onClick={handleJoinRoom}
                        block
                        style={{ height: 48, fontSize: '1.2rem' }}
                    >
                        Присоединиться по коду
                    </Button>
                </Space>
            </Card>

            {/* Секция активных лобби */}
            <Card
                style={{
                    width: '100%',
                    maxWidth: 800,
                    borderRadius: 24,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    background: 'var(--ant-color-bg-container)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <Title level={3} style={{ margin: 0 }}>
                        Активные игры
                    </Title>
                    <Button 
                        icon={<ReloadOutlined />} 
                        onClick={loadRooms}
                        loading={roomsLoading}
                    >
                        Обновить
                    </Button>
                </div>

                {roomsLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Spin size="large" />
                    </div>
                ) : rooms.length === 0 ? (
                    <Empty
                        description="Нет активных лобби"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                        <Button type="primary" onClick={handleCreateRoom}>
                            Создать первую комнату
                        </Button>
                    </Empty>
                ) : (
                    <List
                        dataSource={rooms}
                        renderItem={(room) => {
                            // Безопасное получение ID комнаты
                            const roomId = room.shortId || room.roomId || 'unknown';
                            const displayId = roomId !== 'unknown' ? roomId.slice(0, 8) : 'N/A';
                            
                            // Значения по умолчанию для всех полей
                            const status = room.status || 'lobby';
                            const currentPlayers = room.currentPlayers ?? 0;
                            const totalPlayers = room.totalPlayers ?? 0;
                            const humanPlayers = room.humanPlayers ?? 0;
                            const aiPlayers = room.aiPlayers ?? 0;
                            
                            return (
                                <List.Item
                                    style={{
                                        padding: '16px 24px',
                                        marginBottom: 12,
                                        background: 'var(--ant-color-bg-layout)',
                                        borderRadius: 12,
                                        border: '1px solid var(--ant-color-border)',
                                    }}
                                    actions={[
                                        <Button
                                            type="primary"
                                            key="join"
                                            onClick={() => handleJoinRoomById(roomId)}
                                        >
                                            Присоединиться
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <Text strong style={{ fontSize: '1.1rem' }}>
                                                    Комната {displayId}
                                                </Text>
                                                <Tag color={getStatusColor(status)}>
                                                    {getStatusText(status)}
                                                </Tag>
                                            </div>
                                        }
                                        description={
                                            <Space size="large">
                                                <span>
                                                    <TeamOutlined /> {currentPlayers}/{totalPlayers} игроков
                                                </span>
                                                <span>
                                                    <UserOutlined /> {humanPlayers} людей, {aiPlayers} ИИ
                                                </span>
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            );
                        }}
                    />
                )}
            </Card>
        </div>
    );
}