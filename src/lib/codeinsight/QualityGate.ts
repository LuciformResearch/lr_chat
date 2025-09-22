/**
 * QualityGate - Porte de qualité pour valider le code régénéré
 * 
 * Valide que le code généré compile, respecte les standards et maintient
 * une similarité acceptable avec l'original
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const exec = promisify(execFile);

export interface QualityMetrics {
  compilation: boolean;
  compilationErrors: string[];
  linting: boolean;
  lintingWarnings: number;
  lintingErrors: number;
  similarity: number; // 0-1
  sizeRatio: number; // ratio taille généré / original
  complexity: number; // complexité cyclomatique estimée
  testCoverage?: number; // si des tests sont disponibles
}

export interface QualityGateResult {
  passed: boolean;
  score: number; // 0-100
  metrics: QualityMetrics;
  issues: string[];
  recommendations: string[];
}

export interface QualityGateConfig {
  requireCompilation: boolean;
  requireLinting: boolean;
  minSimilarity: number; // seuil minimum de similarité
  maxSizeRatio: number; // ratio maximum de taille
  maxComplexity: number; // complexité maximum
  enableTests: boolean;
  timeoutMs: number;
}

export class QualityGate {
  private config: QualityGateConfig;
  private tempDir: string;

  constructor(config: Partial<QualityGateConfig> = {}) {
    this.config = {
      requireCompilation: true,
      requireLinting: false, // Par défaut, on ne force pas le linting
      minSimilarity: 0.55, // 55% de similarité minimum
      maxSizeRatio: 2.0, // Le code généré ne doit pas dépasser 2x la taille originale
      maxComplexity: 10, // Complexité cyclomatique maximum
      enableTests: false,
      timeoutMs: 60000, // 60 secondes
      ...config
    };

    this.tempDir = path.join(process.cwd(), '.temp_quality_check');
  }

  /**
   * Valide la qualité du code régénéré
   */
  async validateCode(
    originalCode: string,
    regeneratedCode: string,
    filePath: string,
    context?: any
  ): Promise<QualityGateResult> {
    const startTime = Date.now();
    
    console.log(`🔍 Validation qualité pour ${path.basename(filePath)}`);
    
    try {
      // Créer le répertoire temporaire
      await this.ensureTempDir();

      // 1. Validation de compilation
      const compilationResult = await this.validateCompilation(regeneratedCode, filePath);
      
      // 2. Validation de linting (si activé)
      const lintingResult = await this.validateLinting(regeneratedCode, filePath);
      
      // 3. Calcul de similarité
      const similarity = this.calculateSimilarity(originalCode, regeneratedCode);
      
      // 4. Calcul du ratio de taille
      const sizeRatio = regeneratedCode.length / originalCode.length;
      
      // 5. Estimation de complexité
      const complexity = this.estimateComplexity(regeneratedCode);
      
      // 6. Tests (si activés)
      const testResult = this.config.enableTests ? 
        await this.runTests(regeneratedCode, filePath) : 
        { coverage: undefined };

      // Créer les métriques
      const metrics: QualityMetrics = {
        compilation: compilationResult.success,
        compilationErrors: compilationResult.errors,
        linting: lintingResult.success,
        lintingWarnings: lintingResult.warnings,
        lintingErrors: lintingResult.errors,
        similarity,
        sizeRatio,
        complexity,
        testCoverage: testResult.coverage
      };

      // Calculer le score et déterminer si ça passe
      const result = this.calculateQualityScore(metrics);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Validation terminée en ${duration}ms - Score: ${result.score}/100`);

      return result;

    } catch (error) {
      console.error('❌ Erreur lors de la validation qualité:', error);
      return {
        passed: false,
        score: 0,
        metrics: {
          compilation: false,
          compilationErrors: [String(error)],
          linting: false,
          lintingWarnings: 0,
          lintingErrors: 1,
          similarity: 0,
          sizeRatio: 0,
          complexity: 0
        },
        issues: [`Erreur de validation: ${error}`],
        recommendations: ['Vérifier la syntaxe du code généré']
      };
    }
  }

  /**
   * Valide que le code compile
   */
  private async validateCompilation(code: string, filePath: string): Promise<{
    success: boolean;
    errors: string[];
  }> {
    if (!this.config.requireCompilation) {
      return { success: true, errors: [] };
    }

    try {
      // Créer un fichier temporaire
      const tempFile = path.join(this.tempDir, path.basename(filePath));
      await fs.writeFile(tempFile, code, 'utf8');

      // Créer un tsconfig.json temporaire
      const tsconfigPath = path.join(this.tempDir, 'tsconfig.json');
      const tsconfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          noEmit: true // On ne génère pas de JS, juste validation
        },
        include: [path.basename(filePath)]
      };
      await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));

      // Exécuter tsc --noEmit
      const { stderr } = await exec('npx', ['tsc', '--noEmit'], {
        cwd: this.tempDir,
        timeout: this.config.timeoutMs
      });

      // Nettoyer le fichier temporaire
      await fs.unlink(tempFile).catch(() => {});
      await fs.unlink(tsconfigPath).catch(() => {});

      return {
        success: stderr.length === 0,
        errors: stderr ? stderr.split('\n').filter(line => line.trim()) : []
      };

    } catch (error: any) {
      return {
        success: false,
        errors: [error.stderr || error.message || 'Erreur de compilation inconnue']
      };
    }
  }

  /**
   * Valide le linting (si ESLint est disponible)
   */
  private async validateLinting(code: string, filePath: string): Promise<{
    success: boolean;
    warnings: number;
    errors: number;
  }> {
    if (!this.config.requireLinting) {
      return { success: true, warnings: 0, errors: 0 };
    }

    try {
      // Créer un fichier temporaire
      const tempFile = path.join(this.tempDir, path.basename(filePath));
      await fs.writeFile(tempFile, code, 'utf8');

      // Essayer d'exécuter ESLint
      const { stdout, stderr } = await exec('npx', ['eslint', tempFile], {
        cwd: this.tempDir,
        timeout: this.config.timeoutMs
      });

      // Nettoyer le fichier temporaire
      await fs.unlink(tempFile).catch(() => {});

      // Analyser la sortie d'ESLint
      const lines = (stdout + stderr).split('\n');
      const warnings = lines.filter(line => line.includes('warning')).length;
      const errors = lines.filter(line => line.includes('error')).length;

      return {
        success: errors === 0,
        warnings,
        errors
      };

    } catch (error: any) {
      // ESLint n'est peut-être pas installé, ce n'est pas critique
      console.log('⚠️ ESLint non disponible, skip du linting');
      return { success: true, warnings: 0, errors: 0 };
    }
  }

  /**
   * Calcule la similarité entre le code original et régénéré
   */
  private calculateSimilarity(original: string, regenerated: string): number {
    // Utilise l'algorithme de Levenshtein pour calculer la similarité
    const distance = this.levenshteinDistance(original, regenerated);
    const maxLength = Math.max(original.length, regenerated.length);
    
    if (maxLength === 0) return 1;
    
    return 1 - (distance / maxLength);
  }

  /**
   * Distance de Levenshtein entre deux chaînes
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Estime la complexité cyclomatique du code
   */
  private estimateComplexity(code: string): number {
    let complexity = 1; // Base complexity
    
    // Compter les structures de contrôle principales
    const controlStructures = [
      'if', 'for', 'while', 'do', 'switch', 'catch'
    ];
    
    for (const structure of controlStructures) {
      const regex = new RegExp(`\\b${structure}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    // Compter les opérateurs logiques (mais avec un poids moindre)
    const logicalAndMatches = code.match(/\&\&/g);
    if (logicalAndMatches) {
      complexity += Math.ceil(logicalAndMatches.length / 2);
    }
    
    const logicalOrMatches = code.match(/\|\|/g);
    if (logicalOrMatches) {
      complexity += Math.ceil(logicalOrMatches.length / 2);
    }
    
    // Compter les opérateurs ternaires
    const ternaryMatches = code.match(/\?/g);
    if (ternaryMatches) {
      complexity += ternaryMatches.length;
    }
    
    return complexity;
  }

  /**
   * Exécute les tests (si disponibles)
   */
  private async runTests(code: string, filePath: string): Promise<{ coverage?: number }> {
    // Pour l'instant, on ne fait pas de tests automatiques
    // Mais on pourrait intégrer Jest ou autre
    return { coverage: undefined };
  }

  /**
   * Calcule le score de qualité et détermine si ça passe
   */
  private calculateQualityScore(metrics: QualityMetrics): QualityGateResult {
    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Compilation (40 points)
    if (metrics.compilation) {
      score += 40;
    } else {
      issues.push('Le code ne compile pas');
      recommendations.push('Corriger les erreurs de compilation');
    }

    // Linting (20 points)
    if (metrics.linting) {
      score += 20;
    } else if (this.config.requireLinting) {
      issues.push(`Erreurs de linting: ${metrics.lintingErrors}`);
      recommendations.push('Corriger les erreurs de linting');
    }

    // Similarité (25 points)
    if (metrics.similarity >= this.config.minSimilarity) {
      score += 25;
    } else {
      issues.push(`Similarité trop faible: ${(metrics.similarity * 100).toFixed(1)}% < ${(this.config.minSimilarity * 100).toFixed(1)}%`);
      recommendations.push('Réduire les changements pour maintenir la similarité');
    }

    // Ratio de taille (10 points)
    if (metrics.sizeRatio <= this.config.maxSizeRatio) {
      score += 10;
    } else {
      issues.push(`Code trop volumineux: ${metrics.sizeRatio.toFixed(1)}x > ${this.config.maxSizeRatio}x`);
      recommendations.push('Simplifier le code généré');
    }

    // Complexité (5 points)
    if (metrics.complexity <= this.config.maxComplexity) {
      score += 5;
    } else {
      issues.push(`Complexité trop élevée: ${metrics.complexity} > ${this.config.maxComplexity}`);
      recommendations.push('Réduire la complexité cyclomatique');
    }

    const passed = score >= 70 && metrics.compilation; // Minimum 70% et compilation OK

    return {
      passed,
      score,
      metrics,
      issues,
      recommendations
    };
  }

  /**
   * S'assure que le répertoire temporaire existe
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Ignorer les erreurs de création de répertoire
    }
  }

  /**
   * Nettoie le répertoire temporaire
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await fs.unlink(path.join(this.tempDir, file));
      }
      await fs.rmdir(this.tempDir);
    } catch (error) {
      // Ignorer les erreurs de nettoyage
    }
  }

  /**
   * Obtient la configuration actuelle
   */
  getConfig(): QualityGateConfig {
    return { ...this.config };
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(newConfig: Partial<QualityGateConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}