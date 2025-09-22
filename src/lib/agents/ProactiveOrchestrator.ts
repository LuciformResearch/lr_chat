/**
 * Orchestrateur Proactif - Coordonne les serviteurs pour murmurer à Algareth
 * Analyse les questions utilisateur et active les serviteurs pertinents
 */

import { PertinenceAnalyzer, ServiteurSuggestion } from './PertinenceAnalyzer';
import { ServiteurAgent, ServiteurMurmur } from './ServiteurMurmur';
import { AlgarethContext } from './AlgarethAgent';
import { AgentManager } from './AgentManager';
import { PersonalityArchivistAgent } from './PersonalityArchivistAgent';

export class ProactiveOrchestrator {
  private pertinenceAnalyzer: PertinenceAnalyzer;
  private serviteurs: Map<string, ServiteurAgent> = new Map();
  private agentManager: AgentManager;
  private isInitialized: boolean = false;
  private personalityArchivist: PersonalityArchivistAgent;

  constructor(geminiApiKey: string, agentManager: AgentManager, dataDir?: string) {
    this.pertinenceAnalyzer = new PertinenceAnalyzer(geminiApiKey);
    this.agentManager = agentManager;
    this.personalityArchivist = new PersonalityArchivistAgent(geminiApiKey, dataDir);
    console.log('🎭 ProactiveOrchestrator initialisé');
  }

  /**
   * Initialise l'orchestrateur et enregistre les serviteurs
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initialisation de l\'orchestrateur proactif...');

      // Enregistrer les serviteurs disponibles
      await this.registerAvailableServiteurs();

      this.isInitialized = true;
      console.log('✅ Orchestrateur proactif initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation orchestrateur proactif:', error);
      throw error;
    }
  }

  /**
   * Enregistre les serviteurs disponibles
   */
  private async registerAvailableServiteurs(): Promise<void> {
    // Pour l'instant, on se concentre sur l'archiviste
    // Les autres serviteurs seront ajoutés dans les phases suivantes
    
    console.log('📚 Enregistrement des serviteurs...');
    
    // L'archiviste sera enregistré via l'extension de l'ArchivistAgent
    // Les autres serviteurs seront ajoutés progressivement
    
    console.log(`✅ ${this.serviteurs.size} serviteurs enregistrés`);
  }

  /**
   * Enregistre un serviteur
   */
  registerServiteur(serviteur: ServiteurAgent): void {
    this.serviteurs.set(serviteur.getName(), serviteur);
    console.log(`📝 Serviteur "${serviteur.getName()}" enregistré`);
  }

  /**
   * Traite un message utilisateur et prépare les murmures des serviteurs pertinents
   */
  async processUserMessage(userMessage: string, context: AlgarethContext): Promise<ServiteurMurmur[]> {
    if (!this.isInitialized) {
      throw new Error('Orchestrateur proactif non initialisé');
    }

    try {
      console.log(`🎭 Traitement proactif du message: "${userMessage.substring(0, 50)}..."`);

      // 1. Analyser la pertinence des serviteurs
      const suggestions = await this.pertinenceAnalyzer.analyzeUserQuestion(userMessage, context);
      
      if (suggestions.length === 0) {
        console.log('🔍 Aucun serviteur pertinent trouvé');
        return [];
      }

      console.log(`🔍 ${suggestions.length} serviteurs pertinents trouvés`);

      // 2. Préparer les murmures des serviteurs pertinents
      const murmurs: ServiteurMurmur[] = [];
      
      for (const suggestion of suggestions) {
        if (suggestion.pertinence > 0.6) { // Seuil de pertinence élevé
          const serviteur = this.serviteurs.get(suggestion.serviteur);
          if (serviteur) {
            try {
              const murmur = await serviteur.prepareMurmur(userMessage, context, suggestion);
              murmurs.push(murmur);
              console.log(`✅ Murmur de ${suggestion.serviteur} préparé`);
            } catch (error) {
              console.error(`❌ Erreur préparation murmur ${suggestion.serviteur}:`, error);
            }
          } else {
            console.warn(`⚠️ Serviteur "${suggestion.serviteur}" non trouvé`);
          }
        } else {
          console.log(`⏭️ Serviteur "${suggestion.serviteur}" ignoré (pertinence: ${suggestion.pertinence})`);
        }
      }

      console.log(`🎉 ${murmurs.length} murmurs préparés`);
      return murmurs;

    } catch (error) {
      console.error('❌ Erreur traitement proactif:', error);
      return [];
    }
  }

  /**
   * Obtient les murmures formatés pour Algareth
   */
  async getFormattedMurmurs(userMessage: string, context: AlgarethContext): Promise<string> {
    try {
      // Utiliser directement l'archiviste avec personnalité
      const archivistResponse = await this.personalityArchivist.processRequest(userMessage, context);
      
      if (!archivistResponse.success || !archivistResponse.message) {
        return '';
      }

      // Formater la réponse de l'archiviste pour Algareth
      return `CONTEXTE ENRICHI PAR TES SERVITEURS:\n\n${archivistResponse.message}\n\n`;
    } catch (error) {
      console.error('❌ Erreur obtention murmures archiviste:', error);
      return '';
    }
  }

  /**
   * Obtient les statistiques de l'orchestrateur
   */
  getStats(): {
    isInitialized: boolean;
    registeredServiteurs: string[];
    totalMurmurs: number;
    averageProcessingTime: number;
  } {
    return {
      isInitialized: this.isInitialized,
      registeredServiteurs: Array.from(this.serviteurs.keys()),
      totalMurmurs: 0, // TODO: Implémenter le comptage
      averageProcessingTime: 0 // TODO: Implémenter le calcul
    };
  }

  /**
   * Teste l'orchestrateur avec des cas de test
   */
  async testOrchestrator(): Promise<void> {
    console.log('🧪 Test ProactiveOrchestrator');
    
    const testCases = [
      {
        message: "Tu te souviens de mes préférences en couleurs ?",
        expectedServiteurs: ['archivist']
      },
      {
        message: "Comment ça va ?",
        expectedServiteurs: []
      },
      {
        message: "Génère une image de paysage",
        expectedServiteurs: ['image_generator']
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

      const murmurs = await this.processUserMessage(testCase.message, context);
      const actualServiteurs = murmurs.map(m => m.serviteur);
      
      const success = JSON.stringify(actualServiteurs.sort()) === JSON.stringify(testCase.expectedServiteurs.sort());
      console.log(`${success ? '✅' : '❌'} "${testCase.message}" → ${actualServiteurs.join(', ')} (attendu: ${testCase.expectedServiteurs.join(', ')})`);
    }
  }

  /**
   * Vide l'historique des murmures (pour les tests)
   */
  clearHistory(): void {
    console.log('🧹 Historique des murmures vidé');
  }
}