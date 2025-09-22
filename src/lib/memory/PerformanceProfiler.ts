/**
 * PerformanceProfiler - Système de mesure de performance
 * 
 * Mesure précisément les opérations lourdes et génère des artefacts de performance
 */

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: number;
  llmCalls: number;
  details: Record<string, any>;
}

export interface PerformanceReport {
  totalDuration: number;
  operations: PerformanceMetrics[];
  bottlenecks: Bottleneck[];
  recommendations: string[];
  summary: {
    totalOperations: number;
    totalLLMCalls: number;
    averageDuration: number;
    memoryPeak: number;
  };
}

export interface Bottleneck {
  operation: string;
  duration: number;
  percentage: number;
  recommendation: string;
}

export class PerformanceProfiler {
  private metrics: PerformanceMetrics[] = [];
  private currentOperation: string | null = null;
  private startTime: number = 0;
  private llmCallCount: number = 0;

  /**
   * Démarre une opération
   */
  startOperation(operation: string): void {
    if (this.currentOperation) {
      console.warn(`⚠️  Opération ${this.currentOperation} non terminée, démarrage de ${operation}`);
    }
    
    this.currentOperation = operation;
    this.startTime = performance.now();
    
    console.log(`🔄 Début: ${operation}`);
  }

  /**
   * Termine une opération
   */
  endOperation(): PerformanceMetrics {
    if (!this.currentOperation) {
      throw new Error('Aucune opération en cours');
    }
    
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    const memoryUsage = process.memoryUsage().heapUsed;
    
    const metric: PerformanceMetrics = {
      operation: this.currentOperation,
      startTime: this.startTime,
      endTime,
      duration,
      memoryUsage,
      llmCalls: 0,
      details: {}
    };
    
    this.metrics.push(metric);
    
    console.log(`✅ Fin: ${this.currentOperation} (${duration.toFixed(2)}ms)`);
    
    this.currentOperation = null;
    return metric;
  }

  /**
   * Enregistre un appel LLM
   */
  recordLLMCall(operation: string, details: Record<string, any> = {}): void {
    this.llmCallCount++;
    
    // Trouver l'opération en cours ou la dernière
    let targetMetric: PerformanceMetrics | undefined;
    
    if (this.currentOperation === operation) {
      targetMetric = this.metrics[this.metrics.length - 1];
    } else {
      targetMetric = this.metrics.find(m => m.operation === operation);
    }
    
    if (targetMetric) {
      targetMetric.llmCalls++;
      targetMetric.details = { ...targetMetric.details, ...details };
    }
    
    console.log(`🤖 Appel LLM: ${operation} (total: ${this.llmCallCount})`);
  }

  /**
   * Génère le rapport de performance
   */
  getReport(): PerformanceReport {
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const totalLLMCalls = this.metrics.reduce((sum, m) => sum + m.llmCalls, 0);
    const averageDuration = totalDuration / this.metrics.length;
    const memoryPeak = Math.max(...this.metrics.map(m => m.memoryUsage));
    
    const bottlenecks = this.identifyBottlenecks(totalDuration);
    const recommendations = this.generateRecommendations(bottlenecks);
    
    return {
      totalDuration,
      operations: this.metrics,
      bottlenecks,
      recommendations,
      summary: {
        totalOperations: this.metrics.length,
        totalLLMCalls,
        averageDuration,
        memoryPeak
      }
    };
  }

  /**
   * Identifie les goulots d'étranglement
   */
  private identifyBottlenecks(totalDuration: number): Bottleneck[] {
    return this.metrics
      .map(metric => ({
        operation: metric.operation,
        duration: metric.duration,
        percentage: (metric.duration / totalDuration) * 100,
        recommendation: this.getRecommendation(metric)
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5); // Top 5 des goulots d'étranglement
  }

  /**
   * Génère des recommandations
   */
  private generateRecommendations(bottlenecks: Bottleneck[]): string[] {
    const recommendations: string[] = [];
    
    for (const bottleneck of bottlenecks) {
      if (bottleneck.percentage > 50) {
        recommendations.push(`🚨 CRITIQUE: ${bottleneck.operation} représente ${bottleneck.percentage.toFixed(1)}% du temps total`);
      } else if (bottleneck.percentage > 20) {
        recommendations.push(`⚠️  IMPORTANT: ${bottleneck.operation} représente ${bottleneck.percentage.toFixed(1)}% du temps total`);
      }
      
      recommendations.push(bottleneck.recommendation);
    }
    
    // Recommandations générales
    const llmOperations = this.metrics.filter(m => m.llmCalls > 0);
    if (llmOperations.length > 0) {
      const totalLLMTime = llmOperations.reduce((sum, m) => sum + m.duration, 0);
      const llmPercentage = (totalLLMTime / this.metrics.reduce((sum, m) => sum + m.duration, 0)) * 100;
      
      if (llmPercentage > 80) {
        recommendations.push('💡 OPTIMISATION: 80%+ du temps consacré aux appels LLM - considérer le cache ou le mode test');
      }
    }
    
    return recommendations;
  }

  /**
   * Génère une recommandation pour une métrique
   */
  private getRecommendation(metric: PerformanceMetrics): string {
    if (metric.llmCalls > 0) {
      if (metric.duration > 5000) {
        return `💡 OPTIMISATION: ${metric.operation} prend ${metric.duration.toFixed(0)}ms - considérer le cache ou l'optimisation du prompt`;
      } else if (metric.duration > 2000) {
        return `⚡ AMÉLIORATION: ${metric.operation} prend ${metric.duration.toFixed(0)}ms - optimiser le prompt ou réduire la taille`;
      }
    }
    
    if (metric.duration > 1000) {
      return `🔧 OPTIMISATION: ${metric.operation} prend ${metric.duration.toFixed(0)}ms - optimiser l'algorithme`;
    }
    
    return `✅ OK: ${metric.operation} performant (${metric.duration.toFixed(0)}ms)`;
  }

  /**
   * Réinitialise le profiler
   */
  reset(): void {
    this.metrics = [];
    this.currentOperation = null;
    this.startTime = 0;
    this.llmCallCount = 0;
  }

  /**
   * Exporte les métriques en JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      report: this.getReport()
    }, null, 2);
  }
}

/**
 * OperationTracker - Tracker d'opérations avec profiler
 */
export class OperationTracker {
  private profiler: PerformanceProfiler;

  constructor(profiler: PerformanceProfiler) {
    this.profiler = profiler;
  }

  /**
   * Track un appel LLM
   */
  async trackLLMCall(operation: string, llmFunction: () => Promise<any>): Promise<any> {
    this.profiler.startOperation(`LLM_${operation}`);
    
    try {
      const result = await llmFunction();
      const metric = this.profiler.endOperation();
      this.profiler.recordLLMCall(`LLM_${operation}`, {
        model: 'gemini-1.5-flash',
        success: true,
        resultType: typeof result
      });
      return result;
    } catch (error) {
      this.profiler.endOperation();
      this.profiler.recordLLMCall(`LLM_${operation}`, {
        model: 'gemini-1.5-flash',
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Track une opération de compression
   */
  async trackCompression(operation: string, compressionFunction: () => Promise<any>): Promise<any> {
    this.profiler.startOperation(`COMPRESSION_${operation}`);
    
    try {
      const result = await compressionFunction();
      const metric = this.profiler.endOperation();
      metric.details = {
        level: result.level,
        itemsCompressed: result.itemsCompressed,
        compressionRatio: result.compressionRatio
      };
      return result;
    } catch (error) {
      this.profiler.endOperation();
      throw error;
    }
  }

  /**
   * Track une opération de recherche
   */
  async trackSearch(operation: string, searchFunction: () => Promise<any>): Promise<any> {
    this.profiler.startOperation(`SEARCH_${operation}`);
    
    try {
      const result = await searchFunction();
      const metric = this.profiler.endOperation();
      metric.details = {
        query: result.query,
        resultsCount: result.results?.length || 0,
        levelsSearched: result.levelsSearched || []
      };
      return result;
    } catch (error) {
      this.profiler.endOperation();
      throw error;
    }
  }
}

/**
 * PerformanceArtifactGenerator - Générateur d'artefacts de performance
 */
export class PerformanceArtifactGenerator {
  generatePerformanceReport(profiler: PerformanceProfiler): string {
    const report = profiler.getReport();
    
    return `# Rapport de Performance - ${new Date().toISOString()}

## 📊 Métriques Globales
- **Durée totale** : ${report.totalDuration.toFixed(2)}ms
- **Opérations** : ${report.summary.totalOperations}
- **Appels LLM** : ${report.summary.totalLLMCalls}
- **Durée moyenne** : ${report.summary.averageDuration.toFixed(2)}ms
- **Pic mémoire** : ${(report.summary.memoryPeak / 1024 / 1024).toFixed(2)}MB

## 🔍 Opérations Lourdes
${report.operations
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 10)
  .map(op => `
### ${op.operation}
- **Durée** : ${op.duration.toFixed(2)}ms
- **Appels LLM** : ${op.llmCalls}
- **Mémoire** : ${(op.memoryUsage / 1024 / 1024).toFixed(2)}MB
- **Détails** : ${JSON.stringify(op.details, null, 2)}
`).join('\n')}

## ⚠️ Goulots d'Étranglement
${report.bottlenecks.map(bottleneck => `
- **${bottleneck.operation}** : ${bottleneck.duration.toFixed(2)}ms (${bottleneck.percentage.toFixed(1)}%)
  - ${bottleneck.recommendation}
`).join('\n')}

## 💡 Recommandations
${report.recommendations.map(rec => `
- ${rec}
`).join('\n')}

## 📈 Analyse
- **Opération la plus lente** : ${report.operations.sort((a, b) => b.duration - a.duration)[0]?.operation} (${report.operations.sort((a, b) => b.duration - a.duration)[0]?.duration.toFixed(2)}ms)
- **Opération avec le plus d'appels LLM** : ${report.operations.sort((a, b) => b.llmCalls - a.llmCalls)[0]?.operation} (${report.operations.sort((a, b) => b.llmCalls - a.llmCalls)[0]?.llmCalls} appels)
- **Efficacité LLM** : ${report.summary.totalLLMCalls > 0 ? (report.totalDuration / report.summary.totalLLMCalls).toFixed(2) : 'N/A'}ms par appel LLM
`;
  }
}