/**
 * AlgarethCompressionPipeline - Pipeline de compression/décompression avec Algareth
 * 
 * Fonctionnalités :
 * - Intégration d'Algareth dans le pipeline de compression
 * - Apprentissage des transformations réussies
 * - Amélioration des analyses basée sur l'expérience
 * - Compression intelligente avec contexte agentique
 * - Décompression enrichie par l'apprentissage
 */

import { CodeInsightAlgarethAgent } from './CodeInsightAlgarethAgent';
import { EnhancedCodeCompressionEngine, CompressedCode, CodeFile } from './EnhancedCodeCompressionEngine';
import { IntelligentDecompressionEngine, DecompressionRequest, DecompressionResult } from './IntelligentDecompressionEngine';
import { TypeScriptScope } from './TypeScriptParser';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

export interface AlgarethCompressionRequest {
  files: string[];
  targetLevel: 1 | 2 | 3;
  learningMode: 'passive' | 'active' | 'aggressive';
  contextEnrichment: boolean;
  preserveExperience: boolean;
}

export interface AlgarethCompressionResult {
  success: boolean;
  compressed: CompressedCode[];
  original: CodeFile[];
  algarethInsights: AlgarethInsight[];
  learningData: LearningData;
  compressionMetrics: CompressionMetrics;
  errors?: string[];
}

export interface AlgarethInsight {
  type: 'pattern' | 'transformation' | 'optimization' | 'warning';
  scope: string;
  description: string;
  confidence: number;
  suggestions: string[];
  experience: number;
}

export interface LearningData {
  patternsLearned: string[];
  transformationsMemorized: number;
  qualityImprovements: number;
  experienceGained: number;
  insightsGenerated: number;
}

export interface CompressionMetrics {
  compressionRatio: number;
  qualityScore: number;
  algarethEnhancement: number;
  learningEffectiveness: number;
  processingTime: number;
  llmCalls: number;
}

export interface AlgarethDecompressionRequest {
  compressedItems: CompressedCode[];
  targetContext?: string;
  reconstructionLevel: 'minimal' | 'standard' | 'complete';
  useAlgarethExperience: boolean;
  learningMode: 'passive' | 'active' | 'aggressive';
}

export interface AlgarethDecompressionResult {
  success: boolean;
  decompressed: CodeFile[];
  algarethInsights: AlgarethInsight[];
  learningData: LearningData;
  reconstructionMetrics: ReconstructionMetrics;
  errors?: string[];
}

export interface ReconstructionMetrics {
  reconstructionQuality: number;
  contextRestoration: number;
  algarethEnhancement: number;
  learningEffectiveness: number;
  processingTime: number;
  llmCalls: number;
}

export class AlgarethCompressionPipeline {
  private algarethAgent: CodeInsightAlgarethAgent;
  private compressionEngine: EnhancedCodeCompressionEngine;
  private decompressionEngine: IntelligentDecompressionEngine;
  private learningHistory: Array<{
    timestamp: string;
    type: 'compression' | 'decompression';
    success: boolean;
    insights: AlgarethInsight[];
    learningData: LearningData;
  }> = [];

  constructor() {
    this.algarethAgent = new CodeInsightAlgarethAgent();
    this.compressionEngine = new EnhancedCodeCompressionEngine();
    this.decompressionEngine = new IntelligentDecompressionEngine();
    
    console.log('🧠 Algareth Compression Pipeline initialisé');
  }

  /**
   * Compression avec apprentissage d'Algareth
   */
  async compressWithAlgareth(request: AlgarethCompressionRequest): Promise<AlgarethCompressionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧠 Compression avec Algareth (niveau L${request.targetLevel}, mode: ${request.learningMode})...`);
      
      // Phase 1: Chargement et analyse avec Algareth
      const loadedFiles = await this.loadFilesWithAlgareth(request.files);
      
      // Phase 2: Compression standard
      const fileIds = loadedFiles.map(f => f.id);
      const compressionResult = await this.compressionEngine.compressToL1(fileIds);
      
      if (!compressionResult.success) {
        throw new Error(`Compression échouée: ${compressionResult.errors?.join(', ')}`);
      }
      
      // Phase 3: Analyse et apprentissage avec Algareth
      const algarethInsights = await this.analyzeCompressionWithAlgareth(
        compressionResult.compressed,
        request.learningMode
      );
      
      // Phase 4: Enrichissement contextuel si demandé
      if (request.contextEnrichment) {
        await this.enrichCompressionWithAlgareth(compressionResult.compressed, algarethInsights);
      }
      
      // Phase 5: Apprentissage et mémorisation
      const learningData = await this.learnFromCompression(
        compressionResult,
        algarethInsights,
        request.learningMode
      );
      
      // Phase 6: Calcul des métriques
      const compressionMetrics = this.calculateCompressionMetrics(
        compressionResult,
        algarethInsights,
        learningData,
        Date.now() - startTime
      );
      
      // Enregistrer dans l'historique
      this.recordLearning('compression', true, algarethInsights, learningData);
      
      console.log(`✅ Compression avec Algareth terminée: ${compressionResult.compressed.length} éléments, ${algarethInsights.length} insights`);
      
      return {
        success: true,
        compressed: compressionResult.compressed,
        original: compressionResult.original,
        algarethInsights,
        learningData,
        compressionMetrics
      };
      
    } catch (error) {
      console.error('❌ Erreur compression avec Algareth:', error);
      
      // Enregistrer l'échec
      this.recordLearning('compression', false, [], this.getEmptyLearningData());
      
      return {
        success: false,
        compressed: [],
        original: [],
        algarethInsights: [],
        learningData: this.getEmptyLearningData(),
        compressionMetrics: this.getEmptyCompressionMetrics(),
        errors: [error.toString()]
      };
    }
  }

  /**
   * Décompression avec expérience d'Algareth
   */
  async decompressWithAlgareth(request: AlgarethDecompressionRequest): Promise<AlgarethDecompressionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧠 Décompression avec Algareth (mode: ${request.learningMode})...`);
      
      // Phase 1: Recherche d'expérience similaire
      let algarethContext = '';
      if (request.useAlgarethExperience) {
        algarethContext = await this.searchSimilarExperience(request.compressedItems);
      }
      
      // Phase 2: Décompression standard
      const decompressionRequest: DecompressionRequest = {
        compressedItems: request.compressedItems,
        targetContext: request.targetContext || algarethContext,
        reconstructionLevel: request.reconstructionLevel,
        preserveOriginalStructure: true,
        includeMetadata: true
      };
      
      const decompressionResult = await this.decompressionEngine.decompressIntelligently(decompressionRequest);
      
      if (!decompressionResult.success) {
        throw new Error(`Décompression échouée: ${decompressionResult.errors?.join(', ')}`);
      }
      
      // Phase 3: Analyse et apprentissage avec Algareth
      const algarethInsights = await this.analyzeDecompressionWithAlgareth(
        decompressionResult,
        request.learningMode
      );
      
      // Phase 4: Apprentissage des transformations
      const learningData = await this.learnFromDecompression(
        decompressionResult,
        algarethInsights,
        request.learningMode
      );
      
      // Phase 5: Calcul des métriques
      const reconstructionMetrics = this.calculateReconstructionMetrics(
        decompressionResult,
        algarethInsights,
        learningData,
        Date.now() - startTime
      );
      
      // Enregistrer dans l'historique
      this.recordLearning('decompression', true, algarethInsights, learningData);
      
      console.log(`✅ Décompression avec Algareth terminée: ${decompressionResult.decompressed.length} fichiers, ${algarethInsights.length} insights`);
      
      return {
        success: true,
        decompressed: decompressionResult.decompressed,
        algarethInsights,
        learningData,
        reconstructionMetrics
      };
      
    } catch (error) {
      console.error('❌ Erreur décompression avec Algareth:', error);
      
      // Enregistrer l'échec
      this.recordLearning('decompression', false, [], this.getEmptyLearningData());
      
      return {
        success: false,
        decompressed: [],
        algarethInsights: [],
        learningData: this.getEmptyLearningData(),
        reconstructionMetrics: this.getEmptyReconstructionMetrics(),
        errors: [error.toString()]
      };
    }
  }

  /**
   * Charge les fichiers avec analyse d'Algareth
   */
  private async loadFilesWithAlgareth(filePaths: string[]): Promise<CodeFile[]> {
    const loadedFiles: CodeFile[] = [];
    
    for (const filePath of filePaths) {
      try {
        const file = await this.compressionEngine.loadFile(filePath);
        loadedFiles.push(file);
        
        // Analyser avec Algareth pour enrichir le contexte
        if (file.ast) {
          await this.algarethAgent.analyzeScopeWithMemory(file.ast, `Chargement fichier: ${filePath}`);
        }
      } catch (error) {
        console.warn(`⚠️ Erreur chargement ${filePath}:`, error);
      }
    }
    
    return loadedFiles;
  }

  /**
   * Analyse la compression avec Algareth
   */
  private async analyzeCompressionWithAlgareth(
    compressed: CompressedCode[],
    learningMode: 'passive' | 'active' | 'aggressive'
  ): Promise<AlgarethInsight[]> {
    const insights: AlgarethInsight[] = [];
    
    for (const item of compressed) {
      try {
        // Analyser les patterns de compression
        const patternInsights = await this.analyzeCompressionPatterns(item);
        insights.push(...patternInsights);
        
        // Analyser les opportunités d'optimisation
        if (learningMode === 'active' || learningMode === 'aggressive') {
          const optimizationInsights = await this.analyzeOptimizationOpportunities(item);
          insights.push(...optimizationInsights);
        }
        
        // Analyser les avertissements
        const warningInsights = await this.analyzeCompressionWarnings(item);
        insights.push(...warningInsights);
        
      } catch (error) {
        console.warn(`⚠️ Erreur analyse compression ${item.name}:`, error);
      }
    }
    
    return insights;
  }

  /**
   * Analyse les patterns de compression
   */
  private async analyzeCompressionPatterns(item: CompressedCode): Promise<AlgarethInsight[]> {
    const insights: AlgarethInsight[] = [];
    
    // Analyser la stratégie de compression
    if (item.metadata.compressionStrategy) {
      insights.push({
        type: 'pattern',
        scope: item.name,
        description: `Stratégie de compression détectée: ${item.metadata.compressionStrategy}`,
        confidence: 0.8,
        suggestions: [
          'Considérer cette stratégie pour des fichiers similaires',
          'Optimiser les paramètres de compression'
        ],
        experience: 1
      });
    }
    
    // Analyser la qualité de compression
    if (item.compressionRatio > 0.8) {
      insights.push({
        type: 'pattern',
        scope: item.name,
        description: `Compression élevée détectée (${(item.compressionRatio * 100).toFixed(1)}%)`,
        confidence: 0.9,
        suggestions: [
          'Vérifier la préservation du contexte',
          'Considérer une compression moins agressive si nécessaire'
        ],
        experience: 1
      });
    }
    
    return insights;
  }

  /**
   * Analyse les opportunités d'optimisation
   */
  private async analyzeOptimizationOpportunities(item: CompressedCode): Promise<AlgarethInsight[]> {
    const insights: AlgarethInsight[] = [];
    
    // Analyser les suggestions de refactoring
    if (item.metadata.refactoringSuggestions && item.metadata.refactoringSuggestions.length > 0) {
      insights.push({
        type: 'optimization',
        scope: item.name,
        description: `${item.metadata.refactoringSuggestions.length} suggestions de refactoring identifiées`,
        confidence: 0.7,
        suggestions: item.metadata.refactoringSuggestions,
        experience: 2
      });
    }
    
    // Analyser la pertinence du contexte
    if (item.metadata.contextRelevance < 0.7) {
      insights.push({
        type: 'optimization',
        scope: item.name,
        description: `Pertinence du contexte faible (${(item.metadata.contextRelevance * 100).toFixed(1)}%)`,
        confidence: 0.8,
        suggestions: [
          'Améliorer l\'analyse contextuelle',
          'Enrichir les métadonnées de compression'
        ],
        experience: 1
      });
    }
    
    return insights;
  }

  /**
   * Analyse les avertissements de compression
   */
  private async analyzeCompressionWarnings(item: CompressedCode): Promise<AlgarethInsight[]> {
    const insights: AlgarethInsight[] = [];
    
    // Avertissement sur la complexité de reconstruction
    if (item.metadata.reconstructionComplexity > 0.8) {
      insights.push({
        type: 'warning',
        scope: item.name,
        description: `Complexité de reconstruction élevée (${(item.metadata.reconstructionComplexity * 100).toFixed(1)}%)`,
        confidence: 0.9,
        suggestions: [
          'Simplifier la structure de compression',
          'Prévoir des tests de reconstruction'
        ],
        experience: 1
      });
    }
    
    // Avertissement sur la qualité
    if (item.metadata.qualityScore < 6) {
      insights.push({
        type: 'warning',
        scope: item.name,
        description: `Qualité de compression faible (${item.metadata.qualityScore}/10)`,
        confidence: 0.8,
        suggestions: [
          'Revoir la stratégie de compression',
          'Améliorer l\'analyse du code source'
        ],
        experience: 1
      });
    }
    
    return insights;
  }

  /**
   * Enrichit la compression avec les insights d'Algareth
   */
  private async enrichCompressionWithAlgareth(
    compressed: CompressedCode[],
    insights: AlgarethInsight[]
  ): Promise<void> {
    for (const item of compressed) {
      // Enrichir les métadonnées avec les insights
      const relevantInsights = insights.filter(i => i.scope === item.name);
      
      if (relevantInsights.length > 0) {
        item.metadata = {
          ...item.metadata,
          algarethInsights: relevantInsights.map(i => ({
            type: i.type,
            description: i.description,
            confidence: i.confidence
          }))
        };
      }
    }
  }

  /**
   * Apprend de la compression
   */
  private async learnFromCompression(
    compressionResult: any,
    insights: AlgarethInsight[],
    learningMode: 'passive' | 'active' | 'aggressive'
  ): Promise<LearningData> {
    const patternsLearned: string[] = [];
    let transformationsMemorized = 0;
    let qualityImprovements = 0;
    let experienceGained = 0;
    let insightsGenerated = insights.length;
    
    // Apprentissage des patterns
    for (const insight of insights) {
      if (insight.type === 'pattern') {
        patternsLearned.push(insight.description);
        experienceGained += insight.experience;
      }
      
      if (insight.type === 'transformation') {
        transformationsMemorized++;
        experienceGained += insight.experience;
      }
      
      if (insight.type === 'optimization') {
        qualityImprovements++;
        experienceGained += insight.experience;
      }
    }
    
    // Apprentissage actif/agressif
    if (learningMode === 'active' || learningMode === 'aggressive') {
      // Mémoriser les transformations réussies
      for (const compressed of compressionResult.compressed) {
        await this.memorizeTransformation(compressed, insights);
      }
    }
    
    return {
      patternsLearned,
      transformationsMemorized,
      qualityImprovements,
      experienceGained,
      insightsGenerated
    };
  }

  /**
   * Mémorise une transformation
   */
  private async memorizeTransformation(compressed: CompressedCode, insights: AlgarethInsight[]): Promise<void> {
    try {
      // Créer un scope factice pour la mémorisation
      const mockScope: TypeScriptScope = {
        name: compressed.name,
        type: 'compressed',
        startLine: 1,
        endLine: 10,
        content: compressed.content,
        complexity: compressed.metrics.complexity,
        modifiers: [],
        dependencies: [],
        parameters: [],
        returnType: undefined
      };
      
      // Mémoriser avec Algareth
      await this.algarethAgent.analyzeScopeWithMemory(
        mockScope,
        `Transformation mémorisée: ${compressed.name} - ${insights.length} insights`
      );
      
    } catch (error) {
      console.warn('⚠️ Erreur mémorisation transformation:', error);
    }
  }

  /**
   * Recherche une expérience similaire
   */
  private async searchSimilarExperience(compressedItems: CompressedCode[]): Promise<string> {
    try {
      // Construire une requête de recherche basée sur les éléments compressés
      const searchQuery = compressedItems
        .map(item => `${item.name} ${item.description}`)
        .join(' ');
      
      // Utiliser Algareth pour rechercher une expérience similaire
      // Note: Cette méthode nécessiterait une extension de l'API d'Algareth
      return `Contexte basé sur l'expérience: ${searchQuery}`;
      
    } catch (error) {
      console.warn('⚠️ Erreur recherche expérience similaire:', error);
      return '';
    }
  }

  /**
   * Analyse la décompression avec Algareth
   */
  private async analyzeDecompressionWithAlgareth(
    decompressionResult: DecompressionResult,
    learningMode: 'passive' | 'active' | 'aggressive'
  ): Promise<AlgarethInsight[]> {
    const insights: AlgarethInsight[] = [];
    
    // Analyser la qualité de reconstruction
    if (decompressionResult.reconstructionQuality < 0.7) {
      insights.push({
        type: 'warning',
        scope: 'reconstruction',
        description: `Qualité de reconstruction faible (${(decompressionResult.reconstructionQuality * 100).toFixed(1)}%)`,
        confidence: 0.8,
        suggestions: [
          'Améliorer la stratégie de reconstruction',
          'Enrichir le contexte de décompression'
        ],
        experience: 1
      });
    }
    
    // Analyser la restauration du contexte
    if (decompressionResult.contextRestoration < 0.7) {
      insights.push({
        type: 'optimization',
        scope: 'context',
        description: `Restauration du contexte faible (${(decompressionResult.contextRestoration * 100).toFixed(1)}%)`,
        confidence: 0.7,
        suggestions: [
          'Améliorer la préservation du contexte',
          'Utiliser l\'expérience d\'Algareth'
        ],
        experience: 1
      });
    }
    
    return insights;
  }

  /**
   * Apprend de la décompression
   */
  private async learnFromDecompression(
    decompressionResult: DecompressionResult,
    insights: AlgarethInsight[],
    learningMode: 'passive' | 'active' | 'aggressive'
  ): Promise<LearningData> {
    const patternsLearned: string[] = [];
    let transformationsMemorized = 0;
    let qualityImprovements = 0;
    let experienceGained = 0;
    let insightsGenerated = insights.length;
    
    // Apprentissage des patterns de reconstruction
    for (const insight of insights) {
      if (insight.type === 'pattern') {
        patternsLearned.push(insight.description);
        experienceGained += insight.experience;
      }
      
      if (insight.type === 'transformation') {
        transformationsMemorized++;
        experienceGained += insight.experience;
      }
      
      if (insight.type === 'optimization') {
        qualityImprovements++;
        experienceGained += insight.experience;
      }
    }
    
    return {
      patternsLearned,
      transformationsMemorized,
      qualityImprovements,
      experienceGained,
      insightsGenerated
    };
  }

  /**
   * Calcule les métriques de compression
   */
  private calculateCompressionMetrics(
    compressionResult: any,
    insights: AlgarethInsight[],
    learningData: LearningData,
    processingTime: number
  ): CompressionMetrics {
    const algarethEnhancement = insights.length > 0 ? 
      insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length : 0;
    
    const learningEffectiveness = learningData.experienceGained > 0 ? 
      Math.min(1, learningData.experienceGained / 10) : 0;
    
    return {
      compressionRatio: compressionResult.compressionRatio,
      qualityScore: compressionResult.qualityMetrics?.semanticPreservation || 0.5,
      algarethEnhancement,
      learningEffectiveness,
      processingTime,
      llmCalls: compressionResult.llmCalls
    };
  }

  /**
   * Calcule les métriques de reconstruction
   */
  private calculateReconstructionMetrics(
    decompressionResult: DecompressionResult,
    insights: AlgarethInsight[],
    learningData: LearningData,
    processingTime: number
  ): ReconstructionMetrics {
    const algarethEnhancement = insights.length > 0 ? 
      insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length : 0;
    
    const learningEffectiveness = learningData.experienceGained > 0 ? 
      Math.min(1, learningData.experienceGained / 10) : 0;
    
    return {
      reconstructionQuality: decompressionResult.reconstructionQuality,
      contextRestoration: decompressionResult.contextRestoration,
      algarethEnhancement,
      learningEffectiveness,
      processingTime,
      llmCalls: decompressionResult.llmCalls
    };
  }

  /**
   * Enregistre l'apprentissage dans l'historique
   */
  private recordLearning(
    type: 'compression' | 'decompression',
    success: boolean,
    insights: AlgarethInsight[],
    learningData: LearningData
  ): void {
    this.learningHistory.push({
      timestamp: new Date().toISOString(),
      type,
      success,
      insights,
      learningData
    });
    
    // Garder seulement les 100 derniers enregistrements
    if (this.learningHistory.length > 100) {
      this.learningHistory = this.learningHistory.slice(-100);
    }
  }

  /**
   * Obtient les données d'apprentissage vides
   */
  private getEmptyLearningData(): LearningData {
    return {
      patternsLearned: [],
      transformationsMemorized: 0,
      qualityImprovements: 0,
      experienceGained: 0,
      insightsGenerated: 0
    };
  }

  /**
   * Obtient les métriques de compression vides
   */
  private getEmptyCompressionMetrics(): CompressionMetrics {
    return {
      compressionRatio: 0,
      qualityScore: 0,
      algarethEnhancement: 0,
      learningEffectiveness: 0,
      processingTime: 0,
      llmCalls: 0
    };
  }

  /**
   * Obtient les métriques de reconstruction vides
   */
  private getEmptyReconstructionMetrics(): ReconstructionMetrics {
    return {
      reconstructionQuality: 0,
      contextRestoration: 0,
      algarethEnhancement: 0,
      learningEffectiveness: 0,
      processingTime: 0,
      llmCalls: 0
    };
  }

  /**
   * Obtient les statistiques du pipeline
   */
  getPipelineStats(): any {
    const totalOperations = this.learningHistory.length;
    const successfulOperations = this.learningHistory.filter(h => h.success).length;
    const successRate = totalOperations > 0 ? successfulOperations / totalOperations : 0;
    
    const totalInsights = this.learningHistory.reduce((sum, h) => sum + h.insights.length, 0);
    const totalExperience = this.learningHistory.reduce((sum, h) => 
      sum + h.learningData.experienceGained, 0);
    
    const compressionOps = this.learningHistory.filter(h => h.type === 'compression').length;
    const decompressionOps = this.learningHistory.filter(h => h.type === 'decompression').length;
    
    return {
      totalOperations,
      successfulOperations,
      successRate,
      totalInsights,
      totalExperience,
      compressionOps,
      decompressionOps,
      algarethStats: this.algarethAgent.getLearningStats()
    };
  }
}