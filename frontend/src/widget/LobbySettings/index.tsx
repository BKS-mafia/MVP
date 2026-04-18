"use client";

import { useRouter } from 'next/navigation';
import React, { useState, useMemo, useEffect } from 'react';
import {
    Card,
    InputNumber,
    Slider,
    Table,
    Checkbox,
    Button,
    Typography,
    Space,
    Row,
    Col,
    Alert,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, UserOutlined, RobotOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { createRoom } from '@/src/shared/api/endpoints/rooms';
import { getToken } from '@/src/shared/lib/getToken';

const { Title, Text } = Typography;

interface RoleConfig {
    name: string;
    count: number;
    canBeHuman: boolean;
    canBeAI: boolean;
    isAuto?: boolean;
}

export interface GameSettingsDTO {
    totalPlayers: number;
    peopleCount: number;
    aiCount: number;
    roles: {
        name: string;
        count: number;
        canBeHuman: boolean;
        canBeAI: boolean;
    }[];
}

const LobbySettings: React.FC<{ onStart?: (settings: GameSettingsDTO) => void }> = ({ onStart }) => {
    const router = useRouter();
    const [messageApi, contextHolder] = message.useMessage();

    const [totalPlayers, setTotalPlayers] = useState<number>(8);
    const [peopleCount, setPeopleCount] = useState<number>(5);
    const aiCount = totalPlayers - peopleCount;

    const [roles, setRoles] = useState<RoleConfig[]>([
        { name: 'Мирный', count: 4, canBeHuman: true, canBeAI: true, isAuto: true },
        { name: 'Мафия', count: 2, canBeHuman: true, canBeAI: true },
        { name: 'Комиссар', count: 1, canBeHuman: true, canBeAI: true },
        { name: 'Доктор', count: 1, canBeHuman: true, canBeAI: true },
    ]);

    const sumOtherRoles = useMemo(() => {
        return roles
            .filter(r => r.name !== 'Мирный')
            .reduce((sum, r) => sum + r.count, 0);
    }, [roles]);

    const autoPeaceCount = totalPlayers - sumOtherRoles;
    const isValidRoles = autoPeaceCount >= 0 && sumOtherRoles <= totalPlayers;

    const humanSlots = useMemo(() => {
        return roles.reduce((sum, role) => {
            let cnt = role.name === 'Мирный' ? autoPeaceCount : role.count;
            if (cnt < 0) cnt = 0;
            return sum + (role.canBeHuman ? cnt : 0);
        }, 0);
    }, [roles, autoPeaceCount]);

    const aiSlots = useMemo(() => {
        return roles.reduce((sum, role) => {
            let cnt = role.name === 'Мирный' ? autoPeaceCount : role.count;
            if (cnt < 0) cnt = 0;
            return sum + (role.canBeAI ? cnt : 0);
        }, 0);
    }, [roles, autoPeaceCount]);

    const minPeople = useMemo(() => {
        const rawMin = totalPlayers - aiSlots;
        return Math.max(1, rawMin);
    }, [totalPlayers, aiSlots]);

    const maxPeople = useMemo(() => Math.min(totalPlayers, humanSlots), [totalPlayers, humanSlots]);

    const isDistributionPossible = minPeople <= maxPeople;
    const isRoleFlagsValid = useMemo(() => {
        for (const role of roles) {
            let count = role.name === 'Мирный' ? autoPeaceCount : role.count;
            if (count > 0 && !role.canBeHuman && !role.canBeAI) {
                return false;
            }
        }
        return true;
    }, [roles, autoPeaceCount]);

    const isValid = isValidRoles && isDistributionPossible && isRoleFlagsValid;

    useEffect(() => {
        if (isDistributionPossible) {
            let newPeopleCount = peopleCount;
            if (newPeopleCount < minPeople) newPeopleCount = minPeople;
            if (newPeopleCount > maxPeople) newPeopleCount = maxPeople;
            if (newPeopleCount !== peopleCount) {
                setPeopleCount(newPeopleCount);
            }
        }
    }, [minPeople, maxPeople, peopleCount, isDistributionPossible]);

    useEffect(() => {
        setRoles(prev => prev.map(role =>
            role.name === 'Мирный'
                ? { ...role, count: autoPeaceCount >= 0 ? autoPeaceCount : 0 }
                : role
        ));
    }, [autoPeaceCount]);

    const handleTotalPlayersChange = (value: number | null) => {
        const newTotal = value ?? 8;
        if (newTotal < sumOtherRoles) return;
        setTotalPlayers(newTotal);
        if (peopleCount > newTotal) setPeopleCount(newTotal);
    };

    const handlePeopleSliderChange = (value: number) => {
        let newValue = value;
        if (newValue < minPeople) newValue = minPeople;
        if (newValue > maxPeople) newValue = maxPeople;
        setPeopleCount(newValue);
    };

    const updateRoleCount = (index: number, newCount: number) => {
        const role = roles[index];
        if (role.name === 'Мирный') return;

        const newSum = sumOtherRoles - role.count + newCount;
        if (newSum > totalPlayers) return;

        const updated = [...roles];
        updated[index].count = Math.max(0, newCount);

        if (updated[index].count > 0 && !updated[index].canBeHuman && !updated[index].canBeAI) {
            updated[index].canBeHuman = true;
        }

        setRoles(updated);
    };

    const updateRoleFlag = (index: number, field: 'canBeHuman' | 'canBeAI', value: boolean) => {
        const role = roles[index];
        const count = role.name === 'Мирный' ? autoPeaceCount : role.count;

        if (count > 0 && !value && !role[field === 'canBeHuman' ? 'canBeAI' : 'canBeHuman']) {
            return;
        }

        const updated = [...roles];
        updated[index][field] = value;
        setRoles(updated);
    };

    const handleStart = async () => {
        if (!isValid) return;

        // Если передан onStart, вызываем его (режим настройки существующей комнаты)
        if (onStart) {
            const settings: GameSettingsDTO = {
                totalPlayers,
                peopleCount,
                aiCount,
                roles: roles.map(r => ({
                    name: r.name,
                    count: r.name === 'Мирный' ? autoPeaceCount : r.count,
                    canBeHuman: r.canBeHuman,
                    canBeAI: r.canBeAI,
                })),
            };
            onStart(settings);
            return;
        }

        // Иначе создаём новую комнату (режим создания с главной страницы)
        const hostToken = getToken();
        if (!hostToken) {
            messageApi.error('Ошибка идентификации пользователя. Перезагрузите страницу.');
            return;
        }

        const rolesForBackend = roles.map(r => ({
            name: r.name,
            count: r.name === 'Мирный' ? autoPeaceCount : r.count,
            canBeHuman: r.canBeHuman,
            canBeAI: r.canBeAI,
        }));

        try {
            const response = await createRoom(
                hostToken,
                totalPlayers,
                peopleCount,
                aiCount,
                rolesForBackend
            );
            console.log(response)
            messageApi.success(`Комната создана! ID: ${response.shortId || response.roomId}`);
            // сохраняем room_id или short_id для редиректа
            router.push(`/room/${response.shortId}`);
        } catch (error) {
            console.error('Ошибка создания комнаты:', error);
            messageApi.error('Не удалось создать комнату. Попробуйте позже.');
        }
    };

    const columns: ColumnsType<RoleConfig & { index: number }> = [
        {
            title: 'Роль',
            dataIndex: 'name',
            key: 'name',
            width: 120,
        },
        {
            title: 'Количество',
            dataIndex: 'count',
            key: 'count',
            width: 120,
            render: (count: number, record: any) => {
                if (record.name === 'Мирный') {
                    return <InputNumber value={autoPeaceCount} disabled style={{ width: '100%' }} />;
                }
                return (
                    <InputNumber
                        min={0}
                        max={totalPlayers - (sumOtherRoles - record.count)}
                        value={count}
                        onChange={(val) => updateRoleCount(record.index, Math.trunc(val ?? 0))}
                        style={{ width: '100%' }}
                    />
                );
            },
        },
        {
            title: 'Может быть человеком',
            dataIndex: 'canBeHuman',
            key: 'canBeHuman',
            align: 'center',
            width: 150,
            render: (checked: boolean, record: any) => (
                <Checkbox checked={checked} onChange={(e) => updateRoleFlag(record.index, 'canBeHuman', e.target.checked)} />
            ),
        },
        {
            title: 'Может быть ИИ',
            dataIndex: 'canBeAI',
            key: 'canBeAI',
            align: 'center',
            width: 150,
            render: (checked: boolean, record: any) => (
                <Checkbox checked={checked} onChange={(e) => updateRoleFlag(record.index, 'canBeAI', e.target.checked)} />
            ),
        },
    ];

    const tableData = roles.map((role, idx) => ({ ...role, index: idx, key: idx }));

    const startPercent = totalPlayers === 1 ? 0 : ((minPeople - 1) / (totalPlayers - 1)) * 100;
    const endPercent = totalPlayers === 1 ? 0 : ((maxPeople - 1) / (totalPlayers - 1)) * 100;
    const railGradient = `linear-gradient(to right, 
        #ffffff 0%, #d9d9d9 ${startPercent}%, 
        #7c7c7c ${startPercent}%, #000000 ${endPercent}%, 
        #d9d9d9 ${endPercent}%, #ffffff 100%)`;

    return (
        <Card style={{ maxWidth: 900, margin: '2rem auto' }}>
            {contextHolder}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/')}>
                    На главную
                </Button>
            </div>
            <Title level={3} style={{ textAlign: 'center' }}>Настройки игры</Title>

            <Row gutter={[16, 16]} align="middle">
                <Col span={8}><Text strong>Общее число игроков:</Text></Col>
                <Col span={8}>
                    <InputNumber min={4} max={20} value={totalPlayers} onChange={handleTotalPlayersChange} style={{ width: '100%' }} />
                </Col>
                <Col span={8}><Text type="secondary">от 4 до 20</Text></Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col span={24}>
                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span><UserOutlined /> Люди: {peopleCount}</span>
                            <span><RobotOutlined /> ИИ: {aiCount}</span>
                        </div>
                        <div className="custom-slider-wrapper" style={{ position: 'relative', marginBottom: 8 }}>
                            <Slider
                                min={1}
                                max={totalPlayers}
                                step={1}
                                value={peopleCount}
                                onChange={handlePeopleSliderChange}
                                tooltip={{ formatter: (val) => `${val}` }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '100%',
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        left: 0,
                                        right: 0,
                                        height: 4,
                                        borderRadius: 2,
                                        background: railGradient,
                                    }}
                                />
                            </div>
                            <style jsx>{`
                                .custom-slider-wrapper :global(.ant-slider-rail) {
                                    background: transparent !important;
                                }
                                .custom-slider-wrapper :global(.ant-slider-track) {
                                    background: transparent !important;
                                }
                                .custom-slider-wrapper :global(.ant-slider-step) {
                                    background: transparent;
                                }
                            `}</style>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">1</Text>
                            <Text type="secondary">{totalPlayers}</Text>
                        </div>
                        {!isDistributionPossible && (
                            <Text type="danger" style={{ fontSize: 12 }}>
                                Невозможно распределить людей и ИИ. Измените настройки ролей.
                            </Text>
                        )}
                    </Space>
                </Col>
            </Row>

            <Row style={{ marginTop: 32 }}>
                <Col span={24}>
                    <Title level={4}>Роли</Title>
                    <Table columns={columns} dataSource={tableData} pagination={false} size="middle" bordered />
                </Col>
            </Row>

            <Row style={{ marginTop: 24 }}>
                <Col span={24}>
                    {!isValidRoles && (
                        <Alert
                            message="Ошибка количества ролей"
                            description={`Сумма ролей (мафия + комиссар + доктор) = ${sumOtherRoles} не должна превышать общее число игроков (${totalPlayers})`}
                            type="error"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}
                    {autoPeaceCount < 0 && (
                        <Alert
                            message="Невозможно распределить роли"
                            description="Слишком много мафии, комиссаров и докторов. Уменьшите их количество."
                            type="error"
                            showIcon
                        />
                    )}
                    {!isRoleFlagsValid && (
                        <Alert
                            message="Некорректные настройки ролей"
                            description="Каждая роль с ненулевым количеством должна иметь возможность быть человеком или ИИ."
                            type="error"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}
                    {!isDistributionPossible && (
                        <Alert
                            message="Невозможно распределить людей и ИИ"
                            description={`Текущие настройки ролей позволяют назначить не более ${humanSlots} человек(а) и не более ${aiSlots} ИИ. Измените количество игроков или настройки ролей.`}
                            type="error"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}
                </Col>
            </Row>

            <Row justify="center" style={{ marginTop: 32 }}>
                <Button type="primary" size="large" onClick={handleStart} disabled={!isValid} icon={<PlusOutlined />}>
                    Старт игры
                </Button>
            </Row>
        </Card>
    );
};

export default LobbySettings;