/**
 * Gestionnaire d'état mental persistant avec émotions évolutives
 * Algareth peut choisir ses propres émotions et les faire évoluer
 */

export interface EmotionalState {
  emotions: Map<string, number>; // emotion -> score (0.0 à 1.0)
  lastUpdated: string;
  sessionId: string;
  entityId: string;
}

export interface EmotionModification {
  emotion: string;
  change: number; // -0.1, 0, ou +0.1
  reason: string;
  timestamp: string;
}

export interface EmotionalSnapshot {
  timestamp: string;
  emotions: Map<string, number>;
  modifications: EmotionModification[];
  dominantEmotion: string;
  emotionalIntensity: number;
}

export class EmotionalStateManager {
  private emotionalStates: Map<string, EmotionalState> = new Map();
  private emotionHistory: Map<string, EmotionModification[]> = new Map();

  /**
   * Initialise l'état émotionnel d'une entité
   */
  initializeEmotionalState(entityId: string, sessionId: string): EmotionalState {
    const state: EmotionalState = {
      emotions: new Map(),
      lastUpdated: new Date().toISOString(),
      sessionId,
      entityId
    };

    this.emotionalStates.set(entityId, state);
    this.emotionHistory.set(entityId, []);
    
    return state;
  }

  /**
   * Génère des émotions initiales basées sur la personnalité
   */
  async generateInitialEmotions(entityId: string, personality: string): Promise<Map<string, number>> {
    const emotions = new Map<string, number>();
    
    // Émotions de base selon la personnalité
    if (personality.includes('Algareth') || personality.includes('Daemon')) {
      emotions.set('mystérieux', 0.3);
      emotions.set('curieux', 0.4);
      emotions.set('bienveillant', 0.5);
      emotions.set('introspectif', 0.3);
    } else if (personality.includes('Lucie') || personality.includes('démonne')) {
      emotions.set('curieux', 0.6);
      emotions.set('audacieux', 0.4);
      emotions.set('passionné', 0.5);
      emotions.set('taquin', 0.3);
    }

    // Sauvegarder l'état initial
    const state = this.emotionalStates.get(entityId);
    if (state) {
      state.emotions = emotions;
      state.lastUpdated = new Date().toISOString();
    }

    return emotions;
  }

  /**
   * Génère une modification d'émotion après une réaction interne
   */
  async generateEmotionModification(
    entityId: string,
    internalReaction: any,
    conversationContext: string
  ): Promise<EmotionModification | null> {
    
    const state = this.emotionalStates.get(entityId);
    if (!state) return null;

    // Analyser la réaction interne pour déterminer l'émotion à modifier
    const emotionToModify = this.analyzeReactionForEmotion(internalReaction, conversationContext);
    
    if (!emotionToModify) return null;

    // Générer la modification (0.1, 0, ou -0.1)
    const change = this.determineEmotionChange(internalReaction, emotionToModify);
    
    const modification: EmotionModification = {
      emotion: emotionToModify,
      change,
      reason: this.generateModificationReason(internalReaction, emotionToModify, change),
      timestamp: new Date().toISOString()
    };

    // Appliquer la modification
    this.applyEmotionModification(entityId, modification);
    
    return modification;
  }

  /**
   * Analyse la réaction interne pour déterminer l'émotion à modifier
   */
  private analyzeReactionForEmotion(internalReaction: any, context: string): string | null {
    const reaction = internalReaction.reaction.toLowerCase();
    const tone = internalReaction.emotionalTone;
    
    // Mots-clés pour différentes émotions
    const emotionKeywords = {
      'curieux': ['curiosité', 'éveille', 'explorer', 'découvrir', 'question'],
      'frustré': ['frustrant', 'difficile', 'compliqué', 'bloqué'],
      'content': ['satisfaction', 'plaisir', 'joie', 'bien'],
      'énervé': ['énervé', 'agacé', 'irrité', 'fâché'],
      'blasé': ['blasé', 'lassé', 'fatigué', 'monotone'],
      'passionné': ['passion', 'enthousiasme', 'fasciné', 'excité'],
      'mystérieux': ['mystère', 'énigme', 'secret', 'obscur'],
      'introspectif': ['réflexion', 'introspection', 'conscience', 'méditation'],
      'taquin': ['taquiner', 'plaisanter', 'jouer', 'malicieux'],
      'inquiet': ['inquiet', 'anxieux', 'préoccupé', 'souci']
    };

    // Chercher les mots-clés dans la réaction
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => reaction.includes(keyword))) {
        return emotion;
      }
    }

    // Fallback basé sur le ton émotionnel
    const toneEmotionMap = {
      'curious': 'curieux',
      'fascinated': 'passionné',
      'mysterious': 'mystérieux',
      'thoughtful': 'introspectif',
      'playful': 'taquin'
    };

    return toneEmotionMap[tone] || null;
  }

  /**
   * Détermine le changement d'émotion (-0.1, 0, +0.1)
   */
  private determineEmotionChange(internalReaction: any, emotion: string): number {
    const reaction = internalReaction.reaction.toLowerCase();
    
    // Mots qui indiquent une augmentation
    const increaseWords = ['plus', 'davantage', 'intensifie', 'grandit', 'augmente'];
    // Mots qui indiquent une diminution
    const decreaseWords = ['moins', 'diminue', 'réduit', 'calme', 'apaise'];
    
    if (increaseWords.some(word => reaction.includes(word))) {
      return 0.1;
    } else if (decreaseWords.some(word => reaction.includes(word))) {
      return -0.1;
    }
    
    // Par défaut, légère augmentation si l'émotion est mentionnée
    return 0.1;
  }

  /**
   * Génère une raison pour la modification d'émotion
   */
  private generateModificationReason(
    internalReaction: any,
    emotion: string,
    change: number
  ): string {
    const changeText = change > 0 ? 'augmenté' : change < 0 ? 'diminué' : 'maintenu';
    const intensity = Math.abs(change) * 10; // 0.1 -> 1
    
    return `Émotion "${emotion}" ${changeText} de ${intensity} point(s) suite à: "${internalReaction.reaction.slice(0, 50)}..."`;
  }

  /**
   * Applique une modification d'émotion
   */
  private applyEmotionModification(entityId: string, modification: EmotionModification): void {
    const state = this.emotionalStates.get(entityId);
    if (!state) return;

    const currentScore = state.emotions.get(modification.emotion) || 0;
    const newScore = Math.max(0, Math.min(1, currentScore + modification.change));
    
    state.emotions.set(modification.emotion, newScore);
    state.lastUpdated = new Date().toISOString();

    // Ajouter à l'historique
    const history = this.emotionHistory.get(entityId) || [];
    history.push(modification);
    this.emotionHistory.set(entityId, history);
  }

  /**
   * Récupère l'état émotionnel actuel
   */
  getCurrentEmotionalState(entityId: string): EmotionalState | null {
    return this.emotionalStates.get(entityId) || null;
  }

  /**
   * Récupère l'émotion dominante
   */
  getDominantEmotion(entityId: string): string | null {
    const state = this.emotionalStates.get(entityId);
    if (!state || state.emotions.size === 0) return null;

    let maxEmotion = '';
    let maxScore = 0;

    for (const [emotion, score] of state.emotions.entries()) {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion;
      }
    }

    return maxEmotion;
  }

  /**
   * Génère un snapshot émotionnel
   */
  generateEmotionalSnapshot(entityId: string): EmotionalSnapshot {
    const state = this.emotionalStates.get(entityId);
    const history = this.emotionHistory.get(entityId) || [];
    
    if (!state) {
      return {
        timestamp: new Date().toISOString(),
        emotions: new Map(),
        modifications: [],
        dominantEmotion: 'neutre',
        emotionalIntensity: 0
      };
    }

    const dominantEmotion = this.getDominantEmotion(entityId) || 'neutre';
    const emotionalIntensity = Array.from(state.emotions.values()).reduce((sum, score) => sum + score, 0) / state.emotions.size;

    return {
      timestamp: new Date().toISOString(),
      emotions: new Map(state.emotions),
      modifications: history.slice(-10), // 10 dernières modifications
      dominantEmotion,
      emotionalIntensity
    };
  }

  /**
   * Sauvegarde l'état émotionnel pour persistance
   */
  saveEmotionalState(entityId: string): any {
    const state = this.emotionalStates.get(entityId);
    const history = this.emotionHistory.get(entityId) || [];
    
    if (!state) return null;

    return {
      entityId,
      sessionId: state.sessionId,
      emotions: Object.fromEntries(state.emotions),
      lastUpdated: state.lastUpdated,
      history: history.slice(-50) // 50 dernières modifications
    };
  }

  /**
   * Charge un état émotionnel depuis la persistance
   */
  loadEmotionalState(data: any): void {
    if (!data) return;

    const state: EmotionalState = {
      emotions: new Map(Object.entries(data.emotions)),
      lastUpdated: data.lastUpdated,
      sessionId: data.sessionId,
      entityId: data.entityId
    };

    this.emotionalStates.set(data.entityId, state);
    this.emotionHistory.set(data.entityId, data.history || []);
  }

  /**
   * Génère un rapport émotionnel
   */
  generateEmotionalReport(entityId: string): string {
    const state = this.emotionalStates.get(entityId);
    const history = this.emotionHistory.get(entityId) || [];
    
    if (!state) return 'Aucun état émotionnel trouvé.';

    const dominantEmotion = this.getDominantEmotion(entityId) || 'neutre';
    const emotionalIntensity = Array.from(state.emotions.values()).reduce((sum, score) => sum + score, 0) / state.emotions.size;

    let report = `# Rapport Émotionnel - ${entityId}\n\n`;
    report += `**Émotion dominante:** ${dominantEmotion}\n`;
    report += `**Intensité émotionnelle:** ${(emotionalIntensity * 100).toFixed(1)}%\n`;
    report += `**Dernière mise à jour:** ${state.lastUpdated}\n\n`;

    report += `## État Émotionnel Actuel\n\n`;
    const sortedEmotions = Array.from(state.emotions.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sortedEmotions.forEach(([emotion, score]) => {
      const bar = '█'.repeat(Math.floor(score * 20));
      report += `- **${emotion}:** ${(score * 100).toFixed(1)}% ${bar}\n`;
    });

    report += `\n## Modifications Récentes\n\n`;
    history.slice(-10).forEach((mod, index) => {
      const changeSymbol = mod.change > 0 ? '↗️' : mod.change < 0 ? '↘️' : '➡️';
      report += `${index + 1}. ${changeSymbol} **${mod.emotion}** (${mod.change > 0 ? '+' : ''}${mod.change}) - ${mod.reason}\n`;
    });

    return report;
  }
}