'use client';

import { useState, useCallback, useRef } from 'react';
import { OrchestrationPhase, LoadingState, createLoadingState, getPhaseConfig } from '@/types/orchestration';
import { useSmartOrchestrationMessages } from './useSmartOrchestrationMessages';

interface UseOrchestrationProgressReturn {
  isActive: boolean;
  currentPhase: OrchestrationPhase;
  progress: number;
  details?: string;
  currentMessage?: string;
  isRotating?: boolean;
  phaseDuration?: number;
  estimatedRemainingTime?: number;
  startOrchestration: () => void;
  updatePhase: (phase: OrchestrationPhase, details?: string) => void;
  updateProgress: (progress: number) => void;
  completeOrchestration: () => void;
  resetOrchestration: () => void;
}

export function useOrchestrationProgress(): UseOrchestrationProgressReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<OrchestrationPhase>('orchestrator');
  const [progress, setProgress] = useState(0);
  const [details, setDetails] = useState<string | undefined>();
  const startTimeRef = useRef<number>(0);
  const phaseStartTimeRef = useRef<number>(0);

  // Utiliser le système de messages intelligents
  const smartMessages = useSmartOrchestrationMessages(currentPhase, phaseStartTimeRef.current);

  const startOrchestration = useCallback(() => {
    console.log('🚀 Démarrage de l\'orchestration');
    setIsActive(true);
    setCurrentPhase('orchestrator');
    setProgress(0);
    setDetails('Initialisation...');
    startTimeRef.current = Date.now();
    phaseStartTimeRef.current = Date.now();
  }, []);

  const updatePhase = useCallback((phase: OrchestrationPhase, details?: string) => {
    console.log(`🔄 Passage à la phase: ${phase}`, details ? `(${details})` : '');
    
    setCurrentPhase(phase);
    setDetails(details);
    
    // Mettre à jour la progression basée sur la phase
    const phaseConfig = getPhaseConfig(phase);
    setProgress(phaseConfig.minProgress);
    phaseStartTimeRef.current = Date.now();
  }, []);

  const updateProgress = useCallback((newProgress: number) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
  }, []);

  const completeOrchestration = useCallback(() => {
    console.log('✅ Orchestration terminée');
    setCurrentPhase('complete');
    setProgress(100);
    setDetails('Terminé');
    
    // Désactiver après un court délai pour permettre l'animation
    setTimeout(() => {
      setIsActive(false);
    }, 1000);
  }, []);

  const resetOrchestration = useCallback(() => {
    console.log('🔄 Reset de l\'orchestration');
    setIsActive(false);
    setCurrentPhase('orchestrator');
    setProgress(0);
    setDetails(undefined);
    startTimeRef.current = 0;
    phaseStartTimeRef.current = 0;
  }, []);

  return {
    isActive,
    currentPhase,
    progress,
    details,
    currentMessage: smartMessages.currentMessage?.message,
    isRotating: smartMessages.isRotating,
    phaseDuration: smartMessages.phaseDuration,
    estimatedRemainingTime: smartMessages.estimatedRemainingTime,
    startOrchestration,
    updatePhase,
    updateProgress,
    completeOrchestration,
    resetOrchestration
  };
}

/**
 * Hook pour simuler une orchestration avec timing réaliste
 */
export function useSimulatedOrchestration() {
  const orchestration = useOrchestrationProgress();

  const simulateOrchestration = useCallback(async (
    userMessage: string,
    onComplete?: (result: any) => void
  ) => {
    orchestration.startOrchestration();

    try {
      // Phase 1: Orchestrateur (0-25%)
      orchestration.updatePhase('orchestrator', 'Analyse du message...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simuler la décision de l'orchestrateur
      const needsArchivist = userMessage.toLowerCase().includes('souviens') || 
                           userMessage.toLowerCase().includes('avant') ||
                           userMessage.toLowerCase().includes('passé') ||
                           userMessage.length > 50;

      if (needsArchivist) {
        // Phase 2: Archiviste (25-75%)
        orchestration.updatePhase('archivist', 'Recherche dans les conversations...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simuler la recherche
        orchestration.updateProgress(60);
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Passer directement à la génération
        orchestration.updateProgress(30);
      }

      // Phase 3: Génération (75-100%)
      orchestration.updatePhase('generating', 'Composition de la réponse...');
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Simuler le résultat
      const result = {
        divineMurmurs: needsArchivist ? [
          {
            type: 'memory',
            content: 'Informations trouvées dans les conversations passées',
            timestamp: new Date().toISOString(),
            data: {
              resultsCount: Math.floor(Math.random() * 5) + 1,
              embeddingProvider: 'gemini',
              dimensions: 768
            }
          }
        ] : [],
        needsArchivist
      };

      orchestration.completeOrchestration();
      onComplete?.(result);
      
      return result;
    } catch (error) {
      console.error('❌ Erreur simulation orchestration:', error);
      orchestration.resetOrchestration();
      throw error;
    }
  }, [orchestration]);

  return {
    ...orchestration,
    simulateOrchestration
  };
}