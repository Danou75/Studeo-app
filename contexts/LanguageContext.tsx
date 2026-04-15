import React, { ReactNode } from 'react';
import { useLanguageStore } from '../stores/useLanguageStore';
import { fr, Translations } from '../locales/fr';
import { en } from '../locales/en';
import { Language } from '../types';

const translations: Record<Language, Translations> = { fr, en };

export const useTranslation = () => {
    const language = useLanguageStore(s => s.language);
    const setLanguage = useLanguageStore(s => s.setLanguage);

    const t = (key: string, params?: Record<string, any>): any => {
        const keys = key.split('.');
        let value: any = translations[language];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        // Handle params extraction if value is a string
        if (typeof value === 'string' && params) {
            Object.entries(params).forEach(([k, v]) => {
                value = value.replace(`{${k}}`, String(v));
            });
        }

        return value;
    };

    return { language, setLanguage, t };
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return <>{children}</>;
};
