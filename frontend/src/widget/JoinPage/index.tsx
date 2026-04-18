import React, { useState } from 'react';
import { Input, Button, Card, Typography, message, App } from 'antd';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;


const JoinPage: React.FC = () => {
    const [roomCode, setRoomCode] = useState('');
    const router = useRouter();
    const [messageApi, contextHolder] = message.useMessage();

    const handleJoin = () => {
        if (!roomCode.trim()) {
            messageApi.error('Введите код комнаты');
            return;
        }
        messageApi.info(`Подключение к комнате ${roomCode}...`);
        // router.push(`/room/${roomCode}`);
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            }}
        >
            {contextHolder}
            <Card style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
                <Title level={2}>Присоединиться к игре</Title>
                <Text type="secondary">Введите код комнаты</Text>
                <Input
                    placeholder="Код комнаты"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    style={{ marginTop: 24, marginBottom: 24 }}
                    size="large"
                />
                <Button type="primary" size="large" onClick={handleJoin} block>
                    Подключиться
                </Button>
                <Button
                    style={{ marginTop: 12 }}
                    size="large"
                    onClick={() => router.push('/')}
                    block
                >
                    Назад
                </Button>
            </Card>
        </div>
    );
}

export default JoinPage;