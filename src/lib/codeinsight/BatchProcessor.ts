/**
 * BatchProcessor - Processeur de lots pour optimiser les appels LLM
 * 
 * Regroupe les scopes par taille et priorité pour réduire le nombre d'appels LLM
 * tout en respectant les limites de tokens
 */

import { TypeScriptScope } from './StructuredTypeScriptParser';

export interface BatchConfig {
  maxCharsPerBatch: number; // Limite de caractères par lot
  maxScopesPerBatch: number; // Limite de scopes par lot
  priorityThreshold: number; // Seuil de priorité pour les scopes importants
  enableSmartGrouping: boolean; // Grouper par similarité de contexte
}

export interface ScopeBatch {
  id: string;
  scopes: TypeScriptScope[];
  totalChars: number;
  priority: 'high' | 'medium' | 'low';
  context: string; // Contexte partagé du lot
  estimatedTokens: number;
}

export interface BatchStats {
  totalBatches: number;
  totalScopes: number;
  averageBatchSize: number;
  averageCharsPerBatch: number;
  highPriorityBatches: number;
  mediumPriorityBatches: number;
  lowPriorityBatches: number;
  estimatedTokenReduction: number; // Pourcentage de réduction des tokens
}

export class BatchProcessor {
  private config: BatchConfig;
  private stats: BatchStats;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      maxCharsPerBatch: 18000, // ~60-70% du contexte LLM
      maxScopesPerBatch: 8,
      priorityThreshold: 0.7,
      enableSmartGrouping: true,
      ...config
    };

    this.stats = this.initializeStats();
  }

  /**
   * Crée des lots optimisés à partir des scopes
   */
  createBatches(scopes: TypeScriptScope[]): ScopeBatch[] {
    this.resetStats();

    if (scopes.length === 0) {
      return [];
    }

    console.log(`📦 Création de lots pour ${scopes.length} scopes`);
    console.log(`   Limite par lot: ${this.config.maxCharsPerBatch} chars, ${this.config.maxScopesPerBatch} scopes`);

    // 1. Calculer les priorités et tailles
    const scopesWithMetadata = this.enrichScopesWithMetadata(scopes);

    // 2. Trier par priorité et taille
    const sortedScopes = this.sortScopesByPriority(scopesWithMetadata);

    // 3. Créer les lots
    const batches = this.createOptimizedBatches(sortedScopes);

    // 4. Mettre à jour les statistiques
    this.updateStats(batches);

    console.log(`✅ ${batches.length} lots créés`);
    console.log(`   Réduction estimée: ${this.stats.estimatedTokenReduction.toFixed(1)}%`);

    return batches;
  }

  /**
   * Enrichit les scopes avec des métadonnées de priorité et taille
   */
  private enrichScopesWithMetadata(scopes: TypeScriptScope[]): Array<TypeScriptScope & {
    priority: number;
    charCount: number;
    importance: 'export' | 'public' | 'internal' | 'private';
  }> {
    return scopes.map(scope => {
      const charCount = this.calculateScopeSize(scope);
      const importance = this.determineImportance(scope);
      const priority = this.calculatePriority(scope, importance, charCount);

      return {
        ...scope,
        priority,
        charCount,
        importance
      };
    });
  }

  /**
   * Calcule la taille d'un scope en caractères
   */
  private calculateScopeSize(scope: TypeScriptScope): number {
    return scope.content.length;
  }

  /**
   * Détermine l'importance d'un scope
   */
  private determineImportance(scope: TypeScriptScope): 'export' | 'public' | 'internal' | 'private' {
    // Logique de priorité basée sur le type et les modificateurs
    if (scope.modifiers?.includes('export')) {
      return 'export';
    }
    
    if (scope.type === 'interface' || scope.type === 'type' || scope.type === 'class') {
      return 'public';
    }
    
    if (scope.type === 'function' && scope.modifiers?.includes('public')) {
      return 'public';
    }
    
    return 'internal';
  }

  /**
   * Calcule la priorité d'un scope (0-1)
   */
  private calculatePriority(
    scope: TypeScriptScope, 
    importance: string, 
    charCount: number
  ): number {
    let priority = 0.5; // Base

    // Bonus pour l'importance
    switch (importance) {
      case 'export': priority += 0.3; break;
      case 'public': priority += 0.2; break;
      case 'internal': priority += 0.1; break;
      case 'private': priority += 0.0; break;
    }

    // Bonus pour les types critiques
    if (scope.type === 'interface' || scope.type === 'type') {
      priority += 0.2;
    }

    // Bonus pour les fonctions principales
    if (scope.type === 'function' && scope.name && !scope.name.startsWith('_')) {
      priority += 0.1;
    }

    // Pénalité pour les scopes très gros (difficiles à traiter)
    if (charCount > 2000) {
      priority -= 0.1;
    }

    // Pénalité pour les scopes très petits (peu d'impact)
    if (charCount < 100) {
      priority -= 0.1;
    }

    return Math.max(0, Math.min(1, priority));
  }

  /**
   * Trie les scopes par priorité
   */
  private sortScopesByPriority(scopes: any[]): any[] {
    return scopes.sort((a, b) => {
      // D'abord par priorité (descendant)
      if (Math.abs(a.priority - b.priority) > 0.1) {
        return b.priority - a.priority;
      }
      
      // Puis par taille (ascendant pour équilibrer les lots)
      return a.charCount - b.charCount;
    });
  }

  /**
   * Crée des lots optimisés
   */
  private createOptimizedBatches(sortedScopes: any[]): ScopeBatch[] {
    const batches: ScopeBatch[] = [];
    let currentBatch: any[] = [];
    let currentChars = 0;
    let batchId = 1;

    for (const scope of sortedScopes) {
      // Vérifier si on peut ajouter ce scope au lot actuel
      const wouldExceedChars = currentChars + scope.charCount > this.config.maxCharsPerBatch;
      const wouldExceedScopes = currentBatch.length >= this.config.maxScopesPerBatch;
      
      if ((wouldExceedChars || wouldExceedScopes) && currentBatch.length > 0) {
        // Finaliser le lot actuel
        batches.push(this.createBatchFromScopes(currentBatch, batchId++));
        currentBatch = [];
        currentChars = 0;
      }

      // Ajouter le scope au lot actuel
      currentBatch.push(scope);
      currentChars += scope.charCount;
    }

    // Finaliser le dernier lot
    if (currentBatch.length > 0) {
      batches.push(this.createBatchFromScopes(currentBatch, batchId++));
    }

    return batches;
  }

  /**
   * Crée un lot à partir d'une liste de scopes
   */
  private createBatchFromScopes(scopes: any[], batchId: number): ScopeBatch {
    const totalChars = scopes.reduce((sum, scope) => sum + scope.charCount, 0);
    const avgPriority = scopes.reduce((sum, scope) => sum + scope.priority, 0) / scopes.length;
    
    // Déterminer la priorité du lot
    let priority: 'high' | 'medium' | 'low';
    if (avgPriority >= this.config.priorityThreshold) {
      priority = 'high';
    } else if (avgPriority >= 0.4) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    // Créer le contexte partagé
    const context = this.generateSharedContext(scopes);

    // Estimer les tokens (approximation: 1 token ≈ 4 caractères)
    const estimatedTokens = Math.ceil(totalChars / 4);

    return {
      id: `batch_${batchId.toString().padStart(3, '0')}`,
      scopes: scopes.map(s => ({
        name: s.name,
        type: s.type,
        content: s.content,
        startLine: s.startLine,
        endLine: s.endLine,
        filePath: s.filePath,
        modifiers: s.modifiers
      })),
      totalChars,
      priority,
      context,
      estimatedTokens
    };
  }

  /**
   * Génère un contexte partagé pour le lot
   */
  private generateSharedContext(scopes: any[]): string {
    const filePath = scopes[0]?.filePath || 'unknown';
    const types = [...new Set(scopes.map(s => s.type))];
    const exports = scopes.filter(s => s.importance === 'export').map(s => s.name);
    
    let context = `Fichier: ${filePath}\n`;
    context += `Types: ${types.join(', ')}\n`;
    
    if (exports.length > 0) {
      context += `Exports: ${exports.join(', ')}\n`;
    }
    
    context += `Scopes: ${scopes.length}`;
    
    return context;
  }

  /**
   * Met à jour les statistiques
   */
  private updateStats(batches: ScopeBatch[]): void {
    this.stats.totalBatches = batches.length;
    this.stats.totalScopes = batches.reduce((sum, batch) => sum + batch.scopes.length, 0);
    this.stats.averageBatchSize = this.stats.totalScopes / this.stats.totalBatches;
    this.stats.averageCharsPerBatch = batches.reduce((sum, batch) => sum + batch.totalChars, 0) / this.stats.totalBatches;
    
    this.stats.highPriorityBatches = batches.filter(b => b.priority === 'high').length;
    this.stats.mediumPriorityBatches = batches.filter(b => b.priority === 'medium').length;
    this.stats.lowPriorityBatches = batches.filter(b => b.priority === 'low').length;
    
    // Calculer la réduction estimée des tokens
    const totalTokens = batches.reduce((sum, batch) => sum + batch.estimatedTokens, 0);
    const individualTokens = this.stats.totalScopes * 200; // Estimation pour analyse individuelle
    this.stats.estimatedTokenReduction = individualTokens > 0 ? 
      ((individualTokens - totalTokens) / individualTokens) * 100 : 0;
  }

  /**
   * Initialise les statistiques
   */
  private initializeStats(): BatchStats {
    return {
      totalBatches: 0,
      totalScopes: 0,
      averageBatchSize: 0,
      averageCharsPerBatch: 0,
      highPriorityBatches: 0,
      mediumPriorityBatches: 0,
      lowPriorityBatches: 0,
      estimatedTokenReduction: 0
    };
  }

  /**
   * Remet à zéro les statistiques
   */
  private resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Obtient les statistiques
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Affiche les statistiques
   */
  printStats(): void {
    const stats = this.getStats();
    console.log('\n📊 Statistiques du BatchProcessor:');
    console.log(`   Lots créés: ${stats.totalBatches}`);
    console.log(`   Scopes traités: ${stats.totalScopes}`);
    console.log(`   Taille moyenne des lots: ${stats.averageBatchSize.toFixed(1)} scopes`);
    console.log(`   Chars moyens par lot: ${stats.averageCharsPerBatch.toFixed(0)}`);
    console.log(`   Lots haute priorité: ${stats.highPriorityBatches}`);
    console.log(`   Lots moyenne priorité: ${stats.mediumPriorityBatches}`);
    console.log(`   Lots basse priorité: ${stats.lowPriorityBatches}`);
    console.log(`   Réduction tokens estimée: ${stats.estimatedTokenReduction.toFixed(1)}%`);
  }

  /**
   * Valide qu'un lot respecte les contraintes
   */
  validateBatch(batch: ScopeBatch): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (batch.totalChars > this.config.maxCharsPerBatch) {
      issues.push(`Dépasse la limite de caractères: ${batch.totalChars} > ${this.config.maxCharsPerBatch}`);
    }

    if (batch.scopes.length > this.config.maxScopesPerBatch) {
      issues.push(`Dépasse la limite de scopes: ${batch.scopes.length} > ${this.config.maxScopesPerBatch}`);
    }

    if (batch.scopes.length === 0) {
      issues.push('Lot vide');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}