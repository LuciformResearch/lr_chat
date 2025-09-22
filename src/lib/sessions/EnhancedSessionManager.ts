/**
 * Gestionnaire de sessions amélioré avec génération automatique d'embeddings
 * Étend le ChatSessionManager avec l'intégration des embeddings Gemini
 */

import { ChatSessionManager } from './SessionManager';
import { ChatSession, SessionMemory, SessionMessage } from './types';
import { AutoEmbeddingService } from '../embeddings/AutoEmbeddingService';
import { Pool } from 'pg';

export class EnhancedSessionManager extends ChatSessionManager {
  private autoEmbeddingService: AutoEmbeddingService | null = null;
  private pool: Pool | null = null;
  private embeddingEnabled: boolean = true;

  constructor(user: string, pool?: Pool) {
    super(user);
    this.pool = pool || null;
    
    if (this.pool) {
      this.autoEmbeddingService = new AutoEmbeddingService(this.pool, {
        enabled: true,
        batchSize: 3,
        delayMs: 500,
        cacheEnabled: true
      });
      console.log('🤖 EnhancedSessionManager avec génération automatique d\'embeddings');
    } else {
      console.log('⚠️ EnhancedSessionManager sans pool DB - embeddings désactivés');
    }
  }

  /**
   * Ajoute un message avec génération automatique d'embedding
   */
  async addMessageToCurrentSession(message: Omit<SessionMessage, 'id' | 'timestamp'>): Promise<SessionMessage> {
    if (!this.currentSessionId) throw new Error("No active session");
    
    try {
      // Ajouter le message via l'API
      const response = await fetch(`/api/sessions/${this.currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      
      if (!response.ok) throw new Error('Failed to add message');
      const newMessage = await response.json();
      
      console.log(`✉️ Message ajouté à la session ${this.currentSessionId}`);

      // Générer l'embedding automatiquement si le service est disponible
      if (this.autoEmbeddingService && this.embeddingEnabled) {
        this.generateEmbeddingAsync(newMessage.id, newMessage.content, this.user);
      }

      return newMessage;
    } catch (error) {
      console.error('❌ Erreur ajout message:', error);
      throw error;
    }
  }

  /**
   * Génère l'embedding de manière asynchrone (non-bloquant)
   */
  private async generateEmbeddingAsync(messageId: string, content: string, userId: string): Promise<void> {
    if (!this.autoEmbeddingService) return;

    try {
      // Générer l'embedding en arrière-plan
      await this.autoEmbeddingService.processNewMessage(messageId, content, userId);
      
      console.log(`🔮 Embedding généré pour message ${messageId}`);
    } catch (error) {
      console.error(`❌ Erreur génération embedding message ${messageId}:`, error);
      // Ne pas faire échouer l'ajout du message si l'embedding échoue
    }
  }

  /**
   * Génère les embeddings manquants pour la session actuelle
   */
  async generateMissingEmbeddingsForCurrentSession(): Promise<{processed: number, errors: number}> {
    if (!this.autoEmbeddingService || !this.currentSessionId) {
      return { processed: 0, errors: 0 };
    }

    try {
      console.log(`🔍 Génération des embeddings manquants pour la session ${this.currentSessionId}...`);
      
      const result = await this.autoEmbeddingService.generateMissingEmbeddings(20);
      
      console.log(`✅ Embeddings générés pour la session: ${result.processed} succès, ${result.errors} erreurs`);
      return result;
    } catch (error) {
      console.error('❌ Erreur génération embeddings session:', error);
      return { processed: 0, errors: 1 };
    }
  }

  /**
   * Recherche sémantique dans la session actuelle
   */
  async searchInCurrentSession(query: string, options: any = {}): Promise<any[]> {
    if (!this.autoEmbeddingService || !this.currentSessionId) {
      console.log('⚠️ Recherche sémantique non disponible');
      return [];
    }

    try {
      const searchOptions = {
        ...options,
        userId: this.user,
        similarityThreshold: 0.6,
        maxResults: 10
      };

      const results = await this.autoEmbeddingService.searchWithCache(query, searchOptions);
      
      console.log(`🔍 Recherche sémantique: "${query}" -> ${results.length} résultats`);
      return results;
    } catch (error) {
      console.error('❌ Erreur recherche sémantique:', error);
      return [];
    }
  }

  /**
   * Obtient les statistiques des embeddings
   */
  getEmbeddingStats(): any {
    if (!this.autoEmbeddingService) {
      return { error: 'Service d\'embeddings non disponible' };
    }

    return this.autoEmbeddingService.getStats();
  }

  /**
   * Active/désactive la génération automatique d'embeddings
   */
  setEmbeddingEnabled(enabled: boolean): void {
    this.embeddingEnabled = enabled;
    
    if (this.autoEmbeddingService) {
      this.autoEmbeddingService.setEnabled(enabled);
    }
    
    console.log(`🔧 Génération automatique d'embeddings ${enabled ? 'activée' : 'désactivée'}`);
  }

  /**
   * Configure le service d'embeddings
   */
  configureEmbeddingService(config: any): void {
    if (this.autoEmbeddingService) {
      this.autoEmbeddingService.updateConfig(config);
      console.log('🔧 Service d\'embeddings configuré:', config);
    }
  }

  /**
   * Vide le cache des embeddings
   */
  clearEmbeddingCache(): void {
    if (this.autoEmbeddingService) {
      this.autoEmbeddingService.clearCache();
      console.log('🧹 Cache embeddings vidé');
    }
  }

  /**
   * Teste le service d'embeddings
   */
  async testEmbeddingService(): Promise<boolean> {
    if (!this.autoEmbeddingService) {
      console.log('⚠️ Service d\'embeddings non disponible');
      return false;
    }

    try {
      const isWorking = await this.autoEmbeddingService.testService();
      console.log(`🧪 Test service embeddings: ${isWorking ? 'SUCCESS' : 'FAILED'}`);
      return isWorking;
    } catch (error) {
      console.error('❌ Erreur test service embeddings:', error);
      return false;
    }
  }

  /**
   * Exporte les données de la session avec embeddings
   */
  async exportSessionWithEmbeddings(sessionId: string): Promise<any> {
    try {
      // Récupérer les données de base de la session
      const sessionData = await this.loadSessionMemory(sessionId);
      
      if (!sessionData) {
        throw new Error('Session non trouvée');
      }

      // Ajouter les statistiques d'embeddings
      const embeddingStats = this.getEmbeddingStats();
      
      // Recherche sémantique pour enrichir l'export
      let semanticInsights = null;
      if (this.autoEmbeddingService && sessionData.messages.length > 0) {
        try {
          const recentMessages = sessionData.messages.slice(-5);
          const topics = recentMessages.map(msg => msg.content.substring(0, 50)).join(' ');
          
          const semanticResults = await this.autoEmbeddingService.searchWithCache(topics, {
            userId: this.user,
            similarityThreshold: 0.7,
            maxResults: 5
          });
          
          semanticInsights = {
            relatedTopics: semanticResults.map(r => ({
              content: r.content.substring(0, 100),
              similarity: r.similarity
            }))
          };
        } catch (error) {
          console.warn('⚠️ Impossible de générer les insights sémantiques:', error);
        }
      }

      return {
        ...sessionData,
        metadata: {
          ...sessionData.metadata,
          exportDate: new Date().toISOString(),
          embeddingStats,
          semanticInsights
        }
      };
    } catch (error) {
      console.error('❌ Erreur export session avec embeddings:', error);
      throw error;
    }
  }

  /**
   * Analyse sémantique de la session actuelle
   */
  async analyzeCurrentSessionSemantics(): Promise<any> {
    if (!this.currentSessionId || !this.autoEmbeddingService) {
      return { error: 'Analyse sémantique non disponible' };
    }

    try {
      const sessionData = await this.loadSessionMemory(this.currentSessionId);
      
      if (!sessionData || sessionData.messages.length === 0) {
        return { error: 'Aucun message dans la session' };
      }

      // Analyser les topics principaux
      const userMessages = sessionData.messages.filter(msg => msg.role === 'user');
      const assistantMessages = sessionData.messages.filter(msg => msg.role === 'assistant');
      
      const analysis = {
        sessionId: this.currentSessionId,
        totalMessages: sessionData.messages.length,
        userMessages: userMessages.length,
        assistantMessages: assistantMessages.length,
        topics: [],
        semanticClusters: [],
        timestamp: new Date().toISOString()
      };

      // Recherche de topics similaires
      if (userMessages.length > 0) {
        const sampleMessage = userMessages[Math.floor(userMessages.length / 2)].content;
        const similarMessages = await this.autoEmbeddingService.searchWithCache(sampleMessage, {
          userId: this.user,
          similarityThreshold: 0.5,
          maxResults: 10
        });

        analysis.topics = similarMessages.map(msg => ({
          content: msg.content.substring(0, 100),
          similarity: msg.similarity,
          sessionId: msg.metadata.sessionId
        }));
      }

      console.log(`📊 Analyse sémantique session ${this.currentSessionId}: ${analysis.topics.length} topics trouvés`);
      return analysis;

    } catch (error) {
      console.error('❌ Erreur analyse sémantique session:', error);
      return { error: error.message };
    }
  }
}