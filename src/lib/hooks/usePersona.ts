'use client';

import { useState, useCallback } from 'react';
import { personaManager } from '@/lib/personas/PersonaManager';

export interface UsePersonaResult {
  personaPrompt: string;
  summaryPrompt: string;
  isLoading: boolean;
  error: string | null;
  loadPersona: (userName: string, luciformPath?: string) => Promise<void>;
}

export function usePersona(): UsePersonaResult {
  const [personaPrompt, setPersonaPrompt] = useState<string>('');
  const [summaryPrompt, setSummaryPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadPersona = useCallback(async (userName: string, luciformPath?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      let prompt: string;
      let summary: string;

      if (luciformPath) {
        // Charger le fichier luciform
        const response = await fetch(luciformPath);
        if (!response.ok) {
          throw new Error(`Erreur chargement luciform: ${response.statusText}`);
        }
        
        const luciformContent = await response.text();
        prompt = await personaManager.loadPersonaFromLuciform(luciformContent, userName);
        summary = personaManager.createSummaryPromptWithLuciform(luciformContent, userName);
      } else {
        // Utiliser le prompt par défaut
        prompt = await personaManager.loadPersonaFromLuciform('', userName);
        summary = personaManager.createSummaryPromptWithLuciform('', userName);
      }

      setPersonaPrompt(prompt);
      setSummaryPrompt(summary);
      
      console.log('✅ Persona chargée avec succès');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('❌ Erreur chargement persona:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    personaPrompt,
    summaryPrompt,
    isLoading,
    error,
    loadPersona
  };
}