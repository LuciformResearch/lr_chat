/**
 * LLMResponsePreprocessor - Pré-processeur pour les réponses LLM
 * 
 * Gère les cas spécifiques aux réponses LLM :
 * - Markdown fences (```xml, ```)
 * - Texte en dehors de l'élément racine
 * - Espaces et retours à la ligne
 * - Commentaires LLM
 */

export class LLMResponsePreprocessor {
  /**
   * Prépare une réponse LLM pour le parsing XML
   */
  static preprocessLLMResponse(response: string): string {
    let cleaned = response.trim();
    
    // 1. Supprimer les markdown fences
    cleaned = this.removeMarkdownFences(cleaned);
    
    // 2. Supprimer le texte en dehors de l'élément racine
    cleaned = this.extractRootElement(cleaned);
    
    // 3. Nettoyer les espaces et retours à la ligne
    cleaned = this.cleanWhitespace(cleaned);
    
    return cleaned;
  }
  
  /**
   * Supprime les markdown fences
   */
  private static removeMarkdownFences(text: string): string {
    // Supprimer ```xml au début
    text = text.replace(/^```xml\s*\n?/i, '');
    // Supprimer ``` à la fin
    text = text.replace(/\n?```\s*$/i, '');
    // Supprimer ``` au milieu (cas où il y en a plusieurs)
    text = text.replace(/```/g, '');
    
    return text;
  }
  
  /**
   * Extrait l'élément racine XML
   */
  private static extractRootElement(text: string): string {
    // Trouver le premier < qui commence un élément XML
    const firstOpen = text.indexOf('<');
    if (firstOpen === -1) {
      return text; // Pas d'élément XML trouvé
    }
    
    // Trouver le nom de l'élément racine
    const tagMatch = text.substring(firstOpen).match(/^<([a-zA-Z_][a-zA-Z0-9_-]*)/);
    if (!tagMatch) {
      return text; // Pas d'élément valide trouvé
    }
    
    const rootTagName = tagMatch[1];
    
    // Trouver la fermeture correspondante
    const rootElement = this.extractElement(text, rootTagName, firstOpen);
    
    return rootElement;
  }
  
  /**
   * Extrait un élément XML complet (avec ses enfants)
   */
  private static extractElement(text: string, tagName: string, startPos: number): string {
    let depth = 0;
    let pos = startPos;
    let inTag = false;
    let inAttribute = false;
    let inQuotes = false;
    let quoteChar = '';
    
    while (pos < text.length) {
      const char = text[pos];
      const nextChar = pos + 1 < text.length ? text[pos + 1] : '';
      
      if (char === '"' || char === "'") {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        }
      } else if (!inQuotes) {
        if (char === '<') {
          if (nextChar === '/') {
            // Tag de fermeture
            const closeTagMatch = text.substring(pos).match(/^<\/([a-zA-Z_][a-zA-Z0-9_-]*)\s*>/);
            if (closeTagMatch && closeTagMatch[1] === tagName) {
              depth--;
              if (depth === 0) {
                // Fin de l'élément racine
                return text.substring(startPos, pos + closeTagMatch[0].length);
              }
            }
          } else {
            // Tag d'ouverture
            const openTagMatch = text.substring(pos).match(/^<([a-zA-Z_][a-zA-Z0-9_-]*)/);
            if (openTagMatch) {
              if (openTagMatch[1] === tagName) {
                depth++;
              } else {
                // Élément enfant
                depth++;
              }
            }
          }
        }
      }
      
      pos++;
    }
    
    // Si on arrive ici, l'élément n'est pas fermé correctement
    // Retourner ce qu'on a trouvé
    return text.substring(startPos);
  }
  
  /**
   * Nettoie les espaces et retours à la ligne
   */
  private static cleanWhitespace(text: string): string {
    // Supprimer les espaces en début et fin
    text = text.trim();
    
    // Normaliser les retours à la ligne
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');
    
    // Supprimer les espaces multiples
    text = text.replace(/[ \t]+/g, ' ');
    
    // Supprimer les retours à la ligne multiples
    text = text.replace(/\n\s*\n/g, '\n');
    
    return text;
  }
  
  /**
   * Valide qu'une chaîne contient du XML valide
   */
  static isValidXML(text: string): boolean {
    const cleaned = this.preprocessLLMResponse(text);
    
    // Vérifications basiques
    if (!cleaned.includes('<') || !cleaned.includes('>')) {
      return false;
    }
    
    // Vérifier qu'il y a au moins un élément
    const elementMatch = cleaned.match(/<[a-zA-Z_][a-zA-Z0-9_-]*/);
    if (!elementMatch) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Extrait le nom de l'élément racine
   */
  static getRootElementName(text: string): string | null {
    const cleaned = this.preprocessLLMResponse(text);
    const match = cleaned.match(/<([a-zA-Z_][a-zA-Z0-9_-]*)/);
    return match ? match[1] : null;
  }
}