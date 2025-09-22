/**
 * LLMResponseParser - Parser générique pour les réponses LLM
 * 
 * Fonctionnalités :
 * - Lexer/parser pour extraire les structures des réponses LLM
 * - Support des blocs markdown (```json, ```code, etc.)
 * - Détection automatique des formats
 * - Nettoyage intelligent du contenu
 * - Historique des formats pour détecter les inconsistances
 */

export interface ParsedBlock {
  type: string;
  content: string;
  start: number;
  end: number;
  language?: string;
  metadata?: Record<string, any>;
}

export interface ParseResult {
  success: boolean;
  blocks: ParsedBlock[];
  dominantFormat: string;
  formatConsistency: number;
  errors?: string[];
}

export interface FormatHistory {
  timestamp: string;
  format: string;
  success: boolean;
  blockCount: number;
  dominantType: string;
}

export class LLMResponseParser {
  private formatHistory: FormatHistory[] = [];
  private maxHistorySize: number = 100;

  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Parse une réponse LLM et extrait toutes les structures
   */
  parseResponse(text: string): ParseResult {
    try {
      console.log('🔍 Parsing de la réponse LLM...');
      
      // Détecter le format dominant
      const format = this.detectFormat(text);
      console.log(`📋 Format détecté: ${format}`);
      
      // Extraire les blocs
      const blocks = this.extractBlocks(text);
      console.log(`📦 ${blocks.length} blocs trouvés`);
      
      // Analyser la cohérence
      const consistency = this.calculateFormatConsistency(blocks);
      
      // Enregistrer dans l'historique
      this.recordFormatUsage(format, true, blocks.length, this.getDominantBlockType(blocks));
      
      return {
        success: true,
        blocks,
        dominantFormat: format,
        formatConsistency: consistency
      };

    } catch (error) {
      console.error('❌ Erreur parsing réponse LLM:', error);
      
      // Enregistrer l'échec
      this.recordFormatUsage('unknown', false, 0, 'none');
      
      return {
        success: false,
        blocks: [],
        dominantFormat: 'unknown',
        formatConsistency: 0,
        errors: [error.toString()]
      };
    }
  }

  /**
   * Extrait un bloc JSON spécifique d'une réponse
   */
  extractJSONBlock(text: string): string | null {
    const result = this.parseResponse(text);
    
    if (!result.success) return null;
    
    // Chercher le premier bloc JSON
    const jsonBlock = result.blocks.find(block => 
      block.type === 'json' || this.looksLikeJSON(block.content)
    );
    
    if (!jsonBlock) return null;
    
    console.log(`📋 Bloc trouvé: ${jsonBlock.language} (${jsonBlock.type})`);
    return this.cleanJSONContent(jsonBlock.content);
  }

  /**
   * Extrait un bloc avec sa langue spécifiée
   */
  extractBlockByLanguage(text: string, language: string): { content: string; type: string } | null {
    const result = this.parseResponse(text);
    
    if (!result.success) return null;
    
    // Chercher le premier bloc avec la langue spécifiée
    const block = result.blocks.find(b => b.language === language);
    
    if (!block) return null;
    
    console.log(`📋 Bloc ${language} trouvé: ${block.type}`);
    return {
      content: this.cleanContent(block.content, block.type),
      type: block.type
    };
  }

  /**
   * Extrait tous les blocs d'un type spécifique
   */
  extractBlocksByType(text: string, type: string): ParsedBlock[] {
    const result = this.parseResponse(text);
    
    if (!result.success) return [];
    
    return result.blocks.filter(block => block.type === type);
  }

  /**
   * Détecte le format dominant de la réponse
   */
  private detectFormat(text: string): string {
    const hasMarkdown = text.includes('```');
    const hasDirectJSON = text.trim().startsWith('{') && text.trim().endsWith('}');
    const hasXML = text.includes('<') && text.includes('>');
    const hasYAML = text.includes('---') || text.includes(':');
    
    if (hasMarkdown) return 'markdown';
    if (hasDirectJSON) return 'json';
    if (hasXML) return 'xml';
    if (hasYAML) return 'yaml';
    
    return 'text';
  }

  /**
   * Extrait tous les blocs de la réponse
   */
  private extractBlocks(text: string): ParsedBlock[] {
    const blocks: ParsedBlock[] = [];
    
    // Extraire les blocs markdown
    const markdownBlocks = this.extractMarkdownBlocks(text);
    blocks.push(...markdownBlocks);
    
    // Si pas de blocs markdown, traiter comme un bloc unique
    if (blocks.length === 0) {
      blocks.push({
        type: this.detectBlockType(text),
        content: text.trim(),
        start: 0,
        end: text.length
      });
    }
    
    return blocks;
  }

  /**
   * Extrait les blocs markdown avec lexer intelligent (fence-aware)
   */
  private extractMarkdownBlocks(text: string): ParsedBlock[] {
    const blocks: ParsedBlock[] = [];
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    
    let i = 0;
    while (i < lines.length) {
      const fenceInfo = this.detectFence(lines[i]);
      if (!fenceInfo) { i++; continue; }
      
      const { char, len, info } = fenceInfo;
      const closingPattern = new RegExp(`^${char.repeat(len)}\\s*$`);
      
      const contentLines: string[] = [];
      i++; // Passer après la ligne d'ouverture
      
      // Collecter le contenu jusqu'à la fermeture
      while (i < lines.length && !closingPattern.test(lines[i])) {
        contentLines.push(lines[i]);
        i++;
      }
      
      const content = contentLines.join('\n');
      const { type, language } = this.analyzeBlock(`\`\`\`${info}`, content);
      
      blocks.push({
        type,
        content,
        start: i - contentLines.length - 1,
        end: i,
        language,
        metadata: {
          originalLength: content.length,
          hasNewlines: content.includes('\n'),
          complexity: this.calculateComplexity(content),
          fenceChar: char,
          fenceLength: len
        }
      });
      
      // Passer après la ligne de fermeture
      if (i < lines.length && closingPattern.test(lines[i])) i++;
    }
    
    return blocks;
  }

  /**
   * Détecte si une ligne est un fence Markdown
   */
  private detectFence(line: string): { char: '`' | '~'; len: number; info: string } | null {
    const match = line.match(/^([`~]{3,})([^\n\r]*)$/);
    if (!match) return null;
    
    const fence = match[1];
    const info = (match[2] || '').trim();
    const char = fence[0] as '`' | '~';
    const len = fence.length;
    
    return { char, len, info };
  }

  /**
   * Analyse un bloc markdown pour déterminer son type et sa langue
   */
  private analyzeBlock(fullBlock: string, content: string): { type: string; language: string } {
    // Extraire la langue du bloc (```json, ```typescript, etc.)
    const languageMatch = fullBlock.match(/^```(\w+)/);
    const language = languageMatch ? languageMatch[1] : 'unknown';
    
    // NE PAS nettoyer le contenu - garder l'info de la langue !
    // Le contenu peut contenir "json" au début, c'est normal
    
    // Déterminer le type basé sur la langue et le contenu
    let type = 'text';
    
    if (language === 'json' || this.looksLikeJSON(content)) {
      type = 'json';
    } else if (language === 'typescript' || language === 'ts' || this.looksLikeTypeScript(content)) {
      type = 'typescript';
    } else if (language === 'javascript' || language === 'js' || this.looksLikeJavaScript(content)) {
      type = 'javascript';
    } else if (language === 'python' || language === 'py' || this.looksLikePython(content)) {
      type = 'python';
    } else if (language === 'yaml' || language === 'yml' || this.looksLikeYAML(content)) {
      type = 'yaml';
    } else if (language === 'xml' || this.looksLikeXML(content)) {
      type = 'xml';
    } else if (this.looksLikeCode(content)) {
      type = 'code';
    }
    
    console.log(`🔍 Bloc analysé: langue="${language}", type="${type}"`);
    return { type, language };
  }

  /**
   * Détecte le type d'un bloc de texte
   */
  private detectBlockType(text: string): string {
    if (this.looksLikeJSON(text)) return 'json';
    if (this.looksLikeTypeScript(text)) return 'typescript';
    if (this.looksLikeJavaScript(text)) return 'javascript';
    if (this.looksLikePython(text)) return 'python';
    if (this.looksLikeYAML(text)) return 'yaml';
    if (this.looksLikeXML(text)) return 'xml';
    if (this.looksLikeCode(text)) return 'code';
    
    return 'text';
  }

  /**
   * Vérifie si le contenu ressemble à du JSON
   */
  private looksLikeJSON(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.startsWith('{') && trimmed.includes('}') && trimmed.includes('"');
  }

  /**
   * Vérifie si le contenu ressemble à du TypeScript
   */
  private looksLikeTypeScript(content: string): boolean {
    return content.includes('interface ') || content.includes('type ') || 
           content.includes(': string') || content.includes(': number');
  }

  /**
   * Vérifie si le contenu ressemble à du JavaScript
   */
  private looksLikeJavaScript(content: string): boolean {
    return content.includes('function') || content.includes('const ') || 
           content.includes('let ') || content.includes('var ');
  }

  /**
   * Vérifie si le contenu ressemble à du Python
   */
  private looksLikePython(content: string): boolean {
    return content.includes('def ') || content.includes('import ') || 
           content.includes('class ') || content.includes('if __name__');
  }

  /**
   * Vérifie si le contenu ressemble à du YAML
   */
  private looksLikeYAML(content: string): boolean {
    return content.includes(':') && (content.includes('---') || 
           content.split('\n').some(line => line.includes(':') && !line.includes('=')));
  }

  /**
   * Vérifie si le contenu ressemble à du XML
   */
  private looksLikeXML(content: string): boolean {
    return content.includes('<') && content.includes('>') && 
           (content.includes('<?xml') || content.includes('</'));
  }

  /**
   * Vérifie si le contenu ressemble à du code
   */
  private looksLikeCode(content: string): boolean {
    return content.includes('function') || content.includes('class') || 
           content.includes('import') || content.includes('export');
  }

  /**
   * Nettoie le contenu selon son type
   */
  private cleanContent(content: string, type: string): string {
    switch (type) {
      case 'json':
        return this.cleanJSONContent(content);
      case 'typescript':
      case 'javascript':
        return this.cleanCodeContent(content);
      case 'yaml':
        return this.cleanYAMLContent(content);
      case 'xml':
        return this.cleanXMLContent(content);
      default:
        return content.trim();
    }
  }

  /**
   * Nettoie le contenu JSON
   */
  private cleanJSONContent(jsonContent: string): string {
    console.log('🧹 Nettoyage du contenu JSON...');
    
    // Enlever "json" au début si présent (mais garder l'info dans la langue)
    let cleaned = jsonContent.replace(/^json\s*\n?/i, '').trim();
    
    // 🔧 MOCK: Nettoyage des caractères de contrôle avec regex
    // PROBLÈME: Regex ne gère pas tous les cas de caractères de contrôle
    // POURQUOI C'EST UN MOCK: Solution fragile et incomplète
    // CE QUI MANQUE:
    //   - Parser JSON qui gère nativement les caractères de contrôle
    //   - Normalisation Unicode appropriée
    //   - Gestion des encodages multiples
    cleaned = cleaned
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // 🔧 MOCK: Remplacer caractères de contrôle par espaces
      .replace(/\r\n/g, '\n') // Normaliser les retours à la ligne
      .replace(/\r/g, '\n') // Normaliser les retours chariot
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' '); // 🔧 MOCK: Nettoyer caractères Unicode de contrôle
    
    // 🔧 MOCK: Parser le JSON en gérant les backticks dans les chaînes avec regex
    // PROBLÈME: Regex ne peut pas parser du JSON correctement
    // POURQUOI C'EST UN MOCK: Solution fragile et incomplète
    // CE QUI MANQUE:
    //   - Parser JSON professionnel
    //   - Gestion des chaînes complexes
    //   - Validation de la syntaxe JSON
    const stringRegex = /"([^"\\]|\\.)*"/g; // 🔧 MOCK: Regex pour les chaînes JSON
    cleaned = cleaned.replace(stringRegex, (match) => {
      // Remplacer les backticks par des espaces dans le contenu de la chaîne
      const content = match.slice(1, -1); // Enlever les guillemets
      const cleanedContent = content
        .replace(/`/g, ' ')  // 🔧 MOCK: Remplacer backticks par espaces
        .replace(/\\"/g, '"') // 🔧 MOCK: Décoder les guillemets échappés
        .replace(/\\n/g, '\n') // 🔧 MOCK: Décoder les retours à la ligne
        .replace(/\\t/g, '\t') // 🔧 MOCK: Décoder les tabulations
        .replace(/\\r/g, '\r') // 🔧 MOCK: Décoder les retours chariot
        .replace(/\\b/g, '\b') // 🔧 MOCK: Décoder les backspaces
        .replace(/\\f/g, '\f') // 🔧 MOCK: Décoder les form feeds
        .replace(/\\\\/g, '\\') // 🔧 MOCK: Décoder les backslashes
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // 🔧 MOCK: Nettoyer caractères de contrôle
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' '); // 🔧 MOCK: Nettoyer caractères Unicode de contrôle
      return `"${cleanedContent}"`;
    });
    
    console.log('✅ Contenu JSON nettoyé');
    return cleaned;
  }

  /**
   * Nettoie le contenu de code
   */
  private cleanCodeContent(content: string): string {
    // Pour le code, on garde tout tel quel
    return content.trim();
  }

  /**
   * Nettoie le contenu YAML
   */
  private cleanYAMLContent(content: string): string {
    return content.trim();
  }

  /**
   * Nettoie le contenu XML
   */
  private cleanXMLContent(content: string): string {
    return content.trim();
  }

  /**
   * Calcule la complexité d'un bloc
   */
  private calculateComplexity(content: string): number {
    const lines = content.split('\n').length;
    const chars = content.length;
    const specialChars = (content.match(/[{}[\]();]/g) || []).length;
    
    return Math.min(10, Math.floor(lines / 10) + Math.floor(chars / 100) + Math.floor(specialChars / 5));
  }

  /**
   * Calcule la cohérence des formats
   */
  private calculateFormatConsistency(blocks: ParsedBlock[]): number {
    if (blocks.length === 0) return 1.0;
    
    const typeCounts = blocks.reduce((acc, block) => {
      acc[block.type] = (acc[block.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const dominantType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    if (!dominantType) return 0.0;
    
    return typeCounts[dominantType] / blocks.length;
  }

  /**
   * Obtient le type de bloc dominant
   */
  private getDominantBlockType(blocks: ParsedBlock[]): string {
    if (blocks.length === 0) return 'none';
    
    const typeCounts = blocks.reduce((acc, block) => {
      acc[block.type] = (acc[block.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
  }

  /**
   * Enregistre l'usage d'un format
   */
  private recordFormatUsage(format: string, success: boolean, blockCount: number, dominantType: string): void {
    this.formatHistory.push({
      timestamp: new Date().toISOString(),
      format,
      success,
      blockCount,
      dominantType
    });
    
    // Garder seulement les N derniers enregistrements
    if (this.formatHistory.length > this.maxHistorySize) {
      this.formatHistory = this.formatHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Détecte les inconsistances dans les formats
   */
  detectFormatInconsistencies(): {
    isInconsistent: boolean;
    dominantFormat: string;
    inconsistencyRate: number;
    suggestions: string[];
  } {
    if (this.formatHistory.length < 3) {
      return {
        isInconsistent: false,
        dominantFormat: 'unknown',
        inconsistencyRate: 0,
        suggestions: []
      };
    }

    const recentHistory = this.formatHistory.slice(-10); // 10 derniers appels
    const formatCounts = recentHistory.reduce((acc, entry) => {
      acc[entry.format] = (acc[entry.format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dominantFormat = Object.entries(formatCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
    
    const inconsistencyRate = 1 - (formatCounts[dominantFormat] / recentHistory.length);
    const isInconsistent = inconsistencyRate > 0.3; // Plus de 30% d'inconsistance

    const suggestions: string[] = [];
    if (isInconsistent) {
      suggestions.push(`Le LLM utilise ${Object.keys(formatCounts).length} formats différents`);
      suggestions.push(`Format dominant: ${dominantFormat} (${formatCounts[dominantFormat]}/${recentHistory.length})`);
      suggestions.push('Considérer des instructions plus spécifiques pour le format de réponse');
    }

    return {
      isInconsistent,
      dominantFormat,
      inconsistencyRate,
      suggestions
    };
  }

  /**
   * Obtient les statistiques du parser
   */
  getStats(): {
    totalParses: number;
    successRate: number;
    formatInconsistency: ReturnType<typeof this.detectFormatInconsistencies>;
    averageBlockCount: number;
    mostCommonFormat: string;
  } {
    const totalParses = this.formatHistory.length;
    const successfulParses = this.formatHistory.filter(h => h.success).length;
    const successRate = totalParses > 0 ? successfulParses / totalParses : 0;
    
    const averageBlockCount = totalParses > 0 ? 
      this.formatHistory.reduce((sum, h) => sum + h.blockCount, 0) / totalParses : 0;
    
    const formatCounts = this.formatHistory.reduce((acc, h) => {
      acc[h.format] = (acc[h.format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonFormat = Object.entries(formatCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
    
    return {
      totalParses,
      successRate,
      formatInconsistency: this.detectFormatInconsistencies(),
      averageBlockCount,
      mostCommonFormat
    };
  }

  /**
   * Réinitialise l'historique
   */
  resetHistory(): void {
    this.formatHistory = [];
  }
}