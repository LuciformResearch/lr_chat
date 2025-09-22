/**
 * LuciformXMLParser - Chunk 1/3
 * 
 * Lignes 1 à 500 du parser original
 * 
 * ⚠️ ATTENTION: Ce fichier est un chunk du parser original.
 * Ne pas modifier directement - utiliser le fichier principal.
 */

/**
 * LuciformXMLParser - Parser XML de niveau recherche
 * 
 * Marque de fabrique Luciform Research :
 * - Tokenizer à états robuste
 * - Parser SAX avec mode permissif
 * - Gestion complète des attributs et nœuds spéciaux
 * - Sécurité anti-DoS/XXE
 * - Diagnostics précis (ligne/colonne)
 * - Mode "Luciform-permissif" pour récupération d'erreurs
 * 
 * Note importante : Les attributs xmlns et xmlns:* sont automatiquement retirés
 * de element.attributes car ils sont gérés séparément par le système de namespaces.
 * Cela évite la confusion pour les consommateurs du parseur.
 */

export interface Location {
  line: number;
  column: number; // En code units UTF-16 (pas en code points Unicode)
  position: number;
}

export interface Token {
  type: 'Text' | 'StartTag' | 'EndTag' | 'Comment' | 'PI' | 'CDATA' | 'Doctype';
  content: string;
  location: Location;
  tagName?: string;
  attributes?: Map<string, string>;
  selfClosing?: boolean;
  duplicateAttributes?: string[];
  invalidAttributes?: string[];
  closed?: boolean; // Pour Comment et CDATA - indique si fermé correctement
}

export interface QName {
  localName: string;
  prefix?: string;
  namespace?: string;
}

export interface Attribute {
  name: QName;
  value: string;
  location: Location;
}

export interface Diagnostic {
  level: 'info' | 'warn' | 'error';
  code: string;
  message: string;
  location: Location;
  context?: string;
}

export interface ParseResult {
  success: boolean;
  wellFormed?: boolean; // true si parsing strict sans récupération, false si récupération nécessaire
  recovered?: boolean;
  recoveryCount?: number;
  nodeCount?: number; // Nombre total de nœuds traités
  document?: XMLDocument;
  readonly diagnostics: Diagnostic[];
  readonly errors: Diagnostic[];
}

export class LuciformXMLParser {
  private content: string;
  private diagnostics: Diagnostic[] = [];
  private errors: Diagnostic[] = [];
  private maxDepth: number = 1000;
  private maxTextLength: number = 1024 * 1024; // 1MB
  private entityExpansionLimit: number = 1000;
  private allowDTD: boolean = false;
  private maxAttrCount: number = 4096;
  private maxAttrValueLength: number = 1024 * 1024; // 1MB
  private maxCommentLength: number = 1024 * 1024; // 1MB
  private maxPILength: number = 1024 * 1024; // 1MB
  private useUnicodeNames: boolean = false;

  constructor(content: string, options: {
    maxDepth?: number;
    maxTextLength?: number;
    entityExpansionLimit?: number;
    allowDTD?: boolean;
    maxAttrCount?: number;
    maxAttrValueLength?: number;
    maxCommentLength?: number;
    maxPILength?: number;
    useUnicodeNames?: boolean;
  } = {}) {
    this.content = content;
    this.maxDepth = options.maxDepth || 1000;
    this.maxTextLength = options.maxTextLength || 1024 * 1024;
    this.entityExpansionLimit = options.entityExpansionLimit || 1000;
    this.allowDTD = options.allowDTD || false;
    this.maxAttrCount = options.maxAttrCount || 4096;
    this.maxAttrValueLength = options.maxAttrValueLength || 1024 * 1024;
    this.maxCommentLength = options.maxCommentLength || 1024 * 1024;
    this.maxPILength = options.maxPILength || 1024 * 1024;
    this.useUnicodeNames = options.useUnicodeNames || false;
  }

  /**
   * Parse le XML avec mode Luciform-permissif
   */
  parse(): ParseResult {
    let scanner: LuciformXMLScanner | undefined;
    try {
      scanner = new LuciformXMLScanner(this.content);
      const parser = new LuciformSAXParser(scanner, {
        maxDepth: this.maxDepth,
        maxTextLength: this.maxTextLength,
        entityExpansionLimit: this.entityExpansionLimit,
        allowDTD: this.allowDTD,
        maxAttrCount: this.maxAttrCount,
        maxAttrValueLength: this.maxAttrValueLength,
        maxCommentLength: this.maxCommentLength,
        maxPILength: this.maxPILength,
        useUnicodeNames: this.useUnicodeNames,
        mode: 'luciform-permissive'
      });

      const document = parser.parse();
      this.diagnostics = parser.getDiagnostics();
      this.errors = parser.getErrors();

      const recoveryCount = parser.getRecoveryCount();
      const nodeCount = parser.getNodeCount();
      return {
        success: this.errors.length === 0,
        wellFormed: this.errors.length === 0 && recoveryCount === 0,
        recovered: recoveryCount > 0,
        recoveryCount,
        nodeCount,
        document,
        diagnostics: Object.freeze([...this.diagnostics]),
        errors: Object.freeze([...this.errors])
      };

    } catch (error) {
      const loc = scanner ? scanner.getCurrentLocation() : {line: 0, column: 0, position: 0};
      this.addError('PARSE_ERROR', `Erreur de parsing: ${error}`, loc);
      return {
        success: false,
        wellFormed: false,
        diagnostics: Object.freeze([...this.diagnostics]),
        errors: Object.freeze([...this.errors])
      };
    }
  }


  private addError(code: string, message: string, location: Location): void {
    this.errors.push({
      level: 'error',
      code,
      message,
      location
    });
  }
}

/**
 * Scanner XML à états - Tokenizer robuste
 */
class LuciformXMLScanner {
  private content: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private state: ScannerState = 'Text';

  constructor(content: string) {
    // Gérer le BOM au début
    if (content.startsWith('\uFEFF')) {
      this.content = content.slice(1);
    } else {
      this.content = content;
    }
  }

  /**
   * Token suivant avec gestion d'états
   */
  next(): Token | null {
    if (this.position >= this.content.length) {
      return null;
    }

    switch (this.state) {
      case 'Text':
        return this.scanText();
      case 'TagOpen':
        return this.scanTag();
      case 'Comment':
        return this.scanComment();
      case 'PI':
        return this.scanProcessingInstruction();
      case 'CDATA':
        return this.scanCDATA();
      case 'Doctype':
        return this.scanDoctype();
      default:
        return this.scanText();
    }
  }

  private scanText(): Token {
    const startLocation = this.getCurrentLocation();
    const start = this.position;

    while (this.position < this.content.length) {
      const char = this.content[this.position];

      if (char === '<') {
        // Vérifier si c'est le début d'une section spéciale
        const nextChars = this.content.substring(this.position, this.position + 9);
        
        if (nextChars.startsWith('<!--')) {
          this.state = 'Comment';
          break;
        } else if (nextChars.startsWith('<?xml') || nextChars.startsWith('<?')) {
          this.state = 'PI';
          break;
        } else if (nextChars.startsWith('<![CDATA[')) {
          this.state = 'CDATA';
          break;
        } else if (nextChars.startsWith('<!DOCTYPE')) {
          this.state = 'Doctype';
          break;
        } else {
          this.state = 'TagOpen';
          break;
        }
      }

      this.advance();
    }

    if (this.position > start) {
      return {
        type: 'Text',
        content: this.content.substring(start, this.position), // Préserver les espaces significatifs
        location: startLocation
      };
    }

    // Si pas de contenu, continuer avec le prochain token
    return this.next();
  }

  private scanTag(): Token {
    const startLocation = this.getCurrentLocation();
    this.advance(); // '<'

    let tagContent = '';
    let inQuote = false;
    let quoteChar: '"' | "'" | null = null;

    while (this.position < this.content.length) {
      const ch = this.content[this.position];

      if (!inQuote && ch === '>') {
        this.advance(); // consume '>'
        break;
      }

      if (ch === '"' || ch === "'") {
        if (!inQuote) { 
          inQuote = true; 
          quoteChar = ch as any; 
        } else if (quoteChar === ch) { 
          inQuote = false; 
          quoteChar = null; 
        }
        tagContent += ch;
        this.advance();
        continue;
      }

      tagContent += ch;
      this.advance();
    }

    this.state = 'Text';

    // End tag ?
    if (tagContent.startsWith('/')) {
      const tagName = tagContent.slice(1).trim();
      return { 
        type: 'EndTag', 
        content: tagContent, 
        location: startLocation, 
        tagName 
      };
    }

    const { name, attributes, selfClosing, duplicateAttributes, invalidAttributes } = this.parseTagContentQuoteAware(tagContent);
    return {
      type: 'StartTag',
      content: tagContent,
      location: startLocation,
      tagName: name,
      attributes,
      selfClosing,
      duplicateAttributes,
      invalidAttributes
    };
  }

  private scanComment(): Token {
    const startLocation = this.getCurrentLocation();
    
    // Passer '<!--'
    this.advance(4);
    const startData = this.position; // juste après "<!--"

    let closed = false;
    while (this.position < this.content.length - 2) {
      if (this.content.substring(this.position, this.position + 3) === '-->') {
        this.advance(3);
        closed = true;
        break;
      }
      
      // Vérifier les commentaires invalides avec --
      if (this.content.substring(this.position, this.position + 2) === '--') {
        // XML interdit -- dans le contenu des commentaires
        // On va signaler cela via un callback ou diagnostic
        // Pour l'instant on continue mais on pourrait ajouter un diagnostic
      }
      
      this.advance();
    }

    // Si non fermé, consommer jusqu'à EOF
    if (!closed) {
      this.position = this.content.length;
    }

    this.state = 'Text';

    const end = closed ? this.position - 3 : this.position;
    const content = this.content.slice(startData, end);

    return {
      type: 'Comment',
      content,
      location: startLocation,
      closed
    };
  }

  private scanProcessingInstruction(): Token {
    const startLocation = this.getCurrentLocation();
    
    // Passer '<?'
    this.advance(2);
    let content = '';
    let closed = false;

    while (this.position < this.content.length - 1) {
      if (this.content.substring(this.position, this.position + 2) === '?>') {
        this.advance(2);
        closed = true;
        break;
      }
      content += this.content[this.position];
      this.advance();
    }

    // Si non fermée, consommer jusqu'à EOF
    if (!closed) {
      this.position = this.content.length;
    }

    this.state = 'Text';

    return {
      type: 'PI',
      content,
      location: startLocation,
      closed
    };
  }

  private scanCDATA(): Token {
    const startLocation = this.getCurrentLocation();
    
    // Passer '<![CDATA['
    this.advance(9);
    const startData = this.position; // juste après "<![CDATA["

    let closed = false;
    while (this.position < this.content.length - 2) {
      if (this.content.substring(this.position, this.position + 3) === ']]>') {
        this.advance(3);
        closed = true;
        break;
      }
      this.advance();
    }

    // Si non fermé, consommer jusqu'à EOF
    if (!closed) {
      this.position = this.content.length;
    }

    this.state = 'Text';

    const end = closed ? this.position - 3 : this.position;
    const content = this.content.slice(startData, end);

    return {
      type: 'CDATA',
      content,
      location: startLocation,
      closed
    };
  }

  private scanDoctype(): Token {
    const startLocation = this.getCurrentLocation();
    this.advance(9); // '<!DOCTYPE'
    let content = '';
    let inQuote = false;
    let quote: '"' | "'" | null = null;
    let bracketDepth = 0;
    let closed = false;

    while (this.position < this.content.length) {
      const ch = this.content[this.position];
      if ((ch === '"' || ch === "'")) {
        if (!inQuote) { 
          inQuote = true; 
          quote = ch as any; 
        } else if (quote === ch) { 
          inQuote = false; 
          quote = null; 
        }
        content += ch; 
        this.advance(); 
        continue;
      }
      if (!inQuote) {
        if (ch === '[') bracketDepth++;
        else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
        else if (ch === '>' && bracketDepth === 0) { 
          this.advance(); 
          closed = true;
          break; 
        }
      }
      content += ch; 
      this.advance();
    }

    // Si non fermé, consommer jusqu'à EOF
    if (!closed) {
      this.position = this.content.length;
    }

    this.state = 'Text';
    return { 
      type: 'Doctype', 
      content, 
      location: startLocation,
      closed
    } as any;
  }

  private parseTagContentQuoteAware(tagContent: string): {
    name: string; 
    attributes: Map<string,string>; 
    selfClosing: boolean;
    duplicateAttributes: string[];
    invalidAttributes: string[];
  } {
    // Détecter '/>' hors quotes
    let selfClosing = false;
    let src = tagContent.trim();
    
    // Supprime un '/>' final s'il existe (en vérifiant hors quotes au scanTag)
    if (src.endsWith('/')) { 
      selfClosing = true; 
      src = src.slice(0, -1).trimEnd(); 
    }

    // Extraire name
    let i = 0;
    while (i < src.length && !/\s/.test(src[i])) i++;
    const name = src.slice(0, i);
    const attributes = new Map<string,string>();
    const seenAttrs = new Set<string>();
    const duplicateAttributes: string[] = [];
    const invalidAttributes: string[] = [];
    
    while (i < src.length) {
      // Skip ws
      while (i < src.length && /\s/.test(src[i])) i++;