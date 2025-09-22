#!/usr/bin/env node
/**
 * 🚀 GitHub Repository Analyzer - Orchestrateur pour analyser un repo GitHub complet
 * 
 * Analyseur complet pour cloner et analyser n'importe quel repository GitHub
 * Génère des rapports prêts pour l'intégration CI/CD
 * 
 * Basé sur les patterns validés de l'ancien projet Python avec :
 * - Détection automatique des modules locaux
 * - Cache intelligent pour les performances
 * - Rapports structurés (JSON + Markdown)
 * - Gestion d'erreurs robuste
 * 
 * Auteur: Assistant IA (via Lucie Defraiteur)
 * Date: 2025-09-05
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { TypeScriptImportAnalyzer } from './ImportAnalyzer';

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch?: string;
  cloneUrl?: string;
  patterns?: string[];
  maxDepth?: number;
  outputDir?: string;
}

export interface GitHubAnalysisResult {
  repoInfo: {
    owner: string;
    repo: string;
    branch: string;
    cloneUrl: string;
    clonedAt: string;
    analysisDuration: number;
  };
  projectStats: {
    totalFiles: number;
    totalImports: number;
    localImports: number;
    externalImports: number;
    standardImports: number;
    filesWithErrors: number;
    averageImportsPerFile: number;
  };
  architecture: {
    topFilesByImports: Array<{ file: string; importCount: number }>;
    topModules: Array<{ module: string; usageCount: number }>;
    detectedModules: Record<string, boolean>;
    complexityScore: number;
  };
  recommendations: {
    highPriority: string[];
    mediumPriority: string[];
    lowPriority: string[];
  };
  importAnalysis: any; // Rapport détaillé de l'ImportAnalyzer
}

export class GitHubRepoAnalyzer {
  private tempDir: string;
  private outputDir: string;
  private config: GitHubRepoConfig;

  constructor(config: GitHubRepoConfig) {
    this.config = {
      branch: 'main',
      patterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      maxDepth: 10,
      outputDir: './codeinsight-reports',
      ...config
    };
    
    this.tempDir = path.join(process.cwd(), 'temp-repos', `${this.config.owner}-${this.config.repo}`);
    this.outputDir = this.config.outputDir!;
  }

  /**
   * Clone le repository GitHub
   */
  private async cloneRepository(): Promise<void> {
    console.log(`📥 Clonage du repository ${this.config.owner}/${this.config.repo}...`);
    
    // Nettoyer le répertoire temporaire s'il existe
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
    
    // Créer le répertoire parent
    fs.mkdirSync(path.dirname(this.tempDir), { recursive: true });
    
    const cloneUrl = this.config.cloneUrl || `https://github.com/${this.config.owner}/${this.config.repo}.git`;
    
    try {
      // Cloner le repository
      execSync(`git clone --depth 1 --branch ${this.config.branch} ${cloneUrl} "${this.tempDir}"`, {
        stdio: 'pipe'
      });
      
      console.log(`   ✅ Repository cloné dans ${this.tempDir}`);
    } catch (error) {
      throw new Error(`Erreur lors du clonage: ${error}`);
    }
  }

  /**
   * Trouve tous les fichiers TypeScript/JavaScript dans le repo cloné
   */
  private findProjectFiles(): string[] {
    const files: string[] = [];
    
    function walkDir(dir: string) {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Ignorer certains dossiers
            if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(item)) {
              walkDir(fullPath);
            }
          } else if (stat.isFile()) {
            // Inclure les fichiers selon les patterns
            const ext = path.extname(item);
            if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Ignorer les erreurs de lecture
      }
    }
    
    walkDir(this.tempDir);
    return files;
  }

  /**
   * Analyse l'architecture du projet
   */
  private analyzeArchitecture(importAnalysis: any): any {
    const { results, statistics } = importAnalysis;
    
    // Calculer la complexité
    const totalImports = statistics.localImports + statistics.externalImports + statistics.standardImports;
    const complexityScore = totalImports / statistics.filesAnalyzed;
    
    // Top fichiers par imports
    const topFiles = results
      .sort((a: any, b: any) => b.importCount - a.importCount)
      .slice(0, 10)
      .map((result: any) => ({
        file: path.relative(this.tempDir, result.filePath),
        importCount: result.importCount
      }));
    
    // Top modules
    const moduleUsage: Record<string, number> = {};
    results.forEach((result: any) => {
      result.localImports.forEach((imp: string) => {
        const module = imp.split('/')[0];
        moduleUsage[module] = (moduleUsage[module] || 0) + 1;
      });
    });
    
    const topModules = Object.entries(moduleUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([module, count]) => ({ module, usageCount: count }));
    
    return {
      topFilesByImports: topFiles,
      topModules,
      detectedModules: importAnalysis.detectedModules,
      complexityScore: Math.round(complexityScore * 100) / 100
    };
  }

  /**
   * Génère des recommandations basées sur l'analyse
   */
  private generateRecommendations(architecture: any, projectStats: any): any {
    const recommendations = {
      highPriority: [] as string[],
      mediumPriority: [] as string[],
      lowPriority: [] as string[]
    };
    
    // Recommandations haute priorité
    if (projectStats.averageImportsPerFile > 5) {
      recommendations.highPriority.push(
        `Refactoriser les fichiers avec plus de 5 imports (moyenne: ${projectStats.averageImportsPerFile})`
      );
    }
    
    if (architecture.complexityScore > 3) {
      recommendations.highPriority.push(
        `Complexité élevée détectée (${architecture.complexityScore}). Considérer la modularisation`
      );
    }
    
    // Recommandations moyenne priorité
    if (architecture.topModules.length > 0) {
      const topModule = architecture.topModules[0];
      recommendations.mediumPriority.push(
        `Module le plus utilisé: ${topModule.module} (${topModule.usageCount} utilisations)`
      );
    }
    
    if (projectStats.filesWithErrors > 0) {
      recommendations.mediumPriority.push(
        `${projectStats.filesWithErrors} fichiers avec des erreurs d'imports à corriger`
      );
    }
    
    // Recommandations basse priorité
    recommendations.lowPriority.push(
      'Considérer l\'ajout de tests unitaires pour les modules les plus complexes'
    );
    
    recommendations.lowPriority.push(
      'Documenter l\'architecture des modules les plus utilisés'
    );
    
    return recommendations;
  }

  /**
   * Génère un rapport GitHub-ready
   */
  private generateGitHubReport(result: GitHubAnalysisResult): string {
    const { repoInfo, projectStats, architecture, recommendations } = result;
    
    return `# 📊 CodeInsight Analysis Report - ${repoInfo.owner}/${repoInfo.repo}

[![CodeInsight](https://img.shields.io/badge/CodeInsight-Analyzed-blue)](https://github.com/${repoInfo.owner}/${repoInfo.repo})
[![TypeScript](https://img.shields.io/badge/TypeScript-Analyzed-blue)](https://github.com/${repoInfo.owner}/${repoInfo.repo})
[![Imports](https://img.shields.io/badge/Imports-${projectStats.totalImports}-green)](https://github.com/${repoInfo.owner}/${repoInfo.repo})

**Analyzed on:** ${new Date(repoInfo.clonedAt).toLocaleString()}  
**Branch:** \`${repoInfo.branch}\`  
**Analysis Duration:** ${repoInfo.analysisDuration}ms

---

## 📋 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Files** | ${projectStats.totalFiles} |
| **Total Imports** | ${projectStats.totalImports} |
| **Local Imports** | ${projectStats.localImports} |
| **External Imports** | ${projectStats.externalImports} |
| **Standard Imports** | ${projectStats.standardImports} |
| **Complexity Score** | ${architecture.complexityScore} |
| **Files with Errors** | ${projectStats.filesWithErrors} |

---

## 🏆 Top 10 Most Complex Files

${architecture.topFilesByImports.map((file, index) => 
  `${index + 1}. **\`${file.file}\`** (${file.importCount} imports)`
).join('\n')}

---

## 📦 Most Used Local Modules

${architecture.topModules.map((module, index) => 
  `${index + 1}. **\`${module.module}\`** (${module.usageCount} usages)`
).join('\n')}

---

## 🎯 Recommendations

### 🔴 High Priority
${recommendations.highPriority.map(rec => `- ${rec}`).join('\n')}

### 🟡 Medium Priority
${recommendations.mediumPriority.map(rec => `- ${rec}`).join('\n')}

### 🟢 Low Priority
${recommendations.lowPriority.map(rec => `- ${rec}`).join('\n')}

---

## 📈 Architecture Insights

- **Average Imports per File:** ${projectStats.averageImportsPerFile}
- **Local vs External Ratio:** ${Math.round((projectStats.localImports / projectStats.externalImports) * 100)}% local
- **Module Diversity:** ${architecture.topModules.length} distinct local modules
- **Code Organization:** ${projectStats.localImports > projectStats.externalImports ? 'Well-modularized' : 'External-heavy'}

---

## 🔧 Integration

### GitHub Actions
\`\`\`yaml
- name: CodeInsight Analysis
  uses: codeinsight/github-action@v1
  with:
    repo: '${repoInfo.owner}/${repoInfo.repo}'
    branch: '${repoInfo.branch}'
\`\`\`

### CLI Usage
\`\`\`bash
npx codeinsight analyze ${repoInfo.owner}/${repoInfo.repo}
\`\`\`

---

*Generated by [CodeInsight](https://github.com/codeinsight/codeinsight) - TypeScript Import Analysis Tool*
`;
  }

  /**
   * Analyse complète du repository GitHub
   */
  public async analyzeRepository(): Promise<GitHubAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // 1. Cloner le repository
      await this.cloneRepository();
      
      // 2. Trouver les fichiers à analyser
      console.log("🔍 Recherche des fichiers TypeScript/JavaScript...");
      const files = this.findProjectFiles();
      console.log(`   ${files.length} fichiers trouvés`);
      
      if (files.length === 0) {
        throw new Error("Aucun fichier TypeScript/JavaScript trouvé dans le repository");
      }
      
      // 3. Analyser les imports
      console.log("📊 Analyse des imports...");
      const analyzer = new TypeScriptImportAnalyzer(this.tempDir);
      const importAnalysis = await analyzer.analyzeFiles(files, this.config.maxDepth);
      
      // 4. Analyser l'architecture
      console.log("🏗️ Analyse de l'architecture...");
      const architecture = this.analyzeArchitecture(importAnalysis);
      
      // 5. Calculer les statistiques du projet
      const projectStats = {
        totalFiles: importAnalysis.statistics.filesAnalyzed,
        totalImports: importAnalysis.statistics.localImports + 
                     importAnalysis.statistics.externalImports + 
                     importAnalysis.statistics.standardImports,
        localImports: importAnalysis.statistics.localImports,
        externalImports: importAnalysis.statistics.externalImports,
        standardImports: importAnalysis.statistics.standardImports,
        filesWithErrors: importAnalysis.statistics.filesWithErrors,
        averageImportsPerFile: 0
      };
      
      projectStats.averageImportsPerFile = projectStats.totalImports / projectStats.totalFiles;
      
      // 6. Générer les recommandations
      const recommendations = this.generateRecommendations(architecture, projectStats);
      
      // 7. Créer le résultat final
      const result: GitHubAnalysisResult = {
        repoInfo: {
          owner: this.config.owner,
          repo: this.config.repo,
          branch: this.config.branch!,
          cloneUrl: this.config.cloneUrl || `https://github.com/${this.config.owner}/${this.config.repo}.git`,
          clonedAt: new Date().toISOString(),
          analysisDuration: Date.now() - startTime
        },
        projectStats,
        architecture,
        recommendations,
        importAnalysis
      };
      
      // 8. Sauvegarder les rapports
      await this.saveReports(result);
      
      console.log(`✅ Analyse terminée en ${result.repoInfo.analysisDuration}ms`);
      return result;
      
    } catch (error) {
      throw new Error(`Erreur lors de l'analyse: ${error}`);
    } finally {
      // Nettoyer le répertoire temporaire
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      }
    }
  }

  /**
   * Sauvegarde les rapports dans le répertoire de sortie
   */
  private async saveReports(result: GitHubAnalysisResult): Promise<void> {
    // Créer le répertoire de sortie
    const reportDir = path.join(this.outputDir, `${result.repoInfo.owner}-${result.repoInfo.repo}`);
    fs.mkdirSync(reportDir, { recursive: true });
    
    // Sauvegarder le rapport JSON
    const jsonPath = path.join(reportDir, 'analysis-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
    
    // Sauvegarder le rapport Markdown GitHub-ready
    const markdownPath = path.join(reportDir, 'README.md');
    const markdownReport = this.generateGitHubReport(result);
    fs.writeFileSync(markdownPath, markdownReport, 'utf-8');
    
    // Sauvegarder le rapport détaillé de l'ImportAnalyzer
    const analyzer = new TypeScriptImportAnalyzer();
    const detailedReport = analyzer.generateMarkdownReport(result.importAnalysis);
    const detailedPath = path.join(reportDir, 'detailed-analysis.md');
    fs.writeFileSync(detailedPath, detailedReport, 'utf-8');
    
    console.log(`📝 Rapports sauvegardés dans ${reportDir}`);
  }
}

// Fonction utilitaire pour analyser un repo GitHub
export async function analyzeGitHubRepo(
  owner: string, 
  repo: string, 
  options: Partial<GitHubRepoConfig> = {}
): Promise<GitHubAnalysisResult> {
  const analyzer = new GitHubRepoAnalyzer({
    owner,
    repo,
    ...options
  });
  
  return analyzer.analyzeRepository();
}

// Export par défaut
export default GitHubRepoAnalyzer;