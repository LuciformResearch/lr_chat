/**
 * Gestionnaire de mémoire hiérarchique avec recherche sémantique
 * Étend le HierarchicalMemoryManager avec l'intégration des embeddings Gemini
 */

import { HierarchicalMemoryManager, MemoryItem, MemoryBudget } from './HierarchicalMemoryManager';
import { EmbeddingService, embeddingService } from '../embeddings/EmbeddingService';
import { EmbeddingService as EmbeddingServiceType } from '../embeddings/EmbeddingService';

export interface SemanticMemoryItem extends MemoryItem {
  embedding?: number[];
  semanticTopics?: string[];
  relevanceScore?: number;
}

export interface SemanticSearchResult {
  item: SemanticMemoryItem;
  similarity: number;
  relevanceScore: number;
}

export interface SemanticMemoryConfig {
  embeddingEnabled: boolean;
  semanticThreshold: number;
  maxSemanticResults: number;
  cacheEmbeddings: boolean;
  autoGenerateEmbeddings: boolean;
}

export class SemanticHierarchicalMemoryManager extends HierarchicalMemoryManager {
  private embeddingService: EmbeddingServiceType;
  private config: SemanticMemoryConfig;
  private embeddingCache: Map<string, number[]> = new Map();
  private semanticIndex: Map<string, SemanticMemoryItem[]> = new Map();

  constructor(budgetMax: number = 10000, config: Partial<SemanticMemoryConfig> = {}) {
    super(budgetMax);
    
    this.embeddingService = embeddingService;
    this.config = {
      embeddingEnabled: true,
      semanticThreshold: 0.6,
      maxSemanticResults: 10,
      cacheEmbeddings: true,
      autoGenerateEmbeddings: true,
      ...config
    };

    console.log('🧠 SemanticHierarchicalMemoryManager initialisé avec recherche sémantique');
  }

  /**
   * Ajoute un message avec génération automatique d'embedding
   */
  addMessage(content: string, role: 'user' | 'assistant', user: string = 'user'): void {
    // Appeler la méthode parent
    super.addMessage(content, role, user);

    // Générer l'embedding si activé
    if (this.config.embeddingEnabled && this.config.autoGenerateEmbeddings) {
      this.generateEmbeddingAsync(content, user);
    }
  }

  /**
   * Génère l'embedding de manière asynchrone
   */
  private async generateEmbeddingAsync(content: string, user: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(content);
      
      // Vérifier le cache
      if (this.config.cacheEmbeddings && this.embeddingCache.has(cacheKey)) {
        const embedding = this.embeddingCache.get(cacheKey)!;
        this.updateMemoryItemWithEmbedding(content, embedding);
        return;
      }

      // Générer l'embedding
      const result = await this.embeddingService.generateEmbedding(content);
      
      // Mettre en cache
      if (this.config.cacheEmbeddings) {
        this.embeddingCache.set(cacheKey, result.embedding);
      }

      // Mettre à jour l'item de mémoire
      this.updateMemoryItemWithEmbedding(content, result.embedding);
      
      console.log(`🔮 Embedding généré pour mémoire: ${content.substring(0, 50)}...`);
    } catch (error) {
      console.error('❌ Erreur génération embedding mémoire:', error);
    }
  }

  /**
   * Met à jour un item de mémoire avec son embedding
   */
  private updateMemoryItemWithEmbedding(content: string, embedding: number[]): void {
    const item = this.memory.find(m => m.content === content);
    if (item) {
      (item as SemanticMemoryItem).embedding = embedding;
      (item as SemanticMemoryItem).semanticTopics = this.extractSemanticTopics(content);
      
      // Mettre à jour l'index sémantique
      this.updateSemanticIndex(item as SemanticMemoryItem);
    }
  }

  /**
   * Construit le contexte avec recherche sémantique
   */
  buildContextForPrompt(query: string, maxChars: number = 5000): string {
    if (!this.config.embeddingEnabled) {
      // Fallback vers la méthode parent
      return super.buildContextForPrompt(query, maxChars);
    }

    try {
      // Recherche sémantique
      const semanticResults = this.searchSemanticMemory(query);
      
      // Messages récents (priorité haute)
      const recentMessages = this.getRecentMessages(5);
      const recentChars = this.getCharacterCount(recentMessages);
      
      // Résumés sémantiques pertinents
      const remainingChars = maxChars - recentChars;
      const semanticSummaries = this.getSemanticSummaries(query, remainingChars);
      
      // Combiner les résultats
      const contextItems = [...recentMessages, ...semanticSummaries];
      
      console.log(`🔍 Contexte sémantique: ${semanticResults.length} résultats pertinents`);
      return this.formatContextForPrompt(contextItems);
      
    } catch (error) {
      console.error('❌ Erreur construction contexte sémantique:', error);
      // Fallback vers la méthode parent
      return super.buildContextForPrompt(query, maxChars);
    }
  }

  /**
   * Recherche sémantique dans la mémoire
   */
  private searchSemanticMemory(query: string): SemanticSearchResult[] {
    const results: SemanticSearchResult[] = [];
    
    try {
      // Générer l'embedding de la requête
      this.generateQueryEmbedding(query).then(queryEmbedding => {
        // Rechercher dans tous les items avec embedding
        for (const item of this.memory) {
          const semanticItem = item as SemanticMemoryItem;
          if (semanticItem.embedding) {
            const similarity = this.calculateSimilarity(queryEmbedding, semanticItem.embedding);
            
            if (similarity >= this.config.semanticThreshold) {
              results.push({
                item: semanticItem,
                similarity,
                relevanceScore: this.calculateRelevanceScore(semanticItem, similarity)
              });
            }
          }
        }
        
        // Trier par score de pertinence
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, this.config.maxSemanticResults);
      });
      
    } catch (error) {
      console.error('❌ Erreur recherche sémantique:', error);
    }
    
    return results;
  }

  /**
   * Génère l'embedding de la requête
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const cacheKey = this.getCacheKey(query);
    
    if (this.config.cacheEmbeddings && this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    const result = await this.embeddingService.generateEmbedding(query);
    
    if (this.config.cacheEmbeddings) {
      this.embeddingCache.set(cacheKey, result.embedding);
    }
    
    return result.embedding;
  }

  /**
   * Calcule la similarité cosinus entre deux embeddings
   */
  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
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
   * Calcule le score de pertinence d'un item
   */
  private calculateRelevanceScore(item: SemanticMemoryItem, similarity: number): number {
    let score = similarity;
    
    // Bonus pour les résumés (plus d'information condensée)
    if (item.type === 'summary') {
      score += 0.1;
    }
    
    // Bonus pour les items récents
    const age = Date.now() - new Date(item.timestamp).getTime();
    const ageBonus = Math.max(0, 1 - (age / (7 * 24 * 60 * 60 * 1000))); // 7 jours
    score += ageBonus * 0.1;
    
    // Bonus pour les topics sémantiques
    if (item.semanticTopics && item.semanticTopics.length > 0) {
      score += 0.05;
    }
    
    return Math.min(1, score);
  }

  /**
   * Récupère les résumés sémantiques les plus pertinents
   */
  private getSemanticSummaries(query: string, maxChars: number): MemoryItem[] {
    const semanticResults = this.searchSemanticMemory(query);
    const summaries: MemoryItem[] = [];
    let currentChars = 0;
    
    for (const result of semanticResults) {
      if (result.item.type === 'summary' && currentChars + result.item.characterCount <= maxChars) {
        summaries.push(result.item);
        currentChars += result.item.characterCount;
      }
    }
    
    return summaries;
  }

  /**
   * Extrait les topics sémantiques d'un contenu
   */
  private extractSemanticTopics(content: string): string[] {
    const keywords = [
      'mémoire', 'conversation', 'discussion', 'problème', 'solution',
      'code', 'programmation', 'développement', 'test', 'erreur',
      'Algareth', 'personnalité', 'style', 'ton', 'réponse',
      'embedding', 'sémantique', 'recherche', 'archiviste', 'orchestrateur'
    ];
    
    return keywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 8); // Max 8 topics
  }

  /**
   * Met à jour l'index sémantique
   */
  private updateSemanticIndex(item: SemanticMemoryItem): void {
    if (!item.semanticTopics) return;
    
    for (const topic of item.semanticTopics) {
      if (!this.semanticIndex.has(topic)) {
        this.semanticIndex.set(topic, []);
      }
      
      const topicItems = this.semanticIndex.get(topic)!;
      if (!topicItems.find(i => i.id === item.id)) {
        topicItems.push(item);
      }
    }
  }

  /**
   * Recherche par topic sémantique
   */
  searchByTopic(topic: string): SemanticMemoryItem[] {
    return this.semanticIndex.get(topic) || [];
  }

  /**
   * Obtient les statistiques sémantiques
   */
  getSemanticStats(): {
    totalItems: number;
    itemsWithEmbeddings: number;
    semanticTopics: number;
    cacheSize: number;
    averageSimilarity: number;
  } {
    const itemsWithEmbeddings = this.memory.filter(item => 
      (item as SemanticMemoryItem).embedding
    ).length;
    
    const semanticTopics = this.semanticIndex.size;
    const cacheSize = this.embeddingCache.size;
    
    // Calculer la similarité moyenne (simulation)
    const averageSimilarity = itemsWithEmbeddings > 0 ? 0.75 : 0;
    
    return {
      totalItems: this.memory.length,
      itemsWithEmbeddings,
      semanticTopics,
      cacheSize,
      averageSimilarity
    };
  }

  /**
   * Génère une clé de cache
   */
  private getCacheKey(content: string): string {
    return Buffer.from(content).toString('base64').substring(0, 50);
  }

  /**
   * Vide le cache des embeddings
   */
  clearEmbeddingCache(): void {
    this.embeddingCache.clear();
    this.semanticIndex.clear();
    console.log('🧹 Cache embeddings et index sémantique vidés');
  }

  /**
   * Configure le service sémantique
   */
  updateSemanticConfig(newConfig: Partial<SemanticMemoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Configuration sémantique mise à jour:', this.config);
  }

  /**
   * Teste le service sémantique
   */
  async testSemanticService(): Promise<boolean> {
    try {
      console.log('🧪 Test SemanticHierarchicalMemoryManager...');
      
      // Test de génération d'embedding
      const testContent = "Test de recherche sémantique dans la mémoire hiérarchique";
      const result = await this.embeddingService.generateEmbedding(testContent);
      
      if (result.embedding.length === 0) {
        throw new Error('Embedding vide généré');
      }

      // Test de similarité
      const similarity = this.calculateSimilarity(result.embedding, result.embedding);
      if (similarity !== 1) {
        throw new Error('Calcul de similarité incorrect');
      }

      console.log('✅ SemanticHierarchicalMemoryManager opérationnel');
      return true;

    } catch (error) {
      console.error('❌ Test SemanticHierarchicalMemoryManager échoué:', error);
      return false;
    }
  }
}