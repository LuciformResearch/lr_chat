/**
 * Service d'embeddings avec cache intelligent
 * Étend EmbeddingService avec un système de cache optimisé
 */

import { EmbeddingService, EmbeddingResult, EmbeddingProvider } from './EmbeddingService';
import { EmbeddingCache, getEmbeddingCache } from './EmbeddingCache';

export interface CachedEmbeddingConfig {
  cacheEnabled: boolean;
  cacheConfig: {
    maxSize: number;
    maxEntries: number;
    ttl: number;
    enableCompression: boolean;
  };
  fallbackToOriginal: boolean;
  preloadCommonEmbeddings: boolean;
}

export class CachedEmbeddingService extends EmbeddingService {
  private cache: EmbeddingCache;
  private config: CachedEmbeddingConfig;
  private commonEmbeddings: Map<string, EmbeddingResult> = new Map();

  constructor(config: Partial<CachedEmbeddingConfig> = {}) {
    super();
    
    this.config = {
      cacheEnabled: true,
      cacheConfig: {
        maxSize: 100, // 100 MB
        maxEntries: 1000,
        ttl: 24 * 60 * 60 * 1000, // 24 heures
        enableCompression: false
      },
      fallbackToOriginal: true,
      preloadCommonEmbeddings: true,
      ...config
    };

    this.cache = getEmbeddingCache();
    this.cache.updateConfig(this.config.cacheConfig);

    if (this.config.preloadCommonEmbeddings) {
      this.preloadCommonEmbeddings();
    }

    console.log('💾 CachedEmbeddingService initialisé avec cache intelligent');
  }

  /**
   * Génère un embedding avec cache intelligent
   */
  async generateEmbedding(text: string, provider?: string): Promise<EmbeddingResult> {
    const startTime = Date.now();
    
    try {
      // Vérifier le cache d'abord
      if (this.config.cacheEnabled) {
        const cachedResult = this.cache.get(text, provider);
        if (cachedResult) {
          const cacheTime = Date.now() - startTime;
          console.log(`💾 Embedding récupéré du cache en ${cacheTime}ms`);
          return cachedResult;
        }
      }

      // Générer l'embedding via le service parent
      const result = await super.generateEmbedding(text, provider);
      
      // Mettre en cache si activé
      if (this.config.cacheEnabled) {
        this.cache.set(text, result);
      }

      const totalTime = Date.now() - startTime;
      console.log(`🔮 Embedding généré et mis en cache en ${totalTime}ms`);
      
      return result;

    } catch (error) {
      console.error('❌ Erreur génération embedding avec cache:', error);
      
      // Fallback vers le service original si configuré
      if (this.config.fallbackToOriginal) {
        console.log('🔄 Fallback vers le service original...');
        return await super.generateEmbedding(text, provider);
      }
      
      throw error;
    }
  }

  /**
   * Génère des embeddings en batch avec optimisation du cache
   */
  async generateEmbeddings(texts: string[], provider?: string): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    // Vérifier le cache pour tous les textes
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      
      if (this.config.cacheEnabled) {
        const cachedResult = this.cache.get(text, provider);
        if (cachedResult) {
          results[i] = cachedResult;
          continue;
        }
      }
      
      uncachedTexts.push(text);
      uncachedIndices.push(i);
    }

    console.log(`💾 ${results.filter(r => r).length}/${texts.length} embeddings trouvés dans le cache`);

    // Générer les embeddings manquants
    if (uncachedTexts.length > 0) {
      const uncachedResults = await super.generateEmbeddings(uncachedTexts, provider);
      
      // Mettre en cache et assigner les résultats
      for (let i = 0; i < uncachedResults.length; i++) {
        const result = uncachedResults[i];
        const originalIndex = uncachedIndices[i];
        const text = uncachedTexts[i];
        
        if (this.config.cacheEnabled) {
          this.cache.set(text, result);
        }
        
        results[originalIndex] = result;
      }
    }

    return results;
  }

  /**
   * Préchage des embeddings communs
   */
  private async preloadCommonEmbeddings(): Promise<void> {
    const commonTexts = [
      "Bonjour",
      "Comment ça va ?",
      "Merci",
      "Au revoir",
      "Aide-moi",
      "Je ne comprends pas",
      "Peux-tu m'expliquer",
      "Qu'est-ce que",
      "Comment faire",
      "Problème"
    ];

    console.log('🔄 Préchargement des embeddings communs...');

    try {
      for (const text of commonTexts) {
        if (!this.cache.has(text)) {
          const result = await super.generateEmbedding(text);
          this.cache.set(text, result);
          this.commonEmbeddings.set(text, result);
        }
      }

      console.log(`✅ ${commonTexts.length} embeddings communs préchargés`);
    } catch (error) {
      console.error('❌ Erreur préchargement embeddings communs:', error);
    }
  }

  /**
   * Recherche sémantique optimisée avec cache
   */
  async semanticSearch(
    query: string,
    candidates: Array<{id: string, content: string, embedding?: number[]}>,
    limit: number = 10
  ): Promise<Array<{id: string, content: string, similarity: number}>> {
    const startTime = Date.now();

    try {
      // Générer l'embedding de la requête (avec cache)
      const queryEmbedding = await this.generateEmbedding(query);
      
      const results = [];
      
      for (const candidate of candidates) {
        let candidateEmbedding: number[];
        
        if (candidate.embedding) {
          candidateEmbedding = candidate.embedding;
        } else {
          // Générer l'embedding du candidat (avec cache)
          const candidateResult = await this.generateEmbedding(candidate.content);
          candidateEmbedding = candidateResult.embedding;
        }
        
        const similarity = EmbeddingService.cosineSimilarity(queryEmbedding.embedding, candidateEmbedding);
        
        results.push({
          id: candidate.id,
          content: candidate.content,
          similarity
        });
      }
      
      const searchTime = Date.now() - startTime;
      console.log(`🔍 Recherche sémantique: ${candidates.length} candidats en ${searchTime}ms`);
      
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      console.error('❌ Erreur recherche sémantique:', error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques du cache
   */
  getCacheStats(): any {
    return this.cache.getStats();
  }

  /**
   * Obtient les embeddings les plus utilisés
   */
  getMostUsedEmbeddings(limit: number = 10): any[] {
    return this.cache.getMostAccessedEntries(limit);
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
    this.commonEmbeddings.clear();
    console.log('🧹 Cache embeddings vidé');
  }

  /**
   * Configure le service de cache
   */
  updateCacheConfig(newConfig: Partial<CachedEmbeddingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.cacheConfig) {
      this.cache.updateConfig(newConfig.cacheConfig);
    }
    
    console.log('🔧 Configuration cache mise à jour:', this.config);
  }

  /**
   * Active/désactive le cache
   */
  setCacheEnabled(enabled: boolean): void {
    this.config.cacheEnabled = enabled;
    console.log(`🔧 Cache embeddings ${enabled ? 'activé' : 'désactivé'}`);
  }

  /**
   * Sauvegarde le cache sur disque
   */
  async persistCache(): Promise<void> {
    await this.cache.persist();
    console.log('💾 Cache embeddings sauvegardé');
  }

  /**
   * Charge le cache depuis le disque
   */
  async loadCache(): Promise<void> {
    await this.cache.load();
    console.log('📂 Cache embeddings chargé');
  }

  /**
   * Teste le service avec cache
   */
  async testCachedService(): Promise<boolean> {
    try {
      console.log('🧪 Test CachedEmbeddingService...');
      
      // Test de génération avec cache
      const testText = "Test de service d'embeddings avec cache";
      const result1 = await this.generateEmbedding(testText);
      
      if (result1.embedding.length === 0) {
        throw new Error('Premier embedding vide');
      }
      
      // Test de récupération depuis le cache
      const result2 = await this.generateEmbedding(testText);
      
      if (result2.embedding.length !== result1.embedding.length) {
        throw new Error('Embedding du cache différent');
      }
      
      // Test des statistiques du cache
      const stats = this.getCacheStats();
      if (stats.totalEntries === 0) {
        throw new Error('Cache vide après utilisation');
      }
      
      // Test de recherche sémantique
      const candidates = [
        { id: '1', content: 'Test de similarité' },
        { id: '2', content: 'Autre texte différent' }
      ];
      
      const searchResults = await this.semanticSearch('test similarité', candidates, 2);
      
      if (searchResults.length === 0) {
        throw new Error('Recherche sémantique vide');
      }
      
      console.log('✅ CachedEmbeddingService opérationnel');
      return true;

    } catch (error) {
      console.error('❌ Test CachedEmbeddingService échoué:', error);
      return false;
    }
  }

  /**
   * Détruit le service et nettoie les ressources
   */
  destroy(): void {
    this.cache.destroy();
    this.commonEmbeddings.clear();
    console.log('💥 CachedEmbeddingService détruit');
  }
}

// Instance singleton
let cachedEmbeddingServiceInstance: CachedEmbeddingService | null = null;

export function getCachedEmbeddingService(): CachedEmbeddingService {
  if (!cachedEmbeddingServiceInstance) {
    cachedEmbeddingServiceInstance = new CachedEmbeddingService();
  }
  return cachedEmbeddingServiceInstance;
}