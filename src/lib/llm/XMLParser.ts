/**
 * XMLParser - Parser XML basé sur un vrai lexer
 * 
 * Parse correctement le XML avec un vrai parser au lieu de regex
 * - Utilise XMLTokenizer pour la tokenisation
 * - Gère la structure hiérarchique
 * - Gère les attributs
 * - Gère les CDATA sections
 * - Gère les déclarations XML
 */

import { XMLTokenizer, XMLToken } from './XMLTokenizer';

export interface XMLNode {
  type: 'element' | 'text' | 'cdata' | 'comment' | 'declaration';
  name?: string;
  value?: string;
  attributes?: Record<string, string>;
  children?: XMLNode[];
  parent?: XMLNode;
}

export interface XMLDocument {
  declaration?: XMLNode;
  root?: XMLNode;
  comments: XMLNode[];
}

export class XMLParser {
  private tokens: XMLToken[] = [];
  private position: number = 0;
  private document: XMLDocument = { comments: [] };

  constructor() {}

  /**
   * Parse une chaîne XML
   */
  parse(xmlString: string): XMLDocument {
    // Nettoyer l'input (enlever les fences markdown)
    const cleanedXML = this.cleanInput(xmlString);
    
    // Tokenizer
    const tokenizer = new XMLTokenizer(cleanedXML);
    this.tokens = tokenizer.tokenize();
    this.position = 0;
    this.document = { comments: [] };

    console.log('🔍 Parsing XML avec tokenizer...');
    console.log(`   Tokens: ${this.tokens.length}`);
    
    // Parser
    this.parseDocument();
    
    return this.document;
  }

  /**
   * Nettoie l'input XML
   */
  private cleanInput(input: string): string {
    return input
      .replace(/^```xml\s*\n?/gm, '')
      .replace(/^```\s*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();
  }

  /**
   * Parse le document XML complet
   */
  private parseDocument(): void {
    while (this.position < this.tokens.length) {
      const token = this.currentToken();
      
      switch (token.type) {
        case 'XML_DECLARATION':
          this.document.declaration = this.parseDeclaration();
          break;
        case 'COMMENT':
          this.document.comments.push(this.parseComment());
          break;
        case 'OPEN_TAG':
          if (!this.document.root) {
            this.document.root = this.parseElement();
          } else {
            // Ignorer les éléments supplémentaires
            this.skipElement();
          }
          break;
        case 'EOF':
          return;
        default:
          this.advance();
      }
    }
  }

  /**
   * Parse une déclaration XML
   */
  private parseDeclaration(): XMLNode {
    const token = this.currentToken();
    this.advance();
    
    return {
      type: 'declaration',
      value: token.value
    };
  }

  /**
   * Parse un commentaire
   */
  private parseComment(): XMLNode {
    const token = this.currentToken();
    this.advance();
    
    return {
      type: 'comment',
      value: token.value
    };
  }

  /**
   * Parse un élément XML
   */
  private parseElement(): XMLNode {
    const openTag = this.currentToken();
    console.log(`🔍 Parsing élément: "${openTag.value}"`);
    this.advance();
    
    // Extraire le nom et les attributs du tag d'ouverture
    const { name, attributes } = this.parseTagContent(openTag.value);
    console.log(`   Nom extrait: "${name}"`);
    
    const element: XMLNode = {
      type: 'element',
      name,
      attributes,
      children: []
    };

    // Parser le contenu de l'élément
    this.parseElementContent(element);
    
    return element;
  }

  /**
   * Parse le contenu d'un tag (nom + attributs)
   */
  private parseTagContent(tagContent: string): { name: string; attributes: Record<string, string> } {
    // Enlever < et >
    const content = tagContent.slice(1, -1);
    console.log(`   Contenu du tag: "${content}"`);
    
    // Séparer le nom des attributs
    const parts = content.split(/\s+/);
    const name = parts[0];
    console.log(`   Parties: [${parts.join(', ')}]`);
    console.log(`   Nom final: "${name}"`);
    
    const attributes: Record<string, string> = {};
    
    // Parser les attributs
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.includes('=')) {
        const [attrName, attrValue] = part.split('=', 2);
        // Enlever les guillemets de la valeur
        const cleanValue = attrValue.replace(/^["']|["']$/g, '');
        attributes[attrName] = cleanValue;
      }
    }
    
    return { name, attributes };
  }

  /**
   * Parse le contenu d'un élément
   */
  private parseElementContent(element: XMLNode): void {
    while (this.position < this.tokens.length) {
      const token = this.currentToken();
      
      switch (token.type) {
        case 'OPEN_TAG':
          // Élément enfant
          const childElement = this.parseElement();
          childElement.parent = element;
          element.children!.push(childElement);
          break;
          
        case 'CLOSE_TAG':
          // Vérifier que c'est la fermeture du bon élément
          const closeTagName = this.extractTagName(token.value);
          if (closeTagName === element.name) {
            this.advance();
            return; // Fin de l'élément
          } else {
            throw new Error(`Tag de fermeture inattendu: ${closeTagName}, attendu: ${element.name}`);
          }
          
        case 'SELF_CLOSING_TAG':
          // Élément auto-fermant
          const selfClosingElement = this.parseSelfClosingElement();
          selfClosingElement.parent = element;
          element.children!.push(selfClosingElement);
          break;
          
        case 'TEXT':
          if (token.value.trim()) {
            const textNode: XMLNode = {
              type: 'text',
              value: token.value
            };
            element.children!.push(textNode);
          }
          this.advance();
          break;
          
        case 'CDATA':
          const cdataNode: XMLNode = {
            type: 'cdata',
            value: this.extractCDATAContent(token.value)
          };
          element.children!.push(cdataNode);
          this.advance();
          break;
          
        case 'COMMENT':
          const commentNode = this.parseComment();
          element.children!.push(commentNode);
          break;
          
        case 'EOF':
          throw new Error(`Élément non fermé: ${element.name}`);
          
        default:
          this.advance();
      }
    }
  }

  /**
   * Parse un élément auto-fermant
   */
  private parseSelfClosingElement(): XMLNode {
    const token = this.currentToken();
    this.advance();
    
    const { name, attributes } = this.parseTagContent(token.value);
    
    return {
      type: 'element',
      name,
      attributes,
      children: []
    };
  }

  /**
   * Ignore un élément (pour les éléments supplémentaires)
   */
  private skipElement(): void {
    const openTag = this.currentToken();
    this.advance();
    
    const { name } = this.parseTagContent(openTag.value);
    let depth = 1;
    
    while (this.position < this.tokens.length && depth > 0) {
      const token = this.currentToken();
      
      switch (token.type) {
        case 'OPEN_TAG':
        case 'SELF_CLOSING_TAG':
          depth++;
          break;
        case 'CLOSE_TAG':
          const closeTagName = this.extractTagName(token.value);
          if (closeTagName === name) {
            depth--;
          }
          break;
        case 'EOF':
          throw new Error(`Élément non fermé: ${name}`);
      }
      
      this.advance();
    }
  }

  /**
   * Extrait le nom d'un tag
   */
  private extractTagName(tagContent: string): string {
    // Enlever </ et >
    const content = tagContent.replace(/^<\/?|>$/g, '');
    return content.split(/\s+/)[0];
  }

  /**
   * Extrait le contenu d'une section CDATA
   */
  private extractCDATAContent(cdataContent: string): string {
    return cdataContent.replace(/^<!\[CDATA\[|\]\]>$/g, '');
  }

  /**
   * Obtient le token actuel
   */
  private currentToken(): XMLToken {
    if (this.position >= this.tokens.length) {
      return { type: 'EOF', value: '', position: this.position };
    }
    return this.tokens[this.position];
  }

  /**
   * Avance la position
   */
  private advance(): void {
    this.position++;
  }

  /**
   * Convertit le document XML en objet JavaScript
   */
  toObject(): any {
    if (!this.document.root) {
      return {};
    }
    
    return this.nodeToObject(this.document.root);
  }

  /**
   * Convertit un nœud XML en objet JavaScript
   */
  private nodeToObject(node: XMLNode): any {
    if (node.type === 'text') {
      return node.value;
    }
    
    if (node.type === 'cdata') {
      return node.value;
    }
    
    if (node.type === 'element') {
      const result: any = {};
      
      // Ajouter les attributs
      if (node.attributes) {
        for (const [key, value] of Object.entries(node.attributes)) {
          result[`@${key}`] = value;
        }
      }
      
      // Traiter les enfants
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (child.type === 'text' || child.type === 'cdata') {
            // Texte simple
            if (result._text) {
              if (Array.isArray(result._text)) {
                result._text.push(child.value);
              } else {
                result._text = [result._text, child.value];
              }
            } else {
              result._text = child.value;
            }
          } else if (child.type === 'element') {
            // Élément enfant
            const childObj = this.nodeToObject(child);
            
            if (result[child.name!]) {
              // Élément déjà présent, créer un tableau
              if (Array.isArray(result[child.name!])) {
                result[child.name!].push(childObj);
              } else {
                result[child.name!] = [result[child.name!], childObj];
              }
            } else {
              result[child.name!] = childObj;
            }
          }
        }
      }
      
      return result;
    }
    
    return node.value;
  }

  /**
   * Debug: affiche la structure du document
   */
  debugDocument(): void {
    console.log('📊 Structure XML:');
    this.debugNode(this.document.root, 0);
  }

  /**
   * Debug: affiche un nœud
   */
  private debugNode(node: XMLNode | undefined, depth: number): void {
    if (!node) return;
    
    const indent = '  '.repeat(depth);
    
    if (node.type === 'element') {
      console.log(`${indent}<${node.name}>`);
      if (node.attributes) {
        for (const [key, value] of Object.entries(node.attributes)) {
          console.log(`${indent}  @${key}="${value}"`);
        }
      }
      if (node.children) {
        for (const child of node.children) {
          this.debugNode(child, depth + 1);
        }
      }
      console.log(`${indent}</${node.name}>`);
    } else if (node.type === 'text') {
      console.log(`${indent}"${node.value}"`);
    } else if (node.type === 'cdata') {
      console.log(`${indent}<![CDATA[${node.value}]]>`);
    }
  }
}