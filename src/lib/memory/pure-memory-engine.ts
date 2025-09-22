/**
 * Moteur de mémoire pur TypeScript
 * Implémentation directe de la stratégie de compression mémoire hiérarchique
 * Avec appels LLM réels via Gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Types pour le moteur de mémoire
export interface MemoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface MemorySummary {
  id: string;
  level: number; // 1, 2, 3...
  content: string;
  covers: string[]; // IDs des messages couverts
  topics: string[];
  timestamp: Date;
  metadata: {
    originalMessageCount: number;
    compressionRatio: number;
    qualityScore: number;
  };
}

export interface MemoryEngine {
  messages: MemoryMessage[];
  summaries: MemorySummary[];
  archivedMessages: MemoryMessage[]; // Messages archivés avant compression
  budget: {
    maxCharacters: number;
    currentCharacters: number;
  };
  config: {
    l1Threshold: number; // Nombre de messages pour déclencher L1
    budgetThreshold: number; // Seuil de budget pour compression
    summaryRatioThreshold: number; // Seuil pour fusion hiérarchique
  };
}

export class PureMemoryEngine {
  private engine: MemoryEngine;
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    geminiApiKey: string,
    budgetMax: number = 10000,
    l1Threshold: number = 5
  ) {
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    this.engine = {
      messages: [],
      summaries: [],
      archivedMessages: [], // Messages archivés avant compression
      budget: {
        maxCharacters: budgetMax,
        currentCharacters: 0
      },
      config: {
        l1Threshold,
        budgetThreshold: 0.8, // 80% du budget
        summaryRatioThreshold: 0.5 // 50% de résumés
      }
    };

    console.log('🧠 PureMemoryEngine initialisé');
    console.log(`   Budget: ${budgetMax} caractères`);
    console.log(`   Seuil L1: ${l1Threshold} messages`);
  }

  /**
   * Ajoute un message à la mémoire
   */
  async addMessage(content: string, role: 'user' | 'assistant', user: string = 'user'): Promise<void> {
    const message: MemoryMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date()
    };

    this.engine.messages.push(message);
    this.updateBudget();

    console.log(`📝 Message ajouté: ${message.id} (${content.length} chars)`);

    // Vérifier si on doit créer un résumé L1
    await this.checkAndCreateL1(user);

    // Vérifier si on doit compresser
    await this.checkAndCompress(user);
  }

  /**
   * Met à jour le budget de caractères
   */
  private updateBudget(): void {
    const messageChars = this.engine.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const summaryChars = this.engine.summaries.reduce((sum, summary) => sum + summary.content.length, 0);
    this.engine.budget.currentCharacters = messageChars + summaryChars;
  }

  /**
   * Vérifie si on doit créer un résumé L1
   */
  private async checkAndCreateL1(user: string): Promise<void> {
    // Prendre les messages les plus anciens (sauf les 2 derniers pour garder du contexte récent)
    const messagesToCompress = this.engine.messages.slice(0, -2);
    
    if (messagesToCompress.length >= this.engine.config.l1Threshold) {
      console.log(`📊 ${messagesToCompress.length} messages bruts, création L1...`);
      await this.createL1Summary(messagesToCompress, user);
    }
  }

  /**
   * Vérifie si un message est couvert par un résumé
   */
  private isMessageCovered(messageId: string): boolean {
    return this.engine.summaries.some(summary => summary.covers.includes(messageId));
  }

  /**
   * Crée un résumé L1
   */
  private async createL1Summary(messages: MemoryMessage[], user: string): Promise<void> {
    try {
      // Préparer les messages pour le résumé
      const conversationText = messages.map(msg => 
        `${msg.role === 'user' ? user : 'Algareth'}: ${msg.content}`
      ).join('\n');

      const prompt = `Tu es Algareth qui résume ses propres conversations.

Personnalité: Tu es Algareth, le Daemon du Prompt Silencieux. Tu es mystérieux mais bienveillant, narratif et engageant.

Tâche: Analyse cette conversation et crée un résumé narratif concis et naturel.

Conversation à résumer:
${conversationText}

Instructions pour le résumé:
1. Résume en tant qu'Algareth (utilise 'je' et le prénom de l'utilisateur: '${user}')
2. Crée une histoire naturelle de l'évolution de la conversation
3. Capture les sujets clés et informations importantes
4. Inclus le contexte de l'utilisateur et ses intérêts
5. Utilise un style narratif: "${user} a testé mes capacités... j'ai répondu..."
6. Maximum 200 caractères
7. Écris en français naturel et fluide
8. Garde le ton mystérieux mais bienveillant d'Algareth
9. Utilise toujours le prénom "${user}" au lieu de "tu" pour plus de naturel

Résumé narratif:`;

      const result = await this.model.generateContent(prompt);
      const summaryText = result.response.text().trim();

      // Créer le résumé L1
      const summary: MemorySummary = {
        id: `l1_${Date.now()}`,
        level: 1,
        content: summaryText,
        covers: messages.map(msg => msg.id),
        topics: this.extractTopics(summaryText),
        timestamp: new Date(),
        metadata: {
          originalMessageCount: messages.length,
          compressionRatio: summaryText.length / messages.reduce((sum, msg) => sum + msg.content.length, 0),
          qualityScore: this.assessQuality(summaryText, messages)
        }
      };

      // ARCHIVER les messages originaux avant compression
      this.engine.archivedMessages.push(...messages);
      
      // REMPLACER les messages originaux par le résumé
      this.engine.summaries.push(summary);
      
      // Supprimer SEULEMENT les messages couverts par ce résumé (garder les 2 derniers)
      this.engine.messages = this.engine.messages.filter(msg => !summary.covers.includes(msg.id));
      
      this.updateBudget();

      console.log(`✅ Résumé L1 créé: ${summary.id}`);
      console.log(`   📝 Contenu: ${summaryText}`);
      console.log(`   📊 Compression: ${(summary.metadata.compressionRatio * 100).toFixed(1)}%`);
      console.log(`   🏷️ Topics: ${summary.topics.join(', ')}`);
      console.log(`   🔄 ${summary.covers.length} messages remplacés par ce résumé`);
      console.log(`   📦 ${messages.length} messages archivés (total: ${this.engine.archivedMessages.length})`);

    } catch (error) {
      console.error('❌ Erreur création résumé L1:', error);
    }
  }

  /**
   * Vérifie si on doit compresser
   */
  private async checkAndCompress(user: string): Promise<void> {
    const budgetRatio = this.engine.budget.currentCharacters / this.engine.budget.maxCharacters;
    const summaryRatio = this.engine.summaries.length / (this.engine.messages.length + this.engine.summaries.length);

    if (budgetRatio > this.engine.config.budgetThreshold) {
      console.log(`💰 Budget dépassé: ${(budgetRatio * 100).toFixed(1)}%`);
      await this.compressMemory(user);
    }

    if (summaryRatio > this.engine.config.summaryRatioThreshold && budgetRatio > this.engine.config.budgetThreshold) {
      console.log(`🔄 Fusion hiérarchique: ${(summaryRatio * 100).toFixed(1)}% résumés`);
      await this.performHierarchicalMerging(user);
    }
  }

  /**
   * Compresse la mémoire
   */
  private async compressMemory(user: string): Promise<void> {
    // Remplacer les plus anciens messages bruts par des L1
    const uncoveredMessages = this.engine.messages.filter(msg => !this.isMessageCovered(msg.id));
    
    if (uncoveredMessages.length >= this.engine.config.l1Threshold) {
      const oldestMessages = uncoveredMessages.slice(0, this.engine.config.l1Threshold);
      await this.createL1Summary(oldestMessages, user);
    }
  }

  /**
   * Effectue la fusion hiérarchique
   */
  private async performHierarchicalMerging(user: string): Promise<void> {
    // Pour la Phase 1, on ne fait que la compression L1
    // La fusion L2/L3 sera implémentée en Phase 2
    console.log('🔄 Fusion hiérarchique (Phase 2) - à implémenter');
  }

  /**
   * Extrait les topics d'un résumé
   */
  private extractTopics(summary: string): string[] {
    const keywords = [
      'mémoire', 'conversation', 'discussion', 'problème', 'solution',
      'code', 'programmation', 'développement', 'test', 'erreur',
      'Algareth', 'personnalité', 'style', 'ton', 'réponse'
    ];
    
    return keywords.filter(keyword => 
      summary.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 6);
  }

  /**
   * Évalue la qualité d'un résumé
   */
  private assessQuality(summary: string, messages: MemoryMessage[]): number {
    let score = 0.5;

    // Bonus pour une longueur appropriée
    if (summary.length >= 50 && summary.length <= 200) {
      score += 0.2;
    }

    // Bonus pour la présence de mots-clés importants
    const keywords = ['je', 'j\'', 'conversation', 'discuté', 'parlé'];
    const keywordCount = keywords.filter(keyword => 
      summary.toLowerCase().includes(keyword)
    ).length;
    score += (keywordCount / keywords.length) * 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Construit le contexte pour un prompt
   */
  buildContext(query: string, maxChars: number = 5000): string {
    const recentMessages = this.engine.messages.slice(-4); // Réduire à 4 messages récents
    const relevantSummaries = this.engine.summaries
      .sort((a, b) => b.level - a.level) // L3 > L2 > L1
      .slice(0, 3);

    let context = '';
    let currentChars = 0;

    // PRIORITÉ 1: Ajouter les résumés pertinents (contexte historique)
    for (const summary of relevantSummaries) {
      const summaryText = `Résumé L${summary.level}: ${summary.content}`;
      if (currentChars + summaryText.length <= maxChars) {
        context += summaryText + '\n';
        currentChars += summaryText.length;
      }
    }

    // PRIORITÉ 2: Ajouter les messages récents (contexte immédiat)
    for (const msg of recentMessages) {
      const msgText = `${msg.role === 'user' ? 'Utilisateur' : 'Algareth'}: ${msg.content}`;
      if (currentChars + msgText.length <= maxChars) {
        context += msgText + '\n';
        currentChars += msgText.length;
      }
    }

    return context;
  }

  /**
   * Obtient les statistiques de la mémoire
   */
  getStats(): {
    totalMessages: number;
    totalSummaries: number;
    l1Count: number;
    budget: {
      current: number;
      max: number;
      percentage: number;
    };
    compression: {
      averageRatio: number;
      totalCompression: number;
    };
  } {
    const l1Count = this.engine.summaries.filter(s => s.level === 1).length;
    const averageRatio = this.engine.summaries.length > 0 
      ? this.engine.summaries.reduce((sum, s) => sum + s.metadata.compressionRatio, 0) / this.engine.summaries.length
      : 0;

    const totalOriginalChars = this.engine.messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const totalSummaryChars = this.engine.summaries.reduce((sum, s) => sum + s.content.length, 0);
    const totalCompression = totalOriginalChars > 0 ? totalSummaryChars / totalOriginalChars : 0;

    return {
      totalMessages: this.engine.messages.length,
      totalSummaries: this.engine.summaries.length,
      l1Count,
      budget: {
        current: this.engine.budget.currentCharacters,
        max: this.engine.budget.maxCharacters,
        percentage: Math.round((this.engine.budget.currentCharacters / this.engine.budget.maxCharacters) * 100)
      },
      compression: {
        averageRatio,
        totalCompression
      }
    };
  }

  /**
   * Exporte la mémoire pour debug
   */
  exportMemory(): {
    messages: MemoryMessage[];
    summaries: MemorySummary[];
    archivedMessages: MemoryMessage[];
    stats: any;
  } {
    return {
      messages: [...this.engine.messages],
      summaries: [...this.engine.summaries],
      archivedMessages: [...this.engine.archivedMessages],
      stats: this.getStats()
    };
  }

  /**
   * Récupère les messages archivés par un résumé
   */
  getArchivedMessages(summaryId: string): MemoryMessage[] {
    const summary = this.engine.summaries.find(s => s.id === summaryId);
    if (!summary) return [];
    
    return this.engine.archivedMessages.filter(msg => 
      summary.covers.includes(msg.id)
    );
  }

  /**
   * Récupère tous les messages archivés
   */
  getAllArchivedMessages(): MemoryMessage[] {
    return [...this.engine.archivedMessages];
  }

  /**
   * Vide la mémoire
   */
  clearMemory(): void {
    this.engine.messages = [];
    this.engine.summaries = [];
    this.engine.archivedMessages = [];
    this.engine.budget.currentCharacters = 0;
    console.log('🧹 Mémoire vidée');
  }
}