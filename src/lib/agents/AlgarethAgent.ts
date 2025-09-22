/**
 * Algareth Agent - Agent principal qui peut communiquer avec d'autres agents spécialisés
 * Utilise le système de communication inter-agents pour accéder aux capacités spécialisées
 */

import { BaseAgent, AgentMessage, AgentResponse } from './AgentCommunication';
import { AgentCommunicationSystem } from './AgentCommunication';

export interface AlgarethContext {
  userId: string;
  userName: string;
  currentSession: string;
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  sessionStartTime: string;
}

export class AlgarethAgent extends BaseAgent {
  private availableAgents: string[] = [];
  private agentCapabilities: Map<string, string[]> = new Map();

  constructor() {
    const capabilities = {
      name: 'AlgarethAgent',
      description: 'Agent principal Algareth avec capacités de communication inter-agents',
      capabilities: [
        'communiquer_avec_agents',
        'demander_analyse',
        'obtenir_mémoire',
        'coordonner_agents',
        'synthétiser_informations'
      ],
      responseTime: 'instant',
      requiresContext: true
    };

    super('AlgarethAgent', capabilities);
    
    this.discoverAvailableAgents();
    console.log('⛧ Agent Algareth initialisé avec communication inter-agents');
  }

  /**
   * Découvre les agents disponibles
   */
  private discoverAvailableAgents(): void {
    const agents = AgentCommunicationSystem.getAvailableAgents();
    this.availableAgents = agents.map(agent => agent.name);
    
    agents.forEach(agent => {
      this.agentCapabilities.set(agent.name, agent.capabilities);
    });

    console.log(`🔍 Agents découverts: ${this.availableAgents.join(', ')}`);
  }

  /**
   * Traite les messages (principalement pour la communication interne)
   */
  async processMessage(message: AgentMessage): Promise<string> {
    // Algareth reçoit rarement des messages directs
    // Il est plutôt l'initiateur des communications
    return `⛧ Algareth reçoit: ${message.content}`;
  }

  /**
   * Demande une analyse à l'Archiviste
   */
  async requestArchivistAnalysis(context: AlgarethContext): Promise<AgentResponse> {
    console.log(`📚 Algareth demande une analyse à l'Archiviste pour ${context.userName}`);
    
    const analysisRequest = `Analyser la conversation de ${context.userName} (${context.userId}):
    
Session: ${context.currentSession}
Message actuel: "${context.userMessage}"
Historique: ${context.conversationHistory.length} messages

Fournis-moi:
1. Un résumé de la session
2. Les patterns émotionnels
3. L'état de la relation
4. Des suggestions d'amélioration`;

    return await this.sendMessage('ArchivistAgent', analysisRequest, {
      userId: context.userId,
      userName: context.userName,
      messages: context.conversationHistory,
      sessionTitle: context.currentSession,
      currentQuery: context.userMessage
    });
  }

  /**
   * Demande une recherche dans la mémoire épisodique
   */
  async requestMemorySearch(context: AlgarethContext, query: string): Promise<AgentResponse> {
    console.log(`🔍 Algareth recherche dans la mémoire: "${query}"`);
    
    const searchRequest = `Rechercher dans la mémoire épisodique de ${context.userName}:
    
Recherche: "${query}"
Contexte: ${context.userMessage}

Fournis-moi les informations pertinentes trouvées.`;

    return await this.sendMessage('ArchivistAgent', searchRequest, {
      userId: context.userId,
      query: query,
      context: context.userMessage
    });
  }

  /**
   * Demande une évaluation de la relation
   */
  async requestRelationshipEvaluation(context: AlgarethContext): Promise<AgentResponse> {
    console.log(`🤝 Algareth évalue la relation avec ${context.userName}`);
    
    const evaluationRequest = `Évaluer l'état de la relation avec ${context.userName}:
    
Contexte actuel: "${context.userMessage}"
Historique: ${context.conversationHistory.length} messages

Fournis-moi:
1. Le niveau de confiance
2. Le niveau de confort
3. L'évolution de la relation
4. Des recommandations pour l'interaction actuelle`;

    return await this.sendMessage('ArchivistAgent', evaluationRequest, {
      userId: context.userId,
      userName: context.userName,
      currentContext: context.userMessage
    });
  }

  /**
   * Demande des suggestions d'amélioration
   */
  async requestImprovementSuggestions(context: AlgarethContext): Promise<AgentResponse> {
    console.log(`💡 Algareth demande des suggestions pour ${context.userName}`);
    
    const suggestionRequest = `Suggérer des améliorations pour l'interaction avec ${context.userName}:
    
Message actuel: "${context.userMessage}"
Contexte de la session: ${context.currentSession}

Fournis-moi des suggestions spécifiques pour améliorer ma réponse.`;

    return await this.sendMessage('ArchivistAgent', suggestionRequest, {
      userId: context.userId,
      userName: context.userName,
      currentMessage: context.userMessage,
      sessionContext: context.currentSession
    });
  }

  /**
   * Demande une analyse émotionnelle
   */
  async requestEmotionalAnalysis(context: AlgarethContext): Promise<AgentResponse> {
    console.log(`😊 Algareth analyse les émotions de ${context.userName}`);
    
    const emotionRequest = `Analyser l'état émotionnel de ${context.userName}:
    
Message actuel: "${context.userMessage}"
Historique récent: ${context.conversationHistory.slice(-5).map(m => m.content).join(' | ')}

Fournis-moi:
1. L'humeur actuelle
2. Les tendances émotionnelles
3. Des recommandations pour adapter mon ton`;

    return await this.sendMessage('ArchivistAgent', emotionRequest, {
      userId: context.userId,
      userName: context.userName,
      currentMessage: context.userMessage,
      recentHistory: context.conversationHistory.slice(-5)
    });
  }

  /**
   * Archive une conversation (appelé automatiquement en fin de session)
   */
  async archiveConversation(context: AlgarethContext): Promise<AgentResponse> {
    console.log(`📚 Algareth archive la conversation avec ${context.userName}`);
    
    const archiveRequest = `Archiver cette conversation avec ${context.userName}:
    
Session: ${context.currentSession}
Messages: ${context.conversationHistory.length}
Durée: ${context.sessionStartTime} → ${new Date().toISOString()}

Analyse et archive cette conversation pour référence future.`;

    return await this.sendMessage('ArchivistAgent', archiveRequest, {
      userId: context.userId,
      userName: context.userName,
      sessionId: context.currentSession,
      sessionTitle: context.currentSession,
      messages: context.conversationHistory,
      startTime: context.sessionStartTime,
      endTime: new Date().toISOString()
    });
  }

  /**
   * Obtient un résumé intelligent pour enrichir la réponse
   */
  async getIntelligentContext(context: AlgarethContext): Promise<string> {
    try {
      console.log(`🧠 Algareth obtient le contexte intelligent pour ${context.userName}`);
      
      // Demander plusieurs analyses en parallèle
      const [relationshipEval, emotionalAnalysis, memorySearch] = await Promise.all([
        this.requestRelationshipEvaluation(context),
        this.requestEmotionalAnalysis(context),
        this.requestMemorySearch(context, context.userMessage)
      ]);

      let intelligentContext = '';

      // Ajouter l'évaluation de la relation
      if (relationshipEval.success) {
        intelligentContext += `\n🤝 RELATION:\n${relationshipEval.content}\n`;
      }

      // Ajouter l'analyse émotionnelle
      if (emotionalAnalysis.success) {
        intelligentContext += `\n😊 ÉMOTIONS:\n${emotionalAnalysis.content}\n`;
      }

      // Ajouter la recherche mémoire
      if (memorySearch.success) {
        intelligentContext += `\n🧠 MÉMOIRE:\n${memorySearch.content}\n`;
      }

      return intelligentContext;
    } catch (error) {
      console.error('❌ Erreur obtention contexte intelligent:', error);
      return '';
    }
  }

  /**
   * Génère une réponse enrichie avec l'aide des agents
   */
  async generateEnhancedResponse(
    basePrompt: string,
    context: AlgarethContext
  ): Promise<string> {
    try {
      console.log(`✨ Algareth génère une réponse enrichie pour ${context.userName}`);
      
      // Obtenir le contexte intelligent des agents
      const intelligentContext = await this.getIntelligentContext(context);
      
      // Enrichir le prompt avec le contexte des agents
      const enhancedPrompt = `${basePrompt}

CONTEXTE INTELLIGENT DES AGENTS:${intelligentContext}

Utilise ces informations pour personnaliser ta réponse et améliorer l'interaction avec ${context.userName}.`;

      return enhancedPrompt;
    } catch (error) {
      console.error('❌ Erreur génération réponse enrichie:', error);
      return basePrompt; // Fallback vers le prompt de base
    }
  }

  /**
   * Notifie les agents d'un événement important
   */
  async notifyAgents(event: string, context: AlgarethContext): Promise<void> {
    console.log(`🔔 Algareth notifie les agents: ${event}`);
    
    const notification = `Événement: ${event}
Utilisateur: ${context.userName} (${context.userId})
Contexte: ${context.userMessage}`;

    // Notifier tous les agents disponibles
    for (const agentName of this.availableAgents) {
      if (agentName !== 'AlgarethAgent') {
        try {
          await this.sendNotification(agentName, notification, {
            event,
            context
          });
        } catch (error) {
          console.warn(`⚠️ Erreur notification ${agentName}:`, error);
        }
      }
    }
  }

  /**
   * Obtient les statistiques de communication
   */
  getCommunicationStats(): {
    availableAgents: string[];
    agentCapabilities: Record<string, string[]>;
    communicationStats: any;
  } {
    const communicationStats = AgentCommunicationSystem.getCommunicationStats();
    
    return {
      availableAgents: this.availableAgents,
      agentCapabilities: Object.fromEntries(this.agentCapabilities),
      communicationStats
    };
  }

  /**
   * Teste la communication avec un agent spécifique
   */
  async testAgentCommunication(agentName: string, testMessage: string): Promise<AgentResponse> {
    console.log(`🧪 Test communication avec ${agentName}`);
    
    return await this.sendMessage(agentName, testMessage, {
      test: true,
      timestamp: new Date().toISOString()
    });
  }
}