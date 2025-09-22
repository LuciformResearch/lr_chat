'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { LanguageContextType } from './types';
import { AVAILABLE_LANGUAGES, DEFAULT_LANGUAGE } from './languages';
import { translations } from './translations';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);

  // Charger la langue sauvegardée au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('lr-language');
      if (savedLanguage && AVAILABLE_LANGUAGES.some(lang => lang.code === savedLanguage)) {
        setCurrentLanguage(savedLanguage);
      }
      setIsLoading(false);
    }
  }, []);

  // Sauvegarder la langue
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lr-language', currentLanguage);
      console.log(`🌍 Language set to: ${currentLanguage}`);
    }
  }, [currentLanguage]);

  const setLanguage = (language: string) => {
    if (AVAILABLE_LANGUAGES.some(lang => lang.code === language)) {
      setCurrentLanguage(language);
    } else {
      console.warn(`Unknown language: ${language}`);
    }
  };

  // Fonction de traduction
  const t = (key: string, params?: Record<string, string>): string => {
    const translation = translations[currentLanguage]?.[key as keyof typeof translations[typeof currentLanguage]];
    if (!translation) {
      console.warn(`Translation missing for key: ${key} in language: ${currentLanguage}`);
      return key; // Fallback vers la clé
    }

    // Remplacer les paramètres
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, value]) => {
        return str.replace(`{${paramKey}}`, value);
      }, translation);
    }

    return translation;
  };

  const value: LanguageContextType = {
    currentLanguage,
    setLanguage,
    availableLanguages: AVAILABLE_LANGUAGES,
    isLoading,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}