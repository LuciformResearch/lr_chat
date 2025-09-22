'use client';

import { useState, useEffect } from 'react';
import { AlgarethThoughts, AlgarethThought } from '@/lib/agents/AlgarethThoughts';

interface AlgarethThinkingProps {
  userMessage: string;
  context?: {
    hasMemory?: boolean;
    isComplex?: boolean;
    isEmotional?: boolean;
    event?: string;
  };
  onThinkingComplete?: () => void;
  className?: string;
}

export function AlgarethThinking({ 
  userMessage, 
  context, 
  onThinkingComplete,
  className = '' 
}: AlgarethThinkingProps) {
  const [currentThought, setCurrentThought] = useState<AlgarethThought | null>(null);
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [thoughts, setThoughts] = useState<AlgarethThought[]>([]);

  const algarethThoughts = new AlgarethThoughts();

  useEffect(() => {
    if (!userMessage) return;

    // Démarrer la séquence de pensées
    const thoughtSequence = algarethThoughts.startThinking(userMessage, context);
    setThoughts(thoughtSequence);
    setIsThinking(true);
    setThoughtIndex(0);

    // Afficher la première pensée
    if (thoughtSequence.length > 0) {
      setCurrentThought(thoughtSequence[0]);
    }

  }, [userMessage, context]);

  useEffect(() => {
    if (!isThinking || thoughts.length === 0) return;

    const currentThoughtData = thoughts[thoughtIndex];
    if (!currentThoughtData) {
      // Fin de la séquence
      setIsThinking(false);
      setCurrentThought(null);
      onThinkingComplete?.();
      return;
    }

    setCurrentThought(currentThoughtData);

    // Passer à la pensée suivante après la durée
    const timer = setTimeout(() => {
      setThoughtIndex(prev => prev + 1);
    }, currentThoughtData.duration);

    return () => clearTimeout(timer);
  }, [thoughtIndex, thoughts, isThinking, onThinkingComplete]);

  if (!isThinking || !currentThought) {
    return null;
  }

  return (
    <div className={`algareth-thinking ${className}`}>
      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-sm rounded-lg border border-purple-500/30">
        {/* Avatar d'Algareth */}
        <div className="relative">
          <img 
            src="/pentagram_icon_transparent.png" 
            alt="Algareth" 
            className="w-8 h-8 opacity-90 animate-pulse"
          />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-ping"></div>
        </div>

        {/* Pensée actuelle */}
        <div className="flex-1">
          <div className="text-sm text-purple-200 font-medium mb-1">
            Algareth réfléchit...
          </div>
          <div className="text-purple-100 text-sm leading-relaxed">
            {currentThought.content}
          </div>
        </div>

        {/* Indicateur de progression */}
        <div className="flex flex-col items-center space-y-1">
          <div className="flex space-x-1">
            {thoughts.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= thoughtIndex 
                    ? 'bg-purple-400' 
                    : 'bg-purple-600/30'
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-purple-400">
            {thoughtIndex + 1}/{thoughts.length}
          </div>
        </div>
      </div>

      {/* Animation de fond mystique */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-500/5 to-blue-500/5 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-400/10 rounded-full animate-ping"></div>
      </div>
    </div>
  );
}

/**
 * Composant simplifié pour les pensées rapides
 */
export function AlgarethQuickThought({ 
  thought, 
  duration = 2000,
  className = '' 
}: {
  thought: string;
  duration?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  return (
    <div className={`algareth-quick-thought ${className}`}>
      <div className="flex items-center space-x-2 p-3 bg-purple-900/20 backdrop-blur-sm rounded-lg border border-purple-500/20">
        <img 
          src="/pentagram_icon_transparent.png" 
          alt="Algareth" 
          className="w-5 h-5 opacity-80 animate-pulse"
        />
        <div className="text-purple-200 text-sm">
          {thought}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook pour utiliser les pensées d'Algareth
 */
export function useAlgarethThoughts() {
  const [thoughts] = useState(() => new AlgarethThoughts());

  const generateThought = (userMessage: string, context?: any) => {
    return thoughts.generateThought(userMessage, context);
  };

  const generateCustomThought = (event: string, details?: any) => {
    return thoughts.generateCustomThought(event, details);
  };

  const getRandomThoughtByType = (type: AlgarethThought['type']) => {
    return thoughts.getRandomThoughtByType(type);
  };

  const getStats = () => {
    return thoughts.getThoughtStats();
  };

  return {
    generateThought,
    generateCustomThought,
    getRandomThoughtByType,
    getStats
  };
}