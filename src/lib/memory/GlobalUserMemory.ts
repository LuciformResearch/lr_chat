/**
 * Mémoire globale utilisateur - partagée entre toutes les sessions
 * Permet à Algareth de se souvenir de l'utilisateur entre les sessions
 */

import { HierarchicalMemoryManager } from './HierarchicalMemoryManager';

export interface GlobalUserProfile {
  userId: string;
  userName: string;
  totalSessions: number;
  totalMessages: number;
  firstInteraction: string;
  lastInteraction: string;
  personalityInsights: {
    communicationStyle: string;
    interests: string[];
    preferences: string[];
    relationshipLevel: 'new' | 'acquaintance' | 'familiar' | 'close';
  };
  globalMemory: {
    keyFacts: string[];
    importantEvents: string[];
    ongoingTopics: string[];
    userGoals: string[];
  };
  sessionSummaries: Array<{
    sessionId: string;
    sessionTitle: string;
    summary: string;
    keyTopics: string[];
    timestamp: string;
  }>;
}

export interface GlobalMemoryStats {
  totalSessions: number;
  totalMessages: number;
  relationshipLevel: string;
  keyFactsCount: number;
  ongoingTopicsCount: number;
  lastInteraction: string;
}

export class GlobalUserMemory {
  private userProfiles: Map<string, GlobalUserProfile> = new Map();
  private globalMemoryManager: HierarchicalMemoryManager;
  private storageKey = 'lr_tchatagent_global_user_memory';

  constructor() {
    this.globalMemoryManager = new HierarchicalMemoryManager(50000); // Budget plus élevé pour la mémoire globale
    this.loadGlobalMemory();
    console.log('🌍 GlobalUserMemory initialisé');
  }

  /**
   * Charge la mémoire globale depuis localStorage
   */
  private loadGlobalMemory(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const profiles = JSON.parse(data) as GlobalUserProfile[];
        this.userProfiles = new Map(profiles.map(profile => [profile.userId, profile]));
        console.log(`🌍 ${profiles.length} profils utilisateur chargés`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement mémoire globale:', error);
    }
  }

  /**
   * Sauvegarde la mémoire globale dans localStorage
   */
  private saveGlobalMemory(): void {
    try {
      const profiles = Array.from(this.userProfiles.values());
      localStorage.setItem(this.storageKey, JSON.stringify(profiles));
      console.log(`🌍 ${profiles.length} profils utilisateur sauvegardés`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde mémoire globale:', error);
    }
  }

  /**
   * Obtient ou crée le profil utilisateur
   */
  getOrCreateUserProfile(userId: string, userName: string): GlobalUserProfile {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      const now = new Date().toISOString();
      profile = {
        userId,
        userName,
        totalSessions: 0,
        totalMessages: 0,
        firstInteraction: now,
        lastInteraction: now,
        personalityInsights: {
          communicationStyle: 'unknown',
          interests: [],
          preferences: [],
          relationshipLevel: 'new'
        },
        globalMemory: {
          keyFacts: [],
          importantEvents: [],
          ongoingTopics: [],
          userGoals: []
        },
        sessionSummaries: []
      };
      
      this.userProfiles.set(userId, profile);
      console.log(`👤 Nouveau profil créé pour ${userName}`);
    } else {
      // Mettre à jour la dernière interaction
      profile.lastInteraction = new Date().toISOString();
    }
    
    return profile;
  }

  /**
   * Met à jour le profil après une session
   */
  updateUserProfileAfterSession(
    userId: string,
    sessionId: string,
    sessionTitle: string,
    sessionSummary: string,
    messageCount: number,
    keyTopics: string[]
  ): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    // Mettre à jour les statistiques
    profile.totalSessions += 1;
    profile.totalMessages += messageCount;
    profile.lastInteraction = new Date().toISOString();

    // Ajouter le résumé de session
    profile.sessionSummaries.push({
      sessionId,
      sessionTitle,
      summary: sessionSummary,
      keyTopics,
      timestamp: new Date().toISOString()
    });

    // Garder seulement les 10 dernières sessions
    if (profile.sessionSummaries.length > 10) {
      profile.sessionSummaries = profile.sessionSummaries.slice(-10);
    }

    // Mettre à jour les insights de personnalité
    this.updatePersonalityInsights(profile, keyTopics);

    // Sauvegarder
    this.saveGlobalMemory();
    
    console.log(`👤 Profil mis à jour pour ${profile.userName}: ${profile.totalSessions} sessions, ${profile.totalMessages} messages`);
  }

  /**
   * Met à jour les insights de personnalité
   */
  private updatePersonalityInsights(profile: GlobalUserProfile, newTopics: string[]): void {
    // Analyser le style de communication
    const allTopics = profile.sessionSummaries.flatMap(s => s.keyTopics).concat(newTopics);
    const topicCounts = allTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Déterminer les intérêts principaux
    profile.personalityInsights.interests = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    // Déterminer le niveau de relation
    if (profile.totalSessions >= 20) {
      profile.personalityInsights.relationshipLevel = 'close';
    } else if (profile.totalSessions >= 10) {
      profile.personalityInsights.relationshipLevel = 'familiar';
    } else if (profile.totalSessions >= 3) {
      profile.personalityInsights.relationshipLevel = 'acquaintance';
    }

    // Analyser le style de communication
    const technicalTopics = ['code', 'programmation', 'développement', 'bug', 'erreur'];
    const creativeTopics = ['art', 'créatif', 'design', 'inspiration'];
    const personalTopics = ['personnel', 'vie', 'famille', 'travail'];

    const hasTechnical = allTopics.some(topic => technicalTopics.some(tech => topic.includes(tech)));
    const hasCreative = allTopics.some(topic => creativeTopics.some(crea => topic.includes(crea)));
    const hasPersonal = allTopics.some(topic => personalTopics.some(pers => topic.includes(pers)));

    if (hasTechnical && hasCreative) {
      profile.personalityInsights.communicationStyle = 'versatile';
    } else if (hasTechnical) {
      profile.personalityInsights.communicationStyle = 'technical';
    } else if (hasCreative) {
      profile.personalityInsights.communicationStyle = 'creative';
    } else if (hasPersonal) {
      profile.personalityInsights.communicationStyle = 'personal';
    } else {
      profile.personalityInsights.communicationStyle = 'general';
    }
  }

  /**
   * Construit le contexte global pour Algareth
   */
  buildGlobalContext(userId: string, currentQuery: string): string {
    const profile = this.userProfiles.get(userId);
    if (!profile) return '';

    const context = [];

    // Informations de base sur l'utilisateur
    context.push(`UTILISATEUR: ${profile.userName}`);
    context.push(`RELATION: ${profile.personalityInsights.relationshipLevel} (${profile.totalSessions} sessions, ${profile.totalMessages} messages)`);
    context.push(`STYLE: ${profile.personalityInsights.communicationStyle}`);
    
    if (profile.personalityInsights.interests.length > 0) {
      context.push(`INTÉRÊTS: ${profile.personalityInsights.interests.join(', ')}`);
    }

    // Résumés des sessions récentes
    if (profile.sessionSummaries.length > 0) {
      context.push('\nCONVERSATIONS RÉCENTES:');
      const recentSummaries = profile.sessionSummaries.slice(-3);
      recentSummaries.forEach((summary, index) => {
        context.push(`${index + 1}. ${summary.sessionTitle}: ${summary.summary}`);
      });
    }

    // Faits clés et événements importants
    if (profile.globalMemory.keyFacts.length > 0) {
      context.push('\nFAITS CLÉS:');
      profile.globalMemory.keyFacts.forEach(fact => {
        context.push(`- ${fact}`);
      });
    }

    // Sujets en cours
    if (profile.globalMemory.ongoingTopics.length > 0) {
      context.push('\nSUJETS EN COURS:');
      profile.globalMemory.ongoingTopics.forEach(topic => {
        context.push(`- ${topic}`);
      });
    }

    return context.join('\n');
  }

  /**
   * Ajoute un fait clé à la mémoire globale
   */
  addKeyFact(userId: string, fact: string): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    profile.globalMemory.keyFacts.push(fact);
    
    // Garder seulement les 20 faits les plus récents
    if (profile.globalMemory.keyFacts.length > 20) {
      profile.globalMemory.keyFacts = profile.globalMemory.keyFacts.slice(-20);
    }

    this.saveGlobalMemory();
    console.log(`📝 Fait clé ajouté pour ${profile.userName}: ${fact}`);
  }

  /**
   * Ajoute un sujet en cours
   */
  addOngoingTopic(userId: string, topic: string): void {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    if (!profile.globalMemory.ongoingTopics.includes(topic)) {
      profile.globalMemory.ongoingTopics.push(topic);
      
      // Garder seulement les 10 sujets les plus récents
      if (profile.globalMemory.ongoingTopics.length > 10) {
        profile.globalMemory.ongoingTopics = profile.globalMemory.ongoingTopics.slice(-10);
      }

      this.saveGlobalMemory();
      console.log(`🔄 Sujet en cours ajouté pour ${profile.userName}: ${topic}`);
    }
  }

  /**
   * Obtient les statistiques globales
   */
  getGlobalStats(userId: string): GlobalMemoryStats | null {
    const profile = this.userProfiles.get(userId);
    if (!profile) return null;

    return {
      totalSessions: profile.totalSessions,
      totalMessages: profile.totalMessages,
      relationshipLevel: profile.personalityInsights.relationshipLevel,
      keyFactsCount: profile.globalMemory.keyFacts.length,
      ongoingTopicsCount: profile.globalMemory.ongoingTopics.length,
      lastInteraction: profile.lastInteraction
    };
  }

  /**
   * Obtient le profil utilisateur
   */
  getUserProfile(userId: string): GlobalUserProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Exporte toutes les données
   */
  exportAllData(): GlobalUserProfile[] {
    return Array.from(this.userProfiles.values());
  }

  /**
   * Vide la mémoire globale
   */
  clearGlobalMemory(): void {
    this.userProfiles.clear();
    localStorage.removeItem(this.storageKey);
    console.log('🧹 Mémoire globale vidée');
  }
}