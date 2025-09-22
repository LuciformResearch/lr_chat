/**
 * Moteur de recherche proactive pour Algareth
 * Analyse les messages et déclenche des recherches contextuelles
 */

import MiniSearch from 'minisearch';

export interface SearchableItem {
  id: string;
  content: string;
  timestamp: string;
  tags: string[];
  level: number; // L1, L2, L3
  type: 'message' | 'summary' | 'mnemonic';
  authority: number; // 0-1
  user_feedback: number; // 0-1
  access_cost: number; // 0-1
}

export interface MessageAnalysis {
  content: string;
  generatedTags: string[];
  interestScores: Map<string, number>; // 0-1
  contextGaps: string[];
  searchTriggers: SearchTrigger[];
}

export interface SearchTrigger {
  tag: string;
  score: number;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface SearchResult {
  id: string;
  content: string;
  relevanceScore: number;
  tags: string[];
  summary: string;
}

export interface ContextEnrichment {
  originalContext: string;
  searchResults: SearchResult[];
  enrichedContext: string;
  confidence: number;
}

export class ProactiveSearchEngine {
  private searchIndex: MiniSearch<SearchableItem>;
  private tagFrequency: Map<string, number> = new Map();
  private tagRecency: Map<string, number> = new Map();
  
  // Configuration
  private readonly SEARCH_THRESHOLD = 0.7;
  private readonly RANDOM_SEARCH_CHANCE = 0.1; // 10% de chance de recherche aléatoire
  private readonly MAX_SEARCH_RESULTS = 3;
  private readonly SEARCH_TIME_LIMIT = 50; // 50ms max

  constructor() {
    this.searchIndex = new MiniSearch<SearchableItem>({
      fields: ['content', 'tags'],
      storeFields: ['id', 'content', 'timestamp', 'tags', 'level', 'type', 'authority', 'user_feedback', 'access_cost'],
      searchOptions: {
        boost: { content: 2, tags: 1 },
        fuzzy: 0.2,
        prefix: true
      }
    });
  }

  /**
   * Ajoute un item à l'index de recherche
   */
  addItem(item: SearchableItem): void {
    this.searchIndex.add(item);
    this.updateTagStatistics(item.tags);
  }

  /**
   * Supprime un item de l'index
   */
  removeItem(id: string): void {
    this.searchIndex.discard(id);
  }

  /**
   * Met à jour les statistiques des tags
   */
  private updateTagStatistics(tags: string[]): void {
    const now = Date.now();
    
    tags.forEach(tag => {
      // Fréquence
      const currentFreq = this.tagFrequency.get(tag) || 0;
      this.tagFrequency.set(tag, currentFreq + 1);
      
      // Récence
      this.tagRecency.set(tag, now);
    });
  }

  /**
   * Analyse un message et génère des tags d'intérêt
   */
  async analyzeMessage(content: string): Promise<MessageAnalysis> {
    // Génération de tags basique (à améliorer avec LLM)
    const generatedTags = this.generateTags(content);
    
    // Calcul des scores d'intéressement
    const interestScores = new Map<string, number>();
    const searchTriggers: SearchTrigger[] = [];
    
    for (const tag of generatedTags) {
      const score = this.calculateInterestScore(content, tag);
      interestScores.set(tag, score);
      
      if (score > this.SEARCH_THRESHOLD || Math.random() < this.RANDOM_SEARCH_CHANCE) {
        searchTriggers.push({
          tag,
          score,
          reason: this.getSearchReason(score, tag),
          priority: this.getPriority(score)
        });
      }
    }
    
    // Identification des gaps contextuels
    const contextGaps = this.identifyContextGaps(content, generatedTags);
    
    return {
      content,
      generatedTags,
      interestScores,
      contextGaps,
      searchTriggers
    };
  }

  /**
   * Génère des tags à partir du contenu (version basique)
   */
  private generateTags(content: string): string[] {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Mots-clés techniques et concepts
    const technicalKeywords = [
      'mémoire', 'hiérarchique', 'compression', 'résumé', 'budget',
      'système', 'algorithme', 'données', 'contexte', 'recherche',
      'intelligence', 'artificielle', 'apprentissage', 'optimisation',
      'performance', 'efficacité', 'analyse', 'sémantique', 'embedding'
    ];
    
    const conceptKeywords = [
      'discussion', 'conversation', 'échange', 'dialogue', 'communication',
      'réflexion', 'pensée', 'idée', 'concept', 'notion', 'théorie',
      'pratique', 'application', 'utilisation', 'fonctionnement', 'mécanisme'
    ];
    
    const tags: string[] = [];
    
    // Ajouter les mots-clés techniques trouvés
    technicalKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    // Ajouter les concepts trouvés
    conceptKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    // Ajouter les mots les plus fréquents (hors mots vides)
    const stopWords = ['que', 'qui', 'quoi', 'comment', 'pourquoi', 'quand', 'où', 'avec', 'dans', 'sur', 'pour', 'par', 'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'et', 'ou', 'mais', 'donc', 'alors', 'mais', 'cependant', 'néanmoins'];
    const wordFreq = new Map<string, number>();
    
    words.forEach(word => {
      if (!stopWords.includes(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    // Ajouter les 3 mots les plus fréquents
    const sortedWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
    
    tags.push(...sortedWords);
    
    return [...new Set(tags)]; // Supprimer les doublons
  }

  /**
   * Calcule le score d'intéressement pour un tag
   */
  private calculateInterestScore(content: string, tag: string): number {
    const factors = {
      // Fréquence historique du tag
      historicalFrequency: this.getTagFrequency(tag),
      
      // Pertinence contextuelle
      contextualRelevance: this.calculateContextualRelevance(content, tag),
      
      // Récence des interactions
      recency: this.getTagRecency(tag),
      
      // Complexité du sujet
      complexity: this.calculateSubjectComplexity(tag),
      
      // Hasard pour éviter la prédictibilité
      randomness: Math.random() * 0.1
    };
    
    return Math.min(1, 
      factors.historicalFrequency * 0.3 +
      factors.contextualRelevance * 0.4 +
      factors.recency * 0.2 +
      factors.complexity * 0.1 +
      factors.randomness
    );
  }

  /**
   * Obtient la fréquence historique d'un tag
   */
  private getTagFrequency(tag: string): number {
    const freq = this.tagFrequency.get(tag) || 0;
    const maxFreq = Math.max(...Array.from(this.tagFrequency.values()));
    return maxFreq > 0 ? freq / maxFreq : 0;
  }

  /**
   * Calcule la pertinence contextuelle
   */
  private calculateContextualRelevance(content: string, tag: string): number {
    const contentLower = content.toLowerCase();
    const tagLower = tag.toLowerCase();
    
    // Correspondance exacte
    if (contentLower.includes(tagLower)) {
      return 1.0;
    }
    
    // Correspondance partielle (mots similaires)
    const words = contentLower.split(/\s+/);
    const tagWords = tagLower.split(/\s+/);
    
    let matches = 0;
    tagWords.forEach(tagWord => {
      if (words.some(word => word.includes(tagWord) || tagWord.includes(word))) {
        matches++;
      }
    });
    
    return matches / tagWords.length;
  }

  /**
   * Obtient la récence d'un tag
   */
  private getTagRecency(tag: string): number {
    const lastUsed = this.tagRecency.get(tag);
    if (!lastUsed) return 0;
    
    const now = Date.now();
    const hoursSinceLastUse = (now - lastUsed) / (1000 * 60 * 60);
    
    // Score décroît avec le temps (demi-vie de 24h)
    return Math.exp(-hoursSinceLastUse / 24);
  }

  /**
   * Calcule la complexité d'un sujet
   */
  private calculateSubjectComplexity(tag: string): number {
    const complexSubjects = [
      'hiérarchique', 'compression', 'sémantique', 'embedding', 'algorithme',
      'optimisation', 'intelligence', 'artificielle', 'apprentissage', 'mécanisme'
    ];
    
    return complexSubjects.includes(tag.toLowerCase()) ? 0.8 : 0.3;
  }

  /**
   * Identifie les gaps contextuels
   */
  private identifyContextGaps(content: string, tags: string[]): string[] {
    const gaps: string[] = [];
    
    // Détecter les questions
    if (content.includes('?')) {
      gaps.push('contexte_historique');
    }
    
    // Détecter les références au passé
    if (content.toLowerCase().includes('souviens') || content.toLowerCase().includes('discussion')) {
      gaps.push('contexte_historique');
    }
    
    // Détecter les sujets techniques
    const technicalTags = tags.filter(tag => 
      ['hiérarchique', 'compression', 'sémantique', 'algorithme'].includes(tag)
    );
    
    if (technicalTags.length > 0) {
      gaps.push('détails_techniques');
    }
    
    return gaps;
  }

  /**
   * Obtient la raison de la recherche
   */
  private getSearchReason(score: number, tag: string): string {
    if (score > 0.9) return 'sujet_très_pertinent';
    if (score > 0.8) return 'sujet_technique_complexe';
    if (score > 0.7) return 'sujet_central';
    return 'recherche_aléatoire';
  }

  /**
   * Obtient la priorité de la recherche
   */
  private getPriority(score: number): 'low' | 'medium' | 'high' {
    if (score > 0.8) return 'high';
    if (score > 0.6) return 'medium';
    return 'low';
  }

  /**
   * Effectue une recherche low-cost
   */
  async performLowCostSearch(triggers: SearchTrigger[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const startTime = Date.now();
    
    for (const trigger of triggers) {
      // Vérifier la limite de temps
      if (Date.now() - startTime > this.SEARCH_TIME_LIMIT) {
        break;
      }
      
      try {
        const searchResults = this.searchIndex.search(trigger.tag, {
          limit: this.MAX_SEARCH_RESULTS,
          boost: { content: 2, tags: 1 }
        });
        
        const processedResults = searchResults.map(result => ({
          id: result.id,
          content: result.content,
          relevanceScore: this.calculateRelevanceScore(trigger.tag, result),
          tags: result.tags,
          summary: this.generateSummary(result.content)
        }));
        
        results.push(...processedResults);
      } catch (error) {
        console.warn(`Erreur lors de la recherche pour le tag "${trigger.tag}":`, error);
      }
    }
    
    // Trier par score de pertinence et limiter les résultats
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, this.MAX_SEARCH_RESULTS);
  }

  /**
   * Calcule le score de pertinence pour un résultat
   */
  private calculateRelevanceScore(query: string, result: any): number {
    const contentMatch = result.content.toLowerCase().includes(query.toLowerCase()) ? 0.8 : 0.3;
    const tagMatch = result.tags.includes(query) ? 0.9 : 0.1;
    const authority = result.authority || 0.5;
    const recency = this.calculateRecency(result.timestamp);
    
    return (contentMatch * 0.4) + (tagMatch * 0.3) + (authority * 0.2) + (recency * 0.1);
  }

  /**
   * Calcule la récence d'un timestamp
   */
  private calculateRecency(timestamp: string): number {
    const itemTime = new Date(timestamp).getTime();
    const now = Date.now();
    const hoursSinceCreation = (now - itemTime) / (1000 * 60 * 60);
    
    // Score décroît avec le temps (demi-vie de 48h)
    return Math.exp(-hoursSinceCreation / 48);
  }

  /**
   * Génère un résumé court d'un contenu
   */
  private generateSummary(content: string): string {
    const words = content.split(' ');
    if (words.length <= 20) return content;
    
    return words.slice(0, 20).join(' ') + '...';
  }

  /**
   * Enrichit le contexte avec les résultats de recherche
   */
  enrichContext(originalContext: string, searchResults: SearchResult[]): ContextEnrichment {
    const relevantResults = searchResults
      .filter(result => result.relevanceScore > 0.6)
      .slice(0, 2); // Max 2 résultats pour éviter la surcharge
    
    const enrichedContext = relevantResults.length > 0 
      ? `${originalContext}\n\nContexte enrichi:\n${relevantResults.map(r => r.summary).join('\n')}`
      : originalContext;
    
    return {
      originalContext,
      searchResults: relevantResults,
      enrichedContext,
      confidence: relevantResults.length > 0 ? 0.8 : 0.2
    };
  }

  /**
   * Génère une réponse avec intégration de ***se rappeler***
   */
  generateResponseWithMemory(
    enrichedContext: ContextEnrichment,
    userMessage: string,
    algarethResponse: string
  ): string {
    let response = algarethResponse;
    
    // Si le contexte a été enrichi, ajouter ***se rappeler***
    if (enrichedContext.confidence > 0.7 && enrichedContext.searchResults.length > 0) {
      const relevantTags = enrichedContext.searchResults
        .flatMap(result => result.tags)
        .filter((tag, index, array) => array.indexOf(tag) === index) // Supprimer les doublons
        .slice(0, 3);
      
      if (relevantTags.length > 0) {
        response += `\n\n***se rappeler: [${relevantTags.join(', ')}]***`;
      }
    }
    
    return response;
  }

  /**
   * Obtient les statistiques du moteur
   */
  getStats(): {
    totalItems: number;
    totalTags: number;
    mostFrequentTags: Array<{tag: string, frequency: number}>;
    searchThreshold: number;
    randomSearchChance: number;
  } {
    const totalItems = this.searchIndex.documentCount;
    const totalTags = this.tagFrequency.size;
    
    const mostFrequentTags = Array.from(this.tagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, frequency]) => ({ tag, frequency }));
    
    return {
      totalItems,
      totalTags,
      mostFrequentTags,
      searchThreshold: this.SEARCH_THRESHOLD,
      randomSearchChance: this.RANDOM_SEARCH_CHANCE
    };
  }
}