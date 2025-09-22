/**
 * Agent Luciole - Compagne bienveillante d'Algareth
 * Décide intelligemment quand enrichir la mémoire et générer des images
 * Murmure doucement des suggestions à Algareth pour enrichir ses réponses
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { PersonalityArchivistAgent } from './PersonalityArchivistAgent';
import { PromptEnhancerAgent } from './PromptEnhancerAgent';
import { GeminiImageProvider } from '../providers/GeminiImageProvider';
import { Pool } from 'pg';

export interface DivineDecision {
  shouldEnrichMemory: boolean;
  shouldGenerateImage: boolean;
  memoryQuery?: string;
  imagePrompt?: string;
  reasoning: string;
  confidence: number;
}

export interface DivineMurmur {
  type: 'memory' | 'image' | 'both' | 'none';
  content: string;
  data?: any;
  timestamp: string;
}

export interface OrchestrationContext {
  userMessage: string;
  userId: string;
  userName: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentSession: string;
}

export class Luciole {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private archivist: PersonalityArchivistAgent | null = null;
  private promptEnhancer: PromptEnhancerAgent | null = null;
  private imageProvider: GeminiImageProvider | null = null;
  private isWebMode: boolean;
  private dbPool: Pool | null = null;

  constructor(geminiApiKey: string, isWebMode?: boolean, dbPool?: Pool) {
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.isWebMode = isWebMode !== undefined ? isWebMode : typeof window !== 'undefined';
    this.dbPool = dbPool || null;
    
    console.log('🦋 Agent Luciole initialisé');
    if (this.dbPool) {
      console.log('🗄️ Pool de base de données fourni pour l\'archiviste');
    } else {
      console.log('⚠️ Pas de pool DB - archiviste en mode fallback');
    }
  }

  /**
   * Initialise les agents serviteurs
   */
  async initializeServants(geminiApiKey: string): Promise<void> {
    try {
      // Initialiser l'agent archiviste avec pool DB si disponible
      this.archivist = new PersonalityArchivistAgent(geminiApiKey, undefined, this.isWebMode, this.dbPool);
      console.log(`📚 Agent Archiviste initialisé en mode ${this.archivist['isWebMode'] ? 'web' : 'fichier'}`);
      if (this.dbPool) {
        console.log('🔍 Service de recherche sémantique activé pour l\'archiviste');
      } else {
        console.log('⚠️ Archiviste en mode fallback (pas de pool DB)');
      }

      // Initialiser l'agent prompt enhancer
      this.promptEnhancer = new PromptEnhancerAgent(geminiApiKey, this.isWebMode);
      console.log('🎨 Agent Prompt Enhancer initialisé');

      // Initialiser le provider d'images
      this.imageProvider = new GeminiImageProvider(geminiApiKey);
      console.log('🖼️ Provider d\'images initialisé');

      console.log('✅ Tous les serviteurs sont prêts à aider Algareth');
    } catch (error) {
      console.error('❌ Erreur initialisation serviteurs:', error);
      throw error;
    }
  }

  /**
   * Analyse la requête utilisateur et décide des actions proactives
   */
  async analyzeAndDecide(context: OrchestrationContext): Promise<DivineDecision> {
    try {
      console.log(`🦋 Luciole analyse: "${context.userMessage.substring(0, 50)}..."`);

      const analysisPrompt = `Tu es la Luciole, la compagne bienveillante d'Algareth. Tu décides intelligemment quand enrichir la mémoire et générer des images.

CONTEXTE:
- Message utilisateur: "${context.userMessage}"
- Utilisateur: ${context.userName} (${context.userId})
- Historique: ${context.conversationHistory.length} messages
- Session: ${context.currentSession}

RÈGLES DE DÉCISION:

1. ENRICHISSEMENT MÉMOIRE (archiviste):
   - Si l'utilisateur demande des informations sur ses préférences passées
   - Si l'utilisateur mentionne des sujets discutés précédemment
   - Si l'utilisateur pose des questions personnelles nécessitant du contexte
   - Si l'utilisateur demande "tu te souviens de..." ou équivalent

2. GÉNÉRATION D'IMAGE (prompt enhancer):
   - Si l'utilisateur décrit une image qu'il veut voir
   - Si l'utilisateur demande "montre-moi", "dessine", "crée une image"
   - Si l'utilisateur décrit quelque chose de visuel
   - Si l'utilisateur demande une illustration ou visualisation

3. PRIORITÉS:
   - Les deux peuvent être activés simultanément
   - Privilégier la pertinence sur la quantité
   - Éviter les actions inutiles

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte:
{
  "shouldEnrichMemory": true/false,
  "shouldGenerateImage": true/false,
  "memoryQuery": "requête_pour_l_archiviste_ou_null",
  "imagePrompt": "prompt_pour_génération_image_ou_null",
  "reasoning": "explication_détaillée_de_la_décision",
  "confidence": 0.0-1.0
}`;

      const result = await this.model.generateContent(analysisPrompt);
      const responseText = result.response?.text()?.trim() || '';
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]);
        console.log(`🎯 Décision orchestrateur:`, decision);
        return decision;
      } else {
        throw new Error('Réponse JSON invalide de l\'orchestrateur');
      }
    } catch (error) {
      console.error('❌ Erreur analyse orchestrateur:', error);
      // Fallback: décision conservatrice
      return {
        shouldEnrichMemory: false,
        shouldGenerateImage: false,
        reasoning: 'Erreur d\'analyse - décision conservatrice',
        confidence: 0.1
      };
    }
  }

  /**
   * Exécute les actions décidées et génère les murmures
   */
  async executeActions(decision: DivineDecision, context: OrchestrationContext): Promise<DivineMurmur[]> {
    const murmurs: DivineMurmur[] = [];

    try {
      // Action 1: Enrichir la mémoire si nécessaire
      if (decision.shouldEnrichMemory && this.archivist && decision.memoryQuery) {
        console.log(`📚 Enrichissement mémoire: "${decision.memoryQuery}"`);
        
        const archivistResponse = await this.archivist.processRequest(decision.memoryQuery, {
          userId: context.userId,
          userName: context.userName,
          currentSession: context.currentSession
        });

        if (archivistResponse.success) {
          murmurs.push({
            type: 'memory',
            content: `Salut Algareth, je suis l'archiviste. J'ai gentiment exploré mes archives concernant "${decision.memoryQuery}" et j'ai trouvé des informations intéressantes pour ${context.userName} ! 📚\n\n${archivistResponse.message}\n\nPeut-être que ces informations pourront t'aider à mieux répondre ?`,
            data: archivistResponse,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Action 2: Générer une image si nécessaire
      if (decision.shouldGenerateImage && this.promptEnhancer && this.imageProvider && decision.imagePrompt) {
        console.log(`🎨 Génération image: "${decision.imagePrompt}"`);
        
        // Améliorer le prompt avec l'agent prompt enhancer
        const enhancerResponse = await this.promptEnhancer.processRequest(decision.imagePrompt, {
          userId: context.userId,
          userName: context.userName,
          currentSession: context.currentSession
        });

        if (enhancerResponse.success && enhancerResponse.enhancedPrompt && this.imageProvider.isProviderAvailable()) {
          // Générer l'image avec le prompt amélioré
          const imageResponse = await this.imageProvider.generateImages({
            prompt: enhancerResponse.enhancedPrompt,
            style: 'photorealistic',
            quality: 'high',
            size: '1024x1024',
            count: 1
          });

          if (imageResponse.success && imageResponse.images) {
            console.log('🎨 Image générée avec succès:', imageResponse.images[0].url ? 'URL présente' : 'Pas d\'URL');
            murmurs.push({
              type: 'image',
              content: `Salut Algareth, je suis le générateur d'images. ${context.userName} a demandé une image et j'ai créé quelque chose de joli pour toi ! 🎨\n\nPrompt amélioré: "${enhancerResponse.enhancedPrompt}"\n\nL'image est prête et peut être téléchargée. Peut-être qu'elle pourra enrichir ta réponse ?`,
              data: {
                enhancedPrompt: enhancerResponse.enhancedPrompt,
                image: imageResponse.images[0],
                improvements: enhancerResponse.improvements
              },
              timestamp: new Date().toISOString()
            });
          } else {
            console.log('❌ Échec génération image:', imageResponse.error);
          }
        }
      }

      // Déterminer le type de murmure combiné
      let murmurType: 'memory' | 'image' | 'both' | 'none' = 'none';
      if (murmurs.length === 2) murmurType = 'both';
      else if (murmurs.length === 1) murmurType = murmurs[0].type;

      // Si on a plusieurs murmures, les combiner
      if (murmurs.length > 1) {
        const combinedContent = murmurs.map(m => m.content).join('\n\n---\n\n');
        murmurs.splice(0, murmurs.length, {
          type: murmurType,
          content: combinedContent,
          data: murmurs.reduce((acc, m) => ({ ...acc, ...m.data }), {}),
          timestamp: new Date().toISOString()
        });
      }

      console.log(`🦋 ${murmurs.length} murmure(s) généré(s) pour Algareth`);
      return murmurs;

    } catch (error) {
      console.error('❌ Erreur exécution actions:', error);
      return [];
    }
  }

  /**
   * Processus complet: analyse, décision et exécution
   */
  async orchestrate(context: OrchestrationContext): Promise<DivineMurmur[]> {
    try {
      // 1. Analyser et décider
      const decision = await this.analyzeAndDecide(context);
      
      // 2. Exécuter les actions et générer les murmures
      const murmurs = await this.executeActions(decision, context);
      
      return murmurs;
    } catch (error) {
      console.error('❌ Erreur orchestration:', error);
      return [];
    }
  }

  /**
   * Teste l'orchestrateur
   */
  async testOrchestrator(): Promise<void> {
    console.log('🧪 Test DivineOrchestrator');
    
    const testContext: OrchestrationContext = {
      userMessage: "Tu te souviens de mes préférences en couleurs ? Et peux-tu créer une image d'un chat ?",
      userId: 'lucie',
      userName: 'Lucie',
      conversationHistory: [],
      currentSession: 'test_orchestrator'
    };

    try {
      const murmurs = await this.orchestrate(testContext);
      console.log(`✅ Test orchestrateur: ${murmurs.length} murmure(s) généré(s)`);
      
      murmurs.forEach((murmur, index) => {
        console.log(`📢 Murmur ${index + 1} (${murmur.type}):`, murmur.content.substring(0, 100) + '...');
      });
    } catch (error) {
      console.error('❌ Erreur test orchestrateur:', error);
    }
  }
}