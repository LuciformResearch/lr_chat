/**
 * Orchestrateur serveur avec transmission des phases en temps réel
 * Utilise des callbacks pour notifier le client des phases
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pool } from 'pg';
import { PersonalityArchivistAgent } from './PersonalityArchivistAgent';
import { PromptEnhancerAgent } from './PromptEnhancerAgent';
import { GeminiImageProvider } from '../providers/GeminiImageProvider';
import { OrchestrationPhase } from '@/types/orchestration';

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

export interface PhaseUpdate {
  phase: OrchestrationPhase;
  progress: number;
  message: string;
  details?: string;
  timestamp: string;
}

export type PhaseCallback = (update: PhaseUpdate) => void;

export class ServerOrchestratorWithPhases {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private archivist: PersonalityArchivistAgent | null = null;
  private promptEnhancer: PromptEnhancerAgent | null = null;
  private imageProvider: GeminiImageProvider | null = null;
  private dbPool: Pool | null = null;
  private phaseCallback: PhaseCallback | null = null;

  constructor(geminiApiKey: string, dbPool?: Pool) {
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.dbPool = dbPool || null;
    
    console.log('🦋 ServerOrchestratorWithPhases initialisé');
    if (this.dbPool) {
      console.log('🗄️ Pool de base de données fourni pour l\'archiviste');
    } else {
      console.log('⚠️ Pas de pool DB - archiviste en mode fallback');
    }
  }

  /**
   * Définir le callback pour les mises à jour de phase
   */
  setPhaseCallback(callback: PhaseCallback) {
    this.phaseCallback = callback;
  }

  /**
   * Notifier une mise à jour de phase
   */
  private notifyPhase(phase: OrchestrationPhase, progress: number, message: string, details?: string) {
    if (this.phaseCallback) {
      this.phaseCallback({
        phase,
        progress,
        message,
        details,
        timestamp: new Date().toISOString()
      });
    }
    console.log(`🔄 Phase: ${phase} (${progress}%) - ${message}`);
  }

  /**
   * Initialise les agents serviteurs
   */
  async initializeServants(geminiApiKey: string): Promise<void> {
    try {
      // Initialiser l'agent archiviste avec pool DB si disponible
      const useWebMode = !this.dbPool;
      this.archivist = new PersonalityArchivistAgent(geminiApiKey, undefined, useWebMode, this.dbPool);
      console.log(`📚 Agent Archiviste initialisé`);
      
      // Initialiser le service de recherche sémantique de manière asynchrone
      if (this.dbPool && this.archivist) {
        await this.archivist.initializeSemanticSearch(geminiApiKey);
        console.log('🔍 Service de recherche sémantique activé pour l\'archiviste');
      } else {
        console.log('⚠️ Archiviste en mode fallback (pas de pool DB)');
      }

      // Initialiser l'agent prompt enhancer
      this.promptEnhancer = new PromptEnhancerAgent(geminiApiKey, true);
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
      console.log(`🦋 ServerOrchestrator analyse: "${context.userMessage.substring(0, 50)}..."`);

      // Notifier le début de l'analyse
      this.notifyPhase('orchestrator', 5, '🦋 Luciole analyse votre message...', 'Évaluation des besoins...');

      const analysisPrompt = `Tu es la Luciole, la compagne bienveillante d'Algareth. Tu décides intelligemment quand enrichir la mémoire et générer des images.

CONTEXTE:
- Message utilisateur: "${context.userMessage}"
    - Utilisateur: ${context.userName} (${(context as any).userIdentityId})
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
}

IMPORTANT POUR L'IMAGEPROMPT:
- Si tu génères un imagePrompt, retranscris simplement le message utilisateur
- Ne l'améliore PAS, ne l'embellis PAS, juste retranscris-le presque mot pour mot
- Le prompt enhancer s'occupera de l'amélioration ensuite`;

      // Notifier la progression de l'analyse
      this.notifyPhase('orchestrator', 15, '🔮 Évaluation de vos besoins...', 'Prise de décision...');

      const result = await this.model.generateContent(analysisPrompt);
      const responseText = result.response?.text()?.trim() || '';
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]);
        console.log(`🎯 Décision orchestrateur:`, decision);
        
        // Notifier la fin de l'analyse
        this.notifyPhase('orchestrator', 20, '✨ Décision prise !', `Confiance: ${Math.round(decision.confidence * 100)}%`);
        
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
        
        // Notifier le début de la recherche archiviste
        this.notifyPhase('archivist', 25, '📚 Archiviste fouille dans vos conversations...', 'Recherche sémantique...');
        
        const archivistResponse = await this.archivist.processRequest(decision.memoryQuery, {
          userId: context.userId,
          userName: context.userName,
          currentSession: context.currentSession
        });

        if (archivistResponse.success) {
          // Notifier la fin de la recherche archiviste
          this.notifyPhase('archivist', 60, '📖 Consultation des archives personnelles...', 'Informations trouvées !');
          
          const archivistMessage = archivistResponse.message;
          
          murmurs.push({
            type: 'memory',
            content: `Salut Algareth ! 📚 J'ai trouvé des informations sur ${context.userName} :\n\n${archivistMessage}\n\nUtilise ces informations pour enrichir ta réponse à ${context.userName}.`,
            data: archivistResponse,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Action 2: Générer une image si nécessaire
      if (decision.shouldGenerateImage && this.promptEnhancer && this.imageProvider && decision.imagePrompt) {
        console.log(`🎨 Génération image: "${decision.imagePrompt}"`);
        
        // Phase Prompt Enhancer
        this.notifyPhase('prompt_enhancer', 65, '🎨 Prompt Enhancer améliore votre demande...', 'Amélioration créative...');
        
        const enhancerResponse = await this.promptEnhancer.processRequest(decision.imagePrompt, {
          userId: context.userId,
          userName: context.userName,
          currentSession: context.currentSession
        });

        if (enhancerResponse.success && enhancerResponse.enhancedPrompt && this.imageProvider.isProviderAvailable()) {
          // Phase Génération d'Image
          this.notifyPhase('image_generation', 75, '🖼️ Génération de l\'image...', 'Création artistique...');
          
          const imageResponse = await this.imageProvider.generateImages({
            prompt: enhancerResponse.enhancedPrompt,
            style: 'photorealistic',
            quality: 'high',
            size: '1024x1024',
            count: 1
          });

          if (imageResponse.success && imageResponse.images) {
            console.log('🎨 Image générée avec succès:', imageResponse.images[0].url ? 'URL présente' : 'Pas d\'URL');
            
            // Notifier la fin de la génération d'image
            this.notifyPhase('image_generation', 85, '✨ Manifestation visuelle...', 'Image créée !');
            
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
   * Orchestration complète avec phases
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
