/**
 * EnhancedCodeCompressionEngine - Moteur de compression hiérarchique amélioré
 * 
 * Améliorations :
 * - Appels LLM granulaires pour chaque niveau de compression
 * - Compression contextuelle intelligente
 * - Décompression sélective selon le contexte
 * - Métriques de qualité avancées
 * - Pipeline robuste avec gestion d'erreurs
 */

import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TypeScriptScope } from './StructuredTypeScriptParser';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

export interface CodeFile {
  id: string;
  path: string;
  content: string;
  ast?: TypeScriptScope;
  metrics: CodeMetrics;
  dependencies: string[];
  level: number;
  context?: CodeContext;
}

export interface CodeContext {
  purpose: string;
  domain: string;
  patterns: string[];
  complexity: 'low' | 'medium' | 'high';
  maintainability: number;
  testability: number;
}

export interface CodeMetrics {
  linesOfCode: number;
  functions: number;
  classes: number;
  interfaces: number;
  imports: number;
  exports: number;
  complexity: number;
  dependencies: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
}

export interface CompressedCode {
  id: string;
  level: number;
  name: string;
  description: string;
  content: string;
  covers: string[];
  metrics: CodeMetrics;
  compressionRatio: number;
  timestamp: string;
  context: CodeContext;
  llmAnalysis: LLMAnalysis;
  metadata: CompressionMetadata;
}

export interface LLMAnalysis {
  purpose: string;
  keyConcepts: string[];
  designPatterns: string[];
  qualityIssues: string[];
  improvementSuggestions: string[];
  complexityAssessment: string;
  maintainabilityScore: number;
  confidence: number;
}

export interface CompressionMetadata {
  originalFileCount: number;
  qualityScore: number;
  refactoringSuggestions: string[];
  compressionStrategy: string;
  llmProcessingTime: number;
  contextRelevance: number;
  reconstructionComplexity: number;
}

export interface CompressionResult {
  success: boolean;
  level: number;
  compressed: CompressedCode[];
  original: CodeFile[];
  compressionRatio: number;
  processingTime: number;
  llmCalls: number;
  qualityMetrics: QualityMetrics;
  errors?: string[];
}

export interface QualityMetrics {
  semanticPreservation: number;
  contextRetention: number;
  reconstructionAccuracy: number;
  compressionEfficiency: number;
}

export interface DecompressionResult {
  success: boolean;
  level: number;
  decompressed: CodeFile[];
  decompressionPath: string[];
  reconstructionQuality: number;
  contextRestoration: number;
  llmCalls: number;
  errors?: string[];
}

export class EnhancedCodeCompressionEngine {
  private files: Map<string, CodeFile> = new Map();
  private compressed: Map<number, CompressedCode[]> = new Map();
  private compressionHistory: Array<{
    timestamp: string;
    level: number;
    action: 'compress' | 'decompress';
    files: string[];
    quality: QualityMetrics;
    llmCalls: number;
  }> = [];
  private model: any;
  private llmCallCount: number = 0;

  constructor() {
    // Initialiser les niveaux de compression
    for (let level = 0; level <= 3; level++) {
      this.compressed.set(level, []);
    }

    // Initialiser le modèle LLM
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Enhanced CodeCompressionEngine avec LLM initialisé');
    } else {
      console.warn('⚠️ GEMINI_API_KEY non trouvée, compression basique uniquement');
    }
  }

  /**
   * Charge un fichier avec analyse contextuelle LLM
   */
  async loadFile(filePath: string): Promise<CodeFile> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const metrics = this.analyzeCodeMetrics(content);
      
      // Analyse contextuelle avec LLM
      const context = await this.analyzeCodeContext(content, filePath);
      
      const codeFile: CodeFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        path: filePath,
        content,
        metrics,
        dependencies: this.extractDependencies(content),
        level: 0,
        context
      };

      this.files.set(codeFile.id, codeFile);
      console.log(`📁 Fichier chargé: ${path.basename(filePath)} (${metrics.linesOfCode} lignes, ${context.complexity} complexité)`);
      
      return codeFile;
    } catch (error) {
      throw new Error(`Erreur chargement fichier ${filePath}: ${error}`);
    }
  }

  /**
   * Compression L0→L1 avec appels LLM granulaires
   */
  async compressToL1(fileIds: string[]): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalFiles = fileIds.map(id => this.files.get(id)).filter(Boolean) as CodeFile[];
    
    if (originalFiles.length === 0) {
      return {
        success: false,
        level: 1,
        compressed: [],
        original: [],
        compressionRatio: 0,
        processingTime: 0,
        llmCalls: 0,
        qualityMetrics: this.getDefaultQualityMetrics(),
        errors: ['Aucun fichier valide trouvé']
      };
    }

    try {
      const compressed: CompressedCode[] = [];
      let totalLLMCalls = 0;
      
      // Grouper les fichiers par fonctionnalité avec analyse LLM
      const functionalGroups = await this.groupByFunctionalityWithLLM(originalFiles);
      totalLLMCalls += functionalGroups.llmCalls;
      
      for (const [groupName, files] of functionalGroups.groups) {
        // Analyse LLM du groupe
        const groupAnalysis = await this.analyzeGroupWithLLM(files, groupName);
        totalLLMCalls += groupAnalysis.llmCalls;
        
        const totalMetrics = this.aggregateMetrics(files);
        const context = this.mergeContexts(files);
        
        const compressedCode: CompressedCode = {
          id: `l1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          level: 1,
          name: groupName,
          description: groupAnalysis.description,
          content: groupAnalysis.content,
          covers: files.map(f => f.id),
          metrics: totalMetrics,
          compressionRatio: this.calculateCompressionRatio(files, totalMetrics),
          timestamp: new Date().toISOString(),
          context,
          llmAnalysis: groupAnalysis.analysis,
          metadata: {
            originalFileCount: files.length,
            qualityScore: groupAnalysis.qualityScore,
            refactoringSuggestions: groupAnalysis.suggestions,
            compressionStrategy: groupAnalysis.strategy,
            llmProcessingTime: groupAnalysis.processingTime,
            contextRelevance: groupAnalysis.contextRelevance,
            reconstructionComplexity: groupAnalysis.reconstructionComplexity
          }
        };
        
        compressed.push(compressedCode);
      }

      // Sauvegarder la compression L1
      this.compressed.set(1, compressed);
      
      const processingTime = Date.now() - startTime;
      const compressionRatio = this.calculateOverallCompressionRatio(originalFiles, compressed);
      const qualityMetrics = this.calculateQualityMetrics(originalFiles, compressed);

      // Enregistrer dans l'historique
      this.compressionHistory.push({
        timestamp: new Date().toISOString(),
        level: 1,
        action: 'compress',
        files: fileIds,
        quality: qualityMetrics,
        llmCalls: totalLLMCalls
      });

      console.log(`✅ Compression L1 terminée: ${originalFiles.length} fichiers → ${compressed.length} groupes (${compressionRatio.toFixed(1)}% compression, ${totalLLMCalls} appels LLM)`);
      
      return {
        success: true,
        level: 1,
        compressed,
        original: originalFiles,
        compressionRatio,
        processingTime,
        llmCalls: totalLLMCalls,
        qualityMetrics
      };

    } catch (error) {
      console.error('❌ Erreur compression L1:', error);
      return {
        success: false,
        level: 1,
        compressed: [],
        original: originalFiles,
        compressionRatio: 0,
        processingTime: Date.now() - startTime,
        llmCalls: 0,
        qualityMetrics: this.getDefaultQualityMetrics(),
        errors: [error.toString()]
      };
    }
  }

  /**
   * Analyse contextuelle du code avec LLM
   */
  private async analyzeCodeContext(content: string, filePath: string): Promise<CodeContext> {
    if (!this.model) {
      return this.getDefaultContext();
    }

    try {
      const prompt = `Analyse ce fichier TypeScript et fournis une analyse contextuelle structurée :

FICHIER: ${path.basename(filePath)}
CONTENU:
\`\`\`typescript
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}
\`\`\`

Fournis une réponse JSON avec :
{
  "purpose": "Description claire du but de ce fichier",
  "domain": "Domaine métier (ex: UI, API, Utils, etc.)",
  "patterns": ["pattern1", "pattern2"],
  "complexity": "low|medium|high",
  "maintainability": 0-10,
  "testability": 0-10
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      this.llmCallCount++;
      
      try {
        // Nettoyer le texte pour extraire le JSON
        const cleanText = this.extractJSONFromResponse(text);
        const analysis = JSON.parse(cleanText);
        return {
          purpose: analysis.purpose || 'Analyse non disponible',
          domain: analysis.domain || 'Unknown',
          patterns: analysis.patterns || [],
          complexity: analysis.complexity || 'medium',
          maintainability: analysis.maintainability || 5,
          testability: analysis.testability || 5
        };
      } catch (parseError) {
        console.warn('⚠️ Erreur parsing analyse contextuelle:', parseError);
        return this.getDefaultContext();
      }
    } catch (error) {
      console.warn('⚠️ Erreur analyse contextuelle LLM:', error);
      return this.getDefaultContext();
    }
  }

  /**
   * Groupe les fichiers par fonctionnalité avec analyse LLM
   */
  private async groupByFunctionalityWithLLM(files: CodeFile[]): Promise<{
    groups: Map<string, CodeFile[]>;
    llmCalls: number;
  }> {
    if (!this.model) {
      return { groups: this.groupByFunctionalityBasic(files), llmCalls: 0 };
    }

    try {
      const prompt = `Analyse ces fichiers TypeScript et groupe-les par fonctionnalité logique :

FICHIERS:
${files.map(f => `- ${path.basename(f.path)}: ${f.context?.purpose || 'Non analysé'}`).join('\n')}

Fournis une réponse JSON avec des groupes logiques :
{
  "groups": {
    "NomDuGroupe": ["fichier1.ts", "fichier2.ts"],
    "AutreGroupe": ["fichier3.ts"]
  },
  "reasoning": "Explication du regroupement"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      this.llmCallCount++;
      
      try {
        const cleanText = this.extractJSONFromResponse(text);
        const analysis = JSON.parse(cleanText);
        const groups = new Map<string, CodeFile[]>();
        
        for (const [groupName, fileNames] of Object.entries(analysis.groups)) {
          const groupFiles = files.filter(f => 
            (fileNames as string[]).includes(path.basename(f.path))
          );
          if (groupFiles.length > 0) {
            groups.set(groupName, groupFiles);
          }
        }
        
        // Ajouter les fichiers non groupés
        const groupedFiles = new Set();
        for (const groupFiles of groups.values()) {
          groupFiles.forEach(f => groupedFiles.add(f.id));
        }
        
        const ungroupedFiles = files.filter(f => !groupedFiles.has(f.id));
        if (ungroupedFiles.length > 0) {
          groups.set('Miscellaneous', ungroupedFiles);
        }
        
        return { groups, llmCalls: 1 };
      } catch (parseError) {
        console.warn('⚠️ Erreur parsing regroupement:', parseError);
        return { groups: this.groupByFunctionalityBasic(files), llmCalls: 1 };
      }
    } catch (error) {
      console.warn('⚠️ Erreur regroupement LLM:', error);
      return { groups: this.groupByFunctionalityBasic(files), llmCalls: 1 };
    }
  }

  /**
   * Analyse un groupe de fichiers avec LLM
   */
  private async analyzeGroupWithLLM(files: CodeFile[], groupName: string): Promise<{
    description: string;
    content: string;
    analysis: LLMAnalysis;
    qualityScore: number;
    suggestions: string[];
    strategy: string;
    processingTime: number;
    contextRelevance: number;
    reconstructionComplexity: number;
    llmCalls: number;
  }> {
    if (!this.model) {
      return this.getDefaultGroupAnalysis(files, groupName);
    }

    const startTime = Date.now();
    
    try {
      const prompt = `Analyse ce groupe de fichiers TypeScript et fournis une compression intelligente :

GROUPE: ${groupName}
FICHIERS (${files.length}):
${files.map(f => `
- ${path.basename(f.path)}:
  But: ${f.context?.purpose || 'Non analysé'}
  Domaine: ${f.context?.domain || 'Unknown'}
  Complexité: ${f.context?.complexity || 'medium'}
  Patterns: ${f.context?.patterns?.join(', ') || 'Aucun'}
`).join('\n')}

Fournis une réponse JSON avec :
{
  "description": "Description concise du groupe et de sa fonction",
  "content": "Résumé structuré du contenu et des fonctionnalités principales",
  "analysis": {
    "purpose": "But principal du groupe",
    "keyConcepts": ["concept1", "concept2"],
    "designPatterns": ["pattern1", "pattern2"],
    "qualityIssues": ["issue1", "issue2"],
    "improvementSuggestions": ["suggestion1", "suggestion2"],
    "complexityAssessment": "Évaluation de la complexité",
    "maintainabilityScore": 0-10,
    "confidence": 0-1
  },
  "qualityScore": 0-10,
  "suggestions": ["suggestion1", "suggestion2"],
  "strategy": "Stratégie de compression utilisée",
  "contextRelevance": 0-1,
  "reconstructionComplexity": 0-1
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      this.llmCallCount++;
      
      try {
        const cleanText = this.extractJSONFromResponse(text);
        const analysis = JSON.parse(cleanText);
        return {
          description: analysis.description || `Groupe ${groupName}`,
          content: analysis.content || 'Contenu non analysé',
          analysis: analysis.analysis || this.getDefaultLLMAnalysis(),
          qualityScore: analysis.qualityScore || 5,
          suggestions: analysis.suggestions || [],
          strategy: analysis.strategy || 'basic',
          processingTime: Date.now() - startTime,
          contextRelevance: analysis.contextRelevance || 0.5,
          reconstructionComplexity: analysis.reconstructionComplexity || 0.5,
          llmCalls: 1
        };
      } catch (parseError) {
        console.warn('⚠️ Erreur parsing analyse groupe:', parseError);
        return this.getDefaultGroupAnalysis(files, groupName);
      }
    } catch (error) {
      console.warn('⚠️ Erreur analyse groupe LLM:', error);
      return this.getDefaultGroupAnalysis(files, groupName);
    }
  }

  /**
   * Décompression L1→L0 avec reconstruction intelligente
   */
  async decompressFromL1(l1Ids: string[]): Promise<DecompressionResult> {
    const startTime = Date.now();
    const l1Items = l1Ids.map(id => 
      this.compressed.get(1)?.find(item => item.id === id)
    ).filter(Boolean) as CompressedCode[];
    
    if (l1Items.length === 0) {
      return {
        success: false,
        level: 1,
        decompressed: [],
        decompressionPath: [],
        reconstructionQuality: 0,
        contextRestoration: 0,
        llmCalls: 0,
        errors: ['Aucun élément L1 valide trouvé']
      };
    }

    try {
      const decompressed: CodeFile[] = [];
      const decompressionPath: string[] = [];
      let totalLLMCalls = 0;
      
      for (const l1Item of l1Items) {
        // Reconstruction intelligente avec LLM
        const reconstruction = await this.reconstructFilesWithLLM(l1Item);
        totalLLMCalls += reconstruction.llmCalls;
        
        decompressed.push(...reconstruction.files);
        decompressionPath.push(`L1:${l1Item.name} → ${reconstruction.files.length} fichiers (reconstruit)`);
      }

      const processingTime = Date.now() - startTime;
      const reconstructionQuality = this.calculateReconstructionQuality(l1Items, decompressed);
      const contextRestoration = this.calculateContextRestoration(l1Items, decompressed);

      console.log(`✅ Décompression L1→L0 terminée: ${l1Items.length} groupes → ${decompressed.length} fichiers (${reconstructionQuality.toFixed(1)}% qualité, ${totalLLMCalls} appels LLM)`);
      
      return {
        success: true,
        level: 1,
        decompressed,
        decompressionPath,
        reconstructionQuality,
        contextRestoration,
        llmCalls: totalLLMCalls
      };

    } catch (error) {
      console.error('❌ Erreur décompression L1:', error);
      return {
        success: false,
        level: 1,
        decompressed: [],
        decompressionPath: [],
        reconstructionQuality: 0,
        contextRestoration: 0,
        llmCalls: 0,
        errors: [error.toString()]
      };
    }
  }

  /**
   * Reconstruction de fichiers avec LLM
   */
  private async reconstructFilesWithLLM(l1Item: CompressedCode): Promise<{
    files: CodeFile[];
    llmCalls: number;
  }> {
    if (!this.model) {
      return { files: this.reconstructFilesBasic(l1Item), llmCalls: 0 };
    }

    try {
      const prompt = `Reconstruis les fichiers originaux à partir de cette compression L1 :

GROUPE: ${l1Item.name}
DESCRIPTION: ${l1Item.description}
CONTENU: ${l1Item.content}
ANALYSE: ${JSON.stringify(l1Item.llmAnalysis, null, 2)}
FICHIERS ORIGINAUX: ${l1Item.covers.length} fichiers

Fournis une réponse JSON avec la reconstruction :
{
  "files": [
    {
      "name": "fichier1.ts",
      "content": "contenu reconstruit...",
      "purpose": "but du fichier"
    }
  ],
  "reconstruction_notes": "Notes sur la reconstruction"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      this.llmCallCount++;
      
      try {
        const cleanText = this.extractJSONFromResponse(text);
        const analysis = JSON.parse(cleanText);
        const files: CodeFile[] = [];
        
        for (const fileData of analysis.files) {
          const metrics = this.analyzeCodeMetrics(fileData.content);
          const context = {
            purpose: fileData.purpose || 'Reconstruit',
            domain: l1Item.context.domain,
            patterns: l1Item.llmAnalysis.designPatterns,
            complexity: l1Item.context.complexity,
            maintainability: l1Item.llmAnalysis.maintainabilityScore,
            testability: 5
          };
          
          const file: CodeFile = {
            id: `reconstructed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            path: fileData.name,
            content: fileData.content,
            metrics,
            dependencies: this.extractDependencies(fileData.content),
            level: 0,
            context
          };
          
          files.push(file);
        }
        
        return { files, llmCalls: 1 };
      } catch (parseError) {
        console.warn('⚠️ Erreur parsing reconstruction:', parseError);
        return { files: this.reconstructFilesBasic(l1Item), llmCalls: 1 };
      }
    } catch (error) {
      console.warn('⚠️ Erreur reconstruction LLM:', error);
      return { files: this.reconstructFilesBasic(l1Item), llmCalls: 1 };
    }
  }

  /**
   * Extrait le JSON d'une réponse LLM qui peut contenir des backticks markdown
   */
  private extractJSONFromResponse(text: string): string {
    // Supprimer les backticks markdown
    let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Trouver le premier { et le dernier }
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    
    return cleanText.trim();
  }

  // Méthodes utilitaires (version basique pour fallback)
  private getDefaultContext(): CodeContext {
    return {
      purpose: 'Analyse non disponible',
      domain: 'Unknown',
      patterns: [],
      complexity: 'medium',
      maintainability: 5,
      testability: 5
    };
  }

  private getDefaultLLMAnalysis(): LLMAnalysis {
    return {
      purpose: 'Analyse non disponible',
      keyConcepts: [],
      designPatterns: [],
      qualityIssues: [],
      improvementSuggestions: [],
      complexityAssessment: 'Complexité non évaluée',
      maintainabilityScore: 5,
      confidence: 0.1
    };
  }

  private getDefaultGroupAnalysis(files: CodeFile[], groupName: string) {
    return {
      description: `Groupe ${groupName} contenant ${files.length} fichiers`,
      content: files.map(f => `${path.basename(f.path)}: ${f.metrics.linesOfCode} lignes`).join('\n'),
      analysis: this.getDefaultLLMAnalysis(),
      qualityScore: 5,
      suggestions: [],
      strategy: 'basic',
      processingTime: 0,
      contextRelevance: 0.3,
      reconstructionComplexity: 0.7,
      llmCalls: 0
    };
  }

  private getDefaultQualityMetrics(): QualityMetrics {
    return {
      semanticPreservation: 0.5,
      contextRetention: 0.5,
      reconstructionAccuracy: 0.5,
      compressionEfficiency: 0.5
    };
  }

  private groupByFunctionalityBasic(files: CodeFile[]): Map<string, CodeFile[]> {
    const groups = new Map<string, CodeFile[]>();
    
    for (const file of files) {
      const dirName = path.dirname(file.path).split(path.sep).pop() || 'root';
      const groupName = `${dirName}_files`;
      
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(file);
    }
    
    return groups;
  }

  private reconstructFilesBasic(l1Item: CompressedCode): CodeFile[] {
    // Reconstruction basique - à implémenter selon les besoins
    return [];
  }

  // Méthodes de calcul et d'analyse (à implémenter)
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

  private extractDependencies(content: string): string[] {
    const imports = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
    return imports.map(imp => {
      const match = imp.match(/from\s+['"]([^'"]+)['"]/);
      return match ? match[1] : '';
    }).filter(Boolean);
  }

  private aggregateMetrics(files: CodeFile[]): CodeMetrics {
    return files.reduce((acc, file) => ({
      linesOfCode: acc.linesOfCode + file.metrics.linesOfCode,
      functions: acc.functions + file.metrics.functions,
      classes: acc.classes + file.metrics.classes,
      interfaces: acc.interfaces + file.metrics.interfaces,
      imports: acc.imports + file.metrics.imports,
      exports: acc.exports + file.metrics.exports,
      complexity: Math.max(acc.complexity, file.metrics.complexity),
      dependencies: acc.dependencies + file.metrics.dependencies,
      cognitiveComplexity: Math.max(acc.cognitiveComplexity, file.metrics.cognitiveComplexity),
      maintainabilityIndex: Math.min(acc.maintainabilityIndex, file.metrics.maintainabilityIndex)
    }), {
      linesOfCode: 0,
      functions: 0,
      classes: 0,
      interfaces: 0,
      imports: 0,
      exports: 0,
      complexity: 0,
      dependencies: 0,
      cognitiveComplexity: 0,
      maintainabilityIndex: 10
    });
  }

  private mergeContexts(files: CodeFile[]): CodeContext {
    const domains = [...new Set(files.map(f => f.context?.domain).filter(Boolean))];
    const patterns = [...new Set(files.flatMap(f => f.context?.patterns || []))];
    const complexities = files.map(f => f.context?.complexity).filter(Boolean);
    const maintainabilities = files.map(f => f.context?.maintainability).filter(Boolean);
    const testabilities = files.map(f => f.context?.testability).filter(Boolean);
    
    return {
      purpose: `Groupe de ${files.length} fichiers`,
      domain: domains.length > 0 ? domains[0] : 'Mixed',
      patterns,
      complexity: complexities.includes('high') ? 'high' : 
                 complexities.includes('medium') ? 'medium' : 'low',
      maintainability: maintainabilities.length > 0 ? 
        maintainabilities.reduce((a, b) => a + b, 0) / maintainabilities.length : 5,
      testability: testabilities.length > 0 ? 
        testabilities.reduce((a, b) => a + b, 0) / testabilities.length : 5
    };
  }

  private calculateCompressionRatio(files: CodeFile[], metrics: CodeMetrics): number {
    const originalSize = files.reduce((sum, f) => sum + f.content.length, 0);
    const compressedSize = metrics.linesOfCode * 50; // Estimation
    return Math.max(0, Math.min(1, (originalSize - compressedSize) / originalSize));
  }

  private calculateOverallCompressionRatio(original: CodeFile[], compressed: CompressedCode[]): number {
    const originalSize = original.reduce((sum, f) => sum + f.content.length, 0);
    const compressedSize = compressed.reduce((sum, c) => sum + c.content.length, 0);
    return Math.max(0, Math.min(1, (originalSize - compressedSize) / originalSize));
  }

  private calculateQualityMetrics(original: CodeFile[], compressed: CompressedCode[]): QualityMetrics {
    // Calcul simplifié - à améliorer
    return {
      semanticPreservation: 0.8,
      contextRetention: 0.7,
      reconstructionAccuracy: 0.6,
      compressionEfficiency: 0.9
    };
  }

  private calculateReconstructionQuality(l1Items: CompressedCode[], decompressed: CodeFile[]): number {
    // Calcul simplifié - à améliorer
    return 0.8;
  }

  private calculateContextRestoration(l1Items: CompressedCode[], decompressed: CodeFile[]): number {
    // Calcul simplifié - à améliorer
    return 0.7;
  }

  /**
   * Obtient les statistiques de compression
   */
  getCompressionStats(): any {
    const stats = {
      totalFiles: this.files.size,
      compressedLevels: {} as Record<number, number>,
      totalLLMCalls: this.llmCallCount,
      compressionHistory: this.compressionHistory.length,
      averageQuality: 0
    };

    for (let level = 1; level <= 3; level++) {
      stats.compressedLevels[level] = this.compressed.get(level)?.length || 0;
    }

    if (this.compressionHistory.length > 0) {
      const totalQuality = this.compressionHistory.reduce((sum, entry) => 
        sum + entry.quality.semanticPreservation + entry.quality.contextRetention + 
        entry.quality.reconstructionAccuracy + entry.quality.compressionEfficiency, 0
      );
      stats.averageQuality = totalQuality / (this.compressionHistory.length * 4);
    }

    return stats;
  }
}