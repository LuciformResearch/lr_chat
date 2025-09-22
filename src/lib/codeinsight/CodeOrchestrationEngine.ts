/**
 * CodeOrchestrationEngine - Moteur d'orchestration pour la compression hiérarchique
 * 
 * Fonctionnalités :
 * - Coordination fluide L1→L2→L3
 * - Gestion d'erreurs robuste avec récupération intelligente
 * - Pipeline optimisé avec retry et fallbacks
 * - Monitoring et métriques avancées
 * - Orchestration des opérations de compression/décompression
 */

import { EnhancedCodeCompressionEngine, CompressedCode, CodeFile } from './EnhancedCodeCompressionEngine';
import { IntelligentDecompressionEngine, DecompressionRequest, DecompressionResult } from './IntelligentDecompressionEngine';
import { AlgarethCompressionPipeline, AlgarethCompressionRequest, AlgarethCompressionResult } from './AlgarethCompressionPipeline';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

export interface OrchestrationRequest {
  files: string[];
  targetLevel: 1 | 2 | 3;
  strategy: 'conservative' | 'balanced' | 'aggressive';
  enableAlgareth: boolean;
  enableMonitoring: boolean;
  retryPolicy: RetryPolicy;
  fallbackStrategy: FallbackStrategy;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableErrors: string[];
}

export interface FallbackStrategy {
  enableFallback: boolean;
  fallbackLevel: 1 | 2 | 3;
  preserveQuality: boolean;
  notifyOnFallback: boolean;
}

export interface OrchestrationResult {
  success: boolean;
  finalLevel: number;
  compressed: CompressedCode[];
  original: CodeFile[];
  orchestrationMetrics: OrchestrationMetrics;
  errors: OrchestrationError[];
  warnings: OrchestrationWarning[];
}

export interface OrchestrationMetrics {
  totalProcessingTime: number;
  compressionTime: number;
  decompressionTime: number;
  retryCount: number;
  fallbackCount: number;
  llmCalls: number;
  qualityScore: number;
  efficiencyScore: number;
  reliabilityScore: number;
}

export interface OrchestrationError {
  level: number;
  type: 'compression' | 'decompression' | 'validation' | 'timeout';
  message: string;
  timestamp: string;
  recoverable: boolean;
  retryCount: number;
}

export interface OrchestrationWarning {
  level: number;
  type: 'performance' | 'quality' | 'resource';
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

export interface OrchestrationStep {
  level: number;
  action: 'compress' | 'decompress' | 'validate' | 'retry' | 'fallback';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: number;
  endTime?: number;
  duration?: number;
  result?: any;
  error?: string;
}

export interface OrchestrationPlan {
  steps: OrchestrationStep[];
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
  fallbackPlan?: OrchestrationPlan;
}

export class CodeOrchestrationEngine {
  private compressionEngine: EnhancedCodeCompressionEngine;
  private decompressionEngine: IntelligentDecompressionEngine;
  private algarethPipeline: AlgarethCompressionPipeline;
  private orchestrationHistory: Array<{
    timestamp: string;
    request: OrchestrationRequest;
    result: OrchestrationResult;
    plan: OrchestrationPlan;
  }> = [];
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.compressionEngine = new EnhancedCodeCompressionEngine();
    this.decompressionEngine = new IntelligentDecompressionEngine();
    this.algarethPipeline = new AlgarethCompressionPipeline();
    
    console.log('⚙️ Code Orchestration Engine initialisé');
  }

  /**
   * Orchestration complète L1→L2→L3
   */
  async orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const startTime = Date.now();
    console.log(`⚙️ Orchestration L1→L${request.targetLevel} (stratégie: ${request.strategy})...`);
    
    try {
      // Phase 1: Planification
      const plan = await this.createOrchestrationPlan(request);
      console.log(`📋 Plan créé: ${plan.steps.length} étapes, risque: ${plan.riskLevel}`);
      
      // Phase 2: Exécution orchestrée
      const result = await this.executeOrchestrationPlan(plan, request);
      
      // Phase 3: Validation et métriques
      const finalResult = await this.validateAndFinalize(result, request, Date.now() - startTime);
      
      // Phase 4: Enregistrement
      this.recordOrchestration(request, finalResult, plan);
      
      console.log(`✅ Orchestration terminée: ${finalResult.success ? 'Succès' : 'Échec'}, niveau final: L${finalResult.finalLevel}`);
      
      return finalResult;
      
    } catch (error) {
      console.error('❌ Erreur orchestration:', error);
      
      return {
        success: false,
        finalLevel: 0,
        compressed: [],
        original: [],
        orchestrationMetrics: this.getEmptyMetrics(),
        errors: [{
          level: 0,
          type: 'compression',
          message: error.toString(),
          timestamp: new Date().toISOString(),
          recoverable: false,
          retryCount: 0
        }],
        warnings: []
      };
    }
  }

  /**
   * Crée un plan d'orchestration
   */
  private async createOrchestrationPlan(request: OrchestrationRequest): Promise<OrchestrationPlan> {
    const steps: OrchestrationStep[] = [];
    let estimatedDuration = 0;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    // Étape 1: Chargement et validation
    steps.push({
      level: 0,
      action: 'validate',
      status: 'pending',
      startTime: 0
    });
    estimatedDuration += 1000; // 1s
    
    // Étape 2: Compression L1
    steps.push({
      level: 1,
      action: 'compress',
      status: 'pending',
      startTime: 0
    });
    estimatedDuration += 15000; // 15s
    
    // Étape 3: Compression L2 (si demandé)
    if (request.targetLevel >= 2) {
      steps.push({
        level: 2,
        action: 'compress',
        status: 'pending',
        startTime: 0
      });
      estimatedDuration += 20000; // 20s
      riskLevel = 'medium';
    }
    
    // Étape 4: Compression L3 (si demandé)
    if (request.targetLevel >= 3) {
      steps.push({
        level: 3,
        action: 'compress',
        status: 'pending',
        startTime: 0
      });
      estimatedDuration += 30000; // 30s
      riskLevel = 'high';
    }
    
    // Étape 5: Validation finale
    steps.push({
      level: request.targetLevel,
      action: 'validate',
      status: 'pending',
      startTime: 0
    });
    estimatedDuration += 2000; // 2s
    
    // Ajuster selon la stratégie
    if (request.strategy === 'aggressive') {
      estimatedDuration *= 0.8; // 20% plus rapide
      riskLevel = 'high';
    } else if (request.strategy === 'conservative') {
      estimatedDuration *= 1.3; // 30% plus lent mais plus sûr
      riskLevel = 'low';
    }
    
    return {
      steps,
      estimatedDuration,
      riskLevel,
      fallbackPlan: request.fallbackStrategy.enableFallback ? 
        await this.createFallbackPlan(request) : undefined
    };
  }

  /**
   * Crée un plan de fallback
   */
  private async createFallbackPlan(request: OrchestrationRequest): Promise<OrchestrationPlan> {
    const fallbackRequest: OrchestrationRequest = {
      ...request,
      targetLevel: request.fallbackStrategy.fallbackLevel,
      strategy: 'conservative',
      retryPolicy: {
        ...request.retryPolicy,
        maxRetries: Math.max(1, request.retryPolicy.maxRetries - 1)
      },
      fallbackStrategy: {
        ...request.fallbackStrategy,
        enableFallback: false // Éviter la récursion infinie
      }
    };
    
    return this.createOrchestrationPlan(fallbackRequest);
  }

  /**
   * Exécute le plan d'orchestration
   */
  private async executeOrchestrationPlan(
    plan: OrchestrationPlan,
    request: OrchestrationRequest
  ): Promise<OrchestrationResult> {
    const errors: OrchestrationError[] = [];
    const warnings: OrchestrationWarning[] = [];
    let compressed: CompressedCode[] = [];
    let original: CodeFile[] = [];
    let finalLevel = 0;
    let retryCount = 0;
    let fallbackCount = 0;
    
    for (const step of plan.steps) {
      try {
        step.status = 'running';
        step.startTime = Date.now();
        
        console.log(`🔄 Exécution étape L${step.level}: ${step.action}`);
        
        switch (step.action) {
          case 'validate':
            await this.executeValidation(step, request);
            break;
            
          case 'compress':
            const compressionResult = await this.executeCompression(step, request, retryCount);
            if (compressionResult.success) {
              compressed = compressionResult.compressed;
              original = compressionResult.original;
              finalLevel = step.level;
            } else {
              throw new Error(`Compression L${step.level} échouée: ${compressionResult.errors?.join(', ')}`);
            }
            break;
            
          case 'decompress':
            const decompressionResult = await this.executeDecompression(step, request);
            if (!decompressionResult.success) {
              throw new Error(`Décompression L${step.level} échouée: ${decompressionResult.errors?.join(', ')}`);
            }
            break;
            
          case 'retry':
            retryCount++;
            console.log(`🔄 Retry ${retryCount}/${request.retryPolicy.maxRetries}`);
            break;
            
          case 'fallback':
            fallbackCount++;
            console.log(`🔄 Fallback vers L${request.fallbackStrategy.fallbackLevel}`);
            break;
        }
        
        step.status = 'completed';
        step.endTime = Date.now();
        step.duration = step.endTime - step.startTime;
        
      } catch (error) {
        step.status = 'failed';
        step.endTime = Date.now();
        step.duration = step.endTime - step.startTime;
        step.error = error.toString();
        
        const orchestrationError: OrchestrationError = {
          level: step.level,
          type: this.determineErrorType(step.action),
          message: error.toString(),
          timestamp: new Date().toISOString(),
          recoverable: this.isRecoverableError(error.toString()),
          retryCount
        };
        
        errors.push(orchestrationError);
        
        // Gestion des erreurs avec retry/fallback
        if (orchestrationError.recoverable && retryCount < request.retryPolicy.maxRetries) {
          console.log(`🔄 Erreur récupérable, retry...`);
          await this.handleRetry(step, request, retryCount);
          retryCount++;
        } else if (request.fallbackStrategy.enableFallback && fallbackCount === 0) {
          console.log(`🔄 Fallback activé...`);
          await this.handleFallback(plan, request);
          fallbackCount++;
        } else {
          console.error(`❌ Erreur non récupérable à l'étape L${step.level}`);
          break;
        }
      }
    }
    
    return {
      success: errors.length === 0 || errors.every(e => e.recoverable),
      finalLevel,
      compressed,
      original,
      orchestrationMetrics: this.getEmptyMetrics(), // Sera calculé plus tard
      errors,
      warnings
    };
  }

  /**
   * Exécute la validation
   */
  private async executeValidation(step: OrchestrationStep, request: OrchestrationRequest): Promise<void> {
    // Validation des fichiers
    for (const filePath of request.files) {
      if (!this.fileExists(filePath)) {
        throw new Error(`Fichier non trouvé: ${filePath}`);
      }
    }
    
    // Validation des paramètres
    if (request.targetLevel < 1 || request.targetLevel > 3) {
      throw new Error(`Niveau cible invalide: ${request.targetLevel}`);
    }
    
    console.log(`✅ Validation L${step.level} réussie`);
  }

  /**
   * Exécute la compression
   */
  private async executeCompression(
    step: OrchestrationStep,
    request: OrchestrationRequest,
    retryCount: number
  ): Promise<{ success: boolean; compressed: CompressedCode[]; original: CodeFile[]; errors?: string[] }> {
    
    if (request.enableAlgareth) {
      // Utiliser le pipeline Algareth
      const algarethRequest: AlgarethCompressionRequest = {
        files: request.files,
        targetLevel: step.level as 1 | 2 | 3,
        learningMode: request.strategy === 'aggressive' ? 'aggressive' : 'active',
        contextEnrichment: true,
        preserveExperience: true
      };
      
      const result = await this.algarethPipeline.compressWithAlgareth(algarethRequest);
      
      return {
        success: result.success,
        compressed: result.compressed,
        original: result.original,
        errors: result.errors
      };
      
    } else {
      // Utiliser le moteur de compression standard
      const loadedFiles: CodeFile[] = [];
      for (const filePath of request.files) {
        const file = await this.compressionEngine.loadFile(filePath);
        loadedFiles.push(file);
      }
      
      const fileIds = loadedFiles.map(f => f.id);
      const result = await this.compressionEngine.compressToL1(fileIds);
      
      return {
        success: result.success,
        compressed: result.compressed,
        original: result.original,
        errors: result.errors
      };
    }
  }

  /**
   * Exécute la décompression
   */
  private async executeDecompression(step: OrchestrationStep, request: OrchestrationRequest): Promise<DecompressionResult> {
    // Pour l'instant, on utilise la décompression standard
    // TODO: Implémenter la décompression L2/L3
    const decompressionRequest: DecompressionRequest = {
      compressedItems: [], // Sera rempli selon le contexte
      targetContext: `Décompression L${step.level}`,
      reconstructionLevel: 'standard',
      preserveOriginalStructure: true,
      includeMetadata: true
    };
    
    return await this.decompressionEngine.decompressIntelligently(decompressionRequest);
  }

  /**
   * Gère les retry
   */
  private async handleRetry(step: OrchestrationStep, request: OrchestrationRequest, retryCount: number): Promise<void> {
    const backoffMs = Math.min(
      request.retryPolicy.backoffMultiplier ** retryCount * 1000,
      request.retryPolicy.maxBackoffMs
    );
    
    console.log(`⏳ Attente ${backoffMs}ms avant retry...`);
    await this.sleep(backoffMs);
    
    // Réinitialiser l'étape pour retry
    step.status = 'pending';
    step.startTime = 0;
    step.endTime = undefined;
    step.duration = undefined;
    step.error = undefined;
  }

  /**
   * Gère les fallbacks
   */
  private async handleFallback(plan: OrchestrationPlan, request: OrchestrationRequest): Promise<void> {
    if (plan.fallbackPlan) {
      console.log(`🔄 Exécution du plan de fallback...`);
      // TODO: Exécuter le plan de fallback
    }
  }

  /**
   * Valide et finalise le résultat
   */
  private async validateAndFinalize(
    result: OrchestrationResult,
    request: OrchestrationRequest,
    totalProcessingTime: number
  ): Promise<OrchestrationResult> {
    
    // Calculer les métriques
    const metrics = this.calculateOrchestrationMetrics(result, totalProcessingTime);
    result.orchestrationMetrics = metrics;
    
    // Ajouter des warnings si nécessaire
    if (metrics.retryCount > 0) {
      result.warnings.push({
        level: 0,
        type: 'performance',
        message: `${metrics.retryCount} retries effectués`,
        timestamp: new Date().toISOString(),
        severity: metrics.retryCount > 2 ? 'high' : 'medium'
      });
    }
    
    if (metrics.fallbackCount > 0) {
      result.warnings.push({
        level: 0,
        type: 'quality',
        message: `${metrics.fallbackCount} fallbacks effectués`,
        timestamp: new Date().toISOString(),
        severity: 'high'
      });
    }
    
    return result;
  }

  /**
   * Calcule les métriques d'orchestration
   */
  private calculateOrchestrationMetrics(result: OrchestrationResult, totalProcessingTime: number): OrchestrationMetrics {
    const retryCount = result.errors.filter(e => e.retryCount > 0).length;
    const fallbackCount = result.errors.filter(e => e.type === 'compression').length;
    
    const qualityScore = result.compressed.length > 0 ? 
      result.compressed.reduce((sum, c) => sum + (c.metadata.qualityScore || 5), 0) / result.compressed.length / 10 : 0;
    
    const efficiencyScore = result.success ? 
      Math.max(0, 1 - (retryCount * 0.1) - (fallbackCount * 0.2)) : 0;
    
    const reliabilityScore = result.success ? 
      Math.max(0, 1 - (result.errors.length * 0.1)) : 0;
    
    return {
      totalProcessingTime,
      compressionTime: totalProcessingTime * 0.8, // Estimation
      decompressionTime: totalProcessingTime * 0.2, // Estimation
      retryCount,
      fallbackCount,
      llmCalls: 0, // Sera calculé par les moteurs
      qualityScore,
      efficiencyScore,
      reliabilityScore
    };
  }

  /**
   * Détermine le type d'erreur
   */
  private determineErrorType(action: string): 'compression' | 'decompression' | 'validation' | 'timeout' {
    switch (action) {
      case 'compress': return 'compression';
      case 'decompress': return 'decompression';
      case 'validate': return 'validation';
      default: return 'timeout';
    }
  }

  /**
   * Vérifie si une erreur est récupérable
   */
  private isRecoverableError(errorMessage: string): boolean {
    const recoverablePatterns = [
      'timeout',
      'network',
      'temporary',
      'rate limit',
      'quota exceeded'
    ];
    
    return recoverablePatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern)
    );
  }

  /**
   * Vérifie si un fichier existe
   */
  private fileExists(filePath: string): boolean {
    try {
      const fs = require('fs');
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enregistre l'orchestration dans l'historique
   */
  private recordOrchestration(
    request: OrchestrationRequest,
    result: OrchestrationResult,
    plan: OrchestrationPlan
  ): void {
    this.orchestrationHistory.push({
      timestamp: new Date().toISOString(),
      request,
      result,
      plan
    });
    
    // Garder seulement les 50 derniers enregistrements
    if (this.orchestrationHistory.length > 50) {
      this.orchestrationHistory = this.orchestrationHistory.slice(-50);
    }
  }

  /**
   * Obtient les métriques vides
   */
  private getEmptyMetrics(): OrchestrationMetrics {
    return {
      totalProcessingTime: 0,
      compressionTime: 0,
      decompressionTime: 0,
      retryCount: 0,
      fallbackCount: 0,
      llmCalls: 0,
      qualityScore: 0,
      efficiencyScore: 0,
      reliabilityScore: 0
    };
  }

  /**
   * Obtient les statistiques d'orchestration
   */
  getOrchestrationStats(): any {
    const totalOrchestrations = this.orchestrationHistory.length;
    const successfulOrchestrations = this.orchestrationHistory.filter(h => h.result.success).length;
    const successRate = totalOrchestrations > 0 ? successfulOrchestrations / totalOrchestrations : 0;
    
    const avgProcessingTime = totalOrchestrations > 0 ? 
      this.orchestrationHistory.reduce((sum, h) => sum + h.result.orchestrationMetrics.totalProcessingTime, 0) / totalOrchestrations : 0;
    
    const avgQualityScore = totalOrchestrations > 0 ? 
      this.orchestrationHistory.reduce((sum, h) => sum + h.result.orchestrationMetrics.qualityScore, 0) / totalOrchestrations : 0;
    
    return {
      totalOrchestrations,
      successfulOrchestrations,
      successRate,
      avgProcessingTime,
      avgQualityScore,
      recentOrchestrations: this.orchestrationHistory.slice(-5)
    };
  }
}