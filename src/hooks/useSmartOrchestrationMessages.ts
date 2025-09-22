'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  OrchestrationPhase, 
  DynamicMessage, 
  DYNAMIC_MESSAGES, 
  shouldRotateMessages, 
  getRotationInterval,
  getPhaseConfig 
} from '@/types/orchestration';

interface UseSmartOrchestrationMessagesReturn {
  currentMessage: DynamicMessage | null;
  isRotating: boolean;
  phaseDuration: number;
  estimatedRemainingTime: number;
}

export function useSmartOrchestrationMessages(
  phase: OrchestrationPhase,
  phaseStartTime: number
): UseSmartOrchestrationMessagesReturn {
  const [currentMessage, setCurrentMessage] = useState<DynamicMessage | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);

  const phaseConfig = getPhaseConfig(phase);
  const messages = DYNAMIC_MESSAGES[phase];
  const needsRotation = shouldRotateMessages(phase);
  const rotationInterval = getRotationInterval(phase);

  // Calculer la durée écoulée et le temps restant
  const phaseDuration = Date.now() - phaseStartTime;
  const estimatedRemainingTime = Math.max(0, phaseConfig.estimatedDuration - phaseDuration);

  // Initialiser le message au début de la phase
  useEffect(() => {
    if (messages.length > 0) {
      setCurrentMessage(messages[0]);
      setMessageIndex(0);
    }
  }, [phase]);

  // Gérer la rotation seulement si nécessaire
  useEffect(() => {
    if (!needsRotation || messages.length <= 1) {
      setIsRotating(false);
      return;
    }

    setIsRotating(true);

    const interval = setInterval(() => {
      setMessageIndex(prev => {
        const nextIndex = (prev + 1) % messages.length;
        setCurrentMessage(messages[nextIndex]);
        return nextIndex;
      });
    }, rotationInterval);

    return () => {
      clearInterval(interval);
      setIsRotating(false);
    };
  }, [phase, needsRotation, messages, rotationInterval]);

  return {
    currentMessage,
    isRotating,
    phaseDuration,
    estimatedRemainingTime
  };
}

/**
 * Hook pour gérer les messages avec rotation intelligente basée sur la durée
 */
export function useIntelligentMessageRotation(
  phase: OrchestrationPhase,
  phaseStartTime: number,
  actualDuration?: number
) {
  const [currentMessage, setCurrentMessage] = useState<DynamicMessage | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  const phaseConfig = getPhaseConfig(phase);
  const messages = DYNAMIC_MESSAGES[phase];
  const needsRotation = shouldRotateMessages(phase);

  // Calculer la durée réelle ou estimée
  const currentDuration = actualDuration || (Date.now() - phaseStartTime);
  const estimatedDuration = phaseConfig.estimatedDuration;

  // Déterminer si on doit activer la rotation basée sur la durée
  const shouldActivateRotation = needsRotation && (
    currentDuration > estimatedDuration * 0.5 || // Si on dépasse 50% du temps estimé
    messages.length > 1
  );

  // Initialiser le message
  useEffect(() => {
    if (messages.length > 0) {
      setCurrentMessage(messages[0]);
      setMessageIndex(0);
    }
  }, [phase]);

  // Rotation intelligente
  useEffect(() => {
    if (!shouldActivateRotation) {
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex(prev => {
        const nextIndex = (prev + 1) % messages.length;
        setCurrentMessage(messages[nextIndex]);
        return nextIndex;
      });
    }, getRotationInterval(phase));

    return () => clearInterval(interval);
  }, [phase, shouldActivateRotation, messages]);

  return {
    currentMessage,
    isRotating: shouldActivateRotation,
    phaseDuration: currentDuration,
    estimatedRemainingTime: Math.max(0, estimatedDuration - currentDuration)
  };
}

/**
 * Hook pour les messages contextuels avec conditions
 */
export function useContextualMessages(
  phase: OrchestrationPhase,
  context?: {
    hasMemory?: boolean;
    hasImage?: boolean;
    isComplex?: boolean;
    isError?: boolean;
    userMessage?: string;
  }
) {
  const [currentMessage, setCurrentMessage] = useState<DynamicMessage | null>(null);

  const messages = DYNAMIC_MESSAGES[phase];
  const needsRotation = shouldRotateMessages(phase);

  // Sélectionner le message le plus approprié selon le contexte
  const selectContextualMessage = useCallback(() => {
    if (!context || messages.length === 0) {
      return messages[0] || null;
    }

    // Messages spéciaux selon le contexte
    if (context.isError) {
      return {
        id: 'error',
        phase,
        message: getErrorMessage(phase),
        icon: '⚠️',
        color: 'red',
        duration: 2000
      };
    }

    if (context.hasMemory && context.hasImage) {
      return {
        id: 'combined',
        phase,
        message: getCombinedMessage(phase),
        icon: '🎭',
        color: 'purple',
        duration: 2500
      };
    }

    if (context.hasMemory) {
      return {
        id: 'memory',
        phase,
        message: getMemoryMessage(phase),
        icon: '📚',
        color: 'blue',
        duration: 2500
      };
    }

    if (context.hasImage) {
      return {
        id: 'image',
        phase,
        message: getImageMessage(phase),
        icon: '🎨',
        color: 'green',
        duration: 2500
      };
    }

    return messages[0] || null;
  }, [phase, context, messages]);

  useEffect(() => {
    const contextualMessage = selectContextualMessage();
    setCurrentMessage(contextualMessage);
  }, [selectContextualMessage]);

  return {
    currentMessage,
    isContextual: !!context,
    needsRotation
  };
}

// Fonctions utilitaires pour les messages contextuels
function getErrorMessage(phase: OrchestrationPhase): string {
  const errorMessages = {
    orchestrator: '⚠️ Erreur d\'analyse...',
    archivist: '📚 Les archives sont temporairement indisponibles...',
    prompt_enhancer: '🎨 Le prompt enhancer rencontre des difficultés...',
    image_generation: '🖼️ Le générateur d\'images a un problème...',
    generating: '⛧ Algareth a besoin d\'un moment de réflexion...',
    complete: '❌ Erreur de finalisation...'
  };
  return errorMessages[phase] || '⚠️ Erreur inconnue...';
}

function getCombinedMessage(phase: OrchestrationPhase): string {
  const combinedMessages = {
    orchestrator: '🎭 Analyse complexe avec mémoire et image...',
    archivist: '📚🎨 Recherche dans les archives pour enrichir l\'image...',
    prompt_enhancer: '🎨 Amélioration du prompt avec contexte mémoire...',
    image_generation: '🖼️ Génération d\'image enrichie par la mémoire...',
    generating: '⛧ Composition de réponse avec mémoire et image...',
    complete: '✅ Terminé avec enrichissement complet...'
  };
  return combinedMessages[phase] || '🎭 Traitement combiné...';
}

function getMemoryMessage(phase: OrchestrationPhase): string {
  const memoryMessages = {
    orchestrator: '🦋 Analyse avec recherche mémoire...',
    archivist: '📚 Recherche approfondie dans vos conversations...',
    prompt_enhancer: '🎨 Amélioration avec contexte personnel...',
    image_generation: '🖼️ Génération d\'image personnalisée...',
    generating: '⛧ Réponse enrichie par vos souvenirs...',
    complete: '✅ Terminé avec enrichissement mémoire...'
  };
  return memoryMessages[phase] || '📚 Traitement avec mémoire...';
}

function getImageMessage(phase: OrchestrationPhase): string {
  const imageMessages = {
    orchestrator: '🦋 Analyse avec génération d\'image...',
    archivist: '📚 Recherche pour enrichir l\'image...',
    prompt_enhancer: '🎨 Amélioration du prompt d\'image...',
    image_generation: '🖼️ Création de votre image personnalisée...',
    generating: '⛧ Réponse avec image intégrée...',
    complete: '✅ Terminé avec image générée...'
  };
  return imageMessages[phase] || '🎨 Traitement avec image...';
}