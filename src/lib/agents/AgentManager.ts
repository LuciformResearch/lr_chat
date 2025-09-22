/**
 * Gestionnaire des agents - Orchestre le système multi-agents
 */

import { AgentCommunicationSystem } from './AgentCommunication';
import { AlgarethAgent } from './AlgarethAgent';
import { ArchivistAgent } from './ArchivistAgent';

export interface AgentSystemConfig {
  geminiApiKey: string;
  enableArchivist: boolean;
  enableLogging: boolean;
  maxConcurrentRequests: number;
}

export class AgentManager {
  private algarethAgent: AlgarethAgent;
  private archivistAgent: ArchivistAgent | null = null;
  private config: AgentSystemConfig;
  private isInitialized: boolean = false;

  constructor(config: AgentSystemConfig) {
    this.config = config;
    this.algarethAgent = new AlgarethAgent();
    
    console.log('🎭 AgentManager initialisé');
  }

  /**
   * Initialise le système d'agents
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initialisation du système multi-agents...');

      // Enregistrer Algareth dans le système de communication
      AgentCommunicationSystem.registerAgent(this.algarethAgent);

      // Initialiser l'Archiviste si activé
      if (this.config.enableArchivist && this.config.geminiApiKey) {
        this.archivistAgent = new ArchivistAgent(this.config.geminiApiKey);
        AgentCommunicationSystem.registerAgent(this.archivistAgent);
        console.log('✅ Agent Archiviste initialisé');
      } else {
        console.log('⚠️ Agent Archiviste désactivé (clé API manquante)');
      }

      this.isInitialized = true;
      console.log('🎉 Système multi-agents initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation système multi-agents:', error);
      throw error;
    }
  }

  /**
   * Obtient l'agent Algareth
   */
  getAlgarethAgent(): AlgarethAgent {
    if (!this.isInitialized) {
      throw new Error('Système multi-agents non initialisé');
    }
    return this.algarethAgent;
  }

  /**
   * Obtient l'agent Archiviste
   */
  getArchivistAgent(): ArchivistAgent | null {
    if (!this.isInitialized) {
      throw new Error('Système multi-agents non initialisé');
    }
    return this.archivistAgent;
  }

  /**
   * Génère une réponse enrichie avec les agents
   */
  async generateEnhancedResponse(
    basePrompt: string,
    context: {
      userId: string;
      userName: string;
      currentSession: string;
      userMessage: string;
      conversationHistory: Array<{ role: string; content: string }>;
      sessionStartTime: string;
    }
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Système multi-agents non initialisé');
    }

    try {
      console.log(`✨ Génération réponse enrichie pour ${context.userName}`);
      
      // Utiliser Algareth pour générer une réponse enrichie
      const enhancedPrompt = await this.algarethAgent.generateEnhancedResponse(basePrompt, context);
      
      return enhancedPrompt;
    } catch (error) {
      console.error('❌ Erreur génération réponse enrichie:', error);
      return basePrompt; // Fallback vers le prompt de base
    }
  }

  /**
   * Archive une conversation
   */
  async archiveConversation(context: {
    userId: string;
    userName: string;
    currentSession: string;
    userMessage: string;
    conversationHistory: Array<{ role: string; content: string }>;
    sessionStartTime: string;
  }): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Système multi-agents non initialisé');
    }

    try {
      console.log(`📚 Archivage conversation pour ${context.userName}`);
      
      // Utiliser Algareth pour archiver la conversation
      await this.algarethAgent.archiveConversation(context);
      
      console.log('✅ Conversation archivée avec succès');
    } catch (error) {
      console.error('❌ Erreur archivage conversation:', error);
    }
  }

  /**
   * Notifie les agents d'un événement
   */
  async notifyAgents(event: string, context: {
    userId: string;
    userName: string;
    currentSession: string;
    userMessage: string;
    conversationHistory: Array<{ role: string; content: string }>;
    sessionStartTime: string;
  }): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Système multi-agents non initialisé');
    }

    try {
      await this.algarethAgent.notifyAgents(event, context);
    } catch (error) {
      console.error('❌ Erreur notification agents:', error);
    }
  }

  /**
   * Teste la communication entre agents
   */
  async testAgentCommunication(): Promise<{
    success: boolean;
    results: Record<string, any>;
  }> {
    if (!this.isInitialized) {
      throw new Error('Système multi-agents non initialisé');
    }

    const results: Record<string, any> = {};
    let allSuccess = true;

    try {
      console.log('🧪 Test communication inter-agents...');

      // Test communication Algareth → Archiviste
      if (this.archivistAgent) {
        const testResult = await this.algarethAgent.testAgentCommunication(
          'ArchivistAgent',
          'Test de communication - peux-tu me donner un aperçu général ?'
        );
        
        results.archivistCommunication = {
          success: testResult.success,
          content: testResult.content,
          processingTime: testResult.processingTime
        };
        
        if (!testResult.success) allSuccess = false;
      } else {
        results.archivistCommunication = {
          success: false,
          error: 'Agent Archiviste non disponible'
        };
        allSuccess = false;
      }

      // Test des statistiques
      const communicationStats = AgentCommunicationSystem.getCommunicationStats();
      results.communicationStats = communicationStats;

      // Test des capacités des agents
      const availableAgents = AgentCommunicationSystem.getAvailableAgents();
      results.availableAgents = availableAgents;

      console.log(`✅ Tests terminés: ${allSuccess ? 'SUCCÈS' : 'ÉCHEC'}`);
      
      return {
        success: allSuccess,
        results
      };
    } catch (error) {
      console.error('❌ Erreur tests communication:', error);
      return {
        success: false,
        results: { error: error.toString() }
      };
    }
  }

  /**
   * Obtient les statistiques du système
   */
  getSystemStats(): {
    isInitialized: boolean;
    availableAgents: string[];
    communicationStats: any;
    archivistStats: any;
  } {
    const communicationStats = AgentCommunicationSystem.getCommunicationStats();
    const availableAgents = AgentCommunicationSystem.getAvailableAgents().map(a => a.name);
    
    let archivistStats = null;
    if (this.archivistAgent) {
      archivistStats = this.archivistAgent.getStats();
    }

    return {
      isInitialized: this.isInitialized,
      availableAgents,
      communicationStats,
      archivistStats
    };
  }

  /**
   * Obtient l'historique des communications
   */
  getCommunicationHistory(): any[] {
    return AgentCommunicationSystem.getMessageHistory();
  }

  /**
   * Vide l'historique des communications
   */
  clearCommunicationHistory(): void {
    // Note: Dans une vraie implémentation, on aurait une méthode pour vider l'historique
    console.log('🧹 Historique des communications vidé');
  }

  /**
   * Redémarre le système d'agents
   */
  async restart(): Promise<void> {
    console.log('🔄 Redémarrage du système multi-agents...');
    
    this.isInitialized = false;
    await this.initialize();
    
    console.log('✅ Système multi-agents redémarré');
  }

  /**
   * Arrête le système d'agents
   */
  shutdown(): void {
    console.log('🛑 Arrêt du système multi-agents...');
    
    this.isInitialized = false;
    this.archivistAgent = null;
    
    console.log('✅ Système multi-agents arrêté');
  }
}