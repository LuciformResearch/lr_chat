/**
 * Agent Archiviste - Agent spécialisé dans l'analyse et la mémoire épisodique
 * Peut être interrogé par Algareth pour obtenir des informations sur les conversations passées
 */

import { BaseAgent, AgentMessage, AgentCapabilities } from './AgentCommunication';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ArchivistDatabaseService } from '../database/ArchivistDatabaseService';

export interface ConversationMemory {
  sessionId: string;
  userId: string;
  timestamp: string;
  summary: string;
  keyTopics: string[];
  emotionalTone: string;
  importantFacts: string[];
  userMood: string;
  algarethPerformance: string;
}

export interface UserProfile {
  userId: string;
  userName: string;
  totalSessions: number;
  communicationStyle: string;
  interests: string[];
  relationshipLevel: string;
  trustLevel: number;
  ongoingTopics: string[];
  userGoals: string[];
}

export class ArchivistAgent extends BaseAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private dbService: ArchivistDatabaseService;

  constructor(geminiApiKey: string, dbService: ArchivistDatabaseService) {
    const capabilities: AgentCapabilities = {
      name: 'ArchivistAgent',
      description: 'Agent spécialisé dans l\'analyse et la mémoire épisodique des conversations',
      capabilities: [
        'analyser_conversation',
        'résumer_session',
        'identifier_patterns',
        'évaluer_relation',
        'suggérer_améliorations',
        'rechercher_mémoire',
        'analyser_émotions',
        'tracker_objectifs'
      ],
      responseTime: 'slow', // L'archiviste prend du temps à analyser
      requiresContext: true
    };

    super('ArchivistAgent', capabilities);

    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.dbService = dbService;
    
    console.log('📚 Agent Archiviste initialisé avec base de données:', capabilities.capabilities);
  }

  /**
   * Traite les messages d'Algareth
   */
  async processMessage(message: AgentMessage): Promise<string> {
    const { content, metadata } = message;
    const context = metadata?.context || {};

    console.log(`📚 Archiviste traite: "${content}"`);

    // Analyser le type de demande
    if (content.includes('analyser') && content.includes('conversation')) {
      return await this.analyzeConversation(context);
    }
    
    if (content.includes('résumé') || content.includes('résumer')) {
      return await this.provideSummary(context);
    }
    
    if (content.includes('pattern') || content.includes('tendance')) {
      return await this.identifyPatterns(context);
    }
    
    if (content.includes('relation') || content.includes('confiance')) {
      return await this.evaluateRelationship(context);
    }
    
    if (content.includes('amélioration') || content.includes('suggestion')) {
      return await this.suggestImprovements(context);
    }
    
    if (content.includes('rechercher') || content.includes('mémoire')) {
      return await this.searchMemory(context);
    }
    
    if (content.includes('émotion') || content.includes('humeur')) {
      return await this.analyzeEmotions(context);
    }
    
    if (content.includes('objectif') || content.includes('but')) {
      return await this.trackGoals(context);
    }

    // Demande générale - fournir un aperçu
    return await this.provideGeneralOverview(context);
  }

  /**
   * Analyse une conversation avec l'IA
   */
  private async analyzeConversation(context: any): Promise<string> {
    const { userId, messages, sessionTitle } = context;
    
    if (!messages || messages.length === 0) {
      return "❌ Aucune conversation à analyser. Fournissez des messages.";
    }

    try {
      const conversationText = messages.map((msg: any) => 
        `${msg.role === 'user' ? 'Utilisateur' : 'Algareth'}: ${msg.content}`
      ).join('\n');

      const prompt = `Tu es l'Archiviste d'Algareth. Analyse cette conversation et fournis un rapport détaillé.

CONVERSATION:
${conversationText}

ANALYSE REQUISE:
1. Résumé narratif (2-3 phrases)
2. Topics clés identifiés
3. Ton émotionnel de l'utilisateur
4. Performance d'Algareth
5. Faits importants à retenir
6. Suggestions d'amélioration

RÉPONDS EN JSON:
{
  "summary": "résumé narratif",
  "keyTopics": ["topic1", "topic2"],
  "emotionalTone": "positif/négatif/neutre/mixte",
  "userMood": "description de l'humeur",
  "algarethPerformance": "évaluation de la performance",
  "importantFacts": ["fait1", "fait2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Sauvegarder l'analyse
        this.saveConversationMemory(userId, sessionTitle, analysis);
        
        return `📊 ANALYSE TERMINÉE:

📝 Résumé: ${analysis.summary}
🏷️ Topics: ${analysis.keyTopics.join(', ')}
😊 Humeur: ${analysis.userMood} (${analysis.emotionalTone})
⭐ Performance Algareth: ${analysis.algarethPerformance}
📋 Faits importants: ${analysis.importantFacts.join(', ')}
💡 Suggestions: ${analysis.suggestions.join(', ')}`;
      } else {
        throw new Error('Réponse JSON invalide');
      }
    } catch (error) {
      console.error('❌ Erreur analyse conversation:', error);
      return `❌ Erreur lors de l'analyse: ${error}`;
    }
  }

  /**
   * Fournit un résumé des sessions récentes
   */
  private async provideSummary(context: any): Promise<string> {
    const { userId, limit = 5 } = context;
    const userMemories = await this.dbService.getUserMemories(userId, limit);
    
    if (userMemories.length === 0) {
      return `📚 Aucune mémoire trouvée pour ${userId}`;
    }
    
    let summary = `📚 RÉSUMÉ DES ${userMemories.length} DERNIÈRES SESSIONS:\n\n`;
    
    userMemories.forEach((memory, index) => {
      summary += `${index + 1}. ${memory.sessionId} (${new Date(memory.timestamp).toLocaleDateString()}):\n`;
      summary += `   📝 ${memory.summary}\n`;
      summary += `   🏷️ Topics: ${memory.keyTopics.join(', ')}\n`;
      summary += `   😊 Humeur: ${memory.userMood}\n\n`;
    });

    return summary;
  }

  /**
   * Identifie les patterns et tendances
   */
  private async identifyPatterns(context: any): Promise<string> {
    const { userId } = context;
    const userMemories = await this.dbService.getUserMemories(userId);
    
    if (userMemories.length < 3) {
      return `📊 Pas assez de données pour identifier des patterns (${userMemories.length} sessions)`;
    }

    // Analyser les patterns
    const allTopics = userMemories.flatMap(m => m.keyTopics);
    const topicCounts = allTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    const emotionalTones = userMemories.map(m => m.emotionalTone);
    const positiveCount = emotionalTones.filter(t => t.includes('positif')).length;
    const negativeCount = emotionalTones.filter(t => t.includes('négatif')).length;

    return `📊 PATTERNS IDENTIFIÉS:

🏷️ Topics récurrents:
${topTopics.map(([topic, count]) => `   - ${topic}: ${count} fois`).join('\n')}

😊 Tendances émotionnelles:
   - Positif: ${positiveCount}/${userMemories.length} sessions
   - Négatif: ${negativeCount}/${userMemories.length} sessions

📈 Évolution de la relation:
   - ${userMemories.length} sessions analysées
   - Confiance estimée: ${Math.min(100, userMemories.length * 10)}%`;
  }

  /**
   * Évalue l'état de la relation
   */
  private async evaluateRelationship(context: any): Promise<string> {
    const { userId } = context;
    const userMemories = await this.dbService.getUserMemories(userId);
    const profile = await this.dbService.getUserProfile(userId);
    
    if (userMemories.length === 0) {
      return `🤝 Relation: Nouvelle (0 sessions)`;
    }

    const recentMemories = userMemories.slice(-5);
    const positiveInteractions = recentMemories.filter(m => 
      m.emotionalTone.includes('positif') || m.algarethPerformance.includes('bon')
    ).length;

    const trustLevel = Math.min(100, userMemories.length * 8);
    const comfortLevel = Math.min(100, positiveInteractions * 20);

    let relationshipLevel = 'nouvelle';
    if (userMemories.length >= 20) relationshipLevel = 'confiance profonde';
    else if (userMemories.length >= 15) relationshipLevel = 'amitié établie';
    else if (userMemories.length >= 10) relationshipLevel = 'relation solide';
    else if (userMemories.length >= 5) relationshipLevel = 'connaissance';
    else if (userMemories.length >= 3) relationshipLevel = 'relation naissante';

    return `🤝 ÉTAT DE LA RELATION:

📊 Niveau: ${relationshipLevel}
🔒 Confiance: ${trustLevel}%
😌 Confort: ${comfortLevel}%
📈 Sessions: ${userMemories.length}
✅ Interactions positives récentes: ${positiveInteractions}/5

💡 Recommandations:
${trustLevel > 80 ? '- Relation de confiance établie, personnalisation avancée possible' : ''}
${comfortLevel > 60 ? '- Utilisateur à l\'aise, humour et familiarité appropriés' : ''}
${userMemories.length > 10 ? '- Historique riche, références aux conversations passées possibles' : ''}`;
  }

  /**
   * Suggère des améliorations pour Algareth
   */
  private async suggestImprovements(context: any): Promise<string> {
    const { userId } = context;
    const userMemories = await this.dbService.getUserMemories(userId);
    
    if (userMemories.length === 0) {
      return `💡 Pas assez de données pour des suggestions (0 sessions)`;
    }

    const recentMemories = userMemories.slice(-5);
    const performanceIssues = recentMemories.filter(m => 
      m.algarethPerformance.includes('confus') || 
      m.algarethPerformance.includes('trop court') ||
      m.algarethPerformance.includes('incompréhensible')
    );

    const emotionalIssues = recentMemories.filter(m => 
      m.emotionalTone.includes('négatif') || m.userMood.includes('frustré')
    );

    let suggestions = [];

    if (performanceIssues.length > 0) {
      suggestions.push('🔧 Clarifier les réponses techniques');
    }
    
    if (emotionalIssues.length > 0) {
      suggestions.push('😊 Adapter le ton émotionnel');
    }
    
    if (recentMemories.some(m => m.keyTopics.includes('personnel'))) {
      suggestions.push('🤝 Approche plus personnelle appropriée');
    }
    
    if (recentMemories.some(m => m.keyTopics.includes('technique'))) {
      suggestions.push('⚙️ Approche technique détaillée');
    }

    if (suggestions.length === 0) {
      suggestions.push('✅ Performance actuelle satisfaisante');
    }

    return `💡 SUGGESTIONS D'AMÉLIORATION:

${suggestions.map(s => `   ${s}`).join('\n')}

📊 Basé sur l'analyse de ${userMemories.length} sessions
🎯 Focus sur les 5 dernières interactions`;
  }

  /**
   * Recherche dans la mémoire
   */
  private async searchMemory(context: any): Promise<string> {
    const { userId, query } = context;
    const relevantMemories = await this.dbService.searchUserMemories(userId, query);
    
    if (relevantMemories.length === 0) {
      return `🔍 Aucun résultat trouvé pour "${query}"`;
    }

    let result = `🔍 RÉSULTATS POUR "${query}":\n\n`;
    
    relevantMemories.forEach((memory, index) => {
      result += `${index + 1}. ${memory.sessionId}:\n`;
      result += `   📝 ${memory.summary}\n`;
      result += `   🏷️ ${memory.keyTopics.join(', ')}\n`;
      if (memory.importantFacts.length > 0) {
        result += `   📋 Faits: ${memory.importantFacts.join(', ')}\n`;
      }
      result += '\n';
    });

    return result;
  }

  /**
   * Analyse les émotions
   */
  private async analyzeEmotions(context: any): Promise<string> {
    const { userId } = context;
    const userMemories = await this.dbService.getUserMemories(userId);
    
    if (userMemories.length === 0) {
      return `😊 Aucune donnée émotionnelle pour ${userId}`;
    }

    const recentMemories = userMemories.slice(-10);
    const emotionalTones = recentMemories.map(m => m.emotionalTone);
    const userMoods = recentMemories.map(m => m.userMood);

    const positiveCount = emotionalTones.filter(t => t.includes('positif')).length;
    const negativeCount = emotionalTones.filter(t => t.includes('négatif')).length;
    const neutralCount = emotionalTones.filter(t => t.includes('neutre')).length;

    const dominantMood = userMoods.reduce((acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topMood = Object.entries(dominantMood)
      .sort(([,a], [,b]) => b - a)[0];

    return `😊 ANALYSE ÉMOTIONNELLE:

📊 Répartition des tons:
   - Positif: ${positiveCount}/${recentMemories.length} (${Math.round(positiveCount/recentMemories.length*100)}%)
   - Négatif: ${negativeCount}/${recentMemories.length} (${Math.round(negativeCount/recentMemories.length*100)}%)
   - Neutre: ${neutralCount}/${recentMemories.length} (${Math.round(neutralCount/recentMemories.length*100)}%)

🎭 Humeur dominante: ${topMood ? topMood[0] : 'indéterminée'}

💡 Recommandations:
${positiveCount > negativeCount ? '- Maintenir l\'approche positive actuelle' : ''}
${negativeCount > positiveCount ? '- Adapter le ton pour améliorer l\'humeur' : ''}
${neutralCount > positiveCount + negativeCount ? '- Ajouter plus d\'émotion dans les interactions' : ''}`;
  }

  /**
   * Suit les objectifs de l'utilisateur
   */
  private async trackGoals(context: any): Promise<string> {
    const { userId } = context;
    const userMemories = await this.dbService.getUserMemories(userId);
    
    if (userMemories.length === 0) {
      return `🎯 Aucun objectif identifié pour ${userId}`;
    }

    const allFacts = userMemories.flatMap(m => m.importantFacts);
    const goalKeywords = ['objectif', 'but', 'veut', 'souhaite', 'projet', 'plan'];
    
    const goals = allFacts.filter(fact => 
      goalKeywords.some(keyword => fact.toLowerCase().includes(keyword))
    );

    if (goals.length === 0) {
      return `🎯 Aucun objectif explicite identifié dans les conversations`;
    }

    return `🎯 OBJECTIFS IDENTIFIÉS:

${goals.map((goal, index) => `${index + 1}. ${goal}`).join('\n')}

💡 Suggestions:
- Référencer ces objectifs dans les conversations futures
- Proposer de l'aide spécifique pour ces buts
- Suivre les progrès mentionnés`;
  }

  /**
   * Fournit un aperçu général
   */
  private async provideGeneralOverview(context: any): Promise<string> {
    const { userId } = context;
    const userMemories = await this.dbService.getUserMemories(userId);
    
    if (userMemories.length === 0) {
      return `📚 Aucune mémoire disponible pour ${userId}`;
    }

    const totalSessions = userMemories.length;
    const recentSessions = userMemories.slice(-3);
    const allTopics = userMemories.flatMap(m => m.keyTopics);
    const uniqueTopics = [...new Set(allTopics)];

    return `📚 APERÇU GÉNÉRAL:

📊 Statistiques:
   - Sessions totales: ${totalSessions}
   - Topics uniques: ${uniqueTopics.length}
   - Dernière session: ${recentSessions[recentSessions.length - 1]?.sessionId || 'N/A'}

🏷️ Topics principaux: ${uniqueTopics.slice(0, 5).join(', ')}

💡 Capacités disponibles:
   - analyser_conversation
   - résumer_session  
   - identifier_patterns
   - évaluer_relation
   - suggérer_améliorations
   - rechercher_mémoire
   - analyser_émotions
   - tracker_objectifs

📝 Demandez-moi spécifiquement ce que vous voulez savoir !`;
  }

  /**
   * Sauvegarde une mémoire de conversation
   */
  private async saveConversationMemory(userId: string, sessionTitle: string, analysis: any): Promise<void> {
    const memory: ConversationMemory = {
      sessionId: sessionTitle,
      userId,
      timestamp: new Date().toISOString(),
      summary: analysis.summary,
      keyTopics: analysis.keyTopics,
      emotionalTone: analysis.emotionalTone,
      importantFacts: analysis.importantFacts,
      userMood: analysis.userMood,
      algarethPerformance: analysis.algarethPerformance
    };

    await this.dbService.saveConversationMemory(memory);
    console.log(`💾 Mémoire sauvegardée pour ${userId}: ${sessionTitle}`);
  }


  /**
   * Obtient les statistiques de l'archiviste
   */
  async getStats(): Promise<{
    totalUsers: number;
    totalMemories: number;
    averageMemoriesPerUser: number;
    recentActivity: {
      lastWeek: number;
      lastMonth: number;
    };
  }> {
    return await this.dbService.getArchivistStats();
  }

  /**
   * Génère un résumé secret pour l'utilisateur (méthode manquante)
   */
  async getSecretSummary(userId: string, query: string): Promise<string> {
    try {
      const memories = await this.dbService.getUserMemories(userId);
      const profile = await this.dbService.getUserProfile(userId);
      
      if (memories.length === 0) {
        return `Aucune mémoire trouvée pour ${userId}`;
      }

      const recentMemories = memories.slice(-5);
      const allTopics = memories.flatMap(m => m.keyTopics);
      const uniqueTopics = [...new Set(allTopics)];
      
      let summary = `RÉSUMÉ SECRET POUR ${userId}:\n\n`;
      
      if (profile) {
        summary += `PROFIL UTILISATEUR:\n`;
        summary += `- Nom: ${profile.userName}\n`;
        summary += `- Sessions totales: ${profile.totalSessions}\n`;
        summary += `- Style de communication: ${profile.communicationStyle}\n`;
        summary += `- Niveau de relation: ${profile.relationshipLevel}\n`;
        summary += `- Confiance: ${profile.trustLevel}%\n\n`;
      }
      
      summary += `CONVERSATIONS RÉCENTES:\n`;
      recentMemories.forEach((memory, index) => {
        summary += `${index + 1}. ${memory.sessionId}: ${memory.summary}\n`;
      });
      
      summary += `\nFAITS IMPORTANTS:\n`;
      const allFacts = memories.flatMap(m => m.importantFacts);
      const uniqueFacts = [...new Set(allFacts)];
      uniqueFacts.slice(0, 10).forEach((fact, index) => {
        summary += `${index + 1}. ${fact}\n`;
      });
      
      summary += `\nSUGGESTIONS POUR ALGARETH:\n`;
      summary += `- Topics récurrents: ${uniqueTopics.slice(0, 5).join(', ')}\n`;
      summary += `- Humeur générale: ${memories[memories.length - 1]?.userMood || 'neutre'}\n`;
      summary += `- Performance récente: ${memories[memories.length - 1]?.algarethPerformance || 'standard'}\n`;
      
      return summary;
    } catch (error) {
      console.error('❌ Erreur génération résumé secret:', error);
      return `Erreur lors de la génération du résumé secret pour ${userId}`;
    }
  }

  /**
   * Exporte les données de l'archiviste (méthode manquante)
   */
  async exportArchivistData(): Promise<any> {
    try {
      const stats = await this.dbService.getArchivistStats();
      
      // Récupérer tous les utilisateurs avec leurs données
      const allUsers = await this.dbService.getArchivistStats();
      
      return {
        metadata: {
          exportDate: new Date().toISOString(),
          totalUsers: stats.totalUsers,
          totalMemories: stats.totalMemories,
          averageMemoriesPerUser: stats.averageMemoriesPerUser
        },
        stats,
        note: 'Données complètes disponibles via ArchivistDatabaseService'
      };
    } catch (error) {
      console.error('❌ Erreur export données archiviste:', error);
      return {
        error: 'Erreur lors de l\'export des données archiviste',
        timestamp: new Date().toISOString()
      };
    }
  }
}