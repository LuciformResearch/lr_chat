/**
 * ParallelAnalysisEngine - Moteur d'analyse parallèle
 * 
 * Traite les groupes de scopes en parallèle pour améliorer les performances
 * tout en respectant les limites de l'API LLM
 */

import { IntelligentAnalyzer, ScopeGroup, ScopeAnalysisResult } from './IntelligentAnalyzer';
import { StructuredLLMAnalyzerXML } from './StructuredLLMAnalyzerXML';
import { TypeScriptScope } from './StructuredTypeScriptParser';
import { AnalysisCache } from './AnalysisCache';

export interface ParallelAnalysisConfig {
  maxConcurrency: number; // Nombre maximum d'analyses parallèles
  batchSize: number; // Taille des lots pour le traitement
  retryAttempts: number; // Nombre de tentatives en cas d'échec
  retryDelay: number; // Délai entre les tentatives (ms)
  timeout: number; // Timeout par analyse (ms)
  enableCaching: boolean; // Activer le cache
  enableMetrics: boolean; // Activer les métriques
}

export interface ParallelAnalysisResult {
  results: ScopeAnalysisResult[];
  metrics: ParallelAnalysisMetrics;
  errors: ParallelAnalysisError[];
  duration: number;
}

export interface ParallelAnalysisMetrics {
  totalScopes: number;
  processedScopes: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  totalDuration: number;
  averageDuration: number;
  parallelEfficiency: number;
  cacheHits: number;
  cacheMisses: number;
  retries: number;
}

export interface ParallelAnalysisError {
  scopeName: string;
  error: string;
  attempt: number;
  timestamp: Date;
}

export class ParallelAnalysisEngine {
  private config: ParallelAnalysisConfig;
  private cache: AnalysisCache;
  private metrics: ParallelAnalysisMetrics;
  private llmAnalyzer: StructuredLLMAnalyzerXML;

  constructor(config: Partial<ParallelAnalysisConfig> = {}) {
    this.config = {
      maxConcurrency: 3, // Limite raisonnable pour l'API LLM
      batchSize: 5,
      retryAttempts: 2,
      retryDelay: 1000,
      timeout: 30000, // 30 secondes
      enableCaching: true,
      enableMetrics: true,
      ...config
    };

    this.cache = new AnalysisCache();
    this.llmAnalyzer = new StructuredLLMAnalyzerXML();
    this.metrics = this.initializeMetrics();

    console.log('⚡ ParallelAnalysisEngine initialisé');
    console.log(`   Concurrence max: ${this.config.maxConcurrency}`);
    console.log(`   Taille des lots: ${this.config.batchSize}`);
    console.log(`   Cache activé: ${this.config.enableCaching}`);
  }

  /**
   * Analyse des groupes de scopes en parallèle
   */
  async analyzeScopeGroups(
    scopeGroups: ScopeGroup[],
    individualScopes: TypeScriptScope[]
  ): Promise<ParallelAnalysisResult> {
    const startTime = Date.now();
    this.resetMetrics();

    console.log(`⚡ Démarrage de l'analyse parallèle`);
    console.log(`   Groupes: ${scopeGroups.length}`);
    console.log(`   Scopes individuels: ${individualScopes.length}`);

    const results: ScopeAnalysisResult[] = [];
    const errors: ParallelAnalysisError[] = [];

    try {
      // Traitement des groupes en parallèle
      const groupResults = await this.processScopeGroupsInParallel(scopeGroups);
      results.push(...groupResults.results);
      errors.push(...groupResults.errors);

      // Traitement des scopes individuels en parallèle
      const individualResults = await this.processIndividualScopesInParallel(individualScopes);
      results.push(...individualResults.results);
      errors.push(...individualResults.errors);

      // Calcul des métriques finales
      const duration = Date.now() - startTime;
      this.updateFinalMetrics(duration, results, errors);

      console.log(`✅ Analyse parallèle terminée en ${duration}ms`);
      console.log(`   Succès: ${this.metrics.successfulAnalyses}/${this.metrics.totalScopes}`);
      console.log(`   Efficacité: ${this.metrics.parallelEfficiency.toFixed(1)}%`);

      return {
        results,
        metrics: this.metrics,
        errors,
        duration
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse parallèle:', error);
      throw error;
    }
  }

  /**
   * Traite les groupes de scopes en parallèle
   */
  private async processScopeGroupsInParallel(
    scopeGroups: ScopeGroup[]
  ): Promise<{ results: ScopeAnalysisResult[]; errors: ParallelAnalysisError[] }> {
    const results: ScopeAnalysisResult[] = [];
    const errors: ParallelAnalysisError[] = [];

    // Diviser les groupes en lots
    const batches = this.createBatches(scopeGroups, this.config.batchSize);

    for (const batch of batches) {
      // Traiter le lot en parallèle
      const batchPromises = batch.map(group => this.processScopeGroup(group));
      const batchResults = await Promise.allSettled(batchPromises);

      // Traiter les résultats
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const group = batch[i];

        if (result.status === 'fulfilled') {
          results.push(...result.value.results);
          errors.push(...result.value.errors);
        } else {
          // En cas d'échec, traiter chaque scope individuellement
          console.log(`⚠️ Échec du groupe ${group.name}, traitement individuel`);
          const individualResults = await this.processScopesIndividually(group.scopes);
          results.push(...individualResults.results);
          errors.push(...individualResults.errors);
        }
      }

      // Délai entre les lots pour éviter la surcharge de l'API
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(500);
      }
    }

    return { results, errors };
  }

  /**
   * Traite les scopes individuels en parallèle
   */
  private async processIndividualScopesInParallel(
    scopes: TypeScriptScope[]
  ): Promise<{ results: ScopeAnalysisResult[]; errors: ParallelAnalysisError[] }> {
    if (scopes.length === 0) {
      return { results: [], errors: [] };
    }

    console.log(`⚡ Traitement de ${scopes.length} scopes individuels en parallèle`);

    // Diviser en lots plus petits pour les scopes individuels
    const batches = this.createBatches(scopes, Math.min(this.config.batchSize, 3));

    const results: ScopeAnalysisResult[] = [];
    const errors: ParallelAnalysisError[] = [];

    for (const batch of batches) {
      const batchPromises = batch.map(scope => this.processIndividualScope(scope));
      const batchResults = await Promise.allSettled(batchPromises);

      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const scope = batch[i];

        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            scopeName: scope.name,
            error: result.reason?.message || 'Erreur inconnue',
            attempt: 1,
            timestamp: new Date()
          });
        }
      }

      // Délai entre les lots
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(300);
      }
    }

    return { results, errors };
  }

  /**
   * Traite un groupe de scopes
   */
  private async processScopeGroup(group: ScopeGroup): Promise<{ results: ScopeAnalysisResult[]; errors: ParallelAnalysisError[] }> {
    const results: ScopeAnalysisResult[] = [];
    const errors: ParallelAnalysisError[] = [];

    try {
      // Vérifier le cache
      if (this.config.enableCaching) {
        const cacheKey = this.generateGroupCacheKey(group);
        const cachedResult = this.cache.get(cacheKey, group.scopes[0]?.filePath);
        
        if (cachedResult) {
          this.metrics.cacheHits++;
          console.log(`📦 Cache hit pour le groupe ${group.name}`);
          return cachedResult;
        }
      }

      // Analyse du groupe
      const startTime = Date.now();
      const analysis = await this.llmAnalyzer.analyzeScopeGroup(group);
      const duration = Date.now() - startTime;

      // Créer les résultats pour chaque scope du groupe
      for (const scope of group.scopes) {
        const scopeAnalysis = analysis.find(a => a.name === scope.name);
        if (scopeAnalysis) {
          results.push({
            scope,
            analysis: scopeAnalysis,
            duration: duration / group.scopes.length, // Répartir le temps
            success: true,
            analysisMode: 'grouped'
          });
        } else {
          errors.push({
            scopeName: scope.name,
            error: 'Scope non trouvé dans l\'analyse groupée',
            attempt: 1,
            timestamp: new Date()
          });
        }
      }

      // Mettre en cache
      if (this.config.enableCaching && results.length > 0) {
        const cacheKey = this.generateGroupCacheKey(group);
        this.cache.set(cacheKey, { results, errors }, group.scopes[0]?.filePath || '');
        this.metrics.cacheMisses++;
      }

      return { results, errors };

    } catch (error) {
      console.error(`❌ Erreur lors de l'analyse du groupe ${group.name}:`, error);
      
      // Traiter chaque scope individuellement en cas d'échec
      return await this.processScopesIndividually(group.scopes);
    }
  }

  /**
   * Traite un scope individuel
   */
  private async processIndividualScope(scope: TypeScriptScope): Promise<ScopeAnalysisResult> {
    try {
      // Vérifier le cache
      if (this.config.enableCaching) {
        const cacheKey = this.generateScopeCacheKey(scope);
        const cachedResult = this.cache.get(cacheKey, scope.filePath);
        
        if (cachedResult) {
          this.metrics.cacheHits++;
          return cachedResult;
        }
      }

      // Analyse individuelle
      const startTime = Date.now();
      const analysis = await this.llmAnalyzer.analyzeScope(scope);
      const duration = Date.now() - startTime;

      const result: ScopeAnalysisResult = {
        scope,
        analysis,
        duration,
        success: true,
        analysisMode: 'individual'
      };

      // Mettre en cache
      if (this.config.enableCaching) {
        const cacheKey = this.generateScopeCacheKey(scope);
        this.cache.set(cacheKey, result, scope.filePath);
        this.metrics.cacheMisses++;
      }

      return result;

    } catch (error) {
      console.error(`❌ Erreur lors de l'analyse du scope ${scope.name}:`, error);
      throw error;
    }
  }

  /**
   * Traite des scopes individuellement (fallback)
   */
  private async processScopesIndividually(scopes: TypeScriptScope[]): Promise<{ results: ScopeAnalysisResult[]; errors: ParallelAnalysisError[] }> {
    const results: ScopeAnalysisResult[] = [];
    const errors: ParallelAnalysisError[] = [];

    for (const scope of scopes) {
      try {
        const result = await this.processIndividualScope(scope);
        results.push(result);
      } catch (error) {
        errors.push({
          scopeName: scope.name,
          error: error.message,
          attempt: 1,
          timestamp: new Date()
        });
      }
    }

    return { results, errors };
  }

  /**
   * Crée des lots à partir d'un tableau
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Génère une clé de cache pour un groupe
   */
  private generateGroupCacheKey(group: ScopeGroup): string {
    const scopeNames = group.scopes.map(s => s.name).sort().join(',');
    return `group:${group.name}:${scopeNames}:${group.analysisType}`;
  }

  /**
   * Génère une clé de cache pour un scope
   */
  private generateScopeCacheKey(scope: TypeScriptScope): string {
    return `scope:${scope.name}:${scope.type}:${scope.startLine}:${scope.endLine}`;
  }

  /**
   * Délai asynchrone
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialise les métriques
   */
  private initializeMetrics(): ParallelAnalysisMetrics {
    return {
      totalScopes: 0,
      processedScopes: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      totalDuration: 0,
      averageDuration: 0,
      parallelEfficiency: 0,
      cacheHits: 0,
      cacheMisses: 0,
      retries: 0
    };
  }

  /**
   * Remet à zéro les métriques
   */
  private resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Met à jour les métriques finales
   */
  private updateFinalMetrics(duration: number, results: ScopeAnalysisResult[], errors: ParallelAnalysisError[]): void {
    this.metrics.totalScopes = results.length + errors.length;
    this.metrics.processedScopes = results.length;
    this.metrics.successfulAnalyses = results.filter(r => r.success).length;
    this.metrics.failedAnalyses = errors.length;
    this.metrics.totalDuration = duration;
    this.metrics.averageDuration = results.length > 0 ? duration / results.length : 0;
    
    // Calcul de l'efficacité parallèle
    const sequentialTime = results.reduce((sum, r) => sum + r.duration, 0);
    this.metrics.parallelEfficiency = sequentialTime > 0 ? (sequentialTime / duration) * 100 : 0;
  }

  /**
   * Obtient les métriques actuelles
   */
  getMetrics(): ParallelAnalysisMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtient les informations du cache
   */
  getCacheInfo(): any {
    return this.cache.getInfo();
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗄️ Cache de l\'analyse parallèle vidé');
  }
}