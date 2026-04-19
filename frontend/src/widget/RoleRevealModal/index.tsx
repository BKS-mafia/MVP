"use client";

import React, { useEffect, useState } from 'react';
import { Modal, Typography } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import { useGameStore } from '@/src/shared/store/gameStore';

const { Text, Title } = Typography;

// Маппинг ролей для отображения
const ROLE_NAMES: Record<string, string> = {
    'Mafia': 'Мафия',
    'Doctor': 'Доктор',
    'Commissioner': 'Комиссар',
    'Civilian': 'Мирный житель',
};

// Иконки для ролей
const ROLE_EMOJIS: Record<string, string> = {
    'Mafia': '🔪',
    'Doctor': '💉',
    'Commissioner': '🔍',
    'Civilian': '🧑‍🤝‍🧑',
};

// Цвета для ролей
const ROLE_COLORS: Record<string, string> = {
    'Mafia': '#ff4d4f',
    'Doctor': '#52c41a',
    'Commissioner': '#1890ff',
    'Civilian': '#8c8c8c',
};

// Фоновые цвета для ролей
const ROLE_BG_COLORS: Record<string, string> = {
    'Mafia': '#fff1f0',
    'Doctor': '#f6ffed',
    'Commissioner': '#e6f7ff',
    'Civilian': '#f5f5f5',
};

// Описания ролей
const ROLE_DESCRIPTIONS: Record<string, string> = {
    'Mafia': 'Вы — мафия. Устраняйте мирных жителей ночью, не попадайтесь днём!',
    'Doctor': 'Вы — доктор. Спасайте игроков от ночных атак мафии!',
    'Commissioner': 'Вы — комиссар. Раскройте мафию и спасите город!',
    'Civilian': 'Вы — мирный житель. Найдите мафию и защитите город!',
};

interface RoleRevealModalProps {
    visible: boolean;
    onClose: () => void;
}

export const RoleRevealModal: React.FC<RoleRevealModalProps> = ({ visible, onClose }) => {
    const { currentPlayer } = useGameStore();
    const role = currentPlayer?.role;

    if (!role) return null;

    const roleName = ROLE_NAMES[role] || role;
    const roleEmoji = ROLE_EMOJIS[role] || '❓';
    const roleColor = ROLE_COLORS[role] || '#8c8c8c';
    const roleBgColor = ROLE_BG_COLORS[role] || '#f5f5f5';
    const roleDescription = ROLE_DESCRIPTIONS[role] || 'Ваша роль в игре.';

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            onOk={onClose}
            okText="Я понял!"
            cancelText={null}
            centered
            width={400}
            closable={false}
            footer={null}
        >
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 10px',
                textAlign: 'center',
            }}>
                {/* Заголовок */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                }}>
                    <CrownOutlined style={{ color: '#faad14', fontSize: '20px' }} />
                    <Title level={4} style={{ margin: 0, color: '#faad14' }}>
                        Роль назначена!
                    </Title>
                    <CrownOutlined style={{ color: '#faad14', fontSize: '20px' }} />
                </div>

                {/* Большая иконка роли */}
                <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: roleBgColor,
                    border: `3px solid ${roleColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    boxShadow: `0 4px 12px ${roleColor}40`,
                }}>
                    <span style={{ fontSize: '48px' }}>{roleEmoji}</span>
                </div>

                {/* Название роли */}
                <Title level={2} style={{ 
                    color: roleColor, 
                    margin: '0 0 8px 0',
                    textShadow: `0 2px 4px ${roleColor}20`,
                }}>
                    {roleName}
                </Title>

                {/* Описание роли */}
                <Text type="secondary" style={{ 
                    fontSize: '14px',
                    lineHeight: 1.6,
                    maxWidth: '300px',
                }}>
                    {roleDescription}
                </Text>

                {/* Подсказка */}
                <div style={{
                    marginTop: '20px',
                    padding: '12px 16px',
                    background: '#f5f5f5',
                    borderRadius: '8px',
                    width: '100%',
                }}>
                    <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        💡 Запомните свою роль — она отображается в шапке игры
                    </Text>
                </div>
            </div>
        </Modal>
    );
};

// Хук для управления показом модального окна роли
export const useRoleRevealModal = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [roleShown, setRoleShown] = useState(false);
    const { currentPlayer, gamePhase } = useGameStore();

    // Показываем модальное окно когда игра начинается и у игрока появляется роль
    useEffect(() => {
        if (currentPlayer?.role && gamePhase && gamePhase !== 'lobby' && !roleShown) {
            // Небольшая задержка для драматического эффекта
            const timer = setTimeout(() => {
                setModalVisible(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [currentPlayer?.role, gamePhase, roleShown]);

    // Закрываем модальное окно и запоминаем что показали
    const handleClose = () => {
        setModalVisible(false);
        setRoleShown(true);
    };

    return {
        modalVisible,
        handleClose,
        roleShown,
    };
};

export default RoleRevealModal;
