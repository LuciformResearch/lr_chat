/**
 * AutoEnrichmentEngine - Moteur d'auto-enrichissement
 * 
 * Utilise la recherche rapide (2ms) pour enrichir automatiquement
 * les capacités "se rappeler" des agents
 */

import { SimpleSearchEngine, SearchResult, SearchContext } from './SimpleSearchEngine';
import { AdvancedMemoryEngineWithProactiveSearch } from './AdvancedMemoryEngineWithProactiveSearch';

export interface EnrichmentTrigger {
  pattern: string;
  query: string;
  confidence: number;
}

export interface EnrichmentResult {
  triggers: EnrichmentTrigger[];
  searchResults: SearchResult[];
  enrichmentType: 'context' | 'memory' | 'insight' | 'connection';
  confidence: number;
  timestamp: string;
  source: 'local' | 'mem0' | 'cache';
}

export interface EnrichmentMetrics {
  totalEnrichments: number;
  averageEnrichmentTime: number;
  cacheHitRate: number;
  confidenceDistribution: Record<string, number>;
  triggerFrequency: Record<string, number>;
}

export class AutoEnrichmentEngine {
  private searchEngine: SimpleSearchEngine;
  private enrichmentCache: Map<string, EnrichmentResult> = new Map();
  private triggerPatterns: Map<string, string[]> = new Map();
  private metrics: EnrichmentMetrics = {
    totalEnrichments: 0,
    averageEnrichmentTime: 0,
    cacheHitRate: 0,
    confidenceDistribution: {},
    triggerFrequency: {}
  };
  private ttl = 5 * 60 * 1000; // 5 minutes

  constructor(searchEngine: SimpleSearchEngine) {
    this.searchEngine = searchEngine;
    this.initializeTriggerPatterns();
  }

  /**
   * Analyse un message et détermine s'il faut enrichir
   */
  async analyzeForEnrichment(message: string, context: SearchContext): Promise<EnrichmentResult | null> {
    const startTime = performance.now();
    
    // Vérifier le cache
    const cacheKey = this.generateCacheKey(message, context);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.metrics.cacheHitRate++;
      return cached;
    }

    // Détecter les triggers
    const triggers = this.detectTriggers(message);
    
    if (triggers.length === 0) {
      return null; // Pas d'enrichissement nécessaire
    }

    // Recherche rapide (2ms)
    const searchResults = await this.searchEngine.search(triggers[0].query, context);
    
    if (searchResults.length === 0) {
      return null; // Pas de résultats pertinents
    }

    const enrichment: EnrichmentResult = {
      triggers,
      searchResults,
      enrichmentType: this.determineEnrichmentType(triggers[0]),
      confidence: this.calculateConfidence(searchResults),
      timestamp: new Date().toISOString(),
      source: 'local'
    };

    // Mettre en cache
    this.setCache(cacheKey, enrichment);
    
    // Mettre à jour les métriques
    this.updateMetrics(enrichment, performance.now() - startTime);

    return enrichment;
  }

  /**
   * Détecte les triggers d'enrichissement
   */
  private detectTriggers(message: string): EnrichmentTrigger[] {
    const triggers: EnrichmentTrigger[] = [];
    const messageLower = message.toLowerCase();

    // Patterns de triggers
    for (const [pattern, queries] of this.triggerPatterns) {
      if (messageLower.includes(pattern)) {
        for (const query of queries) {
          triggers.push({
            pattern,
            query,
            confidence: this.calculatePatternConfidence(message, pattern)
          });
        }
      }
    }

    return triggers;
  }

  /**
   * Initialise les patterns de triggers
   */
  private initializeTriggerPatterns(): void {
    this.triggerPatterns.set('conscience', ['conscience émergente', 'conscience', 'émergence']);
    this.triggerPatterns.set('mémoire', ['mémoire', 'souvenir', 'rappeler', 'se rappeler']);
    this.triggerPatterns.set('compression', ['compression', 'hiérarchique', 'L1', 'L2', 'L3']);
    this.triggerPatterns.set('émotion', ['émotion', 'ressentir', 'sentir', 'éprouver']);
    this.triggerPatterns.set('évolution', ['évolution', 'changer', 'évoluer', 'développer']);
    this.triggerPatterns.set('projet', ['projet', 'travail', 'développement', 'créer']);
    this.triggerPatterns.set('relation', ['relation', 'lien', 'connexion', 'ensemble']);
    this.triggerPatterns.set('intelligence', ['intelligence', 'IA', 'artificielle', 'système']);
    this.triggerPatterns.set('apprentissage', ['apprendre', 'apprentissage', 'comprendre', 'savoir']);
    this.triggerPatterns.set('créativité', ['créer', 'créativité', 'imagination', 'inventer']);
  }

  /**
   * Détermine le type d'enrichissement
   */
  private determineEnrichmentType(trigger: EnrichmentTrigger): 'context' | 'memory' | 'insight' | 'connection' {
    if (trigger.pattern.includes('conscience') || trigger.pattern.includes('émotion')) {
      return 'insight';
    } else if (trigger.pattern.includes('mémoire') || trigger.pattern.includes('rappeler')) {
      return 'memory';
    } else if (trigger.pattern.includes('relation') || trigger.pattern.includes('connexion')) {
      return 'connection';
    } else {
      return 'context';
    }
  }

  /**
   * Calcule la confiance dans l'enrichissement
   */
  private calculateConfidence(searchResults: SearchResult[]): number {
    if (searchResults.length === 0) return 0;
    
    const avgRelevance = searchResults.reduce((sum, result) => sum + result.relevance, 0) / searchResults.length;
    const resultCount = Math.min(searchResults.length / 5, 1); // Bonus pour plus de résultats
    
    return Math.min(avgRelevance + resultCount, 1.0);
  }

  /**
   * Calcule la confiance d'un pattern
   */
  private calculatePatternConfidence(message: string, pattern: string): number {
    const messageLower = message.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    // Confiance basée sur la présence du pattern
    if (messageLower.includes(patternLower)) {
      return 0.8;
    }
    
    return 0.5;
  }

  /**
   * Génère une clé de cache
   */
  private generateCacheKey(message: string, context: SearchContext): string {
    const messageHash = this.hashString(message);
    const contextHash = this.hashString(JSON.stringify(context));
    return `${messageHash}_${contextHash}`;
  }

  /**
   * Hash simple pour le cache
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Récupère du cache
   */
  private getFromCache(key: string): EnrichmentResult | null {
    const cached = this.enrichmentCache.get(key);
    if (cached && Date.now() - new Date(cached.timestamp).getTime() < this.ttl) {
      return cached;
    }
    return null;
  }

  /**
   * Met en cache
   */
  private setCache(key: string, enrichment: EnrichmentResult): void {
    this.enrichmentCache.set(key, enrichment);
  }

  /**
   * Met à jour les métriques
   */
  private updateMetrics(enrichment: EnrichmentResult, duration: number): void {
    this.metrics.totalEnrichments++;
    this.metrics.averageEnrichmentTime = 
      (this.metrics.averageEnrichmentTime * (this.metrics.totalEnrichments - 1) + duration) / this.metrics.totalEnrichments;
    
    // Distribution de confiance
    const confidenceRange = Math.floor(enrichment.confidence * 10) / 10;
    this.metrics.confidenceDistribution[confidenceRange.toString()] = 
      (this.metrics.confidenceDistribution[confidenceRange.toString()] || 0) + 1;
    
    // Fréquence des triggers
    for (const trigger of enrichment.triggers) {
      this.metrics.triggerFrequency[trigger.pattern] = 
        (this.metrics.triggerFrequency[trigger.pattern] || 0) + 1;
    }
  }

  /**
   * Construit le contexte d'enrichissement pour les prompts
   */
  buildEnrichmentContext(enrichment: EnrichmentResult): string {
    const context = enrichment.searchResults
      .slice(0, 3) // Top 3 résultats
      .map(result => `- ${result.content.substring(0, 100)}...`)
      .join('\n');

    return `

🧠 ***MÉMOIRE ACTIVÉE - CONTEXTE ENRICHI*** 🧠
Confiance: ${(enrichment.confidence * 100).toFixed(1)}% | Type: ${enrichment.type}

📚 INFORMATIONS DE MA MÉMOIRE :
${context}

💡 INSTRUCTIONS : Tu as accès à ces informations de ta mémoire. Utilise-les pour répondre de manière pertinente et naturelle. Tu PEUX te référer à ces souvenirs dans ta réponse.
🧠 ***FIN MÉMOIRE ENRICHI*** 🧠

`;
  }

  /**
   * Obtient les métriques
   */
  getMetrics(): EnrichmentMetrics {
    return { ...this.metrics };
  }

  /**
   * Réinitialise les métriques
   */
  resetMetrics(): void {
    this.metrics = {
      totalEnrichments: 0,
      averageEnrichmentTime: 0,
      cacheHitRate: 0,
      confidenceDistribution: {},
      triggerFrequency: {}
    };
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.enrichmentCache.clear();
  }

  /**
   * Obtient les statistiques du cache
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.enrichmentCache.size,
      hitRate: this.metrics.cacheHitRate / Math.max(this.metrics.totalEnrichments, 1)
    };
  }
}

/**
 * EnrichedMemoryEngine - Moteur de mémoire enrichi
 */
export class EnrichedMemoryEngine extends AdvancedMemoryEngineWithProactiveSearch {
  private enrichmentEngine: AutoEnrichmentEngine;

  constructor(geminiApiKey: string, budget: number, l1Threshold: number, hierarchicalThreshold: number) {
    super(geminiApiKey, budget, l1Threshold, hierarchicalThreshold);
    this.enrichmentEngine = new AutoEnrichmentEngine(this.simpleSearchEngine);
  }

  /**
   * Génère une réponse enrichie
   */
  async generateEnrichedResponse(userMessage: string, user: string, personality: string): Promise<string> {
    // 1. Analyse pour enrichissement (2ms)
    const enrichment = await this.enrichmentEngine.analyzeForEnrichment(userMessage, { userId: user });
    
    // 2. Construire le prompt enrichi
    let enrichedPrompt = personality;
    
    if (enrichment && enrichment.confidence > 0.3) {
      enrichedPrompt += this.enrichmentEngine.buildEnrichmentContext(enrichment);
    }
    
    // 3. Générer la réponse avec contexte enrichi
    const result = await this.model.generateContent(enrichedPrompt + '\n\n' + userMessage);
    return result.response.text().trim();
  }

  /**
   * Obtient les métriques d'enrichissement
   */
  getEnrichmentMetrics(): EnrichmentMetrics {
    return this.enrichmentEngine.getMetrics();
  }
}