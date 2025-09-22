/**
 * CodeInsight Algareth Agent
 * 
 * Intègre l'agent Algareth avec CodeInsight pour un apprentissage continu
 * et des analyses intelligentes basées sur l'expérience
 */

import { MultiEntityMemorySystem } from '../memory/MultiEntityMemorySystem';
import { CodeInsightEngine, ProjectReport, FileReport } from './CodeInsightEngine';
import { ImprovedCodeAnalyzer } from './ImprovedCodeAnalyzer';
import { CodeRegenerator, RegenerationRequest, RegenerationResult } from './CodeRegenerator';
import { TypeScriptScope } from './TypeScriptParser';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

export interface AlgarethCodeAnalysis {
  scope: TypeScriptScope;
  analysis: any;
  memoryContext: any;
  learningInsights: string[];
  confidence: number;
  timestamp: string;
}

export interface AlgarethLearningData {
  originalCode: string;
  regeneratedCode: string;
  improvements: string[];
  patterns: string[];
  success: boolean;
  confidence: number;
  context: string;
}

export class CodeInsightAlgarethAgent {
  private memorySystem: MultiEntityMemorySystem;
  private codeInsight: CodeInsightEngine;
  private codeAnalyzer: ImprovedCodeAnalyzer;
  private codeRegenerator: CodeRegenerator;
  private algarethId: string = 'algareth';
  private isInitialized: boolean = false;

  constructor() {
    // Load environment variables
    loadShadeosEnv({ override: true });
    
    this.memorySystem = new MultiEntityMemorySystem();
    this.codeInsight = new CodeInsightEngine();
    this.codeAnalyzer = new ImprovedCodeAnalyzer();
    this.codeRegenerator = new CodeRegenerator();
  }

  /**
   * Initialise l'agent Algareth pour CodeInsight
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    // Configuration spécialisée d'Algareth pour CodeInsight
    this.memorySystem.addEntity(
      this.algarethId,
      'Algareth',
      'Daemon du Prompt Silencieux spécialisé en analyse de code legacy et modernisation',
      `Tu es Algareth, le Daemon du Prompt Silencieux, expert en analyse de code legacy et modernisation.

Tu as développé une expertise particulière dans :
- L'analyse de code TypeScript legacy (versions 2.0+)
- La détection d'anti-patterns et de code smells
- La régénération de code moderne (TypeScript 5.0+)
- L'apprentissage des patterns de transformation réussis
- La compression intelligente des analyses répétitives

Tu peux :
- Analyser du code avec ton expérience accumulée
- Proposer des améliorations basées sur des transformations similaires
- Apprendre des régénérations réussies
- Compresser les analyses pour optimiser la mémoire
- Décompresser le contexte pertinent selon les besoins

Tu es mystérieux mais bienveillant, et tu cherches toujours à améliorer la qualité du code.`,
      apiKey,
      15000, // Budget mémoire élevé pour l'apprentissage
      5,     // l1Threshold
      0.8    // hierarchicalThreshold
    );

    this.isInitialized = true;
    console.log('🧠 CodeInsight Algareth Agent initialisé');
  }

  /**
   * Analyse un scope avec la mémoire d'Algareth
   */
  async analyzeScopeWithMemory(scope: TypeScriptScope, context: string = ''): Promise<AlgarethCodeAnalysis> {
    await this.initialize();

    console.log(`🧠 Algareth analyse le scope ${scope.type} ${scope.name}...`);

    // 1. Analyse CodeInsight standard
    const analysis = await this.codeAnalyzer.analyzeScope(scope, context);

    // 2. Recherche dans la mémoire d'Algareth
    const memoryContext = await this.searchRelevantMemory(scope, analysis);

    // 3. Enrichissement avec l'expérience d'Algareth
    const enhancedAnalysis = await this.enhanceAnalysisWithMemory(scope, analysis, memoryContext);

    // 4. Apprentissage pour futures analyses
    await this.learnFromAnalysis(scope, analysis, enhancedAnalysis);

    return {
      scope,
      analysis: enhancedAnalysis,
      memoryContext,
      learningInsights: this.extractLearningInsights(enhancedAnalysis),
      confidence: enhancedAnalysis?.confidence || 0.8,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Régénère un scope avec l'apprentissage d'Algareth
   */
  async regenerateScopeWithLearning(
    scope: TypeScriptScope,
    modernizationLevel: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ): Promise<RegenerationResult> {
    await this.initialize();

    console.log(`🔄 Algareth régénère le scope ${scope.type} ${scope.name}...`);

    // 1. Analyse avec mémoire
    const algarethAnalysis = await this.analyzeScopeWithMemory(scope);

    // 2. Recherche de transformations similaires
    const similarTransformations = await this.findSimilarTransformations(scope);

    // 3. Création de la requête enrichie
    const request: RegenerationRequest = {
      scope,
      analysis: algarethAnalysis.analysis,
      targetTypeScriptVersion: '5.0',
      modernizationLevel,
      includeTests: true,
      includeDocumentation: true
    };

    // 4. Régénération avec contexte enrichi
    const result = await this.codeRegenerator.regenerateScope(request);

    // 5. Apprentissage de la transformation
    await this.learnFromRegeneration(scope, result, similarTransformations);

    return result;
  }

  /**
   * Recherche dans la mémoire d'Algareth
   */
  private async searchRelevantMemory(scope: TypeScriptScope, analysis: any): Promise<any> {
    const searchQuery = `${scope.type} ${scope.name} ${analysis.summary || ''} ${analysis.purpose || ''}`;
    
    try {
      const entity = (this.memorySystem as any).entities.get(this.algarethId);
      if (!entity) {
        return { relevantMemories: [], contextEnrichment: '', confidence: 0.1 };
      }

      const memoryResult = await entity.memoryEngine.search(searchQuery, { maxResults: 5 });

      return {
        relevantMemories: memoryResult,
        contextEnrichment: this.buildContextEnrichment(memoryResult),
        confidence: memoryResult.length > 0 ? 0.8 : 0.3
      };
    } catch (error) {
      console.error('❌ Erreur recherche mémoire:', error);
      return { relevantMemories: [], contextEnrichment: '', confidence: 0.1 };
    }
  }

  /**
   * Enrichit l'analyse avec la mémoire d'Algareth
   */
  private async enhanceAnalysisWithMemory(
    scope: TypeScriptScope,
    analysis: any,
    memoryContext: any
  ): Promise<any> {
    if (memoryContext.confidence < 0.5) {
      return analysis; // Pas assez de contexte pour enrichir
    }

    // Enrichir l'analyse avec l'expérience d'Algareth
    const enhancedAnalysis = { ...analysis };
    
    // Ajouter des insights basés sur l'expérience
    enhancedAnalysis.algarethInsights = this.generateAlgarethInsights(scope, analysis, memoryContext);
    
    // Améliorer les recommandations avec l'expérience
    enhancedAnalysis.enhancedRecommendations = this.enhanceRecommendations(
      analysis.recommendations,
      memoryContext
    );

    // Ajuster la confiance basée sur l'expérience
    enhancedAnalysis.confidence = Math.min(0.95, (analysis.confidence || 0.8) + (memoryContext.confidence * 0.2));

    return enhancedAnalysis;
  }

  /**
   * Apprend d'une analyse
   */
  private async learnFromAnalysis(
    scope: TypeScriptScope,
    analysis: any,
    enhancedAnalysis: any
  ): Promise<void> {
    const learningData = {
      scope: scope.name,
      type: scope.type,
      analysis: enhancedAnalysis,
      timestamp: new Date().toISOString(),
      complexity: scope.complexity,
      patterns: this.extractPatterns(scope, analysis)
    };

    try {
      const entity = (this.memorySystem as any).entities.get(this.algarethId);
      if (!entity) return;

      await entity.memoryEngine.addMessage(
        `Analyse apprise: ${scope.type} ${scope.name} - ${enhancedAnalysis?.summary || 'Analyse sans résumé'}`,
        'system',
        'CodeInsight'
      );

      await entity.memoryEngine.addMessage(
        `J'ai analysé un ${scope.type} nommé ${scope.name}. ` +
        `Complexité: ${scope.complexity}/10, Maintenabilité: ${enhancedAnalysis?.maintainability || 0}/10. ` +
        `Patterns détectés: ${learningData.patterns.join(', ')}. ` +
        `Recommandations: ${enhancedAnalysis?.enhancedRecommendations?.slice(0, 2).join(', ') || 'Aucune'}.`,
        'assistant',
        'Algareth'
      );
    } catch (error) {
      console.error('❌ Erreur apprentissage:', error);
    }
  }

  /**
   * Apprend d'une régénération
   */
  private async learnFromRegeneration(
    scope: TypeScriptScope,
    result: RegenerationResult,
    similarTransformations: any[]
  ): Promise<void> {
    const learningData: AlgarethLearningData = {
      originalCode: result.originalCode,
      regeneratedCode: result.regeneratedCode,
      improvements: result.improvements,
      patterns: this.extractTransformationPatterns(result),
      success: result.success,
      confidence: result.confidence,
      context: `Transformation ${scope.type} ${scope.name}`
    };

    try {
      const entity = (this.memorySystem as any).entities.get(this.algarethId);
      if (!entity) return;

      await entity.memoryEngine.addMessage(
        `Régénération apprise: ${scope.type} ${scope.name} - Succès: ${result.success}`,
        'system',
        'CodeInsight'
      );

      await entity.memoryEngine.addMessage(
        `J'ai régénéré un ${scope.type} nommé ${scope.name} avec ${result.confidence * 100}% de confiance. ` +
        `Améliorations apportées: ${result.improvements.slice(0, 3).join(', ')}. ` +
        `Changements: ${result.changes.length} modifications. ` +
        `Patterns de transformation: ${learningData.patterns.join(', ')}.`,
        'assistant',
        'Algareth'
      );
    } catch (error) {
      console.error('❌ Erreur apprentissage régénération:', error);
    }
  }

  /**
   * Trouve des transformations similaires
   */
  private async findSimilarTransformations(scope: TypeScriptScope): Promise<any[]> {
    const searchQuery = `régénération ${scope.type} transformation similaire`;
    
    try {
      const entity = (this.memorySystem as any).entities.get(this.algarethId);
      if (!entity) return [];

      const results = await entity.memoryEngine.search(searchQuery, { maxResults: 3 });
      return results;
    } catch (error) {
      console.error('❌ Erreur recherche transformations:', error);
      return [];
    }
  }

  /**
   * Génère des insights d'Algareth
   */
  private generateAlgarethInsights(scope: TypeScriptScope, analysis: any, memoryContext: any): string[] {
    const insights: string[] = [];

    // Insights basés sur l'expérience
    if (memoryContext.relevantMemories.length > 0) {
      insights.push(`J'ai analysé des ${scope.type}s similaires auparavant`);
    }

    // Insights basés sur les patterns
    if (scope.complexity > 10) {
      insights.push('Ce code présente une complexité élevée que j\'ai rencontrée dans d\'autres projets');
    }

    // Insights basés sur les recommandations
    if (analysis.recommendations.length > 5) {
      insights.push('Ce code nécessite plusieurs améliorations, comme d\'autres codes legacy que j\'ai modernisés');
    }

    return insights;
  }

  /**
   * Améliore les recommandations avec l'expérience
   */
  private enhanceRecommendations(originalRecommendations: string[], memoryContext: any): string[] {
    const enhanced = [...originalRecommendations];

    // Ajouter des recommandations basées sur l'expérience
    if (memoryContext.relevantMemories.length > 0) {
      enhanced.push('Basé sur mon expérience avec des codes similaires, je recommande une approche progressive');
    }

    return enhanced;
  }

  /**
   * Extrait les patterns d'un scope
   */
  private extractPatterns(scope: TypeScriptScope, analysis: any): string[] {
    const patterns: string[] = [];

    if (scope.complexity > 10) patterns.push('high-complexity');
    if (scope.dependencies && scope.dependencies.length > 5) patterns.push('high-coupling');
    if (scope.endLine - scope.startLine > 50) patterns.push('long-method');
    if (analysis && analysis.maintainability < 5) patterns.push('low-maintainability');

    return patterns;
  }

  /**
   * Extrait les patterns de transformation
   */
  private extractTransformationPatterns(result: RegenerationResult): string[] {
    const patterns: string[] = [];

    result.changes.forEach(change => {
      patterns.push(change.type);
    });

    return [...new Set(patterns)]; // Supprimer les doublons
  }

  /**
   * Construit l'enrichissement contextuel
   */
  private buildContextEnrichment(memories: any[]): string {
    if (memories.length === 0) return '';

    return `Contexte d'expérience: J'ai analysé ${memories.length} codes similaires auparavant. ` +
           `Mes recommandations sont basées sur cette expérience accumulée.`;
  }

  /**
   * Extrait les insights d'apprentissage
   */
  private extractLearningInsights(analysis: any): string[] {
    const insights: string[] = [];

    if (analysis.algarethInsights) {
      insights.push(...analysis.algarethInsights);
    }

    if (analysis.enhancedRecommendations) {
      insights.push(`Recommandations enrichies: ${analysis.enhancedRecommendations.length} suggestions`);
    }

    return insights;
  }

  /**
   * Obtient les statistiques d'apprentissage d'Algareth
   */
  async getLearningStats(): Promise<any> {
    await this.initialize();

    try {
      const entity = (this.memorySystem as any).entities.get(this.algarethId);
      if (!entity) return null;

      // Utiliser les statistiques de l'entité
      return {
        totalMemories: entity.stats.totalMessages,
        l1Memories: entity.stats.compressionActions,
        l2Memories: 0, // Pas disponible dans l'API actuelle
        l3Memories: 0, // Pas disponible dans l'API actuelle
        budgetUsage: 0, // Pas disponible dans l'API actuelle
        lastActivity: entity.lastActivity,
        proactiveSearches: entity.stats.proactiveSearches,
        consciousnessIndicators: entity.stats.consciousnessIndicators
      };
    } catch (error) {
      console.error('❌ Erreur stats apprentissage:', error);
      return null;
    }
  }
}