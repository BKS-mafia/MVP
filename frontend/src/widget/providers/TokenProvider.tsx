"use client";

import React, { useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface TokenProviderProps {
    children: ReactNode;
}

export const TokenProvider: React.FC<TokenProviderProps> = ({ children }) => {
    useEffect(() => {
        // Выполняем только на клиенте
        if (typeof window !== 'undefined') {
            let token = localStorage.getItem('token');
            if (!token) {
                token = uuidv4();
                localStorage.setItem('token', token);
                console.log('🔑 Сгенерирован новый токен:', token);
            } else {
                console.log('🔑 Найден существующий токен:', token);
            }
        }
    }, []);

    return <>{children}</>;
};