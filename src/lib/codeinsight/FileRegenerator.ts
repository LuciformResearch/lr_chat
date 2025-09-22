/**
 * FileRegenerator - Régénération de fichiers TypeScript complets
 * 
 * Prend les données compressées et régénère le code TypeScript complet
 * avec validation et vérification de la qualité
 */

import { CompressedFile } from './FileCompressor';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

export interface RegenerationResult {
  success: boolean;
  regeneratedCode: string;
  originalCode?: string;
  validation: ValidationResult;
  metadata: RegenerationMetadata;
  errors: string[];
  warnings: string[];
}

export interface ValidationResult {
  syntaxValid: boolean;
  typeValid: boolean;
  compilationValid: boolean;
  structureValid: boolean;
  importsValid: boolean;
  exportsValid: boolean;
  overallScore: number; // 0-100
}

export interface RegenerationMetadata {
  originalPath: string;
  regeneratedAt: string;
  regenerationTime: number;
  originalLines: number;
  regeneratedLines: number;
  originalScopes: number;
  regeneratedScopes: number;
  compressionRatio: number;
  fidelityScore: number; // 0-100
  qualityScore: number; // 0-100
}

export class FileRegenerator {
  private useRealLLM: boolean;
  private llmCalls: number;

  constructor() {
    this.useRealLLM = !!process.env.GEMINI_API_KEY;
    this.llmCalls = 0;
    
    console.log('🔄 FileRegenerator initialisé');
    console.log(`🧠 Mode LLM: ${this.useRealLLM ? 'Vrais appels LLM' : 'Mode heuristique'}`);
  }

  /**
   * Régénère un fichier complet à partir des données compressées
   */
  async regenerateFile(compressedFile: CompressedFile): Promise<RegenerationResult> {
    const startTime = Date.now();
    console.log(`🔄 Régénération du fichier: ${compressedFile.metadata.fileName}`);

    try {
      // 1. Générer le code TypeScript
      console.log('📝 Génération du code TypeScript...');
      const regeneratedCode = await this.generateTypeScriptCode(compressedFile);
      console.log(`✅ Code généré: ${regeneratedCode.split('\n').length} lignes`);

      // 2. Valider le code généré
      console.log('🔍 Validation du code...');
      const validation = await this.validateGeneratedCode(regeneratedCode, compressedFile);
      console.log(`✅ Validation terminée: Score ${validation.overallScore}/100`);

      // 3. Calculer les métadonnées
      const endTime = Date.now();
      const regenerationTime = endTime - startTime;
      const metadata = this.calculateRegenerationMetadata(compressedFile, regeneratedCode, regenerationTime);

      // 4. Déterminer le succès
      const success = validation.overallScore >= 70; // Seuil de succès
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!validation.syntaxValid) {
        errors.push('Erreurs de syntaxe détectées');
      }
      if (!validation.typeValid) {
        errors.push('Erreurs de types détectées');
      }
      if (!validation.compilationValid) {
        errors.push('Erreurs de compilation détectées');
      }
      if (validation.overallScore < 90) {
        warnings.push('Qualité du code régénéré peut être améliorée');
      }

      console.log(`✅ Régénération terminée: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
      console.log(`   Score: ${validation.overallScore}/100`);
      console.log(`   Erreurs: ${errors.length}`);
      console.log(`   Avertissements: ${warnings.length}`);

      return {
        success,
        regeneratedCode,
        validation,
        metadata,
        errors,
        warnings
      };

    } catch (error) {
      console.error(`❌ Erreur régénération fichier ${compressedFile.metadata.fileName}:`, error);
      
      const endTime = Date.now();
      const regenerationTime = endTime - startTime;
      
      return {
        success: false,
        regeneratedCode: '',
        validation: {
          syntaxValid: false,
          typeValid: false,
          compilationValid: false,
          structureValid: false,
          importsValid: false,
          exportsValid: false,
          overallScore: 0
        },
        metadata: {
          originalPath: compressedFile.metadata.originalPath,
          regeneratedAt: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
          regenerationTime,
          originalLines: compressedFile.metadata.totalLines,
          regeneratedLines: 0,
          originalScopes: compressedFile.metadata.totalScopes,
          regeneratedScopes: 0,
          compressionRatio: compressedFile.metadata.compressionRatio,
          fidelityScore: 0,
          qualityScore: 0
        },
        errors: [error.toString()],
        warnings: []
      };
    }
  }

  /**
   * Génère le code TypeScript à partir des données compressées
   */
  private async generateTypeScriptCode(compressedFile: CompressedFile): Promise<string> {
    if (!this.useRealLLM) {
      throw new Error('❌ GEMINI_API_KEY manquante - Le FileRegenerator nécessite un appel LLM pour la régénération');
    }

    // Mode LLM obligatoire
    const regenerationPrompt = this.buildRegenerationPrompt(compressedFile);
    
    try {
      console.log('🧠 Appel LLM pour régénération...');
      const response = await this.callLLM(regenerationPrompt);
      this.llmCalls++;

      console.log('🔍 Parsing de la réponse de régénération...');
      const regeneratedCode = this.parseRegenerationResponse(response);
      
      console.log(`✅ Code régénéré: ${regeneratedCode.split('\n').length} lignes`);
      return regeneratedCode;

    } catch (error) {
      console.error('❌ Erreur régénération LLM:', error);
      throw new Error(`Échec de la régénération LLM: ${error}`);
    }
  }

  /**
   * Construit le prompt pour la régénération
   */
  private buildRegenerationPrompt(compressedFile: CompressedFile): string {
    const { metadata, summary, scopes, decompression } = compressedFile;

    const scopesInfo = scopes.map(scope => {
      return `### ${scope.type.toUpperCase()} ${scope.name}
- **But:** ${scope.purpose}
- **Signature:** ${scope.signature}
- **Complexité:** ${scope.complexity}
- **Position:** Lignes ${scope.position.startLine}-${scope.position.endLine}
- **Tags:** ${scope.tags.join(', ')}
- **Dépendances:** ${scope.keyDependencies.join(', ')}
- **Risques identifiés:** ${scope.risks.join('; ')}
- **Tests suggérés:** ${scope.testIdeas.join('; ')}
- **Améliorations suggérées:** ${scope.improvements?.join('; ') || 'Aucune'}`;
    }).join('\n\n');

    return `Tu es un expert en génération de code TypeScript. Régénère le fichier complet à partir des données compressées et AMÉLIORE-LE selon l'analyse initiale.

MÉTADONNÉES:
- **Fichier:** ${metadata.fileName}
- **Type:** ${metadata.fileType}
- **Architecture:** ${summary.architecture}
- **But global:** ${summary.purpose}
- **Patterns:** ${summary.mainPatterns.join(', ')}
- **Dépendances clés:** ${summary.keyDependencies.join(', ')}

SCOPES À RÉGÉNÉRER ET AMÉLIORER:
${scopesInfo}

INSTRUCTIONS DE DÉCOMPRESSION:
${decompression.instructions.map(inst => `- ${inst}`).join('\n')}

CONTEXTE REQUIS:
${decompression.requiredContext.map(ctx => `- ${ctx}`).join('\n')}

CONSEILS DE RÉGÉNÉRATION:
${decompression.regenerationHints.map(hint => `- ${hint}`).join('\n')}

RÈGLES DE QUALITÉ:
${decompression.qualityChecks.map(check => `- ${check}`).join('\n')}

RÈGLES DE VALIDATION:
${decompression.validationRules.map(rule => `- ${rule}`).join('\n')}

AMÉLIORATIONS À APPLIQUER:
- Corriger les risques identifiés dans l'analyse
- Ajouter la gestion d'erreurs manquante
- Améliorer la validation des données
- Optimiser les performances si nécessaire
- Ajouter la documentation manquante
- Corriger les types et signatures
- Améliorer la lisibilité du code

GÉNÈRE le code TypeScript complet en respectant:
1. La structure et l'architecture originales
2. Les signatures et types des scopes
3. Les relations entre les composants
4. Les patterns architecturaux identifiés
5. Les bonnes pratiques TypeScript
6. La documentation et les commentaires
7. Les imports et exports nécessaires
8. LES AMÉLIORATIONS SUGGÉRÉES PAR L'ANALYSE

RÈGLES D'EXPORT OBLIGATOIRES:
- TOUTES les interfaces doivent être exportées avec "export interface"
- TOUTES les classes doivent être exportées avec "export class"
- TOUTES les fonctions doivent être exportées avec "export function"
- TOUTES les types doivent être exportés avec "export type"
- TOUTES les enums doivent être exportés avec "export enum"

Réponds UNIQUEMENT avec le code TypeScript complet, sans explications ni commentaires supplémentaires.`;
  }

  /**
   * Appelle le LLM pour la régénération
   */
  private async callLLM(prompt: string): Promise<string> {
    // Simuler l'appel LLM (à remplacer par l'implémentation réelle)
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  /**
   * Parse la réponse de régénération
   */
  private parseRegenerationResponse(response: string): string {
    // Nettoyer la réponse
    let cleanCode = response.trim();
    
    // Supprimer les markdown fences si présents
    cleanCode = cleanCode.replace(/```typescript\n?/g, '').replace(/```\n?/g, '');
    
    // Supprimer les commentaires d'explication
    const lines = cleanCode.split('\n');
    const codeLines = lines.filter(line => {
      // Garder les lignes qui commencent par du code TypeScript
      return line.trim().length > 0 && 
             !line.trim().startsWith('Voici le code') &&
             !line.trim().startsWith('Le code généré') &&
             !line.trim().startsWith('Code TypeScript');
    });
    
    return codeLines.join('\n');
  }

  /**
   * Génère le code de manière heuristique
   */
  private generateCodeHeuristically(compressedFile: CompressedFile): string {
    const { metadata, summary, scopes } = compressedFile;
    
    let code = `// Fichier régénéré: ${metadata.fileName}
// Architecture: ${summary.architecture}
// But: ${summary.purpose}

`;

    // Analyser les dépendances nécessaires
    const requiredImports = this.analyzeRequiredImports(scopes, summary);
    
    // Ajouter les imports
    if (requiredImports.length > 0) {
      code += `// Imports
${requiredImports.map(imp => `import ${imp};`).join('\n')}

`;
    }

    // Générer chaque scope
    for (const scope of scopes) {
      code += this.generateScopeCode(scope);
      code += '\n\n';
    }

    return code;
  }

  /**
   * Analyse les imports nécessaires
   */
  private analyzeRequiredImports(scopes: any[], summary: any): string[] {
    const imports: string[] = [];
    
    // Vérifier si on a des classes avec @Injectable
    const hasInjectableClass = scopes.some(scope => 
      scope.type === 'class' && scope.tags.some((tag: string) => tag.includes('service'))
    );
    
    if (hasInjectableClass) {
      imports.push("{ Injectable } from '@angular/core'");
    }
    
    // Vérifier si on a des classes avec HttpClient
    const hasHttpClient = scopes.some(scope => 
      scope.type === 'class' && scope.keyDependencies.some((dep: string) => dep.includes('Http'))
    );
    
    if (hasHttpClient) {
      imports.push("{ HttpClient } from '@angular/common/http'");
    }
    
    // Vérifier si on a des Observables
    const hasObservables = scopes.some(scope => 
      scope.signature.includes('Observable') || 
      scope.keyDependencies.some((dep: string) => dep.includes('Observable'))
    );
    
    if (hasObservables) {
      imports.push("{ Observable } from 'rxjs'");
    }
    
    // Vérifier si on a des composants
    const hasComponents = scopes.some(scope => 
      scope.type === 'class' && scope.tags.some((tag: string) => tag.includes('component'))
    );
    
    if (hasComponents) {
      imports.push("{ Component } from '@angular/core'");
    }
    
    return imports;
  }

  /**
   * Génère le code pour un scope individuel
   */
  private generateScopeCode(scope: any): string {
    let code = '';

    // Commentaire de documentation
    code += `/**
 * ${scope.purpose}
 */\n`;

    // Générer selon le type
    switch (scope.type) {
      case 'interface':
        code += this.generateInterfaceCode(scope);
        break;
      case 'class':
        code += this.generateClassCode(scope);
        break;
      case 'function':
        code += this.generateFunctionCode(scope);
        break;
      case 'method':
        code += this.generateMethodCode(scope);
        break;
      default:
        code += `// ${scope.type} ${scope.name} - Non implémenté\n`;
    }

    return code;
  }

  /**
   * Génère le code pour une interface
   */
  private generateInterfaceCode(scope: any): string {
    let code = `export interface ${scope.name} {\n`;
    
    // Générer les propriétés basiques selon le nom et les tags
    if (scope.name.includes('Data') || scope.name.includes('User') || scope.tags.includes('data')) {
      code += `  id: number;\n`;
      code += `  name: string;\n`;
    }
    
    if (scope.name.includes('User') || scope.tags.includes('user')) {
      code += `  email: string;\n`;
      code += `  isActive?: boolean;\n`;
      code += `  roles: string[];\n`;
      code += `  lastLogin?: Date;\n`;
      code += `  preferences: UserPreferences;\n`;
    }
    
    if (scope.name.includes('Preferences') || scope.tags.includes('preferences')) {
      code += `  theme: 'light' | 'dark';\n`;
      code += `  language: string;\n`;
      code += `  notifications: boolean;\n`;
      code += `  timezone: string;\n`;
    }
    
    if (scope.name.includes('Search') || scope.name.includes('Params') || scope.tags.includes('search')) {
      code += `  query: string;\n`;
      code += `  limit?: number;\n`;
      code += `  offset?: number;\n`;
      code += `  filters: SearchFilters;\n`;
      code += `  sortBy?: string;\n`;
      code += `  sortOrder?: 'asc' | 'desc';\n`;
    }
    
    if (scope.name.includes('Filters') || scope.tags.includes('filters')) {
      code += `  isActive?: boolean;\n`;
      code += `  roles?: string[];\n`;
      code += `  dateRange?: {\n`;
      code += `    start: Date;\n`;
      code += `    end: Date;\n`;
      code += `  };\n`;
    }
    
    // Propriétés génériques pour les interfaces simples
    if (scope.name.includes('Simple') || scope.tags.includes('simple')) {
      code += `  id: number;\n`;
      code += `  name: string;\n`;
    }
    
    code += `}\n`;
    return code;
  }

  /**
   * Génère le code pour une classe
   */
  private generateClassCode(scope: any): string {
    let code = '';
    
    // Ajouter le décorateur si c'est un service
    if (scope.name.includes('Service') || scope.tags.includes('service')) {
      code += `@Injectable({\n`;
      code += `  providedIn: 'root'\n`;
      code += `})\n`;
    }
    
    code += `export class ${scope.name} {\n`;
    
    // Propriétés de classe
    if (scope.name.includes('Service') || scope.tags.includes('service')) {
      code += `  private apiUrl = 'https://api.example.com/${scope.name.toLowerCase().replace('service', '')}s';\n\n`;
    }
    
    // Constructeur
    if (scope.keyDependencies.some((dep: string) => dep.includes('Http'))) {
      code += `  constructor(private http: HttpClient) {}\n\n`;
    } else {
      code += `  constructor() {}\n\n`;
    }
    
    // Méthodes basiques selon le type de classe
    if (scope.name.includes('Service') || scope.tags.includes('service')) {
      code += `  getItems(): Observable<any[]> {\n`;
      code += `    return this.http.get<any[]>(this.apiUrl);\n`;
      code += `  }\n\n`;
      
      code += `  getItemById(id: number): Observable<any> {\n`;
      code += `    return this.http.get<any>(\`\${this.apiUrl}/\${id}\`);\n`;
      code += `  }\n\n`;
      
      code += `  createItem(item: any): Observable<any> {\n`;
      code += `    return this.http.post<any>(this.apiUrl, item);\n`;
      code += `  }\n`;
    } else if (scope.name.includes('Simple') || scope.tags.includes('simple')) {
      // Classe simple sans HTTP
      code += `  getData(): any {\n`;
      code += `    return { id: 1, name: 'test' };\n`;
      code += `  }\n`;
    }
    
    code += `}\n`;
    return code;
  }

  /**
   * Génère le code pour une fonction
   */
  private generateFunctionCode(scope: any): string {
    let code = `export function ${scope.name}(`;
    
    // Paramètres basiques selon le nom et les tags
    if (scope.name.includes('format') || scope.tags.includes('formatting')) {
      code += `data: any, includeEmail = false`;
    } else if (scope.name.includes('isValid') || scope.tags.includes('validation')) {
      code += `value: string`;
    } else if (scope.name.includes('process') || scope.tags.includes('processing')) {
      code += `items: any[], filters: any, sortOptions?: { field: string; order: 'asc' | 'desc' }`;
    } else if (scope.name.includes('generate') || scope.tags.includes('statistics')) {
      code += `users: any[]`;
    } else {
      code += `...args: any[]`;
    }
    
    code += `): `;
    
    // Type de retour
    if (scope.name.includes('format') || scope.tags.includes('formatting')) {
      code += `string`;
    } else if (scope.name.includes('isValid') || scope.tags.includes('validation')) {
      code += `boolean`;
    } else if (scope.name.includes('process') || scope.tags.includes('processing')) {
      code += `any[]`;
    } else if (scope.name.includes('generate') || scope.tags.includes('statistics')) {
      code += `{ total: number; active: number; inactive: number; byRole: Record<string, number>; byTheme: Record<string, number> }`;
    } else {
      code += `any`;
    }
    
    code += ` {\n`;
    
    // Corps de la fonction
    if (scope.name.includes('format') || scope.tags.includes('formatting')) {
      code += `  const baseName = \`\${data.name} (\${data.id})\`;\n`;
      code += `  return includeEmail ? \`\${baseName} - \${data.email}\` : baseName;\n`;
    } else if (scope.name.includes('isValid') || scope.tags.includes('validation')) {
      code += `  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n`;
      code += `  return regex.test(value);\n`;
    } else if (scope.name.includes('process') || scope.tags.includes('processing')) {
      code += `  let processedItems = [...items];\n`;
      code += `  \n`;
      code += `  if (filters.isActive !== undefined) {\n`;
      code += `    processedItems = processedItems.filter(item => item.isActive === filters.isActive);\n`;
      code += `  }\n`;
      code += `  \n`;
      code += `  if (filters.roles?.length) {\n`;
      code += `    processedItems = processedItems.filter(item => \n`;
      code += `      item.roles.some(role => filters.roles.includes(role))\n`;
      code += `    );\n`;
      code += `  }\n`;
      code += `  \n`;
      code += `  if (sortOptions) {\n`;
      code += `    processedItems.sort((a, b) => {\n`;
      code += `      const aValue = a[sortOptions.field];\n`;
      code += `      const bValue = b[sortOptions.field];\n`;
      code += `      if (aValue < bValue) return sortOptions.order === 'asc' ? -1 : 1;\n`;
      code += `      if (aValue > bValue) return sortOptions.order === 'asc' ? 1 : -1;\n`;
      code += `      return 0;\n`;
      code += `    });\n`;
      code += `  }\n`;
      code += `  \n`;
      code += `  return processedItems;\n`;
    } else if (scope.name.includes('generate') || scope.tags.includes('statistics')) {
      code += `  const stats = {\n`;
      code += `    total: users.length,\n`;
      code += `    active: users.filter(u => u.isActive).length,\n`;
      code += `    inactive: users.filter(u => !u.isActive).length,\n`;
      code += `    byRole: {} as Record<string, number>,\n`;
      code += `    byTheme: {} as Record<string, number>\n`;
      code += `  };\n`;
      code += `  \n`;
      code += `  users.forEach(user => {\n`;
      code += `    user.roles.forEach(role => {\n`;
      code += `      stats.byRole[role] = (stats.byRole[role] || 0) + 1;\n`;
      code += `    });\n`;
      code += `    const theme = user.preferences.theme;\n`;
      code += `    stats.byTheme[theme] = (stats.byTheme[theme] || 0) + 1;\n`;
      code += `  });\n`;
      code += `  \n`;
      code += `  return stats;\n`;
    } else {
      code += `  // Implémentation basique\n`;
      code += `  return null;\n`;
    }
    
    code += `}\n`;
    return code;
  }

  /**
   * Génère le code pour une méthode
   */
  private generateMethodCode(scope: any): string {
    let code = `  ${scope.name}(`;
    
    // Paramètres basiques
    if (scope.name.includes('get') && scope.name.includes('ById')) {
      code += `id: number`;
    } else if (scope.name.includes('create')) {
      code += `item: any`;
    } else if (scope.name.includes('search')) {
      code += `params: any`;
    } else {
      code += `...args: any[]`;
    }
    
    code += `): `;
    
    // Type de retour
    if (scope.name.includes('get') || scope.name.includes('create')) {
      code += `Observable<any>`;
    } else if (scope.name.includes('search')) {
      code += `Observable<any[]>`;
    } else {
      code += `any`;
    }
    
    code += ` {\n`;
    
    // Corps de la méthode
    if (scope.name.includes('get') && scope.name.includes('ById')) {
      code += `    return this.http.get<any>(\`\${this.apiUrl}/\${id}\`);\n`;
    } else if (scope.name.includes('create')) {
      code += `    return this.http.post<any>(this.apiUrl, item);\n`;
    } else if (scope.name.includes('search')) {
      code += `    const queryParams = new URLSearchParams();\n`;
      code += `    queryParams.set('q', params.query);\n`;
      code += `    return this.http.get<any[]>(\`\${this.apiUrl}/search?\${queryParams.toString()}\`);\n`;
    } else {
      code += `    // Implémentation basique\n`;
      code += `    return null;\n`;
    }
    
    code += `  }\n`;
    return code;
  }

  /**
   * Valide le code généré
   */
  private async validateGeneratedCode(code: string, compressedFile: CompressedFile): Promise<ValidationResult> {
    const validation: ValidationResult = {
      syntaxValid: false,
      typeValid: false,
      compilationValid: false,
      structureValid: false,
      importsValid: false,
      exportsValid: false,
      overallScore: 0
    };

    try {
      // 1. Validation de syntaxe basique
      validation.syntaxValid = this.validateSyntax(code);
      
      // 2. Validation de structure
      validation.structureValid = this.validateStructure(code, compressedFile);
      
      // 3. Validation des imports
      validation.importsValid = this.validateImports(code, compressedFile);
      
      // 4. Validation des exports
      validation.exportsValid = this.validateExports(code, compressedFile);
      
      // 5. Validation des types (simulation)
      validation.typeValid = this.validateTypes(code);
      
      // 6. Validation de compilation (simulation)
      validation.compilationValid = this.validateCompilation(code);
      
      // 7. Calcul du score global
      const scores = [
        validation.syntaxValid ? 20 : 0,
        validation.structureValid ? 20 : 0,
        validation.importsValid ? 15 : 0,
        validation.exportsValid ? 15 : 0,
        validation.typeValid ? 15 : 0,
        validation.compilationValid ? 15 : 0
      ];
      
      validation.overallScore = scores.reduce((sum, score) => sum + score, 0);
      
    } catch (error) {
      console.error('❌ Erreur validation:', error);
    }

    return validation;
  }

  /**
   * Valide la syntaxe du code
   */
  private validateSyntax(code: string): boolean {
    try {
      // Vérifications basiques de syntaxe
      const lines = code.split('\n');
      
      // Vérifier les accolades équilibrées
      let braceCount = 0;
      let parenCount = 0;
      let bracketCount = 0;
      
      for (const line of lines) {
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
          if (char === '(') parenCount++;
          if (char === ')') parenCount--;
          if (char === '[') bracketCount++;
          if (char === ']') bracketCount--;
        }
      }
      
      return braceCount === 0 && parenCount === 0 && bracketCount === 0;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Valide la structure du code
   */
  private validateStructure(code: string, compressedFile: CompressedFile): boolean {
    try {
      // Vérifier que tous les scopes sont présents
      for (const scope of compressedFile.scopes) {
        if (!code.includes(scope.name)) {
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Valide les imports
   */
  private validateImports(code: string, compressedFile: CompressedFile): boolean {
    try {
      // Vérifier que les imports nécessaires sont présents
      const hasInjectable = compressedFile.scopes.some(scope => 
        scope.type === 'class' && scope.tags.includes('service')
      );
      
      if (hasInjectable && !code.includes("from '@angular/core'")) {
        return false;
      }
      
      const hasHttpClient = compressedFile.scopes.some(scope => 
        scope.type === 'class' && scope.keyDependencies.some((dep: string) => dep.includes('Http'))
      );
      
      if (hasHttpClient && !code.includes("from '@angular/common/http'")) {
        return false;
      }
      
      const hasObservables = compressedFile.scopes.some(scope => 
        scope.signature.includes('Observable')
      );
      
      if (hasObservables && !code.includes("from 'rxjs'")) {
        return false;
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Valide les exports
   */
  private validateExports(code: string, compressedFile: CompressedFile): boolean {
    try {
      // Vérifier que les scopes publics sont exportés
      for (const scope of compressedFile.scopes) {
        if (scope.type === 'interface' || scope.type === 'class' || scope.type === 'function') {
          // Vérifier que le scope est exporté
          if (!code.includes(`export ${scope.type} ${scope.name}`) && 
              !code.includes(`export interface ${scope.name}`) &&
              !code.includes(`export class ${scope.name}`) &&
              !code.includes(`export function ${scope.name}`)) {
            return false;
          }
        }
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Valide les types (simulation)
   */
  private validateTypes(code: string): boolean {
    try {
      // Vérifications basiques de types
      return code.includes(':') && code.includes('string') && code.includes('number');
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Valide la compilation (simulation)
   */
  private validateCompilation(code: string): boolean {
    try {
      // Vérifications basiques de compilation
      return code.length > 100 && code.includes('export');
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Calcule les métadonnées de régénération
   */
  private calculateRegenerationMetadata(
    compressedFile: CompressedFile, 
    regeneratedCode: string, 
    regenerationTime: number
  ): RegenerationMetadata {
    const regeneratedLines = regeneratedCode.split('\n').length;
    const regeneratedScopes = compressedFile.scopes.length;
    
    // Calculer le score de fidélité (simulation)
    const fidelityScore = Math.min(100, (regeneratedScopes / compressedFile.metadata.totalScopes) * 100);
    
    // Calculer le score de qualité (simulation)
    const qualityScore = Math.min(100, (regeneratedLines / compressedFile.metadata.totalLines) * 100);

    return {
      originalPath: compressedFile.metadata.originalPath,
      regeneratedAt: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
      regenerationTime,
      originalLines: compressedFile.metadata.totalLines,
      regeneratedLines,
      originalScopes: compressedFile.metadata.totalScopes,
      regeneratedScopes,
      compressionRatio: compressedFile.metadata.compressionRatio,
      fidelityScore: Math.round(fidelityScore * 10) / 10,
      qualityScore: Math.round(qualityScore * 10) / 10
    };
  }

  /**
   * Sauvegarde le fichier régénéré
   */
  async saveRegeneratedFile(
    result: RegenerationResult, 
    outputDir?: string
  ): Promise<string> {
    const timestamp = new Date().toLocaleString('fr-FR', { 
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/[\/\s:]/g, '-');
    const fileName = path.basename(result.metadata.originalPath, path.extname(result.metadata.originalPath));
    const defaultOutputDir = path.join(process.cwd(), 'artefacts', 'Reports', 'CodeInsight', 'regenerated_files');
    const finalOutputDir = outputDir || defaultOutputDir;

    // Créer le dossier
    if (!fs.existsSync(finalOutputDir)) {
      fs.mkdirSync(finalOutputDir, { recursive: true });
    }

    // Sauvegarder le fichier TypeScript régénéré
    const tsPath = path.join(finalOutputDir, `${fileName}_regenerated_${timestamp}.ts`);
    fs.writeFileSync(tsPath, result.regeneratedCode, 'utf-8');

    // Sauvegarder le rapport de régénération
    const reportPath = path.join(finalOutputDir, `${fileName}_regeneration_report_${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`📄 Fichier régénéré sauvegardé:`);
    console.log(`   TypeScript: ${tsPath}`);
    console.log(`   Rapport: ${reportPath}`);

    return tsPath;
  }
}