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
      if (i >= src.length) break;

      // AttrName
      const nameStart = i;
      while (i < src.length && !/[\s=]/.test(src[i])) i++;
      const attrName = src.slice(nameStart, i);

      // ws
      while (i < src.length && /\s/.test(src[i])) i++;
      if (src[i] !== '=') {
        invalidAttributes.push(attrName);
        // sauter jusqu'au prochain séparateur
        while (i < src.length && !/\s/.test(src[i])) i++;
        continue;
      }
      i++; // '='

      // ws
      while (i < src.length && /\s/.test(src[i])) i++;
      if (i >= src.length) { 
        invalidAttributes.push(attrName); 
        break; 
      }

      // Quoted value only (XML)
      const q = src[i];
      if (q !== '"' && q !== "'") {
        // valeur non quotée = invalide en XML
        invalidAttributes.push(attrName);
        // sauter la "pseudo-valeur" non quotée pour ne pas boucler
        while (i < src.length && !/\s/.test(src[i])) i++;
        continue;
      }

      i++; // open quote
      let v = '';
      while (i < src.length && src[i] !== q) { 
        v += src[i++]; 
      }
      if (i < src.length) i++; // close quote
      
      // Vérifier qu'il y a un séparateur avant le prochain attribut
      if (i < src.length) {
        const next = src[i];
        // autoriser fin de tag, espace, ou slash de self-closing
        if (!/\s/.test(next) && next !== '/') {
          invalidAttributes.push(`${attrName}/*missing-space*/`);
        }
      }
      
      // Vérifier les doublons
      if (seenAttrs.has(attrName)) {
        // On garde le premier, on ignore le doublon
        duplicateAttributes.push(attrName);
        continue;
      }
      seenAttrs.add(attrName);
      attributes.set(attrName, v); // Le décodage sera fait dans le parser SAX
    }

    return { name, attributes, selfClosing, duplicateAttributes, invalidAttributes };
  }


  private advance(steps: number = 1): void {
    for (let i = 0; i < steps; i++) {
      if (this.position < this.content.length) {
        const char = this.content[this.position];
        
        // Gérer les fins de ligne Windows (CRLF) et Mac (CR)
        if (char === '\r') {
          this.line++;
          this.column = 1;
          this.position++;
          // Vérifier si c'est suivi de \n (CRLF)
          if (this.position < this.content.length && this.content[this.position] === '\n') {
            this.position++; // Consommer le \n aussi
          }
        } else if (char === '\n') {
          this.line++;
          this.column = 1;
          this.position++;
        } else {
          this.column++;
          this.position++;
        }
      }
    }
  }

  public getCurrentLocation(): Location {
    return {
      line: this.line,
      column: this.column,
      position: this.position
    };
  }
}

/**
 * Parser SAX avec mode Luciform-permissif
 */
class LuciformSAXParser {
  private scanner: LuciformXMLScanner;
  private stack: string[] = [];
  private diagnostics: Diagnostic[] = [];
  private errors: Diagnostic[] = [];
  private totalTextBytes: number = 0;
  private nodeCount: number = 0;
  private entityExpansions: number = 0;
  private entityLimitHit: boolean = false;
  private recoveryCount: number = 0;
  private suppressedDepth: number = 0;
  private options: {
    maxDepth: number;
    maxTextLength: number;
    entityExpansionLimit: number;
    allowDTD: boolean;
    maxAttrCount: number;
    maxAttrValueLength: number;
    maxCommentLength: number;
    maxPILength: number;
    useUnicodeNames: boolean;
    mode: 'strict' | 'luciform-permissive';
  };

  constructor(scanner: LuciformXMLScanner, options: {
    maxDepth: number;
    maxTextLength: number;
    entityExpansionLimit: number;
    allowDTD: boolean;
    maxAttrCount: number;
    maxAttrValueLength: number;
    maxCommentLength: number;
    maxPILength: number;
    useUnicodeNames: boolean;
    mode: 'strict' | 'luciform-permissive';
  }) {
    this.scanner = scanner;
    this.options = options;
  }

  private isValidXmlCodePoint = (cp: number): boolean => {
    // XML 1.0 Fifth Edition:
    // #x9 | #xA | #xD | #x20–#xD7FF | #xE000–#xFFFD | #x10000–#x10FFFF
    return cp === 0x9 || cp === 0xA || cp === 0xD ||
           (cp >= 0x20 && cp <= 0xD7FF) ||
           (cp >= 0xE000 && cp <= 0xFFFD) ||
           (cp >= 0x10000 && cp <= 0x10FFFF);
  };

  private validateXMLChar = (char: string, loc: Location): string => {
    const cp = char.codePointAt(0);
    if (cp === undefined) return char;
    
    if (!this.isValidXmlCodePoint(cp)) {
      return '\uFFFD';
    }
    
    return char;
  };

  private validateXMLString = (s: string, loc: Location): string => {
    let invalid = false;
    let out = '';
    for (const ch of s) {                // itère par points de code
      const cp = ch.codePointAt(0)!;
      if (!this.isValidXmlCodePoint(cp)) { 
        out += '\uFFFD'; 
        invalid = true; 
      } else {
        out += ch;
      }
    }
    if (invalid) {
      this.addDiagnostic('warn', 'INVALID_CHAR', 'Caractère XML invalide remplacé par U+FFFD', loc);
      this.recoveryCount++;
    }
    return out;
  };

  private decodeEntities = (s: string, loc: Location): string => {
    if (this.entityLimitHit) return s;
    if (this.entityExpansions >= this.options.entityExpansionLimit) {
      this.addError('ENTITY_LIMIT', 'Limite d\'expansion d\'entités atteinte', loc);
      this.entityLimitHit = true;
      return s;
    }
    
    return s.replace(/&(#\d+|#x[0-9A-Fa-f]+|[A-Za-z_][A-Za-z0-9._:-]*);/g, (m, g) => {
      if (++this.entityExpansions > this.options.entityExpansionLimit) {
        this.addError('ENTITY_LIMIT', 'Limite d\'expansion d\'entités atteinte', loc);
        this.entityLimitHit = true; // Fige l'état
        return m; // ou stop parsing
      }
      if (g[0] === '#') {
        const code = g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
        if (!Number.isFinite(code) || code < 0 || code > 0x10FFFF) {
          this.addDiagnostic('warn', 'BAD_CHARREF', `Référence de caractère invalide: ${m}`, loc);
          return '\uFFFD';
        }
        const decoded = String.fromCodePoint(code);
        return this.validateXMLChar(decoded, loc);
      }
      switch (g) { 
        case 'lt': return '<'; 
        case 'gt': return '>'; 
        case 'amp': return '&'; 
        case 'apos': return "'"; 
        case 'quot': return '"'; 
        default: 
          this.addDiagnostic(
            this.options.mode === 'luciform-permissive' ? 'warn' : 'error',
            'UNKNOWN_ENTITY', `Entité inconnue: &${g};`, loc
          );
          this.recoveryCount++;
          return m; 
      }
    });
  };

  private validateXMLName = (name: string, loc: Location): boolean => {
    // Choisir la regex selon l'option Unicode
    // Modifié pour autoriser $ dans les noms (pour les types TypeScript comme $ZodConfig)
    const NAME_ASCII = /^[A-Za-z_$:][A-Za-z0-9._$:-]*$/;
    const NAME_UNICODE = /^[:A-Z_a-z$\xC0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][\-.0-9:A-Z_a-z$\xB7\xC0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]*$/u;
    
    const NAME = this.options.useUnicodeNames ? NAME_UNICODE : NAME_ASCII;
    
    if (!NAME.test(name)) {
      this.addError('BAD_NAME', `Nom invalide: ${name}`, loc);
      return false;
    }
    
    // Vérifier les colonnes multiples dans les QNames
    const colonCount = (name.match(/:/g) || []).length;
    if (colonCount > 1) {
      this.addError('BAD_QNAME', `QName avec trop de ':' : ${name}`, loc);
      return false;
    }
    
    return true;
  };

  parse(): XMLDocument {
    const document = new XMLDocument();
    let currentElement: XMLElement | null = null;
    const elementStack: XMLElement[] = [];
    
    // Gestion de la déclaration XML stricte
    let sawAnything = false;
    let sawDecl = false;
    let sawDoctype = false;
    let sawRoot = false;
    
    // Gestion des namespaces
    type NSFrame = Map<string, string>; // prefix -> uri
    const nsStack: NSFrame[] = [new Map([['xml', 'http://www.w3.org/XML/1998/namespace']])];
    
    const pushNS = (attrs: Map<string, string>, loc: Location) => {
      const frame = new Map(nsStack[nsStack.length - 1]);
      for (const [k, v] of attrs) {
        if (k === 'xmlns') {
          if (v === '') {
            this.addDiagnostic('info', 'DEFAULT_NS_UNDECLARED', 'xmlns="" (annulation du namespace par défaut)', loc);
          }
          frame.set('', v);
        } else if (k.startsWith('xmlns:')) {
          const prefix = k.slice(6);
          if (prefix === 'xmlns') {
            this.addDiagnostic('error', 'XMLNS_PREFIX_RESERVED', 'Le préfixe "xmlns" est réservé et ne peut pas être déclaré', loc);
            this.recoveryCount++;
            continue;
          }
          if (prefix === 'xml') {
            if (v !== 'http://www.w3.org/XML/1998/namespace') {
              this.addDiagnostic('error', 'XML_PREFIX_URI', '"xml" doit être lié à http://www.w3.org/XML/1998/namespace', loc);
              this.recoveryCount++;
            }
            continue; // ne pas écraser le mapping builtin
          }
          frame.set(prefix, v);
        }
      }
      nsStack.push(frame);
    };
    
    const popNS = () => { nsStack.pop(); };
    
    const splitQName = (qn: string) => {
      const i = qn.indexOf(':');
      return i === -1 ? { prefix: '', local: qn } : { prefix: qn.slice(0, i), local: qn.slice(i + 1) };
    };

    const checkNamespace = (qname: string, loc: Location, isAttribute: boolean = false) => {
      const { prefix } = splitQName(qname);
      if (prefix && prefix !== 'xml') {
        const nsFrame = nsStack[nsStack.length - 1];
        if (!nsFrame.has(prefix)) {
          const level = this.options.mode === 'luciform-permissive' ? 'warn' : 'error';
          this.addDiagnostic(level, 'UNBOUND_PREFIX', `Préfixe non lié: ${prefix}`, loc);
          this.recoveryCount++;
        }
      } else if (!prefix && isAttribute) {
        // Les attributs sans préfixe ne reçoivent pas le namespace par défaut
        // C'est un garde-fou pour la future implémentation de la résolution des namespaces
        // Pour l'instant, on ne fait rien, mais c'est documenté pour plus tard
      }
    };

    const parseXmlDeclaration = (s: string, loc: Location): XMLDeclaration | undefined => {
      // s commence par 'xml '
      const attrs = Object.fromEntries(
        [...s.matchAll(/\b(version|encoding|standalone)\s*=\s*(['"])(.*?)\2/g)].map(m => [m[1], m[3]])
      );
      if (!attrs.version) {
        this.addError('XML_DECL_VERSION', 'version manquante', loc);
      }
      return { 
        version: attrs.version ?? '1.0', 
        encoding: attrs.encoding, 
        standalone: attrs.standalone === 'yes' ? true : (attrs.standalone === 'no' ? false : undefined) 
      };
    };

    let token: Token | null;
    while ((token = this.scanner.next()) !== null) {
      switch (token.type) {
        case 'StartTag': {
          sawAnything = true;
          sawRoot = true;
          
          if (this.stack.length >= this.options.maxDepth) {
            this.addDiagnostic('warn', 'MAX_DEPTH_EXCEEDED', 'Profondeur maximale dépassée', token.location);
            this.recoveryCount++;

            // Construire decodedAttrs + limites + décodage (identique à la voie normale)
            const decodedAttrs = new Map<string, string>();
            if (token.attributes) {
              let attributesToProcess = token.attributes;
              if (token.attributes.size > this.options.maxAttrCount) {
                const ignored = token.attributes.size - this.options.maxAttrCount;
                this.addDiagnostic('warn', 'ATTR_COUNT_LIMIT', `Nombre d'attributs dépassé: ${token.attributes.size} (${ignored} ignorés)`, token.location);
                this.recoveryCount++;
                attributesToProcess = new Map([...token.attributes].slice(0, this.options.maxAttrCount));
              }
              for (const [name, value] of attributesToProcess) {
                if (!this.validateXMLName(name, token.location)) continue;
                let v = value.length > this.options.maxAttrValueLength
                  ? this.decodeEntities(value.slice(0, this.options.maxAttrValueLength), token.location)
                  : this.decodeEntities(value, token.location);
                v = this.validateXMLString(v.replace(/\r\n?/g, '\n'), token.location);
                if (v.includes('<')) { 
                  this.addDiagnostic('error', 'ATTR_LT_FORBIDDEN', `Valeur d'attribut ne peut pas contenir '<': ${name}`, token.location); 
                  this.recoveryCount++; 
                  continue; 
                }
                decodedAttrs.set(name, v);
              }
            }

            // Appliquer NS puis expurger xmlns/* de l'élément exposé
            pushNS(decodedAttrs, token.location);
            
            // Valider nom et préfixe même hors pile
            if (!this.validateXMLName(token.tagName!, token.location)) break;
            if (/^xmlns(?::|$)/.test(token.tagName!)) { 
              this.addError('RESERVED_ELEM_NAME', 'Nom d\'élément réservé: ' + token.tagName, token.location); 
              break; 
            }
            checkNamespace(token.tagName!, token.location);
            
            const el = new XMLElement(token.tagName!, token.location, currentElement);
            const finalAttrs = new Map<string, string>();
            for (const [n, v] of decodedAttrs) if (n !== 'xmlns' && !n.startsWith('xmlns:')) finalAttrs.set(n, v);
            el.attributes = finalAttrs;

            if (currentElement) {
              currentElement.children.push(el as any);
            } else {
              document.children.push(el as any);
              if (!document.root) {
                document.root = el;
              }
            }
            this.nodeCount++;
            if (!token.selfClosing) this.suppressedDepth++;
            popNS(); // Important : on nettoie la frame NS puisque rien n'est empilé
            break;
          }

          // Vérifier le nom d'élément vide
          if (!token.tagName || token.tagName.trim() === '') {
            this.addError('EMPTY_NAME', 'Nom d\'élément vide', token.location);
            break;
          }

          // Valider le nom de l'élément
          if (!this.validateXMLName(token.tagName!, token.location)) {
            break;
          }

          // Refuser xmlns comme nom d'élément (réservé aux déclarations)
          if (/^xmlns(?::|$)/.test(token.tagName!)) {
            this.addError('RESERVED_ELEM_NAME', 'Nom d\'élément réservé: ' + token.tagName, token.location);
            break;
          }

          // Signaler les attributs dupliqués
          if (token.duplicateAttributes && token.duplicateAttributes.length > 0) {
            for (const dupAttr of token.duplicateAttributes) {
              const level = this.options.mode === 'luciform-permissive' ? 'warn' : 'error';
              this.addDiagnostic(level, 'DUP_ATTR', `Attribut dupliqué: ${dupAttr}`, token.location);
              this.recoveryCount++;
            }
          }

          // Signaler les attributs sans valeur
          if (token.invalidAttributes && token.invalidAttributes.length > 0) {
            for (const invalidAttr of token.invalidAttributes) {
              const level = this.options.mode === 'luciform-permissive' ? 'warn' : 'error';
              if (invalidAttr.endsWith('/*missing-space*/')) {
                const name = invalidAttr.replace(/\/\*missing-space\*\/$/, '');
                this.addDiagnostic(level, 'ATTR_MISSING_SPACE', `Espace requis après la valeur de "${name}"`, token.location);
              } else {
                this.addDiagnostic(level, 'ATTR_NO_VALUE', `Attribut sans valeur: ${invalidAttr}`, token.location);
              }
              this.recoveryCount++;
            }
          }

          // Créer l'élément
          const element = new XMLElement(token.tagName!, token.location, currentElement);
          if (token.attributes) {
            // Vérifier le nombre d'attributs et tronquer en mode permissif
            let attributesToProcess = token.attributes;
            if (token.attributes.size > this.options.maxAttrCount) {
              const level = this.options.mode === 'luciform-permissive' ? 'warn' : 'error';
              const ignoredCount = token.attributes.size - this.options.maxAttrCount;
              this.addDiagnostic(level, 'ATTR_COUNT_LIMIT', 
                `Nombre d'attributs dépassé: ${token.attributes.size} > ${this.options.maxAttrCount} (${ignoredCount} ignorés)`, token.location);
              this.recoveryCount++;
              
              if (this.options.mode === 'luciform-permissive') {
                // Tronquer en mode permissif - garder seulement les N premiers
                attributesToProcess = new Map([...token.attributes].slice(0, this.options.maxAttrCount));
              }
            }

            // 1) Construire decodedAttrs (sans encore valider le QName)
            const decodedAttrs = new Map<string, string>();
            for (const [name, value] of attributesToProcess) {
              // Valider le nom de l'attribut
              if (!this.validateXMLName(name, token.location)) {
                continue; // Ignorer l'attribut invalide
              }
              
              // Vérifier la longueur de la valeur
              if (value.length > this.options.maxAttrValueLength) {
                const level = this.options.mode === 'luciform-permissive' ? 'warn' : 'error';
                this.addDiagnostic(level, 'ATTR_VALUE_LIMIT', 
                  `Valeur d'attribut trop longue: ${value.length} > ${this.options.maxAttrValueLength}`, token.location);
                this.recoveryCount++;
                
                // Tronquer en mode permissif
                if (this.options.mode === 'luciform-permissive') {
                  const truncatedValue = value.substring(0, this.options.maxAttrValueLength);
                  let decodedValue = this.decodeEntities(truncatedValue, token.location);
                  // Normaliser les fins de ligne dans les valeurs d'attribut
                  decodedValue = decodedValue.replace(/\r\n?/g, '\n');
                  // Valider les caractères XML
                  decodedValue = this.validateXMLString(decodedValue, token.location);
                  // Vérifier que la valeur ne contient pas < après décodage
                  if (decodedValue.includes('<')) {
                    this.addDiagnostic('error', 'ATTR_LT_FORBIDDEN', `Valeur d'attribut ne peut pas contenir '<' après décodage: ${name}`, token.location);
                    this.recoveryCount++;
                    continue; // Ignorer cet attribut
                  }
                  decodedAttrs.set(name, decodedValue);
                } else {
                  continue; // Ignorer l'attribut en mode strict
                }
              } else {
                let decodedValue = this.decodeEntities(value, token.location);
                // Normaliser les fins de ligne dans les valeurs d'attribut
                decodedValue = decodedValue.replace(/\r\n?/g, '\n');
                // Valider les caractères XML
                decodedValue = this.validateXMLString(decodedValue, token.location);
                // Vérifier que la valeur ne contient pas < après décodage
                if (decodedValue.includes('<')) {
                  this.addDiagnostic('error', 'ATTR_LT_FORBIDDEN', `Valeur d'attribut ne peut pas contenir '<' après décodage: ${name}`, token.location);
                  this.recoveryCount++;
                  continue; // Ignorer cet attribut
                }
                decodedAttrs.set(name, decodedValue);
              }
            }

            // 2) Appliquer les namespaces d'abord (déduits de decodedAttrs)
            pushNS(decodedAttrs, token.location);

            // 3) Valider le QName de l'élément (bénéficie des nouvelles liaisons)
            checkNamespace(token.tagName!, token.location);

            // 4) Valider les attributs (après pushNS) en ignorant xmlns/*
            for (const [name] of decodedAttrs) {
              if (name !== 'xmlns' && !name.startsWith('xmlns:')) {
                checkNamespace(name, token.location, true);
              }
            }

            // 5) Retirer xmlns/* des attributs exposés
            const finalAttrs = new Map<string, string>();
            for (const [name, value] of decodedAttrs) {
              if (name !== 'xmlns' && !name.startsWith('xmlns:')) {
                finalAttrs.set(name, value);
              }
            }
            element.attributes = finalAttrs;
          } else {
            // Pas d'attributs, mais valider quand même le QName
            checkNamespace(token.tagName!, token.location);
          }

          // L'ajouter au parent ou au document
          if (currentElement) {
            currentElement.children.push(element as any);
          } else {
            document.children.push(element as any);
            if (!document.root) {
              document.root = element;
            }
          }

          this.nodeCount++;
          this.stack.push(token.tagName!);
          elementStack.push(element);
          
          if (token.selfClosing) {
            this.stack.pop();
            elementStack.pop();
            popNS();
          } else {
            currentElement = element;
          }
          break;
        }

        case 'EndTag': {
          // Valider le nom de l'end-tag
          if (!token.tagName || !this.validateXMLName(token.tagName, token.location)) {
            break; // Ignorer l'end-tag invalide
          }
          
          // Vérifier les namespaces pour les EndTag aussi
          checkNamespace(token.tagName, token.location);
          
          // Vérifier si c'est une fermeture supprimée (profondeur dépassée)
          if (this.suppressedDepth > 0) {
            // On "consomme" silencieusement cette fermeture correspondant à un élément ignoré
            this.suppressedDepth--;
            break;
          }
          
          if (this.stack.length === 0) {
            this.addError('UNEXPECTED_END_TAG', `Tag de fermeture inattendu: ${token.tagName}`, token.location);
          } else {
            const i = this.stack.lastIndexOf(token.tagName!);
            if (i === -1) {
              const level = this.options.mode === 'luciform-permissive' ? 'warn' : 'error';
              this.addDiagnostic(level, 'UNKNOWN_END_TAG', `Tag de fermeture inconnu: ${token.tagName}`, token.location);
              this.recoveryCount++;
            } else {
              // Fermer tous les tags jusqu'au bon
              while (this.stack.length - 1 > i) {
                const dangling = this.stack.pop()!;
                elementStack.pop(); // fermer réellement
                popNS(); // nettoyer les namespaces
                this.addDiagnostic('warn', 'AUTO_CLOSE', `Fermeture implicite de <${dangling}>`, token.location);
                this.recoveryCount++;
              }
              this.stack.pop();
              elementStack.pop();
              popNS();
              currentElement = elementStack.length > 0 ? elementStack[elementStack.length - 1] : null;
            }
          }
          break;
        }

        case 'Text': {
          // Normaliser les fins de ligne
          let text = token.content.replace(/\r\n?/g, '\n');
          // Décoder les entités
          text = this.decodeEntities(text, token.location);
          // Valider les caractères XML
          text = this.validateXMLString(text, token.location);
          
          this.totalTextBytes += text.length;
          this.nodeCount++;
          
          if (this.totalTextBytes > this.options.maxTextLength) {
            if (this.options.mode === 'luciform-permissive') {
              this.addDiagnostic('warn', 'TOTAL_TEXT_LIMIT_EXCEEDED', 
                `Limite totale de texte dépassée: ${this.totalTextBytes} caractères (UTF-16 code units)`, token.location);
              // Tronquer le contenu
              const remainingBytes = this.options.maxTextLength - (this.totalTextBytes - text.length);
              text = text.substring(0, Math.max(0, remainingBytes));
              // Clamp le compteur pour éviter des warnings répétés
              this.totalTextBytes = this.options.maxTextLength;
            } else {
              this.addError('TOTAL_TEXT_LIMIT_EXCEEDED', 'Limite totale de texte dépassée', token.location);
              break;
            }
          }
          
          if (text.length > 0) {
            // Vérifier la séquence ]]> interdite dans le texte normal
            if (text.includes(']]>')) {
              this.addDiagnostic('error', 'TEXT_CONTAINS_CDATA_END', 'Séquence ]]> interdite hors CDATA', token.location);
              this.recoveryCount++;
            }
            
            // Vérifier le texte hors racine (non-blanc)
            const isWS = /^\s*$/.test(text);
            if (!currentElement && !isWS) {
              this.addError('TEXT_OUTSIDE_ROOT', 'Texte non-blanc en dehors de l\'élément racine', token.location);
              this.recoveryCount++;
            }
            
            const textNode = new XMLNode('text', text, token.location, currentElement);
            if (currentElement) {
              currentElement.children.push(textNode);
            } else {
              document.children.push(textNode);
            }
          }
          sawAnything = true;
          break;
        }

        case 'CDATA': {
          // Vérifier si le CDATA est fermé correctement
          if (token.closed === false) {
            this.addDiagnostic('error', 'UNTERMINATED_CDATA', 'CDATA non terminé (EOF atteint)', token.location);
            this.recoveryCount++;
          }
          
          // Ajouter CDATA au quota de taille global
          this.totalTextBytes += token.content.length;
          this.nodeCount++;
          
          if (this.totalTextBytes > this.options.maxTextLength) {
            if (this.options.mode === 'luciform-permissive') {
              this.addDiagnostic('warn', 'TOTAL_TEXT_LIMIT_EXCEEDED', 
                `Limite totale de texte dépassée: ${this.totalTextBytes} caractères (UTF-16 code units)`, token.location);
              // Tronquer le contenu
              const remainingBytes = this.options.maxTextLength - (this.totalTextBytes - token.content.length);
              token.content = token.content.substring(0, Math.max(0, remainingBytes));
              // Clamp le compteur pour éviter des warnings répétés
              this.totalTextBytes = this.options.maxTextLength;
            } else {
              this.addError('TOTAL_TEXT_LIMIT_EXCEEDED', 'Limite totale de texte dépassée', token.location);
              break;
            }
          }
          
          const cdataNode = new XMLNode('cdata', token.content, token.location, currentElement);
          if (currentElement) {
            currentElement.children.push(cdataNode);
          } else {
            document.children.push(cdataNode);
          }
          sawAnything = true;
          break;
        }

        case 'Comment': {
          // Vérifier si le commentaire est fermé correctement
          if (token.closed === false) {
            this.addDiagnostic('error', 'UNTERMINATED_COMMENT', 'Commentaire non terminé (EOF atteint)', token.location);
            this.recoveryCount++;
          }
          
          // Vérifier les commentaires invalides avec --
          if (token.content.includes('--')) {
            this.addDiagnostic('error', 'INVALID_COMMENT', 'Commentaire invalide: contient --', token.location);
            this.recoveryCount++;
          }
          
          // Vérifier les commentaires se terminant par - (interdit avant -->)
          if (token.content.endsWith('-') && token.closed !== false) {
            this.addDiagnostic('error', 'INVALID_COMMENT', 'Commentaire invalide: se termine par -', token.location);
            this.recoveryCount++;
          }
          
          // Vérifier la taille du commentaire
          let commentContent = token.content;
          if (commentContent.length > this.options.maxCommentLength) {
            if (this.options.mode === 'luciform-permissive') {
              this.addDiagnostic('warn', 'COMMENT_LENGTH_LIMIT', 
                `Commentaire trop long: ${commentContent.length} > ${this.options.maxCommentLength}`, token.location);
              this.recoveryCount++;
              // Tronquer le contenu
              commentContent = commentContent.substring(0, this.options.maxCommentLength);
            } else {
              this.addError('COMMENT_LENGTH_LIMIT', 'Commentaire trop long', token.location);
              break;
            }
          }
          
          // Ajouter au quota de taille global
          this.totalTextBytes += commentContent.length;
          this.nodeCount++;
          
          // Appliquer AUSSI la limite globale (comme Text/CDATA)
          if (this.totalTextBytes > this.options.maxTextLength) {
            if (this.options.mode === 'luciform-permissive') {
              this.addDiagnostic('warn', 'TOTAL_TEXT_LIMIT_EXCEEDED',
                `Limite totale de texte dépassée: ${this.totalTextBytes} caractères (UTF-16 code units)`,
                token.location);
              const remaining = this.options.maxTextLength - (this.totalTextBytes - commentContent.length);
              commentContent = commentContent.substring(0, Math.max(0, remaining));
              this.totalTextBytes = this.options.maxTextLength; // clamp
            } else {
              this.addError('TOTAL_TEXT_LIMIT_EXCEEDED', 'Limite totale de texte dépassée', token.location);
              break;
            }
          }
          
          const commentNode = new XMLNode('comment', commentContent, token.location, currentElement);
          if (currentElement) {
            currentElement.children.push(commentNode);
          } else {
            document.children.push(commentNode);
          }
          sawAnything = true;
          break;
        }

        case 'PI': {
          // Vérifier si la PI est fermée correctement
          if ((token as any).closed === false) {
            this.addDiagnostic('error', 'UNTERMINATED_PI', 'PI non terminée (EOF atteint)', token.location);
            this.recoveryCount++;
          }
          
          // Gestion stricte de la déclaration XML (casse obligatoire 'xml', pas d'espaces après <?)
          if (/^xml(?=\s|$)/.test(token.content)) {
            if (sawAnything || sawDecl) {
              this.addError('XML_DECL_POS', 'Déclaration XML hors prologue', token.location);
            } else {
              sawDecl = true;
              // Parser pseudo-attributs version/encoding/standalone
              document.declaration = parseXmlDeclaration(token.content, token.location);
              
              // Sanity checks pour XMLDecl
              if (document.declaration?.version && !['1.0', '1.1'].includes(document.declaration.version)) {
                this.addDiagnostic('warn', 'XML_DECL_VERSION_UNKNOWN', `Version XML inattendue: ${document.declaration.version}`, token.location);
              }
              if (document.declaration?.standalone !== undefined && ![true, false].includes(document.declaration.standalone)) {
                this.addDiagnostic('warn', 'XML_DECL_STANDALONE_BAD', 'Valeur standalone invalide', token.location);
              }
            }
          } else {
            // PI "normale" - valider la cible
            const m = token.content.match(/^\s*([A-Za-z_:][A-Za-z0-9._:-]*)/);
            if (!m) {
              this.addError('PI_TARGET', 'Cible de PI invalide', token.location);
            } else if (/^xml$/i.test(m[1])) {
              this.addError('PI_TARGET', 'Cible "xml" réservée à la déclaration XML', token.location);
            }
            
            if (sawRoot && this.stack.length === 0) {
              // Note: La spec XML autorise les PI et Comment après l'élément racine (Misc)
              // On les marque en warn par choix "hygiène" pour éviter les confusions
              this.addDiagnostic('warn', 'PI_AFTER_ROOT', 'PI hors de l\'élément racine (Misc)', token.location);
              this.recoveryCount++;
            }
            
            // Vérifier la taille de la PI
            let piContent = token.content;
            if (piContent.length > this.options.maxPILength) {
              if (this.options.mode === 'luciform-permissive') {
                this.addDiagnostic('warn', 'PI_LENGTH_LIMIT', 
                  `PI trop longue: ${piContent.length} > ${this.options.maxPILength}`, token.location);
                this.recoveryCount++;
                // Tronquer le contenu
                piContent = piContent.substring(0, this.options.maxPILength);
              } else {
                this.addError('PI_LENGTH_LIMIT', 'PI trop longue', token.location);
                break;
              }
            }
            
            // Ajouter au quota de taille global
            this.totalTextBytes += piContent.length;
            this.nodeCount++;
            
            // Appliquer AUSSI la limite globale (comme Text/CDATA/Comment)
            if (this.totalTextBytes > this.options.maxTextLength) {
              if (this.options.mode === 'luciform-permissive') {
                this.addDiagnostic('warn', 'TOTAL_TEXT_LIMIT_EXCEEDED',
                  `Limite totale de texte dépassée: ${this.totalTextBytes} caractères (UTF-16 code units)`,
                  token.location);
                const remaining = this.options.maxTextLength - (this.totalTextBytes - piContent.length);
                piContent = piContent.substring(0, Math.max(0, remaining));
                this.totalTextBytes = this.options.maxTextLength; // clamp
              } else {
                this.addError('TOTAL_TEXT_LIMIT_EXCEEDED', 'Limite totale de texte dépassée', token.location);
                break;
              }
            }
            
            const piNode = new XMLNode('pi', piContent, token.location, currentElement);
            if (currentElement) {
              currentElement.children.push(piNode);
            } else {
              document.children.push(piNode);
            }
          }
          sawAnything = true;
          break;
        }

        case 'Doctype': {
          // Vérifier si le DOCTYPE est fermé correctement
          if ((token as any).closed === false) {
            this.addDiagnostic('error', 'UNTERMINATED_DTD', 'DOCTYPE non terminé (EOF atteint)', token.location);
            this.recoveryCount++;
          }
          
          if (sawRoot) {
            this.addError('DTD_AFTER_ROOT', 'DOCTYPE après l\'élément racine', token.location);
          } else if (sawDoctype) {
            this.addError('DTD_DUP', 'DOCTYPE multiple', token.location);
          } else {
            sawDoctype = true;
            if (!this.options.allowDTD) {
              if (this.options.mode === 'luciform-permissive') {
                this.addDiagnostic('warn', 'DTD_FORBIDDEN', 'DTD désactivé (sécurité)', token.location);
              } else {
                this.addError('DTD_FORBIDDEN', 'DTD désactivé (sécurité)', token.location);
              }
            } else {
              // Parse minimal du DOCTYPE sans résolution d'entités externes
              const match = token.content.match(/^([^\s]+)/);
              if (match) {
                document.doctype = { name: match[1] };
              }
            }
          }
          sawAnything = true;
          break;
        }
      }
    }

    // Mode permissif : fermer les tags restants
    if (this.options.mode === 'luciform-permissive' && this.stack.length > 0) {
      this.addDiagnostic('info', 'UNCLOSED_TAGS', 
        `Tags non fermés: ${this.stack.join(', ')}`, { line: 0, column: 0, position: 0 });
    }

    // Vérifier qu'il n'y a qu'un seul élément racine
    const rootElements = document.children.filter(child => child instanceof XMLElement);
    if (rootElements.length > 1) {
      if (this.options.mode === 'luciform-permissive') {
        this.addDiagnostic('warn', 'MULTIPLE_ROOTS', 'XML ne peut avoir qu\'un seul élément racine', { line: 0, column: 0, position: 0 });
      } else {
        this.addError('MULTIPLE_ROOTS', 'XML ne peut avoir qu\'un seul élément racine', { line: 0, column: 0, position: 0 });
      }
    }

    // Vérifier la cohérence DOCTYPE vs racine
    if (document.doctype?.name && document.root?.name && document.doctype.name !== document.root.name) {
      this.addDiagnostic('warn', 'DOCTYPE_ROOT_MISMATCH', 
        `DOCTYPE name "${document.doctype.name}" ne correspond pas à l'élément racine "${document.root.name}"`, 
        { line: 0, column: 0, position: 0 });
    }

    return document;
  }

  private addError(code: string, message: string, location: Location): void {
    this.errors.push({
      level: 'error',
      code,
      message,
      location
    });
  }

  private addDiagnostic(level: 'info' | 'warn' | 'error', code: string, message: string, location: Location): void {
    this.diagnostics.push({
      level,
      code,
      message,
      location
    });
    if (level === 'error') this.addError(code, message, location);
  }

  getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  getErrors(): Diagnostic[] {
    return this.errors;
  }

  getRecoveryCount(): number {
    return this.recoveryCount;
  }

  getNodeCount(): number {
    return this.nodeCount;
  }
}

type ScannerState = 'Text' | 'TagOpen' | 'Comment' | 'PI' | 'CDATA' | 'Doctype';

// Classes de base pour le document XML
export class XMLDocument {
  root?: XMLElement;
  declaration?: XMLDeclaration;
  doctype?: XMLDoctype;
  children: (XMLNode | XMLElement)[] = [];
}

export class XMLElement {
  name: string;
  attributes: Map<string, string> = new Map();
  children: (XMLNode | XMLElement)[] = [];
  location: Location;
  parent?: XMLElement;

  constructor(name: string, location: Location, parent?: XMLElement) {
    this.name = name;
    this.location = location;
    this.parent = parent;
  }
}

class XMLNode {
  type: 'element' | 'text' | 'cdata' | 'comment' | 'pi';
  content: string;
  location: Location;
  parent?: XMLElement;

  constructor(type: 'element' | 'text' | 'cdata' | 'comment' | 'pi', content: string, location: Location, parent?: XMLElement) {
    this.type = type;
    this.content = content;
    this.location = location;
    this.parent = parent;
  }
}

class XMLDeclaration {
  version: string;
  encoding?: string;
  standalone?: boolean;
}

class XMLDoctype {
  name: string;
  publicId?: string;
  systemId?: string;
}