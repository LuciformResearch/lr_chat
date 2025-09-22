/**
 * SimpleSearchEngine - Moteur de recherche simple avec décompression
 * 
 * Architecture:
 * 1. Recherche regex sur niveau actuel
 * 2. Décompression L3→L2→L1→L0 si pas assez de résultats
 * 3. Fallback Mem0 si nécessaire
 */

import { ArchiveManager, ArchivedMessage } from './ArchiveManager';

export interface SearchQuery {
  text: string;
  keywords: string[];
  threshold: number; // Nombre minimum de résultats
  maxResults: number;
}

export interface SearchResult {
  id: string;
  content: string;
  level: number;
  relevance: number;
  source: 'local' | 'mem0';
  metadata: {
    timestamp: string;
    topics?: string[];
    covers?: string[];
  };
}

export interface SearchContext {
  userId?: string;
  sessionId?: string;
  currentLevel?: number;
}

export class SimpleSearchEngine {
  private archiveManager: ArchiveManager;
  private mem0Fallback: boolean;

  constructor(archiveManager: ArchiveManager, mem0Fallback: boolean = true) {
    this.archiveManager = archiveManager;
    this.mem0Fallback = mem0Fallback;
  }

  /**
   * Recherche principale avec décompression
   */
  async search(query: string, context: SearchContext = {}): Promise<SearchResult[]> {
    const searchQuery: SearchQuery = {
      text: query,
      keywords: this.extractKeywords(query),
      threshold: 3,
      maxResults: 10
    };

    console.log(`🔍 Recherche: "${query}"`);
    
    // Phase 1: Recherche sur niveau actuel
    let results = await this.searchCurrentLevel(searchQuery, context);
    
    // Phase 2: Décompression si pas assez de résultats
    if (results.length < searchQuery.threshold) {
      console.log(`📉 Pas assez de résultats (${results.length}), décompression...`);
      results = await this.searchWithDecompression(searchQuery, context);
    }
    
    // Phase 3: Fallback Mem0 si nécessaire
    if (results.length < searchQuery.threshold && this.mem0Fallback) {
      console.log(`🔄 Fallback Mem0...`);
      const mem0Results = await this.mem0FallbackSearch(searchQuery);
      results.push(...mem0Results);
    }
    
    console.log(`✅ ${results.length} résultats trouvés`);
    return this.rankAndLimit(results, searchQuery.maxResults);
  }

  /**
   * Recherche sur le niveau actuel
   */
  private async searchCurrentLevel(query: SearchQuery, context: SearchContext): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Recherche dans tous les niveaux disponibles
    for (let level = 3; level >= 0; level--) {
      const levelResults = await this.searchLevel(query, level);
      results.push(...levelResults);
      
      // Arrêter si on a assez de résultats
      if (results.length >= query.threshold) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Recherche avec décompression hiérarchique
   */
  private async searchWithDecompression(query: SearchQuery, context: SearchContext): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Décompression L3→L2→L1→L0
    for (let level = 3; level >= 0; level--) {
      const levelResults = await this.searchLevel(query, level);
      results.push(...levelResults);
      
      // Si on a assez de résultats, arrêter
      if (results.length >= query.threshold) {
        break;
      }
      
      // Décompression vers niveau inférieur
      if (level > 0) {
        await this.decompressLevel(level);
      }
    }
    
    return results;
  }

  /**
   * Recherche sur un niveau spécifique
   */
  private async searchLevel(query: SearchQuery, level: number): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Obtenir les archives du niveau
    const archives = this.archiveManager['archives'].get(level) || [];
    
    for (const item of archives) {
      const relevance = this.calculateRelevance(item, query);
      
      if (relevance > 0.1) { // Seuil de pertinence
        results.push({
          id: item.id,
          content: item.content,
          level: item.level,
          relevance,
          source: 'local',
          metadata: {
            timestamp: item.timestamp,
            topics: item.topics,
            covers: item.covers
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Calcul de pertinence basé sur regex et keywords
   */
  private calculateRelevance(item: ArchivedMessage, query: SearchQuery): number {
    let relevance = 0;
    const content = item.content.toLowerCase();
    const queryText = query.text.toLowerCase();
    
    // Recherche exacte (poids fort)
    if (content.includes(queryText)) {
      relevance += 0.8;
    }
    
    // Recherche par keywords
    for (const keyword of query.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        relevance += 0.3;
      }
    }
    
    // Recherche par topics
    if (item.topics) {
      for (const topic of item.topics) {
        if (query.keywords.some(k => topic.toLowerCase().includes(k.toLowerCase()))) {
          relevance += 0.2;
        }
      }
    }
    
    // Bonus pour les niveaux plus récents
    const levelBonus = (4 - item.level) * 0.1;
    relevance += levelBonus;
    
    return Math.min(relevance, 1.0);
  }

  /**
   * Extraction de keywords simples
   */
  private extractKeywords(query: string): string[] {
    // Supprimer les mots vides
    const stopWords = ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui', 'quoi', 'où', 'quand', 'comment', 'pourquoi'];
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Max 5 keywords
  }

  /**
   * Décompression d'un niveau (simulation)
   */
  private async decompressLevel(level: number): Promise<void> {
    console.log(`🔄 Décompression niveau ${level}...`);
    // Pour l'instant, simulation
    // Dans une vraie implémentation, on décompresserait vers le niveau inférieur
  }

  /**
   * Fallback Mem0 (simulation)
   */
  private async mem0FallbackSearch(query: SearchQuery): Promise<SearchResult[]> {
    console.log(`🔍 Recherche Mem0 fallback: "${query.text}"`);
    
    // Simulation de résultats Mem0
    return [
      {
        id: `mem0_${Date.now()}`,
        content: `[Mem0] Résultat pour "${query.text}" - contenu archivé dans Mem0`,
        level: -1,
        relevance: 0.7,
        source: 'mem0',
        metadata: {
          timestamp: new Date().toISOString(),
          topics: query.keywords
        }
      }
    ];
  }

  /**
   * Classement et limitation des résultats
   */
  private rankAndLimit(results: SearchResult[], maxResults: number): SearchResult[] {
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);
  }

  /**
   * Recherche avancée avec options
   */
  async advancedSearch(options: {
    query: string;
    levels?: number[];
    minRelevance?: number;
    maxResults?: number;
    includeMem0?: boolean;
  }): Promise<SearchResult[]> {
    const { query, levels = [3, 2, 1, 0], minRelevance = 0.1, maxResults = 10, includeMem0 = true } = options;
    
    const searchQuery: SearchQuery = {
      text: query,
      keywords: this.extractKeywords(query),
      threshold: 1,
      maxResults
    };

    const results: SearchResult[] = [];
    
    // Recherche sur niveaux spécifiés
    for (const level of levels) {
      const levelResults = await this.searchLevel(searchQuery, level);
      results.push(...levelResults.filter(r => r.relevance >= minRelevance));
    }
    
    // Fallback Mem0 si demandé
    if (includeMem0 && results.length < maxResults) {
      const mem0Results = await this.mem0FallbackSearch(searchQuery);
      results.push(...mem0Results);
    }
    
    return this.rankAndLimit(results, maxResults);
  }

  /**
   * Statistiques de recherche
   */
  getSearchStats(): {
    totalArchives: number;
    archivesByLevel: Record<number, number>;
    lastSearchTime?: number;
  } {
    const stats = this.archiveManager.getArchiveStats();
    
    return {
      totalArchives: stats.totalItems,
      archivesByLevel: stats.itemsByLevel,
      lastSearchTime: Date.now()
    };
  }
}