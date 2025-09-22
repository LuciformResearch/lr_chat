/**
 * IntelligentDecompressionEngine - Moteur de décompression intelligente
 * 
 * Fonctionnalités :
 * - Reconstruction contextuelle avec LLM
 * - Validation de cohérence automatique
 * - Décompression sélective selon les besoins
 * - Restauration intelligente du contexte
 * - Métriques de qualité de reconstruction
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CompressedCode, CodeFile, CodeContext, CodeMetrics } from './EnhancedCodeCompressionEngine';
import { LLMResponseParser } from '../llm/LLMResponseParser';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

export interface DecompressionRequest {
  compressedItems: CompressedCode[];
  targetContext?: string;
  reconstructionLevel: 'minimal' | 'standard' | 'complete';
  preserveOriginalStructure: boolean;
  includeMetadata: boolean;
}

export interface DecompressionResult {
  success: boolean;
  level: number;
  decompressed: CodeFile[];
  reconstructionQuality: number;
  contextRestoration: number;
  semanticPreservation: number;
  structuralIntegrity: number;
  llmCalls: number;
  processingTime: number;
  validationResults: ValidationResult[];
  reconstructionPath: string[];
  errors?: string[];
}

export interface ValidationResult {
  type: 'syntax' | 'semantic' | 'structural' | 'contextual';
  passed: boolean;
  score: number;
  details: string;
  suggestions?: string[];
}

export interface ReconstructionContext {
  originalContext: CodeContext;
  targetContext: CodeContext;
  preservationLevel: number;
  adaptationNeeded: boolean;
}

export class IntelligentDecompressionEngine {
  private model: any;
  private llmCallCount: number = 0;
  private validationCache: Map<string, ValidationResult[]> = new Map();
  private responseParser: LLMResponseParser;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Intelligent Decompression Engine avec LLM initialisé');
    } else {
      console.warn('⚠️ GEMINI_API_KEY non trouvée, décompression basique uniquement');
    }
    
    this.responseParser = new LLMResponseParser();
  }

  /**
   * Décompression intelligente avec reconstruction contextuelle
   */
  async decompressIntelligently(request: DecompressionRequest): Promise<DecompressionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Décompression intelligente de ${request.compressedItems.length} éléments...`);
      
      const decompressed: CodeFile[] = [];
      const validationResults: ValidationResult[] = [];
      const reconstructionPath: string[] = [];
      let totalLLMCalls = 0;

      for (const compressedItem of request.compressedItems) {
        // Reconstruction contextuelle avec LLM
        const reconstruction = await this.reconstructWithContext(
          compressedItem, 
          request.targetContext,
          request.reconstructionLevel
        );
        totalLLMCalls += reconstruction.llmCalls;
        
        // Validation de cohérence
        const validation = await this.validateReconstruction(
          reconstruction.files,
          compressedItem,
          request.preserveOriginalStructure
        );
        totalLLMCalls += validation.llmCalls;
        
        decompressed.push(...reconstruction.files);
        validationResults.push(...validation.results);
        reconstructionPath.push(`L${compressedItem.level}:${compressedItem.name} → ${reconstruction.files.length} fichiers (${reconstruction.quality}% qualité)`);
      }

      // Calcul des métriques globales
      const reconstructionQuality = this.calculateReconstructionQuality(decompressed, request.compressedItems);
      const contextRestoration = this.calculateContextRestoration(decompressed, request.compressedItems);
      const semanticPreservation = this.calculateSemanticPreservation(decompressed, request.compressedItems);
      const structuralIntegrity = this.calculateStructuralIntegrity(validationResults);

      const processingTime = Date.now() - startTime;

      console.log(`✅ Décompression intelligente terminée: ${request.compressedItems.length} éléments → ${decompressed.length} fichiers (${reconstructionQuality.toFixed(1)}% qualité, ${totalLLMCalls} appels LLM)`);

      return {
        success: true,
        level: request.compressedItems[0]?.level || 1,
        decompressed,
        reconstructionQuality,
        contextRestoration,
        semanticPreservation,
        structuralIntegrity,
        llmCalls: totalLLMCalls,
        processingTime,
        validationResults,
        reconstructionPath
      };

    } catch (error) {
      console.error('❌ Erreur décompression intelligente:', error);
      return {
        success: false,
        level: 1,
        decompressed: [],
        reconstructionQuality: 0,
        contextRestoration: 0,
        semanticPreservation: 0,
        structuralIntegrity: 0,
        llmCalls: 0,
        processingTime: Date.now() - startTime,
        validationResults: [],
        reconstructionPath: [],
        errors: [error.toString()]
      };
    }
  }

  /**
   * Reconstruction contextuelle avec LLM
   */
  private async reconstructWithContext(
    compressedItem: CompressedCode,
    targetContext?: string,
    level: 'minimal' | 'standard' | 'complete' = 'standard'
  ): Promise<{
    files: CodeFile[];
    quality: number;
    llmCalls: number;
  }> {
    if (!this.model) {
      return { files: this.reconstructBasic(compressedItem), quality: 0.5, llmCalls: 0 };
    }

    try {
      const prompt = this.buildReconstructionPrompt(compressedItem, targetContext, level);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      this.llmCallCount++;
      
      // Parser la réponse avec le parser générique
      const cleanText = this.responseParser.extractJSONBlock(text);
      if (!cleanText) {
        throw new Error('Aucun bloc JSON trouvé dans la réponse');
      }
      
      const analysis = JSON.parse(cleanText);
      
      const files: CodeFile[] = [];
      for (const fileData of analysis.files) {
        const file = this.createReconstructedFile(fileData, compressedItem);
        files.push(file);
      }

      return {
        files,
        quality: analysis.reconstruction_quality || 0.8,
        llmCalls: 1
      };

    } catch (error) {
      console.warn('⚠️ Erreur reconstruction contextuelle:', error);
      return { files: this.reconstructBasic(compressedItem), quality: 0.3, llmCalls: 1 };
    }
  }

  /**
   * Construit le prompt de reconstruction contextuelle
   */
  private buildReconstructionPrompt(
    compressedItem: CompressedCode,
    targetContext?: string,
    level: 'minimal' | 'standard' | 'complete' = 'standard'
  ): string {
    const levelInstructions = {
      minimal: 'Reconstruis uniquement les éléments essentiels avec une structure basique.',
      standard: 'Reconstruis avec une structure complète et des détails appropriés.',
      complete: 'Reconstruis avec tous les détails, commentaires, et optimisations possibles.'
    };

    return `Reconstruis intelligemment les fichiers originaux à partir de cette compression avec reconstruction contextuelle :

ÉLÉMENT COMPRESSÉ:
- Nom: ${compressedItem.name}
- Description: ${compressedItem.description}
- Contenu: ${compressedItem.content}
- Contexte original: ${JSON.stringify(compressedItem.context, null, 2)}
- Analyse LLM: ${JSON.stringify(compressedItem.llmAnalysis, null, 2)}
- Fichiers couverts: ${compressedItem.covers.length} fichiers

CONTEXTE CIBLE: ${targetContext || 'Contexte original'}

NIVEAU DE RECONSTRUCTION: ${levelInstructions[level]}

Fournis une réponse JSON dans un bloc markdown :

\`\`\`json
{
  "files": [
    {
      "name": "fichier1.ts",
      "content": "contenu reconstruit complet...",
      "purpose": "but du fichier reconstruit",
      "context_adaptation": "adaptations apportées au contexte"
    }
  ],
  "reconstruction_quality": 0.0-1.0,
  "context_preservation": 0.0-1.0,
  "structural_integrity": 0.0-1.0,
  "reconstruction_notes": "Notes sur la reconstruction et adaptations"
}
\`\`\``;
  }

  /**
   * Validation de cohérence de la reconstruction
   */
  private async validateReconstruction(
    files: CodeFile[],
    originalCompressed: CompressedCode,
    preserveStructure: boolean
  ): Promise<{
    results: ValidationResult[];
    llmCalls: number;
  }> {
    const results: ValidationResult[] = [];
    let totalLLMCalls = 0;

    for (const file of files) {
      // Validation syntaxique
      const syntaxValidation = this.validateSyntax(file);
      results.push(syntaxValidation);

      // Validation sémantique
      const semanticValidation = await this.validateSemantics(file, originalCompressed);
      results.push(semanticValidation);
      totalLLMCalls += semanticValidation.llmCalls || 0;

      // Validation structurelle
      const structuralValidation = this.validateStructure(file, preserveStructure);
      results.push(structuralValidation);

      // Validation contextuelle
      const contextualValidation = this.validateContext(file, originalCompressed);
      results.push(contextualValidation);
    }

    return { results, llmCalls: totalLLMCalls };
  }

  /**
   * Validation syntaxique
   */
  private validateSyntax(file: CodeFile): ValidationResult {
    const content = file.content;
    const issues: string[] = [];
    let score = 1.0;

    // Vérifications basiques
    if (!content.trim()) {
      issues.push('Fichier vide');
      score = 0.0;
    }

    // Vérifier les accolades équilibrées
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push(`Accolades non équilibrées: ${openBraces} ouvertes, ${closeBraces} fermées`);
      score -= 0.3;
    }

    // Vérifier les parenthèses équilibrées
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`Parenthèses non équilibrées: ${openParens} ouvertes, ${closeParens} fermées`);
      score -= 0.2;
    }

    return {
      type: 'syntax',
      passed: score >= 0.7,
      score: Math.max(0, score),
      details: issues.length > 0 ? issues.join('; ') : 'Syntaxe valide',
      suggestions: issues.length > 0 ? ['Corriger les problèmes de syntaxe'] : undefined
    };
  }

  /**
   * Validation sémantique avec LLM
   */
  private async validateSemantics(file: CodeFile, original: CompressedCode): Promise<ValidationResult & { llmCalls: number }> {
    if (!this.model) {
      return {
        type: 'semantic',
        passed: true,
        score: 0.5,
        details: 'Validation sémantique non disponible',
        llmCalls: 0
      };
    }

    try {
      const prompt = `Valide la cohérence sémantique de ce fichier reconstruit par rapport à l'original :

FICHIER RECONSTRUIT:
\`\`\`typescript
${file.content.substring(0, 1000)}${file.content.length > 1000 ? '...' : ''}
\`\`\`

ORIGINAL COMPRESSÉ:
- Description: ${original.description}
- Contexte: ${JSON.stringify(original.context, null, 2)}
- Analyse: ${JSON.stringify(original.llmAnalysis, null, 2)}

Fournis une réponse JSON :
{
  "semantic_consistency": 0.0-1.0,
  "purpose_alignment": 0.0-1.0,
  "context_preservation": 0.0-1.0,
  "issues": ["problème1", "problème2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      this.llmCallCount++;
      
      const cleanText = this.extractJSONFromResponse(text);
      const analysis = JSON.parse(cleanText);
      
      const overallScore = (analysis.semantic_consistency + analysis.purpose_alignment + analysis.context_preservation) / 3;

      return {
        type: 'semantic',
        passed: overallScore >= 0.7,
        score: overallScore,
        details: analysis.issues?.length > 0 ? analysis.issues.join('; ') : 'Cohérence sémantique valide',
        suggestions: analysis.suggestions,
        llmCalls: 1
      };

    } catch (error) {
      console.warn('⚠️ Erreur validation sémantique:', error);
      return {
        type: 'semantic',
        passed: true,
        score: 0.5,
        details: 'Validation sémantique échouée',
        llmCalls: 1
      };
    }
  }

  /**
   * Validation structurelle
   */
  private validateStructure(file: CodeFile, preserveStructure: boolean): ValidationResult {
    const content = file.content;
    const issues: string[] = [];
    let score = 1.0;

    // Vérifier la présence d'imports/exports
    const hasImports = content.includes('import ');
    const hasExports = content.includes('export ');
    
    if (!hasImports && !hasExports) {
      issues.push('Aucun import/export détecté');
      score -= 0.2;
    }

    // Vérifier la structure TypeScript
    const hasInterfaces = content.includes('interface ');
    const hasClasses = content.includes('class ');
    const hasFunctions = content.includes('function ') || content.includes('=>');
    
    if (!hasInterfaces && !hasClasses && !hasFunctions) {
      issues.push('Aucune structure TypeScript détectée');
      score -= 0.3;
    }

    // Vérifier la longueur appropriée
    const lines = content.split('\n').length;
    if (lines < 5) {
      issues.push('Fichier trop court (moins de 5 lignes)');
      score -= 0.2;
    }

    return {
      type: 'structural',
      passed: score >= 0.6,
      score: Math.max(0, score),
      details: issues.length > 0 ? issues.join('; ') : 'Structure valide',
      suggestions: issues.length > 0 ? ['Améliorer la structure du fichier'] : undefined
    };
  }

  /**
   * Validation contextuelle
   */
  private validateContext(file: CodeFile, original: CompressedCode): ValidationResult {
    const fileContext = file.context;
    const originalContext = original.context;
    
    if (!fileContext || !originalContext) {
      return {
        type: 'contextual',
        passed: false,
        score: 0.0,
        details: 'Contexte manquant',
        suggestions: ['Restaurer le contexte original']
      };
    }

    const issues: string[] = [];
    let score = 1.0;

    // Vérifier la cohérence du domaine
    if (fileContext.domain !== originalContext.domain) {
      issues.push(`Domaine incohérent: ${fileContext.domain} vs ${originalContext.domain}`);
      score -= 0.3;
    }

    // Vérifier la cohérence de la complexité
    if (fileContext.complexity !== originalContext.complexity) {
      issues.push(`Complexité incohérente: ${fileContext.complexity} vs ${originalContext.complexity}`);
      score -= 0.2;
    }

    // Vérifier la préservation des patterns
    const originalPatterns = originalContext.patterns || [];
    const filePatterns = fileContext.patterns || [];
    const preservedPatterns = originalPatterns.filter(p => filePatterns.includes(p));
    
    if (preservedPatterns.length < originalPatterns.length * 0.5) {
      issues.push(`Patterns mal préservés: ${preservedPatterns.length}/${originalPatterns.length}`);
      score -= 0.3;
    }

    return {
      type: 'contextual',
      passed: score >= 0.7,
      score: Math.max(0, score),
      details: issues.length > 0 ? issues.join('; ') : 'Contexte cohérent',
      suggestions: issues.length > 0 ? ['Restaurer le contexte original'] : undefined
    };
  }

  /**
   * Crée un fichier reconstruit
   */
  private createReconstructedFile(fileData: any, original: CompressedCode): CodeFile {
    const metrics = this.analyzeCodeMetrics(fileData.content);
    const context: CodeContext = {
      purpose: fileData.purpose || 'Reconstruit',
      domain: original.context.domain,
      patterns: original.context.patterns,
      complexity: original.context.complexity,
      maintainability: original.context.maintainability,
      testability: original.context.testability
    };

    return {
      id: `reconstructed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      path: fileData.name,
      content: fileData.content,
      metrics,
      dependencies: this.extractDependencies(fileData.content),
      level: 0,
      context
    };
  }

  /**
   * Reconstruction basique (fallback)
   */
  private reconstructBasic(compressedItem: CompressedCode): CodeFile[] {
    // Reconstruction basique - à implémenter selon les besoins
    return [];
  }


  /**
   * Analyse des métriques de code
   */
  private analyzeCodeMetrics(content: string): CodeMetrics {
    const lines = content.split('\n').length;
    const functions = (content.match(/function\s+\w+/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    const interfaces = (content.match(/interface\s+\w+/g) || []).length;
    const imports = (content.match(/import\s+/g) || []).length;
    const exports = (content.match(/export\s+/g) || []).length;
    
    return {
      linesOfCode: lines,
      functions,
      classes,
      interfaces,
      imports,
      exports,
      complexity: Math.min(10, Math.floor(lines / 50) + functions + classes),
      dependencies: imports,
      cognitiveComplexity: Math.min(10, Math.floor(lines / 30)),
      maintainabilityIndex: Math.max(0, 10 - Math.floor(lines / 100))
    };
  }

  /**
   * Extraction des dépendances
   */
  private extractDependencies(content: string): string[] {
    const imports = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
    return imports.map(imp => {
      const match = imp.match(/from\s+['"]([^'"]+)['"]/);
      return match ? match[1] : '';
    }).filter(Boolean);
  }

  /**
   * Calcul de la qualité de reconstruction
   */
  private calculateReconstructionQuality(decompressed: CodeFile[], original: CompressedCode[]): number {
    if (decompressed.length === 0) return 0;
    
    // Calcul basé sur la cohérence des métriques
    const avgLines = decompressed.reduce((sum, f) => sum + f.metrics.linesOfCode, 0) / decompressed.length;
    const expectedLines = original.reduce((sum, o) => sum + o.metrics.linesOfCode, 0) / original.length;
    
    const lineRatio = Math.min(avgLines / expectedLines, expectedLines / avgLines);
    return Math.max(0, Math.min(1, lineRatio));
  }

  /**
   * Calcul de la restauration du contexte
   */
  private calculateContextRestoration(decompressed: CodeFile[], original: CompressedCode[]): number {
    if (decompressed.length === 0) return 0;
    
    let totalScore = 0;
    for (const file of decompressed) {
      if (file.context) {
        totalScore += file.context.maintainability / 10;
      }
    }
    
    return totalScore / decompressed.length;
  }

  /**
   * Calcul de la préservation sémantique
   */
  private calculateSemanticPreservation(decompressed: CodeFile[], original: CompressedCode[]): number {
    if (decompressed.length === 0) return 0;
    
    // Calcul basé sur la préservation des patterns et du contexte
    let totalScore = 0;
    for (const file of decompressed) {
      if (file.context && file.context.patterns) {
        totalScore += Math.min(1, file.context.patterns.length / 3);
      }
    }
    
    return totalScore / decompressed.length;
  }

  /**
   * Calcul de l'intégrité structurelle
   */
  private calculateStructuralIntegrity(validationResults: ValidationResult[]): number {
    if (validationResults.length === 0) return 0;
    
    const structuralValidations = validationResults.filter(v => v.type === 'structural');
    if (structuralValidations.length === 0) return 0.5;
    
    const avgScore = structuralValidations.reduce((sum, v) => sum + v.score, 0) / structuralValidations.length;
    return avgScore;
  }

  /**
   * Obtient les statistiques de décompression
   */
  getDecompressionStats(): any {
    const parserStats = this.responseParser.getStats();
    
    return {
      totalLLMCalls: this.llmCallCount,
      validationCacheSize: this.validationCache.size,
      parserStats,
      averageValidationTime: 0 // À implémenter
    };
  }
}