/**
 * Générateur de titres automatiques pour les conversations
 * Utilise un LLM pour créer des titres intelligents basés sur le contenu
 */

import { UnifiedProviderFactory } from '@/lib/providers/UnifiedProvider';

export interface ConversationTitleRequest {
  userMessage: string;
  assistantResponse: string;
  language?: string;
}

export interface ConversationTitleResult {
  success: boolean;
  title?: string;
  error?: string;
}

export class ConversationTitleGenerator {
  private static readonly MAX_TITLE_LENGTH = 50;
  private static readonly MIN_MESSAGE_LENGTH = 10;

  /**
   * Génère un titre pour une conversation basé sur les premiers échanges
   */
  static async generateTitle(request: ConversationTitleRequest): Promise<ConversationTitleResult> {
    try {
      const { userMessage, assistantResponse, language = 'fr' } = request;

      // Vérifier que les messages sont suffisamment longs
      if (userMessage.length < this.MIN_MESSAGE_LENGTH || assistantResponse.length < this.MIN_MESSAGE_LENGTH) {
        return {
          success: false,
          error: 'Messages trop courts pour générer un titre'
        };
      }

      // Créer le prompt pour le LLM
      const prompt = this.createTitlePrompt(userMessage, assistantResponse, language);

      // Obtenir le provider unifié depuis PostgreSQL
      const provider = await UnifiedProviderFactory.createFromDatabase('system');
      if (!provider) {
        return {
          success: false,
          error: 'Provider LLM non disponible'
        };
      }

      // Générer le titre
      console.log('🤖 Appel LLM pour génération titre complet...');
      const response = await provider.generateResponse(prompt);
      
      if (!response) {
        console.error('❌ LLM Title Generation: Réponse null/undefined');
        return {
          success: false,
          error: 'Réponse LLM null/undefined'
        };
      }
      
      if (!response.content) {
        console.error('❌ LLM Title Generation: Réponse sans propriété content:', response);
        return {
          success: false,
          error: 'Réponse LLM sans propriété content'
        };
      }
      
      if (typeof response.content !== 'string') {
        console.error('❌ LLM Title Generation: Content non-string:', typeof response.content, response.content);
        return {
          success: false,
          error: `Content LLM de type invalide: ${typeof response.content}`
        };
      }
      
      if (response.content.trim().length === 0) {
        console.error('❌ LLM Title Generation: Content vide après trim');
        return {
          success: false,
          error: 'Content LLM vide après nettoyage'
        };
      }
      
      console.log('✅ LLM Title Generation: Réponse reçue:', response.content.substring(0, 100) + '...');

      // Nettoyer et valider le titre
      const cleanTitle = this.cleanTitle(response.content.trim());
      
      if (cleanTitle.length === 0) {
        return {
          success: false,
          error: 'Titre généré invalide'
        };
      }

      return {
        success: true,
        title: cleanTitle
      };

    } catch (error) {
      console.error('❌ LLM Title Generation ERROR:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userMessage: userMessage.substring(0, 50) + '...',
        assistantResponse: assistantResponse.substring(0, 50) + '...'
      });
      return {
        success: false,
        error: `Erreur LLM: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Crée le prompt pour générer un titre
   */
  private static createTitlePrompt(userMessage: string, assistantResponse: string, language: string): string {
    const languageInstructions = language === 'fr' 
      ? 'en français, de manière concise et élégante'
      : 'in English, concisely and elegantly';

    return `Tu es un assistant spécialisé dans la création de titres de conversations. 

TÂCHE: Crée un titre court et descriptif pour cette conversation ${languageInstructions}.

CONVERSATION:
Utilisateur: ${userMessage}
Assistant: ${assistantResponse}

RÈGLES:
- Maximum ${this.MAX_TITLE_LENGTH} caractères
- Titre descriptif du sujet principal
- Style élégant et mystique (pour Algareth)
- Pas de guillemets ou de ponctuation finale
- Un seul titre, pas de liste

EXEMPLES DE BONS TITRES:
- "Exploration des mystères du code"
- "Voyage dans l'univers Python"
- "Découverte des secrets de l'IA"
- "Conseils pour l'architecture logicielle"

TITRE:`;
  }

  /**
   * Nettoie et valide le titre généré
   */
  private static cleanTitle(title: string): string {
    // Supprimer les guillemets
    let cleanTitle = title.replace(/^["']|["']$/g, '');
    
    // Supprimer la ponctuation finale
    cleanTitle = cleanTitle.replace(/[.!?]+$/, '');
    
    // Supprimer les préfixes comme "Titre:" ou "Réponse:"
    cleanTitle = cleanTitle.replace(/^(titre|title|réponse|response):\s*/i, '');
    
    // Tronquer si trop long
    if (cleanTitle.length > this.MAX_TITLE_LENGTH) {
      cleanTitle = cleanTitle.substring(0, this.MAX_TITLE_LENGTH - 3) + '...';
    }
    
    // Capitaliser la première lettre
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    
    return cleanTitle.trim();
  }

  /**
   * Génère un titre de fallback si la génération LLM échoue
   */
  static generateFallbackTitle(userMessage: string, assistantResponse?: string): string {
    // Extraire les mots clés du message utilisateur
    const userWords = userMessage
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.isStopWord(word))
      .slice(0, 3);

    // Si on a une réponse de l'assistant, essayer d'extraire des mots clés
    let assistantWords: string[] = [];
    if (assistantResponse) {
      assistantWords = assistantResponse
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !this.isStopWord(word))
        .slice(0, 2);
    }

    // Combiner les mots clés les plus pertinents
    const allWords = [...userWords, ...assistantWords];
    const uniqueWords = [...new Set(allWords)].slice(0, 4);

    if (uniqueWords.length === 0) {
      return 'Nouvelle conversation';
    }

    const title = uniqueWords.join(' ');
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  /**
   * Vérifie si un mot est un mot vide (stop word)
   */
  private static isStopWord(word: string): boolean {
    const stopWords = [
      'avec', 'pour', 'dans', 'sur', 'par', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une',
      'que', 'qui', 'quoi', 'comment', 'pourquoi', 'quand', 'où', 'salut', 'bonjour', 'merci',
      'peux', 'peut', 'peuvent', 'aide', 'aider', 'test', 'petit', 'grand', 'nouveau', 'nouvelle'
    ];
    return stopWords.includes(word);
  }

  /**
   * Génère un titre avec un appel LLM simplifié (fallback rapide)
   */
  static async generateSimpleTitle(userMessage: string, language: string = 'fr'): Promise<string> {
    try {
      // Créer un prompt plus simple pour un appel LLM rapide
      const prompt = `Crée un titre court et descriptif (max 40 caractères) ${language === 'fr' ? 'en français' : 'in English'} pour cette conversation.

Message: "${userMessage}"

Règles:
- Maximum 40 caractères
- Titre descriptif du sujet principal
- Pas de guillemets ou ponctuation finale
- Un seul titre

Titre:`;

      const provider = await UnifiedProviderFactory.createFromDatabase('system');
      if (!provider) {
        console.error('❌ LLM Simple Title: Provider non disponible');
        return this.generateFallbackTitle(userMessage);
      }

      console.log('🤖 Appel LLM pour génération titre simple...');
      const response = await provider.generateResponse(prompt);
      
      if (!response) {
        console.error('❌ LLM Simple Title: Réponse null/undefined');
        return this.generateFallbackTitle(userMessage);
      }
      
      if (!response.content) {
        console.error('❌ LLM Simple Title: Réponse sans propriété content:', response);
        return this.generateFallbackTitle(userMessage);
      }
      
      if (typeof response.content !== 'string') {
        console.error('❌ LLM Simple Title: Content non-string:', typeof response.content, response.content);
        return this.generateFallbackTitle(userMessage);
      }
      
      if (response.content.trim().length === 0) {
        console.error('❌ LLM Simple Title: Content vide après trim');
        return this.generateFallbackTitle(userMessage);
      }
      
      console.log('✅ LLM Simple Title: Réponse reçue:', response.content.substring(0, 50) + '...');

      const cleanTitle = this.cleanTitle(response.content.trim());
      return cleanTitle.length > 0 ? cleanTitle : this.generateFallbackTitle(userMessage);

    } catch (error) {
      console.error('❌ LLM Simple Title ERROR:', error);
      console.error('❌ Simple Title Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userMessage: userMessage.substring(0, 50) + '...'
      });
      return this.generateFallbackTitle(userMessage);
    }
  }

  /**
   * Teste le générateur de titres
   */
  static async testTitleGenerator(): Promise<void> {
    console.log('🧪 Test ConversationTitleGenerator');
    
    const testCases = [
      {
        userMessage: "Salut Algareth, peux-tu m'aider à comprendre les bases de React ?",
        assistantResponse: "Salut voyageur de l'ombre ! React, cette bibliothèque mystique qui transforme le DOM en une danse d'éléments... Laisse-moi t'initier à ses secrets.",
        expectedPattern: /react|comprendre|aide/i
      },
      {
        userMessage: "Comment optimiser les performances d'une application Node.js ?",
        assistantResponse: "Ah, l'art de l'optimisation ! Node.js, comme un orchestre, chaque instrument doit jouer sa partition parfaitement...",
        expectedPattern: /optimiser|performance|node/i
      }
    ];

    for (const testCase of testCases) {
      try {
        const result = await this.generateTitle(testCase);
        
        if (result.success && result.title) {
          const matches = testCase.expectedPattern.test(result.title);
          console.log(`✅ "${testCase.userMessage.substring(0, 30)}..." → "${result.title}" (${matches ? 'MATCH' : 'NO MATCH'})`);
        } else {
          console.log(`❌ "${testCase.userMessage.substring(0, 30)}..." → FAILED: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ "${testCase.userMessage.substring(0, 30)}..." → ERROR: ${error}`);
      }
    }
  }
}