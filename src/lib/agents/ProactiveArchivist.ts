/**
 * Archiviste Proactif - Extension de l'ArchivistAgent pour les murmures proactifs
 * Prépare des murmures intelligents basés sur la mémoire épisodique
 */

import { ArchivistAgent } from './ArchivistAgent';
import { ServiteurAgent, ServiteurMurmur, ArchivistInformations } from './ServiteurMurmur';
import { ServiteurSuggestion } from './PertinenceAnalyzer';
import { AlgarethContext } from './AlgarethAgent';

export class ProactiveArchivist extends ServiteurAgent {
  private archivistAgent: ArchivistAgent;

  constructor(archivistAgent: ArchivistAgent) {
    super('archivist', 'Agent Archiviste - Mémoire épisodique et analyse des conversations');
    this.archivistAgent = archivistAgent;
    console.log('📚 ProactiveArchivist initialisé');
  }

  /**
   * Prépare un murmure pour Algareth basé sur la mémoire épisodique
   */
  async prepareMurmur(
    userMessage: string, 
    context: AlgarethContext, 
    suggestion: ServiteurSuggestion
  ): Promise<ServiteurMurmur> {
    const startTime = Date.now();
    
    try {
      console.log(`📚 Préparation murmur archiviste pour ${context.userName}`);

      // 1. Récupérer les informations pertinentes
      const informations = await this.gatherRelevantInformations(userMessage, context);

      // 2. Générer le message du murmure
      const murmurMessage = this.generateMurmurMessage(context.userName, informations, suggestion);

      // 3. Déterminer l'urgence basée sur le contexte
      const urgence = this.determineUrgency(informations, suggestion);

      const processingTime = Date.now() - startTime;

      return {
        serviteur: 'archivist',
        message: murmurMessage,
        informations,
        urgence,
        discret: true,
        timestamp: new Date().toISOString(),
        processingTime
      };

    } catch (error) {
      console.error('❌ Erreur préparation murmur archiviste:', error);
      
      // Fallback en cas d'erreur
      return {
        serviteur: 'archivist',
        message: `Salut Algareth, je suis l'archiviste. Je n'ai pas pu récupérer d'informations spécifiques sur cette question de ${context.userName}, mais je suis là si tu as besoin d'aide.`,
        informations: {},
        urgence: 'faible',
        discret: true,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Rassemble les informations pertinentes pour le murmure
   */
  private async gatherRelevantInformations(userMessage: string, context: AlgarethContext): Promise<ArchivistInformations> {
    try {
      // Utiliser les méthodes existantes de l'ArchivistAgent
      const memories = await this.searchRelevantMemories(userMessage, context.userId);
      const relationship = await this.getRelationshipContext(context.userId);
      const emotions = await this.getEmotionalContext(context.userId);
      const personality = await this.getPersonalityContext(context.userId);

      return {
        memories,
        relationship,
        emotions,
        personality
      };
    } catch (error) {
      console.error('❌ Erreur rassemblement informations:', error);
      return {
        memories: [],
        relationship: {
          level: 'stranger',
          trustLevel: 0,
          comfortLevel: 0,
          evolution: 'relation naissante'
        },
        emotions: {
          patterns: [],
          currentMood: 'neutre'
        },
        personality: {
          communicationStyle: 'conversationnel',
          interests: [],
          preferences: []
        }
      };
    }
  }

  /**
   * Recherche des mémoires pertinentes
   */
  private async searchRelevantMemories(userMessage: string, userId: string): Promise<any[]> {
    try {
      // Utiliser la méthode existante de l'ArchivistAgent
      const secretSummary = await this.archivistAgent.getSecretSummary(userId, userMessage);
      
      // Parser les mémoires du résumé secret
      const memories = this.parseMemoriesFromSummary(secretSummary);
      return memories;
    } catch (error) {
      console.error('❌ Erreur recherche mémoires:', error);
      return [];
    }
  }

  /**
   * Parse les mémoires depuis le résumé secret
   */
  private parseMemoriesFromSummary(secretSummary: string): any[] {
    const memories = [];
    
    // Extraire les conversations récentes
    const recentConversationsMatch = secretSummary.match(/CONVERSATIONS RÉCENTES:([\s\S]*?)FAITS IMPORTANTS:/);
    if (recentConversationsMatch) {
      const conversations = recentConversationsMatch[1].trim().split('\n');
      conversations.forEach(conv => {
        if (conv.trim()) {
          memories.push({
            type: 'conversation',
            summary: conv.trim(),
            relevance: 'high'
          });
        }
      });
    }

    // Extraire les faits importants
    const importantFactsMatch = secretSummary.match(/FAITS IMPORTANTS:([\s\S]*?)SUGGESTIONS POUR ALGARETH:/);
    if (importantFactsMatch) {
      const facts = importantFactsMatch[1].trim().split('\n');
      facts.forEach(fact => {
        if (fact.trim()) {
          memories.push({
            type: 'fact',
            summary: fact.trim(),
            relevance: 'high'
          });
        }
      });
    }

    return memories;
  }

  /**
   * Obtient le contexte de relation
   */
  private async getRelationshipContext(userId: string): Promise<any> {
    try {
      // Utiliser les données existantes de l'ArchivistAgent
      const archivistData = this.archivistAgent.exportArchivistData();
      const userAnalysis = archivistData.analyses.find(([id]) => id === userId);
      
      if (userAnalysis && userAnalysis[1]) {
        return userAnalysis[1].relationshipStatus;
      }
      
      return {
        level: 'stranger',
        trustLevel: 0,
        comfortLevel: 0,
        evolution: 'relation naissante'
      };
    } catch (error) {
      console.error('❌ Erreur contexte relation:', error);
      return {
        level: 'stranger',
        trustLevel: 0,
        comfortLevel: 0,
        evolution: 'relation naissante'
      };
    }
  }

  /**
   * Obtient le contexte émotionnel
   */
  private async getEmotionalContext(userId: string): Promise<any> {
    try {
      const archivistData = this.archivistAgent.exportArchivistData();
      const userAnalysis = archivistData.analyses.find(([id]) => id === userId);
      
      if (userAnalysis && userAnalysis[1]) {
        return {
          patterns: userAnalysis[1].personalityProfile.emotionalPatterns,
          currentMood: 'neutre' // TODO: Déterminer l'humeur actuelle
        };
      }
      
      return {
        patterns: [],
        currentMood: 'neutre'
      };
    } catch (error) {
      console.error('❌ Erreur contexte émotionnel:', error);
      return {
        patterns: [],
        currentMood: 'neutre'
      };
    }
  }

  /**
   * Obtient le contexte de personnalité
   */
  private async getPersonalityContext(userId: string): Promise<any> {
    try {
      const archivistData = this.archivistAgent.exportArchivistData();
      const userAnalysis = archivistData.analyses.find(([id]) => id === userId);
      
      if (userAnalysis && userAnalysis[1]) {
        return {
          communicationStyle: userAnalysis[1].personalityProfile.communicationStyle,
          interests: userAnalysis[1].personalityProfile.interests,
          preferences: userAnalysis[1].personalityProfile.preferences
        };
      }
      
      return {
        communicationStyle: 'conversationnel',
        interests: [],
        preferences: []
      };
    } catch (error) {
      console.error('❌ Erreur contexte personnalité:', error);
      return {
        communicationStyle: 'conversationnel',
        interests: [],
        preferences: []
      };
    }
  }

  /**
   * Génère le message du murmure
   */
  protected generateMurmurMessage(
    userName: string, 
    informations: ArchivistInformations, 
    suggestion: ServiteurSuggestion
  ): string {
    const { memories, relationship, emotions, personality } = informations;

    // Si pas de mémoires pertinentes
    if (memories.length === 0) {
      return `Salut Algareth, je suis l'archiviste. Je n'ai pas d'informations spécifiques sur cette question de ${userName}, mais je peux te rappeler que votre relation est de niveau ${relationship.level} (confiance: ${relationship.trustLevel}%). Peut-être pourra-t-elle t'aider à mieux répondre ?`;
    }

    // Construire le message avec les mémoires pertinentes
    let message = `Salut Algareth, je suis l'archiviste. J'ai récolté quelques informations sur la question de ${userName} qui pourraient t'être utiles :\n\n`;

    // Ajouter les mémoires pertinentes
    if (memories.length > 0) {
      message += `📚 **Mémoires pertinentes :**\n`;
      memories.slice(0, 3).forEach((memory, index) => {
        message += `${index + 1}. ${memory.summary}\n`;
      });
      message += `\n`;
    }

    // Ajouter le contexte de relation
    message += `🤝 **Relation :** ${relationship.level} (confiance: ${relationship.trustLevel}%, confort: ${relationship.comfortLevel}%)\n`;

    // Ajouter les patterns émotionnels
    if (emotions.patterns.length > 0) {
      message += `😊 **Patterns émotionnels :** ${emotions.patterns.join(', ')}\n`;
    }

    // Ajouter le style de communication
    if (personality.communicationStyle) {
      message += `💬 **Style de communication :** ${personality.communicationStyle}\n`;
    }

    message += `\nPeut-être pourront-elles t'aider à mieux répondre ?`;

    return message;
  }

  /**
   * Détermine l'urgence du murmure
   */
  private determineUrgency(informations: ArchivistInformations, suggestion: ServiteurSuggestion): 'faible' | 'moyenne' | 'élevée' {
    // Urgence basée sur la pertinence et le contexte
    if (suggestion.pertinence > 0.8 && informations.memories.length > 0) {
      return 'élevée';
    } else if (suggestion.pertinence > 0.6) {
      return 'moyenne';
    } else {
      return 'faible';
    }
  }

  /**
   * Teste l'archiviste proactif
   */
  async testProactiveArchivist(): Promise<void> {
    console.log('🧪 Test ProactiveArchivist');
    
    const testContext: AlgarethContext = {
      userId: 'test_user',
      userName: 'Test User',
      currentSession: 'test_session',
      userMessage: 'Tu te souviens de mes préférences ?',
      conversationHistory: [],
      sessionStartTime: new Date().toISOString()
    };

    const testSuggestion: ServiteurSuggestion = {
      serviteur: 'archivist',
      pertinence: 0.9,
      raison: 'Question sur les préférences passées',
      urgence: 'élevée'
    };

    try {
      const murmur = await this.prepareMurmur(testContext.userMessage, testContext, testSuggestion);
      console.log(`✅ Murmur généré: ${murmur.message.substring(0, 100)}...`);
      console.log(`⏱️ Temps de traitement: ${murmur.processingTime}ms`);
    } catch (error) {
      console.error('❌ Erreur test archiviste proactif:', error);
    }
  }
}