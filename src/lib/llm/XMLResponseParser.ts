/**
 * XMLResponseParser - Parser XML robuste pour les réponses LLM
 * 
 * Avantages par rapport à JSON :
 * - CDATA sections pour le code avec caractères spéciaux
 * - Échappement XML robuste
 * - Structure hiérarchique naturelle
 * - Parsing mature et fiable
 */

import * as fs from 'fs';
import { LuciformXMLParser } from './LuciformXMLParser';

export interface XMLParsedResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rawResponse?: string;
  metadata?: {
    parser: string;
    timestamp: string;
    confidence: number;
    xmlValid: boolean;
  };
}

export interface CodeAnalysisXML {
  name: string;
  purpose: string;
  summary_bullets: string[];
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  risks: string[];
  complexity: 'low' | 'medium' | 'high';
  test_ideas: string[];
  docstring_suggestion: string;
  tags: string[];
}

export interface CompressionXML {
  groups: Array<{
    id: string;
    name: string;
    files: string[];
    description: string;
  }>;
  compressionRatio: number;
  quality: number;
  insights: string[];
}

export class XMLResponseParser {
  private formatHistory: Array<{
    timestamp: string;
    format: string;
    success: boolean;
    complexity: number;
  }> = [];
  private xmlParser: LuciformXMLParser;

  constructor() {
    console.log('🔧 XML Response Parser initialisé avec LuciformXMLParser');
  }

  /**
   * Parse une réponse LLM en XML
   */
  async parseXMLResponse<T = any>(llmResponse: string): Promise<XMLParsedResponse<T>> {
    try {
      console.log('🔍 Parsing XML avec parser robuste...');
      
      // Nettoyer la réponse (enlever les markdown fences)
      const cleanedResponse = this.cleanMarkdownFences(llmResponse);
      
      // Parser XML
      const parsedData = await this.parseXML(cleanedResponse);
      
      console.log('✅ XML parsé avec succès');
      
      return {
        success: true,
        data: parsedData as T,
        rawResponse: llmResponse,
        metadata: {
          parser: 'XMLResponseParser',
          timestamp: new Date().toISOString(),
          confidence: 0.95,
          xmlValid: true
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur parsing XML:', error);
      
      return {
        success: false,
        error: error.toString(),
        rawResponse: llmResponse,
        metadata: {
          parser: 'XMLResponseParser',
          timestamp: new Date().toISOString(),
          confidence: 0.0,
          xmlValid: false
        }
      };
    }
  }

  /**
   * Parse une réponse LLM pour l'analyse de code en XML
   */
  async parseCodeAnalysisXML(llmResponse: string): Promise<XMLParsedResponse<CodeAnalysisXML>> {
    try {
      console.log('🔍 Parsing analyse de code en XML...');
      
      const cleanedResponse = this.cleanMarkdownFences(llmResponse);
      console.log('🧹 XML nettoyé:', cleanedResponse.substring(0, 200) + '...');
      
      const parsedData = await this.parseXML(cleanedResponse);
      console.log('📊 Données XML parsées:', Object.keys(parsedData));
      
      // Extraire les données du code_analysis
      const codeAnalysisData = parsedData.code_analysis || parsedData;
      console.log('🔍 Données code_analysis:', Object.keys(codeAnalysisData));
      
      // Convertir en structure CodeAnalysisXML
      const codeAnalysis: CodeAnalysisXML = {
        name: this.extractText(codeAnalysisData, 'name') || 'unknown',
        purpose: this.extractText(codeAnalysisData, 'purpose') || '',
        summary_bullets: this.extractArray(codeAnalysisData, 'summary_bullets'),
        inputs: this.extractArray(codeAnalysisData, 'inputs'),
        outputs: this.extractArray(codeAnalysisData, 'outputs'),
        dependencies: this.extractArray(codeAnalysisData, 'dependencies'),
        risks: this.extractArray(codeAnalysisData, 'risks'),
        complexity: this.extractComplexity(codeAnalysisData),
        test_ideas: this.extractArray(codeAnalysisData, 'test_ideas'),
        docstring_suggestion: this.extractText(codeAnalysisData, 'docstring_suggestion') || '',
        tags: this.extractArray(codeAnalysisData, 'tags')
      };
      
      console.log('✅ Analyse de code XML parsée avec succès');
      console.log('📋 Résultat:', {
        name: codeAnalysis.name,
        purpose: codeAnalysis.purpose,
        summary_bullets: codeAnalysis.summary_bullets.length,
        dependencies: codeAnalysis.dependencies.length,
        risks: codeAnalysis.risks.length,
        tags: codeAnalysis.tags.length
      });
      
      return {
        success: true,
        data: codeAnalysis,
        rawResponse: llmResponse,
        metadata: {
          parser: 'XMLResponseParser (CodeAnalysis)',
          timestamp: new Date().toISOString(),
          confidence: 0.9,
          xmlValid: true
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur parsing analyse de code XML:', error);
      
      return {
        success: false,
        error: error.toString(),
        rawResponse: llmResponse,
        metadata: {
          parser: 'XMLResponseParser (CodeAnalysis)',
          timestamp: new Date().toISOString(),
          confidence: 0.0,
          xmlValid: false
        }
      };
    }
  }

  /**
   * Parse une réponse LLM pour la compression en XML
   */
  async parseCompressionXML(llmResponse: string): Promise<XMLParsedResponse<CompressionXML>> {
    try {
      console.log('🔍 Parsing compression en XML...');
      
      const cleanedResponse = this.cleanMarkdownFences(llmResponse);
      const parsedData = await this.parseXML(cleanedResponse);
      
      // Convertir en structure CompressionXML
      const compression: CompressionXML = {
        groups: this.extractGroups(parsedData),
        compressionRatio: this.extractNumber(parsedData, 'compressionRatio') || 0,
        quality: this.extractNumber(parsedData, 'quality') || 0,
        insights: this.extractArray(parsedData, 'insights')
      };
      
      console.log('✅ Compression XML parsée avec succès');
      
      return {
        success: true,
        data: compression,
        rawResponse: llmResponse,
        metadata: {
          parser: 'XMLResponseParser (Compression)',
          timestamp: new Date().toISOString(),
          confidence: 0.9,
          xmlValid: true
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur parsing compression XML:', error);
      
      return {
        success: false,
        error: error.toString(),
        rawResponse: llmResponse,
        metadata: {
          parser: 'XMLResponseParser (Compression)',
          timestamp: new Date().toISOString(),
          confidence: 0.0,
          xmlValid: false
        }
      };
    }
  }

  /**
   * Parse XML avec le LuciformXMLParser
   */
  private async parseXML(xmlContent: string): Promise<any> {
    try {
      console.log('🔍 Parsing XML avec LuciformXMLParser...');
      
      // Utiliser le LuciformXMLParser
      const parser = new LuciformXMLParser(xmlContent);
      const result = parser.parse();
      
      if (!result.success || !result.document) {
        throw new Error('Parsing XML échoué');
      }
      
      // Convertir le document XML en objet JavaScript
      const xmlObject = this.xmlDocumentToObject(result.document);
      
      console.log('✅ XML parsé avec succès par LuciformXMLParser');
      return xmlObject;
      
    } catch (error) {
      console.error('❌ Erreur parsing XML avec LuciformXMLParser:', error);
      throw error;
    }
  }

  /**
   * Convertit un XMLDocument en objet JavaScript
   */
  private xmlDocumentToObject(document: any): any {
    if (!document.root) {
      return {};
    }
    
    return this.xmlElementToObject(document.root);
  }

  /**
   * Convertit un XMLElement en objet JavaScript
   */
  private xmlElementToObject(element: any): any {
    const obj: any = {};
    
    // Ajouter les attributs
    if (element.attributes && element.attributes.size > 0) {
      for (const [key, value] of element.attributes) {
        obj[key] = value;
      }
    }
    
    // Traiter les enfants
    if (element.children && element.children.length > 0) {
      const children: any = {};
      const textContent: string[] = [];
      
      for (const child of element.children) {
        if (child.type === 'text') {
          const text = child.content.trim();
          if (text) {
            textContent.push(text);
          }
        } else if (child.type === 'element' || child.name) {
          const childName = child.name;
          const childObj = this.xmlElementToObject(child);
          
          // Si l'enfant n'a que du texte, utiliser directement le texte
          if (childObj._text && Object.keys(childObj).length === 1) {
            const value = childObj._text;
            if (children[childName]) {
              // Si l'élément existe déjà, créer un tableau
              if (Array.isArray(children[childName])) {
                children[childName].push(value);
              } else {
                children[childName] = [children[childName], value];
              }
            } else {
              children[childName] = value;
            }
          } else {
            // Enfant complexe, garder la structure
            if (children[childName]) {
              if (Array.isArray(children[childName])) {
                children[childName].push(childObj);
              } else {
                children[childName] = [children[childName], childObj];
              }
            } else {
              children[childName] = childObj;
            }
          }
        }
      }
      
      // Fusionner les enfants et le contenu texte
      if (textContent.length > 0) {
        obj._text = textContent.join(' ');
      }
      
      Object.assign(obj, children);
    }
    
    return obj;
  }


  /**
   * Nettoyage des fences Markdown et déclarations XML
   */
  private cleanMarkdownFences(text: string): string {
    return text
      .replace(/^```xml\s*\n?/gm, '')
      .replace(/^```\s*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .replace(/^<\?xml[^>]*\?>\s*/gm, '') // Enlever les déclarations XML
      .trim();
  }

  /**
   * Extraire du texte d'un objet XML parsé
   */
  private extractText(obj: any, key: string): string {
    const value = obj[key];
    if (typeof value === 'string') {
      return value.trim();
    }
    return '';
  }

  /**
   * Extraire un tableau d'un objet XML parsé
   */
  private extractArray(obj: any, key: string): string[] {
    const value = obj[key];
    console.log(`🔍 Extraction array pour ${key}:`, typeof value, value);
    
    if (Array.isArray(value)) {
      return value.map(v => {
        if (typeof v === 'object' && v !== null) {
          // Si c'est un objet, extraire le contenu textuel
          return this.extractTextFromObject(v);
        }
        return String(v).trim();
      }).filter(v => v);
    }
    if (typeof value === 'string') {
      return value.split('\n').map(s => s.trim()).filter(s => s);
    }
    if (typeof value === 'object' && value !== null) {
      // Si c'est un objet avec des propriétés comme {"bullet": ["item1", "item2"]}
      // ou {"bullet": "item1"} ou {"bullet": {"item1": "value1"}}
      const keys = Object.keys(value);
      console.log(`   Clés de l'objet: [${keys.join(', ')}]`);
      
      if (keys.length === 1) {
        const firstKey = keys[0];
        const firstValue = value[firstKey];
        console.log(`   Première clé: ${firstKey}, valeur:`, typeof firstValue, firstValue);
        
        if (Array.isArray(firstValue)) {
          return firstValue.map(v => {
            if (typeof v === 'object' && v !== null) {
              return this.extractTextFromObject(v);
            }
            return String(v).trim();
          }).filter(v => v);
        } else if (typeof firstValue === 'string') {
          return [firstValue.trim()];
        } else if (typeof firstValue === 'object') {
          return Object.keys(firstValue).map(k => String(k).trim()).filter(v => v);
        }
      }
      // Si c'est un objet complexe, extraire toutes les valeurs
      return Object.values(value).map(v => {
        if (typeof v === 'object' && v !== null) {
          return this.extractTextFromObject(v);
        }
        return String(v).trim();
      }).filter(v => v);
    }
    return [];
  }

  /**
   * Extraire le texte d'un objet XML
   */
  private extractTextFromObject(obj: any): string {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (typeof obj === 'object' && obj !== null) {
      // Chercher le contenu textuel dans l'objet
      const textKeys = Object.keys(obj).filter(key => 
        typeof obj[key] === 'string' && !key.startsWith('_')
      );
      if (textKeys.length > 0) {
        return obj[textKeys[0]].trim();
      }
      // Si pas de clé textuelle, convertir l'objet en string
      return JSON.stringify(obj);
    }
    return String(obj).trim();
  }

  /**
   * Extraire un nombre d'un objet XML parsé
   */
  private extractNumber(obj: any, key: string): number {
    const value = obj[key];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Extraire la complexité d'un objet XML parsé
   */
  private extractComplexity(obj: any): 'low' | 'medium' | 'high' {
    const value = String(obj.complexity || '').toLowerCase();
    if (value === 'low' || value === 'medium' || value === 'high') {
      return value as 'low' | 'medium' | 'high';
    }
    return 'medium';
  }

  /**
   * Extraire les groupes d'un objet XML parsé
   */
  private extractGroups(obj: any): Array<{id: string; name: string; files: string[]; description: string}> {
    // Pour l'instant, retourner un tableau vide
    // À implémenter selon la structure XML des groupes
    return [];
  }

  /**
   * Génère un prompt XML pour l'analyse de code
   */
  static generateCodeAnalysisPrompt(): string {
    return `You are a senior code reviewer. Analyze the following code and return the result in XML format.

Return STRICT XML with the following structure:
<code_analysis>
  <name>function_or_class_name</name>
  <purpose>one sentence plain English description</purpose>
  <summary_bullets>
    <bullet>bullet point 1</bullet>
    <bullet>bullet point 2</bullet>
    <bullet>bullet point 3</bullet>
  </summary_bullets>
  <inputs>
    <input>input 1</input>
    <input>input 2</input>
  </inputs>
  <outputs>
    <output>output 1</output>
    <output>output 2</output>
  </outputs>
  <dependencies>
    <dependency>dependency 1</dependency>
    <dependency>dependency 2</dependency>
  </dependencies>
  <risks>
    <risk>risk 1</risk>
    <risk>risk 2</risk>
  </risks>
  <complexity>low|medium|high</complexity>
  <test_ideas>
    <idea>test idea 1</idea>
    <idea>test idea 2</idea>
  </test_ideas>
  <docstring_suggestion><![CDATA[docstring content with any characters]]></docstring_suggestion>
  <tags>
    <tag>tag1</tag>
    <tag>tag2</tag>
  </tags>
</code_analysis>

Use CDATA sections for any content that might contain special characters, backticks, or code snippets.`;
  }

  /**
   * Génère un prompt XML pour la compression
   */
  static generateCompressionPrompt(): string {
    return `You are a code compression expert. Analyze the following files and return the compression result in XML format.

Return STRICT XML with the following structure:
<compression_result>
  <groups>
    <group>
      <id>group1</id>
      <name>Group Name</name>
      <files>
        <file>file1.ts</file>
        <file>file2.ts</file>
      </files>
      <description><![CDATA[Group description with any characters]]></description>
    </group>
  </groups>
  <compressionRatio>75.5</compressionRatio>
  <quality>8.5</quality>
  <insights>
    <insight>insight 1</insight>
    <insight>insight 2</insight>
  </insights>
</compression_result>

Use CDATA sections for any content that might contain special characters or code snippets.`;
  }

  /**
   * Obtient les statistiques du parser
   */
  getParserStats(): any {
    return {
      parser: 'XMLResponseParser',
      features: [
        'Parsing XML robuste',
        'Gestion des CDATA sections',
        'Échappement XML automatique',
        'Structure hiérarchique',
        'Validation XML',
        'Gestion des caractères spéciaux'
      ],
      advantages: [
        'Pas de problèmes avec les backticks',
        'CDATA pour le code avec caractères spéciaux',
        'Échappement XML robuste',
        'Structure hiérarchique naturelle',
        'Parsing mature et fiable'
      ],
      confidence: {
        xml: 0.95,
        codeAnalysis: 0.9,
        compression: 0.9
      }
    };
  }
}