/**
 * Gestionnaire de persistence pour les sessions de chat
 * Utilise localStorage avec structure organisée par utilisateur
 */

import { ChatSession, SessionMemory, SessionStorage } from './types';

export class LocalSessionStorage implements SessionStorage {
  private readonly STORAGE_PREFIX = 'lr_tchatagent_sessions';
  private readonly MEMORY_PREFIX = 'lr_tchatagent_session_memory';

  /**
   * Sauvegarde une session
   */
  async saveSession(session: ChatSession): Promise<void> {
    try {
      const userSessions = await this.loadSessions(session.user);
      const existingIndex = userSessions.findIndex(s => s.id === session.id);
      
      if (existingIndex >= 0) {
        // Préserver les données importantes lors de la mise à jour
        const existingSession = userSessions[existingIndex];
        userSessions[existingIndex] = {
          ...session,
          // Préserver les données de mémoire si elles existent
          memoryStats: session.memoryStats || existingSession.memoryStats,
          messageCount: session.messageCount || existingSession.messageCount,
          lastMessage: session.lastMessage || existingSession.lastMessage
        };
      } else {
        userSessions.push(session);
      }
      
      // Trier par date de mise à jour (plus récent en premier)
      userSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      const storageKey = `${this.STORAGE_PREFIX}_${session.user}`;
      localStorage.setItem(storageKey, JSON.stringify(userSessions));
      
      console.log(`💾 Session sauvegardée: ${session.id} (${session.title}) - ${session.messageCount} messages`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde session:', error);
      throw error;
    }
  }

  /**
   * Charge toutes les sessions d'un utilisateur
   */
  async loadSessions(user: string): Promise<ChatSession[]> {
    try {
      const storageKey = `${this.STORAGE_PREFIX}_${user}`;
      const data = localStorage.getItem(storageKey);
      
      if (!data) {
        return [];
      }
      
      const sessions = JSON.parse(data) as ChatSession[];
      
      // Vérifier que sessions est bien un tableau
      if (!Array.isArray(sessions)) {
        console.warn(`⚠️ Données sessions corrompues pour ${user}, réinitialisation`);
        return [];
      }
      
      // Trier par date de mise à jour (plus récent en premier)
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      
      console.log(`📂 ${sessions.length} sessions chargées pour ${user} (triées par dernière modification)`);
      return sessions;
    } catch (error) {
      console.error('❌ Erreur chargement sessions:', error);
      return [];
    }
  }

  /**
   * Supprime une session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Trouver l'utilisateur de cette session
      const allKeys = Object.keys(localStorage);
      const sessionKeys = allKeys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      for (const key of sessionKeys) {
        const sessions = JSON.parse(localStorage.getItem(key) || '[]') as ChatSession[];
        const sessionIndex = sessions.findIndex(s => s.id === sessionId);
        
        if (sessionIndex >= 0) {
          sessions.splice(sessionIndex, 1);
          localStorage.setItem(key, JSON.stringify(sessions));
          
          // Supprimer aussi la mémoire associée
          await this.deleteSessionMemory(sessionId);
          
          console.log(`🗑️ Session supprimée: ${sessionId}`);
          return;
        }
      }
      
      console.warn(`⚠️ Session non trouvée: ${sessionId}`);
    } catch (error) {
      console.error('❌ Erreur suppression session:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde la mémoire d'une session
   */
  async saveSessionMemory(sessionId: string, memory: SessionMemory): Promise<void> {
    try {
      const storageKey = `${this.MEMORY_PREFIX}_${sessionId}`;
      localStorage.setItem(storageKey, JSON.stringify(memory));
      
      console.log(`🧠 Mémoire session sauvegardée: ${sessionId}`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde mémoire session:', error);
      throw error;
    }
  }

  /**
   * Charge la mémoire d'une session
   */
  async loadSessionMemory(sessionId: string): Promise<SessionMemory | null> {
    try {
      const storageKey = `${this.MEMORY_PREFIX}_${sessionId}`;
      console.log(`🔍 Chargement mémoire avec clé: ${storageKey}`);
      const data = localStorage.getItem(storageKey);
      
      if (!data) {
        console.log(`❌ Aucune donnée trouvée pour la clé: ${storageKey}`);
        return null;
      }
      
      const memory = JSON.parse(data) as SessionMemory;
      
      // Vérifier que memory est bien un objet valide
      if (!memory || typeof memory !== 'object') {
        console.warn(`⚠️ Données mémoire corrompues pour ${sessionId}, réinitialisation`);
        return null;
      }
      
      console.log(`🧠 Mémoire session chargée: ${sessionId}`);
      console.log(`📋 Session ID dans la mémoire chargée: ${memory.sessionId}`);
      console.log(`📝 Nombre de messages dans la mémoire: ${memory.messages?.length || 0}`);
      return memory;
    } catch (error) {
      console.error('❌ Erreur chargement mémoire session:', error);
      return null;
    }
  }

  /**
   * Supprime la mémoire d'une session
   */
  private async deleteSessionMemory(sessionId: string): Promise<void> {
    try {
      const storageKey = `${this.MEMORY_PREFIX}_${sessionId}`;
      localStorage.removeItem(storageKey);
      console.log(`🧹 Mémoire session supprimée: ${sessionId}`);
    } catch (error) {
      console.error('❌ Erreur suppression mémoire session:', error);
    }
  }

  /**
   * Vide toutes les sessions d'un utilisateur
   */
  async clearAllSessions(user: string): Promise<void> {
    try {
      const storageKey = `${this.STORAGE_PREFIX}_${user}`;
      const sessions = await this.loadSessions(user);
      
      // Supprimer toutes les mémoires associées
      for (const session of sessions) {
        await this.deleteSessionMemory(session.id);
      }
      
      localStorage.removeItem(storageKey);
      console.log(`🧹 Toutes les sessions supprimées pour ${user}`);
    } catch (error) {
      console.error('❌ Erreur suppression sessions:', error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques de stockage
   */
  getStorageStats(): {
    totalSessions: number;
    totalMemoryEntries: number;
    storageSize: number;
  } {
    const allKeys = Object.keys(localStorage);
    const sessionKeys = allKeys.filter(key => key.startsWith(this.STORAGE_PREFIX));
    const memoryKeys = allKeys.filter(key => key.startsWith(this.MEMORY_PREFIX));
    
    let totalSessions = 0;
    for (const key of sessionKeys) {
      const sessions = JSON.parse(localStorage.getItem(key) || '[]') as ChatSession[];
      totalSessions += sessions.length;
    }
    
    const storageSize = allKeys.reduce((size, key) => {
      return size + (localStorage.getItem(key)?.length || 0);
    }, 0);
    
    return {
      totalSessions,
      totalMemoryEntries: memoryKeys.length,
      storageSize
    };
  }
}