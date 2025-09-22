/**
 * Orchestrateur simplifié côté serveur
 * Utilise uniquement Google Generative AI côté serveur
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pool } from 'pg';
import { PersonalityArchivistAgent } from './PersonalityArchivistAgent';
import { PromptEnhancerAgent } from './PromptEnhancerAgent';
import { GeminiImageProvider } from '../providers/GeminiImageProvider';
import { OllamaProvider } from '../providers/OllamaProvider';

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
  userIdentityId: string;
  userName: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentSession: string;
  assistantName?: string;
  disableArchivist?: boolean;
  archivistVerbose?: 'none' | 'prompts' | 'outputs' | 'total';
  authUserId?: string;
}

export class ServerOrchestrator {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private ollamaProvider: OllamaProvider | null = null;
  private archivist: PersonalityArchivistAgent | null = null;
  private promptEnhancer: PromptEnhancerAgent | null = null;
  private imageProvider: GeminiImageProvider | null = null;
  private dbPool: Pool | null = null;
  private debugMode: boolean = false;

  constructor(geminiApiKey: string, dbPool?: Pool, debugMode: boolean = false) {
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.dbPool = dbPool || null;
    this.debugMode = debugMode;
    
    // Initialiser Ollama si en mode debug
    if (this.debugMode) {
      this.ollamaProvider = new OllamaProvider({
        model: 'gemma2:2b', // Modèle rapide pour le debug
        timeout: 10000,
        debugMode: true // Afficher les réponses complètes
      });
      console.log('🦙 ServerOrchestrator initialisé en mode debug avec Ollama');
    } else {
      console.log('🦋 ServerOrchestrator initialisé en mode production avec Gemini');
    }
    
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
      // Force le mode base de données si on a un pool DB, sinon mode web
      const useWebMode = !this.dbPool;
      
      if (this.debugMode) {
        // Mode debug : archiviste avec Ollama mais service sémantique avec Gemini
        this.archivist = new PersonalityArchivistAgent('', undefined, false, this.dbPool, true);
        console.log(`📚 Agent Archiviste initialisé en mode debug avec Ollama`);
        
        // Initialiser le service de recherche sémantique avec Gemini (pour les embeddings)
        if (this.dbPool && this.archivist) {
          await this.archivist.initializeSemanticSearch(geminiApiKey);
          console.log('🔍 Service de recherche sémantique activé pour l\'archiviste (embeddings Gemini)');
        } else {
          console.log('⚠️ Archiviste en mode fallback (pas de pool DB)');
        }
      } else {
        // Mode production : archiviste avec Gemini
        this.archivist = new PersonalityArchivistAgent(geminiApiKey, undefined, useWebMode, this.dbPool, false);
        console.log(`📚 Agent Archiviste initialisé en mode production avec Gemini`);
        
        // Initialiser le service de recherche sémantique de manière asynchrone
        if (this.dbPool && this.archivist) {
          await this.archivist.initializeSemanticSearch(geminiApiKey);
          console.log('🔍 Service de recherche sémantique activé pour l\'archiviste');
        } else {
          console.log('⚠️ Archiviste en mode fallback (pas de pool DB)');
        }
      }

      // Initialiser l'agent prompt enhancer
      if (this.debugMode) {
        // Mode debug : prompt enhancer en mode fallback
        this.promptEnhancer = new PromptEnhancerAgent('', true);
        console.log('🎨 Agent Prompt Enhancer initialisé en mode debug (fallback)');
      } else {
        // Mode production : prompt enhancer avec Gemini
        this.promptEnhancer = new PromptEnhancerAgent(geminiApiKey, true);
        console.log('🎨 Agent Prompt Enhancer initialisé en mode production');
      }

      // Initialiser le provider d'images
      if (this.debugMode) {
        // Mode debug : provider d'images en mode fallback
        this.imageProvider = new GeminiImageProvider('');
        console.log('🖼️ Provider d\'images initialisé en mode debug (fallback)');
      } else {
        // Mode production : provider d'images avec Gemini
        this.imageProvider = new GeminiImageProvider(geminiApiKey);
        console.log('🖼️ Provider d\'images initialisé en mode production');
      }

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
      console.log(`🦋 ServerOrchestrator analyse: "${context.userMessage.substring(0, 50)}..."`);

      const analysisPrompt = `Tu es la Luciole, la compagne bienveillante d'Algareth. Tu décides intelligemment quand enrichir la mémoire et générer des images.

CONTEXTE:
- Message utilisateur: "${context.userMessage}"
- Utilisateur: ${context.userName} (${context.userIdentityId})
- Historique: ${context.conversationHistory.length} messages
- Session: ${context.currentSession}

RÈGLES DE DÉCISION:

1. ENRICHISSEMENT MÉMOIRE (archiviste):
   ✅ ACTIVER si:
   - L'utilisateur demande des informations sur ses préférences passées
   - L'utilisateur mentionne des sujets discutés précédemment
   - L'utilisateur pose des questions personnelles nécessitant du contexte
   - L'utilisateur demande "tu te souviens de..." ou équivalent
   - L'utilisateur fait référence à des conversations antérieures

   ❌ NE PAS ACTIVER pour:
   - Salutations simples: "bonjour", "salut", "hello", "coucou"
   - Questions générales sans contexte personnel: "comment ça va ?", "ça va ?"
   - Demandes d'aide génériques: "aide-moi", "peux-tu m'aider ?"
   - Questions factuelles générales: "quelle heure est-il ?", "quel temps fait-il ?"
   - Demandes de création sans contexte: "écris-moi un poème", "raconte-moi une histoire"
   - Conversations de politesse: "merci", "de rien", "à bientôt"

2. GÉNÉRATION D'IMAGE (prompt enhancer):
   ✅ ACTIVER UNIQUEMENT si l'utilisateur demande explicitement une image:
   - "dessine-moi", "crée une image de", "montre-moi visuellement", "génère une illustration"
   - "peux-tu faire un dessin de", "j'aimerais voir", "montre-moi"
   
   ❌ NE PAS ACTIVER pour:
   - "c'est beau", "j'imagine", "ça ressemble à", descriptions générales
   - Demandes de texte ou d'explications
   - Si tu hésites, ne génère PAS d'image

3. PRIORITÉS:
   - Les deux peuvent être activés simultanément
   - Privilégier la pertinence sur la quantité
   - Éviter les actions inutiles
   - En cas de doute, choisir la solution la plus simple (pas d'enrichissement mémoire)

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte (pas de texte avant ou après):
{
  "shouldEnrichMemory": true/false,
  "shouldGenerateImage": true/false,
  "memoryQuery": "requête_pour_l_archiviste_ou_null",
  "imagePrompt": "prompt_pour_génération_image_ou_null",
  "reasoning": "explication_détaillée_de_la_décision",
  "confidence": 0.0-1.0
}

IMPORTANT: Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

      let responseText: string;
      
      if (this.debugMode && this.ollamaProvider) {
        // Mode debug : utiliser Ollama
        console.log('🦙 Analyse avec Ollama (mode debug)...');
        const ollamaResponse = await this.ollamaProvider.generateResponse(analysisPrompt, 1000);
        responseText = ollamaResponse.content || '';
        
        if (ollamaResponse.error) {
          console.warn('⚠️ Ollama échoué, fallback vers Gemini...');
          const result = await this.model.generateContent(analysisPrompt);
          responseText = result.response?.text()?.trim() || '';
        }
      } else {
        // Mode production : utiliser Gemini
        console.log('🔑 Analyse avec Gemini (mode production)...');
        const result = await this.model.generateContent(analysisPrompt);
        responseText = result.response?.text()?.trim() || '';
      }
      
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
      if (!context.disableArchivist && decision.shouldEnrichMemory && this.archivist && decision.memoryQuery) {
        console.log(`📚 Enrichissement mémoire: "${decision.memoryQuery}"`);
        console.log(`📚 Contexte passé à l'archiviste: userIdentityId="${(context as any).userIdentityId || (context as any).userId}", userName="${context.userName}", session="${context.currentSession}"`);
        
        const archivistResponse = await this.archivist.processRequest(decision.memoryQuery, {
          userIdentityId: (context as any).userIdentityId || (context as any).userId,
          userName: context.userName,
          currentSession: context.currentSession,
          assistantName: context.assistantName || 'Algareth',
          archivistVerbose: (context as any).archivistVerbose || process.env.ARCHIVIST_VERBOSE || 'none',
          authUserId: (context as any).authUserId
        });

        if (archivistResponse.success) {
          // Extraire les informations clés du message de l'archiviste
          const archivistMessage = archivistResponse.message;
          
          // Créer un murmure plus concis et direct
          murmurs.push({
            type: 'memory',
            content: `Salut Algareth ! 📚 J'ai trouvé des informations sur ${context.userName} :\n\n${archivistMessage}\n\nUtilise ces informations pour enrichir ta réponse à ${context.userName}.`,
            data: archivistResponse,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Action 2: Générer une image si nécessaire
      if (decision.shouldGenerateImage && this.promptEnhancer && decision.imagePrompt) {
        console.log(`🎨 Génération image: "${decision.imagePrompt}"`);
        
        // Améliorer le prompt avec l'agent prompt enhancer
        const enhancerResponse = await this.promptEnhancer.processRequest(decision.imagePrompt, {
          userIdentityId: (context as any).userIdentityId || (context as any).userId,
          userName: context.userName,
          currentSession: context.currentSession
        });

        if (enhancerResponse.success && enhancerResponse.enhancedPrompt) {
          // Mode debug : simuler la génération d'image sans vraiment l'appeler
          const isDebugMode = process.env.ORCHESTRATOR_DEBUG_MODE === 'true';
          
          if (isDebugMode) {
            console.log('🔧 Mode debug : simulation de génération d\'image (prompt enhancer fonctionne normalement)');
            console.log(`🎨 Génération d'images avec prompt: "${enhancerResponse.enhancedPrompt}"`);
            console.log(`🎨 Génération d'images réelles avec Gemini 2.5 Flash Image...`);
            console.log(`🔧 [DEBUG MODE] Simulation - pas d'appel réel à Gemini Image`);
            murmurs.push({
              type: 'image',
              content: `Salut Algareth, je suis le générateur d'images. ${context.userName} a demandé une image et j'ai créé quelque chose de joli pour toi ! 🎨\n\nPrompt amélioré: "${enhancerResponse.enhancedPrompt}"\n\n[DEBUG MODE] L'image serait générée ici sans consommer de quota.`,
              data: {
                enhancedPrompt: enhancerResponse.enhancedPrompt,
                image: {
                  url: null,
                  size: '1024x1024',
                  debug: true
                },
                improvements: enhancerResponse.improvements,
                debugMode: true
              },
              timestamp: new Date().toISOString()
            });
          } else if (this.imageProvider && this.imageProvider.isProviderAvailable()) {
            // Mode normal : générer l'image réellement
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
            }
          } else {
            console.log('⚠️ Image provider non disponible');
          }
        }
      }

      // Déterminer le type de murmure final
      if (murmurs.length === 0) {
        murmurs.push({
          type: 'none',
          content: 'Aucune action spéciale requise pour cette requête.',
          timestamp: new Date().toISOString()
        });
      } else if (murmurs.length === 1) {
        // Type déjà défini
      } else {
        // Plusieurs murmures - marquer comme 'both'
        murmurs.forEach(murmur => {
          if (murmur.type !== 'none') {
            murmur.type = 'both';
          }
        });
      }

      console.log(`🦋 ${murmurs.length} murmure(s) généré(s) pour Algareth`);
      return murmurs;

    } catch (error) {
      console.error('❌ Erreur exécution actions:', error);
      return [{
        type: 'none',
        content: `Erreur lors de l'exécution des actions: ${error}`,
        timestamp: new Date().toISOString()
      }];
    }
  }

  /**
   * Orchestration complète
   */
  async orchestrate(context: OrchestrationContext): Promise<DivineMurmur[]> {
    try {
      console.log(`🦋 ServerOrchestrator orchestration pour ${context.userName}`);
      
      // 1. Analyser et décider
      const decision = await this.analyzeAndDecide(context);
      
      // 2. Exécuter les actions
      const murmurs = await this.executeActions(decision, context);
      
      return murmurs;
    } catch (error) {
      console.error('❌ Erreur orchestration:', error);
      return [{
        type: 'none',
        content: `Erreur orchestration: ${error}`,
        timestamp: new Date().toISOString()
      }];
    }
  }
}
