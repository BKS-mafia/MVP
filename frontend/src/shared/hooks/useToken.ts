// hooks/useToken.ts
import { useEffect, useState } from 'react';

export const useToken = () => {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('token');
            setToken(stored);
        }
    }, []);

    return token;
};