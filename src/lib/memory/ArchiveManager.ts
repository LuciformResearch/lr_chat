/**
 * ArchiveManager - Gestionnaire d'archivage hiérarchique avec décompression
 * 
 * Fonctionnalités:
 * - Archivage des messages avant compression
 * - Décompression hiérarchique (L3→L2→L1→Messages)
 * - Fallback intelligent avec Mem0
 * - Traçabilité complète des niveaux
 */

import { MemoryItem } from './AdvancedMemoryEngineWithProactiveSearch';

export interface ArchivedMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  level: number; // Niveau d'archivage (0 = message brut, 1 = L1, 2 = L2, 3 = L3)
  covers?: string[]; // IDs des éléments couverts (pour les résumés)
  topics?: string[];
  metadata?: {
    originalMessageCount?: number;
    compressionRatio?: number;
    authority?: number;
    user_feedback?: number;
    access_cost?: number;
  };
}

export interface ArchiveLevel {
  level: number;
  name: string;
  description: string;
  compressionRatio: number;
  maxItems: number;
}

export interface DecompressionResult {
  success: boolean;
  level: number;
  items: ArchivedMessage[];
  decompressionPath: string[];
  fallbackUsed: boolean;
  mem0Fallback?: boolean;
}

export class ArchiveManager {
  private archives: Map<number, ArchivedMessage[]> = new Map();
  private levelConfig: ArchiveLevel[] = [
    { level: 0, name: 'Messages Bruts', description: 'Messages originaux non compressés', compressionRatio: 1.0, maxItems: 1000 },
    { level: 1, name: 'L1 Summaries', description: 'Résumés de niveau 1 (5 messages → 1 résumé)', compressionRatio: 0.2, maxItems: 200 },
    { level: 2, name: 'L2 Summaries', description: 'Résumés de niveau 2 (2 L1 → 1 L2)', compressionRatio: 0.1, maxItems: 50 },
    { level: 3, name: 'L3 Summaries', description: 'Résumés de niveau 3 (2 L2 → 1 L3)', compressionRatio: 0.05, maxItems: 10 }
  ];

  constructor() {
    // Initialiser les archives par niveau
    for (const config of this.levelConfig) {
      this.archives.set(config.level, []);
    }
  }

  /**
   * Archive un message ou résumé
   */
  archiveItem(item: MemoryItem, level: number, originalMessages?: MemoryItem[]): void {
    const archivedMessage: ArchivedMessage = {
      id: item.id,
      content: item.text,
      role: this.determineRole(item),
      timestamp: item.timestamp,
      level,
      covers: item.covers || [],
      topics: item.topics || [],
      metadata: {
        originalMessageCount: originalMessages?.length || 1,
        compressionRatio: originalMessages ? originalMessages.length / 1 : 1,
        authority: item.authority || 0.8,
        user_feedback: item.user_feedback || 0.7,
        access_cost: item.access_cost || 0.2
      }
    };

    const archive = this.archives.get(level) || [];
    archive.push(archivedMessage);
    this.archives.set(level, archive);

    console.log(`📦 Archivé niveau ${level}: ${item.id} (${originalMessages?.length || 1} éléments couverts)`);
  }

  /**
   * Décompresse un résumé vers ses éléments originaux
   */
  decompress(summaryId: string, targetLevel: number = 0): DecompressionResult {
    const decompressionPath: string[] = [];
    let currentLevel = this.findItemLevel(summaryId);
    let currentItems: ArchivedMessage[] = [this.findItem(summaryId)];

    if (!currentItems[0]) {
      return {
        success: false,
        level: -1,
        items: [],
        decompressionPath: [],
        fallbackUsed: false
      };
    }

    decompressionPath.push(`L${currentLevel}: ${summaryId}`);

    // Décompression hiérarchique
    while (currentLevel > targetLevel && currentItems.length > 0) {
      const nextLevel = currentLevel - 1;
      const decompressedItems: ArchivedMessage[] = [];

      for (const item of currentItems) {
        if (item.covers && item.covers.length > 0) {
          // Chercher les éléments du niveau inférieur
          const lowerLevelItems = this.findItemsByCovers(item.covers, nextLevel);
          if (lowerLevelItems.length > 0) {
            decompressedItems.push(...lowerLevelItems);
            decompressionPath.push(`L${nextLevel}: ${lowerLevelItems.length} éléments`);
          } else {
            // Fallback: chercher dans Mem0 ou autres sources
            const fallbackItems = this.fallbackDecompression(item, nextLevel);
            if (fallbackItems.length > 0) {
              decompressedItems.push(...fallbackItems);
              decompressionPath.push(`L${nextLevel}: ${fallbackItems.length} éléments (fallback)`);
            }
          }
        }
      }

      currentItems = decompressedItems;
      currentLevel = nextLevel;
    }

    return {
      success: currentItems.length > 0,
      level: currentLevel,
      items: currentItems,
      decompressionPath,
      fallbackUsed: decompressionPath.some(path => path.includes('fallback'))
    };
  }

  /**
   * Recherche intelligente avec fallback
   */
  async searchWithFallback(query: string, maxLevel: number = 3): Promise<{
    results: ArchivedMessage[];
    fallbackUsed: boolean;
    searchPath: string[];
  }> {
    const searchPath: string[] = [];
    let results: ArchivedMessage[] = [];
    let fallbackUsed = false;

    // 1. Recherche dans les archives locales
    for (let level = maxLevel; level >= 0; level--) {
      const archive = this.archives.get(level) || [];
      const levelResults = archive.filter(item => 
        item.content.toLowerCase().includes(query.toLowerCase()) ||
        item.topics?.some(topic => topic.toLowerCase().includes(query.toLowerCase()))
      );

      if (levelResults.length > 0) {
        results.push(...levelResults);
        searchPath.push(`L${level}: ${levelResults.length} résultats`);
        break; // Arrêter au premier niveau qui donne des résultats
      }
    }

    // 2. Si pas de résultats, fallback Mem0
    if (results.length === 0) {
      const mem0Results = await this.mem0FallbackSearch(query);
      if (mem0Results.length > 0) {
        results = mem0Results;
        fallbackUsed = true;
        searchPath.push(`Mem0: ${mem0Results.length} résultats`);
      }
    }

    return { results, fallbackUsed, searchPath };
  }

  /**
   * Obtient les statistiques d'archivage
   */
  getArchiveStats(): {
    totalItems: number;
    itemsByLevel: Record<number, number>;
    compressionRatios: Record<number, number>;
    oldestItem: ArchivedMessage | null;
    newestItem: ArchivedMessage | null;
  } {
    let totalItems = 0;
    const itemsByLevel: Record<number, number> = {};
    const compressionRatios: Record<number, number> = {};
    let oldestItem: ArchivedMessage | null = null;
    let newestItem: ArchivedMessage | null = null;

    for (const [level, archive] of this.archives) {
      const count = archive.length;
      itemsByLevel[level] = count;
      totalItems += count;

      if (count > 0) {
        const config = this.levelConfig.find(c => c.level === level);
        compressionRatios[level] = config?.compressionRatio || 1;

        // Trouver le plus ancien et le plus récent
        const sorted = archive.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (!oldestItem || new Date(sorted[0].timestamp) < new Date(oldestItem.timestamp)) {
          oldestItem = sorted[0];
        }
        if (!newestItem || new Date(sorted[sorted.length - 1].timestamp) > new Date(newestItem.timestamp)) {
          newestItem = sorted[sorted.length - 1];
        }
      }
    }

    return {
      totalItems,
      itemsByLevel,
      compressionRatios,
      oldestItem,
      newestItem
    };
  }

  /**
   * Exporte les archives pour persistance
   */
  exportArchives(): {
    archives: Record<number, ArchivedMessage[]>;
    stats: any;
    metadata: {
      exportDate: string;
      totalItems: number;
      levels: ArchiveLevel[];
    };
  } {
    const archives: Record<number, ArchivedMessage[]> = {};
    for (const [level, archive] of this.archives) {
      archives[level] = [...archive];
    }

    return {
      archives,
      stats: this.getArchiveStats(),
      metadata: {
        exportDate: new Date().toISOString(),
        totalItems: this.getArchiveStats().totalItems,
        levels: [...this.levelConfig]
      }
    };
  }

  /**
   * Importe les archives depuis la persistance
   */
  importArchives(data: {
    archives: Record<number, ArchivedMessage[]>;
    metadata: any;
  }): void {
    for (const [levelStr, archive] of Object.entries(data.archives)) {
      const level = parseInt(levelStr);
      this.archives.set(level, archive);
    }
    console.log(`📥 Archives importées: ${data.metadata.totalItems} éléments`);
  }

  // Méthodes privées

  private determineRole(item: MemoryItem): 'user' | 'assistant' {
    // Logique pour déterminer le rôle basée sur le contenu ou les métadonnées
    if (item.text.includes('⛧') || item.text.includes('Algareth')) {
      return 'assistant';
    }
    return 'user';
  }

  private findItemLevel(itemId: string): number {
    for (const [level, archive] of this.archives) {
      if (archive.some(item => item.id === itemId)) {
        return level;
      }
    }
    return -1;
  }

  private findItem(itemId: string): ArchivedMessage | null {
    for (const archive of this.archives.values()) {
      const item = archive.find(item => item.id === itemId);
      if (item) return item;
    }
    return null;
  }

  private findItemsByCovers(covers: string[], level: number): ArchivedMessage[] {
    const archive = this.archives.get(level) || [];
    return archive.filter(item => covers.includes(item.id));
  }

  private fallbackDecompression(item: ArchivedMessage, targetLevel: number): ArchivedMessage[] {
    // Fallback basique: créer des éléments factices basés sur le résumé
    if (item.covers && item.covers.length > 0) {
      return item.covers.map((coverId, index) => ({
        id: coverId,
        content: `[Fallback] Élément ${index + 1} de ${item.content.substring(0, 50)}...`,
        role: index % 2 === 0 ? 'user' : 'assistant' as 'user' | 'assistant',
        timestamp: item.timestamp,
        level: targetLevel,
        topics: item.topics,
        metadata: {
          originalMessageCount: 1,
          compressionRatio: 1,
          authority: 0.5, // Autorité réduite pour les fallbacks
          user_feedback: 0.5,
          access_cost: 0.1
        }
      }));
    }
    return [];
  }

  private async mem0FallbackSearch(query: string): Promise<ArchivedMessage[]> {
    // Simulation de recherche Mem0
    // Dans une vraie implémentation, on appellerait l'API Mem0
    console.log(`🔍 Recherche Mem0 fallback: "${query}"`);
    
    // Simulation de résultats Mem0
    return [
      {
        id: `mem0_${Date.now()}`,
        content: `[Mem0] Résultat pour "${query}" - contenu archivé dans Mem0`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        level: -1, // Niveau spécial pour Mem0
        topics: [query],
        metadata: {
          originalMessageCount: 1,
          compressionRatio: 1,
          authority: 0.7,
          user_feedback: 0.6,
          access_cost: 0.3
        }
      }
    ];
  }
}