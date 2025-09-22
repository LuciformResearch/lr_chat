/**
 * FileAnalyzer - Analyse complète d'un fichier TypeScript
 * 
 * Combine le parsing TypeScript avec l'analyse LLM XML
 * pour analyser chaque fonction/classe/méthode d'un fichier
 */

import { StructuredTypeScriptParser, TypeScriptScope, FileAnalysis } from './StructuredTypeScriptParser';
import { StructuredLLMAnalyzerXML, StructuredLLMAnalysisXML } from './StructuredLLMAnalyzerXML';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

export interface FileAnalysisResult {
  filePath: string;
  fileAnalysis: FileAnalysis;
  scopeAnalyses: ScopeAnalysisResult[];
  summary: FileSummary;
  metadata: {
    totalScopes: number;
    analyzedScopes: number;
    totalDuration: number;
    llmCalls: number;
    apiKeyPresent: boolean;
  };
}

export interface ScopeAnalysisResult {
  scope: TypeScriptScope;
  analysis: StructuredLLMAnalysisXML;
  duration: number;
  success: boolean;
  error?: string;
}

export interface FileSummary {
  fileName: string;
  fileType: 'typescript' | 'javascript' | 'unknown';
  totalLines: number;
  totalScopes: number;
  scopeTypes: {
    classes: number;
    functions: number;
    interfaces: number;
    methods: number;
    others: number;
  };
  complexity: {
    low: number;
    medium: number;
    high: number;
  };
  tags: string[];
  risks: string[];
  testIdeas: string[];
  overallPurpose: string;
  recommendations: string[];
}

export class FileAnalyzer {
  private tsParser: StructuredTypeScriptParser;
  private llmAnalyzer: StructuredLLMAnalyzerXML;
  private useRealLLM: boolean;

  constructor() {
    this.tsParser = new StructuredTypeScriptParser();
    this.llmAnalyzer = new StructuredLLMAnalyzerXML();
    this.useRealLLM = (this.llmAnalyzer as any).useRealLLM || false;
    
    console.log('🔧 FileAnalyzer initialisé');
    console.log(`🧠 Mode LLM: ${this.useRealLLM ? 'Vrais appels LLM' : 'Mode heuristique'}`);
  }

  /**
   * Analyse complète d'un fichier TypeScript
   */
  async analyzeFile(filePath: string): Promise<FileAnalysisResult> {
    const startTime = Date.now();
    console.log(`📁 Analyse du fichier: ${filePath}`);

    try {
      // 1. Lire le fichier
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(`📄 Fichier lu: ${content.length} caractères`);

      // 2. Parser le TypeScript
      console.log('🔍 Parsing TypeScript...');
      const fileAnalysis = await this.tsParser.parseFile(filePath, content);
      console.log(`✅ Parsing terminé: ${fileAnalysis.scopes.length} scopes trouvés`);

      // 3. Analyser chaque scope avec le LLM
      console.log('🧠 Analyse LLM des scopes...');
      const scopeAnalyses: ScopeAnalysisResult[] = [];
      let llmCalls = 0;

      for (const scope of fileAnalysis.scopes) {
        try {
          console.log(`   🔍 Analyse de ${scope.type} ${scope.name}...`);
          const scopeStartTime = Date.now();
          
          const analysis = await this.llmAnalyzer.analyzeScope(scope);
          const scopeEndTime = Date.now();
          
          if (this.useRealLLM) {
            llmCalls++;
          }

          scopeAnalyses.push({
            scope,
            analysis,
            duration: scopeEndTime - scopeStartTime,
            success: true
          });

          console.log(`   ✅ ${scope.name}: ${analysis.complexity} complexité, ${analysis.tags.length} tags`);

        } catch (error) {
          console.error(`   ❌ Erreur analyse ${scope.name}:`, error);
          scopeAnalyses.push({
            scope,
            analysis: this.createFallbackAnalysis(scope),
            duration: 0,
            success: false,
            error: error.toString()
          });
        }
      }

      // 4. Générer le résumé du fichier
      console.log('📊 Génération du résumé...');
      const summary = this.generateFileSummary(fileAnalysis, scopeAnalyses);

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      console.log(`✅ Analyse complète terminée: ${totalDuration}ms`);

      return {
        filePath,
        fileAnalysis,
        scopeAnalyses,
        summary,
        metadata: {
          totalScopes: fileAnalysis.scopes.length,
          analyzedScopes: scopeAnalyses.filter(s => s.success).length,
          totalDuration,
          llmCalls,
          apiKeyPresent: this.useRealLLM
        }
      };

    } catch (error) {
      console.error(`❌ Erreur analyse fichier ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Génère un résumé du fichier basé sur les analyses des scopes
   */
  private generateFileSummary(
    fileAnalysis: FileAnalysis, 
    scopeAnalyses: ScopeAnalysisResult[]
  ): FileSummary {
    const fileName = path.basename(fileAnalysis.filePath);
    const fileType = this.determineFileType(fileName);

    // Compter les types de scopes
    const scopeTypes = {
      classes: 0,
      functions: 0,
      interfaces: 0,
      methods: 0,
      others: 0
    };

    // Compter la complexité
    const complexity = {
      low: 0,
      medium: 0,
      high: 0
    };

    // Collecter les données des analyses
    const allTags: string[] = [];
    const allRisks: string[] = [];
    const allTestIdeas: string[] = [];
    const allPurposes: string[] = [];

    for (const scopeAnalysis of scopeAnalyses) {
      const { scope, analysis } = scopeAnalysis;

      // Compter les types
      switch (scope.type) {
        case 'class':
          scopeTypes.classes++;
          break;
        case 'function':
          scopeTypes.functions++;
          break;
        case 'interface':
          scopeTypes.interfaces++;
          break;
        case 'method':
          scopeTypes.methods++;
          break;
        default:
          scopeTypes.others++;
      }

      // Compter la complexité
      if (analysis.complexity === 'low') complexity.low++;
      else if (analysis.complexity === 'medium') complexity.medium++;
      else if (analysis.complexity === 'high') complexity.high++;

      // Collecter les données
      allTags.push(...analysis.tags);
      allRisks.push(...analysis.risks);
      allTestIdeas.push(...analysis.test_ideas);
      if (analysis.overall_purpose) {
        allPurposes.push(analysis.overall_purpose);
      }
    }

    // Générer des recommandations
    const recommendations = this.generateRecommendations(scopeTypes, complexity, allRisks);

    return {
      fileName,
      fileType,
      totalLines: fileAnalysis.totalLines,
      totalScopes: fileAnalysis.scopes.length,
      scopeTypes,
      complexity,
      tags: [...new Set(allTags)], // Supprimer les doublons
      risks: [...new Set(allRisks)],
      testIdeas: [...new Set(allTestIdeas)],
      overallPurpose: allPurposes.length > 0 ? allPurposes[0] : 'Fichier TypeScript',
      recommendations
    };
  }

  /**
   * Détermine le type de fichier
   */
  private determineFileType(fileName: string): 'typescript' | 'javascript' | 'unknown' {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      return 'typescript';
    } else if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return 'javascript';
    }
    return 'unknown';
  }

  /**
   * Génère des recommandations basées sur l'analyse
   */
  private generateRecommendations(
    scopeTypes: any, 
    complexity: any, 
    risks: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommandations basées sur la complexité
    if (complexity.high > complexity.low + complexity.medium) {
      recommendations.push('Considérer la refactorisation - complexité élevée détectée');
    }

    // Recommandations basées sur les types de scopes
    if (scopeTypes.classes > 5) {
      recommendations.push('Trop de classes - considérer la séparation en modules');
    }

    if (scopeTypes.functions > 10) {
      recommendations.push('Trop de fonctions - considérer l\'organisation en classes');
    }

    // Recommandations basées sur les risques
    if (risks.length > 3) {
      recommendations.push('Plusieurs risques identifiés - revue de code recommandée');
    }

    // Recommandations générales
    if (recommendations.length === 0) {
      recommendations.push('Code bien structuré - continuer les bonnes pratiques');
    }

    return recommendations;
  }

  /**
   * Crée une analyse de fallback en cas d'erreur
   */
  private createFallbackAnalysis(scope: TypeScriptScope): StructuredLLMAnalysisXML {
    return {
      name: scope.name,
      type: scope.type,
      overall_purpose: `Fonctionnalité ${scope.type}`,
      summary_bullets: [`${scope.type} ${scope.name}`],
      sub_scopes: [],
      global_analysis: {
        architecture: 'Architecture non analysée',
        design_patterns: [],
        relationships: [],
        overall_purpose: 'But non déterminé',
        strengths: [],
        weaknesses: [],
        improvement_suggestions: [],
        performance_notes: [],
        type_safety_notes: []
      },
      dependencies: scope.dependencies,
      inputs: scope.parameters.map(p => `${p.name}: ${p.type || 'any'}`),
      outputs: scope.returnType ? [scope.returnType] : ['void'],
      complexity: scope.complexity > 10 ? 'high' : scope.complexity > 5 ? 'medium' : 'low',
      maintainability: 'medium',
      testability: 'medium',
      risks: ['Analyse limitée'],
      test_ideas: ['Tests basiques'],
      docstring_suggestion: `Documentation pour ${scope.name}`,
      tags: [scope.type, 'unanalyzed'],
      type_safety_notes: ['Analyse de sécurité des types non disponible'],
      async_patterns: [],
      performance_notes: ['Analyse de performance non disponible']
    };
  }

  /**
   * Sauvegarde les résultats d'analyse
   */
  async saveAnalysisResults(result: FileAnalysisResult, outputDir?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(result.filePath, path.extname(result.filePath));
    const defaultOutputDir = path.join(process.cwd(), 'artefacts', 'codeinsight', 'file_analyses');
    const finalOutputDir = outputDir || defaultOutputDir;

    // Créer le dossier
    if (!fs.existsSync(finalOutputDir)) {
      fs.mkdirSync(finalOutputDir, { recursive: true });
    }

    // Sauvegarder le résultat JSON
    const jsonPath = path.join(finalOutputDir, `${fileName}_analysis_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // Générer un rapport Markdown
    const markdownPath = path.join(finalOutputDir, `${fileName}_report_${timestamp}.md`);
    const markdown = this.generateMarkdownReport(result);
    fs.writeFileSync(markdownPath, markdown, 'utf-8');

    console.log(`📄 Résultats sauvegardés:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${markdownPath}`);

    return jsonPath;
  }

  /**
   * Génère un rapport Markdown
   */
  private generateMarkdownReport(result: FileAnalysisResult): string {
    const { fileAnalysis, scopeAnalyses, summary, metadata } = result;

    let markdown = `# Analyse de Fichier - ${summary.fileName}

**Fichier:** ${result.filePath}  
**Date:** ${new Date().toISOString()}  
**Durée:** ${metadata.totalDuration}ms  
**Scopes analysés:** ${metadata.analyzedScopes}/${metadata.totalScopes}

## 📊 Résumé Exécutif

- **Type:** ${summary.fileType}
- **Lignes:** ${summary.totalLines}
- **Scopes:** ${summary.totalScopes}
- **Appels LLM:** ${metadata.llmCalls}
- **Mode:** ${metadata.apiKeyPresent ? 'Vrais appels LLM' : 'Mode heuristique'}

## 🏗️ Structure du Fichier

- **Classes:** ${summary.scopeTypes.classes}
- **Fonctions:** ${summary.scopeTypes.functions}
- **Interfaces:** ${summary.scopeTypes.interfaces}
- **Méthodes:** ${summary.scopeTypes.methods}
- **Autres:** ${summary.scopeTypes.others}

## 📈 Complexité

- **Faible:** ${summary.complexity.low}
- **Moyenne:** ${summary.complexity.medium}
- **Élevée:** ${summary.complexity.high}

## 🏷️ Tags

${summary.tags.map(tag => `- \`${tag}\``).join('\n')}

## ⚠️ Risques

${summary.risks.map(risk => `- ${risk}`).join('\n')}

## 🧪 Idées de Tests

${summary.testIdeas.map(idea => `- ${idea}`).join('\n')}

## 💡 Recommandations

${summary.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📋 Détails par Scope

${scopeAnalyses.map((scopeAnalysis, index) => `
### ${index + 1}. ${scopeAnalysis.scope.type} ${scopeAnalysis.scope.name}

**Lignes:** ${scopeAnalysis.scope.startLine}-${scopeAnalysis.scope.endLine}  
**Complexité:** ${scopeAnalysis.analysis.complexity}  
**Durée d'analyse:** ${scopeAnalysis.duration}ms  
**Succès:** ${scopeAnalysis.success ? '✅' : '❌'}

**But:** ${scopeAnalysis.analysis.overall_purpose}

**Tags:** ${scopeAnalysis.analysis.tags.join(', ')}

**Risques:**
${scopeAnalysis.analysis.risks.map(risk => `- ${risk}`).join('\n')}

**Tests suggérés:**
${scopeAnalysis.analysis.test_ideas.map(idea => `- ${idea}`).join('\n')}

${scopeAnalysis.error ? `**Erreur:** ${scopeAnalysis.error}` : ''}
`).join('\n')}

---
*Généré automatiquement par FileAnalyzer*
`;

    return markdown;
  }
}