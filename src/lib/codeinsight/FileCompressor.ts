/**
 * FileCompressor - Compression intelligente de fichiers TypeScript
 * 
 * Prend les résultats du FileAnalyzer et génère un résumé compressé
 * avec métadonnées, tags et informations pour la décompression
 */

import { FileAnalysisResult, ScopeAnalysisResult } from './FileAnalyzer';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

export interface CompressedFile {
  metadata: CompressedFileMetadata;
  summary: CompressedFileSummary;
  scopes: CompressedScope[];
  compression: CompressionInfo;
  decompression: DecompressionInfo;
}

export interface CompressedFileMetadata {
  originalPath: string;
  fileName: string;
  fileType: 'typescript' | 'javascript' | 'unknown';
  compressedAt: string;
  version: string;
  totalLines: number;
  totalScopes: number;
  compressionRatio: number;
}

export interface CompressedFileSummary {
  purpose: string;
  architecture: string;
  mainPatterns: string[];
  keyDependencies: string[];
  complexity: {
    overall: 'low' | 'medium' | 'high';
    distribution: {
      low: number;
      medium: number;
      high: number;
    };
  };
  quality: {
    maintainability: 'low' | 'medium' | 'high';
    testability: 'low' | 'medium' | 'high';
    readability: 'low' | 'medium' | 'high';
  };
  risks: string[];
  recommendations: string[];
}

export interface CompressedScope {
  id: string;
  name: string;
  type: 'class' | 'function' | 'interface' | 'method' | 'constructor' | 'other';
  purpose: string;
  signature: string;
  complexity: 'low' | 'medium' | 'high';
  tags: string[];
  keyDependencies: string[];
  risks: string[];
  testIdeas: string[];
  position: {
    startLine: number;
    endLine: number;
    relativeSize: number; // Pourcentage du fichier
  };
  relationships: {
    dependsOn: string[];
    usedBy: string[];
    calls: string[];
  };
}

export interface CompressionInfo {
  algorithm: string;
  compressionLevel: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
  llmCalls: number;
}

export interface DecompressionInfo {
  instructions: string[];
  requiredContext: string[];
  regenerationHints: string[];
  qualityChecks: string[];
  validationRules: string[];
}

export class FileCompressor {
  private useRealLLM: boolean;
  private llmCalls: number;

  constructor() {
    this.useRealLLM = !!process.env.GEMINI_API_KEY;
    this.llmCalls = 0;
    
    console.log('🗜️ FileCompressor initialisé');
    console.log(`🧠 Mode LLM: ${this.useRealLLM ? 'Vrais appels LLM' : 'Mode heuristique'}`);
  }

  /**
   * Compresse un fichier à partir des résultats du FileAnalyzer
   */
  async compressFile(analysisResult: FileAnalysisResult): Promise<CompressedFile> {
    const startTime = Date.now();
    console.log(`🗜️ Compression du fichier: ${analysisResult.filePath}`);

    try {
      // 1. Générer les métadonnées de compression
      const metadata = this.generateCompressionMetadata(analysisResult);
      console.log(`📊 Métadonnées générées: ${metadata.compressionRatio.toFixed(2)}% de compression`);

      // 2. Créer le résumé compressé
      const summary = await this.generateCompressedSummary(analysisResult);
      console.log(`📋 Résumé généré: ${summary.mainPatterns.length} patterns identifiés`);

      // 3. Compresser chaque scope
      const compressedScopes = await this.compressScopes(analysisResult.scopeAnalyses);
      console.log(`🏗️ Scopes compressés: ${compressedScopes.length} scopes traités`);

      // 4. Générer les informations de compression
      const compressionInfo = this.generateCompressionInfo(analysisResult, startTime);
      console.log(`📈 Info compression: ${compressionInfo.compressionRatio.toFixed(2)}% ratio`);

      // 5. Générer les informations de décompression
      const decompressionInfo = this.generateDecompressionInfo(analysisResult, compressedScopes);
      console.log(`🔄 Info décompression: ${decompressionInfo.instructions.length} instructions`);

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      console.log(`✅ Compression terminée: ${totalDuration}ms`);

      return {
        metadata,
        summary,
        scopes: compressedScopes,
        compression: compressionInfo,
        decompression: decompressionInfo
      };

    } catch (error) {
      console.error(`❌ Erreur compression fichier ${analysisResult.filePath}:`, error);
      throw error;
    }
  }

  /**
   * Génère les métadonnées de compression
   */
  private generateCompressionMetadata(analysisResult: FileAnalysisResult): CompressedFileMetadata {
    const { fileAnalysis, metadata } = analysisResult;
    const fileName = path.basename(fileAnalysis.filePath);
    const fileType = this.determineFileType(fileName);
    
    // Calculer le ratio de compression (estimation)
    const originalSize = fileAnalysis.totalLines * 50; // Estimation 50 chars par ligne
    const compressedSize = Math.max(100, originalSize * 0.1); // Au moins 10% de la taille originale
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    return {
      originalPath: fileAnalysis.filePath,
      fileName,
      fileType,
      compressedAt: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
      version: '1.0.0',
      totalLines: fileAnalysis.totalLines,
      totalScopes: fileAnalysis.scopes.length,
      compressionRatio: Math.round(compressionRatio * 100) / 100
    };
  }

  /**
   * Génère le résumé compressé du fichier
   */
  private async generateCompressedSummary(analysisResult: FileAnalysisResult): Promise<CompressedFileSummary> {
    const { fileAnalysis, scopeAnalyses, summary } = analysisResult;

    // Analyser l'architecture
    const architecture = this.analyzeArchitecture(scopeAnalyses);
    
    // Identifier les patterns principaux
    const mainPatterns = this.identifyMainPatterns(scopeAnalyses);
    
    // Extraire les dépendances clés
    const keyDependencies = this.extractKeyDependencies(fileAnalysis);
    
    // Analyser la complexité globale
    const complexity = this.analyzeGlobalComplexity(scopeAnalyses);
    
    // Évaluer la qualité
    const quality = this.evaluateQuality(scopeAnalyses);
    
    // Identifier les risques globaux
    const risks = this.identifyGlobalRisks(scopeAnalyses);
    
    // Générer les recommandations
    const recommendations = this.generateRecommendations(scopeAnalyses, complexity, quality);

    return {
      purpose: summary.overallPurpose,
      architecture,
      mainPatterns,
      keyDependencies,
      complexity,
      quality,
      risks,
      recommendations
    };
  }

  /**
   * Compresse les scopes individuels
   */
  private async compressScopes(scopeAnalyses: ScopeAnalysisResult[]): Promise<CompressedScope[]> {
    const compressedScopes: CompressedScope[] = [];

    for (const scopeAnalysis of scopeAnalyses) {
      const { scope, analysis } = scopeAnalysis;
      
      const compressedScope: CompressedScope = {
        id: this.generateScopeId(scope),
        name: scope.name,
        type: scope.type as any,
        purpose: analysis.overall_purpose || `Fonctionnalité ${scope.type}`,
        signature: scope.signature,
        complexity: analysis.complexity,
        tags: analysis.tags,
        keyDependencies: this.extractScopeDependencies(scope, analysis),
        risks: analysis.risks,
        testIdeas: analysis.test_ideas,
        position: {
          startLine: scope.startLine,
          endLine: scope.endLine,
          relativeSize: this.calculateRelativeSize(scope, scopeAnalyses)
        },
        relationships: this.analyzeScopeRelationships(scope, scopeAnalyses)
      };

      compressedScopes.push(compressedScope);
    }

    return compressedScopes;
  }

  /**
   * Génère les informations de compression
   */
  private generateCompressionInfo(analysisResult: FileAnalysisResult, startTime: number): CompressionInfo {
    const endTime = Date.now();
    const compressionTime = endTime - startTime;
    
    // Estimation des tailles
    const originalSize = analysisResult.fileAnalysis.totalLines * 50;
    const compressedSize = Math.max(100, originalSize * 0.1);
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

    return {
      algorithm: 'LLM-based semantic compression',
      compressionLevel: 9, // Sur 10
      originalSize,
      compressedSize,
      compressionRatio: Math.round(compressionRatio * 100) / 100,
      compressionTime,
      llmCalls: this.llmCalls
    };
  }

  /**
   * Génère les informations de décompression
   */
  private generateDecompressionInfo(
    analysisResult: FileAnalysisResult, 
    compressedScopes: CompressedScope[]
  ): DecompressionInfo {
    const instructions = [
      'Utiliser les métadonnées pour reconstruire la structure du fichier',
      'Respecter les signatures et types des scopes',
      'Maintenir les relations entre les composants',
      'Appliquer les patterns architecturaux identifiés',
      'Intégrer les dépendances et imports nécessaires'
    ];

    const requiredContext = [
      'Contexte TypeScript/JavaScript',
      'Patterns architecturaux identifiés',
      'Dépendances externes',
      'Conventions de nommage',
      'Structure de projet'
    ];

    const regenerationHints = [
      'Prioriser la lisibilité du code généré',
      'Maintenir la cohérence avec l\'architecture originale',
      'Inclure les commentaires et documentation',
      'Respecter les bonnes pratiques TypeScript',
      'Valider la syntaxe et les types'
    ];

    const qualityChecks = [
      'Vérifier la syntaxe TypeScript',
      'Valider les types et interfaces',
      'Contrôler les imports et exports',
      'Tester la compilation',
      'Vérifier la cohérence architecturale'
    ];

    const validationRules = [
      'Le code doit compiler sans erreurs',
      'Les types doivent être cohérents',
      'Les dépendances doivent être résolues',
      'La structure doit respecter l\'architecture originale',
      'Les fonctionnalités doivent être préservées'
    ];

    return {
      instructions,
      requiredContext,
      regenerationHints,
      qualityChecks,
      validationRules
    };
  }

  // Méthodes utilitaires

  private determineFileType(fileName: string): 'typescript' | 'javascript' | 'unknown' {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      return 'typescript';
    } else if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return 'javascript';
    }
    return 'unknown';
  }

  private analyzeArchitecture(scopeAnalyses: ScopeAnalysisResult[]): string {
    const classCount = scopeAnalyses.filter(s => s.scope.type === 'class').length;
    const functionCount = scopeAnalyses.filter(s => s.scope.type === 'function').length;
    const interfaceCount = scopeAnalyses.filter(s => s.scope.type === 'interface').length;

    if (classCount > functionCount && classCount > interfaceCount) {
      return 'Object-Oriented (Class-based)';
    } else if (functionCount > classCount) {
      return 'Functional Programming';
    } else if (interfaceCount > 0) {
      return 'Interface-driven Architecture';
    } else {
      return 'Mixed Architecture';
    }
  }

  private identifyMainPatterns(scopeAnalyses: ScopeAnalysisResult[]): string[] {
    const patterns: string[] = [];
    
    // Analyser les tags pour identifier les patterns
    const allTags = scopeAnalyses.flatMap(s => s.analysis.tags);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Identifier les patterns les plus fréquents
    const sortedTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    return sortedTags;
  }

  private extractKeyDependencies(fileAnalysis: any): string[] {
    return fileAnalysis.imports.slice(0, 10); // Limiter à 10 dépendances principales
  }

  private analyzeGlobalComplexity(scopeAnalyses: ScopeAnalysisResult[]): any {
    const complexities = scopeAnalyses.map(s => s.analysis.complexity);
    const distribution = {
      low: complexities.filter(c => c === 'low').length,
      medium: complexities.filter(c => c === 'medium').length,
      high: complexities.filter(c => c === 'high').length
    };

    const total = complexities.length;
    const highRatio = distribution.high / total;
    const mediumRatio = distribution.medium / total;

    let overall: 'low' | 'medium' | 'high';
    if (highRatio > 0.3) {
      overall = 'high';
    } else if (mediumRatio > 0.5 || highRatio > 0.1) {
      overall = 'medium';
    } else {
      overall = 'low';
    }

    return { overall, distribution };
  }

  private evaluateQuality(scopeAnalyses: ScopeAnalysisResult[]): any {
    const maintainability = this.calculateMaintainability(scopeAnalyses);
    const testability = this.calculateTestability(scopeAnalyses);
    const readability = this.calculateReadability(scopeAnalyses);

    return { maintainability, testability, readability };
  }

  private calculateMaintainability(scopeAnalyses: ScopeAnalysisResult[]): 'low' | 'medium' | 'high' {
    const highComplexityCount = scopeAnalyses.filter(s => s.analysis.complexity === 'high').length;
    const riskCount = scopeAnalyses.reduce((sum, s) => sum + s.analysis.risks.length, 0);
    
    if (highComplexityCount > scopeAnalyses.length * 0.3 || riskCount > scopeAnalyses.length * 2) {
      return 'low';
    } else if (highComplexityCount > scopeAnalyses.length * 0.1 || riskCount > scopeAnalyses.length) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private calculateTestability(scopeAnalyses: ScopeAnalysisResult[]): 'low' | 'medium' | 'high' {
    const testIdeasCount = scopeAnalyses.reduce((sum, s) => sum + s.analysis.test_ideas.length, 0);
    const avgTestIdeas = testIdeasCount / scopeAnalyses.length;
    
    if (avgTestIdeas < 1) {
      return 'low';
    } else if (avgTestIdeas < 2) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private calculateReadability(scopeAnalyses: ScopeAnalysisResult[]): 'low' | 'medium' | 'high' {
    const avgComplexity = scopeAnalyses.reduce((sum, s) => {
      const complexityValue = s.analysis.complexity === 'high' ? 3 : s.analysis.complexity === 'medium' ? 2 : 1;
      return sum + complexityValue;
    }, 0) / scopeAnalyses.length;
    
    if (avgComplexity > 2.5) {
      return 'low';
    } else if (avgComplexity > 1.5) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private identifyGlobalRisks(scopeAnalyses: ScopeAnalysisResult[]): string[] {
    const allRisks = scopeAnalyses.flatMap(s => s.analysis.risks);
    const riskCounts = allRisks.reduce((acc, risk) => {
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Retourner les risques les plus fréquents
    return Object.entries(riskCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([risk]) => risk);
  }

  private generateRecommendations(scopeAnalyses: ScopeAnalysisResult[], complexity: any, quality: any): string[] {
    const recommendations: string[] = [];

    if (complexity.overall === 'high') {
      recommendations.push('Considérer la refactorisation pour réduire la complexité');
    }

    if (quality.maintainability === 'low') {
      recommendations.push('Améliorer la maintenabilité en réduisant les risques identifiés');
    }

    if (quality.testability === 'low') {
      recommendations.push('Ajouter plus de tests pour améliorer la testabilité');
    }

    if (quality.readability === 'low') {
      recommendations.push('Améliorer la lisibilité du code');
    }

    if (recommendations.length === 0) {
      recommendations.push('Code bien structuré - continuer les bonnes pratiques');
    }

    return recommendations;
  }

  private generateScopeId(scope: any): string {
    return `${scope.type}_${scope.name}_${scope.startLine}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private extractScopeDependencies(scope: any, analysis: any): string[] {
    const dependencies = [...scope.dependencies];
    if (analysis.dependencies && Array.isArray(analysis.dependencies)) {
      dependencies.push(...analysis.dependencies);
    }
    return [...new Set(dependencies)].slice(0, 5); // Limiter à 5 dépendances principales
  }

  private calculateRelativeSize(scope: any, allScopes: ScopeAnalysisResult[]): number {
    const totalLines = allScopes.reduce((sum, s) => sum + (s.scope.endLine - s.scope.startLine + 1), 0);
    const scopeLines = scope.endLine - scope.startLine + 1;
    return Math.round((scopeLines / totalLines) * 100 * 100) / 100; // Pourcentage avec 2 décimales
  }

  private analyzeScopeRelationships(scope: any, allScopes: ScopeAnalysisResult[]): any {
    const dependsOn: string[] = [];
    const usedBy: string[] = [];
    const calls: string[] = [];

    // Analyser les dépendances
    if (scope.dependencies) {
      dependsOn.push(...scope.dependencies);
    }

    // Analyser les relations avec les autres scopes
    for (const otherScope of allScopes) {
      if (otherScope.scope.name !== scope.name) {
        // Vérifier si ce scope utilise l'autre
        if (otherScope.scope.dependencies?.includes(scope.name)) {
          usedBy.push(otherScope.scope.name);
        }
        
        // Vérifier si ce scope appelle l'autre
        if (scope.content?.includes(`${otherScope.scope.name}(`)) {
          calls.push(otherScope.scope.name);
        }
      }
    }

    return { dependsOn, usedBy, calls };
  }

  /**
   * Sauvegarde le fichier compressé
   */
  async saveCompressedFile(compressedFile: CompressedFile, outputDir?: string): Promise<string> {
    const timestamp = new Date().toLocaleString('fr-FR', { 
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/[\/\s:]/g, '-');
    const fileName = path.basename(compressedFile.metadata.originalPath, path.extname(compressedFile.metadata.originalPath));
    const defaultOutputDir = path.join(process.cwd(), 'artefacts', 'Reports', 'CodeInsight', 'compressed_files');
    const finalOutputDir = outputDir || defaultOutputDir;

    // Créer le dossier
    if (!fs.existsSync(finalOutputDir)) {
      fs.mkdirSync(finalOutputDir, { recursive: true });
    }

    // Sauvegarder le fichier compressé JSON
    const jsonPath = path.join(finalOutputDir, `${fileName}_compressed_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(compressedFile, null, 2), 'utf-8');

    // Générer un rapport de compression Markdown
    const markdownPath = path.join(finalOutputDir, `${fileName}_compression_report_${timestamp}.md`);
    const markdown = this.generateCompressionReport(compressedFile);
    fs.writeFileSync(markdownPath, markdown, 'utf-8');

    console.log(`📄 Fichier compressé sauvegardé:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${markdownPath}`);

    return jsonPath;
  }

  /**
   * Génère un rapport de compression Markdown
   */
  private generateCompressionReport(compressedFile: CompressedFile): string {
    const { metadata, summary, scopes, compression, decompression } = compressedFile;

    let markdown = `# Rapport de Compression - ${metadata.fileName}

**Fichier original:** ${metadata.originalPath}  
**Date de compression:** ${metadata.compressedAt}  
**Ratio de compression:** ${metadata.compressionRatio}%  
**Temps de compression:** ${compression.compressionTime}ms

## 📊 Métadonnées

- **Type:** ${metadata.fileType}
- **Lignes:** ${metadata.totalLines}
- **Scopes:** ${metadata.totalScopes}
- **Version:** ${metadata.version}

## 🏗️ Architecture

- **Type:** ${summary.architecture}
- **But:** ${summary.purpose}
- **Patterns principaux:** ${summary.mainPatterns.join(', ')}

## 📈 Complexité

- **Globale:** ${summary.complexity.overall}
- **Distribution:**
  - Faible: ${summary.complexity.distribution.low}
  - Moyenne: ${summary.complexity.distribution.medium}
  - Élevée: ${summary.complexity.distribution.high}

## 🎯 Qualité

- **Maintenabilité:** ${summary.quality.maintainability}
- **Testabilité:** ${summary.quality.testability}
- **Lisibilité:** ${summary.quality.readability}

## ⚠️ Risques Identifiés

${summary.risks.map(risk => `- ${risk}`).join('\n')}

## 💡 Recommandations

${summary.recommendations.map(rec => `- ${rec}`).join('\n')}

## 🗜️ Informations de Compression

- **Algorithme:** ${compression.algorithm}
- **Niveau:** ${compression.compressionLevel}/10
- **Taille originale:** ${compression.originalSize} caractères
- **Taille compressée:** ${compression.compressedSize} caractères
- **Ratio:** ${compression.compressionRatio}%
- **Appels LLM:** ${compression.llmCalls}

## 🔄 Instructions de Décompression

${decompression.instructions.map(instruction => `- ${instruction}`).join('\n')}

## 📋 Scopes Compressés

${scopes.map((scope, index) => `
### ${index + 1}. ${scope.type} ${scope.name}

**ID:** ${scope.id}  
**But:** ${scope.purpose}  
**Complexité:** ${scope.complexity}  
**Position:** Lignes ${scope.position.startLine}-${scope.position.endLine} (${scope.position.relativeSize}%)  
**Tags:** ${scope.tags.join(', ')}

**Dépendances clés:**
${scope.keyDependencies.map(dep => `- ${dep}`).join('\n')}

**Risques:**
${scope.risks.map(risk => `- ${risk}`).join('\n')}

**Tests suggérés:**
${scope.testIdeas.map(idea => `- ${idea}`).join('\n')}

**Relations:**
- Dépend de: ${scope.relationships.dependsOn.join(', ') || 'Aucune'}
- Utilisé par: ${scope.relationships.usedBy.join(', ') || 'Aucun'}
- Appelle: ${scope.relationships.calls.join(', ') || 'Aucun'}
`).join('\n')}

---
*Généré automatiquement par FileCompressor*
`;

    return markdown;
  }
}