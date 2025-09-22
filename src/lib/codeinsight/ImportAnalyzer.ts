#!/usr/bin/env node
/**
 * 🔍 TypeScript Import Analyzer - Analyseur d'imports et dépendances
 * 
 * Version adaptée de l'analyseur Python avec les patterns validés :
 * - Détection automatique des modules locaux (sans hardcoding)
 * - Cache intelligent pour les performances
 * - Résolution d'imports hybride (AST + parsing simple)
 * - Rapports structurés (JSON + Markdown)
 * - Gestion d'erreurs robuste avec fallbacks
 * 
 * Auteur: Assistant IA (via Lucie Defraiteur)
 * Date: 2025-09-05
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { glob } from 'glob';
import { StructuredTypeScriptParser, TypeScriptScope } from './StructuredTypeScriptParser';
import { StructuredLLMAnalyzer, StructuredLLMAnalysis } from './StructuredLLMAnalyzer';

// Types et interfaces
export interface ImportAnalysisResult {
  filePath: string;
  imports: string[];
  localImports: string[];
  externalImports: string[];
  standardImports: string[];
  unresolvedImports: string[];
  dependencyDepth: number;
  importCount: number;
  analysisTimestamp: Date;
  errorMessages: string[];
  resolvedPaths: Record<string, string>;
}

export interface DependencyGraph {
  nodes: Record<string, ImportAnalysisResult>;
  edges: Array<[string, string]>;
  cycles: string[][];
  fileDepths: Record<string, number>;
}

export interface AnalysisReport {
  analysisMetadata: {
    timestamp: string;
    targetFiles: string[];
    totalFilesAnalyzed: number;
    maxDepth: number;
    projectRoot: string;
  };
  statistics: {
    filesAnalyzed: number;
    totalImports: number;
    localImports: number;
    externalImports: number;
    standardImports: number;
    unresolvedImports: number;
    cyclesDetected: number;
    filesWithErrors: number;
    duration: number;
  };
  filesAnalysis: Record<string, {
    imports: string[];
    localImports: string[];
    externalImports: string[];
    standardImports: string[];
    unresolvedImports: string[];
    importCount: number;
    dependencyDepth: number;
    errors: string[];
    // Ajout de l'analyse LLM structurée
    llmAnalysis?: StructuredLLMAnalysis;
  }>;
  topFilesByImports: Array<{ file: string; importCount: number }>;
  cycles: string[][];
  detectedModules: Record<string, boolean>;
  // Ajout des analyses LLM globales
  llmInsights?: {
    architectureSummary: string;
    designPatterns: string[];
    recommendations: string[];
    complexityAnalysis: string;
  };
}

export class TypeScriptImportAnalyzer {
  private projectRoot: string;
  private dependencyGraph: DependencyGraph;
  private localModulesCache: Record<string, boolean>;
  private maxDepth: number;
  private analyzedFiles: Set<string>;
  private stats: {
    startTime: number;
    filesAnalyzed: number;
    localImports: number;
    externalImports: number;
    standardImports: number;
    unresolvedImports: number;
    cyclesDetected: number;
    maxDepth: number;
    duration: number;
  };
  
  // Composants LLM pour l'analyse structurée
  private parser: StructuredTypeScriptParser;
  private llmAnalyzer: StructuredLLMAnalyzer;

  // Modules standard TypeScript/Node.js
  private readonly STANDARD_MODULES = new Set([
    // Node.js built-ins
    'fs', 'path', 'os', 'crypto', 'util', 'stream', 'events', 'buffer', 'url', 'querystring',
    'http', 'https', 'net', 'tls', 'dgram', 'child_process', 'cluster', 'worker_threads',
    'readline', 'repl', 'vm', 'v8', 'perf_hooks', 'async_hooks', 'timers', 'console',
    
    // TypeScript/JavaScript standard
    'typescript', 'ts-node', 'tsx',
    
    // Common libraries
    'react', 'react-dom', 'next', 'vue', 'angular', 'express', 'koa', 'fastify',
    'lodash', 'moment', 'dayjs', 'axios', 'fetch', 'node-fetch',
    
    // Testing
    'jest', 'vitest', 'mocha', 'chai', 'sinon', 'cypress', 'playwright',
    
    // Build tools
    'webpack', 'vite', 'rollup', 'esbuild', 'swc', 'babel',
    
    // Development
    'eslint', 'prettier', 'husky', 'lint-staged'
  ]);

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = path.resolve(projectRoot);
    this.dependencyGraph = {
      nodes: {},
      edges: [],
      cycles: [],
      fileDepths: {}
    };
    this.localModulesCache = {};
    this.maxDepth = 10;
    this.analyzedFiles = new Set();
    
    this.stats = {
      startTime: Date.now(),
      filesAnalyzed: 0,
      localImports: 0,
      externalImports: 0,
      standardImports: 0,
      unresolvedImports: 0,
      cyclesDetected: 0,
      maxDepth: 0,
      duration: 0
    };
    
    // Initialiser les composants LLM
    this.parser = new StructuredTypeScriptParser();
    this.llmAnalyzer = new StructuredLLMAnalyzer();
  }

  /**
   * Détecte automatiquement si un module est local au projet
   */
  private isLocalModule(importName: string): boolean {
    // Vérifier le cache d'abord
    if (importName in this.localModulesCache) {
      return this.localModulesCache[importName];
    }

    try {
      // Extraire le premier niveau du module (ex: "src" de "src/lib/utils")
      const firstLevel = importName.split('/')[0];
      
      // Vérifier si ce premier niveau existe comme dossier dans le projet
      const modulePath = path.join(this.projectRoot, firstLevel);
      
      let isLocal = false;
      
      // Si c'est un dossier, c'est probablement un module local
      if (fs.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()) {
        // Vérifier qu'il contient des fichiers TypeScript/JavaScript
        const files = fs.readdirSync(modulePath);
        if (files.some(file => 
          file.endsWith('.ts') || 
          file.endsWith('.tsx') || 
          file.endsWith('.js') || 
          file.endsWith('.jsx') ||
          file === 'index.ts' ||
          file === 'index.js'
        )) {
          isLocal = true;
        }
      }
      
      // Vérifier aussi si c'est un fichier TypeScript/JavaScript direct
      const moduleFile = path.join(this.projectRoot, firstLevel + '.ts');
      const moduleFileJs = path.join(this.projectRoot, firstLevel + '.js');
      const moduleFileTsx = path.join(this.projectRoot, firstLevel + '.tsx');
      const moduleFileJsx = path.join(this.projectRoot, firstLevel + '.jsx');
      
      if (fs.existsSync(moduleFile) || fs.existsSync(moduleFileJs) || 
          fs.existsSync(moduleFileTsx) || fs.existsSync(moduleFileJsx)) {
        isLocal = true;
      }
      
      // Mettre en cache le résultat
      this.localModulesCache[importName] = isLocal;
      return isLocal;
          
    } catch (error) {
      // En cas d'erreur, considérer comme non local et mettre en cache
      this.localModulesCache[importName] = false;
      return false;
    }
  }

  /**
   * Extrait les imports d'un fichier TypeScript avec AST
   */
  private extractImportsWithAST(filePath: string): string[] {
    try {
      const sourceCode = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
      );

      const imports: string[] = [];

      const visit = (node: ts.Node) => {
        if (ts.isImportDeclaration(node)) {
          if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            imports.push(node.moduleSpecifier.text);
          }
        } else if (ts.isImportEqualsDeclaration(node)) {
          if (node.moduleReference && ts.isExternalModuleReference(node.moduleReference)) {
            if (node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
              imports.push(node.moduleReference.expression.text);
            }
          }
        }
        
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
      return imports;
    } catch (error) {
      console.error(`Erreur parsing AST ${filePath}:`, error);
      return this.extractImportsSimple(filePath);
    }
  }

  /**
   * Extraction simple des imports (fallback)
   */
  private extractImportsSimple(filePath: string): string[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const imports: string[] = [];
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Imports ES6
        if (trimmedLine.startsWith('import ')) {
          const match = trimmedLine.match(/import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/);
          if (match) {
            imports.push(match[1]);
          }
        }
        // Imports CommonJS
        else if (trimmedLine.startsWith('require(')) {
          const match = trimmedLine.match(/require\(['"`]([^'"`]+)['"`]\)/);
          if (match) {
            imports.push(match[1]);
          }
        }
        // Imports dynamiques
        else if (trimmedLine.includes('import(')) {
          const match = trimmedLine.match(/import\(['"`]([^'"`]+)['"`]\)/);
          if (match) {
            imports.push(match[1]);
          }
        }
      }

      return imports;
    } catch (error) {
      console.error(`Erreur extraction simple ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Résout un import vers un fichier
   */
  private resolveImport(importName: string, currentFile: string): string | null {
    try {
      // Remplacer .js par .ts pour les imports TypeScript
      let resolvedImportName = importName;
      if (importName.endsWith('.js')) {
        resolvedImportName = importName.replace('.js', '.ts');
      }
      
      // Imports relatifs
      if (resolvedImportName.startsWith('./') || resolvedImportName.startsWith('../')) {
        const currentDir = path.dirname(currentFile);
        const resolvedPath = path.resolve(currentDir, resolvedImportName);
        
        // Essayer différentes extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
        for (const ext of extensions) {
          const candidate = resolvedPath + ext;
          if (fs.existsSync(candidate)) {
            return candidate;
          }
        }
        
        // Essayer sans extension
        if (fs.existsSync(resolvedPath)) {
          return resolvedPath;
        }
      }
      // Imports absolus
      else {
        // Vérifier dans node_modules
        const nodeModulesPath = path.join(this.projectRoot, 'node_modules', importName);
        if (fs.existsSync(nodeModulesPath)) {
          return nodeModulesPath;
        }
        
        // Vérifier dans le projet
        const projectPath = path.join(this.projectRoot, importName);
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
        for (const ext of extensions) {
          const candidate = projectPath + ext;
          if (fs.existsSync(candidate)) {
            return candidate;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Erreur résolution import ${importName}:`, error);
      return null;
    }
  }

  /**
   * Analyse un seul fichier avec analyse LLM structurée
   */
  private async analyzeSingleFile(filePath: string): Promise<ImportAnalysisResult> {
    const result: ImportAnalysisResult = {
      filePath,
      imports: [],
      localImports: [],
      externalImports: [],
      standardImports: [],
      unresolvedImports: [],
      dependencyDepth: 0,
      importCount: 0,
      analysisTimestamp: new Date(),
      errorMessages: [],
      resolvedPaths: {}
    };

    try {
      // Extraire les imports
      const imports = this.extractImportsWithAST(filePath);
      result.imports = imports;
      result.importCount = imports.length;

      // Classifier les imports
      for (const importStmt of imports) {
        if (importStmt.startsWith('./') || importStmt.startsWith('../')) {
          // Import relatif
          result.localImports.push(importStmt);
        } else if (this.isLocalModule(importStmt)) {
          // Import local détecté automatiquement
          result.localImports.push(importStmt);
        } else if (this.STANDARD_MODULES.has(importStmt.split('/')[0])) {
          // Import standard
          result.standardImports.push(importStmt);
        } else {
          // Import externe
          result.externalImports.push(importStmt);
        }
      }

      // Mettre à jour les statistiques
      this.stats.localImports += result.localImports.length;
      this.stats.externalImports += result.externalImports.length;
      this.stats.standardImports += result.standardImports.length;

    } catch (error) {
      result.errorMessages.push(String(error));
      console.error(`Erreur analyse fichier ${filePath}:`, error);
    }

    return result;
  }

  /**
   * Analyse un fichier avec LLM structuré
   */
  private async analyzeFileWithLLM(filePath: string): Promise<StructuredLLMAnalysis | null> {
    try {
      // Lire le contenu du fichier
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Parser le fichier avec le StructuredTypeScriptParser
      const analysis = await this.parser.parseFile(filePath, content);
      
      if (analysis.scopes.length === 0) {
        return null;
      }
      
      // Analyser le premier scope (ou le plus important) avec LLM
      const mainScope = analysis.scopes[0];
      const llmAnalysis = await this.llmAnalyzer.analyzeScope(mainScope);
      
      return llmAnalysis;
      
    } catch (error) {
      console.error(`Erreur analyse LLM ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Analyse récursive d'un fichier et de ses dépendances avec LLM
   */
  private async analyzeFileRecursive(
    filePath: string, 
    depth: number = 0, 
    visited: Set<string> = new Set()
  ): Promise<void> {
    // Éviter les cycles et respecter la profondeur maximale
    if (depth > this.maxDepth || visited.has(filePath)) {
      return;
    }

    visited.add(filePath);

    try {
      // Analyser le fichier
      const analysisResult = await this.analyzeSingleFile(filePath);
      
      // Ajouter l'analyse LLM pour les fichiers importants (profondeur 0 ou 1)
      if (depth <= 1) {
        console.log(`🧠 Analyse LLM de ${path.basename(filePath)}...`);
        const llmAnalysis = await this.analyzeFileWithLLM(filePath);
        if (llmAnalysis) {
          // Ajouter l'analyse LLM au résultat
          (analysisResult as any).llmAnalysis = llmAnalysis;
        }
      }
      
      this.dependencyGraph.nodes[filePath] = analysisResult;
      this.dependencyGraph.fileDepths[filePath] = depth;

      // Analyser récursivement les imports locaux
      for (const importName of analysisResult.localImports) {
        const resolvedPath = this.resolveImport(importName, filePath);
        if (resolvedPath && !visited.has(resolvedPath)) {
          await this.analyzeFileRecursive(resolvedPath, depth + 1, new Set(visited));
          this.dependencyGraph.edges.push([filePath, resolvedPath]);
        }
      }

    } catch (error) {
      console.error(`Erreur lors de l'analyse de ${filePath}:`, error);
      const errorResult: ImportAnalysisResult = {
        filePath,
        imports: [],
        localImports: [],
        externalImports: [],
        standardImports: [],
        unresolvedImports: [],
        dependencyDepth: 0,
        importCount: 0,
        analysisTimestamp: new Date(),
        errorMessages: [String(error)],
        resolvedPaths: {}
      };
      this.dependencyGraph.nodes[filePath] = errorResult;
    }
  }

  /**
   * Détecte les cycles dans le graphe de dépendances
   */
  private detectCycles(): string[][] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]) => {
      if (recStack.has(node)) {
        // Cycle détecté
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart).concat([node]);
        cycles.push(cycle);
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recStack.add(node);
      path.push(node);

      // Parcourir les dépendances
      if (node in this.dependencyGraph.nodes) {
        for (const importPath of this.dependencyGraph.nodes[node].localImports) {
          if (importPath in this.dependencyGraph.nodes) {
            dfs(importPath, [...path]);
          }
        }
      }

      recStack.delete(node);
      path.pop();
    };

    // DFS sur tous les nœuds
    for (const node of Object.keys(this.dependencyGraph.nodes)) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    this.dependencyGraph.cycles = cycles;
    return cycles;
  }

  /**
   * Analyse les fichiers donnés
   */
  public async analyzeFiles(
    filePaths: string[], 
    maxDepth?: number
  ): Promise<AnalysisReport> {
    if (maxDepth) {
      this.maxDepth = maxDepth;
    }

    console.log(`🔍 Début de l'analyse de ${filePaths.length} fichiers`);
    console.log(`   Project root: ${this.projectRoot}`);
    console.log(`   Max depth: ${this.maxDepth}`);

    // Analyser chaque fichier
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        await this.analyzeFileRecursive(filePath, 0, new Set());
      } else {
        console.error(`⚠️ Fichier non trouvé: ${filePath}`);
      }
    }

    // Détecter les cycles
    const cycles = this.detectCycles();

    // Mettre à jour les statistiques
    this.stats.filesAnalyzed = Object.keys(this.dependencyGraph.nodes).length;
    this.stats.cyclesDetected = cycles.length;
    this.stats.maxDepth = Math.max(...Object.values(this.dependencyGraph.fileDepths));
    this.stats.duration = Date.now() - this.stats.startTime;

    // Calculer les totaux d'imports
    const totalImports = Object.values(this.dependencyGraph.nodes)
      .reduce((sum, node) => sum + node.imports.length, 0);
    const totalLocal = Object.values(this.dependencyGraph.nodes)
      .reduce((sum, node) => sum + node.localImports.length, 0);
    const totalExternal = Object.values(this.dependencyGraph.nodes)
      .reduce((sum, node) => sum + node.externalImports.length, 0);
    const totalStandard = Object.values(this.dependencyGraph.nodes)
      .reduce((sum, node) => sum + node.standardImports.length, 0);
    const totalUnresolved = Object.values(this.dependencyGraph.nodes)
      .reduce((sum, node) => sum + node.unresolvedImports.length, 0);

    this.stats.totalImports = totalImports;
    this.stats.localImports = totalLocal;
    this.stats.externalImports = totalExternal;
    this.stats.standardImports = totalStandard;
    this.stats.unresolvedImports = totalUnresolved;

    // Générer les insights LLM globaux
    const llmInsights = await this.generateGlobalLLMInsights();

    // Générer le rapport final
    const report = this.generateAnalysisReport(filePaths, cycles, llmInsights);

    console.log(`✅ Analyse terminée: ${Object.keys(this.dependencyGraph.nodes).length} fichiers analysés`);
    console.log(`   Durée: ${this.stats.duration}ms`);

    return report;
  }

  /**
   * Génère des insights LLM globaux sur l'architecture du projet
   */
  private async generateGlobalLLMInsights(): Promise<{
    architectureSummary: string;
    designPatterns: string[];
    recommendations: string[];
    complexityAnalysis: string;
  }> {
    try {
      // Collecter les analyses LLM existantes
      const llmAnalyses: StructuredLLMAnalysis[] = [];
      
      for (const [filePath, node] of Object.entries(this.dependencyGraph.nodes)) {
        if ((node as any).llmAnalysis) {
          llmAnalyses.push((node as any).llmAnalysis);
        }
      }
      
      if (llmAnalyses.length === 0) {
        return {
          architectureSummary: "Aucune analyse LLM disponible",
          designPatterns: [],
          recommendations: ["Analyser plus de fichiers pour obtenir des insights"],
          complexityAnalysis: "Complexité non analysée"
        };
      }
      
      // Synthétiser les insights
      const allDesignPatterns = new Set<string>();
      const allRecommendations = new Set<string>();
      let totalComplexity = 0;
      let highComplexityFiles = 0;
      
      for (const analysis of llmAnalyses) {
        // Collecter les patterns de design
        analysis.global_analysis.design_patterns.forEach(pattern => allDesignPatterns.add(pattern));
        
        // Collecter les recommandations
        analysis.global_analysis.improvement_suggestions.forEach(rec => allRecommendations.add(rec));
        
        // Analyser la complexité
        if (analysis.complexity === 'high') {
          highComplexityFiles++;
        }
        totalComplexity += analysis.complexity === 'high' ? 3 : analysis.complexity === 'medium' ? 2 : 1;
      }
      
      const avgComplexity = totalComplexity / llmAnalyses.length;
      const complexityLevel = avgComplexity > 2.5 ? 'Élevée' : avgComplexity > 1.5 ? 'Modérée' : 'Faible';
      
      return {
        architectureSummary: `Architecture analysée avec ${llmAnalyses.length} composants principaux. Complexité moyenne: ${complexityLevel}.`,
        designPatterns: Array.from(allDesignPatterns),
        recommendations: Array.from(allRecommendations),
        complexityAnalysis: `${highComplexityFiles}/${llmAnalyses.length} fichiers avec complexité élevée. Complexité moyenne: ${complexityLevel}.`
      };
      
    } catch (error) {
      console.error('Erreur génération insights LLM globaux:', error);
      return {
        architectureSummary: "Erreur lors de l'analyse",
        designPatterns: [],
        recommendations: ["Vérifier les analyses LLM individuelles"],
        complexityAnalysis: "Complexité non analysée"
      };
    }
  }

  /**
   * Génère un rapport d'analyse complet
   */
  private generateAnalysisReport(
    targetFiles: string[], 
    cycles: string[][], 
    llmInsights?: {
      architectureSummary: string;
      designPatterns: string[];
      recommendations: string[];
      complexityAnalysis: string;
    }
  ): AnalysisReport {
    const totalFiles = Object.keys(this.dependencyGraph.nodes).length;
    
    // Fichiers avec le plus d'imports
    const filesByImports = Object.entries(this.dependencyGraph.nodes)
      .sort(([, a], [, b]) => b.imports.length - a.imports.length)
      .slice(0, 10)
      .map(([filePath, node]) => ({ file: filePath, importCount: node.imports.length }));

    // Fichiers avec des erreurs
    const filesWithErrors = Object.entries(this.dependencyGraph.nodes)
      .filter(([, node]) => node.errorMessages.length > 0)
      .length;

    return {
      analysisMetadata: {
        timestamp: new Date().toISOString(),
        targetFiles,
        totalFilesAnalyzed: totalFiles,
        maxDepth: this.maxDepth,
        projectRoot: this.projectRoot
      },
      statistics: {
        filesAnalyzed: totalFiles,
        totalImports: this.stats.totalImports,
        localImports: this.stats.localImports,
        externalImports: this.stats.externalImports,
        standardImports: this.stats.standardImports,
        unresolvedImports: this.stats.unresolvedImports,
        cyclesDetected: cycles.length,
        filesWithErrors,
        duration: this.stats.duration
      },
      filesAnalysis: Object.fromEntries(
        Object.entries(this.dependencyGraph.nodes).map(([filePath, node]) => [
          filePath,
          {
            imports: node.imports,
            localImports: node.localImports,
            externalImports: node.externalImports,
            standardImports: node.standardImports,
            unresolvedImports: node.unresolvedImports,
            importCount: node.importCount,
            dependencyDepth: node.dependencyDepth,
            errors: node.errorMessages
          }
        ])
      ),
      topFilesByImports: filesByImports,
      cycles,
      detectedModules: { ...this.localModulesCache },
      llmInsights: llmInsights
    };
  }

  /**
   * Sauvegarde le rapport au format JSON
   */
  public saveReport(report: AnalysisReport, outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  }

  /**
   * Génère un rapport Markdown
   */
  public generateMarkdownReport(report: AnalysisReport): string {
    const { analysisMetadata, statistics, filesAnalysis, cycles, llmInsights } = report;
    
    let markdown = `# 📊 Rapport d'Analyse d'Imports TypeScript

**Date:** ${new Date(analysisMetadata.timestamp).toLocaleString()}  
**Project Root:** ${analysisMetadata.projectRoot}  
**Durée d'analyse:** ${statistics.duration}ms  
**Fichiers analysés:** ${statistics.filesAnalyzed}

---

## 📋 Résumé Exécutif

- **Fichiers analysés:** ${statistics.filesAnalyzed}
- **Imports totaux:** ${statistics.totalImports}
- **Imports locaux:** ${statistics.localImports}
- **Imports externes:** ${statistics.externalImports}
- **Imports standard:** ${statistics.standardImports}
- **Cycles détectés:** ${statistics.cyclesDetected}
- **Fichiers avec erreurs:** ${statistics.filesWithErrors}

---

## 📁 Liste des Fichiers Analysés

`;

    // Liste des fichiers
    for (const filePath of Object.keys(filesAnalysis)) {
      markdown += `- \`${filePath}\`\n`;
    }

    markdown += `
---

## 📦 Analyse des Imports par Fichier

`;

    // Détails par fichier
    for (const [filePath, fileData] of Object.entries(filesAnalysis)) {
      markdown += `### ${filePath}\n`;
      markdown += `- **Profondeur:** ${fileData.dependencyDepth}\n`;
      markdown += `- **Imports totaux:** ${fileData.importCount}\n`;
      markdown += `- **Imports locaux:** ${fileData.localImports.length}\n`;
      markdown += `- **Imports externes:** ${fileData.externalImports.length}\n`;
      markdown += `- **Imports standard:** ${fileData.standardImports.length}\n`;
      
      if (fileData.localImports.length > 0) {
        markdown += `- **Liste des imports locaux:**\n`;
        for (const imp of fileData.localImports) {
          markdown += `  - \`${imp}\`\n`;
        }
      }
      
      if (fileData.errors.length > 0) {
        markdown += `- **Erreurs:**\n`;
        for (const error of fileData.errors) {
          markdown += `  - ${error}\n`;
        }
      }
      
      markdown += `\n`;
    }

    // Cycles détectés
    markdown += `---
## 🔄 Cycles de Dépendances

`;
    if (cycles.length > 0) {
      for (let i = 0; i < cycles.length; i++) {
        markdown += `### Cycle ${i + 1}\n`;
        markdown += cycles[i].join(' → ') + '\n\n';
      }
    } else {
      markdown += `Aucun cycle détecté.\n`;
    }

    // Section insights LLM
    if (llmInsights) {
      markdown += `
---

## 🧠 Insights LLM (Algareth)

### 📋 Résumé Architectural
${llmInsights.architectureSummary}

### 🏗️ Patterns de Design Détectés
${llmInsights.designPatterns.length > 0 ? 
  llmInsights.designPatterns.map(pattern => `- ${pattern}`).join('\n') : 
  'Aucun pattern spécifique détecté'}

### 💡 Recommandations
${llmInsights.recommendations.length > 0 ? 
  llmInsights.recommendations.map(rec => `- ${rec}`).join('\n') : 
  'Aucune recommandation spécifique'}

### 📊 Analyse de Complexité
${llmInsights.complexityAnalysis}
`;
    }

    markdown += `
---

*Rapport généré automatiquement par TypeScriptImportAnalyzer v2.0 avec analyse LLM*
`;

    return markdown;
  }

  /**
   * Retourne les modules locaux détectés automatiquement
   */
  public getDetectedLocalModules(): Record<string, boolean> {
    return { ...this.localModulesCache };
  }

  /**
   * Affiche les modules locaux détectés automatiquement
   */
  public printDetectedModules(): void {
    console.log("🔍 Modules locaux détectés automatiquement:");
    for (const [module, isLocal] of Object.entries(this.localModulesCache).sort()) {
      const status = isLocal ? "✅" : "❌";
      console.log(`  ${status} ${module}`);
    }
    console.log(`Total: ${Object.keys(this.localModulesCache).length} modules analysés`);
  }
}

// Fonction utilitaire pour analyser un projet complet
export async function analyzeProject(
  projectRoot: string,
  patterns: string[] = ['**/*.ts', '**/*.tsx'],
  maxDepth: number = 10
): Promise<AnalysisReport> {
  const analyzer = new TypeScriptImportAnalyzer(projectRoot);
  
  // Trouver tous les fichiers TypeScript
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: projectRoot });
    files.push(...matches.map(file => path.join(projectRoot, file)));
  }
  
  return analyzer.analyzeFiles(files, maxDepth);
}

// Export par défaut
export default TypeScriptImportAnalyzer;