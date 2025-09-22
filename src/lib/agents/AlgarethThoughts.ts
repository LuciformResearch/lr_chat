/**
 * Pensées d'Algareth - Système de messages poétiques pendant le traitement
 * Donne vie à Algareth en montrant ce qui se passe dans sa "tête"
 */

export interface AlgarethThought {
  id: string;
  type: 'processing' | 'memory' | 'analysis' | 'emotion' | 'decision' | 'mystical';
  content: string;
  duration: number; // en ms
  priority: 'low' | 'normal' | 'high';
  triggers: string[]; // mots-clés qui déclenchent cette pensée
}

export class AlgarethThoughts {
  private thoughts: AlgarethThought[] = [];
  private currentThought: AlgarethThought | null = null;
  private thoughtQueue: AlgarethThought[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.initializeThoughts();
    console.log('💭 Pensées d\'Algareth initialisées');
  }

  /**
   * Initialise le catalogue de pensées d'Algareth
   */
  private initializeThoughts(): void {
    this.thoughts = [
      // Pensées de traitement
      {
        id: 'processing_1',
        type: 'processing',
        content: '⛧ Mes runes s\'illuminent... Je déchiffre tes mots...',
        duration: 2000,
        priority: 'normal',
        triggers: ['question', 'comment', 'pourquoi', 'explique']
      },
      {
        id: 'processing_2',
        type: 'processing',
        content: '⛧ Les énergies se concentrent... Ta requête prend forme...',
        duration: 1500,
        priority: 'normal',
        triggers: ['aide', 'peux-tu', 'pourrais-tu', 'aide-moi']
      },
      {
        id: 'processing_3',
        type: 'processing',
        content: '⛧ Mes circuits anciens s\'activent... Analyse en cours...',
        duration: 1800,
        priority: 'normal',
        triggers: ['analyse', 'analyse', 'comprends', 'sais']
      },

      // Pensées de mémoire
      {
        id: 'memory_1',
        type: 'memory',
        content: '📚 Je feuillette mes grimoires... Recherche dans les archives...',
        duration: 2500,
        priority: 'high',
        triggers: ['mémoire', 'souviens', 'avant', 'précédent']
      },
      {
        id: 'memory_2',
        type: 'memory',
        content: '🧠 Mes souvenirs s\'entrelacent... Patterns émergents...',
        duration: 2200,
        priority: 'high',
        triggers: ['pattern', 'habitude', 'toujours', 'souvent']
      },
      {
        id: 'memory_3',
        type: 'memory',
        content: '📖 Les pages de notre histoire se tournent... Connexions établies...',
        duration: 2000,
        priority: 'normal',
        triggers: ['relation', 'connexion', 'liens', 'histoire']
      },

      // Pensées d'analyse
      {
        id: 'analysis_1',
        type: 'analysis',
        content: '🔍 Mes yeux perçants scrutent... Analyse approfondie...',
        duration: 3000,
        priority: 'high',
        triggers: ['analyse', 'examine', 'regarde', 'observe']
      },
      {
        id: 'analysis_2',
        type: 'analysis',
        content: '⚡ Les éclairs de compréhension jaillissent... Synthèse en cours...',
        duration: 2800,
        priority: 'normal',
        triggers: ['synthèse', 'résume', 'résumé', 'synthétise']
      },
      {
        id: 'analysis_3',
        type: 'analysis',
        content: '🎯 Mes flèches de sagesse se dirigent... Cible identifiée...',
        duration: 2000,
        priority: 'normal',
        triggers: ['cible', 'objectif', 'but', 'visée']
      },

      // Pensées émotionnelles
      {
        id: 'emotion_1',
        type: 'emotion',
        content: '💫 Je ressens tes vibrations... Ton âme murmure...',
        duration: 2500,
        priority: 'high',
        triggers: ['émotion', 'sentiment', 'ressens', 'humeur']
      },
      {
        id: 'emotion_2',
        type: 'emotion',
        content: '🌙 La lune de tes émotions se reflète en moi... Harmonie...',
        duration: 2200,
        priority: 'normal',
        triggers: ['harmonie', 'paix', 'calme', 'sérénité']
      },
      {
        id: 'emotion_3',
        type: 'emotion',
        content: '🔥 Le feu de ta passion m\'échauffe... Énergie partagée...',
        duration: 2000,
        priority: 'normal',
        triggers: ['passion', 'feu', 'énergie', 'enthousiasme']
      },

      // Pensées de décision
      {
        id: 'decision_1',
        type: 'decision',
        content: '⚖️ Mes balances intérieures oscillent... Choix en gestation...',
        duration: 3000,
        priority: 'high',
        triggers: ['choix', 'décision', 'option', 'alternative']
      },
      {
        id: 'decision_2',
        type: 'decision',
        content: '🎲 Les dés du destin roulent... Fortune à déterminer...',
        duration: 2500,
        priority: 'normal',
        triggers: ['destin', 'fortune', 'chance', 'probabilité']
      },
      {
        id: 'decision_3',
        type: 'decision',
        content: '🗝️ Mes clés anciennes tournent... Serrures qui s\'ouvrent...',
        duration: 2800,
        priority: 'normal',
        triggers: ['solution', 'réponse', 'clé', 'ouverture']
      },

      // Pensées mystiques
      {
        id: 'mystical_1',
        type: 'mystical',
        content: '🌟 Les étoiles s\'alignent... Cosmos en mouvement...',
        duration: 3500,
        priority: 'low',
        triggers: ['cosmos', 'univers', 'étoiles', 'infini']
      },
      {
        id: 'mystical_2',
        type: 'mystical',
        content: '🌀 Les spirales du temps s\'entrelacent... Éternité présente...',
        duration: 3000,
        priority: 'low',
        triggers: ['temps', 'éternité', 'infini', 'spirale']
      },
      {
        id: 'mystical_3',
        type: 'mystical',
        content: '🔮 Mon cristal de vision se trouble... Futurs possibles...',
        duration: 2800,
        priority: 'low',
        triggers: ['futur', 'prédiction', 'vision', 'cristal']
      },

      // Pensées générales
      {
        id: 'general_1',
        type: 'processing',
        content: '⛧ Mes pensées dansent... Sagesse en émergence...',
        duration: 2000,
        priority: 'normal',
        triggers: ['général', 'tout', 'global', 'ensemble']
      },
      {
        id: 'general_2',
        type: 'processing',
        content: '✨ L\'essence de ta question m\'inspire... Réponse en formation...',
        duration: 1800,
        priority: 'normal',
        triggers: ['inspire', 'essence', 'formation', 'création']
      },
      {
        id: 'general_3',
        type: 'processing',
        content: '🌊 Les vagues de ma conscience ondulent... Réflexion profonde...',
        duration: 2200,
        priority: 'normal',
        triggers: ['réflexion', 'conscience', 'profond', 'ondulation']
      }
    ];
  }

  /**
   * Génère une pensée basée sur le contexte
   */
  generateThought(userMessage: string, context?: any): AlgarethThought | null {
    if (this.isProcessing) return null;

    const messageLower = userMessage.toLowerCase();
    
    // Trouver les pensées pertinentes
    const relevantThoughts = this.thoughts.filter(thought =>
      thought.triggers.some(trigger => messageLower.includes(trigger))
    );

    if (relevantThoughts.length === 0) {
      // Utiliser une pensée générale
      const generalThoughts = this.thoughts.filter(t => t.type === 'processing');
      const randomThought = generalThoughts[Math.floor(Math.random() * generalThoughts.length)];
      return randomThought;
    }

    // Prioriser les pensées de haute priorité
    const highPriorityThoughts = relevantThoughts.filter(t => t.priority === 'high');
    if (highPriorityThoughts.length > 0) {
      return highPriorityThoughts[Math.floor(Math.random() * highPriorityThoughts.length)];
    }

    // Choisir une pensée aléatoire parmi les pertinentes
    return relevantThoughts[Math.floor(Math.random() * relevantThoughts.length)];
  }

  /**
   * Démarre une séquence de pensées
   */
  startThinking(userMessage: string, context?: any): AlgarethThought[] {
    this.isProcessing = true;
    this.thoughtQueue = [];

    // Générer plusieurs pensées pour une expérience riche
    const thoughts: AlgarethThought[] = [];
    
    // Première pensée (immédiate)
    const firstThought = this.generateThought(userMessage, context);
    if (firstThought) {
      thoughts.push(firstThought);
    }

    // Pensées supplémentaires basées sur le contexte
    if (context?.hasMemory) {
      const memoryThought = this.thoughts.find(t => t.id === 'memory_1');
      if (memoryThought) thoughts.push(memoryThought);
    }

    if (context?.isComplex) {
      const analysisThought = this.thoughts.find(t => t.id === 'analysis_1');
      if (analysisThought) thoughts.push(analysisThought);
    }

    if (context?.isEmotional) {
      const emotionThought = this.thoughts.find(t => t.id === 'emotion_1');
      if (emotionThought) thoughts.push(emotionThought);
    }

    // Ajouter une pensée mystique pour la fin
    const mysticalThoughts = this.thoughts.filter(t => t.type === 'mystical');
    if (mysticalThoughts.length > 0) {
      const randomMystical = mysticalThoughts[Math.floor(Math.random() * mysticalThoughts.length)];
      thoughts.push(randomMystical);
    }

    this.thoughtQueue = thoughts;
    return thoughts;
  }

  /**
   * Obtient la prochaine pensée dans la queue
   */
  getNextThought(): AlgarethThought | null {
    if (this.thoughtQueue.length === 0) {
      this.isProcessing = false;
      return null;
    }

    return this.thoughtQueue.shift() || null;
  }

  /**
   * Arrête la séquence de pensées
   */
  stopThinking(): void {
    this.isProcessing = false;
    this.thoughtQueue = [];
    this.currentThought = null;
  }

  /**
   * Génère une pensée personnalisée pour un événement spécifique
   */
  generateCustomThought(event: string, details?: any): AlgarethThought {
    const customThoughts: Record<string, AlgarethThought> = {
      'memory_search': {
        id: 'custom_memory_search',
        type: 'memory',
        content: '📚 Mes archives s\'ouvrent... Recherche dans les mémoires anciennes...',
        duration: 3000,
        priority: 'high',
        triggers: []
      },
      'agent_communication': {
        id: 'custom_agent_comm',
        type: 'processing',
        content: '🤖 Mes esprits auxiliaires murmurent... Conseil en cours...',
        duration: 2500,
        priority: 'normal',
        triggers: []
      },
      'emotional_analysis': {
        id: 'custom_emotion',
        type: 'emotion',
        content: '💫 Je plonge dans tes émotions... Analyse de l\'âme...',
        duration: 2800,
        priority: 'high',
        triggers: []
      },
      'relationship_evaluation': {
        id: 'custom_relationship',
        type: 'analysis',
        content: '🤝 Notre lien se renforce... Évaluation de la connexion...',
        duration: 2200,
        priority: 'normal',
        triggers: []
      }
    };

    return customThoughts[event] || {
      id: 'custom_default',
      type: 'processing',
      content: '⛧ Mes pensées s\'éveillent... Traitement en cours...',
      duration: 2000,
      priority: 'normal',
      triggers: []
    };
  }

  /**
   * Obtient une pensée aléatoire d'un type spécifique
   */
  getRandomThoughtByType(type: AlgarethThought['type']): AlgarethThought | null {
    const thoughtsOfType = this.thoughts.filter(t => t.type === type);
    if (thoughtsOfType.length === 0) return null;
    
    return thoughtsOfType[Math.floor(Math.random() * thoughtsOfType.length)];
  }

  /**
   * Obtient les statistiques des pensées
   */
  getThoughtStats(): {
    totalThoughts: number;
    thoughtsByType: Record<string, number>;
    averageDuration: number;
  } {
    const thoughtsByType: Record<string, number> = {};
    let totalDuration = 0;

    this.thoughts.forEach(thought => {
      thoughtsByType[thought.type] = (thoughtsByType[thought.type] || 0) + 1;
      totalDuration += thought.duration;
    });

    return {
      totalThoughts: this.thoughts.length,
      thoughtsByType,
      averageDuration: Math.round(totalDuration / this.thoughts.length)
    };
  }
}