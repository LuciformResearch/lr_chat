/**
 * Service de génération d'embeddings pour la recherche sémantique
 * Supporte OpenAI, local (transformers.js), et Ollama
 */

import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokens?: number;
  cost?: number;
}

export interface EmbeddingProvider {
  name: string;
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  isAvailable(): boolean;
}

export class EmbeddingService {
  private providers: Map<string, EmbeddingProvider> = new Map();
  private defaultProvider: string = 'openai';
  private apiKeys: Record<string, string> = {};

  constructor() {
    // Ne pas initialiser les providers au démarrage
    // Ils seront configurés dynamiquement avec les clés API de l'utilisateur
    console.log('🔧 EmbeddingService initialisé - providers seront configurés dynamiquement');
  }

  /**
   * Configure les clés API pour les providers
   */
  configureApiKeys(apiKeys: Record<string, string>): void {
    this.apiKeys = apiKeys;
    this.reinitializeProviders();
  }

  /**
   * Réinitialise les providers avec les clés API configurées
   */
  private reinitializeProviders(): void {
    this.providers.clear();
    this.initializeProviders();
  }

  /**
   * Initialise les providers d'embeddings disponibles
   */
  private initializeProviders(): void {
    // Provider Google Gemini (priorité haute) - UNIQUEMENT depuis les clés API configurées
    const geminiApiKey = this.apiKeys.gemini;
    if (geminiApiKey) {
      this.providers.set('gemini', new GeminiEmbeddingProvider(geminiApiKey));
      this.defaultProvider = 'gemini'; // Utiliser Gemini par défaut
      console.log('✅ Provider Google Gemini embeddings disponible (défaut)');
    }

    // FastEmbed supprimé - on utilise uniquement Google Generative AI côté serveur

    // Provider OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIEmbeddingProvider());
      console.log('✅ Provider OpenAI embeddings disponible');
    }

    // Provider Ollama (local)
    if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST) {
      this.providers.set('ollama', new OllamaEmbeddingProvider());
      console.log('✅ Provider Ollama embeddings disponible');
    }

    // Provider local (transformers.js) - toujours disponible
    this.providers.set('local', new LocalEmbeddingProvider());
    console.log('✅ Provider local embeddings disponible');

    console.log(`🔧 ${this.providers.size} providers d'embeddings initialisés`);
  }

  /**
   * Génère un embedding pour un texte
   */
  async generateEmbedding(text: string, provider?: string): Promise<EmbeddingResult> {
    const providerName = provider || this.defaultProvider;
    const providerInstance = this.providers.get(providerName);

    if (!providerInstance) {
      throw new Error(`Provider d'embedding "${providerName}" non trouvé`);
    }

    if (!providerInstance.isAvailable()) {
      // Fallback vers le provider local
      const localProvider = this.providers.get('local');
      if (localProvider && localProvider.isAvailable()) {
        console.warn(`⚠️ Provider "${providerName}" non disponible, utilisation du provider local`);
        return await localProvider.generateEmbedding(text);
      }
      throw new Error(`Aucun provider d'embedding disponible`);
    }

    try {
      const startTime = Date.now();
      const result = await providerInstance.generateEmbedding(text);
      const duration = Date.now() - startTime;
      
      console.log(`🔮 Embedding généré avec ${providerName}: ${result.embedding.length} dimensions, ${duration}ms`);
      return result;
    } catch (error) {
      console.error(`❌ Erreur génération embedding avec ${providerName}:`, error);
      
      // Fallback vers le provider local
      const localProvider = this.providers.get('local');
      if (localProvider && localProvider.isAvailable()) {
        console.warn(`⚠️ Fallback vers le provider local`);
        return await localProvider.generateEmbedding(text);
      }
      
      throw error;
    }
  }

  /**
   * Génère des embeddings pour plusieurs textes
   */
  async generateEmbeddings(texts: string[], provider?: string): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    for (const text of texts) {
      try {
        const result = await this.generateEmbedding(text, provider);
        results.push(result);
      } catch (error) {
        console.error(`❌ Erreur génération embedding pour "${text.substring(0, 50)}...":`, error);
        // Continuer avec les autres textes
      }
    }
    
    return results;
  }

  /**
   * Calcule la similarité cosinus entre deux embeddings
   */
  static cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Les embeddings doivent avoir la même dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * Trouve les embeddings les plus similaires
   */
  static findMostSimilar(
    queryEmbedding: number[], 
    candidateEmbeddings: Array<{embedding: number[], id: string, content: string}>,
    limit: number = 10
  ): Array<{id: string, content: string, similarity: number}> {
    const similarities = candidateEmbeddings.map(candidate => ({
      id: candidate.id,
      content: candidate.content,
      similarity: EmbeddingService.cosineSimilarity(queryEmbedding, candidate.embedding)
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Obtient la liste des providers disponibles
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .map(([name, _]) => name);
  }

  /**
   * Définit le provider par défaut
   */
  setDefaultProvider(provider: string): void {
    if (!this.providers.has(provider)) {
      throw new Error(`Provider "${provider}" non trouvé`);
    }
    this.defaultProvider = provider;
    console.log(`🔧 Provider par défaut défini: ${provider}`);
  }

  // Méthode isFastEmbedAvailable supprimée - FastEmbed n'est plus utilisé
}

/**
 * Provider OpenAI Embeddings
 */
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small', // Plus petit et moins cher
      input: text,
    });

    return {
      embedding: response.data[0].embedding,
      model: 'text-embedding-3-small',
      tokens: response.usage.total_tokens,
      cost: response.usage.total_tokens * 0.00002 // ~$0.02 per 1K tokens
    };
  }

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}

/**
 * Provider Ollama Embeddings (local)
 */
class OllamaEmbeddingProvider implements EmbeddingProvider {
  name = 'ollama';
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nomic-embed-text', // Modèle d'embedding populaire pour Ollama
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur Ollama: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      embedding: data.embedding,
      model: 'nomic-embed-text',
      tokens: text.split(' ').length // Estimation
    };
  }

  isAvailable(): boolean {
    return !!(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST);
  }
}

// FastEmbedProvider supprimé - on utilise uniquement Google Generative AI côté serveur

/**
 * Provider Google Gemini Embeddings
 */
class GeminiEmbeddingProvider implements EmbeddingProvider {
  name = 'gemini';
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required for GeminiEmbeddingProvider');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      
      return {
        embedding: result.embedding.values,
        model: 'text-embedding-004',
        tokens: text.split(' ').length // Estimation
      };
    } catch (error) {
      console.error('❌ Erreur génération embedding Gemini:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }
}

/**
 * Provider Local Embeddings (transformers.js)
 */
class LocalEmbeddingProvider implements EmbeddingProvider {
  name = 'local';
  private pipeline: any = null;

  constructor() {
    this.initializePipeline();
  }

  private async initializePipeline(): Promise<void> {
    try {
      // Import dynamique pour éviter les erreurs côté serveur
      if (typeof window !== 'undefined') {
        const { pipeline } = await import('@xenova/transformers');
        this.pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log('✅ Pipeline transformers.js initialisé');
      }
    } catch (error) {
      console.warn('⚠️ Pipeline transformers.js non disponible:', error);
    }
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.pipeline) {
      throw new Error('Pipeline transformers.js non initialisé');
    }

    const result = await this.pipeline(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(result.data);

    return {
      embedding,
      model: 'all-MiniLM-L6-v2',
      tokens: text.split(' ').length // Estimation
    };
  }

  isAvailable(): boolean {
    return this.pipeline !== null;
  }
}

// Instance singleton
export const embeddingService = new EmbeddingService();