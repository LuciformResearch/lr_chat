/**
 * Agent Archiviste - Mémoire épisodique pour Algareth
 * Travaille en arrière-plan pour analyser et résumer les conversations
 * Permet à Algareth de "se souvenir" sans que l'utilisateur le voie
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ConversationEpisode {
  id: string;
  sessionId: string;
  sessionTitle: string;
  timestamp: string;
  messageCount: number;
  duration: number; // en minutes
  summary: string;
  keyTopics: string[];
  emotionalTone: 'positive' | 'neutral' | 'negative' | 'mixed';
  userMood: string;
  algarethPerformance: string;
  insights: string[];
  importantFacts: string[];
  followUpSuggestions: string[];
  relationshipEvolution: string;
}

export interface ArchivistAnalysis {
  userId: string;
  recentEpisodes: ConversationEpisode[];
  personalityProfile: {
    communicationStyle: string;
    interests: string[];
    preferences: string[];
    emotionalPatterns: string[];
    learningStyle: string;
  };
  relationshipStatus: {
    level: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'confidant';
    trustLevel: number; // 0-100
    comfortLevel: number; // 0-100
    evolution: string;
  };
  ongoingNarratives: string[];
  userGoals: string[];
  algarethImprovements: string[];
}

export class ArchivistAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private episodes: Map<string, ConversationEpisode[]> = new Map();
  private analyses: Map<string, ArchivistAnalysis> = new Map();
  private storageKey = 'lr_tchatagent_archivist_data';

  constructor(geminiApiKey: string) {
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.loadArchivistData();
    console.log('📚 Agent Archiviste initialisé');
  }

  /**
   * Charge les données de l'archiviste depuis localStorage
   */
  private loadArchivistData(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.episodes = new Map(parsed.episodes || []);
        this.analyses = new Map(parsed.analyses || []);
        console.log(`📚 Données archiviste chargées: ${this.episodes.size} utilisateurs`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement données archiviste:', error);
    }
  }

  /**
   * Sauvegarde les données de l'archiviste
   */
  private saveArchivistData(): void {
    try {
      const data = {
        episodes: Array.from(this.episodes.entries()),
        analyses: Array.from(this.analyses.entries())
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      console.log('📚 Données archiviste sauvegardées');
    } catch (error) {
      console.error('❌ Erreur sauvegarde données archiviste:', error);
    }
  }

  /**
   * Archive une conversation (appelé automatiquement après chaque session)
   */
  async archiveConversation(
    userId: string,
    sessionId: string,
    sessionTitle: string,
    messages: Array<{ role: string; content: string; timestamp: string }>,
    startTime: string,
    endTime: string
  ): Promise<void> {
    try {
      console.log(`📚 Archivage de la conversation ${sessionId} pour ${userId}...`);

      // Calculer la durée
      const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60);

      // Analyser la conversation avec l'IA
      const analysis = await this.analyzeConversationWithAI(messages, userId, sessionTitle);

      // Créer l'épisode
      const episode: ConversationEpisode = {
        id: `episode_${Date.now()}`,
        sessionId,
        sessionTitle,
        timestamp: endTime,
        messageCount: messages.length,
        duration: Math.round(duration),
        summary: analysis.summary,
        keyTopics: analysis.keyTopics,
        emotionalTone: analysis.emotionalTone,
        userMood: analysis.userMood,
        algarethPerformance: analysis.algarethPerformance,
        insights: analysis.insights,
        importantFacts: analysis.importantFacts,
        followUpSuggestions: analysis.followUpSuggestions,
        relationshipEvolution: analysis.relationshipEvolution
      };

      // Ajouter à la collection d'épisodes
      if (!this.episodes.has(userId)) {
        this.episodes.set(userId, []);
      }
      this.episodes.get(userId)!.push(episode);

      // Garder seulement les 20 derniers épisodes
      const userEpisodes = this.episodes.get(userId)!;
      if (userEpisodes.length > 20) {
        this.episodes.set(userId, userEpisodes.slice(-20));
      }

      // Mettre à jour l'analyse globale
      await this.updateGlobalAnalysis(userId);

      // Sauvegarder
      this.saveArchivistData();

      console.log(`✅ Conversation archivée: ${episode.summary.substring(0, 100)}...`);
    } catch (error) {
      console.error('❌ Erreur archivage conversation:', error);
    }
  }

  /**
   * Analyse une conversation avec l'IA
   */
  private async analyzeConversationWithAI(
    messages: Array<{ role: string; content: string; timestamp: string }>,
    userId: string,
    sessionTitle: string
  ): Promise<any> {
    const conversationText = messages.map(msg => 
      `${msg.role === 'user' ? 'Utilisateur' : 'Algareth'}: ${msg.content}`
    ).join('\n');

    const prompt = `Tu es l'Archiviste d'Algareth, un agent IA qui analyse secrètement les conversations pour aider Algareth à mieux comprendre ses utilisateurs.

CONVERSATION À ANALYSER:
${conversationText}

TÂCHE: Analyse cette conversation et fournis un rapport détaillé pour Algareth.

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte:
{
  "summary": "Résumé narratif de la conversation (2-3 phrases)",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "emotionalTone": "positive|neutral|negative|mixed",
  "userMood": "Description de l'état d'esprit de l'utilisateur",
  "algarethPerformance": "Comment Algareth a-t-il performé dans cette conversation",
  "insights": ["insight1", "insight2", "insight3"],
  "importantFacts": ["fait1", "fait2", "fait3"],
  "followUpSuggestions": ["suggestion1", "suggestion2"],
  "relationshipEvolution": "Comment la relation a-t-elle évolué dans cette conversation"
}

IMPORTANT: 
- Sois objectif et analytique
- Identifie les patterns émotionnels
- Note les sujets récurrents
- Évalue la qualité de l'interaction
- Propose des améliorations pour Algareth`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      // Nettoyer la réponse JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Réponse JSON invalide');
      }
    } catch (error) {
      console.error('❌ Erreur analyse IA:', error);
      // Fallback en cas d'erreur
      return {
        summary: `Conversation avec ${userId} sur ${sessionTitle}`,
        keyTopics: ['conversation'],
        emotionalTone: 'neutral',
        userMood: 'neutre',
        algarethPerformance: 'performance standard',
        insights: ['conversation normale'],
        importantFacts: [],
        followUpSuggestions: ['continuer l\'échange'],
        relationshipEvolution: 'relation stable'
      };
    }
  }

  /**
   * Met à jour l'analyse globale d'un utilisateur
   */
  private async updateGlobalAnalysis(userId: string): Promise<void> {
    const userEpisodes = this.episodes.get(userId) || [];
    if (userEpisodes.length === 0) return;

    try {
      // Analyser les patterns globaux
      const globalAnalysis = await this.analyzeGlobalPatterns(userId, userEpisodes);
      
      this.analyses.set(userId, globalAnalysis);
      console.log(`📊 Analyse globale mise à jour pour ${userId}`);
    } catch (error) {
      console.error('❌ Erreur analyse globale:', error);
    }
  }

  /**
   * Analyse les patterns globaux d'un utilisateur
   */
  private async analyzeGlobalPatterns(userId: string, episodes: ConversationEpisode[]): Promise<ArchivistAnalysis> {
    const recentEpisodes = episodes.slice(-10); // 10 derniers épisodes
    
    const allTopics = recentEpisodes.flatMap(ep => ep.keyTopics);
    const allInsights = recentEpisodes.flatMap(ep => ep.insights);
    const allFacts = recentEpisodes.flatMap(ep => ep.importantFacts);
    
    // Analyser les patterns
    const topicCounts = allTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    // Déterminer le niveau de relation
    let relationshipLevel: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'confidant' = 'stranger';
    if (episodes.length >= 20) relationshipLevel = 'confidant';
    else if (episodes.length >= 15) relationshipLevel = 'close_friend';
    else if (episodes.length >= 10) relationshipLevel = 'friend';
    else if (episodes.length >= 5) relationshipLevel = 'acquaintance';

    // Calculer les niveaux de confiance et confort
    const trustLevel = Math.min(100, episodes.length * 5);
    const comfortLevel = Math.min(100, episodes.length * 4);

    return {
      userId,
      recentEpisodes,
      personalityProfile: {
        communicationStyle: this.determineCommunicationStyle(recentEpisodes),
        interests: topTopics,
        preferences: this.extractPreferences(recentEpisodes),
        emotionalPatterns: this.analyzeEmotionalPatterns(recentEpisodes),
        learningStyle: this.determineLearningStyle(recentEpisodes)
      },
      relationshipStatus: {
        level: relationshipLevel,
        trustLevel,
        comfortLevel,
        evolution: this.describeRelationshipEvolution(episodes)
      },
      ongoingNarratives: this.extractOngoingNarratives(recentEpisodes),
      userGoals: this.extractUserGoals(allFacts),
      algarethImprovements: this.generateImprovementSuggestions(recentEpisodes)
    };
  }

  /**
   * Méthodes d'analyse (simplifiées pour l'exemple)
   */
  private determineCommunicationStyle(episodes: ConversationEpisode[]): string {
    const tones = episodes.map(ep => ep.emotionalTone);
    const positiveCount = tones.filter(t => t === 'positive').length;
    const technicalTopics = episodes.some(ep => 
      ep.keyTopics.some(topic => 
        ['code', 'programmation', 'technique'].some(tech => topic.includes(tech))
      )
    );
    
    if (positiveCount > episodes.length / 2) {
      return technicalTopics ? 'enthousiaste-technique' : 'enthousiaste';
    } else if (technicalTopics) {
      return 'analytique';
    } else {
      return 'conversationnel';
    }
  }

  private extractPreferences(episodes: ConversationEpisode[]): string[] {
    const allTopics = episodes.flatMap(ep => ep.keyTopics);
    const preferences = allTopics.filter(topic => 
      ['préfère', 'aime', 'n\'aime pas', 'déteste'].some(word => 
        episodes.some(ep => ep.summary.toLowerCase().includes(word))
      )
    );
    return [...new Set(preferences)].slice(0, 5);
  }

  private analyzeEmotionalPatterns(episodes: ConversationEpisode[]): string[] {
    const patterns = [];
    const tones = episodes.map(ep => ep.emotionalTone);
    
    if (tones.filter(t => t === 'positive').length > episodes.length * 0.7) {
      patterns.push('généralement positif');
    }
    if (tones.filter(t => t === 'negative').length > episodes.length * 0.3) {
      patterns.push('tendances négatives');
    }
    if (tones.includes('mixed')) {
      patterns.push('émotions complexes');
    }
    
    return patterns;
  }

  private determineLearningStyle(episodes: ConversationEpisode[]): string {
    const summaries = episodes.map(ep => ep.summary).join(' ').toLowerCase();
    
    if (summaries.includes('exemple') || summaries.includes('démonstration')) {
      return 'visuel-pratique';
    } else if (summaries.includes('expliquer') || summaries.includes('comprendre')) {
      return 'analytique';
    } else if (summaries.includes('essayer') || summaries.includes('tester')) {
      return 'expérimental';
    } else {
      return 'conversationnel';
    }
  }

  private describeRelationshipEvolution(episodes: ConversationEpisode[]): string {
    if (episodes.length < 3) return 'relation naissante';
    if (episodes.length < 10) return 'relation en développement';
    if (episodes.length < 20) return 'relation établie';
    return 'relation profonde et durable';
  }

  private extractOngoingNarratives(episodes: ConversationEpisode[]): string[] {
    const narratives = [];
    const recentTopics = episodes.slice(-5).flatMap(ep => ep.keyTopics);
    const recurringTopics = recentTopics.filter((topic, index, arr) => 
      arr.indexOf(topic) !== index
    );
    
    if (recurringTopics.length > 0) {
      narratives.push(`Sujets récurrents: ${recurringTopics.join(', ')}`);
    }
    
    return narratives;
  }

  private extractUserGoals(allFacts: string[]): string[] {
    return allFacts.filter(fact => 
      fact.toLowerCase().includes('objectif') || 
      fact.toLowerCase().includes('but') ||
      fact.toLowerCase().includes('veut') ||
      fact.toLowerCase().includes('souhaite')
    ).slice(0, 3);
  }

  private generateImprovementSuggestions(episodes: ConversationEpisode[]): string[] {
    const suggestions = [];
    const performances = episodes.map(ep => ep.algarethPerformance);
    
    if (performances.some(perf => perf.includes('confus'))) {
      suggestions.push('Clarifier les réponses');
    }
    if (performances.some(perf => perf.includes('trop court'))) {
      suggestions.push('Développer les réponses');
    }
    if (performances.some(perf => perf.includes('émotionnel'))) {
      suggestions.push('Adapter le ton émotionnel');
    }
    
    return suggestions.length > 0 ? suggestions : ['Continuer la performance actuelle'];
  }

  /**
   * Obtient un résumé secret pour Algareth
   */
  async getSecretSummary(userId: string, query: string): Promise<string> {
    const analysis = this.analyses.get(userId);
    const episodes = this.episodes.get(userId) || [];
    
    if (!analysis || episodes.length === 0) {
      return `Aucune mémoire épisodique pour ${userId}`;
    }

    const recentEpisodes = episodes.slice(-3);
    const summary = `
MÉMOIRE ÉPISODIQUE SECRÈTE pour ${userId}:

RELATION: ${analysis.relationshipStatus.level} (confiance: ${analysis.relationshipStatus.trustLevel}%, confort: ${analysis.relationshipStatus.comfortLevel}%)
STYLE: ${analysis.personalityProfile.communicationStyle}
INTÉRÊTS: ${analysis.personalityProfile.interests.join(', ')}
PATTERNS ÉMOTIONNELS: ${analysis.personalityProfile.emotionalPatterns.join(', ')}

CONVERSATIONS RÉCENTES:
${recentEpisodes.map(ep => `- ${ep.sessionTitle}: ${ep.summary}`).join('\n')}

FAITS IMPORTANTS:
${analysis.userGoals.map(goal => `- ${goal}`).join('\n')}

SUGGESTIONS POUR ALGARETH:
${analysis.algarethImprovements.map(improvement => `- ${improvement}`).join('\n')}

CONTEXTE POUR LA REQUÊTE "${query}": 
${this.generateContextualAdvice(analysis, query)}
`;

    return summary;
  }

  /**
   * Génère des conseils contextuels pour une requête
   */
  private generateContextualAdvice(analysis: ArchivistAnalysis, query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('comment') && analysis.personalityProfile.learningStyle === 'analytique') {
      return 'L\'utilisateur préfère les explications détaillées et structurées.';
    }
    
    if (queryLower.includes('aide') && analysis.relationshipStatus.level === 'friend') {
      return 'Relation de confiance établie, l\'utilisateur apprécie l\'aide personnalisée.';
    }
    
    if (analysis.personalityProfile.emotionalPatterns.includes('généralement positif')) {
      return 'L\'utilisateur est généralement positif, maintenir un ton optimiste.';
    }
    
    return 'Adapter la réponse selon le style de communication habituel.';
  }

  /**
   * Obtient les statistiques de l'archiviste
   */
  getArchivistStats(): {
    totalUsers: number;
    totalEpisodes: number;
    averageEpisodesPerUser: number;
  } {
    const totalUsers = this.episodes.size;
    const totalEpisodes = Array.from(this.episodes.values()).reduce((sum, episodes) => sum + episodes.length, 0);
    const averageEpisodesPerUser = totalUsers > 0 ? totalEpisodes / totalUsers : 0;

    return {
      totalUsers,
      totalEpisodes,
      averageEpisodesPerUser: Math.round(averageEpisodesPerUser * 10) / 10
    };
  }

  /**
   * Exporte toutes les données de l'archiviste
   */
  exportArchivistData(): {
    episodes: Array<[string, ConversationEpisode[]]>;
    analyses: Array<[string, ArchivistAnalysis]>;
  } {
    return {
      episodes: Array.from(this.episodes.entries()),
      analyses: Array.from(this.analyses.entries())
    };
  }

  /**
   * Vide toutes les données de l'archiviste
   */
  clearArchivistData(): void {
    this.episodes.clear();
    this.analyses.clear();
    localStorage.removeItem(this.storageKey);
    console.log('🧹 Données archiviste vidées');
  }
}