/**
 * AgenticDecompressionEngine - Moteur de décompression avec retours agentiques
 * 
 * Fonctionnalités :
 * - Décompression contextuelle avec insights d'Algareth
 * - Reconstruction intelligente basée sur l'expérience
 * - Validation avec feedback agentique
 * - Apprentissage continu des patterns de décompression
 * - Optimisation basée sur les métriques d'usage
 */

import { IntelligentDecompressionEngine, DecompressionRequest, DecompressionResult } from './IntelligentDecompressionEngine';
import { AlgarethCompressionPipeline } from './AlgarethCompressionPipeline';
import { CodeInsightAlgarethAgent } from './CodeInsightAlgarethAgent';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { XMLResponseParser } from '../llm/XMLResponseParser';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

export interface AgenticDecompressionRequest extends DecompressionRequest {
  enableAlgarethInsights: boolean;
  learningMode: 'passive' | 'active' | 'aggressive';
  contextEnrichment: boolean;
  preserveExperience: boolean;
  targetQuality: 'basic' | 'standard' | 'premium';
  optimizationLevel: 'conservative' | 'balanced' | 'aggressive';
}

export interface AgenticDecompressionResult extends DecompressionResult {
  algarethInsights: AlgarethInsight[];
  learningMetrics: LearningMetrics;
  optimizationSuggestions: OptimizationSuggestion[];
  experienceGained: ExperienceGained;
}

export interface AlgarethInsight {
  type: 'pattern' | 'context' | 'optimization' | 'warning';
  category: string;
  description: string;
  confidence: number;
  source: 'memory' | 'analysis' | 'experience';
  timestamp: string;
  actionable: boolean;
  impact: 'low' | 'medium' | 'high';
}

export interface LearningMetrics {
  patternsLearned: number;
  contextImprovements: number;
  optimizationGains: number;
  experienceAccumulated: number;
  learningEfficiency: number;
  adaptationSpeed: number;
}

export interface OptimizationSuggestion {
  type: 'performance' | 'quality' | 'structure' | 'context';
  description: string;
  expectedImprovement: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
  algarethConfidence: number;
}

export interface ExperienceGained {
  newPatterns: string[];
  contextEnrichments: string[];
  optimizationOpportunities: string[];
  qualityImprovements: string[];
  lessonsLearned: string[];
}

export interface DecompressionContext {
  originalScope: string;
  compressionHistory: any[];
  usagePatterns: any[];
  qualityMetrics: any[];
  algarethMemory: any[];
  optimizationHistory: any[];
}

export interface AgenticValidationResult {
  isValid: boolean;
  qualityScore: number;
  contextCoherence: number;
  structuralIntegrity: number;
  algarethConfidence: number;
  improvements: string[];
  warnings: string[];
  recommendations: string[];
}

export class AgenticDecompressionEngine {
  private decompressionEngine: IntelligentDecompressionEngine;
  private algarethPipeline: AlgarethCompressionPipeline;
  private algarethAgent: CodeInsightAlgarethAgent;
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private useRealLLM: boolean = false;
  private xmlParser: XMLResponseParser;
  private decompressionHistory: Array<{
    timestamp: string;
    request: AgenticDecompressionRequest;
    result: AgenticDecompressionResult;
    context: DecompressionContext;
  }> = [];
  private learningPatterns: Map<string, any> = new Map();
  private optimizationCache: Map<string, OptimizationSuggestion[]> = new Map();

  constructor() {
    this.decompressionEngine = new IntelligentDecompressionEngine();
    this.algarethPipeline = new AlgarethCompressionPipeline();
    this.algarethAgent = new CodeInsightAlgarethAgent();
    
    // Initialiser le parser XML
    this.xmlParser = new XMLResponseParser();
    
    // Initialiser le modèle LLM
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.useRealLLM = true;
      console.log('🧠 AgenticDecompressionEngine initialisé avec vrais appels LLM (Gemini)');
      console.log(`🔑 Clé API: ${geminiApiKey.substring(0, 20)}...`);
    } else {
      console.log('🧠 AgenticDecompressionEngine initialisé en mode heuristique');
      console.log('⚠️ GEMINI_API_KEY non trouvée dans ~/.shadeos_env');
    }
    
    console.log('🧠 Agentic Decompression Engine initialisé');
  }

  /**
   * Décompression agentique avec retours d'Algareth
   */
  async decompressWithAlgareth(request: AgenticDecompressionRequest): Promise<AgenticDecompressionResult> {
    const startTime = Date.now();
    console.log(`🧠 Décompression agentique (mode: ${request.learningMode}, qualité: ${request.targetQuality})...`);
    
    try {
      // Phase 1: Analyse contextuelle avec Algareth
      const context = await this.analyzeDecompressionContext(request);
      console.log(`🔍 Contexte analysé: ${context.algarethMemory.length} éléments mémoire`);
      
      // Phase 2: Recherche d'expérience similaire
      const similarExperience = await this.findSimilarDecompressionExperience(request, context);
      console.log(`📚 Expérience similaire trouvée: ${similarExperience.length} cas`);
      
      // Phase 3: Génération d'insights Algareth
      const algarethInsights = await this.generateAlgarethInsights(request, context, similarExperience);
      console.log(`💡 ${algarethInsights.length} insights Algareth générés`);
      
      // Phase 4: Décompression intelligente enrichie
      const decompressionResult = await this.performEnrichedDecompression(request, algarethInsights);
      console.log(`🔄 Décompression enrichie terminée: ${decompressionResult.success ? 'Succès' : 'Échec'}`);
      
      // Phase 5: Validation agentique
      const agenticValidation = await this.performAgenticValidation(decompressionResult, algarethInsights);
      console.log(`✅ Validation agentique: score ${agenticValidation.qualityScore}/10`);
      
      // Phase 6: Génération de suggestions d'optimisation
      const optimizationSuggestions = await this.generateOptimizationSuggestions(
        decompressionResult, 
        algarethInsights, 
        agenticValidation
      );
      console.log(`🚀 ${optimizationSuggestions.length} suggestions d'optimisation`);
      
      // Phase 7: Apprentissage et mise à jour de l'expérience
      const experienceGained = await this.learnFromDecompression(
        request, 
        decompressionResult, 
        algarethInsights, 
        agenticValidation
      );
      console.log(`📈 Expérience acquise: ${experienceGained.newPatterns.length} nouveaux patterns`);
      
      // Phase 8: Calcul des métriques d'apprentissage
      const learningMetrics = this.calculateLearningMetrics(experienceGained, Date.now() - startTime);
      
      // Phase 9: Construction du résultat final
      const result: AgenticDecompressionResult = {
        ...decompressionResult,
        algarethInsights,
        learningMetrics,
        optimizationSuggestions,
        experienceGained
      };
      
      // Phase 10: Enregistrement dans l'historique
      this.recordDecompression(request, result, context);
      
      console.log(`🎉 Décompression agentique terminée: ${result.success ? 'Succès' : 'Échec'}, qualité: ${agenticValidation.qualityScore}/10`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erreur décompression agentique:', error);
      
      return {
        success: false,
        decompressed: [],
        errors: [error.toString()],
        warnings: [],
        metadata: {},
        algarethInsights: [],
        learningMetrics: this.getEmptyLearningMetrics(),
        optimizationSuggestions: [],
        experienceGained: this.getEmptyExperienceGained()
      };
    }
  }

  /**
   * Analyse le contexte de décompression avec Algareth
   */
  private async analyzeDecompressionContext(request: AgenticDecompressionRequest): Promise<DecompressionContext> {
    console.log('🔍 Analyse du contexte de décompression...');
    
    if (this.useRealLLM && this.model) {
      try {
        console.log('🧠 Analyse du contexte avec LLM...');
        return await this.analyzeContextWithLLM(request);
      } catch (error) {
        console.error('❌ Erreur analyse contexte LLM:', error);
        return this.generateFallbackContext(request);
      }
    } else {
      console.log('🧠 Analyse du contexte en mode heuristique...');
      return this.generateFallbackContext(request);
    }
  }

  /**
   * Analyse du contexte avec LLM
   */
  private async analyzeContextWithLLM(request: AgenticDecompressionRequest): Promise<DecompressionContext> {
    const prompt = this.buildContextAnalysisPrompt(request);
    
    const result = await this.model.generateContent(prompt);
    const response = result.response.text().trim();
    
    console.log(`🧠 Réponse LLM contexte: ${response.slice(0, 100)}...`);

    // Parse XML response
    const xmlResult = await this.xmlParser.parseXMLResponse(response);
    
    if (xmlResult.success && xmlResult.data) {
      console.log('✅ Contexte analysé avec succès par LLM');
      return this.convertXMLToContext(xmlResult.data, request);
    } else {
      console.warn('⚠️ Parsing XML contexte échoué, fallback vers heuristiques');
      return this.generateFallbackContext(request);
    }
  }

  /**
   * Construit le prompt d'analyse de contexte
   */
  private buildContextAnalysisPrompt(request: AgenticDecompressionRequest): string {
    return `Tu es Algareth, expert en décompression de code. Analyse le contexte de décompression et fournis une évaluation structurée en XML.

## CONTEXTE À ANALYSER

**Requête de décompression:**
- Contexte cible: ${request.targetContext}
- Niveau de qualité: ${request.targetQuality}
- Mode d'apprentissage: ${request.learningMode}
- Niveau d'optimisation: ${request.optimizationLevel}
- Enrichissement contexte: ${request.contextEnrichment}

**Historique de décompression:**
${this.decompressionHistory.length > 0 ? 
  this.decompressionHistory.slice(-5).map(h => `- ${h.timestamp}: ${h.request.targetContext} (${h.result.success ? 'succès' : 'échec'})`).join('\n') :
  'Aucun historique disponible'}

## FORMAT DE RÉPONSE REQUIS

Retourne un XML STRICT avec cette structure:

<decompression_context>
  <original_scope>${request.targetContext}</original_scope>
  <compression_history>
    <item>historique 1</item>
    <item>historique 2</item>
  </compression_history>
  <usage_patterns>
    <pattern>pattern 1</pattern>
    <pattern>pattern 2</pattern>
  </usage_patterns>
  <quality_metrics>
    <metric>métrique 1</metric>
    <metric>métrique 2</metric>
  </quality_metrics>
  <algareth_memory>
    <memory_item>mémoire 1</memory_item>
    <memory_item>mémoire 2</memory_item>
  </algareth_memory>
  <optimization_history>
    <optimization>optimisation 1</optimization>
    <optimization>optimisation 2</optimization>
  </optimization_history>
</decompression_context>

## RÈGLES IMPORTANTES

1. **Analyse contextuelle** : Identifie les patterns de décompression pertinents
2. **Mémoire Algareth** : Utilise l'expérience accumulée pour enrichir le contexte
3. **Métriques de qualité** : Évalue la qualité historique des décompressions similaires
4. **Optimisations** : Identifie les opportunités d'optimisation basées sur l'historique
5. **Format strict** : Respecte exactement la structure XML

Analyse maintenant ce contexte de décompression.`;
  }

  /**
   * Convertit la réponse XML en contexte de décompression
   */
  private convertXMLToContext(xmlData: any, request: AgenticDecompressionRequest): DecompressionContext {
    return {
      originalScope: xmlData.original_scope || request.targetContext,
      compressionHistory: this.extractArrayFromXML(xmlData, 'compression_history'),
      usagePatterns: this.extractArrayFromXML(xmlData, 'usage_patterns'),
      qualityMetrics: this.extractArrayFromXML(xmlData, 'quality_metrics'),
      algarethMemory: this.extractArrayFromXML(xmlData, 'algareth_memory'),
      optimizationHistory: this.extractArrayFromXML(xmlData, 'optimization_history')
    };
  }

  /**
   * Génère un contexte de fallback
   */
  private generateFallbackContext(request: AgenticDecompressionRequest): DecompressionContext {
    return {
      originalScope: request.targetContext,
      compressionHistory: [],
      usagePatterns: [`Pattern de décompression pour ${request.targetQuality}`, `Mode ${request.learningMode}`],
      qualityMetrics: [`Qualité cible: ${request.targetQuality}`, `Optimisation: ${request.optimizationLevel}`],
      algarethMemory: [`Contexte: ${request.targetContext}`, `Apprentissage: ${request.learningMode}`],
      optimizationHistory: []
    };
  }

  /**
   * Extrait un tableau d'un objet XML
   */
  private extractArrayFromXML(obj: any, key: string): any[] {
    const value = obj[key];
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      return value.split('\n').map(s => s.trim()).filter(s => s);
    }
    return [];
  }

  /**
   * Trouve une expérience de décompression similaire
   */
  private async findSimilarDecompressionExperience(
    request: AgenticDecompressionRequest, 
    context: DecompressionContext
  ): Promise<any[]> {
    console.log('📚 Recherche d\'expérience similaire...');
    
    const searchQuery = `Décompression similaire: ${request.targetContext} ${request.reconstructionLevel}`;
    const similarExperience = await this.algarethAgent.searchRelevantMemory(searchQuery, 5);
    
    // Filtrer par similarité contextuelle
    const filteredExperience = Array.isArray(similarExperience) ? 
      similarExperience.filter(exp => 
        this.calculateContextSimilarity(exp, context) > 0.6
      ) : [];
    
    return filteredExperience;
  }

  /**
   * Génère des insights Algareth pour la décompression
   */
  private async generateAlgarethInsights(
    request: AgenticDecompressionRequest,
    context: DecompressionContext,
    similarExperience: any[]
  ): Promise<AlgarethInsight[]> {
    console.log('💡 Génération d\'insights Algareth...');
    
    if (this.useRealLLM && this.model) {
      try {
        console.log('🧠 Génération d\'insights avec LLM...');
        return await this.generateInsightsWithLLM(request, context, similarExperience);
      } catch (error) {
        console.error('❌ Erreur génération insights LLM:', error);
        return this.generateFallbackInsights(request, context, similarExperience);
      }
    } else {
      console.log('🧠 Génération d\'insights en mode heuristique...');
      return this.generateFallbackInsights(request, context, similarExperience);
    }
  }

  /**
   * Génère des insights avec LLM
   */
  private async generateInsightsWithLLM(
    request: AgenticDecompressionRequest,
    context: DecompressionContext,
    similarExperience: any[]
  ): Promise<AlgarethInsight[]> {
    const prompt = this.buildInsightsPrompt(request, context, similarExperience);
    
    const result = await this.model.generateContent(prompt);
    const response = result.response.text().trim();
    
    console.log(`🧠 Réponse LLM insights: ${response.slice(0, 100)}...`);

    // Parse XML response
    const xmlResult = await this.xmlParser.parseXMLResponse(response);
    
    if (xmlResult.success && xmlResult.data) {
      console.log('✅ Insights générés avec succès par LLM');
      return this.convertXMLToInsights(xmlResult.data);
    } else {
      console.warn('⚠️ Parsing XML insights échoué, fallback vers heuristiques');
      return this.generateFallbackInsights(request, context, similarExperience);
    }
  }

  /**
   * Construit le prompt de génération d'insights
   */
  private buildInsightsPrompt(
    request: AgenticDecompressionRequest,
    context: DecompressionContext,
    similarExperience: any[]
  ): string {
    return `Tu es Algareth, expert en décompression de code. Analyse le contexte et génère des insights structurés en XML.

## CONTEXTE D'ANALYSE

**Requête de décompression:**
- Contexte: ${request.targetContext}
- Qualité cible: ${request.targetQuality}
- Mode d'apprentissage: ${request.learningMode}
- Niveau d'optimisation: ${request.optimizationLevel}

**Contexte de décompression:**
- Scope original: ${context.originalScope}
- Patterns d'usage: ${context.usagePatterns.length} patterns
- Métriques de qualité: ${context.qualityMetrics.length} métriques
- Mémoire Algareth: ${context.algarethMemory.length} éléments
- Historique d'optimisation: ${context.optimizationHistory.length} optimisations

**Expérience similaire:**
${similarExperience.length > 0 ? 
  similarExperience.map(exp => `- ${exp.description || 'Expérience similaire'}`).join('\n') :
  'Aucune expérience similaire'}

## FORMAT DE RÉPONSE REQUIS

Retourne un XML STRICT avec cette structure:

<algareth_insights>
  <insight>
    <type>pattern|context|optimization|warning</type>
    <category>decompression|quality|performance|structure</category>
    <description>Description détaillée de l'insight</description>
    <confidence>0.0-1.0</confidence>
    <source>memory|analysis|experience</source>
    <actionable>true|false</actionable>
    <impact>low|medium|high</impact>
  </insight>
  <insight>
    <type>optimization</type>
    <category>context</category>
    <description>Optimisation contextuelle détectée</description>
    <confidence>0.8</confidence>
    <source>analysis</source>
    <actionable>true</actionable>
    <impact>high</impact>
  </insight>
</algareth_insights>

## RÈGLES IMPORTANTES

1. **Analyse contextuelle** : Identifie les patterns de décompression pertinents
2. **Insights actionables** : Fournis des recommandations concrètes
3. **Confiance réaliste** : Évalue la confiance basée sur les données disponibles
4. **Impact évalué** : Classe l'impact des insights (low/medium/high)
5. **Format strict** : Respecte exactement la structure XML

Génère maintenant des insights Algareth pour cette décompression.`;
  }

  /**
   * Convertit la réponse XML en insights
   */
  private convertXMLToInsights(xmlData: any): AlgarethInsight[] {
    const insights: AlgarethInsight[] = [];
    
    if (xmlData.algareth_insights && Array.isArray(xmlData.algareth_insights.insight)) {
      for (const insight of xmlData.algareth_insights.insight) {
        insights.push({
          type: insight.type || 'context',
          category: insight.category || 'decompression',
          description: insight.description || 'Insight généré',
          confidence: parseFloat(insight.confidence) || 0.5,
          source: insight.source || 'analysis',
          timestamp: new Date().toISOString(),
          actionable: insight.actionable === 'true' || insight.actionable === true,
          impact: insight.impact || 'medium'
        });
      }
    }
    
    return insights;
  }

  /**
   * Génère des insights de fallback
   */
  private generateFallbackInsights(
    request: AgenticDecompressionRequest,
    context: DecompressionContext,
    similarExperience: any[]
  ): AlgarethInsight[] {
    const insights: AlgarethInsight[] = [];
    
    // Insight basique sur les patterns
    if (similarExperience.length > 0) {
      insights.push({
        type: 'pattern',
        category: 'decompression',
        description: `Pattern de décompression détecté basé sur ${similarExperience.length} expériences similaires`,
        confidence: 0.7,
        source: 'experience',
        timestamp: new Date().toISOString(),
        actionable: true,
        impact: 'medium'
      });
    }
    
    // Insight sur les optimisations
    if (context.algarethMemory.length > 0) {
      insights.push({
        type: 'optimization',
        category: 'context',
        description: `Optimisations contextuelles disponibles basées sur ${context.algarethMemory.length} éléments mémoire`,
        confidence: 0.6,
        source: 'memory',
        timestamp: new Date().toISOString(),
        actionable: true,
        impact: 'high'
      });
    }
    
    // Insight générique d'amélioration
    insights.push({
      type: 'context',
      category: 'improvement',
      description: `Opportunités d'amélioration détectées pour ${request.targetContext}`,
      confidence: 0.5,
      source: 'analysis',
      timestamp: new Date().toISOString(),
      actionable: true,
      impact: 'medium'
    });
    
    return insights;
  }

  /**
   * Effectue une décompression enrichie avec les insights
   */
  private async performEnrichedDecompression(
    request: AgenticDecompressionRequest,
    insights: AlgarethInsight[]
  ): Promise<DecompressionResult> {
    console.log('🔄 Décompression enrichie avec insights...');
    
    // Enrichir la requête avec les insights
    const enrichedRequest: DecompressionRequest = {
      ...request,
      targetContext: this.enrichContextWithInsights(request.targetContext, insights)
    };
    
    // Effectuer la décompression standard
    const result = await this.decompressionEngine.decompressIntelligently(enrichedRequest);
    
    // Enrichir le résultat avec les métadonnées des insights
    if (result.metadata) {
      result.metadata.algarethInsights = insights.length;
      result.metadata.insightTypes = insights.map(i => i.type);
      result.metadata.avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
    }
    
    return result;
  }

  /**
   * Enrichit le contexte avec les insights
   */
  private enrichContextWithInsights(originalContext: string, insights: AlgarethInsight[]): string {
    const insightDescriptions = insights
      .filter(i => i.actionable && i.impact === 'high')
      .map(i => `- ${i.description}`)
      .join('\n');
    
    return `${originalContext}\n\nInsights Algareth:\n${insightDescriptions}`;
  }

  /**
   * Effectue une validation agentique
   */
  private async performAgenticValidation(
    result: DecompressionResult,
    insights: AlgarethInsight[]
  ): Promise<AgenticValidationResult> {
    console.log('✅ Validation agentique...');
    
    const qualityScore = this.calculateQualityScore(result);
    const contextCoherence = this.calculateContextCoherence(result, insights);
    const structuralIntegrity = this.calculateStructuralIntegrity(result);
    const algarethConfidence = this.calculateAlgarethConfidence(insights);
    
    const improvements: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Analyser les résultats
    if (qualityScore < 7) {
      warnings.push(`Qualité faible: ${qualityScore}/10`);
      improvements.push('Améliorer la qualité de la reconstruction');
    }
    
    if (contextCoherence < 0.7) {
      warnings.push(`Cohérence contextuelle faible: ${(contextCoherence * 100).toFixed(1)}%`);
      improvements.push('Renforcer la cohérence contextuelle');
    }
    
    if (structuralIntegrity < 0.8) {
      warnings.push(`Intégrité structurelle faible: ${(structuralIntegrity * 100).toFixed(1)}%`);
      improvements.push('Corriger l\'intégrité structurelle');
    }
    
    // Générer des recommandations
    if (algarethConfidence > 0.8) {
      recommendations.push('Confiance Algareth élevée - résultats fiables');
    }
    
    if (insights.some(i => i.type === 'optimization')) {
      recommendations.push('Optimisations disponibles - implémentation recommandée');
    }
    
    return {
      isValid: qualityScore >= 6 && contextCoherence >= 0.6 && structuralIntegrity >= 0.7,
      qualityScore,
      contextCoherence,
      structuralIntegrity,
      algarethConfidence,
      improvements,
      warnings,
      recommendations
    };
  }

  /**
   * Génère des suggestions d'optimisation
   */
  private async generateOptimizationSuggestions(
    result: DecompressionResult,
    insights: AlgarethInsight[],
    validation: AgenticValidationResult
  ): Promise<OptimizationSuggestion[]> {
    console.log('🚀 Génération de suggestions d\'optimisation...');
    
    const suggestions: OptimizationSuggestion[] = [];
    
    // Suggestion 1: Amélioration de la qualité
    if (validation.qualityScore < 8) {
      suggestions.push({
        type: 'quality',
        description: `Améliorer la qualité de ${validation.qualityScore}/10 à 8+/10`,
        expectedImprovement: 8 - validation.qualityScore,
        implementationComplexity: 'medium',
        priority: 'high',
        algarethConfidence: 0.8
      });
    }
    
    // Suggestion 2: Optimisation des performances
    if (result.metadata?.processingTime && result.metadata.processingTime > 5000) {
      suggestions.push({
        type: 'performance',
        description: `Réduire le temps de traitement de ${result.metadata.processingTime}ms`,
        expectedImprovement: 0.3,
        implementationComplexity: 'high',
        priority: 'medium',
        algarethConfidence: 0.7
      });
    }
    
    // Suggestion 3: Amélioration structurelle
    if (validation.structuralIntegrity < 0.9) {
      suggestions.push({
        type: 'structure',
        description: `Améliorer l'intégrité structurelle de ${(validation.structuralIntegrity * 100).toFixed(1)}%`,
        expectedImprovement: 0.9 - validation.structuralIntegrity,
        implementationComplexity: 'medium',
        priority: 'high',
        algarethConfidence: 0.9
      });
    }
    
    // Suggestion 4: Enrichissement contextuel
    if (validation.contextCoherence < 0.8) {
      suggestions.push({
        type: 'context',
        description: `Renforcer la cohérence contextuelle de ${(validation.contextCoherence * 100).toFixed(1)}%`,
        expectedImprovement: 0.8 - validation.contextCoherence,
        implementationComplexity: 'low',
        priority: 'medium',
        algarethConfidence: 0.6
      });
    }
    
    return suggestions;
  }

  /**
   * Apprend de la décompression
   */
  private async learnFromDecompression(
    request: AgenticDecompressionRequest,
    result: DecompressionResult,
    insights: AlgarethInsight[],
    validation: AgenticValidationResult
  ): Promise<ExperienceGained> {
    console.log('📈 Apprentissage de la décompression...');
    
    const newPatterns: string[] = [];
    const contextEnrichments: string[] = [];
    const optimizationOpportunities: string[] = [];
    const qualityImprovements: string[] = [];
    const lessonsLearned: string[] = [];
    
    // Apprendre des patterns
    if (insights.some(i => i.type === 'pattern')) {
      newPatterns.push(`Pattern de décompression pour ${request.targetContext}`);
    }
    
    // Enrichir le contexte
    if (validation.contextCoherence > 0.8) {
      contextEnrichments.push(`Contexte enrichi pour ${request.targetContext}`);
    }
    
    // Identifier les opportunités d'optimisation
    if (insights.some(i => i.type === 'optimization')) {
      optimizationOpportunities.push(`Optimisations disponibles pour ${request.targetContext}`);
    }
    
    // Améliorer la qualité
    if (validation.qualityScore > 8) {
      qualityImprovements.push(`Qualité élevée atteinte pour ${request.targetContext}`);
    }
    
    // Leçons apprises
    if (validation.isValid) {
      lessonsLearned.push(`Décompression réussie avec ${insights.length} insights`);
    } else {
      lessonsLearned.push(`Décompression partiellement réussie - améliorations nécessaires`);
    }
    
    // Enregistrer l'apprentissage dans Algareth
    if (request.learningMode !== 'passive') {
      await this.algarethAgent.learnFromAnalysis({
        scope: request.targetContext,
        analysis: insights,
        quality: validation.qualityScore,
        success: result.success
      });
    }
    
    return {
      newPatterns,
      contextEnrichments,
      optimizationOpportunities,
      qualityImprovements,
      lessonsLearned
    };
  }

  /**
   * Calcule les métriques d'apprentissage
   */
  private calculateLearningMetrics(experience: ExperienceGained, processingTime: number): LearningMetrics {
    return {
      patternsLearned: experience.newPatterns.length,
      contextImprovements: experience.contextEnrichments.length,
      optimizationGains: experience.optimizationOpportunities.length,
      experienceAccumulated: experience.lessonsLearned.length,
      learningEfficiency: experience.newPatterns.length / (processingTime / 1000),
      adaptationSpeed: experience.lessonsLearned.length / (processingTime / 1000)
    };
  }

  /**
   * Analyse les patterns d'usage
   */
  private analyzeUsagePatterns(request: AgenticDecompressionRequest): any[] {
    // Analyser l'historique pour identifier les patterns
    const patterns = this.decompressionHistory
      .filter(h => h.request.targetContext === request.targetContext)
      .slice(-10); // 10 derniers usages
    
    return patterns.map(p => ({
      timestamp: p.timestamp,
      success: p.result.success,
      quality: p.result.metadata?.qualityScore || 0,
      insights: p.result.algarethInsights.length
    }));
  }

  /**
   * Calcule les métriques de qualité historiques
   */
  private calculateHistoricalQualityMetrics(request: AgenticDecompressionRequest): any[] {
    const historicalResults = this.decompressionHistory
      .filter(h => h.request.targetContext === request.targetContext)
      .slice(-20); // 20 derniers résultats
    
    return historicalResults.map(h => ({
      timestamp: h.timestamp,
      score: h.result.metadata?.qualityScore || 0,
      success: h.result.success
    }));
  }

  /**
   * Calcule la similarité contextuelle
   */
  private calculateContextSimilarity(experience: any, context: DecompressionContext): number {
    // Calcul simple de similarité basé sur le contexte
    if (experience.context && context.originalScope) {
      const similarity = experience.context.includes(context.originalScope) ? 0.8 : 0.3;
      return similarity;
    }
    return 0.5;
  }

  /**
   * Calcule le score de qualité
   */
  private calculateQualityScore(result: DecompressionResult): number {
    if (!result.success) return 0;
    
    // 🔧 MOCK: Score de qualité calculé artificiellement
    // PROBLÈME: Calcul simpliste basé sur des critères arbitraires
    // POURQUOI C'EST UN MOCK: Pas de vraie évaluation de qualité
    // CE QUI MANQUE:
    //   - Métriques de qualité réelles (complexité cyclomatique, couverture de tests, etc.)
    //   - Analyse sémantique du code décompressé
    //   - Comparaison avec le code original
    //   - Validation par des outils d'analyse statique
    //   - Métriques de performance (temps d'exécution, mémoire, etc.)
    //   - Standards de qualité de l'industrie
    let score = 5; // 🔧 MOCK: Score de base arbitraire
    
    if (result.decompressed && result.decompressed.length > 0) score += 2; // 🔧 MOCK: Bonus arbitraire
    if (result.errors && result.errors.length === 0) score += 2; // 🔧 MOCK: Bonus arbitraire
    if (result.warnings && result.warnings.length === 0) score += 1; // 🔧 MOCK: Bonus arbitraire
    
    return Math.min(10, score); // 🔧 MOCK: Retourne un score artificiel
  }

  /**
   * Calcule la cohérence contextuelle
   */
  private calculateContextCoherence(result: DecompressionResult, insights: AlgarethInsight[]): number {
    if (!result.success) return 0;
    
    let coherence = 0.5; // Cohérence de base
    
    if (insights.some(i => i.type === 'context')) coherence += 0.2;
    if (result.decompressed && result.decompressed.length > 0) coherence += 0.2;
    if (result.errors && result.errors.length === 0) coherence += 0.1;
    
    return Math.min(1, coherence);
  }

  /**
   * Calcule l'intégrité structurelle
   */
  private calculateStructuralIntegrity(result: DecompressionResult): number {
    if (!result.success) return 0;
    
    let integrity = 0.6; // Intégrité de base
    
    if (result.decompressed && result.decompressed.length > 0) integrity += 0.2;
    if (result.errors && result.errors.length === 0) integrity += 0.1;
    if (result.warnings && result.warnings.length === 0) integrity += 0.1;
    
    return Math.min(1, integrity);
  }

  /**
   * Calcule la confiance Algareth
   */
  private calculateAlgarethConfidence(insights: AlgarethInsight[]): number {
    if (insights.length === 0) return 0;
    
    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
    return avgConfidence;
  }

  /**
   * Enregistre la décompression dans l'historique
   */
  private recordDecompression(
    request: AgenticDecompressionRequest,
    result: AgenticDecompressionResult,
    context: DecompressionContext
  ): void {
    this.decompressionHistory.push({
      timestamp: new Date().toISOString(),
      request,
      result,
      context
    });
    
    // Garder seulement les 100 derniers enregistrements
    if (this.decompressionHistory.length > 100) {
      this.decompressionHistory = this.decompressionHistory.slice(-100);
    }
  }

  /**
   * Obtient les métriques d'apprentissage vides
   */
  private getEmptyLearningMetrics(): LearningMetrics {
    return {
      patternsLearned: 0,
      contextImprovements: 0,
      optimizationGains: 0,
      experienceAccumulated: 0,
      learningEfficiency: 0,
      adaptationSpeed: 0
    };
  }

  /**
   * Obtient l'expérience acquise vide
   */
  private getEmptyExperienceGained(): ExperienceGained {
    return {
      newPatterns: [],
      contextEnrichments: [],
      optimizationOpportunities: [],
      qualityImprovements: [],
      lessonsLearned: []
    };
  }

  /**
   * Obtient les statistiques de décompression agentique
   */
  getAgenticDecompressionStats(): any {
    // 🔧 MOCK: Statistiques basées sur un historique vide ou artificiel
    // PROBLÈME: decompressionHistory est toujours vide ou contient des données artificielles
    // POURQUOI C'EST UN MOCK: Pas de vraies décompressions effectuées
    // CE QUI MANQUE:
    //   - Historique réel des décompressions
    //   - Métriques de performance réelles
    //   - Données de qualité authentiques
    //   - Statistiques d'usage réelles
    const totalDecompressions = this.decompressionHistory.length; // 🔧 MOCK: Toujours 0
    const successfulDecompressions = this.decompressionHistory.filter(h => h.result.success).length; // 🔧 MOCK: Toujours 0
    const successRate = totalDecompressions > 0 ? successfulDecompressions / totalDecompressions : 0; // 🔧 MOCK: Toujours 0
    
    const avgQualityScore = totalDecompressions > 0 ? 
      this.decompressionHistory.reduce((sum, h) => {
        const validation = h.result.metadata as any;
        return sum + (validation?.qualityScore || 0); // 🔧 MOCK: qualityScore toujours 0
      }, 0) / totalDecompressions : 0; // 🔧 MOCK: Toujours 0
    
    const totalInsights = this.decompressionHistory.reduce((sum, h) => sum + h.result.algarethInsights.length, 0); // 🔧 MOCK: Toujours 0
    const avgInsights = totalDecompressions > 0 ? totalInsights / totalDecompressions : 0; // 🔧 MOCK: Toujours 0
    
    return {
      totalDecompressions, // 🔧 MOCK: Toujours 0
      successfulDecompressions, // 🔧 MOCK: Toujours 0
      successRate, // 🔧 MOCK: Toujours 0
      avgQualityScore, // 🔧 MOCK: Toujours 0
      totalInsights, // 🔧 MOCK: Toujours 0
      avgInsights, // 🔧 MOCK: Toujours 0
      recentDecompressions: this.decompressionHistory.slice(-5) // 🔧 MOCK: Toujours vide
    };
  }
}