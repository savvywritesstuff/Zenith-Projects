import { useState, useEffect, useCallback } from 'react';
import { Theme, THEME_OPTIONS } from '../types';

export const useTheme = (): [Theme, (theme: Theme) => void] => {
    const [theme, setThemeState] = useState<Theme>(() => {
        try {
            const savedTheme = window.localStorage.getItem('zenith-theme') as Theme;
            return THEME_OPTIONS.some(opt => opt.value === savedTheme) ? savedTheme : 'dark';
        } catch (error) {
            console.warn('Failed to read theme from localStorage', error);
            return 'dark';
        }
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            window.localStorage.setItem('zenith-theme', theme);
        } catch (error) {
            console.error('Failed to save theme to localStorage', error);
        }
    }, [theme]);
    
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
    }, []);

    return [theme, setTheme];
};
