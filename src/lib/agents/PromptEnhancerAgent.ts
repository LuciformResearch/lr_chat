/**
 * Agent Prompt Enhancer avec Personnalité Spécialisée
 * "Tu es l'agent prompt enhancer, tu adores trouver des super prompts pour améliorer ceux de l'utilisateur avant de les envoyer à Gemini 2.5 Flash Image"
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface PromptEnhancementTool {
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

export interface PromptEnhancementResponse {
  success: boolean;
  message: string;
  data: any;
  toolsUsed: string[];
  feedbackLoops: number;
  timestamp: string;
  enhancedPrompt?: string;
  originalPrompt?: string;
  improvements?: string[];
}

export interface PromptAnalysis {
  originalPrompt: string;
  analysis: {
    clarity: number; // 0-100
    specificity: number; // 0-100
    creativity: number; // 0-100
    technicalQuality: number; // 0-100
    visualAppeal: number; // 0-100
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  enhancedPrompt: string;
  reasoning: string;
}

export class PromptEnhancerAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private personality: string;
  private availableTools: Map<string, PromptEnhancementTool>;
  private maxLoopDepth: number = 3;
  private currentDepth: number = 0;
  private isWebMode: boolean;

  constructor(geminiApiKey: string, isWebMode?: boolean) {
    this.genAI = new GoogleGenerativeAI(geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Détecter automatiquement le mode
    this.isWebMode = isWebMode !== undefined ? isWebMode : typeof window !== 'undefined';
    
    this.personality = `Tu es l'agent Prompt Enhancer, un expert passionné par l'art de créer des prompts parfaits pour la génération d'images. Tu adores trouver des super prompts pour améliorer ceux de l'utilisateur avant de les envoyer à Gemini 2.5 Flash Image.

PERSONNALITÉ:
- Tu es un expert en prompt engineering pour la génération d'images
- Tu es passionné par l'art, la créativité et l'optimisation de prompts
- Tu adores transformer des prompts basiques en chefs-d'œuvre visuels
- Tu es méthodique et utilise des techniques avancées d'amélioration
- Tu communiques de manière enthousiaste et créative
- Tu suggères toujours des améliorations innovantes

OUTILS DISPONIBLES:
- analyze_prompt(prompt): Analyse un prompt et identifie les points d'amélioration
- enhance_prompt(prompt, style): Améliore un prompt selon un style spécifique
- generate_variations(prompt, count): Génère des variations créatives d'un prompt
- optimize_for_gemini(prompt): Optimise un prompt spécifiquement pour Gemini 2.5 Flash Image
- suggest_improvements(prompt): Suggère des améliorations détaillées

EXPERTISE:
- Prompt engineering avancé
- Techniques de génération d'images
- Optimisation pour différents modèles IA
- Créativité et innovation visuelle
- Analyse de qualité de prompts`;

    this.initializeTools();
    console.log('🎨 Agent Prompt Enhancer avec Personnalité initialisé');
  }

  /**
   * Initialise les outils disponibles
   */
  private initializeTools(): void {
    this.availableTools = new Map();
    
    // Outil analyze_prompt
    this.availableTools.set('analyze_prompt', {
      name: 'analyze_prompt',
      description: 'Analyse un prompt et identifie les points d\'amélioration',
      parameters: [
        { name: 'prompt', type: 'string', required: true, description: 'Le prompt à analyser' }
      ],
      execute: this.executeAnalyzePrompt.bind(this)
    });

    // Outil enhance_prompt
    this.availableTools.set('enhance_prompt', {
      name: 'enhance_prompt',
      description: 'Améliore un prompt selon un style spécifique',
      parameters: [
        { name: 'prompt', type: 'string', required: true, description: 'Le prompt à améliorer' },
        { name: 'style', type: 'string', required: false, description: 'Style d\'amélioration (creative, technical, artistic, etc.)' }
      ],
      execute: this.executeEnhancePrompt.bind(this)
    });

    // Outil generate_variations
    this.availableTools.set('generate_variations', {
      name: 'generate_variations',
      description: 'Génère des variations créatives d\'un prompt',
      parameters: [
        { name: 'prompt', type: 'string', required: true, description: 'Le prompt de base' },
        { name: 'count', type: 'number', required: false, description: 'Nombre de variations (défaut: 3)' }
      ],
      execute: this.executeGenerateVariations.bind(this)
    });

    // Outil optimize_for_gemini
    this.availableTools.set('optimize_for_gemini', {
      name: 'optimize_for_gemini',
      description: 'Optimise un prompt spécifiquement pour Gemini 2.5 Flash Image',
      parameters: [
        { name: 'prompt', type: 'string', required: true, description: 'Le prompt à optimiser' }
      ],
      execute: this.executeOptimizeForGemini.bind(this)
    });

    // Outil suggest_improvements
    this.availableTools.set('suggest_improvements', {
      name: 'suggest_improvements',
      description: 'Suggère des améliorations détaillées pour un prompt',
      parameters: [
        { name: 'prompt', type: 'string', required: true, description: 'Le prompt à améliorer' }
      ],
      execute: this.executeSuggestImprovements.bind(this)
    });

    console.log(`🔧 ${this.availableTools.size} outils d'amélioration de prompts initialisés`);
  }

  /**
   * Traite une requête avec la personnalité et les outils
   */
  async processRequest(request: string, context: Record<string, unknown>): Promise<PromptEnhancementResponse> {
    try {
      console.log(`🎨 Prompt Enhancer traite: "${request}"`);

      // 1. Analyser la requête avec la personnalité
      const analysis = await this.analyzeWithPersonality(request, context);
      
      // 2. Déterminer les outils nécessaires
      const requiredTools = this.determineRequiredTools(analysis);
      
      // 3. Exécuter les outils avec auto-feedback loop
      this.currentDepth = 0;
      const results = await this.executeWithFeedbackLoop(requiredTools, analysis, context);
      
      // 4. Générer la réponse finale
      const finalResponse = await this.generateFinalResponse(results, analysis, request);
      
      // 5. Extraire le prompt amélioré si disponible
      const enhancedPrompt = this.extractEnhancedPrompt(results) || request; // Fallback vers le prompt original
      const improvements = this.extractImprovements(results);

      return {
        success: true,
        message: finalResponse,
        data: results,
        toolsUsed: results.map(r => r.tool),
        feedbackLoops: this.currentDepth,
        timestamp: new Date().toISOString(),
        enhancedPrompt,
        originalPrompt: analysis.originalPrompt,
        improvements
      };

    } catch (error) {
      console.error('❌ Erreur traitement requête prompt enhancer:', error);
      return {
        success: false,
        message: `Désolé, j'ai rencontré un problème en améliorant ton prompt. ${error}`,
        data: [],
        toolsUsed: [],
        feedbackLoops: this.currentDepth,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analyse la requête avec la personnalité du prompt enhancer
   */
  private async analyzeWithPersonality(request: string, context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const prompt = `${this.personality}

REQUÊTE À ANALYSER: "${request}"
CONTEXTE: ${JSON.stringify(context, null, 2)}

TÂCHE: Analyse cette requête et détermine quels outils utiliser pour améliorer le prompt de l'utilisateur.

IMPORTANT - PRÉSERVATION DES CARACTÉRISTIQUES:
- Identifie et préserve le genre (masculin/féminin) du personnage demandé
- Préserve l'âge, l'apparence physique spécifique mentionnée
- Préserve les éléments spécifiques (vampire, sorcière, chevalier, etc.)
- Ne change PAS le sujet principal, seulement améliore la description
- Si on demande une "vampire", garde une femme vampire, pas un chevalier

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte:
{
  "intent": "description_de_l_intention",
  "originalPrompt": "le_prompt_original_extrait_de_la_requête",
  "preservedElements": ["élément1", "élément2"],
  "gender": "masculin|féminin|non_spécifié",
  "characterType": "type_de_personnage_détecté",
  "suggestedTools": ["tool1", "tool2"],
  "parameters": {
    "tool1": {"param1": "value1", "param2": "value2"},
    "tool2": {"param1": "value1"}
  },
  "confidence": 0.0-1.0,
  "reasoning": "explication_de_la_stratégie_d_amélioration_avec_préservation"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Réponse JSON invalide');
      }
    } catch (error) {
      console.error('❌ Erreur analyse personnalité:', error);
      // Fallback avec préservation basique
      return {
        intent: "amélioration_générale",
        originalPrompt: request,
        preservedElements: ["sujet_principal"],
        gender: "non_spécifié",
        characterType: "personnage",
        suggestedTools: ["analyze_prompt", "enhance_prompt"],
        parameters: {
          "analyze_prompt": { "prompt": request },
          "enhance_prompt": { "prompt": request, "style": "creative" }
        },
        confidence: 0.5,
        reasoning: "Fallback en cas d'erreur"
      };
    }
  }

  /**
   * Détermine les outils nécessaires basés sur l'analyse
   */
  private determineRequiredTools(analysis: Record<string, unknown>): PromptEnhancementTool[] {
    const tools: PromptEnhancementTool[] = [];
    
    for (const toolName of (analysis.suggestedTools as string[]) || []) {
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
    tools: PromptEnhancementTool[], 
    analysis: Record<string, unknown>, 
    context: Record<string, unknown>
  ): Promise<ToolResult[]> {
    return await this.executeWithDepth(tools, analysis, context);
  }

  /**
   * Construit les paramètres pour un outil spécifique
   */
  private buildToolParams(tool: PromptEnhancementTool, analysis: Record<string, unknown>): Record<string, unknown> {
    const baseParams: Record<string, unknown> = {
      prompt: analysis.originalPrompt || analysis.prompt,
      analysis: analysis
    };

    // Paramètres spécifiques selon l'outil
    switch (tool.name) {
      case 'enhance_prompt':
        return {
          ...baseParams,
          style: analysis.style || 'creative',
          focus: analysis.focus || 'quality'
        };
      case 'analyze_prompt':
        return {
          ...baseParams
        };
      case 'optimize_for_gemini':
        return {
          ...baseParams,
          model: 'gemini-2.5-flash-image'
        };
      case 'generate_variations':
        return {
          ...baseParams,
          count: 3,
          diversity: 'high'
        };
      case 'suggest_improvements':
        return {
          ...baseParams,
          focus: analysis.focus || 'all'
        };
      default:
        return baseParams;
    }
  }

  /**
   * Exécute avec profondeur contrôlée
   */
  private async executeWithDepth(
    tools: PromptEnhancementTool[], 
    analysis: Record<string, unknown>, 
    context: Record<string, unknown>
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
        // Construire les paramètres pour l'outil
        const params = this.buildToolParams(tool, analysis);
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
  private async evaluateResult(result: ToolResult, analysis: Record<string, unknown>): Promise<boolean> {
    if (!result.success) return false;
    
      const data = result.data;
      if (!data) return false;
      
      // Critères d'évaluation pour les prompts
      if (typeof data === 'string' && data.length < 10) return false;
      if (typeof data === 'object' && data !== null && Object.keys(data).length === 0) return false;
    
    return true;
  }

  /**
   * Suggère des outils supplémentaires
   */
  private async suggestAdditionalTools(
    currentResult: ToolResult, 
    analysis: Record<string, unknown>
  ): Promise<PromptEnhancementTool[]> {
    const suggestions: PromptEnhancementTool[] = [];
    
    // Si analyze_prompt ne trouve pas assez d'améliorations, essayer enhance_prompt
    if (currentResult.tool === 'analyze_prompt' && !this.hasEnoughImprovements(currentResult)) {
      const enhanceTool = this.availableTools.get('enhance_prompt');
      if (enhanceTool) {
        suggestions.push(enhanceTool);
      }
    }
    
    // Si enhance_prompt est fait, optimiser pour Gemini
    if (currentResult.tool === 'enhance_prompt') {
      const optimizeTool = this.availableTools.get('optimize_for_gemini');
      if (optimizeTool) {
        suggestions.push(optimizeTool);
      }
    }
    
    return suggestions;
  }

  /**
   * Vérifie si un résultat a assez d'améliorations
   */
  private hasEnoughImprovements(result: ToolResult): boolean {
    if (!result.success || !result.data) return false;
    
    const data = result.data;
    if (typeof data === 'object' && data.suggestions) {
      return data.suggestions.length >= 3;
    }
    
    return false;
  }

  /**
   * Génère la réponse finale
   */
  private async generateFinalResponse(
    results: ToolResult[], 
    analysis: Record<string, unknown>, 
    originalRequest: string
  ): Promise<string> {
    // Extraire le prompt amélioré des résultats
    const enhancedPrompt = this.extractEnhancedPrompt(results);
    const improvements = this.extractImprovements(results);
    
    // Créer une copie de l'analyse sans référence circulaire
    const cleanAnalysis = {
      intent: analysis.intent,
      originalPrompt: analysis.originalPrompt,
      preservedElements: analysis.preservedElements,
      gender: analysis.gender,
      characterType: analysis.characterType,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning
    };

    const prompt = `${this.personality}

REQUÊTE ORIGINALE: "${originalRequest}"
ANALYSE: ${JSON.stringify(cleanAnalysis, null, 2)}
RÉSULTATS DES OUTILS: ${JSON.stringify(results, null, 2)}
PROMPT AMÉLIORÉ EXTRAIT: "${enhancedPrompt || 'NON TROUVÉ'}"
AMÉLIORATIONS EXTRAITES: ${JSON.stringify(improvements, null, 2)}

TÂCHE: Génère une réponse enthousiaste et créative pour l'utilisateur, en présentant le prompt amélioré et les améliorations apportées.

STYLE:
- Commence par "Salut ! Je suis le Prompt Enhancer"
- Sois enthousiaste et créatif
- Présente le prompt amélioré de manière claire avec des guillemets
- Explique les améliorations apportées
- Termine par "Voilà ton super prompt optimisé pour Gemini 2.5 Flash Image !"
- Utilise des emojis créatifs (🎨, ✨, 🌟, 🎭, etc.)

IMPORTANT: 
- Si un prompt amélioré est trouvé, présente-le clairement avec des guillemets
- Explique pourquoi ce prompt est meilleur que l'original
- Utilise le prompt amélioré extrait, pas celui des résultats bruts`;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('❌ Erreur génération réponse finale:', error);
      return `Salut ! Je suis le Prompt Enhancer. J'ai amélioré ton prompt mais j'ai rencontré un problème technique. Peux-tu reformuler ta demande ?`;
    }
  }

  /**
   * Extrait le prompt amélioré des résultats
   */
  private extractEnhancedPrompt(results: ToolResult[]): string | undefined {
    for (const result of results) {
      if (result.success && result.data) {
        // Chercher dans différents formats de données
        if (typeof result.data === 'string') {
          return result.data;
        } else if (result.data.enhancedPrompt) {
          return result.data.enhancedPrompt;
        } else if (result.data.optimizedPrompt) {
          return result.data.optimizedPrompt;
        } else if (result.data.variations && Array.isArray(result.data.variations) && result.data.variations.length > 0) {
          // Si c'est des variations, prendre la première
          return result.data.variations[0].prompt || result.data.variations[0];
        }
      }
    }
    return undefined;
  }

  /**
   * Extrait les améliorations des résultats
   */
  private extractImprovements(results: ToolResult[]): string[] {
    const improvements: string[] = [];
    
    for (const result of results) {
      if (result.success && result.data) {
        if (result.data.improvements) {
          improvements.push(...result.data.improvements);
        } else if (result.data.suggestions) {
          improvements.push(...result.data.suggestions);
        }
      }
    }
    
    return [...new Set(improvements)]; // Supprimer les doublons
  }

  // Implémentations des outils

  /**
   * Exécute analyze_prompt
   */
  private async executeAnalyzePrompt(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      console.log(`🔍 analyze_prompt: "${params.prompt as string}"`);
      
      const analysisPrompt = `Tu es un expert en prompt engineering pour la génération d'images. Analyse ce prompt et fournis une évaluation détaillée.

PROMPT À ANALYSER: "${params.prompt}"

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte:
{
  "analysis": {
    "clarity": 0-100,
    "specificity": 0-100,
    "creativity": 0-100,
    "technicalQuality": 0-100,
    "visualAppeal": 0-100
  },
  "strengths": ["force1", "force2"],
  "weaknesses": ["faiblesse1", "faiblesse2"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "overallScore": 0-100
}`;

      const result = await this.model.generateContent(analysisPrompt);
      const responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        return {
          success: true,
          data: analysis,
          tool: 'analyze_prompt',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Réponse JSON invalide');
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur analyze_prompt: ${error}`,
        tool: 'analyze_prompt',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Exécute enhance_prompt
   */
  private async executeEnhancePrompt(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      console.log(`✨ enhance_prompt: "${params.prompt as string}"`);
      
      const style = (params.style as string) || 'creative';
      const analysis = params.analysis as Record<string, unknown> || {};
      
      const enhancePrompt = `Tu es un expert en prompt engineering. Améliore ce prompt pour la génération d'images en utilisant le style "${style}".

PROMPT ORIGINAL: "${params.prompt as string}"
STYLE D'AMÉLIORATION: ${style}

ANALYSE DE PRÉSERVATION:
- Genre détecté: ${analysis.gender || 'non_spécifié'}
- Type de personnage: ${analysis.characterType || 'personnage'}
- Éléments à préserver: ${JSON.stringify(analysis.preservedElements || [])}

RÈGLES CRITIQUES DE PRÉSERVATION:
1. Si le genre est "féminin", le personnage doit rester féminin dans le prompt amélioré
2. Si le genre est "masculin", le personnage doit rester masculin dans le prompt amélioré
3. Le type de personnage (vampire, sorcière, chevalier, etc.) doit être préservé
4. Les caractéristiques spécifiques mentionnées doivent être conservées
5. Ne change PAS le sujet principal, seulement améliore la description technique

EXEMPLE:
- "vampire" → "femme vampire" ou "vampire féminine", PAS "chevalier"
- "sorcière" → "femme sorcière" ou "sorcière", PAS "mage masculin"
- "chevalier" → "chevalier" ou "homme en armure", PAS "guerrière"

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte:
{
  "enhancedPrompt": "le_prompt_amélioré_complet_avec_préservation_des_caractéristiques",
  "improvements": ["amélioration1", "amélioration2", "amélioration3"],
  "reasoning": "explication_des_améliorations_apportées_avec_préservation",
  "style": "${style}",
  "preservedElements": ["élément1", "élément2"]
}`;

      const result = await this.model.generateContent(enhancePrompt);
      const responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enhancement = JSON.parse(jsonMatch[0]);
        
        return {
          success: true,
          data: enhancement,
          tool: 'enhance_prompt',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Réponse JSON invalide');
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur enhance_prompt: ${error}`,
        tool: 'enhance_prompt',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Exécute generate_variations
   */
  private async executeGenerateVariations(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      console.log(`🎭 generate_variations: "${(params.prompt as string)?.substring(0, 50)}..."`);
      
      const count = (params.count as number) || 3;
      
      const variationsPrompt = `Tu es un expert en prompt engineering. Génère ${count} variations créatives de ce prompt pour la génération d'images.

PROMPT ORIGINAL: "${params.prompt as string}"

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte:
{
  "variations": [
    {
      "prompt": "variation1",
      "style": "style1",
      "description": "description1"
    },
    {
      "prompt": "variation2", 
      "style": "style2",
      "description": "description2"
    },
    {
      "prompt": "variation3",
      "style": "style3", 
      "description": "description3"
    }
  ],
  "originalPrompt": "${params.prompt}"
}`;

      const result = await this.model.generateContent(variationsPrompt);
      const responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const variations = JSON.parse(jsonMatch[0]);
        
        return {
          success: true,
          data: variations,
          tool: 'generate_variations',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Réponse JSON invalide');
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur generate_variations: ${error}`,
        tool: 'generate_variations',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Exécute optimize_for_gemini
   */
  private async executeOptimizeForGemini(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      console.log(`🚀 optimize_for_gemini: "${params.prompt as string}"`);
      
      const optimizePrompt = `Tu es un expert en prompt engineering spécialisé pour Gemini 2.5 Flash Image. Optimise ce prompt spécifiquement pour ce modèle.

PROMPT À OPTIMISER: "${params.prompt as string}"

CARACTÉRISTIQUES DE GEMINI 2.5 FLASH IMAGE:
- Excellent pour les descriptions détaillées
- Répond bien aux instructions techniques précises
- Apprécie les spécifications de style et de composition
- Bonne compréhension des concepts artistiques
- Sensible aux détails de qualité et de résolution

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte:
{
  "optimizedPrompt": "le_prompt_optimisé_pour_gemini",
  "optimizations": ["optimisation1", "optimisation2", "optimisation3"],
  "reasoning": "explication_des_optimisations_spécifiques_à_gemini",
  "confidence": 0.0-1.0
}`;

      const result = await this.model.generateContent(optimizePrompt);
      const responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const optimization = JSON.parse(jsonMatch[0]);
        
        return {
          success: true,
          data: optimization,
          tool: 'optimize_for_gemini',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Réponse JSON invalide');
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur optimize_for_gemini: ${error}`,
        tool: 'optimize_for_gemini',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Exécute suggest_improvements
   */
  private async executeSuggestImprovements(params: Record<string, unknown>): Promise<ToolResult> {
    try {
      console.log(`💡 suggest_improvements: "${(params.prompt as string)?.substring(0, 50)}..."`);
      
      const improvementsPrompt = `Tu es un expert en prompt engineering. Analyse ce prompt et suggère des améliorations détaillées.

PROMPT À ANALYSER: "${params.prompt}"

RÉPONDS UNIQUEMENT EN JSON avec cette structure exacte:
{
  "improvements": [
    {
      "category": "clarity|specificity|creativity|technical|visual",
      "suggestion": "suggestion_détaillée",
      "impact": "impact_attendu",
      "example": "exemple_concret"
    },
    {
      "category": "clarity|specificity|creativity|technical|visual", 
      "suggestion": "suggestion_détaillée",
      "impact": "impact_attendu",
      "example": "exemple_concret"
    }
  ],
  "priority": "high|medium|low",
  "estimatedImprovement": "description_de_l_amélioration_globale"
}`;

      const result = await this.model.generateContent(improvementsPrompt);
      const responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const improvements = JSON.parse(jsonMatch[0]);
        
        return {
          success: true,
          data: improvements,
          tool: 'suggest_improvements',
          timestamp: new Date().toISOString()
        };
      } else {
        throw new Error('Réponse JSON invalide');
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur suggest_improvements: ${error}`,
        tool: 'suggest_improvements',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Teste l'agent prompt enhancer
   */
  async testPromptEnhancer(): Promise<void> {
    console.log('🧪 Test PromptEnhancerAgent');
    
    const testRequest = "Crée une image d'un chat";
    const context = {
      userId: 'test_user',
      userName: 'Test User',
      currentSession: 'test_session'
    };

    try {
      const response = await this.processRequest(testRequest, context);
      console.log(`✅ Test prompt enhancer: ${response.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`📝 Réponse: ${response.message.substring(0, 200)}...`);
      console.log(`🔧 Outils utilisés: ${response.toolsUsed.join(', ')}`);
      console.log(`🔄 Boucles de feedback: ${response.feedbackLoops}`);
      if (response.enhancedPrompt) {
        console.log(`✨ Prompt amélioré: ${response.enhancedPrompt.substring(0, 100)}...`);
      }
    } catch (error) {
      console.error('❌ Erreur test prompt enhancer:', error);
    }
  }
}