import { CompressedFile } from './FileCompressor';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

/**
 * Résultat de la régénération V2 avec explications
 */
export interface RegenerationResultV2 {
  success: boolean;
  regeneratedCode: string;
  explanations: {
    improvements: string[];
    exports: string[];
    architecture: string[];
  };
  suggestions: string[];
  validation: ValidationResult;
  metadata: RegenerationMetadata;
  errors: string[];
  warnings: string[];
}

/**
 * Métadonnées de régénération
 */
export interface RegenerationMetadata {
  originalPath: string;
  regeneratedAt: string;
  regenerationTime: number;
  originalLines: number;
  regeneratedLines: number;
  originalScopes: number;
  regeneratedScopes: number;
  compressionRatio: number;
  fidelityScore: number;
  qualityScore: number;
}

/**
 * Résultat de validation
 */
export interface ValidationResult {
  syntaxValid: boolean;
  typeValid: boolean;
  compilationValid: boolean;
  structureValid: boolean;
  importsValid: boolean;
  exportsValid: boolean;
  overallScore: number;
}

/**
 * FileRegenerator V2 - Approche naturelle avec explications
 */
export class FileRegeneratorV2 {
  private useRealLLM: boolean;
  private llmCalls: number;

  constructor() {
    this.useRealLLM = !!process.env.GEMINI_API_KEY;
    this.llmCalls = 0;
    
    console.log('🔄 FileRegeneratorV2 initialisé');
    console.log(`🧠 Mode LLM: ${this.useRealLLM ? 'Vrais appels LLM' : 'Mode heuristique'}`);
  }

  /**
   * Régénère un fichier complet à partir des données compressées (V2)
   */
  async regenerateFile(compressedFile: CompressedFile): Promise<RegenerationResultV2> {
    const startTime = Date.now();
    console.log(`🔄 Régénération V2 du fichier: ${compressedFile.metadata.fileName}`);

    try {
      // 1. Générer le code TypeScript avec explications
      console.log('📝 Génération du code TypeScript avec explications...');
      const regenerationResult = await this.generateTypeScriptCodeWithExplanations(compressedFile);
      console.log(`✅ Code généré: ${regenerationResult.code.split('\n').length} lignes`);
      console.log(`📋 Explications: ${regenerationResult.explanations.improvements.length} améliorations`);

      // 2. Valider le code généré
      console.log('🔍 Validation du code...');
      const validation = await this.validateGeneratedCode(regenerationResult.code, compressedFile);
      console.log(`✅ Validation terminée: Score ${validation.overallScore}/100`);

      // 3. Calculer les métadonnées
      const endTime = Date.now();
      const regenerationTime = endTime - startTime;
      const metadata = this.calculateRegenerationMetadata(compressedFile, regenerationResult.code, regenerationTime);

      // 4. Déterminer le succès
      const success = validation.overallScore >= 70;
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

      console.log(`✅ Régénération V2 terminée: ${success ? 'SUCCÈS' : 'ÉCHEC'}`);
      console.log(`   Score: ${validation.overallScore}/100`);
      console.log(`   Erreurs: ${errors.length}`);
      console.log(`   Avertissements: ${warnings.length}`);

      return {
        success,
        regeneratedCode: regenerationResult.code,
        explanations: regenerationResult.explanations,
        suggestions: regenerationResult.suggestions,
        validation,
        metadata,
        errors,
        warnings
      };

    } catch (error) {
      console.error(`❌ Erreur régénération V2 fichier ${compressedFile.metadata.fileName}:`, error);
      
      const endTime = Date.now();
      const regenerationTime = endTime - startTime;
      
      return {
        success: false,
        regeneratedCode: '',
        explanations: {
          improvements: [],
          exports: [],
          architecture: []
        },
        suggestions: [],
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
          regeneratedAt: new Date().toISOString(),
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
   * Génère le code TypeScript avec explications (V2)
   */
  private async generateTypeScriptCodeWithExplanations(compressedFile: CompressedFile): Promise<{
    code: string;
    explanations: {
      improvements: string[];
      exports: string[];
      architecture: string[];
    };
    suggestions: string[];
  }> {
    if (!this.useRealLLM) {
      throw new Error('❌ GEMINI_API_KEY manquante - Le FileRegeneratorV2 nécessite un appel LLM');
    }

    // Mode LLM obligatoire avec approche naturelle
    const regenerationPrompt = this.buildNaturalRegenerationPrompt(compressedFile);
    
    try {
      console.log('🧠 Appel LLM pour régénération naturelle...');
      const response = await this.callLLM(regenerationPrompt);
      this.llmCalls++;

      console.log('🔍 Parsing intelligent de la réponse...');
      const result = this.parseIntelligentResponse(response);
      
      console.log(`✅ Code régénéré: ${result.code.split('\n').length} lignes`);
      console.log(`📋 Explications capturées: ${result.explanations.improvements.length} améliorations`);
      return result;

    } catch (error) {
      console.error('❌ Erreur régénération LLM V2:', error);
      throw new Error(`Échec de la régénération LLM V2: ${error}`);
    }
  }

  /**
   * Construit un prompt naturel pour la régénération (V2)
   */
  private buildNaturalRegenerationPrompt(compressedFile: CompressedFile): string {
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
- **Tests suggérés:** ${scope.testIdeas.join('; ')}`;
    }).join('\n\n');

    return `Tu es un expert en génération de code TypeScript. Je vais te demander de régénérer un fichier complet à partir d'une analyse compressée, en appliquant les bonnes pratiques et en expliquant tes choix.

CONTEXTE DU FICHIER:
- **Fichier:** ${metadata.fileName}
- **Type:** ${metadata.fileType}
- **Architecture:** ${summary.architecture}
- **But global:** ${summary.purpose}
- **Patterns:** ${summary.mainPatterns.join(', ')}
- **Dépendances clés:** ${summary.keyDependencies.join(', ')}

SCOPES À RÉGÉNÉRER:
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

TA MISSION:
Régénère le code TypeScript complet en appliquant les bonnes pratiques modernes. Pense aux exports appropriés, à la gestion d'erreurs, à la documentation, et aux améliorations suggérées par l'analyse.

RÉPONDS DANS CE FORMAT XML:

<regeneration>
  <code>
    // Ton code TypeScript complet ici
  </code>
  <explanations>
    <improvements>
      <improvement>Explication de chaque amélioration apportée</improvement>
    </improvements>
    <exports>
      <export>Explication des choix d'export</export>
    </exports>
    <architecture>
      <decision>Explication des décisions architecturales</decision>
    </architecture>
  </explanations>
  <suggestions>
    <suggestion>Suggestion pour l'agentique future</suggestion>
  </suggestions>
</regeneration>`;
  }

  /**
   * Parse intelligent de la réponse XML (V2)
   */
  private parseIntelligentResponse(response: string): {
    code: string;
    explanations: {
      improvements: string[];
      exports: string[];
      architecture: string[];
    };
    suggestions: string[];
  } {
    try {
      // Nettoyer la réponse
      let cleanResponse = response.trim();
      
      // Supprimer les markdown fences si présents
      cleanResponse = cleanResponse.replace(/```xml\n?/g, '').replace(/```\n?/g, '');
      
      // Parser le XML avec LuciformXMLParser
      const { LuciformXMLParser } = require('../llm/LuciformXMLParser');
      const parser = new LuciformXMLParser(cleanResponse, {
        maxDepth: 50,
        maxTextLength: 100000,
        entityExpansionLimit: 1000,
        allowDTD: false,
        maxAttrCount: 100,
        maxAttrValueLength: 10000,
        maxCommentLength: 10000,
        maxPILength: 1000,
        useUnicodeNames: true
      });
      const parseResult = parser.parse();
      
      if (!parseResult.success) {
        throw new Error(`Erreur parsing XML: ${parseResult.errors.join(', ')}`);
      }
      
      const xmlDoc = parseResult.document;
      
      // Extraire le code
      const codeElement = this.findElement(xmlDoc, 'code');
      const code = codeElement ? this.extractTextContent(codeElement) : '';
      
      // Extraire les explications
      const explanationsElement = this.findElement(xmlDoc, 'explanations');
      const explanations = {
        improvements: this.extractArrayContent(explanationsElement, 'improvements', 'improvement'),
        exports: this.extractArrayContent(explanationsElement, 'exports', 'export'),
        architecture: this.extractArrayContent(explanationsElement, 'architecture', 'decision')
      };
      
      // Extraire les suggestions
      const suggestionsElement = this.findElement(xmlDoc, 'suggestions');
      const suggestions = this.extractArrayContent(suggestionsElement, 'suggestions', 'suggestion');
      
      return {
        code: code.trim(),
        explanations,
        suggestions
      };
      
    } catch (error) {
      console.error('❌ Erreur parsing intelligent:', error);
      // Fallback vers parsing simple
      return this.parseSimpleResponse(response);
    }
  }

  /**
   * Parse simple en fallback
   */
  private parseSimpleResponse(response: string): {
    code: string;
    explanations: {
      improvements: string[];
      exports: string[];
      architecture: string[];
    };
    suggestions: string[];
  } {
    // Extraire le code entre les balises <code>
    const codeMatch = response.match(/<code>([\s\S]*?)<\/code>/);
    const code = codeMatch ? codeMatch[1].trim() : response.trim();
    
    return {
      code,
      explanations: {
        improvements: ['Parsing simple - explications non capturées'],
        exports: ['Parsing simple - explications non capturées'],
        architecture: ['Parsing simple - explications non capturées']
      },
      suggestions: ['Parsing simple - suggestions non capturées']
    };
  }

  /**
   * Trouve un élément dans le document XML
   */
  private findElement(xmlDoc: any, tagName: string): any {
    if (!xmlDoc || !xmlDoc.children) return null;
    
    for (const child of xmlDoc.children) {
      if (child.name === tagName) {
        return child;
      }
      const found = this.findElement(child, tagName);
      if (found) return found;
    }
    return null;
  }

  /**
   * Extrait le contenu texte d'un élément
   */
  private extractTextContent(element: any): string {
    if (!element) return '';
    
    // Si l'élément a directement du texte
    if (element.text && element.text !== 'undefined') {
      return element.text;
    }
    
    // Si l'élément a du contenu (propriété content du LuciformXMLParser)
    if (element.content && element.content !== 'undefined') {
      return element.content;
    }
    
    // Si l'élément a des enfants, extraire le texte de tous les enfants
    if (element.children) {
      return element.children
        .filter((child: any) => child.type === 'text' && child.content && child.content !== 'undefined')
        .map((child: any) => child.content)
        .join('');
    }
    
    return '';
  }

  /**
   * Extrait le contenu d'un tableau d'éléments
   */
  private extractArrayContent(parent: any, containerTag: string, itemTag: string): string[] {
    if (!parent) return [];
    
    const container = this.findElement(parent, containerTag);
    if (!container || !container.children) return [];
    
    return container.children
      .filter((child: any) => child.name === itemTag)
      .map((child: any) => this.extractTextContent(child))
      .filter((text: string) => text.trim().length > 0);
  }

  /**
   * Appelle le LLM pour la régénération
   */
  private async callLLM(prompt: string): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Valide le code généré
   */
  private async validateGeneratedCode(code: string, compressedFile: CompressedFile): Promise<ValidationResult> {
    // Validation basique
    const syntaxValid = this.validateSyntax(code);
    const typeValid = this.validateTypes(code);
    const compilationValid = this.validateCompilation(code);
    const structureValid = this.validateStructure(code, compressedFile);
    const importsValid = this.validateImports(code);
    const exportsValid = this.validateExports(code);

    const scores = [syntaxValid, typeValid, compilationValid, structureValid, importsValid, exportsValid];
    const overallScore = Math.round((scores.filter(Boolean).length / scores.length) * 100);

    return {
      syntaxValid,
      typeValid,
      compilationValid,
      structureValid,
      importsValid,
      exportsValid,
      overallScore
    };
  }

  /**
   * Valide la syntaxe TypeScript
   */
  private validateSyntax(code: string): boolean {
    try {
      // Validation basique de syntaxe
      const hasValidStructure = code.includes('{') && code.includes('}');
      const hasValidImports = !code.includes('import ') || code.includes('from ');
      const hasValidExports = code.includes('export ');
      
      return hasValidStructure && hasValidImports && hasValidExports;
    } catch {
      return false;
    }
  }

  /**
   * Valide les types
   */
  private validateTypes(code: string): boolean {
    // Validation basique des types
    const hasTypeAnnotations = code.includes(':') && (code.includes('string') || code.includes('number') || code.includes('boolean'));
    const hasValidInterfaces = !code.includes('interface ') || code.includes('{');
    
    return hasTypeAnnotations && hasValidInterfaces;
  }

  /**
   * Valide la compilation
   */
  private validateCompilation(code: string): boolean {
    // Validation basique de compilation
    const hasValidBrackets = (code.match(/\{/g) || []).length === (code.match(/\}/g) || []).length;
    const hasValidParens = (code.match(/\(/g) || []).length === (code.match(/\)/g) || []).length;
    
    return hasValidBrackets && hasValidParens;
  }

  /**
   * Valide la structure
   */
  private validateStructure(code: string, compressedFile: CompressedFile): boolean {
    // Vérifier que les scopes principaux sont présents
    const expectedScopes = compressedFile.scopes.map(scope => scope.name);
    const foundScopes = expectedScopes.filter(scopeName => code.includes(scopeName));
    
    return foundScopes.length >= expectedScopes.length * 0.8; // 80% des scopes trouvés
  }

  /**
   * Valide les imports
   */
  private validateImports(code: string): boolean {
    // Vérifier les imports Angular/RxJS si présents
    if (code.includes('@Injectable') && !code.includes("import { Injectable }")) {
      return false;
    }
    if (code.includes('Observable') && !code.includes("import { Observable }")) {
      return false;
    }
    
    return true;
  }

  /**
   * Valide les exports
   */
  private validateExports(code: string): boolean {
    // Vérifier qu'il y a des exports
    const hasExports = code.includes('export ');
    const hasValidExports = code.includes('export interface') || code.includes('export class') || code.includes('export function');
    
    return hasExports && hasValidExports;
  }

  /**
   * Calcule les métadonnées de régénération
   */
  private calculateRegenerationMetadata(
    compressedFile: CompressedFile, 
    regeneratedCode: string, 
    regenerationTime: number
  ): RegenerationMetadata {
    const originalLines = compressedFile.metadata.totalLines;
    const regeneratedLines = regeneratedCode.split('\n').length;
    const originalScopes = compressedFile.metadata.totalScopes;
    const regeneratedScopes = compressedFile.scopes.length;
    
    const compressionRatio = Math.round((1 - regeneratedCode.length / compressedFile.metadata.originalSize) * 100);
    const fidelityScore = Math.round((regeneratedScopes / originalScopes) * 100);
    const qualityScore = Math.round((regeneratedLines / originalLines) * 100);

    return {
      originalPath: compressedFile.metadata.originalPath,
      regeneratedAt: new Date().toISOString(),
      regenerationTime,
      originalLines,
      regeneratedLines,
      originalScopes,
      regeneratedScopes,
      compressionRatio,
      fidelityScore,
      qualityScore
    };
  }

  /**
   * Sauvegarde le fichier régénéré
   */
  async saveRegeneratedFile(
    result: RegenerationResultV2, 
    originalFileName: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = originalFileName.replace(/\.ts$/, '');
    const fileName = `${baseName}_regenerated_v2_${timestamp}.ts`;
    const filePath = `artefacts/Reports/CodeInsight/regenerated_files/${fileName}`;
    
    // Créer le dossier si nécessaire
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Sauvegarder le fichier
    fs.writeFileSync(filePath, result.regeneratedCode);
    
    // Sauvegarder le rapport avec explications
    const reportPath = filePath.replace('.ts', '_regeneration_report_v2.json');
    const report = {
      success: result.success,
      regeneratedCode: result.regeneratedCode,
      explanations: result.explanations,
      suggestions: result.suggestions,
      validation: result.validation,
      metadata: result.metadata,
      errors: result.errors,
      warnings: result.warnings
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Fichier régénéré V2 sauvegardé:`);
    console.log(`   TypeScript: ${filePath}`);
    console.log(`   Rapport: ${reportPath}`);
    
    return filePath;
  }
}