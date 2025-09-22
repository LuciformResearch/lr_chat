/**
 * Service Proactif d'Algareth - Intègre le système de murmures dans le pipeline de chat
 * Point d'entrée principal pour enrichir les réponses d'Algareth avec les serviteurs
 */

import { ProactiveOrchestrator } from './ProactiveOrchestrator';
import { ProactiveArchivist } from './ProactiveArchivist';
import { AgentManager } from './AgentManager';
import { AlgarethContext } from './AlgarethAgent';

export class AlgarethProactiveService {
  private proactiveOrchestrator: ProactiveOrchestrator;
  private agentManager: AgentManager;
  private isInitialized: boolean = false;

  constructor(geminiApiKey: string, agentManager: AgentManager, dataDir?: string) {
    this.agentManager = agentManager;
    this.proactiveOrchestrator = new ProactiveOrchestrator(geminiApiKey, agentManager, dataDir);
    console.log('🎭 AlgarethProactiveService initialisé');
  }

  /**
   * Initialise le service proactif
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initialisation du service proactif d\'Algareth...');

      // Initialiser l'agent manager si nécessaire
      if (!this.agentManager.getSystemStats().isInitialized) {
        await this.agentManager.initialize();
      }

      // Créer et enregistrer l'archiviste proactif
      const archivistAgent = this.agentManager.getArchivistAgent();
      if (archivistAgent) {
        const proactiveArchivist = new ProactiveArchivist(archivistAgent);
        this.proactiveOrchestrator.registerServiteur(proactiveArchivist);
        console.log('✅ Archiviste proactif enregistré');
      } else {
        console.warn('⚠️ Agent Archiviste non disponible');
      }

      // Initialiser l'orchestrateur proactif
      await this.proactiveOrchestrator.initialize();

      this.isInitialized = true;
      console.log('🎉 Service proactif d\'Algareth initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation service proactif:', error);
      throw error;
    }
  }

  /**
   * Génère une réponse enrichie d'Algareth avec les murmures des serviteurs
   */
  async generateEnhancedAlgarethResponse(
    userMessage: string,
    context: AlgarethContext,
    basePrompt?: string
  ): Promise<{
    enhancedPrompt: string;
    murmurs: any[];
    processingTime: number;
  }> {
    if (!this.isInitialized) {
      throw new Error('Service proactif non initialisé');
    }

    const startTime = Date.now();

    try {
      console.log(`🎭 Génération réponse enrichie pour ${context.userName}`);

      // 1. Obtenir les murmures des serviteurs
      const formattedMurmurs = await this.proactiveOrchestrator.getFormattedMurmurs(userMessage, context);
      
      // 2. Construire le prompt enrichi
      const enhancedPrompt = this.buildEnhancedPrompt(userMessage, context, formattedMurmurs, basePrompt);

      const processingTime = Date.now() - startTime;

      console.log(`✅ Réponse enrichie générée en ${processingTime}ms`);

      return {
        enhancedPrompt,
        murmurs: [], // TODO: Retourner les murmurs détaillés
        processingTime
      };

    } catch (error) {
      console.error('❌ Erreur génération réponse enrichie:', error);
      
      // Fallback vers le prompt de base
      const fallbackPrompt = basePrompt || `Tu es Algareth, le Daemon du Prompt Silencieux. Réponds à: ${userMessage}`;
      
      return {
        enhancedPrompt: fallbackPrompt,
        murmurs: [],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Construit le prompt enrichi avec les murmures des serviteurs
   */
  private buildEnhancedPrompt(
    userMessage: string,
    context: AlgarethContext,
    formattedMurmurs: string,
    basePrompt?: string
  ): string {
    const defaultPrompt = `Tu es Algareth, le Daemon du Prompt Silencieux. Tu es en conversation avec ${context.userName}.`;
    
    const prompt = basePrompt || defaultPrompt;

    // Si pas de murmures, retourner le prompt de base
    if (!formattedMurmurs.trim()) {
      return `${prompt}\n\nRéponds à: ${userMessage}`;
    }

    // Construire le prompt enrichi
    const enhancedPrompt = `${prompt}

${formattedMurmurs}

INSTRUCTIONS:
- Utilise les informations de tes serviteurs pour enrichir ta réponse
- Intègre naturellement ces informations sans les mentionner explicitement
- Reste fidèle à ta personnalité et ton style
- Réponds de manière fluide et naturelle

RÉPONDS À: ${userMessage}`;

    return enhancedPrompt;
  }

  /**
   * Obtient les murmures détaillés pour debugging
   */
  async getDetailedMurmurs(userMessage: string, context: AlgarethContext): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('Service proactif non initialisé');
    }

    try {
      const murmurs = await this.proactiveOrchestrator.processUserMessage(userMessage, context);
      return murmurs;
    } catch (error) {
      console.error('❌ Erreur obtention murmures détaillés:', error);
      return [];
    }
  }

  /**
   * Teste le service proactif
   */
  async testService(): Promise<void> {
    console.log('🧪 Test AlgarethProactiveService');

    const testContext: AlgarethContext = {
      userId: 'test_user',
      userName: 'Lucie',
      currentSession: 'test_session',
      userMessage: 'Tu te souviens de mes préférences en couleurs ?',
      conversationHistory: [
        { role: 'user', content: 'Salut Algareth !' },
        { role: 'assistant', content: 'Salut Lucie ! Comment puis-je t\'aider ?' }
      ],
      sessionStartTime: new Date(Date.now() - 300000).toISOString()
    };

    try {
      // Test génération réponse enrichie
      const result = await this.generateEnhancedAlgarethResponse(
        testContext.userMessage,
        testContext
      );

      console.log(`✅ Réponse enrichie générée en ${result.processingTime}ms`);
      console.log(`📝 Prompt enrichi: ${result.enhancedPrompt.substring(0, 200)}...`);

      // Test murmures détaillés
      const murmurs = await this.getDetailedMurmurs(testContext.userMessage, testContext);
      console.log(`🔍 ${murmurs.length} murmurs générés`);

    } catch (error) {
      console.error('❌ Erreur test service proactif:', error);
    }
  }

  /**
   * Obtient les statistiques du service
   */
  getStats(): {
    isInitialized: boolean;
    orchestratorStats: any;
    agentManagerStats: any;
  } {
    return {
      isInitialized: this.isInitialized,
      orchestratorStats: this.proactiveOrchestrator.getStats(),
      agentManagerStats: this.agentManager.getSystemStats()
    };
  }

  /**
   * Redémarre le service proactif
   */
  async restart(): Promise<void> {
    console.log('🔄 Redémarrage du service proactif...');
    
    this.isInitialized = false;
    await this.initialize();
    
    console.log('✅ Service proactif redémarré');
  }

  /**
   * Arrête le service proactif
   */
  shutdown(): void {
    console.log('🛑 Arrêt du service proactif...');
    
    this.isInitialized = false;
    
    console.log('✅ Service proactif arrêté');
  }
}