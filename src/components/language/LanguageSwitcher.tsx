'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language/LanguageProvider';

export function LanguageSwitcher() {
  const { currentLanguage, setLanguage, availableLanguages, isLoading } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Notifier les autres composants quand le menu s'ouvre/ferme
  useEffect(() => {
    const event = new CustomEvent('languageMenuToggle', { 
      detail: { isOpen } 
    });
    window.dispatchEvent(event);
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="language-switcher-loading">
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const currentLanguageData = availableLanguages.find(lang => lang.code === currentLanguage);

  return (
    <div className="relative z-[60]">
      {/* Bouton principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border theme-border bg-theme-bg-secondary hover:bg-theme-bg-tertiary transition-colors duration-200 relative z-[60]"
        title="Change language"
      >
        <span className="text-lg">{currentLanguageData?.flag}</span>
        <span className="theme-text-primary text-sm font-medium hidden sm:block">
          {currentLanguageData?.nativeName}
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
            className="fixed inset-0 z-[55]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu des langues */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-theme-bg-primary/95 backdrop-blur-md border theme-border rounded-lg shadow-lg z-[60] theme-shadow">
            <div className="p-2">
              <div className="px-3 py-2 theme-text-secondary text-xs font-semibold uppercase tracking-wide">
                Choose Language
              </div>
              
              {availableLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    setLanguage(language.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-md transition-colors duration-200 ${
                    currentLanguage === language.code
                      ? 'bg-theme-accent-primary text-white'
                      : 'hover:bg-theme-bg-secondary theme-text-primary'
                  }`}
                >
                  {/* Drapeau */}
                  <span className="text-xl">{language.flag}</span>
                  
                  {/* Nom de la langue */}
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm">{language.nativeName}</div>
                    <div className={`text-xs ${
                      currentLanguage === language.code ? 'text-white/80' : 'theme-text-muted'
                    }`}>
                      {language.name}
                    </div>
                  </div>
                  
                  {/* Indicateur de sélection */}
                  {currentLanguage === language.code && (
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