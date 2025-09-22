'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme/ThemeProvider';

export function ThemeSwitcher() {
  const { currentTheme, setTheme, availableThemes, isLoading } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  
  // Vérifier si le menu de langue est ouvert (pour l'effet de flou)
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleLanguageMenuToggle = (event: CustomEvent) => {
      setIsLanguageMenuOpen(event.detail.isOpen);
    };
    
    window.addEventListener('languageMenuToggle', handleLanguageMenuToggle as EventListener);
    return () => window.removeEventListener('languageMenuToggle', handleLanguageMenuToggle as EventListener);
  }, []);

  if (isLoading) {
    return (
      <div className="theme-switcher-loading">
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const currentThemeData = availableThemes.find(theme => theme.id === currentTheme);

  return (
    <div className={`relative z-50 transition-all duration-200 ${isLanguageMenuOpen ? 'blur-sm opacity-70' : ''}`}>
      {/* Bouton principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border theme-border bg-theme-bg-secondary hover:bg-theme-bg-tertiary transition-colors duration-200 relative z-50"
        title="Changer de thème"
        disabled={isLanguageMenuOpen}
      >
        <span className="text-lg">{currentThemeData?.emoji}</span>
        <span className="theme-text-primary text-sm font-medium hidden sm:block">
          {currentThemeData?.name}
        </span>
        <svg 
          className={`w-4 h-4 theme-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay pour fermer */}
          <div 
            className="fixed inset-0 z-[45]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu des thèmes */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-theme-bg-primary/95 backdrop-blur-md border theme-border rounded-lg shadow-lg z-50 theme-shadow">
            <div className="p-2">
              <div className="px-3 py-2 theme-text-secondary text-xs font-semibold uppercase tracking-wide">
                Choisir un thème
              </div>
              
              {availableThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    setTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-md transition-colors duration-200 ${
                    currentTheme === theme.id
                      ? 'bg-theme-accent-primary text-white'
                      : 'hover:bg-theme-bg-secondary theme-text-primary'
                  }`}
                >
                  {/* Aperçu des couleurs */}
                  <div className="flex gap-1">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: theme.preview.primary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: theme.preview.secondary }}
                    />
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: theme.preview.accent }}
                    />
                  </div>
                  
                  {/* Emoji et nom */}
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{theme.emoji}</span>
                    <div className="text-left">
                      <div className="font-medium text-sm">{theme.name}</div>
                      <div className={`text-xs ${
                        currentTheme === theme.id ? 'text-white/80' : 'theme-text-muted'
                      }`}>
                        {theme.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicateur de sélection */}
                  {currentTheme === theme.id && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}