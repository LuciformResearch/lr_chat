/**
 * XMLParserImproved - Parser XML inspiré du parser Luciform
 * 
 * Utilise les concepts du parser Luciform pour un parsing plus robuste :
 * - Tokenizer sans regex (boucles pures)
 * - Pile pour gérer la hiérarchie
 * - Gestion simple des attributs
 * - Structure de données claire
 */

export interface XMLToken {
  type: 'comment' | 'tag_open' | 'tag_close' | 'text' | 'cdata' | 'declaration';
  content?: string;
  tag_name?: string;
  attrs?: Record<string, string>;
  position?: number;
}

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

export class XMLParserImproved {
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
    
    // Tokenizer sans regex
    this.tokens = this.simpleXMLTokenizer(cleanedXML);
    this.position = 0;
    this.document = { comments: [] };

    console.log('🔍 Parsing XML avec tokenizer amélioré...');
    console.log(`   Tokens: ${this.tokens.length}`);
    
    // Parser avec pile
    this.parseDocumentWithStack();
    
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
   * Tokenizer XML simple sans regex (inspiré du parser Luciform)
   */
  private simpleXMLTokenizer(content: string): XMLToken[] {
    const tokens: XMLToken[] = [];
    let i = 0;
    const contentLen = content.length;

    while (i < contentLen) {
      if (content[i] === '<') {
        // Début d'une balise, commentaire, ou CDATA
        if (i + 4 < contentLen && content.substring(i, i+4) === '<!--') {
          // Commentaire
          const endComment = content.indexOf('-->', i + 4);
          if (endComment !== -1) {
            const commentContent = content.substring(i+4, endComment);
            tokens.push({
              type: 'comment',
              content: commentContent.trim(),
              position: i
            });
            i = endComment + 3;
          } else {
            // Commentaire mal formé, traiter comme texte
            tokens.push({
              type: 'text',
              content: content[i],
              position: i
            });
            i++;
          }
        } else if (i + 9 < contentLen && content.substring(i, i+9) === '<![CDATA[') {
          // Section CDATA
          const endCDATA = content.indexOf(']]>', i + 9);
          if (endCDATA !== -1) {
            const cdataContent = content.substring(i+9, endCDATA);
            tokens.push({
              type: 'cdata',
              content: cdataContent,
              position: i
            });
            i = endCDATA + 3;
          } else {
            // CDATA mal formé, traiter comme texte
            tokens.push({
              type: 'text',
              content: content[i],
              position: i
            });
            i++;
          }
        } else if (i + 5 < contentLen && content.substring(i, i+5) === '<?xml') {
          // Déclaration XML
          const endDecl = content.indexOf('?>', i + 5);
          if (endDecl !== -1) {
            const declContent = content.substring(i, endDecl + 2);
            tokens.push({
              type: 'declaration',
              content: declContent,
              position: i
            });
            i = endDecl + 2;
          } else {
            // Déclaration mal formée, traiter comme texte
            tokens.push({
              type: 'text',
              content: content[i],
              position: i
            });
            i++;
          }
        } else {
          // Balise normale - vérifier si c'est un vrai tag XML
          const endTag = content.indexOf('>', i);
          if (endTag !== -1) {
            const tagContent = content.substring(i+1, endTag);
            
            // Vérifier si c'est un vrai tag XML (commence par une lettre ou underscore)
            if (tagContent.match(/^[a-zA-Z_]/)) {
              if (tagContent.startsWith('/')) {
                // Balise fermante
                const tagName = tagContent.substring(1).trim();
                tokens.push({
                  type: 'tag_close',
                  tag_name: tagName,
                  position: i
                });
              } else {
                // Balise ouvrante
                const { name, attributes } = this.parseTagContent(tagContent);
                tokens.push({
                  type: 'tag_open',
                  tag_name: name,
                  attrs: attributes,
                  position: i
                });
              }

              i = endTag + 1;
            } else {
              // Ce n'est pas un vrai tag XML, traiter comme texte
              tokens.push({
                type: 'text',
                content: content[i],
                position: i
              });
              i++;
            }
          } else {
            // Balise mal formée, traiter comme texte
            tokens.push({
              type: 'text',
              content: content[i],
              position: i
            });
            i++;
          }
        }
      } else {
        // Texte normal
        const textStart = i;
        while (i < contentLen && content[i] !== '<') {
          i++;
        }

        const textContent = content.substring(textStart, i);
        if (textContent.trim()) {
          tokens.push({
            type: 'text',
            content: textContent.trim(),
            position: textStart
          });
        }
      }
    }

    return tokens;
  }

  /**
   * Parse le contenu d'un tag (nom + attributs) sans regex
   */
  private parseTagContent(tagContent: string): { name: string; attributes: Record<string, string> } {
    const parts = tagContent.split(/\s+/);
    const name = parts[0] || '';
    let attributes: Record<string, string> = {};

    if (parts.length > 1) {
      const attrString = parts.slice(1).join(' ');
      attributes = this.parseSimpleAttributes(attrString);
    }

    return { name, attributes };
  }

  /**
   * Parse simple des attributs XML sans regex (inspiré du parser Luciform)
   */
  private parseSimpleAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    let i = 0;
    const attrLen = attrString.length;

    while (i < attrLen) {
      // Ignorer les espaces
      while (i < attrLen && attrString[i].trim() === '') {
        i++;
      }

      if (i >= attrLen) {
        break;
      }

      // Lire le nom de l'attribut
      const keyStart = i;
      while (i < attrLen && !['=', ' ', '\t', '\n'].includes(attrString[i])) {
        i++;
      }

      if (i === keyStart) {
        break;
      }

      const key = attrString.substring(keyStart, i);

      // Ignorer les espaces et chercher '='
      while (i < attrLen && [' ', '\t', '\n'].includes(attrString[i])) {
        i++;
      }

      if (i >= attrLen || attrString[i] !== '=') {
        break;
      }

      i++; // Passer le '='

      // Ignorer les espaces après '='
      while (i < attrLen && [' ', '\t', '\n'].includes(attrString[i])) {
        i++;
      }

      if (i >= attrLen) {
        break;
      }

      // Lire la valeur (entre guillemets)
      if (attrString[i] === '"') {
        i++; // Passer le '"' d'ouverture
        const valueStart = i;
        while (i < attrLen && attrString[i] !== '"') {
          i++;
        }

        if (i < attrLen) {
          const value = attrString.substring(valueStart, i);
          attrs[key] = value;
          i++; // Passer le '"' de fermeture
        }
      } else {
        // Valeur sans guillemets (jusqu'au prochain espace)
        const valueStart = i;
        while (i < attrLen && ![' ', '\t', '\n'].includes(attrString[i])) {
          i++;
        }

        const value = attrString.substring(valueStart, i);
        attrs[key] = value;
      }
    }

    return attrs;
  }

  /**
   * Parse le document XML avec une pile (inspiré du parser Luciform)
   */
  private parseDocumentWithStack(): void {
    const stack: XMLNode[] = [{ type: 'element', name: 'root', children: [] }];

    while (this.position < this.tokens.length) {
      const token = this.tokens[this.position];

      switch (token.type) {
        case 'declaration':
          this.document.declaration = {
            type: 'declaration',
            value: token.content
          };
          break;

        case 'comment':
          const commentNode: XMLNode = {
            type: 'comment',
            value: token.content
          };
          this.document.comments.push(commentNode);
          stack[stack.length - 1].children!.push(commentNode);
          break;

        case 'tag_open':
          const elementNode: XMLNode = {
            type: 'element',
            name: token.tag_name,
            attributes: token.attrs,
            children: []
          };
          stack.push(elementNode);
          break;

        case 'tag_close':
          if (stack.length > 1) {
            const closedNode = stack.pop()!;
            // Vérifier que le tag de fermeture correspond au tag d'ouverture
            if (closedNode.name === token.tag_name) {
              stack[stack.length - 1].children!.push(closedNode);
            } else {
              console.log(`⚠️ Tag de fermeture inattendu: ${token.tag_name}, attendu: ${closedNode.name}`);
              // Remettre le nœud sur la pile
              stack.push(closedNode);
            }
          }
          break;

        case 'text':
          if (token.content && token.content.trim()) {
            const textNode: XMLNode = {
              type: 'text',
              value: token.content
            };
            stack[stack.length - 1].children!.push(textNode);
          }
          break;

        case 'cdata':
          const cdataNode: XMLNode = {
            type: 'cdata',
            value: token.content
          };
          stack[stack.length - 1].children!.push(cdataNode);
          break;
      }

      this.position++;
    }

    // Le résultat final est le premier enfant du nœud racine
    console.log('🔍 Fin de parsing - Stack:', stack.length, 'éléments');
    console.log('🔍 Nœud root artificiel:', stack[0].name, 'avec', stack[0].children?.length || 0, 'enfants');
    
    if (stack.length === 1 && stack[0].children && stack[0].children.length > 0) {
      // Prendre le premier enfant réel (pas le nœud root artificiel)
      this.document.root = stack[0].children[0];
      console.log('🔍 Racine finale:', this.document.root.name, this.document.root.type);
    } else {
      this.document.root = stack[0];
      console.log('🔍 Racine finale (fallback):', this.document.root.name, this.document.root.type);
    }
  }

  /**
   * Convertit le document XML en objet JavaScript
   */
  toObject(): any {
    if (!this.document.root) {
      console.log('❌ Pas de racine dans le document');
      return {};
    }
    
    console.log('🔍 Racine trouvée:', this.document.root.name, this.document.root.type);
    console.log('🔍 Enfants de la racine:', this.document.root.children?.length || 0);
    
    const result = this.nodeToObject(this.document.root);
    console.log('🔍 Résultat de conversion:', Object.keys(result));
    
    return result;
  }

  /**
   * Convertit un nœud XML en objet JavaScript
   */
  private nodeToObject(node: XMLNode): any {
    if (node.type === 'text' || node.type === 'cdata') {
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
            // Texte simple - l'ajouter directement au résultat
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
            
            // Si l'enfant n'a que du texte, l'ajouter directement
            if (typeof childObj === 'string') {
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
            } else {
              // Objet complexe
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
      }
      
      return result;
    }
    
    return node.value;
  }

  /**
   * Debug: affiche la structure du document
   */
  debugDocument(): void {
    console.log('📊 Structure XML (améliorée):');
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

  /**
   * Debug: affiche les tokens
   */
  debugTokens(): void {
    console.log('🔍 Tokens XML (améliorés):');
    for (const token of this.tokens) {
      console.log(`  ${token.type}: "${token.content || token.tag_name}" (pos: ${token.position})`);
    }
  }
}