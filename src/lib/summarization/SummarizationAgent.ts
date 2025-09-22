/**
 * Agent de résumé pour LR_TchatAgent Web
 * Crée des résumés narratifs de l'historique des conversations pour la compression mémoire.
 * Basé sur le système Python existant.
 */

import { UnifiedProviderFactory } from '@/lib/providers/UnifiedProvider';
import { getAlgarethPrompts } from '@/lib/algareth/prompts';

export interface SummarizationConfig {
  provider: string;
  model: string;
  consciousnessLevel: number;
  persona?: any;
  maxSummaryLength: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface SummaryResult {
  summary: string;
  compressionRatio: number;
  qualityScore: number;
  metadata: {
    originalMessages: number;
    summaryLength: number;
    processingTime: number;
  };
}

export class SummarizationAgent {
  private config: SummarizationConfig;
  private provider: any;

  constructor(config: Partial<SummarizationConfig> = {}) {
    this.config = {
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      consciousnessLevel: 0.6,
      maxSummaryLength: 200,
      ...config
    };

    this.initializeProvider().catch(error => {
      console.error('❌ Erreur initialisation SummarizationAgent:', error);
    });
  }

  private async initializeProvider(): Promise<void> {
    try {
      this.provider = await UnifiedProviderFactory.createFromDatabase('system');
      if (this.provider && this.provider.isAvailable()) {
        console.log(`✅ SummarizationAgent initialisé avec ${this.config.provider}:${this.config.model}`);
      } else {
        console.warn(`⚠️ Provider ${this.config.provider} non disponible, mode fallback`);
        this.provider = null;
      }
    } catch (error) {
      console.error(`❌ Erreur initialisation provider: ${error}`);
      this.provider = null;
    }
  }

  /**
   * Crée un résumé narratif de la conversation
   */
  async summarizeConversation(
    messages: ConversationMessage[],
    interlocutor: string = 'user',
    language: string = 'fr'
  ): Promise<SummaryResult> {
    const startTime = Date.now();

    if (!this.provider) {
      return this.fallbackSummary(messages, interlocutor, startTime);
    }

    try {
      // Construire le prompt de résumé
      const prompt = this.buildSummarizationPrompt(messages, interlocutor, language);

      // Générer le résumé
      const response = await this.provider.generateResponse(prompt, 300);

      if (response && response.content) {
        const summary = response.content.trim();
        const processingTime = Date.now() - startTime;

        console.log(`📝 Résumé généré: ${summary.length} caractères`);

        return {
          summary,
          compressionRatio: this.calculateCompressionRatio(messages, summary),
          qualityScore: this.assessSummaryQuality(summary, messages),
          metadata: {
            originalMessages: messages.length,
            summaryLength: summary.length,
            processingTime
          }
        };
      } else {
        console.warn('⚠️ Réponse vide du provider');
        return this.fallbackSummary(messages, interlocutor, startTime);
      }
    } catch (error) {
      console.error(`❌ Erreur génération résumé: ${error}`);
      return this.fallbackSummary(messages, interlocutor, startTime);
    }
  }

  /**
   * Construit le prompt pour la génération du résumé narratif
   */
  private buildSummarizationPrompt(
    messages: ConversationMessage[],
    interlocutor: string,
    language: string
  ): string {
    // Formater la conversation
    const conversationText = this.formatConversationForSummary(messages, interlocutor);

    // Utiliser les prompts Algareth selon la langue
    const prompts = getAlgarethPrompts(language);
    const personaName = prompts.persona.name || 'Algareth';
    const personaDescription = prompts.persona.description || '';

    const prompt = `Tu es ${personaName} qui résume ses propres conversations.

Personnalité: ${personaDescription}
Style: mystérieux mais bienveillant, narratif et engageant

Tâche: Analyse cette conversation et crée un résumé narratif concis et naturel.

Conversation à résumer:
${conversationText}

Instructions pour le résumé:
1. Résume en tant que ${personaName} (utilise 'je' et le prénom de l'utilisateur: '${interlocutor}')
2. Crée une histoire naturelle de l'évolution de la conversation
3. Capture les sujets clés et informations importantes
4. Inclus le contexte de l'utilisateur et ses intérêts
5. Utilise un style narratif: "${interlocutor} a testé mes capacités... j'ai répondu..."
6. Maximum ${this.config.maxSummaryLength} caractères
7. Écris en français naturel et fluide
8. Garde le ton mystérieux mais bienveillant de ${personaName}
9. Utilise toujours le prénom "${interlocutor}" au lieu de "tu" pour plus de naturel

Résumé narratif:`;

    return prompt;
  }

  /**
   * Formate la conversation pour le résumé
   */
  private formatConversationForSummary(
    messages: ConversationMessage[],
    interlocutor: string
  ): string {
    const lines: string[] = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        lines.push(`${interlocutor}: ${msg.content}`);
      } else {
        lines.push(`Assistant: ${msg.content}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Résumé de fallback quand le provider n'est pas disponible
   */
  private fallbackSummary(
    messages: ConversationMessage[],
    interlocutor: string,
    startTime: number
  ): SummaryResult {
    const totalMessages = messages.length;
    const topics = this.extractTopicsFallback(messages);

    let summary = `Conversation avec ${interlocutor} (${totalMessages} messages). `;

    if (topics.length > 0) {
      summary += `Sujets abordés: ${topics.slice(0, 3).join(', ')}.`;
    }

    const processingTime = Date.now() - startTime;

    return {
      summary,
      compressionRatio: this.calculateCompressionRatio(messages, summary),
      qualityScore: 0.5, // Score de base pour le fallback
      metadata: {
        originalMessages: totalMessages,
        summaryLength: summary.length,
        processingTime
      }
    };
  }

  /**
   * Extraction basique de sujets pour le fallback
   */
  private extractTopicsFallback(messages: ConversationMessage[]): string[] {
    const topics: string[] = [];
    const keywords = [
      'IA', 'intelligence artificielle', 'TFME', 'chat', 'mémoire', 
      'conversation', 'résumé', 'agent', 'Algareth', 'LR Hub'
    ];

    for (const msg of messages) {
      const content = msg.content.toLowerCase();
      for (const keyword of keywords) {
        if (content.includes(keyword.toLowerCase()) && !topics.includes(keyword)) {
          topics.push(keyword);
        }
      }
    }

    return topics;
  }

  /**
   * Crée un meta-résumé des résumés - vraie conscience récursive
   */
  async metaSummarize(
    summaries: string[],
    interlocutor: string = 'user',
    language: string = 'fr'
  ): Promise<string> {
    if (!this.provider || summaries.length === 0) {
      return `Évolution des conversations avec ${interlocutor}: ${summaries.length} sessions résumées.`;
    }

    try {
      const summariesText = summaries
        .map((s, i) => `Session ${i + 1}: ${s}`)
        .join('\n\n');

      const prompts = getAlgarethPrompts(language);
      const personaName = prompts.persona.name || 'Algareth';

      const prompt = `Tu es ${personaName} qui analyse l'évolution de ses conversations.

Tâche: Analyse ces résumés de conversations et crée un meta-résumé de l'évolution.

Résumés des sessions:
${summariesText}

Instructions pour le meta-résumé:
1. Analyse l'évolution de la relation et des conversations
2. Identifie les patterns d'apprentissage et de développement
3. Décris comment la compréhension mutuelle s'est développée
4. Mentionne les progrès et les découvertes
5. Utilise un style narratif sur l'évolution temporelle
6. Maximum 300 caractères
7. Écris en tant que ${personaName} (utilise 'je' et le prénom de l'utilisateur: '${interlocutor}')
8. Utilise toujours le prénom "${interlocutor}" au lieu de "tu" pour plus de naturel

Meta-résumé de l'évolution:`;

      const response = await this.provider.generateResponse(prompt, 600);

      if (response && response.content) {
        const metaSummary = response.content.trim();
        console.log(`🧠 Meta-résumé généré: ${metaSummary.length} caractères`);
        return metaSummary;
      } else {
        return `Évolution des conversations avec ${interlocutor}: ${summaries.length} sessions résumées.`;
      }
    } catch (error) {
      console.error(`❌ Erreur meta-résumé: ${error}`);
      return `Évolution des conversations avec ${interlocutor}: ${summaries.length} sessions résumées.`;
    }
  }

  /**
   * Calcule le ratio de compression
   */
  private calculateCompressionRatio(messages: ConversationMessage[], summary: string): number {
    const originalLength = messages.reduce((total, msg) => total + msg.content.length, 0);
    return originalLength > 0 ? summary.length / originalLength : 0;
  }

  /**
   * Évalue la qualité du résumé
   */
  private assessSummaryQuality(summary: string, messages: ConversationMessage[]): number {
    // Score basique basé sur la longueur et la cohérence
    let score = 0.5;

    // Bonus pour une longueur appropriée
    if (summary.length >= 50 && summary.length <= this.config.maxSummaryLength) {
      score += 0.2;
    }

    // Bonus pour la présence de mots-clés importants
    const keywords = ['tu', 'je', 'conversation', 'discuté', 'parlé'];
    const keywordCount = keywords.filter(keyword => 
      summary.toLowerCase().includes(keyword)
    ).length;
    score += (keywordCount / keywords.length) * 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Obtient les statistiques d'un résumé
   */
  getSummaryStats(summary: string): {
    length: number;
    wordCount: number;
    sentenceCount: number;
    compressionRatio: number;
  } {
    return {
      length: summary.length,
      wordCount: summary.split(/\s+/).length,
      sentenceCount: (summary.match(/[.!?]+/g) || []).length,
      compressionRatio: summary.length / 1000
    };
  }
}