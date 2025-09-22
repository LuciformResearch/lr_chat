/**
 * LangChainOutputParser - Parser professionnel utilisant LangChain
 * 
 * Remplace le parsing JSON maison par des outils professionnels
 * - OutputParser de LangChain pour JSON
 * - Gestion robuste des formats LLM
 * - Parsing intelligent et fiable
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

export interface ParsedLLMResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rawResponse?: string;
  metadata?: {
    parser: string;
    timestamp: string;
    confidence: number;
  };
}

export interface CodeAnalysisResult {
  summary: string;
  complexity: number;
  maintainability: number;
  patterns: string[];
  recommendations: string[];
  quality: number;
}

export interface CompressionResult {
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

export class LangChainOutputParser {
  private jsonParser: JsonOutputParser;
  private codeAnalysisParser: StructuredOutputParser<CodeAnalysisResult>;
  private compressionParser: StructuredOutputParser<CompressionResult>;

  constructor() {
    // Parser JSON générique
    this.jsonParser = new JsonOutputParser();
    
    // Parser pour l'analyse de code
    this.codeAnalysisParser = StructuredOutputParser.fromZodSchema(
      z.object({
        summary: z.string().describe('Résumé de l\'analyse du code'),
        complexity: z.number().min(1).max(10).describe('Complexité du code (1-10)'),
        maintainability: z.number().min(1).max(10).describe('Maintenabilité du code (1-10)'),
        patterns: z.array(z.string()).describe('Patterns détectés dans le code'),
        recommendations: z.array(z.string()).describe('Recommandations d\'amélioration'),
        quality: z.number().min(1).max(10).describe('Qualité globale du code (1-10)')
      })
    );
    
    // Parser pour la compression
    this.compressionParser = StructuredOutputParser.fromZodSchema(
      z.object({
        groups: z.array(z.object({
          id: z.string().describe('Identifiant unique du groupe'),
          name: z.string().describe('Nom du groupe'),
          files: z.array(z.string()).describe('Fichiers dans ce groupe'),
          description: z.string().describe('Description du groupe')
        })).describe('Groupes de fichiers compressés'),
        compressionRatio: z.number().min(0).max(100).describe('Ratio de compression (0-100%)'),
        quality: z.number().min(1).max(10).describe('Qualité de la compression (1-10)'),
        insights: z.array(z.string()).describe('Insights sur la compression')
      })
    );
    
    console.log('🔧 LangChain Output Parser initialisé');
  }

  /**
   * Parse une réponse LLM en JSON générique
   */
  async parseJSONResponse<T = any>(llmResponse: string): Promise<ParsedLLMResponse<T>> {
    try {
      console.log('🔍 Parsing JSON avec LangChain...');
      
      // Nettoyer la réponse (enlever les markdown fences)
      const cleanedResponse = this.cleanMarkdownFences(llmResponse);
      
      // Parser avec LangChain
      const parsedData = await this.jsonParser.parse(cleanedResponse);
      
      console.log('✅ JSON parsé avec succès par LangChain');
      
      return {
        success: true,
        data: parsedData as T,
        rawResponse: llmResponse,
        metadata: {
          parser: 'LangChain JsonOutputParser',
          timestamp: new Date().toISOString(),
          confidence: 0.95
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur parsing JSON LangChain:', error);
      
      return {
        success: false,
        error: error.toString(),
        rawResponse: llmResponse,
        metadata: {
          parser: 'LangChain JsonOutputParser',
          timestamp: new Date().toISOString(),
          confidence: 0.0
        }
      };
    }
  }

  /**
   * Parse une réponse LLM pour l'analyse de code
   */
  async parseCodeAnalysisResponse(llmResponse: string): Promise<ParsedLLMResponse<CodeAnalysisResult>> {
    try {
      console.log('🔍 Parsing analyse de code avec LangChain...');
      
      const cleanedResponse = this.cleanMarkdownFences(llmResponse);
      const parsedData = await this.codeAnalysisParser.parse(cleanedResponse);
      
      console.log('✅ Analyse de code parsée avec succès');
      
      return {
        success: true,
        data: parsedData,
        rawResponse: llmResponse,
        metadata: {
          parser: 'LangChain StructuredOutputParser (CodeAnalysis)',
          timestamp: new Date().toISOString(),
          confidence: 0.9
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur parsing analyse de code:', error);
      
      return {
        success: false,
        error: error.toString(),
        rawResponse: llmResponse,
        metadata: {
          parser: 'LangChain StructuredOutputParser (CodeAnalysis)',
          timestamp: new Date().toISOString(),
          confidence: 0.0
        }
      };
    }
  }

  /**
   * Parse une réponse LLM pour la compression
   */
  async parseCompressionResponse(llmResponse: string): Promise<ParsedLLMResponse<CompressionResult>> {
    try {
      console.log('🔍 Parsing compression avec LangChain...');
      
      const cleanedResponse = this.cleanMarkdownFences(llmResponse);
      const parsedData = await this.compressionParser.parse(cleanedResponse);
      
      console.log('✅ Compression parsée avec succès');
      
      return {
        success: true,
        data: parsedData,
        rawResponse: llmResponse,
        metadata: {
          parser: 'LangChain StructuredOutputParser (Compression)',
          timestamp: new Date().toISOString(),
          confidence: 0.9
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur parsing compression:', error);
      
      return {
        success: false,
        error: error.toString(),
        rawResponse: llmResponse,
        metadata: {
          parser: 'LangChain StructuredOutputParser (Compression)',
          timestamp: new Date().toISOString(),
          confidence: 0.0
        }
      };
    }
  }

  /**
   * Parse une réponse LLM avec fallback intelligent
   */
  async parseWithFallback<T = any>(llmResponse: string, expectedType?: 'json' | 'codeAnalysis' | 'compression'): Promise<ParsedLLMResponse<T>> {
    console.log('🔄 Parsing avec fallback intelligent...');
    
    // Essayer d'abord le parser spécifique
    if (expectedType === 'codeAnalysis') {
      const result = await this.parseCodeAnalysisResponse(llmResponse);
      if (result.success) return result as ParsedLLMResponse<T>;
    } else if (expectedType === 'compression') {
      const result = await this.parseCompressionResponse(llmResponse);
      if (result.success) return result as ParsedLLMResponse<T>;
    }
    
    // Fallback vers le parser JSON générique
    const jsonResult = await this.parseJSONResponse<T>(llmResponse);
    if (jsonResult.success) {
      console.log('✅ Fallback JSON réussi');
      return jsonResult;
    }
    
    // Dernier recours : parsing manuel basique
    console.log('⚠️ Tentative de parsing manuel basique...');
    return this.basicManualParse<T>(llmResponse);
  }

  /**
   * Nettoyage des fences Markdown et caractères de contrôle
   */
  private cleanMarkdownFences(text: string): string {
    // Enlever les fences markdown (```json, ```, etc.)
    let cleaned = text
      .replace(/^```[a-zA-Z]*\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();
    
    // Nettoyer les caractères de contrôle problématiques
    cleaned = cleaned
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Remplacer caractères de contrôle par espaces
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' '); // Nettoyer caractères Unicode de contrôle
    
    return cleaned;
  }

  /**
   * Parsing manuel basique en dernier recours
   */
  private basicManualParse<T = any>(text: string): ParsedLLMResponse<T> {
    try {
      // Nettoyer le texte
      const cleaned = this.cleanMarkdownFences(text);
      
      // Essayer de trouver du JSON dans le texte
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        return {
          success: true,
          data: parsed as T,
          rawResponse: text,
          metadata: {
            parser: 'Basic Manual Parse',
            timestamp: new Date().toISOString(),
            confidence: 0.5
          }
        };
      }
      
      throw new Error('Aucun JSON trouvé dans la réponse');
      
    } catch (error) {
      return {
        success: false,
        error: error.toString(),
        rawResponse: text,
        metadata: {
          parser: 'Basic Manual Parse',
          timestamp: new Date().toISOString(),
          confidence: 0.0
        }
      };
    }
  }

  /**
   * Obtient les statistiques du parser
   */
  getParserStats(): any {
    return {
      parsers: [
        'JsonOutputParser',
        'StructuredOutputParser (CodeAnalysis)',
        'StructuredOutputParser (Compression)',
        'Basic Manual Parse'
      ],
      features: [
        'Parsing JSON robuste',
        'Validation avec Zod schemas',
        'Fallback intelligent',
        'Gestion des erreurs',
        'Nettoyage automatique des fences'
      ],
      confidence: {
        json: 0.95,
        codeAnalysis: 0.9,
        compression: 0.9,
        fallback: 0.5
      }
    };
  }
}