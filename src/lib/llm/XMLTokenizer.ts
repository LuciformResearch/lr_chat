/**
 * XMLTokenizer - Lexer/Tokenizer pour XML
 * 
 * Parse correctement le XML avec un vrai lexer au lieu de regex
 * - Gère les déclarations XML <?xml version="1.0" encoding="UTF-8"?>
 * - Gère les CDATA sections <![CDATA[...]]>
 * - Gère les commentaires <!-- ... -->
 * - Gère les attributs et valeurs
 * - Gère l'échappement XML
 */

export interface XMLToken {
  type: 'XML_DECLARATION' | 'OPEN_TAG' | 'CLOSE_TAG' | 'SELF_CLOSING_TAG' | 'TEXT' | 'CDATA' | 'COMMENT' | 'ATTRIBUTE' | 'VALUE' | 'EOF';
  value: string;
  position: number;
  line?: number;
  column?: number;
}

export class XMLTokenizer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: XMLToken[] = [];

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize l'input XML
   */
  tokenize(): XMLToken[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (this.position < this.input.length) {
      const char = this.input[this.position];
      
      if (char === '<') {
        this.handleTagStart();
      } else if (char === '>') {
        // Le > est géré dans handleOpenTag et handleCloseTag
        this.advance();
      } else if (char === '=') {
        this.addToken('ATTRIBUTE', '=');
        this.advance();
      } else if (char === '"' || char === "'") {
        this.handleQuotedValue();
      } else if (char === ' ') {
        this.advance(); // Ignorer les espaces
      } else if (char === '\n') {
        this.advance();
        this.line++;
        this.column = 1;
      } else if (char === '\t') {
        this.advance();
        this.column += 4; // Tab = 4 espaces
      } else {
        this.handleText();
      }
    }

    this.addToken('EOF', '');
    return this.tokens;
  }

  /**
   * Gère le début d'un tag <
   */
  private handleTagStart(): void {
    const startPos = this.position;
    this.advance(); // Consommer <

    // Vérifier si c'est une déclaration XML <?xml
    if (this.match('?xml')) {
      this.handleXMLDeclaration();
      return;
    }

    // Vérifier si c'est un commentaire <!--
    if (this.match('!--')) {
      this.handleComment();
      return;
    }

    // Vérifier si c'est une section CDATA <![CDATA[
    if (this.match('![CDATA[')) {
      this.handleCDATA();
      return;
    }

    // Vérifier si c'est une fermeture de tag </
    if (this.match('/')) {
      this.handleCloseTag();
      return;
    }

    // Vérifier si c'est un vrai tag (commence par une lettre)
    if (this.isValidTagStartChar(this.input[this.position])) {
      this.handleOpenTag();
      return;
    }

    // Sinon c'est du texte qui contient <, on le traite comme du texte
    this.handleTextWithAngleBrackets(startPos);
  }

  /**
   * Gère les déclarations XML <?xml version="1.0" encoding="UTF-8"?>
   */
  private handleXMLDeclaration(): void {
    const startPos = this.position - 1; // Inclure le <
    let content = '<?xml';
    
    // Consommer 'xml'
    this.advance(3);
    
    // Lire jusqu'à ?>
    while (this.position < this.input.length) {
      if (this.match('?>')) {
        content += '?>';
        this.advance(2);
        break;
      }
      content += this.input[this.position];
      this.advance();
    }
    
    this.addToken('XML_DECLARATION', content, startPos);
  }

  /**
   * Gère les commentaires <!-- ... -->
   */
  private handleComment(): void {
    const startPos = this.position - 1; // Inclure le <
    let content = '<!--';
    
    // Consommer '!--'
    this.advance(3);
    
    // Lire jusqu'à -->
    while (this.position < this.input.length) {
      if (this.match('-->')) {
        content += '-->';
        this.advance(3);
        break;
      }
      content += this.input[this.position];
      this.advance();
    }
    
    this.addToken('COMMENT', content, startPos);
  }

  /**
   * Gère les sections CDATA <![CDATA[...]]>
   */
  private handleCDATA(): void {
    const startPos = this.position - 1; // Inclure le <
    let content = '<![CDATA[';
    
    // Consommer '![CDATA['
    this.advance(8);
    
    // Lire jusqu'à ]]>
    while (this.position < this.input.length) {
      if (this.match(']]>')) {
        content += ']]>';
        this.advance(3);
        break;
      }
      content += this.input[this.position];
      this.advance();
    }
    
    this.addToken('CDATA', content, startPos);
  }

  /**
   * Gère les tags de fermeture </tag>
   */
  private handleCloseTag(): void {
    const startPos = this.position - 1; // Inclure le <
    let content = '</';
    
    // Consommer /
    this.advance();
    
    // Lire le nom du tag
    while (this.position < this.input.length && this.isValidTagChar(this.input[this.position])) {
      content += this.input[this.position];
      this.advance();
    }
    
    this.addToken('CLOSE_TAG', content, startPos);
  }

  /**
   * Gère les tags d'ouverture <tag> ou <tag/>
   */
  private handleOpenTag(): void {
    const startPos = this.position - 1; // Inclure le <
    let content = '<';
    
    // Lire le nom du tag
    while (this.position < this.input.length && this.isValidTagChar(this.input[this.position])) {
      content += this.input[this.position];
      this.advance();
    }
    
    // Lire les attributs et espaces jusqu'au >
    while (this.position < this.input.length && this.input[this.position] !== '>') {
      content += this.input[this.position];
      this.advance();
    }
    
    // Ajouter le >
    if (this.position < this.input.length) {
      content += this.input[this.position];
      this.advance();
    }
    
    // Vérifier si c'est un tag auto-fermant
    if (content.endsWith('/>')) {
      this.addToken('SELF_CLOSING_TAG', content, startPos);
    } else {
      this.addToken('OPEN_TAG', content, startPos);
    }
  }

  /**
   * Gère les valeurs entre guillemets
   */
  private handleQuotedValue(): void {
    const quote = this.input[this.position];
    const startPos = this.position;
    let content = quote;
    
    this.advance(); // Consommer le guillemet d'ouverture
    
    // Lire jusqu'au guillemet de fermeture
    while (this.position < this.input.length && this.input[this.position] !== quote) {
      content += this.input[this.position];
      this.advance();
    }
    
    if (this.position < this.input.length) {
      content += this.input[this.position]; // Ajouter le guillemet de fermeture
      this.advance();
    }
    
    this.addToken('VALUE', content, startPos);
  }

  /**
   * Gère le texte normal
   */
  private handleText(): void {
    const startPos = this.position;
    let content = '';
    
    while (this.position < this.input.length && this.input[this.position] !== '<') {
      content += this.input[this.position];
      this.advance();
    }
    
    // Nettoyer le texte (enlever les espaces en début/fin)
    const cleanedContent = content.trim();
    if (cleanedContent) {
      this.addToken('TEXT', cleanedContent, startPos);
    }
  }

  /**
   * Vérifie si le prochain caractère correspond au pattern
   */
  private match(pattern: string): boolean {
    for (let i = 0; i < pattern.length; i++) {
      if (this.position + i >= this.input.length || this.input[this.position + i] !== pattern[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Vérifie si un caractère est valide pour un nom de tag
   */
  private isValidTagChar(char: string): boolean {
    return /[a-zA-Z0-9_-]/.test(char);
  }

  /**
   * Vérifie si un caractère est valide pour commencer un nom de tag
   */
  private isValidTagStartChar(char: string): boolean {
    return /[a-zA-Z_]/.test(char);
  }

  /**
   * Gère le texte qui contient des caractères < et >
   */
  private handleTextWithAngleBrackets(startPos: number): void {
    let content = '<';
    
    // Lire jusqu'au prochain > ou fin de ligne
    while (this.position < this.input.length && this.input[this.position] !== '>') {
      content += this.input[this.position];
      this.advance();
    }
    
    // Ajouter le > s'il existe
    if (this.position < this.input.length) {
      content += this.input[this.position];
      this.advance();
    }
    
    // Nettoyer le texte
    const cleanedContent = content.trim();
    if (cleanedContent) {
      this.addToken('TEXT', cleanedContent, startPos);
    }
  }

  /**
   * Avance la position
   */
  private advance(steps: number = 1): void {
    for (let i = 0; i < steps; i++) {
      if (this.position < this.input.length) {
        this.position++;
        this.column++;
      }
    }
  }

  /**
   * Ajoute un token
   */
  private addToken(type: XMLToken['type'], value: string, position?: number): void {
    this.tokens.push({
      type,
      value,
      position: position ?? this.position,
      line: this.line,
      column: this.column
    });
  }

  /**
   * Obtient les tokens
   */
  getTokens(): XMLToken[] {
    return this.tokens;
  }

  /**
   * Debug: affiche les tokens
   */
  debugTokens(): void {
    console.log('🔍 Tokens XML:');
    for (const token of this.tokens) {
      console.log(`  ${token.type}: "${token.value}" (pos: ${token.position}, line: ${token.line})`);
    }
  }
}