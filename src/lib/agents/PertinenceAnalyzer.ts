/**
 * Analyseur de Pertinence - Détermine quels serviteurs sont pertinents pour une question utilisateur
 * Utilise un LLM pour analyser la question et suggérer les serviteurs appropriés
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AlgarethContext } from './AlgarethAgent';

export interface ServiteurSuggestion {
  serviteur: string;
  pertinence: number; // 0-1
  raison: string;
  urgence: 'faible' | 'moyenne' | 'élevée';
}

export class PertinenceAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(geminiApiKey: string) {
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('🔍 PertinenceAnalyzer initialisé');
  }

  /**
   * Analyse une question utilisateur et détermine quels serviteurs sont pertinents
   */
  async analyzeUserQuestion(userMessage: string, context: AlgarethContext): Promise<ServiteurSuggestion[]> {
    try {
      console.log(`🔍 Analyse de pertinence pour: "${userMessage.substring(0, 50)}..."`);

      const prompt = `Tu es un analyseur de pertinence pour Algareth, un agent IA conversationnel.

QUESTION UTILISATEUR: "${userMessage}"
CONTEXTE: Session avec ${context.userName}, ${context.conversationHistory.length} messages d'historique

Détermine si ces serviteurs sont pertinents pour répondre à cette question:

1. ARCHIVISTE: Pour mémoire épisodique, patterns, relation, émotions, préférences passées
2. IMAGE_GENERATOR: Pour demandes visuelles, créatives, illustrations, génération d'images
3. RESEARCH_ASSISTANT: Pour informations factuelles, recherches, données, connaissances
4. CODE_ASSISTANT: Pour questions techniques, programmation, code, développement

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte:
{
  "suggestions": [
    {
      "serviteur": "archivist|image_generator|research_assistant|code_assistant",
      "pertinence": 0.0-1.0,
      "raison": "Explication courte de pourquoi ce serviteur est pertinent",
      "urgence": "faible|moyenne|élevée"
    }
  ]
}

CRITÈRES DE PERTINENCE:
- Pertinence > 0.7: Très pertinent, serviteur nécessaire
- Pertinence 0.4-0.7: Modérément pertinent, serviteur utile
- Pertinence < 0.4: Peu pertinent, serviteur non nécessaire

EXEMPLES:
- "Tu te souviens de mes préférences?" → archivist (0.9)
- "Génère une image de paysage" → image_generator (0.9)
- "Qu'est-ce que React?" → research_assistant (0.8)
- "Comment écrire une fonction?" → code_assistant (0.8)
- "Comment ça va?" → aucun serviteur (pertinence < 0.4)`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      // Nettoyer et parser la réponse JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const suggestions = parsed.suggestions || [];
        
        // Filtrer les suggestions avec pertinence > 0.4
        const relevantSuggestions = suggestions.filter((s: ServiteurSuggestion) => s.pertinence > 0.4);
        
        console.log(`✅ ${relevantSuggestions.length} serviteurs pertinents trouvés`);
        return relevantSuggestions;
      } else {
        throw new Error('Réponse JSON invalide');
      }
    } catch (error) {
      console.error('❌ Erreur analyse de pertinence:', error);
      // Fallback: retourner une suggestion basique pour l'archiviste
      return [{
        serviteur: 'archivist',
        pertinence: 0.5,
        raison: 'Fallback en cas d\'erreur',
        urgence: 'faible'
      }];
    }
  }

  /**
   * Analyse rapide pour déterminer si au moins un serviteur est pertinent
   */
  async hasRelevantServiteurs(userMessage: string, context: AlgarethContext): Promise<boolean> {
    const suggestions = await this.analyzeUserQuestion(userMessage, context);
    return suggestions.length > 0;
  }

  /**
   * Obtient le serviteur le plus pertinent
   */
  async getMostRelevantServiteur(userMessage: string, context: AlgarethContext): Promise<ServiteurSuggestion | null> {
    const suggestions = await this.analyzeUserQuestion(userMessage, context);
    if (suggestions.length === 0) return null;
    
    return suggestions.reduce((mostRelevant, current) => 
      current.pertinence > mostRelevant.pertinence ? current : mostRelevant
    );
  }

  /**
   * Test de l'analyseur de pertinence
   */
  async testAnalyzer(): Promise<void> {
    console.log('🧪 Test PertinenceAnalyzer');
    
    const testCases = [
      {
        message: "Tu te souviens de mes préférences en couleurs ?",
        expected: "archivist"
      },
      {
        message: "Génère une image de paysage montagneux",
        expected: "image_generator"
      },
      {
        message: "Qu'est-ce que React et comment ça marche ?",
        expected: "research_assistant"
      },
      {
        message: "Comment écrire une fonction en JavaScript ?",
        expected: "code_assistant"
      },
      {
        message: "Comment ça va ?",
        expected: null
      }
    ];

    for (const testCase of testCases) {
      const context: AlgarethContext = {
        userId: 'test_user',
        userName: 'Test User',
        currentSession: 'test_session',
        userMessage: testCase.message,
        conversationHistory: [],
        sessionStartTime: new Date().toISOString()
      };

      const suggestions = await this.analyzeUserQuestion(testCase.message, context);
      const mostRelevant = suggestions.length > 0 ? suggestions[0].serviteur : null;
      
      const success = mostRelevant === testCase.expected;
      console.log(`${success ? '✅' : '❌'} "${testCase.message}" → ${mostRelevant} (attendu: ${testCase.expected})`);
    }
  }
}