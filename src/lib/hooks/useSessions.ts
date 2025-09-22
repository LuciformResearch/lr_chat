/**
 * Hook pour gérer les sessions de chat
 * Interface React pour le SessionManager
 */

import { useState, useEffect, useCallback } from 'react';
import { ChatSessionManager } from '@/lib/sessions/SessionManager';
import { ChatSession, SessionMemory } from '@/lib/sessions/types';

export function useSessions(user: string) {
  const [sessionManager, setSessionManager] = useState<ChatSessionManager | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialiser le gestionnaire de sessions
  useEffect(() => {
    if (!user) {
      console.log('⚠️ useSessions: Pas d\'utilisateur défini');
      setSessionManager(null);
      setSessions([]);
      setCurrentSession(null);
      setIsLoading(false);
      return;
    }

    const initializeSessions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`🔄 useSessions: Initialisation pour l'utilisateur ${user}`);
        const manager = new ChatSessionManager(user);
        await manager.initialize();
        
        setSessionManager(manager);
        setSessions(manager.sessions);
        
        // Sélectionner automatiquement la dernière session en date après chargement
        const latestSession = manager.sessions.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        
        if (latestSession) {
          // Utiliser switchToSession pour déclencher le bon mécanisme de chargement
          await manager.switchToSession(latestSession.id);
          setCurrentSession(manager.getCurrentSession());
          console.log(`📋 Session la plus récente sélectionnée: ${latestSession.title}`);
        } else {
          setCurrentSession(manager.getCurrentSession());
        }
        
        console.log(`✅ Sessions initialisées pour ${user}`);
      } catch (err) {
        console.error('❌ Erreur initialisation sessions:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    };

    initializeSessions();
  }, [user]);

  // Créer une nouvelle session
  const createSession = useCallback(async (title?: string) => {
    if (!sessionManager) return null;

    try {
      const newSession = await sessionManager.createSession(title);
      setSessions([...sessionManager.sessions]);
      
      // Basculer vers la nouvelle session
      await switchToSession(newSession.id);
      
      return newSession;
    } catch (err) {
      console.error('❌ Erreur création session:', err);
      setError(err instanceof Error ? err.message : 'Erreur création session');
      return null;
    }
  }, [sessionManager]);

  // Basculer vers une session
  const switchToSession = useCallback(async (sessionId: string) => {
    if (!sessionManager) return;

    try {
      // Sauvegarder la session actuelle avant de basculer
      const currentSession = sessionManager.getCurrentSession();
      if (currentSession && currentSession.id !== sessionId) {
        console.log(`💾 Sauvegarde de la session ${currentSession.id} avant basculement`);
        // La sauvegarde sera gérée par le composant parent
      }

      await sessionManager.switchToSession(sessionId);
      setSessions([...sessionManager.sessions]);
      setCurrentSession(sessionManager.getCurrentSession());
      
      console.log(`🔄 Session basculée vers ${sessionId}`);
    } catch (err) {
      console.error('❌ Erreur basculement session:', err);
      setError(err instanceof Error ? err.message : 'Erreur basculement session');
    }
  }, [sessionManager]);

  // Supprimer une session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!sessionManager) return;

    try {
      await sessionManager.deleteSession(sessionId);
      setSessions([...sessionManager.sessions]);
      setCurrentSession(sessionManager.getCurrentSession());
    } catch (err) {
      console.error('❌ Erreur suppression session:', err);
      setError(err instanceof Error ? err.message : 'Erreur suppression session');
    }
  }, [sessionManager]);

  // Renommer une session
  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    if (!sessionManager) return;

    try {
      sessionManager.updateSessionTitle(sessionId, newTitle);
      setSessions([...sessionManager.sessions]);
    } catch (err) {
      console.error('❌ Erreur renommage session:', err);
      setError(err instanceof Error ? err.message : 'Erreur renommage session');
    }
  }, [sessionManager]);

  // Sauvegarder la mémoire de la session active
  const saveCurrentSessionMemory = useCallback(async (memory: SessionMemory) => {
    if (!sessionManager || !currentSession) return;

    try {
      await sessionManager.saveSessionMemory(currentSession.id, memory);
      setSessions([...sessionManager.sessions]);
      console.log(`💾 Mémoire de la session ${currentSession.id} sauvegardée`);
    } catch (err) {
      console.error('❌ Erreur sauvegarde mémoire session:', err);
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde mémoire');
    }
  }, [sessionManager, currentSession]);

  // Sauvegarder la session actuelle avec les messages fournis
  const saveCurrentSessionWithMessages = useCallback(async (messages: any[], hierarchicalMemoryStats?: any, userMemory?: any) => {
    if (!sessionManager || !currentSession) return;

    try {
      const sessionMemory: SessionMemory = {
        sessionId: currentSession.id,
        messages: messages,
        hierarchicalMemory: {
          items: [],
          stats: hierarchicalMemoryStats || currentSession.memoryStats
        },
        userMemory: userMemory || {
          loaded: true,
          conversationCount: 0,
          summaryCount: 0,
          lastConversation: null,
          metaSummary: null
        }
      };

      await sessionManager.saveSessionMemory(currentSession.id, sessionMemory);
      setSessions([...sessionManager.sessions]);
      console.log(`💾 Session ${currentSession.id} sauvegardée avec ${messages.length} messages`);
    } catch (err) {
      console.error('❌ Erreur sauvegarde session avec messages:', err);
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde session');
    }
  }, [sessionManager, currentSession]);

  // Charger la mémoire d'une session
  const loadSessionMemory = useCallback(async (sessionId: string): Promise<SessionMemory | null> => {
    if (!sessionManager) {
      console.error('❌ useSessions.loadSessionMemory: SessionManager non disponible');
      return null;
    }

    try {
      console.log(`🔄 useSessions.loadSessionMemory: Chargement de la session ${sessionId}`);
      return await sessionManager.loadSessionMemory(sessionId);
    } catch (err) {
      console.error('❌ Erreur chargement mémoire session:', err);
      setError(err instanceof Error ? err.message : 'Erreur chargement mémoire');
      return null;
    }
  }, [sessionManager]);

  // Mettre à jour les statistiques de la session active
  const updateCurrentSessionStats = useCallback((stats: any) => {
    if (!sessionManager) return;

    try {
      sessionManager.updateCurrentSessionStats(stats);
      setSessions([...sessionManager.sessions]);
      setCurrentSession(sessionManager.getCurrentSession());
    } catch (err) {
      console.error('❌ Erreur mise à jour stats session:', err);
    }
  }, [sessionManager]);

  // Obtenir les statistiques
  const getStats = useCallback(() => {
    if (!sessionManager) return null;
    return sessionManager.getStats();
  }, [sessionManager]);

  // Vider toutes les sessions
  const clearAllSessions = useCallback(async () => {
    if (!sessionManager) return;

    try {
      await sessionManager.clearAllSessions();
      setSessions([]);
      setCurrentSession(null);
    } catch (err) {
      console.error('❌ Erreur suppression sessions:', err);
      setError(err instanceof Error ? err.message : 'Erreur suppression sessions');
    }
  }, [sessionManager]);

  return {
    // État
    sessions,
    currentSession,
    isLoading,
    error,
    sessionManager,
    
    // Actions
    createSession,
    switchToSession,
    deleteSession,
    renameSession,
    saveCurrentSessionMemory,
    saveCurrentSessionWithMessages,
    loadSessionMemory,
    updateCurrentSessionStats,
    getStats,
    clearAllSessions,
    
    // Utilitaires
    hasSessions: sessions.length > 0,
    currentSessionId: currentSession?.id || null
  };
}