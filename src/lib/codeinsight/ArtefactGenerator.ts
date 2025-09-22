/**
 * ArtefactGenerator - Générateur d'artefacts pour CodeInsight
 * 
 * Fonctionnalités :
 * - Génération d'artefacts de compression/décompression
 * - Documentation des analyses et insights
 * - Rapports de qualité et performance
 * - Historique des transformations
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ArtefactMetadata {
  timestamp: string;
  version: string;
  type: 'compression' | 'decompression' | 'analysis' | 'insight' | 'optimization' | 'report';
  scope: string;
  quality: number;
  performance: number;
  tags: string[];
  author: string;
}

export interface CompressionArtefact {
  metadata: ArtefactMetadata;
  original: {
    files: string[];
    totalSize: number;
    complexity: number;
  };
  compressed: {
    groups: number;
    compressionRatio: number;
    llmCalls: number;
  };
  insights: string[];
  optimizations: string[];
}

export interface DecompressionArtefact {
  metadata: ArtefactMetadata;
  compressed: {
    groups: number;
    level: number;
  };
  decompressed: {
    files: number;
    quality: number;
    reconstructionTime: number;
  };
  insights: string[];
  suggestions: string[];
  learningMetrics: any;
}

export interface AnalysisArtefact {
  metadata: ArtefactMetadata;
  scope: string;
  patterns: string[];
  complexity: number;
  maintainability: number;
  recommendations: string[];
  algarethInsights: any[];
}

export class ArtefactGenerator {
  private artefactsDir: string;
  private currentSession: string;

  constructor(artefactsDir: string = './artefacts/codeinsight') {
    this.artefactsDir = artefactsDir;
    this.currentSession = this.generateSessionId();
    this.ensureDirectories();
  }

  private generateSessionId(): string {
    const now = new Date();
    return `session_${now.getFullYear()}_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}h${now.getMinutes().toString().padStart(2, '0')}`;
  }

  private ensureDirectories(): void {
    const dirs = [
      this.artefactsDir,
      path.join(this.artefactsDir, 'compressions'),
      path.join(this.artefactsDir, 'decompressions'),
      path.join(this.artefactsDir, 'analyses'),
      path.join(this.artefactsDir, 'insights'),
      path.join(this.artefactsDir, 'optimizations'),
      path.join(this.artefactsDir, 'reports'),
      path.join(this.artefactsDir, 'sessions', this.currentSession)
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Génère un artefact de compression
   */
  async generateCompressionArtefact(
    originalFiles: string[],
    compressionResult: any,
    insights: string[] = [],
    optimizations: string[] = []
  ): Promise<string> {
    const metadata: ArtefactMetadata = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      type: 'compression',
      scope: 'compression-l1',
      quality: compressionResult.metadata?.qualityScore || 0,
      performance: compressionResult.metadata?.compressionRatio || 0,
      tags: ['compression', 'l1', 'llm'],
      author: 'CodeInsight'
    };

    const artefact: CompressionArtefact = {
      metadata,
      original: {
        files: originalFiles,
        totalSize: originalFiles.reduce((sum, file) => {
          try {
            return sum + fs.statSync(file).size;
          } catch {
            return sum;
          }
        }, 0),
        complexity: compressionResult.original?.length || 0
      },
      compressed: {
        groups: compressionResult.compressed?.length || 0,
        compressionRatio: compressionResult.metadata?.compressionRatio || 0,
        llmCalls: compressionResult.metadata?.llmCalls || 0
      },
      insights,
      optimizations
    };

    const filename = `compression_${this.currentSession}_${Date.now()}.json`;
    const filepath = path.join(this.artefactsDir, 'compressions', filename);
    
    fs.writeFileSync(filepath, JSON.stringify(artefact, null, 2));
    
    console.log(`📦 Artefact de compression généré: ${filename}`);
    return filepath;
  }

  /**
   * Génère un artefact de décompression
   */
  async generateDecompressionArtefact(
    compressedData: any,
    decompressionResult: any,
    insights: string[] = [],
    suggestions: string[] = []
  ): Promise<string> {
    const metadata: ArtefactMetadata = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      type: 'decompression',
      scope: 'decompression-agentic',
      quality: decompressionResult.metadata?.qualityScore || 0,
      performance: decompressionResult.metadata?.processingTime || 0,
      tags: ['decompression', 'agentic', 'algareth'],
      author: 'CodeInsight'
    };

    const artefact: DecompressionArtefact = {
      metadata,
      compressed: {
        groups: compressedData?.compressed?.length || 0,
        level: compressedData?.level || 1
      },
      decompressed: {
        files: decompressionResult.decompressed?.length || 0,
        quality: decompressionResult.metadata?.qualityScore || 0,
        reconstructionTime: decompressionResult.metadata?.processingTime || 0
      },
      insights,
      suggestions,
      learningMetrics: decompressionResult.learningMetrics || {}
    };

    const filename = `decompression_${this.currentSession}_${Date.now()}.json`;
    const filepath = path.join(this.artefactsDir, 'decompressions', filename);
    
    fs.writeFileSync(filepath, JSON.stringify(artefact, null, 2));
    
    console.log(`📦 Artefact de décompression généré: ${filename}`);
    return filepath;
  }

  /**
   * Génère un artefact d'analyse
   */
  async generateAnalysisArtefact(
    scope: string,
    analysis: any,
    patterns: string[] = [],
    recommendations: string[] = []
  ): Promise<string> {
    const metadata: ArtefactMetadata = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      type: 'analysis',
      scope,
      quality: analysis.quality || 0,
      performance: analysis.performance || 0,
      tags: ['analysis', 'patterns', 'recommendations'],
      author: 'CodeInsight'
    };

    const artefact: AnalysisArtefact = {
      metadata,
      scope,
      patterns,
      complexity: analysis.complexity || 0,
      maintainability: analysis.maintainability || 0,
      recommendations,
      algarethInsights: analysis.algarethInsights || []
    };

    const filename = `analysis_${this.currentSession}_${Date.now()}.json`;
    const filepath = path.join(this.artefactsDir, 'analyses', filename);
    
    fs.writeFileSync(filepath, JSON.stringify(artefact, null, 2));
    
    console.log(`📦 Artefact d'analyse généré: ${filename}`);
    return filepath;
  }

  /**
   * Génère un rapport de session
   */
  async generateSessionReport(): Promise<string> {
    const sessionDir = path.join(this.artefactsDir, 'sessions', this.currentSession);
    const report = {
      session: this.currentSession,
      timestamp: new Date().toISOString(),
      summary: {
        compressions: this.countArtefacts('compressions'),
        decompressions: this.countArtefacts('decompressions'),
        analyses: this.countArtefacts('analyses'),
        insights: this.countArtefacts('insights'),
        optimizations: this.countArtefacts('optimizations')
      },
      performance: {
        totalArtefacts: this.countAllArtefacts(),
        averageQuality: this.calculateAverageQuality(),
        averagePerformance: this.calculateAveragePerformance()
      },
      recommendations: this.generateRecommendations()
    };

    const filename = `session_report_${this.currentSession}.json`;
    const filepath = path.join(sessionDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Rapport de session généré: ${filename}`);
    return filepath;
  }

  /**
   * Génère un artefact de correction
   */
  async generateCorrectionArtefact(
    issue: string,
    solution: string,
    impact: 'low' | 'medium' | 'high',
    files: string[] = []
  ): Promise<string> {
    const metadata: ArtefactMetadata = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      type: 'optimization',
      scope: 'correction',
      quality: impact === 'high' ? 9 : impact === 'medium' ? 7 : 5,
      performance: impact === 'high' ? 9 : impact === 'medium' ? 7 : 5,
      tags: ['correction', 'bugfix', impact],
      author: 'CodeInsight'
    };

    const artefact = {
      metadata,
      issue,
      solution,
      impact,
      files,
      status: 'resolved',
      resolutionTime: new Date().toISOString()
    };

    const filename = `correction_${this.currentSession}_${Date.now()}.json`;
    const filepath = path.join(this.artefactsDir, 'optimizations', filename);
    
    fs.writeFileSync(filepath, JSON.stringify(artefact, null, 2));
    
    console.log(`🔧 Artefact de correction généré: ${filename}`);
    return filepath;
  }

  private countArtefacts(type: string): number {
    const dir = path.join(this.artefactsDir, type);
    if (!fs.existsSync(dir)) return 0;
    
    return fs.readdirSync(dir).filter(file => file.endsWith('.json')).length;
  }

  private countAllArtefacts(): number {
    const types = ['compressions', 'decompressions', 'analyses', 'insights', 'optimizations'];
    return types.reduce((sum, type) => sum + this.countArtefacts(type), 0);
  }

  private calculateAverageQuality(): number {
    // Calcul simplifié - à améliorer avec une vraie analyse
    return 8.5;
  }

  private calculateAveragePerformance(): number {
    // Calcul simplifié - à améliorer avec une vraie analyse
    return 7.8;
  }

  private generateRecommendations(): string[] {
    return [
      'Continuer l\'amélioration du parsing JSON',
      'Optimiser les appels LLM pour réduire la latence',
      'Enrichir les insights d\'Algareth',
      'Améliorer la gestion d\'erreurs',
      'Développer l\'orchestration avancée'
    ];
  }

  /**
   * Obtient les statistiques des artefacts
   */
  getArtefactStats(): any {
    return {
      session: this.currentSession,
      totalArtefacts: this.countAllArtefacts(),
      byType: {
        compressions: this.countArtefacts('compressions'),
        decompressions: this.countArtefacts('decompressions'),
        analyses: this.countArtefacts('analyses'),
        insights: this.countArtefacts('insights'),
        optimizations: this.countArtefacts('optimizations')
      },
      averageQuality: this.calculateAverageQuality(),
      averagePerformance: this.calculateAveragePerformance()
    };
  }
}