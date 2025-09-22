/**
 * LuciformXMLParser - Chunk 2/3
 * 
 * Lignes 501 à 1000 du parser original
 * 
 * ⚠️ ATTENTION: Ce fichier est un chunk du parser original.
 * Ne pas modifier directement - utiliser le fichier principal.
 */

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