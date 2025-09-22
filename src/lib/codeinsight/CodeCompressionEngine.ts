/**
 * CodeCompressionEngine - Moteur de compression hiérarchique pour le code
 * 
 * Inspiré du système de mémoire L1/L2/L3, ce moteur permet :
 * - Compression hiérarchique du code (L0→L1→L2→L3)
 * - Décompression avec reconstruction
 * - Orchestration de refactorisations
 * - Archivage intelligent
 */

import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptScope } from './StructuredTypeScriptParser';

export interface CodeFile {
  id: string;
  path: string;
  content: string;
  ast?: TypeScriptScope;
  metrics: CodeMetrics;
  dependencies: string[];
  level: number; // 0 = source, 1 = functions, 2 = modules, 3 = architecture
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
}

export interface CompressedCode {
  id: string;
  level: number;
  name: string;
  description: string;
  content: string;
  covers: string[]; // IDs des éléments couverts
  metrics: CodeMetrics;
  compressionRatio: number;
  timestamp: string;
  metadata?: {
    originalFileCount?: number;
    qualityScore?: number;
    refactoringSuggestions?: string[];
  };
}

export interface CompressionResult {
  success: boolean;
  level: number;
  compressed: CompressedCode[];
  original: CodeFile[];
  compressionRatio: number;
  processingTime: number;
  errors?: string[];
}

export interface DecompressionResult {
  success: boolean;
  level: number;
  decompressed: CodeFile[];
  decompressionPath: string[];
  reconstructionQuality: number;
  errors?: string[];
}

export class CodeCompressionEngine {
  private files: Map<string, CodeFile> = new Map();
  private compressed: Map<number, CompressedCode[]> = new Map();
  private compressionHistory: Array<{
    timestamp: string;
    level: number;
    action: 'compress' | 'decompress';
    files: string[];
  }> = [];

  constructor() {
    // Initialiser les niveaux de compression
    for (let level = 0; level <= 3; level++) {
      this.compressed.set(level, []);
    }
    console.log('🔧 CodeCompressionEngine initialisé');
  }

  /**
   * Charge un fichier de code dans le système
   */
  async loadFile(filePath: string): Promise<CodeFile> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const metrics = this.analyzeCodeMetrics(content);
      
      const codeFile: CodeFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        path: filePath,
        content,
        metrics,
        dependencies: this.extractDependencies(content),
        level: 0
      };

      this.files.set(codeFile.id, codeFile);
      console.log(`📁 Fichier chargé: ${path.basename(filePath)} (${metrics.linesOfCode} lignes)`);
      
      return codeFile;
    } catch (error) {
      throw new Error(`Erreur chargement fichier ${filePath}: ${error}`);
    }
  }

  /**
   * Charge un répertoire de code
   */
  async loadDirectory(dirPath: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): Promise<CodeFile[]> {
    const files: CodeFile[] = [];
    
    const walkDir = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(item)) {
          walkDir(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            try {
              const codeFile = this.loadFile(fullPath);
              files.push(codeFile);
            } catch (error) {
              console.warn(`⚠️ Erreur chargement ${fullPath}: ${error}`);
            }
          }
        }
      }
    };

    walkDir(dirPath);
    console.log(`📂 Répertoire chargé: ${files.length} fichiers`);
    return files;
  }

  /**
   * Compression L0→L1 : Regroupement par fonctionnalité
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
        errors: ['Aucun fichier valide trouvé']
      };
    }

    try {
      const compressed: CompressedCode[] = [];
      
      // Grouper les fichiers par fonctionnalité
      const functionalGroups = this.groupByFunctionality(originalFiles);
      
      for (const [groupName, files] of functionalGroups) {
        const totalMetrics = this.aggregateMetrics(files);
        const description = this.generateL1Description(files);
        
        const compressedCode: CompressedCode = {
          id: `l1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          level: 1,
          name: groupName,
          description,
          content: this.generateL1Content(files),
          covers: files.map(f => f.id),
          metrics: totalMetrics,
          compressionRatio: this.calculateCompressionRatio(files, totalMetrics),
          timestamp: new Date().toISOString(),
          metadata: {
            originalFileCount: files.length,
            qualityScore: this.calculateQualityScore(files),
            refactoringSuggestions: this.generateRefactoringSuggestions(files)
          }
        };
        
        compressed.push(compressedCode);
      }

      // Sauvegarder la compression L1
      this.compressed.set(1, compressed);
      this.recordCompressionAction(1, 'compress', fileIds);

      const processingTime = Date.now() - startTime;
      const compressionRatio = this.calculateOverallCompressionRatio(originalFiles, compressed);

      console.log(`✅ Compression L1 terminée: ${originalFiles.length} fichiers → ${compressed.length} groupes`);
      
      return {
        success: true,
        level: 1,
        compressed,
        original: originalFiles,
        compressionRatio,
        processingTime
      };

    } catch (error) {
      return {
        success: false,
        level: 1,
        compressed: [],
        original: originalFiles,
        compressionRatio: 0,
        processingTime: Date.now() - startTime,
        errors: [error.toString()]
      };
    }
  }

  /**
   * Compression L1→L2 : Regroupement par module
   */
  async compressToL2(l1Ids: string[]): Promise<CompressionResult> {
    const startTime = Date.now();
    const l1Items = this.compressed.get(1)?.filter(item => l1Ids.includes(item.id)) || [];
    
    if (l1Items.length === 0) {
      return {
        success: false,
        level: 2,
        compressed: [],
        original: [],
        compressionRatio: 0,
        processingTime: 0,
        errors: ['Aucun élément L1 valide trouvé']
      };
    }

    try {
      const compressed: CompressedCode[] = [];
      
      // Grouper les éléments L1 par module
      const moduleGroups = this.groupByModule(l1Items);
      
      for (const [moduleName, items] of moduleGroups) {
        const totalMetrics = this.aggregateL1Metrics(items);
        const description = this.generateL2Description(items);
        
        const compressedCode: CompressedCode = {
          id: `l2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          level: 2,
          name: moduleName,
          description,
          content: this.generateL2Content(items),
          covers: items.map(item => item.id),
          metrics: totalMetrics,
          compressionRatio: this.calculateL2CompressionRatio(items, totalMetrics),
          timestamp: new Date().toISOString(),
          metadata: {
            originalFileCount: items.reduce((sum, item) => sum + (item.metadata?.originalFileCount || 1), 0),
            qualityScore: this.calculateL2QualityScore(items),
            refactoringSuggestions: this.generateL2RefactoringSuggestions(items)
          }
        };
        
        compressed.push(compressedCode);
      }

      this.compressed.set(2, compressed);
      this.recordCompressionAction(2, 'compress', l1Ids);

      const processingTime = Date.now() - startTime;
      const compressionRatio = this.calculateOverallCompressionRatio(l1Items, compressed);

      console.log(`✅ Compression L2 terminée: ${l1Items.length} groupes → ${compressed.length} modules`);
      
      return {
        success: true,
        level: 2,
        compressed,
        original: l1Items,
        compressionRatio,
        processingTime
      };

    } catch (error) {
      return {
        success: false,
        level: 2,
        compressed: [],
        original: l1Items,
        compressionRatio: 0,
        processingTime: Date.now() - startTime,
        errors: [error.toString()]
      };
    }
  }

  /**
   * Compression L2→L3 : Vue d'ensemble architecturale
   */
  async compressToL3(l2Ids: string[]): Promise<CompressionResult> {
    const startTime = Date.now();
    const l2Items = this.compressed.get(2)?.filter(item => l2Ids.includes(item.id)) || [];
    
    if (l2Items.length === 0) {
      return {
        success: false,
        level: 3,
        compressed: [],
        original: [],
        compressionRatio: 0,
        processingTime: 0,
        errors: ['Aucun élément L2 valide trouvé']
      };
    }

    try {
      const compressed: CompressedCode[] = [];
      
      // Créer une vue architecturale globale
      const architectureGroups = this.groupByArchitecture(l2Items);
      
      for (const [archName, items] of architectureGroups) {
        const totalMetrics = this.aggregateL2Metrics(items);
        const description = this.generateL3Description(items);
        
        const compressedCode: CompressedCode = {
          id: `l3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          level: 3,
          name: archName,
          description,
          content: this.generateL3Content(items),
          covers: items.map(item => item.id),
          metrics: totalMetrics,
          compressionRatio: this.calculateL3CompressionRatio(items, totalMetrics),
          timestamp: new Date().toISOString(),
          metadata: {
            originalFileCount: items.reduce((sum, item) => sum + (item.metadata?.originalFileCount || 1), 0),
            qualityScore: this.calculateL3QualityScore(items),
            refactoringSuggestions: this.generateL3RefactoringSuggestions(items)
          }
        };
        
        compressed.push(compressedCode);
      }

      this.compressed.set(3, compressed);
      this.recordCompressionAction(3, 'compress', l2Ids);

      const processingTime = Date.now() - startTime;
      const compressionRatio = this.calculateOverallCompressionRatio(l2Items, compressed);

      console.log(`✅ Compression L3 terminée: ${l2Items.length} modules → ${compressed.length} architectures`);
      
      return {
        success: true,
        level: 3,
        compressed,
        original: l2Items,
        compressionRatio,
        processingTime
      };

    } catch (error) {
      return {
        success: false,
        level: 3,
        compressed: [],
        original: l2Items,
        compressionRatio: 0,
        processingTime: Date.now() - startTime,
        errors: [error.toString()]
      };
    }
  }

  /**
   * Décompression L3→L2
   */
  async decompressFromL3(l3Ids: string[]): Promise<DecompressionResult> {
    const startTime = Date.now();
    const l3Items = this.compressed.get(3)?.filter(item => l3Ids.includes(item.id)) || [];
    
    if (l3Items.length === 0) {
      return {
        success: false,
        level: 2,
        decompressed: [],
        decompressionPath: [],
        reconstructionQuality: 0,
        errors: ['Aucun élément L3 valide trouvé']
      };
    }

    try {
      const decompressed: CompressedCode[] = [];
      const decompressionPath: string[] = [];
      
      for (const l3Item of l3Items) {
        // Récupérer les éléments L2 couverts
        const l2Items = this.compressed.get(2)?.filter(item => 
          l3Item.covers.includes(item.id)
        ) || [];
        
        if (l2Items.length > 0) {
          decompressed.push(...l2Items);
          decompressionPath.push(`L3:${l3Item.name} → L2:${l2Items.length} modules`);
        } else {
          // Fallback: reconstruction basée sur la description
          const reconstructed = this.reconstructL2FromL3(l3Item);
          decompressed.push(reconstructed);
          decompressionPath.push(`L3:${l3Item.name} → L2:${reconstructed.name} (reconstruit)`);
        }
      }

      const processingTime = Date.now() - startTime;
      const reconstructionQuality = this.calculateReconstructionQuality(l3Items, decompressed);

      console.log(`✅ Décompression L3→L2 terminée: ${l3Items.length} architectures → ${decompressed.length} modules`);
      
      return {
        success: true,
        level: 2,
        decompressed,
        decompressionPath,
        reconstructionQuality,
        processingTime
      };

    } catch (error) {
      return {
        success: false,
        level: 2,
        decompressed: [],
        decompressionPath: [],
        reconstructionQuality: 0,
        processingTime: Date.now() - startTime,
        errors: [error.toString()]
      };
    }
  }

  /**
   * Obtient les statistiques de compression
   */
  getCompressionStats(): {
    totalFiles: number;
    filesByLevel: Record<number, number>;
    compressionRatios: Record<number, number>;
    totalProcessingTime: number;
    lastCompression: string | null;
  } {
    const filesByLevel: Record<number, number> = {};
    const compressionRatios: Record<number, number> = {};
    
    for (let level = 0; level <= 3; level++) {
      const items = level === 0 ? Array.from(this.files.values()) : (this.compressed.get(level) || []);
      filesByLevel[level] = items.length;
      
      if (level > 0 && items.length > 0) {
        const avgRatio = items.reduce((sum, item) => sum + item.compressionRatio, 0) / items.length;
        compressionRatios[level] = avgRatio;
      }
    }

    const totalProcessingTime = this.compressionHistory.reduce((sum, action) => sum + 0, 0); // TODO: calculer le temps réel
    const lastCompression = this.compressionHistory.length > 0 ? 
      this.compressionHistory[this.compressionHistory.length - 1].timestamp : null;

    return {
      totalFiles: Array.from(this.files.values()).length,
      filesByLevel,
      compressionRatios,
      totalProcessingTime,
      lastCompression
    };
  }

  /**
   * Exporte les données de compression
   */
  exportCompressionData(): {
    files: CodeFile[];
    compressed: Record<number, CompressedCode[]>;
    history: typeof this.compressionHistory;
    stats: ReturnType<typeof this.getCompressionStats>;
  } {
    const compressed: Record<number, CompressedCode[]> = {};
    for (const [level, items] of this.compressed) {
      compressed[level] = [...items];
    }

    return {
      files: Array.from(this.files.values()),
      compressed,
      history: [...this.compressionHistory],
      stats: this.getCompressionStats()
    };
  }

  // Méthodes privées

  private analyzeCodeMetrics(content: string): CodeMetrics {
    const lines = content.split('\n');
    const functions = (content.match(/function\s+\w+/g) || []).length;
    const classes = (content.match(/class\s+\w+/g) || []).length;
    const interfaces = (content.match(/interface\s+\w+/g) || []).length;
    const imports = (content.match(/import\s+.*from/g) || []).length;
    const exports = (content.match(/export\s+/g) || []).length;
    
    // Complexité cyclomatique simplifiée
    const complexity = (content.match(/if\s*\(|for\s*\(|while\s*\(|switch\s*\(/g) || []).length + 1;

    return {
      linesOfCode: lines.length,
      functions,
      classes,
      interfaces,
      imports,
      exports,
      complexity,
      dependencies: imports
    };
  }

  private extractDependencies(content: string): string[] {
    const imports = content.match(/import\s+.*from\s+['"`]([^'"`]+)['"`]/g) || [];
    return imports.map(imp => {
      const match = imp.match(/from\s+['"`]([^'"`]+)['"`]/);
      return match ? match[1] : '';
    }).filter(Boolean);
  }

  private groupByFunctionality(files: CodeFile[]): Map<string, CodeFile[]> {
    const groups = new Map<string, CodeFile[]>();
    
    for (const file of files) {
      const fileName = path.basename(file.path);
      const dirName = path.dirname(file.path).split(path.sep).pop() || 'root';
      
      // Grouper par nom de répertoire ou par type de fichier
      const groupName = this.determineFunctionalityGroup(fileName, dirName, file.content);
      
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push(file);
    }
    
    return groups;
  }

  private determineFunctionalityGroup(fileName: string, dirName: string, content: string): string {
    // Logique de regroupement par fonctionnalité
    if (fileName.includes('test') || fileName.includes('spec')) return 'Tests';
    if (fileName.includes('util') || fileName.includes('helper')) return 'Utils';
    if (fileName.includes('type') || fileName.includes('interface')) return 'Types';
    if (fileName.includes('component') || fileName.includes('ui')) return 'Components';
    if (fileName.includes('service') || fileName.includes('api')) return 'Services';
    if (fileName.includes('hook') || fileName.includes('use')) return 'Hooks';
    
    // Grouper par répertoire
    return dirName.charAt(0).toUpperCase() + dirName.slice(1);
  }

  private aggregateMetrics(files: CodeFile[]): CodeMetrics {
    return files.reduce((acc, file) => ({
      linesOfCode: acc.linesOfCode + file.metrics.linesOfCode,
      functions: acc.functions + file.metrics.functions,
      classes: acc.classes + file.metrics.classes,
      interfaces: acc.interfaces + file.metrics.interfaces,
      imports: acc.imports + file.metrics.imports,
      exports: acc.exports + file.metrics.exports,
      complexity: acc.complexity + file.metrics.complexity,
      dependencies: acc.dependencies + file.metrics.dependencies
    }), {
      linesOfCode: 0,
      functions: 0,
      classes: 0,
      interfaces: 0,
      imports: 0,
      exports: 0,
      complexity: 0,
      dependencies: 0
    });
  }

  private generateL1Description(files: CodeFile[]): string {
    const fileNames = files.map(f => path.basename(f.path)).join(', ');
    const totalLines = files.reduce((sum, f) => sum + f.metrics.linesOfCode, 0);
    return `Groupe fonctionnel contenant ${files.length} fichiers (${totalLines} lignes): ${fileNames}`;
  }

  private generateL1Content(files: CodeFile[]): string {
    const summaries = files.map(file => {
      const fileName = path.basename(file.path);
      const functions = file.metrics.functions;
      const classes = file.metrics.classes;
      return `${fileName}: ${functions} fonctions, ${classes} classes`;
    });
    return summaries.join('\n');
  }

  private calculateCompressionRatio(files: CodeFile[], metrics: CodeMetrics): number {
    const originalSize = files.reduce((sum, f) => sum + f.metrics.linesOfCode, 0);
    const compressedSize = metrics.linesOfCode;
    return originalSize > 0 ? compressedSize / originalSize : 1;
  }

  private calculateQualityScore(files: CodeFile[]): number {
    // Score basé sur la cohérence et la qualité du code
    const avgComplexity = files.reduce((sum, f) => sum + f.metrics.complexity, 0) / files.length;
    const avgFunctions = files.reduce((sum, f) => sum + f.metrics.functions, 0) / files.length;
    
    // Score entre 0 et 1
    const complexityScore = Math.max(0, 1 - (avgComplexity - 1) / 10);
    const functionScore = Math.min(1, avgFunctions / 5);
    
    return (complexityScore + functionScore) / 2;
  }

  private generateRefactoringSuggestions(files: CodeFile[]): string[] {
    const suggestions: string[] = [];
    
    const totalComplexity = files.reduce((sum, f) => sum + f.metrics.complexity, 0);
    if (totalComplexity > files.length * 5) {
      suggestions.push('Considérer la simplification de la logique complexe');
    }
    
    const totalFunctions = files.reduce((sum, f) => sum + f.metrics.functions, 0);
    if (totalFunctions > files.length * 10) {
      suggestions.push('Considérer la consolidation des fonctions similaires');
    }
    
    return suggestions;
  }

  private groupByModule(l1Items: CompressedCode[]): Map<string, CompressedCode[]> {
    const groups = new Map<string, CompressedCode[]>();
    
    for (const item of l1Items) {
      // Grouper par domaine fonctionnel
      const moduleName = this.determineModuleGroup(item.name, item.description);
      
      if (!groups.has(moduleName)) {
        groups.set(moduleName, []);
      }
      groups.get(moduleName)!.push(item);
    }
    
    return groups;
  }

  private determineModuleGroup(name: string, description: string): string {
    const text = (name + ' ' + description).toLowerCase();
    
    if (text.includes('test') || text.includes('spec')) return 'Testing';
    if (text.includes('util') || text.includes('helper')) return 'Utilities';
    if (text.includes('type') || text.includes('interface')) return 'Types';
    if (text.includes('component') || text.includes('ui')) return 'UI';
    if (text.includes('service') || text.includes('api')) return 'Services';
    if (text.includes('hook') || text.includes('use')) return 'Hooks';
    if (text.includes('auth') || text.includes('login')) return 'Authentication';
    if (text.includes('data') || text.includes('model')) return 'Data';
    
    return 'Core';
  }

  private aggregateL1Metrics(items: CompressedCode[]): CodeMetrics {
    return items.reduce((acc, item) => ({
      linesOfCode: acc.linesOfCode + item.metrics.linesOfCode,
      functions: acc.functions + item.metrics.functions,
      classes: acc.classes + item.metrics.classes,
      interfaces: acc.interfaces + item.metrics.interfaces,
      imports: acc.imports + item.metrics.imports,
      exports: acc.exports + item.metrics.exports,
      complexity: acc.complexity + item.metrics.complexity,
      dependencies: acc.dependencies + item.metrics.dependencies
    }), {
      linesOfCode: 0,
      functions: 0,
      classes: 0,
      interfaces: 0,
      imports: 0,
      exports: 0,
      complexity: 0,
      dependencies: 0
    });
  }

  private generateL2Description(items: CompressedCode[]): string {
    const itemNames = items.map(item => item.name).join(', ');
    const totalFiles = items.reduce((sum, item) => sum + (item.metadata?.originalFileCount || 1), 0);
    return `Module contenant ${items.length} groupes fonctionnels (${totalFiles} fichiers): ${itemNames}`;
  }

  private generateL2Content(items: CompressedCode[]): string {
    const summaries = items.map(item => {
      const fileCount = item.metadata?.originalFileCount || 1;
      return `${item.name}: ${fileCount} fichiers, ${item.metrics.functions} fonctions`;
    });
    return summaries.join('\n');
  }

  private calculateL2CompressionRatio(items: CompressedCode[], metrics: CodeMetrics): number {
    const originalSize = items.reduce((sum, item) => sum + item.metrics.linesOfCode, 0);
    const compressedSize = metrics.linesOfCode;
    return originalSize > 0 ? compressedSize / originalSize : 1;
  }

  private calculateL2QualityScore(items: CompressedCode[]): number {
    const avgQuality = items.reduce((sum, item) => sum + (item.metadata?.qualityScore || 0.5), 0) / items.length;
    return avgQuality;
  }

  private generateL2RefactoringSuggestions(items: CompressedCode[]): string[] {
    const suggestions: string[] = [];
    
    if (items.length > 5) {
      suggestions.push('Considérer la subdivision du module en sous-modules');
    }
    
    const totalComplexity = items.reduce((sum, item) => sum + item.metrics.complexity, 0);
    if (totalComplexity > items.length * 10) {
      suggestions.push('Considérer la simplification de l\'architecture du module');
    }
    
    return suggestions;
  }

  private groupByArchitecture(l2Items: CompressedCode[]): Map<string, CompressedCode[]> {
    const groups = new Map<string, CompressedCode[]>();
    
    // Pour L3, on crée une vue architecturale globale
    groups.set('Core', l2Items);
    
    return groups;
  }

  private aggregateL2Metrics(items: CompressedCode[]): CodeMetrics {
    return this.aggregateL1Metrics(items); // Même logique que L1
  }

  private generateL3Description(items: CompressedCode[]): string {
    const totalFiles = items.reduce((sum, item) => sum + (item.metadata?.originalFileCount || 1), 0);
    const totalFunctions = items.reduce((sum, item) => sum + item.metrics.functions, 0);
    return `Architecture globale contenant ${items.length} modules (${totalFiles} fichiers, ${totalFunctions} fonctions)`;
  }

  private generateL3Content(items: CompressedCode[]): string {
    const summaries = items.map(item => {
      const fileCount = item.metadata?.originalFileCount || 1;
      return `${item.name}: ${fileCount} fichiers, ${item.metrics.functions} fonctions, ${item.metrics.classes} classes`;
    });
    return summaries.join('\n');
  }

  private calculateL3CompressionRatio(items: CompressedCode[], metrics: CodeMetrics): number {
    return this.calculateL2CompressionRatio(items, metrics);
  }

  private calculateL3QualityScore(items: CompressedCode[]): number {
    return this.calculateL2QualityScore(items);
  }

  private generateL3RefactoringSuggestions(items: CompressedCode[]): string[] {
    const suggestions: string[] = [];
    
    if (items.length > 10) {
      suggestions.push('Considérer l\'adoption d\'une architecture microservices');
    }
    
    const totalDependencies = items.reduce((sum, item) => sum + item.metrics.dependencies, 0);
    if (totalDependencies > items.length * 5) {
      suggestions.push('Considérer la réduction des dépendances inter-modules');
    }
    
    return suggestions;
  }

  private calculateOverallCompressionRatio(original: any[], compressed: CompressedCode[]): number {
    if (original.length === 0) return 0;
    return compressed.length / original.length;
  }

  private recordCompressionAction(level: number, action: 'compress' | 'decompress', fileIds: string[]): void {
    this.compressionHistory.push({
      timestamp: new Date().toISOString(),
      level,
      action,
      files: fileIds
    });
  }

  private reconstructL2FromL3(l3Item: CompressedCode): CompressedCode {
    // Reconstruction basique basée sur la description L3
    return {
      id: `l2_reconstructed_${Date.now()}`,
      level: 2,
      name: 'Reconstructed Module',
      description: `Module reconstruit depuis ${l3Item.name}`,
      content: `Reconstruction basée sur: ${l3Item.description}`,
      covers: [],
      metrics: l3Item.metrics,
      compressionRatio: 1.0,
      timestamp: new Date().toISOString(),
      metadata: {
        originalFileCount: l3Item.metadata?.originalFileCount || 1,
        qualityScore: 0.5, // Score réduit pour les reconstructions
        refactoringSuggestions: ['Vérifier la reconstruction manuellement']
      }
    };
  }

  private calculateReconstructionQuality(original: CompressedCode[], reconstructed: CompressedCode[]): number {
    // Score basé sur la correspondance entre original et reconstruit
    if (original.length === 0) return 0;
    
    const coverage = reconstructed.length / original.length;
    const avgQuality = reconstructed.reduce((sum, item) => sum + (item.metadata?.qualityScore || 0.5), 0) / reconstructed.length;
    
    return (coverage + avgQuality) / 2;
  }
}