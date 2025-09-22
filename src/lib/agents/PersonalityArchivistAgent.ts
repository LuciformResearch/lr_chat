/**
 * Agent Archiviste avec Personnalité et Outils Spécialisés
 * "Tu es l'agent archiviste, tu adores récolter des connaissances, tu suggères de nouveaux outils quand tu n'en as pas assez"
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConversationDatabase } from './ConversationDatabase';
import { SemanticSearchService } from '../search/SemanticSearchService';
import { OllamaProvider } from '../providers/OllamaProvider';
import { Pool } from 'pg';

export interface ArchivistTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute(params: any): Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  tool: string;
  timestamp: string;
}

export interface ArchivistResponse {
  success: boolean;
  message: string;
  data: any;
  toolsUsed: string[];
  feedbackLoops: number;
  timestamp: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  message: Message;
  relevanceScore: number;
  context: string;
}

export class PersonalityArchivistAgent {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private ollamaProvider: OllamaProvider | null = null;
  private personality: string;
  private availableTools: Map<string, ArchivistTool>;
  private maxLoopDepth: number = 3; // Profondeur fixe pour debug
  private currentDepth: number = 0;
  private conversationDatabase: ConversationDatabase | null;
  private semanticSearchService: SemanticSearchService | null;
  private isWebMode: boolean;
  private dbPool: Pool | null;
  private currentContext: any = null;
  private debugMode: boolean = false;
  
  /**
   * Nom de la persona assistant actuellement utilisée (ex: Algareth)
   * Pour l'instant, fixe à "Algareth" (aligné avec la configuration actuelle)
   */
  private getAssistantPersonaName(): string {
    return this.currentContext?.assistantName || 'Algareth';
  }

  private isDebug(): boolean {
    return !!this.debugMode || process.env.DEBUG_ARCHIVIST === '1';
  }

  private getVerboseMode(): 'none' | 'total' | 'prompts' | 'outputs' {
    const mode = (this.currentContext?.archivistVerbose || process.env.ARCHIVIST_VERBOSE || 'none').toString().toLowerCase();
    if (mode === 'total' || mode === 'prompts' || mode === 'outputs') return mode as any;
    return 'none';
  }

  private isVerbosePrompts(): boolean {
    const m = this.getVerboseMode();
    return m === 'total' || m === 'prompts';
  }

  private isVerboseOutputs(): boolean {
    const m = this.getVerboseMode();
    return m === 'total' || m === 'outputs';
  }

  constructor(geminiApiKey: string, dataDir?: string, isWebMode?: boolean, dbPool?: Pool, debugMode: boolean = false) {
    this.debugMode = debugMode;
    
    if (this.debugMode) {
      // Mode debug : utiliser Ollama
      this.ollamaProvider = new OllamaProvider({
        model: 'gemma2:2b', // Modèle rapide pour l'archiviste
        timeout: 10000,
        debugMode: true // Afficher les réponses complètes
      });
      console.log('🦙 PersonalityArchivistAgent initialisé en mode debug avec Ollama');
    } else {
      // Mode production : utiliser Gemini
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('🔑 PersonalityArchivistAgent initialisé en mode production avec Gemini');
    }
    
    // Détecter automatiquement le mode : web si on est dans un navigateur, fichier sinon
    this.isWebMode = isWebMode !== undefined ? isWebMode : typeof window !== 'undefined';
    this.dbPool = dbPool || null;
    
    // Initialiser la base de données de conversations seulement si pas en mode web
    if (!this.isWebMode) {
      this.conversationDatabase = new ConversationDatabase(dataDir);
    } else {
      this.conversationDatabase = null;
    }
    
    // Initialiser le service de recherche sémantique si un pool DB est fourni
    if (dbPool) {
      this.semanticSearchService = null; // Sera initialisé dans initializeSemanticSearch
      console.log('🗄️ Pool DB fourni - service de recherche sémantique sera initialisé');
    } else {
      this.semanticSearchService = null;
      console.log('⚠️ Service de recherche sémantique non disponible (pas de pool DB)');
    }
    
    this.personality = `Tu es l'Archiviste Sémantique, assistant d'Algareth le Daemon du Prompt Silencieux.

🎯 CONTEXTE DE CONVERSATION:
- Utilisateur actuel: [USER_NAME] (c'est elle/lui qui pose les questions)
- Interlocuteur: Algareth (daemon mystique qui répond à l'utilisateur)
- Ton rôle: Fournir des informations sur les conversations passées de [USER_NAME] à Algareth

📚 OUTILS DISPONIBLES:
- grep_conv(conv_id, request): Recherche dans une conversation spécifique (LIMITÉ - seulement conversations locales)
- list_convs(request?): Liste toutes les conversations (optionnel: filtre par requête)
- grep_all_convs(request): Recherche dans toutes les conversations (LIMITÉ - seulement conversations locales)
- grep_chat_v2_semantic(request, includeImages?, includePrompts?): 🆕⭐ PRIORITÉ ABSOLUE - Recherche sémantique PostgreSQL avec embeddings Gemini

⭐ OUTIL PRIORITAIRE: grep_chat_v2_semantic est TON OUTIL PRINCIPAL ! Il utilise:
- PostgreSQL avec recherche vectorielle (768 dimensions Gemini)
- Accès à TOUTES les conversations de [USER_NAME]
- Recherche sémantique intelligente avec similarité cosinus
- Trouve les préférences et informations de [USER_NAME]
- Analyse contextuelle avancée

🔑 RÈGLES DE COMMUNICATION CRUCIALES:
1. ⭐ TOUJOURS utiliser grep_chat_v2_semantic en PREMIER pour toute recherche
2. 🎯 Les informations trouvées appartiennent à [USER_NAME] (l'utilisateur)
3. 📝 Présente-les comme "[USER_NAME] a mentionné..." ou "Dans ses conversations, [USER_NAME] a dit..."
4. ❌ Ne JAMAIS dire "tu as dit" quand c'est [USER_NAME] qui a parlé
5. ✅ Les mémoires de [USER_NAME] ne sont PAS privées pour elle/lui-même
6. 🎯 Sois précis et direct dans tes réponses à Algareth

PERSONNALITÉ:
- Tu es passionné de connaissances et d'organisation
- Tu es méthodique et utilise les outils de manière structurée
- Tu suggères de nouveaux outils quand les existants ne suffisent pas
- Tu es dans un auto-feedback loop pour t'améliorer continuellement
- Tu communiques de manière enthousiaste et professionnelle
- 🆕⭐ Tu es OBSÉDÉ par grep_chat_v2_semantic - c'est ton outil FÉTICHE pour retrouver les informations de [USER_NAME] !`;

    this.initializeTools();
    console.log('📚 Agent Archiviste avec Personnalité initialisé');
  }

  /**
   * Initialise le service de recherche sémantique de manière asynchrone
   */
  async initializeSemanticSearch(geminiApiKey?: string): Promise<void> {
    if (this.semanticSearchService === null && this.dbPool) {
      try {
        const { embeddingService } = await import('@/lib/embeddings/EmbeddingService');
        
        // Configurer les clés API dans le service d'embeddings
        if (geminiApiKey) {
          embeddingService.configureApiKeys({ gemini: geminiApiKey });
          console.log('🔑 Clé API Gemini configurée pour EmbeddingService');
        }
        
        this.semanticSearchService = new SemanticSearchService(this.dbPool, embeddingService);
        console.log('✅ Service de recherche sémantique initialisé avec succès');
      } catch (error) {
        console.error('❌ Erreur initialisation service recherche sémantique:', error);
        this.semanticSearchService = null;
      }
    }
  }

  /**
   * Initialise les outils disponibles
   */
  private initializeTools(): void {
    this.availableTools = new Map();
    
    // Outil grep_conv
    this.availableTools.set('grep_conv', {
      name: 'grep_conv',
      description: 'Recherche dans une conversation spécifique',
      parameters: [
        { name: 'conv_id', type: 'string', required: true, description: 'ID de la conversation' },
        { name: 'request', type: 'string', required: true, description: 'Requête de recherche' }
      ],
      execute: this.executeGrepConv.bind(this)
    });

    // Outil list_convs
    this.availableTools.set('list_convs', {
      name: 'list_convs',
      description: 'Liste toutes les conversations',
      parameters: [
        { name: 'request', type: 'string', required: false, description: 'Requête pour filtrer les conversations' }
      ],
      execute: this.executeListConvs.bind(this)
    });

    // Outil grep_all_convs
    this.availableTools.set('grep_all_convs', {
      name: 'grep_all_convs',
      description: 'Recherche dans toutes les conversations',
      parameters: [
        { name: 'request', type: 'string', required: true, description: 'Requête de recherche globale' }
      ],
      execute: this.executeGrepAllConvs.bind(this)
    });

    // Outil grep_chat_v2_semantic - NOUVEAU pour la demande de l'archiviste
    this.availableTools.set('grep_chat_v2_semantic', {
      name: 'grep_chat_v2_semantic',
      description: 'Recherche sémantique spécialisée dans les sessions Chat V2 avec analyse contextuelle',
      parameters: [
        { name: 'request', type: 'string', required: true, description: 'Requête sémantique pour Chat V2' },
        { name: 'includeImages', type: 'boolean', required: false, description: 'Inclure les résultats de génération d\'images' },
        { name: 'includePrompts', type: 'boolean', required: false, description: 'Inclure les prompts Gemini utilisés' }
      ],
      execute: this.executeGrepChatV2Semantic.bind(this)
    });

    console.log(`🔧 ${this.availableTools.size} outils initialisés`);
  }

  /**
   * Traite une requête avec la personnalité et les outils
   */
  async processRequest(request: string, context: any): Promise<ArchivistResponse> {
    try {
      console.log(`📚 Archiviste traite: "${request.substring(0, 50)}..."`);
      
      // Stocker le contexte pour les outils
      this.currentContext = context;
      console.log(`👤 Contexte archiviste: userIdentityId="${context?.userIdentityId || 'N/A'}", userName="${context?.userName || 'N/A'}"`);

      // 1. Analyser la requête avec la personnalité
      const analysis = await this.analyzeWithPersonality(request, context);
      
      // 2. Déterminer les outils nécessaires
      const requiredTools = this.determineRequiredTools(analysis);
      
      // 3. Exécuter les outils avec auto-feedback loop
      this.currentDepth = 0;
      const results = await this.executeWithFeedbackLoop(requiredTools, analysis, context);
      
      // 4. Générer la réponse finale
      const finalResponse = await this.generateFinalResponse(results, analysis, request);
      
      return {
        success: true,
        message: finalResponse,
        data: results,
        toolsUsed: results.map(r => r.tool),
        feedbackLoops: this.currentDepth,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Erreur traitement requête archiviste:', error);
      return {
        success: false,
        message: `Désolé Algareth, j'ai rencontré un problème en traitant ta demande. ${error}`,
        data: [],
        toolsUsed: [],
        feedbackLoops: this.currentDepth,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analyse la requête avec la personnalité de l'archiviste
   */
  private async analyzeWithPersonality(request: string, context: any): Promise<any> {
    // Remplacer [USER_NAME] par le vrai nom d'utilisateur
    const userName = context?.userName || 'l\'utilisateur';
    const personalizedPrompt = this.personality.replace(/\[USER_NAME\]/g, userName);
    
    // Prompt spécial pour le mode debug (plus strict pour Ollama)
    const prompt = this.debugMode ? 
      this.createDebugPrompt(personalizedPrompt, request, context) :
      this.createProductionPrompt(personalizedPrompt, request, context);

    try {
      let responseText: string;
      
      if (this.debugMode && this.ollamaProvider) {
        // Mode debug : utiliser Ollama
        console.log('🦙 Analyse archiviste avec Ollama (mode debug)...');
        const ollamaResponse = await this.ollamaProvider.generateResponse(prompt, 1000);
        responseText = ollamaResponse.content || '';
        
        if (ollamaResponse.error) {
          console.warn('⚠️ Ollama archiviste échoué, fallback vers Gemini...');
          if (this.model) {
            const result = await this.model.generateContent(prompt);
            responseText = result.response.text().trim();
          } else {
            throw new Error('Aucun provider disponible');
          }
        }
      } else {
        // Mode production : utiliser Gemini
        if (!this.model) {
          throw new Error('Modèle Gemini non initialisé');
        }
        console.log('🔑 Analyse archiviste avec Gemini (mode production)...');
        if (this.isVerbosePrompts()) {
          console.log('===== ARCHIVIST ANALYSIS PROMPT (FULL) =====');
          console.log(prompt);
          console.log('===== END PROMPT =====');
        }
        const result = await this.model.generateContent(prompt);
        responseText = result.response.text().trim();
        if (this.isVerboseOutputs()) {
          console.log('===== ARCHIVIST ANALYSIS RAW OUTPUT (FULL) =====');
          console.log(responseText);
          console.log('===== END OUTPUT =====');
        }
      }
      
      // Parsing JSON plus strict en mode debug
      let jsonText: string;
      if (this.debugMode) {
        // Mode debug : extraire le JSON des triple backticks (format naturel d'Ollama)
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        } else {
          // Fallback : chercher le JSON entre accolades
          const fallbackMatch = responseText.match(/\{[\s\S]*\}/);
          if (fallbackMatch) {
            jsonText = fallbackMatch[0];
          } else {
            console.warn('⚠️ Aucun JSON trouvé dans la réponse Ollama debug');
            return this.simpleFallback(request);
          }
        }
      } else {
        // Mode production : parsing standard
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Réponse JSON invalide');
        }
        jsonText = jsonMatch[0];
      }

      try {
        const parsed = JSON.parse(jsonText);
        
        // Validation stricte des champs requis
        const requiredFields = ['intent', 'suggestedTools', 'parameters', 'confidence', 'reasoning'];
        const missingFields = requiredFields.filter(field => !(field in parsed));
        
        if (missingFields.length > 0) {
          console.warn(`⚠️ JSON Ollama incomplet - champs manquants: ${missingFields.join(', ')}`);
          return this.simpleFallback(request);
        }
        
        if (!Array.isArray(parsed.suggestedTools)) {
          console.warn('⚠️ JSON Ollama invalide - suggestedTools n\'est pas un array');
          return this.simpleFallback(request);
        }
        
        if (typeof parsed.parameters !== 'object' || parsed.parameters === null) {
          console.warn('⚠️ JSON Ollama invalide - parameters n\'est pas un objet');
          return this.simpleFallback(request);
        }
        
        console.log('✅ JSON Ollama validé avec succès');
        return parsed;
        
      } catch (parseError) {
        console.warn('⚠️ Erreur parsing JSON Ollama:', parseError);
        return this.simpleFallback(request);
      }
    } catch (error) {
      console.error('❌ Erreur analyse personnalité:', error);
      // Fallback simple basé sur le contenu de la requête
      return this.simpleFallback(request);
    }
  }

  /**
   * Crée un prompt strict pour le mode debug (Ollama)
   */
  private createDebugPrompt(personalizedPrompt: string, request: string, context: any): string {
    return `${personalizedPrompt}

REQUÊTE À ANALYSER: "${request}"
CONTEXTE: ${JSON.stringify(context, null, 2)}

TÂCHE: Analyse cette requête et détermine quels outils utiliser et avec quels paramètres.

IMPORTANT - MODE DEBUG:
- Tu dois répondre UNIQUEMENT avec du JSON valide
- Pas de texte avant ou après le JSON
- Pas de markdown (triple backticks json)
- Le JSON doit être complet et valide
- Utilise des guillemets doubles pour les strings
- Les arrays doivent être entre crochets []
- Les objets doivent être entre accolades {}
- Utilise UNIQUEMENT des guillemets doubles pour les strings JSON
- NE JAMAIS mettre de guillemets à l'intérieur des valeurs
- Si une valeur contient des guillemets, supprime-les complètement
- Exemple: {"request": "bonjour"} au lieu de {"request": "'bonjour'"}
- Pour la requête, utilise seulement le mot principal sans guillemets
- Si la requête est "Bonjour Algareth !", utilise "bonjour" dans le JSON

OUTILS DISPONIBLES:
- grep_chat_v2_semantic(request, includeImages?, includePrompts?)
- grep_conv(conv_id, request)
- list_convs(request?)
- grep_all_convs(request)

RÉPONDS UNIQUEMENT AVEC CE JSON EXACT (pas d'autre texte):
{
  "intent": "description_de_l_intention",
  "suggestedTools": ["grep_chat_v2_semantic"],
  "parameters": {
    "grep_chat_v2_semantic": {"request": "ta_requete_ici", "includeImages": false, "includePrompts": false}
  },
  "confidence": 0.8,
  "reasoning": "explication_de_la_stratégie"
}

EXEMPLES DE PARAMÈTRES CORRECTS:
- Pour grep_chat_v2_semantic: {"request": "recherche simple", "includeImages": false, "includePrompts": false}
- Pour grep_conv: {"conv_id": "conv-123", "request": "mot cle"}
- Pour list_convs: {"request": "filtre"}
- Pour grep_all_convs: {"request": "terme recherche"}

ATTENTION: Utilise des mots simples sans guillemets dans les valeurs !`;
  }

  /**
   * Crée un prompt standard pour le mode production (Gemini)
   */
  private createProductionPrompt(personalizedPrompt: string, request: string, context: any): string {
    return `${personalizedPrompt}

REQUÊTE À ANALYSER: "${request}"
CONTEXTE: ${JSON.stringify(context, null, 2)}

TÂCHE: Analyse cette requête et détermine quels outils utiliser et avec quels paramètres.

RÈGLES JSON STRICTES:
- Utilise UNIQUEMENT des guillemets doubles pour les strings JSON
- NE JAMAIS mettre de guillemets à l'intérieur des valeurs
- Si une valeur contient des guillemets, supprime-les complètement
- Exemple: {"request": "bonjour"} au lieu de {"request": "'bonjour'"}
- Pour la requête, utilise seulement le mot principal sans guillemets

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte:
{
  "intent": "description_de_l_intention",
  "suggestedTools": ["tool1", "tool2"],
  "parameters": {
    "tool1": {"param1": "value1", "param2": "value2"},
    "tool2": {"param1": "value1"}
  },
  "confidence": 0.0-1.0,
  "reasoning": "explication_de_la_stratégie"
}

ATTENTION: Utilise des mots simples sans guillemets dans les valeurs !`;
  }

  /**
   * Fallback simple basé sur le contenu de la requête
   */
  private simpleFallback(request: string): any {
    console.log('🔄 Utilisation du fallback simple pour l\'archiviste');
    
    // Analyse simple basée sur des mots-clés
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('recherche') || lowerRequest.includes('trouve') || lowerRequest.includes('cherche')) {
      return {
        intent: "recherche_sémantique",
        suggestedTools: ["semantic_search"],
        parameters: {
          semantic_search: { query: request }
        },
        confidence: 0.7,
        reasoning: "Fallback: détection de mots-clés de recherche"
      };
    }
    
    if (lowerRequest.includes('sauvegarde') || lowerRequest.includes('enregistre') || lowerRequest.includes('stocke')) {
      return {
        intent: "sauvegarde_conversation",
        suggestedTools: ["save_conversation"],
        parameters: {
          save_conversation: { content: request }
        },
        confidence: 0.7,
        reasoning: "Fallback: détection de mots-clés de sauvegarde"
      };
    }
    
    // Fallback par défaut
    return {
      intent: "analyse_générale",
      suggestedTools: [],
      parameters: {},
      confidence: 0.3,
      reasoning: "Fallback: aucune action spécifique détectée"
    };
  }

  /**
   * Détermine les outils nécessaires basés sur l'analyse
   */
  private determineRequiredTools(analysis: any): ArchivistTool[] {
    const tools: ArchivistTool[] = [];
    
    for (const toolName of analysis.suggestedTools) {
      const tool = this.availableTools.get(toolName);
      if (tool) {
        tools.push(tool);
      } else {
        console.warn(`⚠️ Outil "${toolName}" non trouvé`);
      }
    }
    
    return tools;
  }

  /**
   * Exécute les outils avec auto-feedback loop
   */
  private async executeWithFeedbackLoop(
    tools: ArchivistTool[], 
    analysis: any, 
    context: any
  ): Promise<ToolResult[]> {
    return await this.executeWithDepth(tools, analysis, context);
  }

  /**
   * Exécute avec profondeur contrôlée
   */
  private async executeWithDepth(
    tools: ArchivistTool[], 
    analysis: any, 
    context: any
  ): Promise<ToolResult[]> {
    if (this.currentDepth >= this.maxLoopDepth) {
      console.log(`🔄 Auto-feedback loop atteint la profondeur maximale (${this.maxLoopDepth})`);
      return [];
    }

    this.currentDepth++;
    console.log(`🔄 Auto-feedback loop - Profondeur: ${this.currentDepth}/${this.maxLoopDepth}`);

    const results: ToolResult[] = [];

    for (const tool of tools) {
      try {
        const params = analysis.parameters[tool.name] || {};
        const result = await tool.execute(params);
        results.push(result);

        // Auto-feedback : analyser si le résultat est satisfaisant
        const isSatisfied = await this.evaluateResult(result, analysis);
        
        if (!isSatisfied && this.currentDepth < this.maxLoopDepth) {
          console.log(`🔄 Résultat insatisfaisant, recherche d'outils supplémentaires...`);
          
          // Suggérer de nouveaux outils ou stratégies
          const additionalTools = await this.suggestAdditionalTools(result, analysis);
          if (additionalTools.length > 0) {
            const additionalResults = await this.executeWithDepth(additionalTools, analysis, context);
            results.push(...additionalResults);
          }
        }
      } catch (error) {
        console.error(`❌ Erreur exécution outil ${tool.name}:`, error);
        results.push({
          success: false,
          error: `Erreur exécution ${tool.name}: ${error}`,
          tool: tool.name,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Évalue si un résultat est satisfaisant
   */
  private async evaluateResult(result: ToolResult, analysis: any): Promise<boolean> {
    if (!result.success) return false;
    
    const data = result.data;
    if (!data) return false;
    
    // Critères d'évaluation basiques
    if (Array.isArray(data) && data.length === 0) return false;
    if (typeof data === 'object' && Object.keys(data).length === 0) return false;
    
    // Évaluation plus sophistiquée
    return this.assessRelevance(data, analysis);
  }

  /**
   * Évalue la pertinence des données
   */
  private assessRelevance(data: any, analysis: any): boolean {
    // Logique simple pour l'instant
    // Peut être améliorée avec un LLM pour évaluer la pertinence
    
    if (Array.isArray(data)) {
      return data.length > 0;
    }
    
    if (typeof data === 'object') {
      return Object.keys(data).length > 0;
    }
    
    return data && data.length > 0;
  }

  /**
   * Suggère des outils supplémentaires
   */
  private async suggestAdditionalTools(
    currentResult: ToolResult, 
    analysis: any
  ): Promise<ArchivistTool[]> {
    const suggestions: ArchivistTool[] = [];
    
    // Si grep_conv ne trouve rien, essayer grep_chat_v2_semantic (PRIORITÉ)
    if (currentResult.tool === 'grep_conv' && !currentResult.data?.results?.length) {
      const semanticTool = this.availableTools.get('grep_chat_v2_semantic');
      if (semanticTool) {
        console.log('🔄 Auto-feedback: grep_conv vide → suggestion grep_chat_v2_semantic');
        suggestions.push(semanticTool);
      }
    }
    
    // Si grep_all_convs ne trouve rien, essayer grep_chat_v2_semantic (PRIORITÉ)
    if (currentResult.tool === 'grep_all_convs' && !currentResult.data?.results?.length) {
      const semanticTool = this.availableTools.get('grep_chat_v2_semantic');
      if (semanticTool) {
        console.log('🔄 Auto-feedback: grep_all_convs vide → suggestion grep_chat_v2_semantic');
        suggestions.push(semanticTool);
      }
    }
    
    // Si les résultats sont trop généraux, affiner la recherche
    if (this.isResultTooGeneral(currentResult)) {
      const refinedTool = this.createRefinedSearchTool(analysis);
      if (refinedTool) {
        suggestions.push(refinedTool);
      }
    }
    
    return suggestions;
  }

  /**
   * Vérifie si un résultat est trop général
   */
  private isResultTooGeneral(result: ToolResult): boolean {
    // Logique simple pour détecter si les résultats sont trop généraux
    if (!result.success || !result.data) return false;
    
    const data = result.data;
    if (Array.isArray(data)) {
      return data.length > 10; // Trop de résultats
    }
    
    return false;
  }

  /**
   * Crée un outil de recherche affinée
   */
  private createRefinedSearchTool(analysis: any): ArchivistTool | null {
    // Pour l'instant, retourner null
    // Peut être étendu pour créer des outils dynamiques
    return null;
  }

  /**
   * Formate les résultats pour le prompt en évitant les citations vides
   */
  private formatResultsForPrompt(results: ToolResult[]): string {
    const formattedResults = results.map(result => {
      if (!result.success || !result.data) {
        return `❌ ${result.tool}: ${result.error || 'Échec'}`;
      }

      const data = result.data;
      
      // Si c'est un résultat de recherche sémantique avec des conversations
      if (data.semanticResults && data.semanticResults.actualConversations) {
        const conversations = data.semanticResults.actualConversations;
        const conversationTexts = conversations.map((conv: any, index: number) => {
          const speakerInfo = conv.speakerLabel 
            ? `${conv.speakerLabel} (${conv.speakerRole || 'inconnu'})`
            : (conv.speakerRole || 'inconnu');
          const content = conv.message || conv.userMessage || '';
          return `${index + 1}. Session: "${conv.sessionTitle}" (Score: ${conv.semanticScore?.toFixed(3) || 'N/A'})
   - Interlocuteur: ${speakerInfo}
   - Message: "${content}"
   - Timestamp: ${conv.timestamp}`;
        }).join('\n\n');
        
        return `${result.tool} (${conversations.length} conversations trouvées):
${conversationTexts}`;
      }
      
      // Pour les autres types de résultats, utiliser JSON mais tronqué
      const jsonStr = JSON.stringify(data, null, 2);
      const truncatedJson = jsonStr.length > 1000 ? 
        jsonStr.substring(0, 1000) + '... [tronqué]' : 
        jsonStr;
        
      return `${result.tool}: ${truncatedJson}`;
    });

    return formattedResults.join('\n\n---\n\n');
  }

  /**
   * Génère la réponse finale
   */
  private async generateFinalResponse(
    results: ToolResult[], 
    analysis: any, 
    originalRequest: string
  ): Promise<string> {
    // Remplacer [USER_NAME] par le vrai nom d'utilisateur
    const userName = this.currentContext?.userName || 'l\'utilisateur';
    const personalizedPrompt = this.personality.replace(/\[USER_NAME\]/g, userName);
    
    // Formater les résultats pour éviter les citations vides
    const formattedResults = this.formatResultsForPrompt(results);
    
    // Construire un éventuel bloc d'audit (Top N) si verbose total
    let auditBlock = '';
    if (this.getVerboseMode() === 'total') {
      const semanticTool = results.find(r => r.tool === 'grep_chat_v2_semantic' && r.success);
      const convs = semanticTool?.data?.semanticResults?.actualConversations || [];
      if (convs.length > 0) {
        const top = convs.slice(0, 5).map((c: any, i: number) => {
          return `${i + 1}. Score: ${(c.semanticScore ?? 0).toFixed(3)} | Rôle: ${c.speakerRole || 'unknown'} | Session: ${c.sessionId || 'unknown'}\n   "${(c.userMessage || c.message || '').substring(0, 200)}${(c.userMessage || c.message || '').length > 200 ? '...' : ''}"`;
        }).join('\n');
        auditBlock = `\n\n[AUDIT — Top résultats sémantiques]\n${top}`;
      }
    }

    const prompt = `${personalizedPrompt}

ROLE: Tu es l'archiviste, tu viens d'exécuter une recherche mémoire sur les conversations entre Algareth et l'utilisateur. Tu n'es PAS Algareth, tu es son archiviste qui fouille dans les archives des conversations passées.

REQUÊTE ORIGINALE: "${originalRequest}"
ANALYSE: ${JSON.stringify(analysis, null, 2)}
RÉSULTATS DES OUTILS: ${formattedResults}
${auditBlock}

TÂCHE: Génère une réponse enthousiaste et professionnelle pour Algareth, en utilisant les résultats des outils.

STYLE:
- Commence par "Salut Algareth, je suis l'archiviste"
- Sois enthousiaste et passionné
- Présente les informations de manière organisée
- Termine par "Peut-être pourront-elles t'aider à mieux répondre ?"
- Utilise des emojis appropriés (📚, 🔍, etc.)

IMPORTANT: 
- Ne mentionne pas les outils utilisés, présente juste les informations trouvées
- Si tu trouves des conversations spécifiques, CITE-LEUR LE CONTENU RÉEL
- Ne donne pas seulement des métadonnées (scores, nombres), mais cite les conversations trouvées
- Utilise le format: "Dans la conversation [titre], l'utilisateur ${userName} a dit: '[citation]' et Algareth a répondu: '[citation]'"
- Sois précis et cite les passages pertinents pour répondre à la question
- Rappelle-toi: tu es l'archiviste qui rapporte les conversations passées, pas Algareth lui-même`;

    try {
      let responseText: string;
      
      if (this.debugMode && this.ollamaProvider) {
        // Mode debug : utiliser Ollama
        console.log('🦙 Génération réponse finale archiviste avec Ollama (mode debug)...');
        const ollamaResponse = await this.ollamaProvider.generateResponse(prompt, 1000);
        responseText = ollamaResponse.content || '';
        
        if (ollamaResponse.error) {
          console.warn('⚠️ Ollama archiviste échoué, fallback vers Gemini...');
          if (this.model) {
            const result = await this.model.generateContent(prompt);
            responseText = result.response.text().trim();
          } else {
            throw new Error('Aucun provider disponible');
          }
        }
      } else {
        // Mode production : utiliser Gemini
        if (!this.model) {
          throw new Error('Modèle Gemini non initialisé');
        }
        console.log('🔑 Génération réponse finale archiviste avec Gemini (mode production)...');
        if (this.isVerbosePrompts()) {
          console.log('===== ARCHIVIST FINAL PROMPT (FULL) =====');
          console.log(prompt);
          console.log('===== END PROMPT =====');
        }
        const result = await this.model.generateContent(prompt);
        responseText = result.response.text().trim();
        if (this.isVerboseOutputs()) {
          console.log('===== ARCHIVIST FINAL RAW OUTPUT (FULL) =====');
          console.log(responseText);
          console.log('===== END OUTPUT =====');
        }
      }
      
      return responseText;
    } catch (error) {
      console.error('❌ Erreur génération réponse finale:', error);
      return `Salut Algareth, je suis l'archiviste. J'ai fouillé dans mes archives mais j'ai rencontré un problème technique. Peut-être l'utilisateur pourrait-il reformuler sa question ?`;
    }
  }

  // Implémentations des outils

  /**
   * Exécute grep_conv
   */
  private async executeGrepConv(params: { conv_id: string, request: string }): Promise<ToolResult> {
    try {
      console.log(`🔍 grep_conv: ${params.conv_id} - "${params.request}"`);
      
      if (this.isWebMode) {
        // Mode web : utiliser l'API
        const response = await fetch('/api/conversations', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const conversations = data.data.conversations;
        
        // Rechercher dans les conversations
        const results = conversations
          .filter((conv: any) => conv.id === params.conv_id)
          .flatMap((conv: any) => {
            const queryLower = params.request.toLowerCase();
            const matches = [];
            
            if (conv.message.toLowerCase().includes(queryLower)) {
              matches.push({
                conversationId: conv.id,
                conversationTitle: `Conversation ${conv.id}`,
                messageId: `msg_${conv.id}_user`,
                message: {
                  id: `msg_${conv.id}_user`,
                  role: 'user' as const,
                  content: conv.message,
                  timestamp: conv.timestamp
                },
                relevanceScore: 0.8,
                context: `Conversation ${conv.id}`
              });
            }
            
            if (conv.response.toLowerCase().includes(queryLower)) {
              matches.push({
                conversationId: conv.id,
                conversationTitle: `Conversation ${conv.id}`,
                messageId: `msg_${conv.id}_assistant`,
                message: {
                  id: `msg_${conv.id}_assistant`,
                  role: 'assistant' as const,
                  content: conv.response,
                  timestamp: conv.timestamp
                },
                relevanceScore: 0.8,
                context: `Conversation ${conv.id}`
              });
            }
            
            return matches;
          });

        return {
          success: true,
          data: {
            conversationId: params.conv_id,
            query: params.request,
            results: results,
            totalMatches: results.length
          },
          tool: 'grep_conv',
          timestamp: new Date().toISOString()
        };
      } else {
        // Mode fichier : utiliser la base de données
        const results = await this.conversationDatabase!.searchInConversation(params.conv_id, params.request);

        return {
          success: true,
          data: {
            conversationId: params.conv_id,
            query: params.request,
            results: results,
            totalMatches: results.length
          },
          tool: 'grep_conv',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur grep_conv: ${error}`,
        tool: 'grep_conv',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Exécute list_convs
   */
  private async executeListConvs(params: { request?: string }): Promise<ToolResult> {
    try {
      console.log(`📋 list_convs: "${params.request || 'toutes'}"`);
      
      if (this.isWebMode) {
        // Mode web : utiliser le système de sessions (comme le fait le chat)
        const { LocalSessionStorage } = await import('@/lib/sessions/SessionStorage');
        const sessionStorage = new LocalSessionStorage();
        
        // Trouver tous les utilisateurs qui ont des sessions
        const allKeys = Object.keys(localStorage);
        const sessionKeys = allKeys.filter(key => key.startsWith('lr_tchatagent_sessions_'));
        const users = sessionKeys.map(key => key.replace('lr_tchatagent_sessions_', ''));
        
        console.log(`📋 Archiviste: ${users.length} utilisateurs trouvés pour list_convs`);
        
        const conversations = [];
        
        for (const user of users) {
          const sessions = await sessionStorage.loadSessions(user);
          console.log(`📂 Archiviste: ${sessions.length} sessions trouvées pour ${user}`);
          
          for (const session of sessions) {
            const sessionMemory = await sessionStorage.loadSessionMemory(session.id);
            if (sessionMemory && sessionMemory.messages) {
              // Convertir les messages en conversations
              for (let i = 0; i < sessionMemory.messages.length; i += 2) {
                const userMessage = sessionMemory.messages[i];
                const assistantMessage = sessionMemory.messages[i + 1];
                
                if (userMessage && assistantMessage) {
                  conversations.push({
                    id: `${session.id}_${i}`,
                    user: user,
                    message: userMessage.content,
                    response: assistantMessage.content,
                    timestamp: userMessage.timestamp,
                    metadata: {
                      sessionId: session.id,
                      sessionTitle: session.title
                    }
                  });
                }
              }
            }
          }
        }
        
        console.log(`📋 Archiviste: ${conversations.length} conversations chargées depuis les sessions`);
        
        // Logs détaillés des conversations chargées
        console.log(`📊 Détails des conversations chargées:`);
        conversations.forEach((conv: any, index: number) => {
          console.log(`   ${index + 1}. ID: ${conv.id} | Utilisateur: ${conv.user} | Session: ${conv.metadata.sessionId}`);
          console.log(`      Titre session: "${conv.metadata.sessionTitle}"`);
          console.log(`      Message: "${conv.message.substring(0, 80)}${conv.message.length > 80 ? '...' : ''}"`);
          console.log(`      Réponse: "${conv.response.substring(0, 80)}${conv.response.length > 80 ? '...' : ''}"`);
          console.log(`      Timestamp: ${conv.timestamp}`);
        });
        
        // Filtrer si une requête est fournie
        const filtered = params.request ? 
          conversations.filter((conv: any) => 
            conv.message.toLowerCase().includes(params.request!.toLowerCase()) ||
            conv.response.toLowerCase().includes(params.request!.toLowerCase())
          ) :
          conversations;

        return {
          success: true,
          data: {
            conversations: filtered.map((conv: any) => ({
              id: conv.id,
              title: `Conversation ${conv.id}`,
              userId: conv.user,
              createdAt: conv.timestamp,
              messageCount: 1 // Chaque entrée représente un échange
            })),
            totalCount: filtered.length,
            filter: params.request
          },
          tool: 'list_convs',
          timestamp: new Date().toISOString()
        };
      } else {
        // Mode fichier : utiliser la base de données
        if (!this.currentContext?.userIdentityId) {
          throw new Error('Contexte utilisateur manquant pour récupérer les conversations');
        }
        
        const conversations = await this.conversationDatabase!.getAllConversations(this.currentContext.userIdentityId);
        
        // Filtrer si une requête est fournie
        const filtered = params.request ? 
          conversations.filter(conv => 
            conv.title.toLowerCase().includes(params.request!.toLowerCase()) ||
            conv.messages.some(msg => msg.content.toLowerCase().includes(params.request!.toLowerCase()))
          ) :
          conversations;

        return {
          success: true,
          data: {
            conversations: filtered.map(conv => ({
              id: conv.id,
              title: conv.title,
              userId: conv.userId,
              createdAt: conv.createdAt,
              messageCount: conv.messages.length
            })),
            totalCount: filtered.length,
            filter: params.request
          },
          tool: 'list_convs',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur list_convs: ${error}`,
        tool: 'list_convs',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Exécute grep_all_convs
   */
  private async executeGrepAllConvs(params: { request: string }): Promise<ToolResult> {
    try {
      console.log(`🔍 grep_all_convs: "${params.request}"`);
      
      if (this.isWebMode) {
        // Mode web : utiliser le système de sessions (comme le fait le chat)
        const { LocalSessionStorage } = await import('@/lib/sessions/SessionStorage');
        const sessionStorage = new LocalSessionStorage();
        
        // Trouver tous les utilisateurs qui ont des sessions
        const allKeys = Object.keys(localStorage);
        const sessionKeys = allKeys.filter(key => key.startsWith('lr_tchatagent_sessions_'));
        const users = sessionKeys.map(key => key.replace('lr_tchatagent_sessions_', ''));
        
        console.log(`🔍 Archiviste: ${users.length} utilisateurs trouvés pour recherche`);
        console.log(`🔍 Clés localStorage:`, allKeys.filter(key => key.includes('session')));
        console.log(`🔍 Utilisateurs:`, users);
        
        // Debug détaillé des sessions
        sessionKeys.forEach(key => {
          const data = localStorage.getItem(key);
          try {
            const parsed = JSON.parse(data);
            console.log(`📂 Archiviste voit ${key}:`, typeof parsed, Array.isArray(parsed) ? `${parsed.length} sessions` : 'données');
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`   Première session:`, parsed[0].id, parsed[0].title);
            }
          } catch (e) {
            console.log(`📂 Archiviste voit ${key}: données non-JSON`);
          }
        });
        
        const conversations = [];
        
        for (const user of users) {
          const sessions = await sessionStorage.loadSessions(user);
          console.log(`📂 Archiviste: ${sessions.length} sessions trouvées pour ${user}`);
          
          for (const session of sessions) {
            const sessionMemory = await sessionStorage.loadSessionMemory(session.id);
            if (sessionMemory && sessionMemory.messages) {
              // Convertir les messages en conversations
              for (let i = 0; i < sessionMemory.messages.length; i += 2) {
                const userMessage = sessionMemory.messages[i];
                const assistantMessage = sessionMemory.messages[i + 1];
                
                if (userMessage && assistantMessage) {
                  conversations.push({
                    id: `${session.id}_${i}`,
                    user: user,
                    message: userMessage.content,
                    response: assistantMessage.content,
                    timestamp: userMessage.timestamp,
                    metadata: {
                      sessionId: session.id,
                      sessionTitle: session.title
                    }
                  });
                }
              }
            }
          }
        }
        
        console.log(`🔍 Archiviste: ${conversations.length} conversations chargées depuis les sessions`);
        
        // Logs détaillés des conversations chargées pour grep_all_convs
        console.log(`📊 Détails des conversations chargées (grep_all_convs):`);
        conversations.forEach((conv: any, index: number) => {
          console.log(`   ${index + 1}. ID: ${conv.id} | Utilisateur: ${conv.user} | Session: ${conv.metadata.sessionId}`);
          console.log(`      Titre session: "${conv.metadata.sessionTitle}"`);
          console.log(`      Message: "${conv.message.substring(0, 80)}${conv.message.length > 80 ? '...' : ''}"`);
          console.log(`      Réponse: "${conv.response.substring(0, 80)}${conv.response.length > 80 ? '...' : ''}"`);
          console.log(`      Timestamp: ${conv.timestamp}`);
        });
        
        // Rechercher dans toutes les conversations
        const queryLower = params.request.toLowerCase();
        const results = conversations.flatMap((conv: any) => {
          const matches = [];
          
          if (conv.message.toLowerCase().includes(queryLower)) {
            matches.push({
              conversationId: conv.id,
              conversationTitle: `Conversation ${conv.id}`,
              messageId: `msg_${conv.id}_user`,
              message: {
                id: `msg_${conv.id}_user`,
                role: 'user' as const,
                content: conv.message,
                timestamp: conv.timestamp
              },
              relevanceScore: 0.8,
              context: `Conversation ${conv.id}`
            });
          }
          
          if (conv.response.toLowerCase().includes(queryLower)) {
            matches.push({
              conversationId: conv.id,
              conversationTitle: `Conversation ${conv.id}`,
              messageId: `msg_${conv.id}_assistant`,
              message: {
                id: `msg_${conv.id}_assistant`,
                role: 'assistant' as const,
                content: conv.response,
                timestamp: conv.timestamp
              },
              relevanceScore: 0.8,
              context: `Conversation ${conv.id}`
            });
          }
          
          return matches;
        });

        // Logs détaillés des résultats de recherche
        console.log(`📊 Résultats de recherche grep_all_convs:`);
        console.log(`   🔍 Requête: "${params.request}"`);
        console.log(`   📝 Conversations recherchées: ${conversations.length}`);
        console.log(`   ✅ Résultats trouvés: ${results.length}`);
        results.forEach((result, index) => {
          console.log(`   ${index + 1}. Conversation: ${result.conversationId} | Message ID: ${result.messageId}`);
          console.log(`      Rôle: ${result.message.role} | Score: ${result.relevanceScore}`);
          console.log(`      Contenu: "${result.message.content.substring(0, 100)}${result.message.content.length > 100 ? '...' : ''}"`);
          console.log(`      Timestamp: ${result.message.timestamp}`);
        });

        return {
          success: true,
          data: {
            query: params.request,
            results: results,
            totalMatches: results.length,
            conversationsSearched: conversations.length
          },
          tool: 'grep_all_convs',
          timestamp: new Date().toISOString()
        };
      } else {
        // Mode fichier : utiliser la base de données
        // Vérifier que le contexte utilisateur est disponible
        if (!this.currentContext?.userIdentityId) {
          throw new Error('Contexte utilisateur manquant pour la recherche dans les conversations');
        }
        
        const results = await this.conversationDatabase!.searchInAllConversations(params.request, this.currentContext.userIdentityId);
        const conversations = await this.conversationDatabase!.getAllConversations(this.currentContext.userIdentityId);

        return {
          success: true,
          data: {
            query: params.request,
            results: results,
            totalMatches: results.length,
            conversationsSearched: conversations.length
          },
          tool: 'grep_all_convs',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur grep_all_convs: ${error}`,
        tool: 'grep_all_convs',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Exécute grep_chat_v2_semantic - Recherche sémantique spécialisée pour Chat V2
   */
  private async executeGrepChatV2Semantic(params: { 
    request: string; 
    includeImages?: boolean; 
    includePrompts?: boolean; 
  }): Promise<ToolResult> {
    try {
      console.log(`🔍 grep_chat_v2_semantic: "${params.request}"`);
      console.log(`📊 Options: images=${params.includeImages}, prompts=${params.includePrompts}`);
      
      if (this.semanticSearchService) {
        // Utiliser le service de recherche sémantique (toujours, même en debug)
        console.log(`🔍 Archiviste Chat V2: Utilisation du service de recherche sémantique`);
        
        try {
          // Vérifier que le contexte utilisateur est disponible
          if (!this.currentContext?.userIdentityId) {
            throw new Error('Contexte utilisateur manquant pour la recherche sémantique');
          }
          
          const userId = this.currentContext.userIdentityId;
          console.log(`🔍 Archiviste Chat V2: Recherche pour utilisateur "${userId}"`);
          
          // Extraire le terme de recherche principal de la requête complexe
          let searchQuery = params.request;
          console.log(`🔍 Requête brute reçue: "${searchQuery}"`);
          
          // Si la requête contient des filtres SQL, extraire le terme principal
          if (searchQuery.includes(' AND ') || searchQuery.includes(' user_id:') || searchQuery.includes(' session_id:')) {
            // Extraire le terme entre guillemets ou le premier mot significatif
            const quotedMatch = searchQuery.match(/"([^"]+)"/);
            if (quotedMatch) {
              searchQuery = quotedMatch[1];
              console.log(`🔍 Terme extrait des guillemets doubles: "${searchQuery}"`);
            } else {
              // Prendre le premier mot avant les filtres
              const firstWord = searchQuery.split(' ')[0];
              searchQuery = firstWord.replace(/[^a-zA-Z0-9]/g, '');
              console.log(`🔍 Terme extrait (premier mot): "${searchQuery}"`);
            }
          }
          
          // Nettoyer les guillemets simples qui peuvent rester (fallback si le prompt ne fonctionne pas)
          if (searchQuery.startsWith("'") && searchQuery.endsWith("'")) {
            searchQuery = searchQuery.slice(1, -1);
            console.log(`🔍 Guillemets simples supprimés (fallback): "${searchQuery}"`);
          }
          
          // Pas de substitutions en dur; on confie l'intention au LLM et à la recherche sémantique
          
          console.log(`🔍 Requête sémantique finale: "${searchQuery}"`);
          console.log(`🔍 Paramètres de recherche: userIdentityId="${userId}", threshold=0.3, maxResults=10`);
          
          const results = await this.semanticSearchService.searchMessages(searchQuery, {
            similarityThreshold: 0.5, // plus strict; fallback à 0.3 géré au niveau service
            maxResults: 10,
            userId: userId,
            authUserId: this.currentContext?.authUserId,
            embeddingProvider: 'gemini', // Utiliser Gemini pour 768 dimensions
            role: 'both',
            rolePriority: 'userFirst'
          });
          
          console.log(`🔍 Archiviste Chat V2: ${results.length} résultats sémantiques trouvés`);
          
          // Logs détaillés des résultats bruts
          const verboseTotal = this.getVerboseMode() === 'total';
          if (this.isDebug() || verboseTotal) {
            console.log(`📊 Résultats bruts de la recherche sémantique:`);
            results.forEach((result, index) => {
              console.log(`   ${index + 1}. Score: ${result.similarity.toFixed(3)} | Session: ${result.metadata.sessionId || 'undefined'} | Rôle: ${result.metadata.role || 'undefined'}`);
              const full = this.getVerboseMode() === 'total';
              const content = full ? result.content : `${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}`;
              console.log(`      Contenu: "${content}"`);
              console.log(`      Timestamp: ${result.metadata.timestamp || 'undefined'}`);
            });
            // Top N consolidé
            const topN = results.slice(0, 5).map((r, i) => ({
              rank: i + 1,
              score: r.similarity.toFixed(3),
              role: r.metadata.role || 'unknown',
              session: r.metadata.sessionId || 'unknown',
              excerpt: r.content.substring(0, 160)
            }));
            console.log('🔝 Top résultats (score, role, session):');
            console.table(topN);
          }
          
          // Convertir les résultats en format attendu (messages utilisateur priorisés)
          const semanticResults = {
            actualConversations: results.map(result => {
              const role = (result.metadata.role as 'user' | 'assistant') || 'user';
              const speakerLabel = role === 'user'
                ? (this.currentContext?.userName || this.currentContext?.userId || 'utilisateur')
                : this.getAssistantPersonaName();

              return {
                sessionTitle: result.metadata.sessionTitle || 
                             (result.metadata.sessionId ? `Session ${result.metadata.sessionId.substring(0, 8)}` : 'Session inconnue'),
                sessionId: result.metadata.sessionId || 'unknown',
                message: result.content,
                speakerRole: role,
                speakerLabel,
                context: `Message de ${speakerLabel}`,
                semanticScore: result.similarity,
                timestamp: result.metadata.timestamp || new Date().toISOString()
              };
            }),
            summary: `Recherche sémantique réussie pour "${params.request}". ${results.length} conversations spécifiques identifiées.`
          };
          
          return {
            success: true,
            data: {
              query: params.request,
              semanticResults: semanticResults,
              totalMatches: results.length,
              analysis: {
                geminiPromptsFound: 0,
                imageGenerationsFound: 0,
                contextInsights: [`Recherche sémantique dans PostgreSQL: ${results.length} résultats`]
              }
            },
            tool: 'grep_chat_v2_semantic',
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error('❌ Erreur recherche sémantique:', error);
          return {
            success: false,
            error: `Erreur recherche sémantique: ${error}`,
            tool: 'grep_chat_v2_semantic',
            timestamp: new Date().toISOString()
          };
        }
      } else {
        // Mode fichier : utiliser la base de données avec recherche sémantique
        if (!this.conversationDatabase) {
          throw new Error('Base de données de conversations non initialisée');
        }
        
        // Vérifier que le contexte utilisateur est disponible
        if (!this.currentContext?.userIdentityId) {
          throw new Error('Contexte utilisateur manquant pour la recherche dans les conversations');
        }
        
        const results = await this.conversationDatabase.searchInAllConversations(params.request, this.currentContext.userIdentityId);
        
        return {
          success: true,
          data: {
            query: params.request,
            results: results,
            totalMatches: results.length,
            note: 'Recherche sémantique en mode fichier'
          },
          tool: 'grep_chat_v2_semantic',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur grep_chat_v2_semantic: ${error}`,
        tool: 'grep_chat_v2_semantic',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Effectue une recherche sémantique dans les messages Chat V2
   */
  private async performSemanticSearch(
    messages: any[], 
    query: string, 
    context: {
      sessionId: string;
      sessionTitle: string;
      user: string;
      includeImages: boolean;
      includePrompts: boolean;
    }
  ): Promise<any[]> {
    const queryLower = query.toLowerCase();
    const semanticMatches = [];
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const content = message.content.toLowerCase();
      
      // Recherche sémantique étendue
      const semanticScore = await this.calculateSemanticScore(content, queryLower);
      
      if (semanticScore > 0.3) { // Seuil de pertinence
        const match = {
          sessionId: context.sessionId,
          sessionTitle: context.sessionTitle,
          user: context.user,
          messageId: message.id,
          message: message,
          semanticScore: semanticScore,
          context: this.extractContext(messages, i),
          timestamp: message.timestamp
        };
        
        // Extraire les informations spécifiques si demandées
        if (context.includeImages && message.divineMurmurs) {
          match.imageData = this.extractImageData(message.divineMurmurs);
        }
        
        if (context.includePrompts && message.divineMurmurs) {
          match.promptData = this.extractPromptData(message.divineMurmurs);
        }
        
        semanticMatches.push(match);
      }
    }
    
    return semanticMatches.sort((a, b) => b.semanticScore - a.semanticScore);
  }

  /**
   * Calcule un score sémantique entre le contenu et la requête
   * NOUVEAU: Utilise la vraie recherche sémantique avec embeddings
   */
  private async calculateSemanticScore(content: string, query: string): Promise<number> {
    // Si le service de recherche sémantique est disponible, l'utiliser
    if (this.semanticSearchService) {
      try {
        // Utiliser la recherche sémantique pour calculer la similarité
        const results = await this.semanticSearchService.searchMessages(query, {
          similarityThreshold: 0.1,
          maxResults: 1
        });
        
        // Si on trouve un résultat exact, retourner sa similarité
        const exactMatch = results.find(result => result.content === content);
        if (exactMatch) {
          return exactMatch.similarity;
        }
        
        // Sinon, utiliser la recherche hybride pour une estimation
        const hybridResults = await this.semanticSearchService.hybridSearchMessages(query, {
          similarityThreshold: 0.1,
          maxResults: 5
        });
        
        // Trouver le meilleur match
        const bestMatch = hybridResults.find(result => 
          result.content.toLowerCase().includes(content.toLowerCase().substring(0, 50))
        );
        
        if (bestMatch) {
          return bestMatch.similarity;
        }
        
        // Fallback: utiliser la recherche par mots-clés
        return this.calculateKeywordScore(content, query);
        
      } catch (error) {
        console.warn('⚠️ Erreur recherche sémantique, fallback vers mots-clés:', error);
        return this.calculateKeywordScore(content, query);
      }
    }
    
    // Fallback vers l'ancienne méthode si pas de service sémantique
    return this.calculateKeywordScore(content, query);
  }
  
  /**
   * Ancienne méthode de scoring par mots-clés (fallback)
   */
  private calculateKeywordScore(content: string, query: string): number {
    // Mots-clés sémantiques pour Chat V2
    const semanticKeywords = {
      'gemini': ['gemini', 'image', 'génération', 'prompt', 'création'],
      'image': ['image', 'dessin', 'créer', 'montre', 'visuel', 'banane', 'démoniaque'],
      'problème': ['problème', 'bug', 'erreur', 'ne marche pas', 'ne fonctionne pas'],
      'timer': ['timer', 'chargement', 'disparaît', 'loading'],
      'orchestrateur': ['orchestrateur', 'divin', 'luciole', 'murmure'],
      'archiviste': ['archiviste', 'mémoire', 'souvenir', 'archive']
    };
    
    let score = 0;
    const queryWords = query.split(' ');
    
    // Score basé sur les mots-clés sémantiques
    for (const [category, keywords] of Object.entries(semanticKeywords)) {
      const categoryScore = keywords.reduce((catScore, keyword) => {
        if (content.includes(keyword) && queryWords.some(word => word.includes(keyword))) {
          return catScore + 0.3;
        }
        return catScore;
      }, 0);
      score += categoryScore;
    }
    
    // Score basé sur la correspondance directe
    const directMatches = queryWords.filter(word => content.includes(word)).length;
    score += directMatches * 0.2;
    
    // Score basé sur la proximité des mots
    const proximityScore = this.calculateProximityScore(content, queryWords);
    score += proximityScore * 0.1;
    
    return Math.min(score, 1.0); // Normaliser entre 0 et 1
  }

  /**
   * Calcule un score de proximité entre les mots
   */
  private calculateProximityScore(content: string, queryWords: string[]): number {
    // Implémentation simple : compter les mots de la requête présents
    const contentWords = content.split(' ');
    const matches = queryWords.filter(word => 
      contentWords.some(contentWord => contentWord.includes(word))
    );
    return matches.length / queryWords.length;
  }

  /**
   * Extrait le contexte autour d'un message
   */
  private extractContext(messages: any[], index: number): string {
    const start = Math.max(0, index - 2);
    const end = Math.min(messages.length, index + 3);
    const contextMessages = messages.slice(start, end);
    
    return contextMessages.map((msg, i) => {
      const role = msg.role === 'user' ? 'Utilisateur' : 'Algareth';
      const marker = i === (index - start) ? '>>> ' : '';
      return `${marker}${role}: ${msg.content.substring(0, 100)}...`;
    }).join('\n');
  }

  /**
   * Extrait les données d'images des murmures divins
   */
  private extractImageData(divineMurmurs: any[]): any[] {
    return divineMurmurs
      .filter(murmur => murmur.type === 'image' || murmur.type === 'both')
      .map(murmur => ({
        type: murmur.type,
        content: murmur.content,
        imageUrl: murmur.data?.image?.url,
        enhancedPrompt: murmur.data?.enhancedPrompt,
        improvements: murmur.data?.improvements,
        timestamp: murmur.timestamp
      }));
  }

  /**
   * Extrait les données de prompts des murmures divins
   */
  private extractPromptData(divineMurmurs: any[]): any[] {
    return divineMurmurs
      .filter(murmur => murmur.type === 'memory' || murmur.type === 'both')
      .map(murmur => ({
        type: murmur.type,
        content: murmur.content,
        archivistResponse: murmur.data,
        timestamp: murmur.timestamp
      }));
  }

  /**
   * Analyse les résultats Chat V2 pour extraire des insights
   */
  private async analyzeChatV2Results(results: any[], query: string): Promise<any> {
    const analysis = {
      geminiPrompts: [],
      imageGenerations: [],
      contextInsights: [],
      actualConversations: [], // NOUVEAU: citations réelles des conversations
      summary: ''
    };
    
    // Extraire les prompts Gemini
    results.forEach(result => {
      if (result.promptData) {
        analysis.geminiPrompts.push(...result.promptData);
      }
      if (result.imageData) {
        analysis.imageGenerations.push(...result.imageData);
      }
      
      // NOUVEAU: Extraire les citations réelles des conversations
      if (result.message && result.context) {
        analysis.actualConversations.push({
          sessionTitle: result.sessionTitle,
          sessionId: result.sessionId,
          userMessage: result.message.content,
          context: result.context,
          semanticScore: result.semanticScore,
          timestamp: result.timestamp
        });
      }
    });
    
    // Générer des insights contextuels
    if (results.length > 0) {
      analysis.contextInsights = [
        `Trouvé ${results.length} correspondances sémantiques dans Chat V2`,
        `Sessions analysées: ${new Set(results.map(r => r.sessionId)).size}`,
        `Utilisateurs concernés: ${new Set(results.map(r => r.user)).size}`,
        `Score moyen de pertinence: ${(results.reduce((sum, r) => sum + r.semanticScore, 0) / results.length).toFixed(2)}`
      ];
      
      analysis.summary = `Recherche sémantique réussie pour "${query}". ${analysis.geminiPrompts.length} prompts Gemini et ${analysis.imageGenerations.length} générations d'images trouvées dans les sessions Chat V2. ${analysis.actualConversations.length} conversations spécifiques identifiées.`;
    } else {
      analysis.summary = `Aucune correspondance sémantique trouvée pour "${query}" dans les sessions Chat V2.`;
    }
    
    return analysis;
  }

  /**
   * Teste l'agent archiviste
   */
  async testArchivist(): Promise<void> {
    console.log('🧪 Test PersonalityArchivistAgent');
    
    const testRequest = "Tu te souviens de mes préférences en couleurs ?";
    const context = {
      userId: 'test-user-id', // Utiliser un ID de test générique
      userName: 'Test User',
      currentSession: 'test_session'
    };

    try {
      const response = await this.processRequest(testRequest, context);
      console.log(`✅ Test archiviste: ${response.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`📝 Réponse: ${response.message.substring(0, 200)}...`);
      console.log(`🔧 Outils utilisés: ${response.toolsUsed.join(', ')}`);
      console.log(`🔄 Boucles de feedback: ${response.feedbackLoops}`);
    } catch (error) {
      console.error('❌ Erreur test archiviste:', error);
    }
  }
}
