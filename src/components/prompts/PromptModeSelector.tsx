'use client';

import { useState } from 'react';
import { usePromptMode } from '@/lib/prompts/PromptModeManager';
import { useLanguage } from '@/lib/language/LanguageProvider';
import { useClientOnly } from '@/lib/hooks/useClientOnly';

interface PromptModeSelectorProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export function PromptModeSelector({ 
  className = '', 
  showLabel = true, 
  compact = false 
}: PromptModeSelectorProps) {
  const { currentMode, availableModes, setMode, settings } = usePromptMode();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const isClient = useClientOnly();

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'algareth': return '⛧';
      case 'debug': return '🐛';
      case 'neutral': return '😊';
      case 'technical': return '⚙️';
      default: return '⛧';
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'algareth': return 'text-purple-400';
      case 'debug': return 'text-yellow-400';
      case 'neutral': return 'text-blue-400';
      case 'technical': return 'text-green-400';
      default: return 'text-purple-400';
    }
  };

  const currentModeInfo = availableModes.find(mode => mode.value === currentMode);

  // Éviter l'erreur d'hydratation en ne rendant que côté client
  if (!isClient) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center space-x-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg">
          <span className="text-lg">⛧</span>
          <span className="text-sm theme-text-primary">Chargement...</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors"
          title={`Mode actuel: ${currentModeInfo?.label}`}
        >
          <span className="text-lg">{getModeIcon(currentMode)}</span>
          <span className="text-sm theme-text-primary">{currentModeInfo?.label}</span>
          <svg 
            className={`w-4 h-4 theme-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl z-50">
            <div className="p-2">
              {availableModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => {
                    setMode(mode.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    currentMode === mode.value
                      ? 'bg-white/20'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg">{getModeIcon(mode.value)}</span>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${getModeColor(mode.value)}`}>
                      {mode.label}
                    </div>
                    <div className="text-xs theme-text-muted">
                      {mode.description}
                    </div>
                  </div>
                  {currentMode === mode.value && (
                    <div className="w-2 h-2 bg-theme-accent-primary rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold theme-text-primary">
            Mode de Prompt
          </h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getModeColor(currentMode)}`}></div>
            <span className="text-sm theme-text-secondary">
              {currentModeInfo?.label}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {availableModes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => setMode(mode.value)}
            className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
              currentMode === mode.value
                ? 'border-theme-accent-primary bg-theme-accent-primary/10'
                : 'border-white/20 bg-white/5 hover:bg-white/10'
            }`}
          >
            <span className="text-2xl">{getModeIcon(mode.value)}</span>
            <div className="flex-1 text-left">
              <div className={`font-semibold ${getModeColor(mode.value)}`}>
                {mode.label}
              </div>
              <div className="text-sm theme-text-muted">
                {mode.description}
              </div>
            </div>
            {currentMode === mode.value && (
              <div className="w-6 h-6 bg-theme-accent-primary rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Informations sur le mode actuel */}
      <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg">{getModeIcon(currentMode)}</span>
          <span className="font-medium theme-text-primary">
            Mode {currentModeInfo?.label}
          </span>
        </div>
        <p className="text-sm theme-text-secondary">
          {currentModeInfo?.description}
        </p>
        
        {/* Statistiques d'utilisation */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex justify-between text-xs theme-text-muted">
            <span>Mode précédent: {settings.lastUsedMode}</span>
            <span>Auto-switch: {settings.autoSwitch ? 'Activé' : 'Désactivé'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}