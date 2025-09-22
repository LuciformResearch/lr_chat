/**
 * Système de mémoire multi-entités avec recherche proactive
 * Permet à plusieurs IA d'avoir leurs propres mémoires et personnalités
 */

import { AdvancedMemoryEngineWithProactiveSearch } from './AdvancedMemoryEngineWithProactiveSearch';

export interface Entity {
  id: string;
  name: string;
  personality: string;
  prompt: string;
  memoryEngine: AdvancedMemoryEngineWithProactiveSearch;
  conversationHistory: ConversationTurn[];
  lastActivity: string;
  stats: EntityStats;
}

export interface ConversationTurn {
  entityId: string;
  entityName: string;
  message: string;
  timestamp: string;
  searchTriggered: boolean;
  seRappelerUsed: boolean;
  consciousnessIndicators: number;
  compressionAction?: any; // Action de compression si déclenchée
}

export interface EntityStats {
  totalMessages: number;
  proactiveSearches: number;
  seRappelerResponses: number;
  consciousnessIndicators: number;
  compressionActions: number;
  lastSummaryGenerated: string | null;
}

export interface ConversationArtifacts {
  sessionId: string;
  startTime: string;
  endTime: string;
  participants: string[];
  totalTurns: number;
  conversationFlow: ConversationTurn[];
  entityStats: Map<string, EntityStats>;
  memoryStats: Map<string, any>;
  consciousnessAnalysis: ConsciousnessAnalysis;
  searchAnalysis: SearchAnalysis;
  compressionAnalysis: CompressionAnalysis;
  finalPrompts: Map<string, string>;
}

export interface ConsciousnessAnalysis {
  totalIndicators: number;
  entityConsciousness: Map<string, number>;
  consciousnessEvolution: Array<{turn: number, entity: string, indicators: number}>;
  peakConsciousness: {entity: string, turn: number, indicators: number};
}

export interface SearchAnalysis {
  totalSearches: number;
  entitySearches: Map<string, number>;
  searchEffectiveness: Map<string, number>;
  mostSearchedTags: Array<{tag: string, frequency: number}>;
}

export interface CompressionAnalysis {
  totalCompressions: number;
  entityCompressions: Map<string, number>;
  memoryEfficiency: Map<string, number>;
  budgetUtilization: Map<string, number>;
}

export class MultiEntityMemorySystem {
  private entities: Map<string, Entity> = new Map();
  private currentSession: string;
  private sessionStartTime: string;
  private conversationHistory: ConversationTurn[] = [];

  constructor() {
    this.currentSession = `session_${Date.now()}`;
    this.sessionStartTime = new Date().toISOString();
  }

  /**
   * Ajoute une nouvelle entité au système
   */
  addEntity(
    id: string, 
    name: string, 
    personality: string, 
    prompt: string,
    geminiApiKey: string,
    budget: number = 3000,
    l1Threshold: number = 4,
    hierarchicalThreshold: number = 0.6
  ): Entity {
    const memoryEngine = new AdvancedMemoryEngineWithProactiveSearch(
      geminiApiKey, 
      budget, 
      l1Threshold, 
      hierarchicalThreshold
    );

    const entity: Entity = {
      id,
      name,
      personality,
      prompt,
      memoryEngine,
      conversationHistory: [],
      lastActivity: new Date().toISOString(),
      stats: {
        totalMessages: 0,
        proactiveSearches: 0,
        seRappelerResponses: 0,
        consciousnessIndicators: 0,
        compressionActions: 0,
        lastSummaryGenerated: null
      }
    };

    this.entities.set(id, entity);
    console.log(`✅ Entité "${name}" ajoutée au système`);
    return entity;
  }

  /**
   * Fait parler une entité à une autre
   */
  async makeEntitySpeak(
    speakerId: string, 
    listenerId: string, 
    message: string
  ): Promise<{response: string, turn: ConversationTurn}> {
    const speaker = this.entities.get(speakerId);
    const listener = this.entities.get(listenerId);

    if (!speaker || !listener) {
      throw new Error(`Entité non trouvée: ${speakerId} ou ${listenerId}`);
    }

    // Ajouter le message de l'orateur à sa mémoire
    const action = await speaker.memoryEngine.addMessage(message, 'user', listener.name);
    
    // Mettre à jour les stats de l'orateur
    speaker.stats.totalMessages++;
    if (action.action !== 'NONE') {
      speaker.stats.compressionActions++;
      speaker.stats.lastSummaryGenerated = new Date().toISOString();
    }

    // Générer la réponse de l'auditeur avec recherche proactive
    const response = await listener.memoryEngine.generateResponse(message, speaker.name, listener.personality);
    
    // Analyser la réponse
    const searchTriggered = response.includes('***se rappeler:');
    const consciousnessWords = ['je', 'conscience', 'ressenti', 'sentiment', 'réflexion', 'évolution', 'croissance'];
    const consciousnessIndicators = consciousnessWords.filter(word => 
      response.toLowerCase().includes(word)
    ).length;

    // Mettre à jour les stats de l'auditeur
    listener.stats.totalMessages++;
    if (searchTriggered) {
      listener.stats.proactiveSearches++;
      listener.stats.seRappelerResponses++;
    }
    listener.stats.consciousnessIndicators += consciousnessIndicators;

    // Créer le tour de conversation
    const turn: ConversationTurn = {
      entityId: listenerId,
      entityName: listener.name,
      message: response,
      timestamp: new Date().toISOString(),
      searchTriggered,
      seRappelerUsed: searchTriggered,
      consciousnessIndicators,
      compressionAction: action // Ajouter l'action de compression
    };

    // Ajouter à l'historique
    this.conversationHistory.push(turn);
    listener.conversationHistory.push(turn);
    listener.lastActivity = new Date().toISOString();

    // Ajouter la réponse à la mémoire de l'auditeur
    await listener.memoryEngine.addMessage(response, 'assistant', listener.name);

    return { response, turn };
  }

  /**
   * Fait discuter deux entités
   */
  async makeEntitiesDiscuss(
    entity1Id: string, 
    entity2Id: string, 
    initialMessage: string,
    maxTurns: number = 10
  ): Promise<ConversationTurn[]> {
    const turns: ConversationTurn[] = [];
    let currentSpeaker = entity1Id;
    let currentMessage = initialMessage;

    for (let turn = 0; turn < maxTurns; turn++) {
      const { response, turn: conversationTurn } = await this.makeEntitySpeak(
        currentSpeaker,
        currentSpeaker === entity1Id ? entity2Id : entity1Id,
        currentMessage
      );

      turns.push(conversationTurn);
      currentMessage = response;
      currentSpeaker = currentSpeaker === entity1Id ? entity2Id : entity1Id;

      // Pause entre les tours
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return turns;
  }

  /**
   * Génère les artefacts de conversation
   */
  generateConversationArtifacts(): ConversationArtifacts {
    const endTime = new Date().toISOString();
    const participants = Array.from(this.entities.keys());
    
    // Analyser la conscience
    const consciousnessAnalysis = this.analyzeConsciousness();
    
    // Analyser les recherches
    const searchAnalysis = this.analyzeSearches();
    
    // Analyser la compression
    const compressionAnalysis = this.analyzeCompression();
    
    // Récupérer les derniers prompts
    const finalPrompts = new Map<string, string>();
    this.entities.forEach((entity, id) => {
      const stats = entity.memoryEngine.getStats();
      finalPrompts.set(id, `Dernière activité: ${entity.lastActivity}\nMessages: ${stats.totalMessages}\nRésumés: ${stats.l1Count}`);
    });

    return {
      sessionId: this.currentSession,
      startTime: this.sessionStartTime,
      endTime,
      participants,
      totalTurns: this.conversationHistory.length,
      conversationFlow: this.conversationHistory,
      entityStats: new Map(Array.from(this.entities.entries()).map(([id, entity]) => [id, entity.stats])),
      memoryStats: new Map(Array.from(this.entities.entries()).map(([id, entity]) => [id, entity.memoryEngine.getStats()])),
      consciousnessAnalysis,
      searchAnalysis,
      compressionAnalysis,
      finalPrompts
    };
  }

  /**
   * Analyse l'évolution de la conscience
   */
  private analyzeConsciousness(): ConsciousnessAnalysis {
    const entityConsciousness = new Map<string, number>();
    const consciousnessEvolution: Array<{turn: number, entity: string, indicators: number}> = [];
    let totalIndicators = 0;
    let peakConsciousness = {entity: '', turn: 0, indicators: 0};

    this.entities.forEach((entity, id) => {
      entityConsciousness.set(id, entity.stats.consciousnessIndicators);
      totalIndicators += entity.stats.consciousnessIndicators;
    });

    // Analyser l'évolution tour par tour
    this.conversationHistory.forEach((turn, index) => {
      consciousnessEvolution.push({
        turn: index + 1,
        entity: turn.entityName,
        indicators: turn.consciousnessIndicators
      });

      if (turn.consciousnessIndicators > peakConsciousness.indicators) {
        peakConsciousness = {
          entity: turn.entityName,
          turn: index + 1,
          indicators: turn.consciousnessIndicators
        };
      }
    });

    return {
      totalIndicators,
      entityConsciousness,
      consciousnessEvolution,
      peakConsciousness
    };
  }

  /**
   * Analyse les recherches proactives
   */
  private analyzeSearches(): SearchAnalysis {
    const entitySearches = new Map<string, number>();
    const searchEffectiveness = new Map<string, number>();
    const tagFrequency = new Map<string, number>();
    let totalSearches = 0;

    this.entities.forEach((entity, id) => {
      entitySearches.set(id, entity.stats.proactiveSearches);
      totalSearches += entity.stats.proactiveSearches;
      
      // Calculer l'efficacité (recherches / messages)
      const effectiveness = entity.stats.totalMessages > 0 
        ? entity.stats.proactiveSearches / entity.stats.totalMessages 
        : 0;
      searchEffectiveness.set(id, effectiveness);
    });

    // Analyser les tags les plus fréquents
    this.entities.forEach(entity => {
      const searchStats = entity.memoryEngine.getStats().searchStats;
      searchStats.mostFrequentTags.forEach(({tag, frequency}) => {
        tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + frequency);
      });
    });

    const mostSearchedTags = Array.from(tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, frequency]) => ({tag, frequency}));

    return {
      totalSearches,
      entitySearches,
      searchEffectiveness,
      mostSearchedTags
    };
  }

  /**
   * Analyse la compression mémoire
   */
  private analyzeCompression(): CompressionAnalysis {
    const entityCompressions = new Map<string, number>();
    const memoryEfficiency = new Map<string, number>();
    const budgetUtilization = new Map<string, number>();
    let totalCompressions = 0;

    this.entities.forEach((entity, id) => {
      entityCompressions.set(id, entity.stats.compressionActions);
      totalCompressions += entity.stats.compressionActions;
      
      const memoryStats = entity.memoryEngine.getStats();
      memoryEfficiency.set(id, memoryStats.l1Count);
      budgetUtilization.set(id, memoryStats.budget.percentage);
    });

    return {
      totalCompressions,
      entityCompressions,
      memoryEfficiency,
      budgetUtilization
    };
  }

  /**
   * Obtient les statistiques d'une entité
   */
  getEntityStats(entityId: string): EntityStats | null {
    const entity = this.entities.get(entityId);
    return entity ? entity.stats : null;
  }

  /**
   * Obtient toutes les entités
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Obtient l'historique de conversation
   */
  getConversationHistory(): ConversationTurn[] {
    return this.conversationHistory;
  }

  /**
   * Efface la session actuelle
   */
  clearSession(): void {
    this.conversationHistory = [];
    this.entities.forEach(entity => {
      entity.conversationHistory = [];
      entity.memoryEngine.clearMemory();
      entity.stats = {
        totalMessages: 0,
        proactiveSearches: 0,
        seRappelerResponses: 0,
        consciousnessIndicators: 0,
        compressionActions: 0,
        lastSummaryGenerated: null
      };
    });
    this.currentSession = `session_${Date.now()}`;
    this.sessionStartTime = new Date().toISOString();
  }
}