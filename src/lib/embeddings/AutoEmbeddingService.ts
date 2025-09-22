/**
 * Service de génération automatique d'embeddings
 * Intègre avec le système de sessions et la base de données
 */

import { Pool } from 'pg';
import { EmbeddingService, embeddingService } from './EmbeddingService';
import { SemanticSearchService } from '../search/SemanticSearchService';

export interface AutoEmbeddingConfig {
  enabled: boolean;
  batchSize: number;
  delayMs: number;
  maxRetries: number;
  cacheEnabled: boolean;
}

export interface EmbeddingStats {
  totalProcessed: number;
  totalErrors: number;
  averageProcessingTime: number;
  cacheHits: number;
  cacheMisses: number;
}

export class AutoEmbeddingService {
  private pool: Pool;
  private embeddingService: EmbeddingService;
  private searchService: SemanticSearchService;
  private config: AutoEmbeddingConfig;
  private stats: EmbeddingStats;
  private processingQueue: Set<string> = new Set();
  private cache: Map<string, number[]> = new Map();

  constructor(pool: Pool, config: Partial<AutoEmbeddingConfig> = {}) {
    this.pool = pool;
    this.embeddingService = embeddingService;
    this.searchService = new SemanticSearchService(pool);
    
    this.config = {
      enabled: true,
      batchSize: 5,
      delayMs: 1000,
      maxRetries: 3,
      cacheEnabled: true,
      ...config
    };

    this.stats = {
      totalProcessed: 0,
      totalErrors: 0,
      averageProcessingTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    console.log('🤖 AutoEmbeddingService initialisé:', this.config);
  }

  /**
   * Génère automatiquement l'embedding pour un nouveau message
   */
  async processNewMessage(messageId: string, content: string, userId?: string): Promise<void> {
    if (!this.config.enabled) {
      console.log('⚠️ AutoEmbeddingService désactivé');
      return;
    }

    if (this.processingQueue.has(messageId)) {
      console.log(`⏳ Message ${messageId} déjà en cours de traitement`);
      return;
    }

    this.processingQueue.add(messageId);

    try {
      const startTime = Date.now();
      
      // Vérifier le cache d'abord
      const cacheKey = this.getCacheKey(content);
      let embedding: number[];

      if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
        embedding = this.cache.get(cacheKey)!;
        this.stats.cacheHits++;
        console.log(`💾 Embedding récupéré du cache pour message ${messageId}`);
      } else {
        // Générer l'embedding
        const result = await this.embeddingService.generateEmbedding(content);
        embedding = result.embedding;
        
        if (this.config.cacheEnabled) {
          this.cache.set(cacheKey, embedding);
        }
        this.stats.cacheMisses++;
        console.log(`🔮 Embedding généré pour message ${messageId}: ${embedding.length} dimensions`);
      }

      // Sauvegarder en base de données
      await this.saveEmbeddingToDatabase(messageId, embedding);

      // Mettre à jour les statistiques
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime, false);

      console.log(`✅ Message ${messageId} traité en ${processingTime}ms`);

    } catch (error) {
      console.error(`❌ Erreur traitement message ${messageId}:`, error);
      this.updateStats(0, true);
      
      // Retry logic
      await this.retryMessage(messageId, content, userId);
    } finally {
      this.processingQueue.delete(messageId);
    }
  }

  /**
   * Traite un batch de messages en arrière-plan
   */
  async processBatch(messages: Array<{id: string, content: string, userId?: string}>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    console.log(`🔄 Traitement batch de ${messages.length} messages...`);

    const batches = this.chunkArray(messages, this.config.batchSize);
    
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(msg => this.processNewMessage(msg.id, msg.content, msg.userId))
      );
      
      // Délai entre les batches pour éviter la surcharge
      if (batches.indexOf(batch) < batches.length - 1) {
        await this.delay(this.config.delayMs);
      }
    }

    console.log(`✅ Batch traité: ${messages.length} messages`);
  }

  /**
   * Génère les embeddings manquants pour tous les messages
   */
  async generateMissingEmbeddings(limit: number = 50): Promise<{processed: number, errors: number}> {
    console.log(`🔍 Recherche des embeddings manquants (limite: ${limit})...`);

    try {
      const result = await this.searchService.generateMissingEmbeddings(limit);
      
      console.log(`📊 Embeddings manquants générés: ${result.processed} succès, ${result.errors} erreurs`);
      return result;

    } catch (error) {
      console.error('❌ Erreur génération embeddings manquants:', error);
      throw error;
    }
  }

  /**
   * Recherche sémantique avec cache intelligent
   */
  async searchWithCache(query: string, options: any = {}): Promise<any[]> {
    const cacheKey = this.getCacheKey(query);
    
    // Pour les recherches, on ne cache pas les résultats mais on optimise la requête
    const startTime = Date.now();
    
    try {
      const results = await this.searchService.searchMessages(query, options);
      
      const searchTime = Date.now() - startTime;
      console.log(`🔍 Recherche sémantique: ${results.length} résultats en ${searchTime}ms`);
      
      return results;
    } catch (error) {
      console.error('❌ Erreur recherche sémantique:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde l'embedding en base de données
   */
  private async saveEmbeddingToDatabase(messageId: string, embedding: number[]): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE messages SET embedding = $1 WHERE id = $2',
        [embedding, messageId]
      );
      
      console.log(`💾 Embedding sauvegardé pour message ${messageId}`);
    } catch (error) {
      console.error(`❌ Erreur sauvegarde embedding message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Logique de retry pour les messages en erreur
   */
  private async retryMessage(messageId: string, content: string, userId?: string, attempt: number = 1): Promise<void> {
    if (attempt > this.config.maxRetries) {
      console.error(`❌ Message ${messageId} abandonné après ${this.config.maxRetries} tentatives`);
      return;
    }

    console.log(`🔄 Retry ${attempt}/${this.config.maxRetries} pour message ${messageId}`);
    
    // Délai exponentiel
    const delayMs = this.config.delayMs * Math.pow(2, attempt - 1);
    await this.delay(delayMs);

    try {
      await this.processNewMessage(messageId, content, userId);
    } catch (error) {
      await this.retryMessage(messageId, content, userId, attempt + 1);
    }
  }

  /**
   * Génère une clé de cache basée sur le contenu
   */
  private getCacheKey(content: string): string {
    // Utiliser un hash simple pour la clé de cache
    return Buffer.from(content).toString('base64').substring(0, 50);
  }

  /**
   * Met à jour les statistiques
   */
  private updateStats(processingTime: number, isError: boolean): void {
    if (isError) {
      this.stats.totalErrors++;
    } else {
      this.stats.totalProcessed++;
      
      // Calculer la moyenne mobile
      const totalTime = this.stats.averageProcessingTime * (this.stats.totalProcessed - 1) + processingTime;
      this.stats.averageProcessingTime = totalTime / this.stats.totalProcessed;
    }
  }

  /**
   * Divise un array en chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Délai asynchrone
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtient les statistiques du service
   */
  getStats(): EmbeddingStats & {config: AutoEmbeddingConfig, queueSize: number} {
    return {
      ...this.stats,
      config: this.config,
      queueSize: this.processingQueue.size
    };
  }

  /**
   * Configure le service
   */
  updateConfig(newConfig: Partial<AutoEmbeddingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 AutoEmbeddingService configuré:', this.config);
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache embeddings vidé');
  }

  /**
   * Active/désactive le service
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`🔧 AutoEmbeddingService ${enabled ? 'activé' : 'désactivé'}`);
  }

  /**
   * Teste le service
   */
  async testService(): Promise<boolean> {
    try {
      console.log('🧪 Test AutoEmbeddingService...');
      
      // Test de génération d'embedding
      const testContent = "Test de génération automatique d'embedding";
      const result = await this.embeddingService.generateEmbedding(testContent);
      
      if (result.embedding.length === 0) {
        throw new Error('Embedding vide généré');
      }

      // Test de cache
      const cacheKey = this.getCacheKey(testContent);
      this.cache.set(cacheKey, result.embedding);
      
      if (!this.cache.has(cacheKey)) {
        throw new Error('Cache ne fonctionne pas');
      }

      console.log('✅ AutoEmbeddingService opérationnel');
      return true;

    } catch (error) {
      console.error('❌ Test AutoEmbeddingService échoué:', error);
      return false;
    }
  }
}

// Instance singleton
let autoEmbeddingServiceInstance: AutoEmbeddingService | null = null;

export function getAutoEmbeddingService(pool?: Pool): AutoEmbeddingService {
  if (!autoEmbeddingServiceInstance && pool) {
    autoEmbeddingServiceInstance = new AutoEmbeddingService(pool);
  }
  
  if (!autoEmbeddingServiceInstance) {
    throw new Error('AutoEmbeddingService non initialisé. Appelez getAutoEmbeddingService(pool) d\'abord.');
  }
  
  return autoEmbeddingServiceInstance;
}