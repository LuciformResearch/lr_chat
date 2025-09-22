/**
 * Code Analyzer using LLM and Auto-Enrichment
 * 
 * Analyzes TypeScript code using LLM capabilities and generates
 * detailed reports with recommendations.
 */

import { TypeScriptScope, CodeInsightReport, TypeScriptMetrics } from './TypeScriptParser';
import { PatternAnalysis } from './PatternAnalyzer';
import { AutoEnrichmentEngine } from '../memory/AutoEnrichmentEngine';
import { SimpleSearchEngine } from '../memory/SimpleSearchEngine';
import { ArchiveManager } from '../memory/ArchiveManager';

export interface ScopeAnalysis {
  summary: string;
  purpose: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  complexity: number;
  maintainability: number;
  testability: number;
}

export interface LLMAnalysisResult {
  scopeAnalysis: ScopeAnalysis;
  overallAssessment: string;
  improvementSuggestions: string[];
  architecturalInsights: string[];
}

export class CodeAnalyzer {
  private enrichmentEngine: AutoEnrichmentEngine;
  private searchEngine: SimpleSearchEngine;
  private archiveManager: ArchiveManager;

  constructor() {
    this.archiveManager = new ArchiveManager();
    this.searchEngine = new SimpleSearchEngine(this.archiveManager);
    this.enrichmentEngine = new AutoEnrichmentEngine(this.searchEngine);
  }

  /**
   * Analyze a TypeScript scope using LLM
   */
  async analyzeScope(scope: TypeScriptScope, context: string = ''): Promise<ScopeAnalysis> {
    const prompt = this.buildAnalysisPrompt(scope, context);
    
    try {
      // Use auto-enrichment to get context
      const enrichment = await this.enrichmentEngine.analyzeForEnrichment(
        `Analyze this ${scope.type}: ${scope.name}`,
        { userId: 'code_analyzer' }
      );

      let enrichedPrompt = prompt;
      if (enrichment && enrichment.confidence > 0.3) {
        enrichedPrompt += this.enrichmentEngine.buildEnrichmentContext(enrichment);
      }

      // For now, return a structured analysis based on heuristics
      // In a real implementation, this would call the LLM
      return this.generateHeuristicAnalysis(scope, enrichment);
    } catch (error) {
      console.error('Error analyzing scope:', error);
      return this.generateFallbackAnalysis(scope);
    }
  }

  /**
   * Generate a comprehensive code insight report
   */
  async generateReport(
    file: string, 
    scopes: TypeScriptScope[], 
    patterns: PatternAnalysis,
    metrics: TypeScriptMetrics
  ): Promise<CodeInsightReport> {
    console.log(`🔍 Generating CodeInsight report for ${file}...`);

    const recommendations: string[] = [];
    const scopeAnalyses: ScopeAnalysis[] = [];

    // Analyze each scope
    for (const scope of scopes) {
      const analysis = await this.analyzeScope(scope, file);
      scopeAnalyses.push(analysis);
      
      // Collect recommendations
      recommendations.push(...analysis.recommendations);
    }

    // Generate overall recommendations
    const overallRecommendations = this.generateOverallRecommendations(
      scopes, patterns, metrics, scopeAnalyses
    );
    recommendations.push(...overallRecommendations);

    // Generate summary
    const summary = this.generateSummary(scopes, patterns, metrics);

    return {
      file,
      scopes,
      patterns,
      metrics,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      summary
    };
  }

  /**
   * Build analysis prompt for LLM
   */
  private buildAnalysisPrompt(scope: TypeScriptScope, context: string): string {
    return `
🧠 ***ANALYSE DE CODE TYPESCRIPT*** 🧠

Analyse ce ${scope.type} TypeScript et fournis une évaluation détaillée.

**Informations du scope:**
- Nom: ${scope.name}
- Type: ${scope.type}
- Lignes: ${scope.startLine}-${scope.endLine}
- Complexité: ${scope.complexity}
- Modificateurs: ${scope.modifiers.join(', ')}
- Dépendances: ${scope.dependencies.join(', ')}

**Code à analyser:**
\`\`\`typescript
${scope.content}
\`\`\`

**Contexte:**
${context}

**Instructions:**
1. Résume le but et la fonctionnalité
2. Identifie les forces et faiblesses
3. Propose des améliorations concrètes
4. Évalue la complexité, maintenabilité et testabilité (1-10)

Réponds en format structuré avec des sections claires.
`;
  }

  /**
   * Generate heuristic analysis (fallback when LLM is not available)
   */
  private generateHeuristicAnalysis(scope: TypeScriptScope, enrichment: any): ScopeAnalysis {
    const summary = this.generateScopeSummary(scope);
    const purpose = this.inferPurpose(scope);
    const strengths = this.identifyStrengths(scope);
    const weaknesses = this.identifyWeaknesses(scope);
    const recommendations = this.generateRecommendations(scope);
    
    return {
      summary,
      purpose,
      strengths,
      weaknesses,
      recommendations,
      complexity: Math.min(10, Math.max(1, scope.complexity / 2)),
      maintainability: this.calculateMaintainability(scope),
      testability: this.calculateTestability(scope)
    };
  }

  /**
   * Generate fallback analysis when analysis fails
   */
  private generateFallbackAnalysis(scope: TypeScriptScope): ScopeAnalysis {
    return {
      summary: `${scope.type} ${scope.name} - Analyse non disponible`,
      purpose: 'Fonctionnalité non déterminée',
      strengths: ['Code structuré'],
      weaknesses: ['Analyse limitée'],
      recommendations: ['Améliorer la documentation'],
      complexity: scope.complexity,
      maintainability: 5,
      testability: 5
    };
  }

  /**
   * Generate scope summary
   */
  private generateScopeSummary(scope: TypeScriptScope): string {
    const typeDescriptions = {
      'class': 'Classe',
      'interface': 'Interface',
      'function': 'Fonction',
      'method': 'Méthode',
      'enum': 'Énumération',
      'type_alias': 'Alias de type'
    };

    const typeDesc = typeDescriptions[scope.type] || scope.type;
    const complexity = scope.complexity > 10 ? 'complexe' : 'simple';
    const size = scope.endLine - scope.startLine > 50 ? 'volumineux' : 'compact';

    return `${typeDesc} ${scope.name} - ${complexity} et ${size} (${scope.endLine - scope.startLine} lignes)`;
  }

  /**
   * Infer purpose from scope
   */
  private inferPurpose(scope: TypeScriptScope): string {
    const name = scope.name.toLowerCase();
    const content = scope.content.toLowerCase();

    if (name.includes('service')) return 'Service métier';
    if (name.includes('controller')) return 'Contrôleur API';
    if (name.includes('repository')) return 'Accès aux données';
    if (name.includes('factory')) return 'Création d\'objets';
    if (name.includes('manager')) return 'Gestion de ressources';
    if (name.includes('handler')) return 'Gestion d\'événements';
    if (name.includes('parser')) return 'Analyse de données';
    if (name.includes('validator')) return 'Validation de données';
    if (name.includes('transformer')) return 'Transformation de données';
    if (name.includes('generator')) return 'Génération de contenu';

    if (content.includes('async') && content.includes('await')) return 'Opération asynchrone';
    if (content.includes('return') && content.includes('new')) return 'Factory ou Builder';
    if (content.includes('subscribe') || content.includes('emit')) return 'Gestion d\'événements';
    if (content.includes('validate') || content.includes('check')) return 'Validation';
    if (content.includes('parse') || content.includes('transform')) return 'Traitement de données';

    return 'Fonctionnalité générale';
  }

  /**
   * Identify strengths
   */
  private identifyStrengths(scope: TypeScriptScope): string[] {
    const strengths: string[] = [];

    if (scope.modifiers.includes('private')) strengths.push('Encapsulation appropriée');
    if (scope.modifiers.includes('static')) strengths.push('Méthode statique bien utilisée');
    if (scope.returnType) strengths.push('Type de retour explicite');
    if (scope.parameters && scope.parameters.length <= 3) strengths.push('Interface simple');
    if (scope.complexity <= 5) strengths.push('Complexité cyclomatique faible');
    if (scope.dependencies.length <= 3) strengths.push('Couplage faible');
    if (scope.content.includes('try') && scope.content.includes('catch')) strengths.push('Gestion d\'erreurs');
    if (scope.content.includes('async') && scope.content.includes('await')) strengths.push('Programmation asynchrone');

    return strengths.length > 0 ? strengths : ['Code bien structuré'];
  }

  /**
   * Identify weaknesses
   */
  private identifyWeaknesses(scope: TypeScriptScope): string[] {
    const weaknesses: string[] = [];

    if (scope.complexity > 15) weaknesses.push('Complexité cyclomatique élevée');
    if (scope.dependencies.length > 8) weaknesses.push('Couplage fort');
    if (scope.parameters && scope.parameters.length > 5) weaknesses.push('Trop de paramètres');
    if (scope.endLine - scope.startLine > 100) weaknesses.push('Méthode trop longue');
    if (!scope.returnType && scope.type === 'function') weaknesses.push('Type de retour manquant');
    if (scope.modifiers.length === 0 && scope.type === 'class') weaknesses.push('Visibilité non spécifiée');
    if (scope.content.includes('any')) weaknesses.push('Utilisation du type any');
    if (scope.content.includes('console.log')) weaknesses.push('Logs de debug en production');

    return weaknesses.length > 0 ? weaknesses : ['Aucune faiblesse majeure détectée'];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(scope: TypeScriptScope): string[] {
    const recommendations: string[] = [];

    if (scope.complexity > 15) {
      recommendations.push('Refactoriser pour réduire la complexité cyclomatique');
    }
    if (scope.dependencies.length > 8) {
      recommendations.push('Réduire les dépendances pour améliorer la maintenabilité');
    }
    if (scope.parameters && scope.parameters.length > 5) {
      recommendations.push('Utiliser un objet de paramètres ou le pattern Builder');
    }
    if (scope.endLine - scope.startLine > 100) {
      recommendations.push('Diviser en méthodes plus petites');
    }
    if (!scope.returnType && scope.type === 'function') {
      recommendations.push('Ajouter un type de retour explicite');
    }
    if (scope.content.includes('any')) {
      recommendations.push('Remplacer les types any par des types spécifiques');
    }
    if (scope.content.includes('console.log')) {
      recommendations.push('Utiliser un système de logging approprié');
    }

    return recommendations.length > 0 ? recommendations : ['Code de bonne qualité'];
  }

  /**
   * Calculate maintainability score
   */
  private calculateMaintainability(scope: TypeScriptScope): number {
    let score = 10;

    // Reduce score based on complexity
    score -= Math.min(5, scope.complexity / 3);
    
    // Reduce score based on dependencies
    score -= Math.min(3, scope.dependencies.length / 3);
    
    // Reduce score based on size
    const size = scope.endLine - scope.startLine;
    score -= Math.min(2, size / 50);

    return Math.max(1, Math.round(score));
  }

  /**
   * Calculate testability score
   */
  private calculateTestability(scope: TypeScriptScope): number {
    let score = 10;

    // Reduce score based on dependencies
    score -= Math.min(4, scope.dependencies.length / 2);
    
    // Reduce score based on complexity
    score -= Math.min(3, scope.complexity / 5);
    
    // Increase score for pure functions
    if (scope.type === 'function' && scope.dependencies.length === 0) {
      score += 2;
    }

    return Math.max(1, Math.round(score));
  }

  /**
   * Generate overall recommendations
   */
  private generateOverallRecommendations(
    scopes: TypeScriptScope[],
    patterns: PatternAnalysis,
    metrics: TypeScriptMetrics,
    scopeAnalyses: ScopeAnalysis[]
  ): string[] {
    const recommendations: string[] = [];

    // Pattern-based recommendations
    if (patterns.antiPatterns.includes('God Class')) {
      recommendations.push('Refactoriser les classes trop volumineuses');
    }
    if (patterns.antiPatterns.includes('Long Method')) {
      recommendations.push('Diviser les méthodes trop longues');
    }
    if (patterns.antiPatterns.includes('Feature Envy')) {
      recommendations.push('Réduire les dépendances entre classes');
    }

    // Metrics-based recommendations
    if (metrics.cyclomaticComplexity > 20) {
      recommendations.push('Réduire la complexité cyclomatique globale');
    }
    if (metrics.couplingScore > 7) {
      recommendations.push('Améliorer la découpe en modules');
    }
    if (metrics.cohesionScore < 4) {
      recommendations.push('Augmenter la cohésion des modules');
    }

    // Scope-based recommendations
    const avgMaintainability = scopeAnalyses.reduce((sum, s) => sum + s.maintainability, 0) / scopeAnalyses.length;
    if (avgMaintainability < 6) {
      recommendations.push('Améliorer la maintenabilité générale du code');
    }

    return recommendations;
  }

  /**
   * Generate summary
   */
  private generateSummary(
    scopes: TypeScriptScope[],
    patterns: PatternAnalysis,
    metrics: TypeScriptMetrics
  ): string {
    const scopeCount = scopes.length;
    const classCount = scopes.filter(s => s.type === 'class').length;
    const functionCount = scopes.filter(s => s.type === 'function').length;
    const interfaceCount = scopes.filter(s => s.type === 'interface').length;

    const designPatterns = patterns.designPatterns.length;
    const antiPatterns = patterns.antiPatterns.length;
    const performanceIssues = patterns.performanceIssues.length;

    return `Analyse de ${scopeCount} scopes (${classCount} classes, ${functionCount} fonctions, ${interfaceCount} interfaces). ` +
           `Détecté ${designPatterns} patterns de design, ${antiPatterns} anti-patterns, ${performanceIssues} problèmes de performance. ` +
           `Complexité cyclomatique: ${metrics.cyclomaticComplexity}, Maintenabilité: ${metrics.maintainabilityIndex}/10.`;
  }
}