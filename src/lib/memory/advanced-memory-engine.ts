/**
 * Moteur de mémoire avancé avec compression hiérarchique L1/L2/L3
 * Basé sur l'insight ChatGPT avec mockups complets
 */

export interface MemoryItem {
  id: string;
  type: 'raw' | 'sum';
  level?: number; // 1, 2, 3...
  text: string;
  chars: number;
  topics?: string[];
  covers?: string[]; // IDs des éléments couverts
  timestamp: Date;
}

export interface MemoryState {
  items: MemoryItem[];
  budgetMax: number;
  l1Threshold: number;
  summaryRatioThreshold: number;
}

export interface CompressionAction {
  action: 'NONE' | 'CREATE_L1' | 'REPLACE_RAW_WITH_L1' | 'MERGE_TO_L2' | 'MERGE_TO_L3';
  summaries: MemoryItem[];
  evictions: string[];
  replacements: Array<{ with: string; replaces: string[] }>;
  budget: { max: number; after: number };
}

export class AdvancedMemoryEngine {
  private memory: MemoryState;
  private messageCounter = 0;

  constructor(
    budgetMax: number = 10000,
    l1Threshold: number = 5,
    summaryRatioThreshold: number = 0.5
  ) {
    this.memory = {
      items: [],
      budgetMax,
      l1Threshold,
      summaryRatioThreshold
    };
    
    console.log('🧠 AdvancedMemoryEngine initialisé');
    console.log(`   Budget: ${budgetMax} caractères`);
    console.log(`   Seuil L1: ${l1Threshold} messages`);
    console.log(`   Seuil hiérarchique: ${(summaryRatioThreshold * 100)}%`);
  }

  /**
   * Ajoute un message à la mémoire
   */
  addMessage(content: string, role: 'user' | 'assistant', user: string = 'user'): CompressionAction {
    const message: MemoryItem = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'raw',
      text: `${role === 'user' ? user : 'Algareth'}: ${content}`,
      chars: content.length,
      timestamp: new Date()
    };

    this.memory.items.push(message);
    this.messageCounter++;

    console.log(`📝 Message ajouté: ${message.id} (${content.length} chars)`);

    // Appliquer la logique de compression
    return this.applyCompressionLogic();
  }

  /**
   * Logique principale de compression
   */
  private applyCompressionLogic(): CompressionAction {
    const action: CompressionAction = {
      action: 'NONE',
      summaries: [],
      evictions: [],
      replacements: [],
      budget: { max: this.memory.budgetMax, after: this.getTotalChars() }
    };

    // R1: Créer L1 tous les 5 messages
    if (this.shouldCreateL1()) {
      const l1Action = this.createL1Summary();
      if (l1Action) {
        Object.assign(action, l1Action);
      }
    }

    // R2: Appliquer le budget (remplacer les plus anciens par L1)
    if (this.getTotalChars() > this.memory.budgetMax) {
      const budgetAction = this.applyBudgetCompression();
      if (budgetAction) {
        Object.assign(action, budgetAction);
      }
    }

    // R3: Fusion hiérarchique si >50% de résumés
    if (this.getSummaryRatio() > this.memory.summaryRatioThreshold) {
      const mergeAction = this.applyHierarchicalMerge();
      if (mergeAction) {
        Object.assign(action, mergeAction);
      }
    }

    return action;
  }

  /**
   * R1: Vérifie si on doit créer un L1
   */
  private shouldCreateL1(): boolean {
    const rawMessages = this.memory.items.filter(item => item.type === 'raw');
    return rawMessages.length >= this.memory.l1Threshold;
  }

  /**
   * R1: Crée un résumé L1
   */
  private createL1Summary(): CompressionAction | null {
    const rawMessages = this.memory.items.filter(item => item.type === 'raw');
    if (rawMessages.length < this.memory.l1Threshold) return null;

    // Prendre les 5 derniers messages bruts
    const messagesToSummarize = rawMessages.slice(-this.memory.l1Threshold);
    
    // Créer le résumé L1 (mockup)
    const l1Summary = this.generateL1Summary(messagesToSummarize);
    
    // Remplacer les messages bruts par le résumé
    this.replaceRawWithL1(messagesToSummarize, l1Summary);

    console.log(`✅ L1 créé: ${l1Summary.id}`);
    console.log(`   📝 Contenu: ${l1Summary.text}`);
    console.log(`   🔄 ${messagesToSummarize.length} messages remplacés`);

    return {
      action: 'CREATE_L1',
      summaries: [l1Summary],
      evictions: messagesToSummarize.map(m => m.id),
      replacements: [{ with: l1Summary.id, replaces: messagesToSummarize.map(m => m.id) }],
      budget: { max: this.memory.budgetMax, after: this.getTotalChars() }
    };
  }

  /**
   * R2: Applique la compression de budget
   */
  private applyBudgetCompression(): CompressionAction | null {
    if (this.getTotalChars() <= this.memory.budgetMax) return null;

    const rawMessages = this.memory.items.filter(item => item.type === 'raw');
    if (rawMessages.length === 0) return null;

    // Prendre le bloc contigu le plus ancien
    const oldestBlock = this.getOldestContiguousRawBlock();
    if (oldestBlock.length === 0) return null;

    // Créer ou récupérer le L1 correspondant
    const l1Summary = this.generateL1Summary(oldestBlock);
    this.replaceRawWithL1(oldestBlock, l1Summary);

    console.log(`💰 Compression budget: ${oldestBlock.length} messages → L1`);

    return {
      action: 'REPLACE_RAW_WITH_L1',
      summaries: [l1Summary],
      evictions: oldestBlock.map(m => m.id),
      replacements: [{ with: l1Summary.id, replaces: oldestBlock.map(m => m.id) }],
      budget: { max: this.memory.budgetMax, after: this.getTotalChars() }
    };
  }

  /**
   * R3: Applique la fusion hiérarchique
   */
  private applyHierarchicalMerge(): CompressionAction | null {
    const summaryRatio = this.getSummaryRatio();
    if (summaryRatio <= this.memory.summaryRatioThreshold) return null;

    // Essayer de fusionner les L1 les plus anciens
    const l1Summaries = this.memory.items.filter(item => item.type === 'sum' && item.level === 1);
    if (l1Summaries.length >= 2) {
      const pair = l1Summaries.slice(0, 2);
      const l2Summary = this.mergeSummaries(pair, 2);
      this.replaceSummariesWithMerged(pair, l2Summary);

      console.log(`🔄 Fusion L1→L2: ${pair.length} résumés fusionnés`);

      return {
        action: 'MERGE_TO_L2',
        summaries: [l2Summary],
        evictions: pair.map(s => s.id),
        replacements: [{ with: l2Summary.id, replaces: pair.map(s => s.id) }],
        budget: { max: this.memory.budgetMax, after: this.getTotalChars() }
      };
    }

    // Essayer de fusionner les L2 en L3
    const l2Summaries = this.memory.items.filter(item => item.type === 'sum' && item.level === 2);
    if (l2Summaries.length >= 2) {
      const pair = l2Summaries.slice(0, 2);
      const l3Summary = this.mergeSummaries(pair, 3);
      this.replaceSummariesWithMerged(pair, l3Summary);

      console.log(`🔄 Fusion L2→L3: ${pair.length} résumés fusionnés`);

      return {
        action: 'MERGE_TO_L3',
        summaries: [l3Summary],
        evictions: pair.map(s => s.id),
        replacements: [{ with: l3Summary.id, replaces: pair.map(s => s.id) }],
        budget: { max: this.memory.budgetMax, after: this.getTotalChars() }
      };
    }

    return null;
  }

  /**
   * Génère un résumé L1 (mockup)
   */
  private generateL1Summary(messages: MemoryItem[]): MemoryItem {
    const topics = this.extractTopics(messages);
    const summaryText = this.createSummaryText(messages, topics, 1);
    
    return {
      id: `l1_${Date.now()}`,
      type: 'sum',
      level: 1,
      text: summaryText,
      chars: summaryText.length,
      topics,
      covers: messages.map(m => m.id),
      timestamp: new Date()
    };
  }

  /**
   * Fusionne des résumés en niveau supérieur
   */
  private mergeSummaries(summaries: MemoryItem[], targetLevel: number): MemoryItem {
    const allTopics = summaries.flatMap(s => s.topics || []);
    const uniqueTopics = [...new Set(allTopics)].slice(0, 6);
    const summaryText = this.createMergedSummaryText(summaries, uniqueTopics, targetLevel);
    
    return {
      id: `l${targetLevel}_${Date.now()}`,
      type: 'sum',
      level: targetLevel,
      text: summaryText,
      chars: summaryText.length,
      topics: uniqueTopics,
      covers: summaries.flatMap(s => s.covers || []),
      timestamp: new Date()
    };
  }

  /**
   * Crée le texte d'un résumé (mockup)
   */
  private createSummaryText(messages: MemoryItem[], topics: string[], level: number): string {
    const messageCount = messages.length;
    const topicList = topics.join(', ');
    
    return `[L${level}] Facts: ${messageCount} messages sur ${topicList}. Decisions: Conversation structurée. Open: Questions en suspens. Next: Continuer l'échange.`;
  }

  /**
   * Crée le texte d'un résumé fusionné (mockup)
   */
  private createMergedSummaryText(summaries: MemoryItem[], topics: string[], level: number): string {
    const summaryCount = summaries.length;
    const topicList = topics.join(', ');
    
    return `[L${level}] Facts: ${summaryCount} résumés fusionnés couvrant ${topicList}. Decisions: Synthèse hiérarchique. Open: Vue d'ensemble. Next: Compression avancée.`;
  }

  /**
   * Extrait les topics des messages
   */
  private extractTopics(messages: MemoryItem[]): string[] {
    const allText = messages.map(m => m.text).join(' ').toLowerCase();
    const words = allText.split(' ').filter(word => word.length > 3);
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 6)
      .map(([word]) => word);
  }

  /**
   * Remplace des messages bruts par un résumé L1
   */
  private replaceRawWithL1(messages: MemoryItem[], l1Summary: MemoryItem): void {
    // Supprimer les messages bruts
    this.memory.items = this.memory.items.filter(item => !messages.includes(item));
    
    // Insérer le résumé à la position du premier message supprimé
    const firstMessageId = messages[0].id;
    const insertIndex = this.memory.items.findIndex(item => item.id === firstMessageId);
    this.memory.items.splice(Math.max(0, insertIndex), 0, l1Summary);
  }

  /**
   * Remplace des résumés par un résumé fusionné
   */
  private replaceSummariesWithMerged(summaries: MemoryItem[], mergedSummary: MemoryItem): void {
    // Supprimer les résumés
    this.memory.items = this.memory.items.filter(item => !summaries.includes(item));
    
    // Insérer le résumé fusionné
    this.memory.items.push(mergedSummary);
  }

  /**
   * Récupère le bloc contigu le plus ancien
   */
  private getOldestContiguousRawBlock(): MemoryItem[] {
    const rawMessages = this.memory.items.filter(item => item.type === 'raw');
    if (rawMessages.length === 0) return [];
    
    // Prendre les 5 plus anciens
    return rawMessages.slice(0, Math.min(5, rawMessages.length));
  }

  /**
   * Calcule le ratio de résumés
   */
  private getSummaryRatio(): number {
    const summaries = this.memory.items.filter(item => item.type === 'sum');
    return summaries.length / Math.max(1, this.memory.items.length);
  }

  /**
   * Calcule le total de caractères
   */
  private getTotalChars(): number {
    return this.memory.items.reduce((sum, item) => sum + item.chars, 0);
  }

  /**
   * Construit le contexte pour un prompt
   */
  buildContext(query: string, maxChars: number = 5000): string {
    // Prendre les 8 derniers messages bruts
    const recentMessages = this.memory.items
      .filter(item => item.type === 'raw')
      .slice(-8);
    
    // Prendre les résumés les plus pertinents (L3 > L2 > L1)
    const summaries = this.memory.items
      .filter(item => item.type === 'sum')
      .sort((a, b) => (b.level || 0) - (a.level || 0))
      .slice(0, 3);

    let context = '';
    let currentChars = 0;

    // Ajouter les résumés (priorité haute)
    for (const summary of summaries) {
      if (currentChars + summary.chars <= maxChars) {
        context += summary.text + '\n';
        currentChars += summary.chars;
      }
    }

    // Ajouter les messages récents
    for (const msg of recentMessages) {
      if (currentChars + msg.chars <= maxChars) {
        context += msg.text + '\n';
        currentChars += msg.chars;
      }
    }

    return context;
  }

  /**
   * Obtient les statistiques
   */
  getStats(): {
    totalItems: number;
    rawMessages: number;
    summaries: { l1: number; l2: number; l3: number };
    budget: { current: number; max: number; percentage: number };
    summaryRatio: number;
  } {
    const summaries = this.memory.items.filter(item => item.type === 'sum');
    const l1Count = summaries.filter(s => s.level === 1).length;
    const l2Count = summaries.filter(s => s.level === 2).length;
    const l3Count = summaries.filter(s => s.level === 3).length;

    return {
      totalItems: this.memory.items.length,
      rawMessages: this.memory.items.filter(item => item.type === 'raw').length,
      summaries: { l1: l1Count, l2: l2Count, l3: l3Count },
      budget: {
        current: this.getTotalChars(),
        max: this.memory.budgetMax,
        percentage: Math.round((this.getTotalChars() / this.memory.budgetMax) * 100)
      },
      summaryRatio: Math.round(this.getSummaryRatio() * 100)
    };
  }

  /**
   * Exporte la mémoire
   */
  exportMemory(): {
    items: MemoryItem[];
    stats: any;
  } {
    return {
      items: [...this.memory.items],
      stats: this.getStats()
    };
  }

  /**
   * Vide la mémoire
   */
  clearMemory(): void {
    this.memory.items = [];
    this.messageCounter = 0;
    console.log('🧹 Mémoire vidée');
  }
}