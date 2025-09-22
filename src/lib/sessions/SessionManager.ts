/**
 * Gestionnaire principal des sessions de chat
 * Interface principale pour gérer les sessions multiples avec persistence
 */

import { ChatSession, SessionMemory, SessionManager, SessionStorage } from './types';
import { LocalSessionStorage } from './SessionStorage';

/**
 * Gestionnaire principal des sessions de chat
 * Nouvelle version avec API Backend (PostgreSQL)
 */

import { ChatSession, SessionMemory, SessionMessage } from './types';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/lib/utils/authenticatedFetch';
import { clientAuthService } from '@/lib/auth/client-auth-service';

export class ChatSessionManager {
  public sessions: ChatSession[] = [];
  public currentSessionId: string | null = null;
  private user: string = '';

  constructor(user: string) {
    this.user = user;
    console.log(`🎯 API-based SessionManager initialisé pour ${user}`);
  }

  /**
   * Initialise le gestionnaire en chargeant les sessions depuis l'API.
   */
  async initialize(): Promise<void> {
    if (!this.user) {
      console.log('⚠️ SessionManager: Pas d\'utilisateur défini, initialisation différée');
      return;
    }

    // Vérifier si le token d'authentification est disponible
    const token = clientAuthService.getToken();
    if (!token) {
      console.log('⚠️ SessionManager: Pas de token d\'authentification disponible, initialisation différée');
      return;
    }

    try {
      console.log(`🔄 SessionManager: Initialisation pour l'utilisateur ${this.user}`);
      const response = await authenticatedGet(`/api/sessions`);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API Error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Failed to fetch sessions (status: ${response.status})`);
      }
      this.sessions = await response.json();

      if (this.sessions.length === 0) {
        await this.createSession('Première Conversation');
      } else {
        const lastActiveId = localStorage.getItem(`lr_tchatagent_active_session_${this.user}`);
        const sessionToActivate = this.sessions.find(s => s.id === lastActiveId) || this.sessions[0];
        await this.switchToSession(sessionToActivate.id);
      }
      console.log(`✅ ${this.sessions.length} sessions chargées depuis l'API pour ${this.user}`);
    } catch (error) {
      console.error('❌ Erreur initialisation SessionManager:', error);
      // En cas d'erreur réseau, créer une session de secours locale
      if (this.sessions.length === 0) {
        this.sessions.push(this.createLocalFallbackSession());
        this.currentSessionId = this.sessions[0].id;
      }
    }
  }

  /**
   * Crée une nouvelle session via l'API.
   */
  async createSession(title: string = 'Nouvelle Conversation'): Promise<ChatSession> {
    try {
      const response = await authenticatedPost('/api/sessions', { title });
      if (!response.ok) throw new Error('Failed to create session');
      const newSession = await response.json();
      this.sessions.unshift(newSession);
      await this.switchToSession(newSession.id);
      return newSession;
    } catch (error) {
      console.error('❌ Erreur création session:', error);
      throw error;
    }
  }

  /**
   * Bascule vers une session spécifique.
   */
  async switchToSession(sessionId: string): Promise<void> {
    this.sessions.forEach(session => session.isActive = session.id === sessionId);
    this.currentSessionId = sessionId;
    localStorage.setItem(`lr_tchatagent_active_session_${this.user}`, sessionId);
    console.log(`🔄 Session activée: ${sessionId}`);
  }

  /**
   * Supprime une session via l'API.
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const response = await authenticatedDelete(`/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to delete session');
      
      const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex > -1) this.sessions.splice(sessionIndex, 1);

      if (this.currentSessionId === sessionId) {
        if (this.sessions.length > 0) {
          await this.switchToSession(this.sessions[0].id);
        } else {
          await this.createSession();
        }
      }
      console.log(`🗑️ Session supprimée: ${sessionId}`);
    } catch (error) {
      console.error('❌ Erreur suppression session:', error);
      throw error;
    }
  }

  /**
   * Met à jour le titre d'une session via l'API.
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) session.title = title;
    try {
      await authenticatedPut(`/api/sessions/${sessionId}`, { title });
      console.log(`📝 Titre mis à jour pour ${sessionId}`);
    } catch (error) {
      console.error('❌ Erreur renommage session:', error);
      // Revert title on failure?
    }
  }

  /**
   * Charge les messages d'une session depuis l'API.
   */
  async loadSessionMemory(sessionId: string): Promise<SessionMemory | null> {
    try {
      // Vérifier si le token est disponible
      const token = clientAuthService.getToken();
      if (!token) {
        console.error('❌ SessionManager.loadSessionMemory: Pas de token d\'authentification disponible');
        throw new Error('Token d\'authentification manquant');
      }

      console.log(`🔄 SessionManager.loadSessionMemory: Chargement des messages pour la session ${sessionId}`);
      const response = await authenticatedGet(`/api/sessions/${sessionId}/messages`);
      
      console.log(`📡 SessionManager.loadSessionMemory: Réponse API - Status: ${response.status}, OK: ${response.ok}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ SessionManager.loadSessionMemory: Erreur API ${response.status}:`, errorText);
        throw new Error(`Failed to load messages: ${response.status} - ${errorText}`);
      }
      
      const rawMessages: SessionMessage[] = await response.json();
      
      // Transformer les messages pour inclure les divineMurmurs
      const messages = rawMessages.map(msg => ({
        ...msg,
        divineMurmurs: msg.metadata?.divineMurmurs || []
      }));
      
      console.log(`📝 ${messages.length} messages chargés, ${messages.filter(m => m.divineMurmurs.length > 0).length} avec divineMurmurs`);
      
      // Construire un objet SessionMemory pour la compatibilité avec le composant
      return {
        sessionId,
        messages,
        hierarchicalMemory: { items: [], stats: null }, // Ces systèmes devront être migrés séparément
        userMemory: { loaded: false, conversationCount: 0, summaryCount: 0, lastConversation: null, metaSummary: null },
      };
    } catch (error) {
      console.error('❌ Erreur chargement mémoire session:', error);
      return null;
    }
  }

  getCurrentSession(): ChatSession | null {
    // Au rechargement de page, aucune session ne devrait être active par défaut
    return this.sessions.find(s => s.isActive) || null;
  }

  private createLocalFallbackSession(): ChatSession {
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      title: 'Session de Secours (Hors Ligne)',
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      user: this.user,
      persona: 'Algareth',
      mode: 'algareth',
      language: 'fr',
      memoryStats: { totalItems: 0, rawMessages: 0, summaries: 0, l1Count: 0, totalCharacters: 0, budget: { maxCharacters: 10000, currentCharacters: 0, summaryRatio: 0 } },
      isActive: false,
    };
  }
  
  // Les fonctions de sauvegarde globales (saveSessionMemory, etc.) sont dépréciées.
  // La sauvegarde se fait maintenant message par message via une fonction addMessage dédiée.
  async addMessageToCurrentSession(message: Omit<SessionMessage, 'id' | 'timestamp'>): Promise<SessionMessage> {
    if (!this.currentSessionId) throw new Error("No active session");
    try {
        const response = await authenticatedPost(`/api/sessions/${this.currentSessionId}/messages`, message);
        if (!response.ok) throw new Error('Failed to add message');
        const newMessage = await response.json();
        console.log(`✉️ Message ajouté à la session ${this.currentSessionId}`);
        return newMessage;
    } catch (error) {
        console.error('❌ Erreur ajout message:', error);
        throw error;
    }
  }

  /**
   * Sauvegarde la mémoire d'une session (méthode de compatibilité)
   * @deprecated Utiliser addMessageToCurrentSession à la place
   */
  async saveSessionMemory(sessionId: string, memory: SessionMemory): Promise<void> {
    try {
      // Cette méthode est dépréciée car la sauvegarde se fait maintenant message par message
      console.log(`⚠️ saveSessionMemory est dépréciée pour la session ${sessionId}`);
      console.log(`📝 Mémoire à sauvegarder: ${memory.messages.length} messages`);
      
      // Pour la compatibilité, on peut juste logger que la sauvegarde est faite
      // La vraie sauvegarde se fait via addMessageToCurrentSession
    } catch (error) {
      console.error('❌ Erreur sauvegarde mémoire session:', error);
      throw error;
    }
  }

  /**
   * Met à jour les statistiques de la session active
   */
  updateCurrentSessionStats(stats: any): void {
    const currentSession = this.sessions.find(s => s.isActive);
    if (currentSession) {
      currentSession.memoryStats = { ...currentSession.memoryStats, ...stats };
      console.log(`📊 Stats mises à jour pour la session ${currentSession.id}`);
    }
  }

  /**
   * Obtient les statistiques du gestionnaire
   */
  getStats(): any {
    return {
      totalSessions: this.sessions.length,
      currentSessionId: this.currentSessionId,
      user: this.user
    };
  }

  /**
   * Supprime toutes les sessions
   */
  async clearAllSessions(): Promise<void> {
    try {
      for (const session of this.sessions) {
        await this.deleteSession(session.id);
      }
      console.log('🗑️ Toutes les sessions supprimées');
    } catch (error) {
      console.error('❌ Erreur suppression sessions:', error);
      throw error;
    }
  }

  /**
   * Réinitialise le gestionnaire avec un nouvel utilisateur
   */
  async reinitialize(newUser: string): Promise<void> {
    this.user = newUser;
    this.sessions = [];
    this.currentSessionId = null;
    console.log(`🔄 SessionManager réinitialisé pour ${newUser}`);
    await this.initialize();
  }

  /**
   * Test de l'authentification - vérifie si le token fonctionne
   */
  async testAuthentication(): Promise<boolean> {
    try {
      const token = clientAuthService.getToken();
      if (!token) {
        console.error('❌ SessionManager.testAuthentication: Pas de token disponible');
        return false;
      }

      console.log('🧪 SessionManager.testAuthentication: Test du token...');
      const response = await authenticatedGet('/api/sessions');
      console.log(`🧪 SessionManager.testAuthentication: Réponse - Status: ${response.status}, OK: ${response.ok}`);
      
      if (response.ok) {
        console.log('✅ SessionManager.testAuthentication: Token valide');
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ SessionManager.testAuthentication: Token invalide - ${response.status}:`, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ SessionManager.testAuthentication: Erreur:', error);
      return false;
    }
  }
}
