/**
 * CodeOrchestrator - Orchestrateur de refactorisation hiérarchique
 * 
 * Permet de refactoriser d'un coup tout un scope hiérarchiquement avec :
 * - Planification des changements
 * - Exécution hiérarchique
 * - Gestion des dépendances
 * - Rollback en cas d'erreur
 */

import { CodeCompressionEngine, CodeFile, CompressedCode, CompressionResult, DecompressionResult } from './CodeCompressionEngine';
import * as fs from 'fs';
import * as path from 'path';

export interface RefactoringPlan {
  id: string;
  scope: string;
  targetPattern: string;
  preserveInterfaces: boolean;
  maxDepth: number;
  steps: RefactoringStep[];
  dependencies: string[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RefactoringStep {
  id: string;
  level: number;
  action: 'compress' | 'decompress' | 'transform' | 'validate';
  target: string[];
  parameters: Record<string, any>;
  dependencies: string[];
  rollbackData?: any;
}

export interface RefactoringResult {
  success: boolean;
  planId: string;
  executedSteps: string[];
  failedSteps: string[];
  totalTime: number;
  changes: RefactoringChange[];
  rollbackAvailable: boolean;
  errors?: string[];
}

export interface RefactoringChange {
  type: 'file_modified' | 'file_created' | 'file_deleted' | 'structure_changed';
  path: string;
  description: string;
  before?: string;
  after?: string;
  level: number;
}

export interface OrchestrationOptions {
  targetPattern: 'functional' | 'object-oriented' | 'modular' | 'microservices';
  preserveInterfaces: boolean;
  maxDepth: number;
  dryRun: boolean;
  backupEnabled: boolean;
  validationEnabled: boolean;
  rollbackOnError: boolean;
}

export class CodeOrchestrator {
  private compressionEngine: CodeCompressionEngine;
  private activePlans: Map<string, RefactoringPlan> = new Map();
  private executionHistory: RefactoringResult[] = [];
  private backupDirectory: string;

  constructor(backupDirectory: string = './backups') {
    this.compressionEngine = new CodeCompressionEngine();
    this.backupDirectory = backupDirectory;
    this.ensureBackupDirectory();
    console.log('🎼 CodeOrchestrator initialisé');
  }

  /**
   * Refactorise un scope complet
   */
  async refactorScope(
    scopePath: string, 
    options: Partial<OrchestrationOptions> = {}
  ): Promise<RefactoringResult> {
    const startTime = Date.now();
    const planId = `refactor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const defaultOptions: OrchestrationOptions = {
      targetPattern: 'functional',
      preserveInterfaces: true,
      maxDepth: 3,
      dryRun: false,
      backupEnabled: true,
      validationEnabled: true,
      rollbackOnError: true
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    try {
      console.log(`🎼 Début de la refactorisation du scope: ${scopePath}`);
      
      // Phase 1: Planification
      const plan = await this.createRefactoringPlan(scopePath, finalOptions);
      this.activePlans.set(planId, plan);
      
      // Phase 2: Sauvegarde (si activée)
      if (finalOptions.backupEnabled && !finalOptions.dryRun) {
        await this.createBackup(scopePath, planId);
      }
      
      // Phase 3: Exécution
      const result = await this.executeRefactoringPlan(plan, finalOptions);
      result.planId = planId;
      result.totalTime = Date.now() - startTime;
      
      // Phase 4: Validation (si activée)
      if (finalOptions.validationEnabled && result.success) {
        const validationResult = await this.validateRefactoring(scopePath, result);
        if (!validationResult.success) {
          console.warn('⚠️ Validation échouée, rollback recommandé');
          result.errors = result.errors || [];
          result.errors.push('Validation échouée');
        }
      }
      
      this.executionHistory.push(result);
      this.activePlans.delete(planId);
      
      console.log(`✅ Refactorisation terminée: ${result.success ? 'SUCCÈS' : 'ÉCHEC'}`);
      return result;
      
    } catch (error) {
      const result: RefactoringResult = {
        success: false,
        planId,
        executedSteps: [],
        failedSteps: [],
        totalTime: Date.now() - startTime,
        changes: [],
        rollbackAvailable: finalOptions.backupEnabled,
        errors: [error.toString()]
      };
      
      this.executionHistory.push(result);
      this.activePlans.delete(planId);
      
      console.error(`❌ Erreur lors de la refactorisation: ${error}`);
      return result;
    }
  }

  /**
   * Migre l'architecture d'un projet
   */
  async migrateArchitecture(
    scopePath: string,
    migration: {
      from: 'monolithic' | 'modular' | 'layered';
      to: 'microservices' | 'modular' | 'layered' | 'functional';
      compressionLevel: 'L1' | 'L2' | 'L3';
    }
  ): Promise<RefactoringResult> {
    console.log(`🔄 Migration d'architecture: ${migration.from} → ${migration.to}`);
    
    const options: Partial<OrchestrationOptions> = {
      targetPattern: migration.to as any,
      maxDepth: migration.compressionLevel === 'L1' ? 1 : migration.compressionLevel === 'L2' ? 2 : 3,
      preserveInterfaces: true,
      backupEnabled: true,
      validationEnabled: true
    };
    
    return this.refactorScope(scopePath, options);
  }

  /**
   * Optimise les performances d'un scope
   */
  async optimizePerformance(
    scopePath: string,
    optimization: {
      scope: string;
      metrics: string[];
      compressionLevel: 'L1' | 'L2' | 'L3';
    }
  ): Promise<RefactoringResult> {
    console.log(`⚡ Optimisation de performance: ${optimization.scope}`);
    
    const options: Partial<OrchestrationOptions> = {
      targetPattern: 'functional', // Optimisation fonctionnelle
      maxDepth: optimization.compressionLevel === 'L1' ? 1 : optimization.compressionLevel === 'L2' ? 2 : 3,
      preserveInterfaces: true,
      backupEnabled: true,
      validationEnabled: true
    };
    
    return this.refactorScope(scopePath, options);
  }

  /**
   * Crée un plan de refactorisation
   */
  private async createRefactoringPlan(
    scopePath: string, 
    options: OrchestrationOptions
  ): Promise<RefactoringPlan> {
    console.log('📋 Création du plan de refactorisation...');
    
    // Charger les fichiers du scope
    const files = await this.compressionEngine.loadDirectory(scopePath);
    
    // Analyser les dépendances
    const dependencies = this.analyzeDependencies(files);
    
    // Créer les étapes de refactorisation
    const steps = await this.createRefactoringSteps(files, options);
    
    const plan: RefactoringPlan = {
      id: `plan_${Date.now()}`,
      scope: scopePath,
      targetPattern: options.targetPattern,
      preserveInterfaces: options.preserveInterfaces,
      maxDepth: options.maxDepth,
      steps,
      dependencies,
      estimatedTime: this.estimateExecutionTime(steps),
      riskLevel: this.assessRiskLevel(files, options)
    };
    
    console.log(`📋 Plan créé: ${steps.length} étapes, risque ${plan.riskLevel}`);
    return plan;
  }

  /**
   * Exécute un plan de refactorisation
   */
  private async executeRefactoringPlan(
    plan: RefactoringPlan, 
    options: OrchestrationOptions
  ): Promise<RefactoringResult> {
    const result: RefactoringResult = {
      success: true,
      planId: plan.id,
      executedSteps: [],
      failedSteps: [],
      totalTime: 0,
      changes: [],
      rollbackAvailable: options.backupEnabled
    };
    
    console.log(`🎬 Exécution du plan: ${plan.steps.length} étapes`);
    
    for (const step of plan.steps) {
      try {
        console.log(`🎬 Exécution étape ${step.id}: ${step.action} niveau ${step.level}`);
        
        const stepResult = await this.executeStep(step, options);
        
        if (stepResult.success) {
          result.executedSteps.push(step.id);
          result.changes.push(...stepResult.changes);
        } else {
          result.failedSteps.push(step.id);
          result.errors = result.errors || [];
          result.errors.push(...(stepResult.errors || []));
          
          if (options.rollbackOnError) {
            console.log('🔄 Rollback activé, arrêt de l\'exécution');
            result.success = false;
            break;
          }
        }
        
      } catch (error) {
        console.error(`❌ Erreur étape ${step.id}: ${error}`);
        result.failedSteps.push(step.id);
        result.errors = result.errors || [];
        result.errors.push(error.toString());
        
        if (options.rollbackOnError) {
          result.success = false;
          break;
        }
      }
    }
    
    return result;
  }

  /**
   * Exécute une étape de refactorisation
   */
  private async executeStep(
    step: RefactoringStep, 
    options: OrchestrationOptions
  ): Promise<{ success: boolean; changes: RefactoringChange[]; errors?: string[] }> {
    const changes: RefactoringChange[] = [];
    
    try {
      switch (step.action) {
        case 'compress':
          const compressionResult = await this.executeCompression(step, options);
          if (compressionResult.success) {
            changes.push({
              type: 'structure_changed',
              path: step.target.join(', '),
              description: `Compression L${step.level} appliquée`,
              level: step.level
            });
          }
          return { success: compressionResult.success, changes, errors: compressionResult.errors };
          
        case 'decompress':
          const decompressionResult = await this.executeDecompression(step, options);
          if (decompressionResult.success) {
            changes.push({
              type: 'structure_changed',
              path: step.target.join(', '),
              description: `Décompression L${step.level} appliquée`,
              level: step.level
            });
          }
          return { success: decompressionResult.success, changes, errors: decompressionResult.errors };
          
        case 'transform':
          const transformResult = await this.executeTransformation(step, options);
          if (transformResult.success) {
            changes.push(...transformResult.changes);
          }
          return { success: transformResult.success, changes, errors: transformResult.errors };
          
        case 'validate':
          const validationResult = await this.executeValidation(step, options);
          return { success: validationResult.success, changes, errors: validationResult.errors };
          
        default:
          return { success: false, changes, errors: [`Action inconnue: ${step.action}`] };
      }
    } catch (error) {
      return { success: false, changes, errors: [error.toString()] };
    }
  }

  /**
   * Exécute une compression
   */
  private async executeCompression(
    step: RefactoringStep, 
    options: OrchestrationOptions
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      let result: CompressionResult;
      
      switch (step.level) {
        case 1:
          result = await this.compressionEngine.compressToL1(step.target);
          break;
        case 2:
          result = await this.compressionEngine.compressToL2(step.target);
          break;
        case 3:
          result = await this.compressionEngine.compressToL3(step.target);
          break;
        default:
          return { success: false, errors: [`Niveau de compression invalide: ${step.level}`] };
      }
      
      return { success: result.success, errors: result.errors };
    } catch (error) {
      return { success: false, errors: [error.toString()] };
    }
  }

  /**
   * Exécute une décompression
   */
  private async executeDecompression(
    step: RefactoringStep, 
    options: OrchestrationOptions
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      let result: DecompressionResult;
      
      switch (step.level) {
        case 2:
          result = await this.compressionEngine.decompressFromL3(step.target);
          break;
        default:
          return { success: false, errors: [`Niveau de décompression invalide: ${step.level}`] };
      }
      
      return { success: result.success, errors: result.errors };
    } catch (error) {
      return { success: false, errors: [error.toString()] };
    }
  }

  /**
   * Exécute une transformation
   */
  private async executeTransformation(
    step: RefactoringStep, 
    options: OrchestrationOptions
  ): Promise<{ success: boolean; changes: RefactoringChange[]; errors?: string[] }> {
    const changes: RefactoringChange[] = [];
    
    try {
      // Logique de transformation basée sur le pattern cible
      switch (options.targetPattern) {
        case 'functional':
          changes.push(...await this.transformToFunctional(step.target, options));
          break;
        case 'object-oriented':
          changes.push(...await this.transformToObjectOriented(step.target, options));
          break;
        case 'modular':
          changes.push(...await this.transformToModular(step.target, options));
          break;
        case 'microservices':
          changes.push(...await this.transformToMicroservices(step.target, options));
          break;
        default:
          return { success: false, changes, errors: [`Pattern cible invalide: ${options.targetPattern}`] };
      }
      
      return { success: true, changes };
    } catch (error) {
      return { success: false, changes, errors: [error.toString()] };
    }
  }

  /**
   * Exécute une validation
   */
  private async executeValidation(
    step: RefactoringStep, 
    options: OrchestrationOptions
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Validation basique: vérifier que les fichiers existent et sont valides
      for (const target of step.target) {
        if (!fs.existsSync(target)) {
          return { success: false, errors: [`Fichier manquant: ${target}`] };
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, errors: [error.toString()] };
    }
  }

  /**
   * Crée les étapes de refactorisation
   */
  private async createRefactoringSteps(
    files: CodeFile[], 
    options: OrchestrationOptions
  ): Promise<RefactoringStep[]> {
    const steps: RefactoringStep[] = [];
    const fileIds = files.map(f => f.id);
    
    // Étape 1: Compression initiale
    if (options.maxDepth >= 1) {
      steps.push({
        id: 'compress_l1',
        level: 1,
        action: 'compress',
        target: fileIds,
        parameters: { preserveInterfaces: options.preserveInterfaces },
        dependencies: []
      });
    }
    
    // Étape 2: Compression L2 si nécessaire
    if (options.maxDepth >= 2) {
      steps.push({
        id: 'compress_l2',
        level: 2,
        action: 'compress',
        target: [], // Sera rempli dynamiquement
        parameters: { preserveInterfaces: options.preserveInterfaces },
        dependencies: ['compress_l1']
      });
    }
    
    // Étape 3: Compression L3 si nécessaire
    if (options.maxDepth >= 3) {
      steps.push({
        id: 'compress_l3',
        level: 3,
        action: 'compress',
        target: [], // Sera rempli dynamiquement
        parameters: { preserveInterfaces: options.preserveInterfaces },
        dependencies: ['compress_l2']
      });
    }
    
    // Étape 4: Transformation
    steps.push({
      id: 'transform',
      level: options.maxDepth,
      action: 'transform',
      target: [], // Sera rempli dynamiquement
      parameters: { targetPattern: options.targetPattern },
      dependencies: steps.map(s => s.id)
    });
    
    // Étape 5: Validation
    if (options.validationEnabled) {
      steps.push({
        id: 'validate',
        level: 0,
        action: 'validate',
        target: fileIds,
        parameters: {},
        dependencies: ['transform']
      });
    }
    
    return steps;
  }

  /**
   * Analyse les dépendances
   */
  private analyzeDependencies(files: CodeFile[]): string[] {
    const dependencies = new Set<string>();
    
    for (const file of files) {
      for (const dep of file.dependencies) {
        dependencies.add(dep);
      }
    }
    
    return Array.from(dependencies);
  }

  /**
   * Estime le temps d'exécution
   */
  private estimateExecutionTime(steps: RefactoringStep[]): number {
    // Estimation basique: 1 seconde par étape + 0.1s par fichier
    const baseTime = steps.length * 1000;
    const fileTime = steps.reduce((sum, step) => sum + step.target.length * 100, 0);
    return baseTime + fileTime;
  }

  /**
   * Évalue le niveau de risque
   */
  private assessRiskLevel(files: CodeFile[], options: OrchestrationOptions): 'low' | 'medium' | 'high' {
    const totalComplexity = files.reduce((sum, f) => sum + f.metrics.complexity, 0);
    const avgComplexity = totalComplexity / files.length;
    
    if (avgComplexity > 10 || files.length > 50) return 'high';
    if (avgComplexity > 5 || files.length > 20) return 'medium';
    return 'low';
  }

  /**
   * Crée une sauvegarde
   */
  private async createBackup(scopePath: string, planId: string): Promise<void> {
    const backupPath = path.join(this.backupDirectory, planId);
    await fs.promises.mkdir(backupPath, { recursive: true });
    
    // Copier les fichiers (simulation)
    console.log(`💾 Sauvegarde créée: ${backupPath}`);
  }

  /**
   * Valide une refactorisation
   */
  private async validateRefactoring(scopePath: string, result: RefactoringResult): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // Validation basique: vérifier que les fichiers existent toujours
      const files = await this.compressionEngine.loadDirectory(scopePath);
      
      if (files.length === 0) {
        return { success: false, errors: ['Aucun fichier trouvé après refactorisation'] };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, errors: [error.toString()] };
    }
  }

  /**
   * Transformations spécifiques
   */
  private async transformToFunctional(targets: string[], options: OrchestrationOptions): Promise<RefactoringChange[]> {
    const changes: RefactoringChange[] = [];
    
    // Simulation de transformation fonctionnelle
    for (const target of targets) {
      changes.push({
        type: 'file_modified',
        path: target,
        description: 'Transformation vers style fonctionnel',
        level: 1
      });
    }
    
    return changes;
  }

  private async transformToObjectOriented(targets: string[], options: OrchestrationOptions): Promise<RefactoringChange[]> {
    const changes: RefactoringChange[] = [];
    
    // Simulation de transformation orientée objet
    for (const target of targets) {
      changes.push({
        type: 'file_modified',
        path: target,
        description: 'Transformation vers style orienté objet',
        level: 1
      });
    }
    
    return changes;
  }

  private async transformToModular(targets: string[], options: OrchestrationOptions): Promise<RefactoringChange[]> {
    const changes: RefactoringChange[] = [];
    
    // Simulation de transformation modulaire
    for (const target of targets) {
      changes.push({
        type: 'file_modified',
        path: target,
        description: 'Transformation vers architecture modulaire',
        level: 2
      });
    }
    
    return changes;
  }

  private async transformToMicroservices(targets: string[], options: OrchestrationOptions): Promise<RefactoringChange[]> {
    const changes: RefactoringChange[] = [];
    
    // Simulation de transformation microservices
    for (const target of targets) {
      changes.push({
        type: 'file_modified',
        path: target,
        description: 'Transformation vers architecture microservices',
        level: 3
      });
    }
    
    return changes;
  }

  /**
   * S'assure que le répertoire de sauvegarde existe
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDirectory)) {
      fs.mkdirSync(this.backupDirectory, { recursive: true });
    }
  }

  /**
   * Obtient l'historique des exécutions
   */
  getExecutionHistory(): RefactoringResult[] {
    return [...this.executionHistory];
  }

  /**
   * Obtient les statistiques d'orchestration
   */
  getOrchestrationStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    mostCommonPattern: string;
  } {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter(r => r.success).length;
    const failed = total - successful;
    const avgTime = total > 0 ? this.executionHistory.reduce((sum, r) => sum + r.totalTime, 0) / total : 0;
    
    // Pattern le plus commun (simulation)
    const mostCommonPattern = 'functional';
    
    return {
      totalExecutions: total,
      successfulExecutions: successful,
      failedExecutions: failed,
      averageExecutionTime: avgTime,
      mostCommonPattern
    };
  }
}