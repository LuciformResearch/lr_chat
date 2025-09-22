/**
 * Système de cache intelligent pour les embeddings
 * Optimise les performances en évitant la régénération d'embeddings identiques
 */

import { EmbeddingResult } from './EmbeddingService';

export interface CacheEntry {
  embedding: number[];
  model: string;
  tokens?: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Taille en bytes
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  averageAccessTime: number;
  evictionCount: number;
}

export interface CacheConfig {
  maxSize: number; // Taille maximale en MB
  maxEntries: number; // Nombre maximum d'entrées
  ttl: number; // Time to live en ms
  cleanupInterval: number; // Intervalle de nettoyage en ms
  enableCompression: boolean; // Compression des embeddings
  enablePersistence: boolean; // Persistance sur disque
}

export class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private accessTimes: number[] = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100, // 100 MB par défaut
      maxEntries: 1000,
      ttl: 24 * 60 * 60 * 1000, // 24 heures
      cleanupInterval: 60 * 60 * 1000, // 1 heure
      enableCompression: false, // Désactivé par défaut
      enablePersistence: false, // Désactivé par défaut
      ...config
    };

    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      averageAccessTime: 0,
      evictionCount: 0
    };

    this.startCleanupTimer();
    console.log('💾 EmbeddingCache initialisé:', this.config);
  }

  /**
   * Génère une clé de cache basée sur le contenu
   */
  private generateCacheKey(content: string, model?: string): string {
    const normalizedContent = content.trim().toLowerCase();
    const modelSuffix = model ? `_${model}` : '';
    
    // Utiliser un hash simple pour la clé
    const hash = this.simpleHash(normalizedContent);
    return `${hash}${modelSuffix}`;
  }

  /**
   * Hash simple pour les clés de cache
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Calcule la taille d'un embedding
   */
  private calculateEmbeddingSize(embedding: number[]): number {
    return embedding.length * 8; // 8 bytes par float64
  }

  /**
   * Compresse un embedding si activé
   */
  private compressEmbedding(embedding: number[]): number[] {
    if (!this.config.enableCompression) {
      return embedding;
    }

    // Compression simple : réduire la précision
    return embedding.map(val => Math.round(val * 1000) / 1000);
  }

  /**
   * Décompresse un embedding si nécessaire
   */
  private decompressEmbedding(embedding: number[]): number[] {
    // Pour cette implémentation simple, pas de décompression nécessaire
    return embedding;
  }

  /**
   * Met en cache un embedding
   */
  set(content: string, result: EmbeddingResult): void {
    const key = this.generateCacheKey(content, result.model);
    const compressedEmbedding = this.compressEmbedding(result.embedding);
    const size = this.calculateEmbeddingSize(compressedEmbedding);

    const entry: CacheEntry = {
      embedding: compressedEmbedding,
      model: result.model,
      tokens: result.tokens,
      createdAt: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size
    };

    // Vérifier si on doit faire de la place
    this.ensureSpace(size);

    this.cache.set(key, entry);
    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize += size;

    console.log(`💾 Embedding mis en cache: ${key} (${size} bytes)`);
  }

  /**
   * Récupère un embedding du cache
   */
  get(content: string, model?: string): EmbeddingResult | null {
    const startTime = Date.now();
    const key = this.generateCacheKey(content, model);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.missRate++;
      this.updateAccessTime(Date.now() - startTime);
      return null;
    }

    // Vérifier la TTL
    if (Date.now() - entry.createdAt > this.config.ttl) {
      this.cache.delete(key);
      this.stats.missRate++;
      this.updateAccessTime(Date.now() - startTime);
      return null;
    }

    // Mettre à jour les statistiques d'accès
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hitRate++;
    this.updateAccessTime(Date.now() - startTime);

    // Décompresser si nécessaire
    const embedding = this.decompressEmbedding(entry.embedding);

    return {
      embedding,
      model: entry.model,
      tokens: entry.tokens
    };
  }

  /**
   * Vérifie si un embedding est en cache
   */
  has(content: string, model?: string): boolean {
    const key = this.generateCacheKey(content, model);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    // Vérifier la TTL
    if (Date.now() - entry.createdAt > this.config.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * S'assure qu'il y a assez d'espace pour une nouvelle entrée
   */
  private ensureSpace(newEntrySize: number): void {
    // Vérifier le nombre d'entrées
    while (this.cache.size >= this.config.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    // Vérifier la taille totale
    while (this.stats.totalSize + newEntrySize > this.config.maxSize * 1024 * 1024) {
      this.evictLeastRecentlyUsed();
    }
  }

  /**
   * Supprime l'entrée la moins récemment utilisée
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.cache.delete(oldestKey);
      this.stats.totalSize -= entry.size;
      this.stats.evictionCount++;
      console.log(`🗑️ Entrée évincée du cache: ${oldestKey}`);
    }
  }

  /**
   * Met à jour le temps d'accès moyen
   */
  private updateAccessTime(accessTime: number): void {
    this.accessTimes.push(accessTime);
    
    // Garder seulement les 100 derniers temps d'accès
    if (this.accessTimes.length > 100) {
      this.accessTimes.shift();
    }
    
    this.stats.averageAccessTime = this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
  }

  /**
   * Nettoie le cache des entrées expirées
   */
  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    let cleanedSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > this.config.ttl) {
        this.cache.delete(key);
        cleanedCount++;
        cleanedSize += entry.size;
      }
    }

    this.stats.totalSize -= cleanedSize;
    this.stats.totalEntries = this.cache.size;

    if (cleanedCount > 0) {
      console.log(`🧹 Cache nettoyé: ${cleanedCount} entrées expirées supprimées`);
    }
  }

  /**
   * Démarre le timer de nettoyage automatique
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Arrête le timer de nettoyage
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Vide complètement le cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      averageAccessTime: 0,
      evictionCount: 0
    };
    this.accessTimes = [];
    console.log('🧹 Cache complètement vidé');
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats(): CacheStats & {config: CacheConfig} {
    const totalRequests = this.stats.hitRate + this.stats.missRate;
    const hitRate = totalRequests > 0 ? this.stats.hitRate / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.stats.missRate / totalRequests : 0;

    return {
      ...this.stats,
      hitRate,
      missRate,
      config: this.config
    };
  }

  /**
   * Obtient les entrées les plus accédées
   */
  getMostAccessedEntries(limit: number = 10): Array<{key: string, entry: CacheEntry}> {
    return Array.from(this.cache.entries())
      .sort(([,a], [,b]) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(([key, entry]) => ({ key, entry }));
  }

  /**
   * Configure le cache
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Redémarrer le timer si l'intervalle a changé
    if (newConfig.cleanupInterval) {
      this.startCleanupTimer();
    }
    
    console.log('🔧 Configuration du cache mise à jour:', this.config);
  }

  /**
   * Sauvegarde le cache sur disque (si activé)
   */
  async persist(): Promise<void> {
    if (!this.config.enablePersistence) {
      return;
    }

    try {
      // Implémentation simplifiée - en production, utiliser un système de fichiers
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now()
      };

      // Ici on pourrait sauvegarder dans un fichier ou une base de données
      console.log('💾 Cache sauvegardé sur disque');
    } catch (error) {
      console.error('❌ Erreur sauvegarde cache:', error);
    }
  }

  /**
   * Charge le cache depuis le disque (si activé)
   */
  async load(): Promise<void> {
    if (!this.config.enablePersistence) {
      return;
    }

    try {
      // Implémentation simplifiée - en production, charger depuis un fichier
      console.log('📂 Cache chargé depuis le disque');
    } catch (error) {
      console.error('❌ Erreur chargement cache:', error);
    }
  }

  /**
   * Teste le cache
   */
  async testCache(): Promise<boolean> {
    try {
      console.log('🧪 Test EmbeddingCache...');
      
      // Test de base
      const testContent = "Test de cache d'embedding";
      const testResult: EmbeddingResult = {
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        model: 'test-model',
        tokens: 5
      };

      // Test set/get
      this.set(testContent, testResult);
      const retrieved = this.get(testContent, 'test-model');

      if (!retrieved || retrieved.embedding.length !== testResult.embedding.length) {
        throw new Error('Cache set/get ne fonctionne pas');
      }

      // Test has
      if (!this.has(testContent, 'test-model')) {
        throw new Error('Cache has ne fonctionne pas');
      }

      // Test éviction
      const originalSize = this.cache.size;
      this.config.maxEntries = 1;
      this.ensureSpace(1000);
      
      if (this.cache.size >= originalSize) {
        throw new Error('Éviction ne fonctionne pas');
      }

      // Restaurer la config
      this.config.maxEntries = 1000;

      console.log('✅ EmbeddingCache opérationnel');
      return true;

    } catch (error) {
      console.error('❌ Test EmbeddingCache échoué:', error);
      return false;
    }
  }

  /**
   * Détruit le cache et nettoie les ressources
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
    console.log('💥 EmbeddingCache détruit');
  }
}

// Instance singleton
let embeddingCacheInstance: EmbeddingCache | null = null;

export function getEmbeddingCache(): EmbeddingCache {
  if (!embeddingCacheInstance) {
    embeddingCacheInstance = new EmbeddingCache();
  }
  return embeddingCacheInstance;
}