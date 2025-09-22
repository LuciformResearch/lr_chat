/**
 * CacheManager - Gestionnaire de cache intelligent pour Code Insight
 * 
 * Utilise le hash de contenu pour éviter les re-calculs et améliorer drastiquement
 * les performances du système d'analyse
 */

import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

export interface CacheEntry {
  contentHash: string;
  timestamp: number;
  analysis: any;
  metadata: {
    filePath: string;
    scopeCount: number;
    duration: number;
    version: string;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  totalEntries: number;
  cacheSize: number; // en bytes
  hitRate: number; // pourcentage
}

export class CacheManager {
  private cacheDir: string;
  private stats: CacheStats;
  private version: string = "1.0.0";

  constructor(cacheDir: string = ".lr_cache") {
    this.cacheDir = cacheDir;
    this.stats = {
      hits: 0,
      misses: 0,
      totalEntries: 0,
      cacheSize: 0,
      hitRate: 0
    };
  }

  /**
   * Génère un hash SHA256 du contenu
   */
  private generateContentHash(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Génère une clé de cache basée sur le chemin et le hash du contenu
   */
  private generateCacheKey(filePath: string, contentHash: string): string {
    const normalizedPath = path.normalize(filePath);
    const pathHash = createHash("md5").update(normalizedPath).digest("hex").substring(0, 8);
    return `${pathHash}_${contentHash.substring(0, 16)}`;
  }

  /**
   * Obtient une entrée du cache
   */
  async getCache(filePath: string, content: string): Promise<any | null> {
    try {
      const contentHash = this.generateContentHash(content);
      const cacheKey = this.generateCacheKey(filePath, contentHash);
      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.json`);

      // Vérifier si le fichier de cache existe
      try {
        await fs.access(cacheFilePath);
      } catch {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Lire et parser le cache
      const cacheData = await fs.readFile(cacheFilePath, "utf8");
      const entry: CacheEntry = JSON.parse(cacheData);

      // Vérifier la validité du cache
      if (entry.contentHash !== contentHash) {
        // Le contenu a changé, invalider le cache
        await this.deleteCache(cacheKey);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Vérifier l'âge du cache (optionnel, TTL de 24h)
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures
      if (Date.now() - entry.timestamp > maxAge) {
        await this.deleteCache(cacheKey);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Cache hit !
      this.stats.hits++;
      this.updateHitRate();
      
      console.log(`📦 Cache hit pour ${path.basename(filePath)} (${entry.metadata.scopeCount} scopes)`);
      return entry.analysis;

    } catch (error) {
      console.warn(`⚠️ Erreur lors de la lecture du cache pour ${filePath}:`, error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Met en cache une analyse
   */
  async setCache(
    filePath: string, 
    content: string, 
    analysis: any, 
    metadata: Partial<CacheEntry['metadata']> = {}
  ): Promise<void> {
    try {
      const contentHash = this.generateContentHash(content);
      const cacheKey = this.generateCacheKey(filePath, contentHash);
      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.json`);

      // Créer le répertoire de cache s'il n'existe pas
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Créer l'entrée de cache
      const entry: CacheEntry = {
        contentHash,
        timestamp: Date.now(),
        analysis,
        metadata: {
          filePath,
          scopeCount: 0,
          duration: 0,
          version: this.version,
          ...metadata
        }
      };

      // Sauvegarder le cache
      await fs.writeFile(cacheFilePath, JSON.stringify(entry, null, 2));

      // Mettre à jour les statistiques
      this.stats.totalEntries++;
      this.updateCacheSize();

      console.log(`💾 Cache sauvegardé pour ${path.basename(filePath)} (${entry.metadata.scopeCount} scopes)`);

    } catch (error) {
      console.warn(`⚠️ Erreur lors de la sauvegarde du cache pour ${filePath}:`, error);
    }
  }

  /**
   * Supprime une entrée du cache
   */
  private async deleteCache(cacheKey: string): Promise<void> {
    try {
      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.unlink(cacheFilePath);
      this.stats.totalEntries = Math.max(0, this.stats.totalEntries - 1);
      this.updateCacheSize();
    } catch (error) {
      // Ignorer les erreurs de suppression
    }
  }

  /**
   * Vide tout le cache
   */
  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
      
      this.stats = {
        hits: 0,
        misses: 0,
        totalEntries: 0,
        cacheSize: 0,
        hitRate: 0
      };
      
      console.log('🗄️ Cache vidé');
    } catch (error) {
      console.warn('⚠️ Erreur lors du vidage du cache:', error);
    }
  }

  /**
   * Met à jour le taux de hit
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Met à jour la taille du cache
   */
  private async updateCacheSize(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }
      
      this.stats.cacheSize = totalSize;
    } catch (error) {
      // Ignorer les erreurs de calcul de taille
    }
  }

  /**
   * Obtient les statistiques du cache
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Affiche les statistiques du cache
   */
  printStats(): void {
    const stats = this.getStats();
    console.log('\n📊 Statistiques du Cache:');
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Misses: ${stats.misses}`);
    console.log(`   Taux de hit: ${stats.hitRate.toFixed(1)}%`);
    console.log(`   Entrées: ${stats.totalEntries}`);
    console.log(`   Taille: ${(stats.cacheSize / 1024).toFixed(1)} KB`);
  }

  /**
   * Vérifie si le cache est activé et accessible
   */
  async isCacheAvailable(): Promise<boolean> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Nettoie les anciennes entrées du cache
   */
  async cleanupOldEntries(maxAgeHours: number = 24): Promise<number> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      let cleanedCount = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          const stats = await fs.stat(filePath);
          
          if (Date.now() - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 ${cleanedCount} entrées anciennes supprimées du cache`);
        this.stats.totalEntries = Math.max(0, this.stats.totalEntries - cleanedCount);
        this.updateCacheSize();
      }

      return cleanedCount;
    } catch (error) {
      console.warn('⚠️ Erreur lors du nettoyage du cache:', error);
      return 0;
    }
  }
}