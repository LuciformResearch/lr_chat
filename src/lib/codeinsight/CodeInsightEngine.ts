/**
 * CodeInsight Engine - Main orchestrator
 * 
 * Coordinates TypeScript parsing, pattern analysis, and LLM analysis
 * to generate comprehensive code insight reports.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptParser, TypeScriptScope, CodeInsightReport, TypeScriptMetrics } from './TypeScriptParser';
import { PatternAnalyzer, PatternAnalysis } from './PatternAnalyzer';
import { CodeAnalyzer } from './CodeAnalyzer';

export interface ProjectReport {
  projectPath: string;
  files: FileReport[];
  summary: ProjectSummary;
  recommendations: string[];
  generatedAt: string;
}

export interface FileReport {
  file: string;
  report: CodeInsightReport;
  issues: string[];
  score: number;
}

export interface ProjectSummary {
  totalFiles: number;
  totalScopes: number;
  totalLinesOfCode: number;
  averageComplexity: number;
  averageMaintainability: number;
  designPatterns: string[];
  antiPatterns: string[];
  performanceIssues: string[];
  codeSmells: string[];
}

export class CodeInsightEngine {
  private parser: TypeScriptParser;
  private patternAnalyzer: PatternAnalyzer;
  private codeAnalyzer: CodeAnalyzer;

  constructor() {
    this.parser = new TypeScriptParser();
    this.patternAnalyzer = new PatternAnalyzer();
    this.codeAnalyzer = new CodeAnalyzer();
  }

  /**
   * Analyze a single TypeScript file
   */
  async analyzeFile(filePath: string): Promise<FileReport> {
    console.log(`🔍 Analyzing file: ${filePath}`);

    try {
      // Read file content
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Parse TypeScript
      const scopes = await this.parser.parseFile(filePath, content);
      
      // Analyze patterns
      const patterns = this.patternAnalyzer.analyzePatterns(scopes);
      
      // Calculate metrics
      const metrics = this.calculateMetrics(scopes, content);
      
      // Generate report
      const report = await this.codeAnalyzer.generateReport(
        filePath, scopes, patterns, metrics
      );

      // Calculate file score
      const score = this.calculateFileScore(report);
      
      // Identify issues
      const issues = this.identifyIssues(report);

      console.log(`✅ File analyzed: ${scopes.length} scopes, score: ${score}/10`);

      return {
        file: filePath,
        report,
        issues,
        score
      };
    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error);
      return {
        file: filePath,
        report: this.createErrorReport(filePath, error as Error),
        issues: ['Analysis failed'],
        score: 0
      };
    }
  }

  /**
   * Analyze entire project
   */
  async analyzeProject(projectPath: string): Promise<ProjectReport> {
    console.log(`🚀 Analyzing project: ${projectPath}`);

    const files = await this.findTypeScriptFiles(projectPath);
    const fileReports: FileReport[] = [];
    
    // Analyze each file
    for (const file of files) {
      const report = await this.analyzeFile(file);
      fileReports.push(report);
    }

    // Generate project summary
    const summary = this.generateProjectSummary(fileReports);
    
    // Generate project recommendations
    const recommendations = this.generateProjectRecommendations(fileReports, summary);

    console.log(`✅ Project analyzed: ${files.length} files, ${summary.totalScopes} scopes`);

    return {
      projectPath,
      files: fileReports,
      summary,
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate markdown report
   */
  async generateMarkdownReport(projectPath: string): Promise<string> {
    const projectReport = await this.analyzeProject(projectPath);
    
    let markdown = `# CodeInsight Report - ${path.basename(projectPath)}\n\n`;
    markdown += `*Généré le ${projectReport.generatedAt}*\n\n`;

    // Project Summary
    markdown += `## 📊 Résumé du Projet\n\n`;
    markdown += `- **Fichiers analysés:** ${projectReport.summary.totalFiles}\n`;
    markdown += `- **Scopes totaux:** ${projectReport.summary.totalScopes}\n`;
    markdown += `- **Lignes de code:** ${projectReport.summary.totalLinesOfCode}\n`;
    markdown += `- **Complexité moyenne:** ${projectReport.summary.averageComplexity.toFixed(2)}\n`;
    markdown += `- **Maintenabilité moyenne:** ${projectReport.summary.averageMaintainability.toFixed(2)}/10\n\n`;

    // Design Patterns
    if (projectReport.summary.designPatterns.length > 0) {
      markdown += `### 🎯 Patterns de Design Détectés\n\n`;
      projectReport.summary.designPatterns.forEach(pattern => {
        markdown += `- ${pattern}\n`;
      });
      markdown += `\n`;
    }

    // Anti-patterns
    if (projectReport.summary.antiPatterns.length > 0) {
      markdown += `### ⚠️ Anti-patterns Détectés\n\n`;
      projectReport.summary.antiPatterns.forEach(pattern => {
        markdown += `- ${pattern}\n`;
      });
      markdown += `\n`;
    }

    // Performance Issues
    if (projectReport.summary.performanceIssues.length > 0) {
      markdown += `### 🚀 Problèmes de Performance\n\n`;
      projectReport.summary.performanceIssues.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
      markdown += `\n`;
    }

    // Recommendations
    if (projectReport.recommendations.length > 0) {
      markdown += `## 💡 Recommandations\n\n`;
      projectReport.recommendations.forEach((rec, index) => {
        markdown += `${index + 1}. ${rec}\n`;
      });
      markdown += `\n`;
    }

    // File Details
    markdown += `## 📁 Détails par Fichier\n\n`;
    for (const fileReport of projectReport.files) {
      markdown += `### ${path.basename(fileReport.file)}\n\n`;
      markdown += `**Score:** ${fileReport.score}/10\n\n`;
      markdown += `**Résumé:** ${fileReport.report.summary}\n\n`;
      
      if (fileReport.issues.length > 0) {
        markdown += `**Problèmes:**\n`;
        fileReport.issues.forEach(issue => {
          markdown += `- ${issue}\n`;
        });
        markdown += `\n`;
      }

      if (fileReport.report.recommendations.length > 0) {
        markdown += `**Recommandations:**\n`;
        fileReport.report.recommendations.forEach(rec => {
          markdown += `- ${rec}\n`;
        });
        markdown += `\n`;
      }
    }

    return markdown;
  }

  /**
   * Save report to file
   */
  async saveReport(projectPath: string, outputPath?: string): Promise<string> {
    const markdown = await this.generateMarkdownReport(projectPath);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultOutputPath = path.join(
      process.cwd(),
      'Reports',
      'Research',
      `CodeInsight_Report_${path.basename(projectPath)}_${timestamp}.md`
    );
    
    const finalOutputPath = outputPath || defaultOutputPath;
    
    // Ensure directory exists
    const dir = path.dirname(finalOutputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(finalOutputPath, markdown, 'utf-8');
    
    console.log(`📄 Report saved to: ${finalOutputPath}`);
    return finalOutputPath;
  }

  /**
   * Find TypeScript files in project
   */
  private async findTypeScriptFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const findFiles = (dir: string): void => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other common directories
          if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
            findFiles(fullPath);
          }
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    };
    
    findFiles(projectPath);
    return files;
  }

  /**
   * Calculate metrics for scopes
   */
  private calculateMetrics(scopes: TypeScriptScope[], content: string): TypeScriptMetrics {
    const linesOfCode = content.split('\n').length;
    const totalComplexity = scopes.reduce((sum, scope) => sum + scope.complexity, 0);
    const averageComplexity = scopes.length > 0 ? totalComplexity / scopes.length : 0;
    
    // Calculate maintainability index (simplified)
    const maintainabilityIndex = Math.max(1, Math.min(10, 10 - (averageComplexity / 5)));
    
    // Calculate testability score (simplified)
    const testabilityScore = Math.max(1, Math.min(10, 10 - (scopes.length / 10)));
    
    // Calculate coupling score (simplified)
    const totalDependencies = scopes.reduce((sum, scope) => sum + scope.dependencies.length, 0);
    const couplingScore = Math.max(1, Math.min(10, totalDependencies / scopes.length));
    
    // Calculate cohesion score (simplified)
    const cohesionScore = Math.max(1, Math.min(10, 10 - (couplingScore / 2)));

    return {
      linesOfCode,
      cyclomaticComplexity: totalComplexity,
      maintainabilityIndex,
      testabilityScore,
      couplingScore,
      cohesionScore
    };
  }

  /**
   * Calculate file score
   */
  private calculateFileScore(report: CodeInsightReport): number {
    let score = 10;
    
    // Reduce score based on anti-patterns
    score -= report.patterns.antiPatterns.length * 1.5;
    
    // Reduce score based on performance issues
    score -= report.patterns.performanceIssues.length * 1;
    
    // Reduce score based on code smells
    score -= report.patterns.codeSmells.length * 0.5;
    
    // Reduce score based on complexity
    if (report.metrics.cyclomaticComplexity > 20) score -= 2;
    if (report.metrics.maintainabilityIndex < 6) score -= 2;
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Identify issues in report
   */
  private identifyIssues(report: CodeInsightReport): string[] {
    const issues: string[] = [];
    
    if (report.patterns.antiPatterns.length > 0) {
      issues.push(`${report.patterns.antiPatterns.length} anti-patterns détectés`);
    }
    
    if (report.patterns.performanceIssues.length > 0) {
      issues.push(`${report.patterns.performanceIssues.length} problèmes de performance`);
    }
    
    if (report.metrics.cyclomaticComplexity > 20) {
      issues.push('Complexité cyclomatique élevée');
    }
    
    if (report.metrics.maintainabilityIndex < 6) {
      issues.push('Maintenabilité faible');
    }
    
    return issues;
  }

  /**
   * Generate project summary
   */
  private generateProjectSummary(fileReports: FileReport[]): ProjectSummary {
    const totalFiles = fileReports.length;
    const totalScopes = fileReports.reduce((sum, fr) => sum + fr.report.scopes.length, 0);
    const totalLinesOfCode = fileReports.reduce((sum, fr) => sum + fr.report.metrics.linesOfCode, 0);
    
    const allComplexities = fileReports.flatMap(fr => fr.report.scopes.map(s => s.complexity));
    const averageComplexity = allComplexities.length > 0 ? 
      allComplexities.reduce((sum, c) => sum + c, 0) / allComplexities.length : 0;
    
    const allMaintainabilities = fileReports.map(fr => fr.report.metrics.maintainabilityIndex);
    const averageMaintainability = allMaintainabilities.length > 0 ?
      allMaintainabilities.reduce((sum, m) => sum + m, 0) / allMaintainabilities.length : 0;

    // Collect unique patterns
    const designPatterns = [...new Set(fileReports.flatMap(fr => fr.report.patterns.designPatterns))];
    const antiPatterns = [...new Set(fileReports.flatMap(fr => fr.report.patterns.antiPatterns))];
    const performanceIssues = [...new Set(fileReports.flatMap(fr => fr.report.patterns.performanceIssues))];
    const codeSmells = [...new Set(fileReports.flatMap(fr => fr.report.patterns.codeSmells))];

    return {
      totalFiles,
      totalScopes,
      totalLinesOfCode,
      averageComplexity,
      averageMaintainability,
      designPatterns,
      antiPatterns,
      performanceIssues,
      codeSmells
    };
  }

  /**
   * Generate project recommendations
   */
  private generateProjectRecommendations(fileReports: FileReport[], summary: ProjectSummary): string[] {
    const recommendations: string[] = [];
    
    if (summary.averageComplexity > 10) {
      recommendations.push('Réduire la complexité cyclomatique globale du projet');
    }
    
    if (summary.averageMaintainability < 6) {
      recommendations.push('Améliorer la maintenabilité générale du code');
    }
    
    if (summary.antiPatterns.length > 5) {
      recommendations.push('Refactoriser les anti-patterns détectés');
    }
    
    if (summary.performanceIssues.length > 3) {
      recommendations.push('Optimiser les performances du code');
    }
    
    if (summary.codeSmells.length > 10) {
      recommendations.push('Nettoyer les code smells détectés');
    }
    
    return recommendations;
  }

  /**
   * Create error report
   */
  private createErrorReport(filePath: string, error: Error): CodeInsightReport {
    return {
      file: filePath,
      scopes: [],
      patterns: {
        designPatterns: [],
        architecturalPatterns: [],
        antiPatterns: [],
        performanceIssues: [],
        codeSmells: []
      },
      metrics: {
        linesOfCode: 0,
        cyclomaticComplexity: 0,
        maintainabilityIndex: 0,
        testabilityScore: 0,
        couplingScore: 0,
        cohesionScore: 0
      },
      recommendations: [`Erreur d'analyse: ${error.message}`],
      summary: `Erreur lors de l'analyse de ${filePath}`
    };
  }
}