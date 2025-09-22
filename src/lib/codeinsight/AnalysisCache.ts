/**
 * AnalysisCache - Système de cache pour les analyses Code Insight
 * 
 * Évite les re-analyses coûteuses en mettant en cache les résultats
 * avec invalidation intelligente basée sur les modifications de fichiers
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  fileHash: string;
  filePath: string;
  fileSize: number;
  ttl: number; // Time to live in milliseconds
  metadata: CacheMetadata;
}

export interface CacheMetadata {
  version: string;
  createdBy: string;
  analysisType: string;
  scopes: number;
  llmCalls: number;
  duration: number;
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  defaultTtl: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableFileHash: boolean; // Enable file hash validation
  compressionEnabled: boolean; // Enable compression for large entries
}

export class AnalysisCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private stats: CacheStats;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100, // 100 MB
      defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      enableFileHash: true,
      compressionEnabled: true,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0,
      totalSize: 0
    };

    this.startCleanupTimer();
    console.log('🗄️ AnalysisCache initialisé');
    console.log(`   Taille max: ${this.config.maxSize}MB`);
    console.log(`   TTL par défaut: ${this.config.defaultTtl / (60 * 60 * 1000)}h`);
  }

  /**
   * Génère une clé de cache basée sur le fichier et les paramètres
   */
  generateKey(filePath: string, analysisType: string, params: any = {}): string {
    const normalizedPath = path.resolve(filePath);
    const paramsHash = this.hashObject(params);
    return `analysis:${analysisType}:${this.hashString(normalizedPath)}:${paramsHash}`;
  }

  /**
   * Récupère une entrée du cache
   */
  get<T>(key: string, filePath?: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Vérifier l'expiration
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.deletes++;
      return null;
    }

    // Vérifier le hash du fichier si activé
    if (this.config.enableFileHash && filePath) {
      const currentHash = this.getFileHash(filePath);
      if (currentHash !== entry.fileHash) {
        this.cache.delete(key);
        this.stats.misses++;
        this.stats.deletes++;
        return null;
      }
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Stocke une entrée dans le cache
   */
  set<T>(
    key: string, 
    data: T, 
    filePath: string, 
    metadata: Partial<CacheMetadata> = {},
    ttl?: number
  ): void {
    // Vérifier la taille du cache
    if (this.shouldEvict()) {
      this.evictOldest();
    }

    const fileHash = this.config.enableFileHash ? this.getFileHash(filePath) : '';
    const fileStats = fs.statSync(filePath);
    
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      fileHash,
      filePath,
      fileSize: fileStats.size,
      ttl: ttl || this.config.defaultTtl,
      metadata: {
        version: '1.0.0',
        createdBy: 'IntelligentAnalyzer',
        analysisType: 'intelligent',
        scopes: 0,
        llmCalls: 0,
        duration: 0,
        ...metadata
      }
    };

    this.cache.set(key, entry);
    this.stats.sets++;
    this.updateStats();
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Vide le cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0,
      totalSize: 0
    };
    console.log('🗄️ Cache vidé');
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.stats.cleanups++;
    this.updateStats();
    
    if (cleaned > 0) {
      console.log(`🧹 Cache nettoyé: ${cleaned} entrées supprimées`);
    }
    
    return cleaned;
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats(): CacheStats & { hitRate: number; missRate: number; averageSize: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      missRate: total > 0 ? (this.stats.misses / total) * 100 : 0,
      averageSize: this.cache.size > 0 ? this.stats.totalSize / this.cache.size : 0
    };
  }

  /**
   * Obtient les informations sur le cache
   */
  getInfo(): CacheInfo {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalSize: this.stats.totalSize,
      config: this.config,
      stats: this.getStats()
    };
  }

  /**
   * Sauvegarde le cache sur disque
   */
  async saveToDisk(filePath: string): Promise<void> {
    const cacheData = {
      entries: Array.from(this.cache.entries()),
      stats: this.stats,
      config: this.config,
      savedAt: new Date().toISOString()
    };

    const data = JSON.stringify(cacheData, null, 2);
    fs.writeFileSync(filePath, data, 'utf-8');
    console.log(`💾 Cache sauvegardé: ${filePath}`);
  }

  /**
   * Charge le cache depuis le disque
   */
  async loadFromDisk(filePath: string): Promise<void> {
    if (!fs.existsSync(filePath)) {
      console.log('⚠️ Fichier de cache non trouvé');
      return;
    }

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const cacheData = JSON.parse(data);
      
      // Restaurer les entrées
      this.cache.clear();
      for (const [key, entry] of cacheData.entries) {
        this.cache.set(key, entry);
      }
      
      // Restaurer les statistiques
      this.stats = cacheData.stats;
      
      console.log(`📂 Cache chargé: ${this.cache.size} entrées`);
    } catch (error) {
      console.error('❌ Erreur lors du chargement du cache:', error);
    }
  }

  // Méthodes privées
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private shouldEvict(): boolean {
    return this.stats.totalSize > this.config.maxSize * 1024 * 1024; // Convert MB to bytes
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.deletes++;
      this.updateStats();
    }
  }

  private getFileHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  private hashString(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
  }

  private hashObject(obj: any): string {
    return this.hashString(JSON.stringify(obj));
  }

  private updateStats(): void {
    this.stats.totalSize = 0;
    for (const entry of this.cache.values()) {
      this.stats.totalSize += entry.fileSize;
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Détruit le cache et nettoie les ressources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
    console.log('🗄️ AnalysisCache détruit');
  }
}

// Types pour les statistiques et informations
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  cleanups: number;
  totalSize: number;
}

export interface CacheInfo {
  size: number;
  maxSize: number;
  totalSize: number;
  config: CacheConfig;
  stats: CacheStats & { hitRate: number; missRate: number; averageSize: number };
}

// Instance globale du cache
let globalCache: AnalysisCache | null = null;

export function getGlobalCache(): AnalysisCache {
  if (!globalCache) {
    globalCache = new AnalysisCache();
  }
  return globalCache;
}

export function destroyGlobalCache(): void {
  if (globalCache) {
    globalCache.destroy();
    globalCache = null;
  }
}