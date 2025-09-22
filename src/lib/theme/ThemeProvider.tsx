'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeContextType } from './types';
import { AVAILABLE_THEMES, DEFAULT_THEME } from './themes';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<string>(DEFAULT_THEME);
  const [isLoading, setIsLoading] = useState(true);

  // Charger le thème sauvegardé au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('lr-theme');
      if (savedTheme && AVAILABLE_THEMES.some(theme => theme.id === savedTheme)) {
        setCurrentTheme(savedTheme);
      }
      setIsLoading(false);
    }
  }, []);

  // Appliquer le thème au document
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', currentTheme);
      
      // Sauvegarder en localStorage
      localStorage.setItem('lr-theme', currentTheme);
      
      console.log(`🎨 Thème appliqué: ${currentTheme}`);
    }
  }, [currentTheme]);

  const setTheme = (theme: string) => {
    if (AVAILABLE_THEMES.some(t => t.id === theme)) {
      setCurrentTheme(theme);
    } else {
      console.warn(`Thème inconnu: ${theme}`);
    }
  };

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    availableThemes: AVAILABLE_THEMES,
    isLoading
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}