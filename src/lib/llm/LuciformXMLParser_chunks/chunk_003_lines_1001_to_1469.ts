/**
 * LuciformXMLParser - Chunk 3/3
 * 
 * Lignes 1001 à 1469 du parser original
 * 
 * ⚠️ ATTENTION: Ce fichier est un chunk du parser original.
 * Ne pas modifier directement - utiliser le fichier principal.
 */


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