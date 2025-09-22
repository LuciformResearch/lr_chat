'use client';

import { useState, useCallback, useRef } from 'react';
import { OrchestrationPhase } from '@/types/orchestration';

interface PhaseUpdate {
  phase: OrchestrationPhase;
  progress: number;
  message: string;
  details?: string;
  timestamp: string;
}

interface StreamResult {
  divineMurmurs: any[];
  timestamp: string;
}

interface StreamError {
  error: string;
  timestamp: string;
}

interface UseOrchestrationStreamReturn {
  isActive: boolean;
  currentPhase: OrchestrationPhase;
  progress: number;
  currentMessage: string;
  details?: string;
  divineMurmurs: any[];
  error: string | null;
  startOrchestration: (params: OrchestrationParams) => Promise<void>;
  stopOrchestration: () => void;
}

interface OrchestrationParams {
  userMessage: string;
  userId: string;
  userName: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentSession: string;
}

export function useOrchestrationStream(): UseOrchestrationStreamReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<OrchestrationPhase>('orchestrator');
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [details, setDetails] = useState<string | undefined>();
  const [divineMurmurs, setDivineMurmurs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  const startOrchestration = useCallback(async (params: OrchestrationParams) => {
    try {
      console.log('🚀 Démarrage orchestration stream');
      
      // Réinitialiser l'état
      setIsActive(true);
      setCurrentPhase('orchestrator');
      setProgress(0);
      setCurrentMessage('');
      setDetails(undefined);
      setDivineMurmurs([]);
      setError(null);

      // Créer l'EventSource pour Server-Sent Events
      const eventSource = new EventSource('/api/orchestrator-stream', {
        // Note: EventSource ne supporte pas POST directement
        // On va utiliser fetch avec ReadableStream à la place
      });

      // Utiliser fetch avec ReadableStream pour POST
      const response = await fetch('/api/orchestrator-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Pas de body dans la réponse');
      }

      // Lire le stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Stream terminé');
            break;
          }

          // Décoder les données
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case 'phase':
                    console.log(`🔄 Phase reçue: ${data.phase} (${data.progress}%)`);
                    setCurrentPhase(data.phase);
                    setProgress(data.progress);
                    setCurrentMessage(data.message);
                    setDetails(data.details);
                    break;
                    
                  case 'result':
                    console.log('✅ Résultat reçu:', data.divineMurmurs);
                    setDivineMurmurs(data.divineMurmurs);
                    setIsActive(false);
                    break;
                    
                  case 'error':
                    console.error('❌ Erreur reçue:', data.error);
                    setError(data.error);
                    setIsActive(false);
                    break;
                }
              } catch (parseError) {
                console.warn('⚠️ Erreur parsing SSE:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      console.error('❌ Erreur orchestration stream:', error);
      setError(error instanceof Error ? error.message : 'Erreur inconnue');
      setIsActive(false);
    }
  }, []);

  const stopOrchestration = useCallback(() => {
    console.log('🛑 Arrêt orchestration stream');
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsActive(false);
    setError(null);
  }, []);

  return {
    isActive,
    currentPhase,
    progress,
    currentMessage,
    details,
    divineMurmurs,
    error,
    startOrchestration,
    stopOrchestration
  };
}

/**
 * Hook alternatif utilisant fetch avec ReadableStream
 * Plus compatible avec POST et les headers personnalisés
 */
export function useOrchestrationStreamFetch(): UseOrchestrationStreamReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<OrchestrationPhase>('orchestrator');
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [details, setDetails] = useState<string | undefined>();
  const [divineMurmurs, setDivineMurmurs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const startOrchestration = useCallback(async (params: OrchestrationParams) => {
    try {
      console.log('🚀 Démarrage orchestration stream (fetch)');
      
      // Annuler la requête précédente si elle existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Créer un nouveau AbortController
      abortControllerRef.current = new AbortController();

      // Réinitialiser l'état
      setIsActive(true);
      setCurrentPhase('orchestrator');
      setProgress(0);
      setCurrentMessage('');
      setDetails(undefined);
      setDivineMurmurs([]);
      setError(null);

      // Faire la requête POST avec streaming
      const response = await fetch('/api/orchestrator-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Pas de body dans la réponse');
      }

      // Lire le stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Stream terminé');
            break;
          }

          // Décoder les données
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                switch (data.type) {
                  case 'phase':
                    console.log(`🔄 Phase reçue: ${data.phase} (${data.progress}%)`);
                    setCurrentPhase(data.phase);
                    setProgress(data.progress);
                    setCurrentMessage(data.message);
                    setDetails(data.details);
                    break;
                    
                  case 'result':
                    console.log('✅ Résultat reçu:', data.divineMurmurs);
                    setDivineMurmurs(data.divineMurmurs);
                    setIsActive(false);
                    break;
                    
                  case 'error':
                    console.error('❌ Erreur reçue:', data.error);
                    setError(data.error);
                    setIsActive(false);
                    break;
                }
              } catch (parseError) {
                console.warn('⚠️ Erreur parsing SSE:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Orchestration annulée');
      } else {
        console.error('❌ Erreur orchestration stream:', error);
        setError(error instanceof Error ? error.message : 'Erreur inconnue');
      }
      setIsActive(false);
    }
  }, []);

  const stopOrchestration = useCallback(() => {
    console.log('🛑 Arrêt orchestration stream');
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setIsActive(false);
    setError(null);
  }, []);

  return {
    isActive,
    currentPhase,
    progress,
    currentMessage,
    details,
    divineMurmurs,
    error,
    startOrchestration,
    stopOrchestration
  };
}