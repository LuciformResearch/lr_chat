/**
 * Service de recherche sémantique utilisant PostgreSQL pgvector
 * Fournit des méthodes de recherche vectorielle pour les messages et mémoires archiviste
 */

import { Pool } from 'pg';
import { EmbeddingService, embeddingService } from '../embeddings/EmbeddingService';

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: {
    sessionId?: string;
    sessionTitle?: string;
    authUserId?: string;
    userIdentityId?: string;
    role?: string;
    timestamp?: string;
    summary?: string;
  };
}

export interface SemanticSearchOptions {
  userId?: string;
  authUserId?: string;
  similarityThreshold?: number;
  maxResults?: number;
  includeMetadata?: boolean;
  embeddingProvider?: string;
  role?: 'user' | 'assistant' | 'both';
  rolePriority?: 'userFirst' | 'assistantFirst' | 'none';
}

export class SemanticSearchService {
  private pool: Pool;
  private embeddingService: EmbeddingService | undefined;

  constructor(pool: Pool, embeddingService?: EmbeddingService) {
    this.pool = pool;
    this.embeddingService = embeddingService;
  }

  /**
   * Recherche sémantique dans les messages
   */
  async searchMessages(
    query: string, 
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      userId,
      authUserId,
      similarityThreshold = 0.7,
      maxResults = 10,
      includeMetadata = true,
      embeddingProvider = 'gemini',
      role = 'both',
      rolePriority = 'userFirst'
    } = options;

    const debug = process.env.DEBUG_SEMANTIC === '1';
    if (debug) {
      console.log(`🔍 SemanticSearchService.searchMessages appelé:`);
      console.log(`   Query: "${query}"`);
      console.log(`   UserId: "${userId}"`);
      console.log(`   Threshold: ${similarityThreshold}`);
      console.log(`   MaxResults: ${maxResults}`);
      console.log(`   Provider: ${embeddingProvider}`);
    }

    try {
      // Générer l'embedding de la requête
      if (debug) console.log(`🔮 Génération embedding pour: "${query}"`);
      const queryEmbedding = await this.embeddingService.generateEmbedding(query, embeddingProvider);
      if (debug) console.log(`✅ Embedding généré: ${queryEmbedding.embedding.length} dimensions`);
      
      // Recherche vectorielle dans PostgreSQL
      // Filtre utilisateur:
      // - Si identity + authUserId fournis: autoriser sessions de l'identité OU anciennes sessions de cet authUser (backfill)
      // - Si seulement identity: filtrer sur identity
      // - Si seulement authUserId: filtrer sur user_id
      let whereUserFilter = '';
      let thresholdIndex = 2;
      if (userId && authUserId) {
        whereUserFilter = 'AND (s.user_identity_id = $2::uuid OR s.user_id = $3)';
        thresholdIndex = 4;
      } else if (userId) {
        whereUserFilter = 'AND s.user_identity_id = $2::uuid';
        thresholdIndex = 3;
      } else if (authUserId) {
        whereUserFilter = 'AND s.user_id = $2';
        thresholdIndex = 3;
      }
      const limitIndex = thresholdIndex + 1;

      // Filtre de rôle
      const roleFilter = role === 'both' ? '' : `AND m.role = '${role}'`;

      // Priorisation de rôle
      const rolePriorityExpr = rolePriority === 'userFirst'
        ? `CASE WHEN m.role = 'user' THEN 0 ELSE 1 END`
        : rolePriority === 'assistantFirst'
          ? `CASE WHEN m.role = 'assistant' THEN 0 ELSE 1 END`
          : `0`;

      const searchQuery = `
        SELECT 
          m.id,
          m.content,
          m.role,
          m.created_at,
          s.id as session_id,
          s.title as session_title,
          s.user_id,
          s.user_identity_id,
          1 - (m.embedding <=> $1::vector) as similarity
        FROM messages m
        JOIN sessions s ON m.session_id = s.id
        WHERE 
          m.embedding IS NOT NULL
          ${whereUserFilter}
          ${roleFilter}
          AND (1 - (m.embedding <=> $1::vector)) >= $${thresholdIndex}
        ORDER BY ${rolePriorityExpr} ASC, m.embedding <=> $1::vector
        LIMIT $${limitIndex}
      `;

      // Convertir l'embedding en tableau pour PostgreSQL
      let embeddingArray: number[];
      
      if (Array.isArray(queryEmbedding.embedding)) {
        embeddingArray = queryEmbedding.embedding;
      } else if (typeof queryEmbedding.embedding === 'string') {
        // Si c'est une chaîne JSON, la parser
        embeddingArray = JSON.parse(queryEmbedding.embedding);
      } else {
        // Si c'est un objet, extraire les valeurs
        embeddingArray = Object.values(queryEmbedding.embedding);
      }
      
      // Convertir le tableau en format PostgreSQL vector
      const vectorString = `[${embeddingArray.join(',')}]`;
      
      let params: any[] = [];
      if (userId && authUserId) {
        params = [vectorString, userId, authUserId, similarityThreshold, maxResults];
      } else if (userId) {
        params = [vectorString, userId, similarityThreshold, maxResults];
      } else if (authUserId) {
        params = [vectorString, authUserId, similarityThreshold, maxResults];
      } else {
        params = [vectorString, similarityThreshold, maxResults];
      }

      if (debug) {
        console.log(`🔍 Requête SQL générée:`);
        console.log(`   SQL: ${searchQuery.replace(/\s+/g, ' ').trim()}`);
        console.log(`   Params: ${JSON.stringify(params.map((p,i)=> i===0?'[vector]':p))}`);
        console.log(`   VectorString: ${vectorString.substring(0, 100)}...`);
        console.log(`   UserId: "${userId}"`);
        console.log(`   AuthUserId: "${authUserId}"`);
        console.log(`   Threshold: ${similarityThreshold}`);
        console.log(`   MaxResults: ${maxResults}`);
        console.log(`   Role: ${role} | RolePriority: ${rolePriority}`);
      }
      
      if (debug) console.log(`🔍 Exécution de la requête SQL...`);
      const startTime = Date.now();
      let result = await this.pool.query(searchQuery, params);
      const endTime = Date.now();
      console.log(`📊 Résultats: ${result.rows.length} lignes (${endTime - startTime}ms)`);
      
      // Fallback auto: si peu de résultats (< min(3, maxResults)) et seuil > 0.3, réessayer avec 0.3
      if (result.rows.length < Math.min(maxResults, 3) && similarityThreshold > 0.3) {
        const fallbackThreshold = 0.3;
        console.log(`🔁 Fallback recherche: 0 résultat avec threshold=${similarityThreshold}. Nouvelle tentative avec threshold=${fallbackThreshold}`);
        let fbParams: any[] = [];
        if (userId && authUserId) {
          fbParams = [vectorString, userId, authUserId, fallbackThreshold, maxResults];
        } else if (userId) {
          fbParams = [vectorString, userId, fallbackThreshold, maxResults];
        } else if (authUserId) {
          fbParams = [vectorString, authUserId, fallbackThreshold, maxResults];
        } else {
          fbParams = [vectorString, fallbackThreshold, maxResults];
        }
        const fbStart = Date.now();
        const fbResult = await this.pool.query(searchQuery, fbParams);
        const fbEnd = Date.now();
        console.log(`📊 Résultats (fallback): ${fbResult.rows.length} lignes (${fbEnd - fbStart}ms)`);
        // Fusionner en évitant doublons par id
        const seen = new Set(result.rows.map(r => r.id));
        const merged = result.rows.concat(fbResult.rows.filter(r => !seen.has(r.id)));
        result = { ...result, rows: merged } as any;
      }
      
      // Logs des résultats
      if (debug && result.rows.length > 0) {
        console.log(`🔍 Détail des résultats SQL:`);
        result.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ID: ${row.id}, Content: "${row.content.substring(0, 50)}...", Similarity: ${row.similarity}`);
        });
      }

      const searchResults = result.rows.map(row => ({
        id: row.id,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: {
          sessionId: row.session_id,
          sessionTitle: row.session_title,
          authUserId: row.user_id,
          userIdentityId: row.user_identity_id,
          role: row.role,
          timestamp: row.created_at ? (typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString()) : undefined
        }
      }));

      if (debug) {
        console.log(`✅ Résultats finaux: ${searchResults.length} résultats`);
        searchResults.forEach((result, index) => {
          console.log(`   ${index + 1}. "${result.content.substring(0, 50)}..." (similarité: ${result.similarity.toFixed(3)}, session: ${result.metadata.sessionId})`);
        });
      }

      return searchResults;

    } catch (error) {
      console.error('❌ Erreur recherche sémantique messages:', error);
      throw error;
    }
  }

  /**
   * Recherche sémantique dans les mémoires archiviste
   */
  async searchArchivistMemories(
    query: string,
    userId: string,
    options: Omit<SemanticSearchOptions, 'userId'> = {}
  ): Promise<SearchResult[]> {
    const {
      similarityThreshold = 0.7,
      maxResults = 10,
      includeMetadata = true
    } = options;

    try {
      // Générer l'embedding de la requête
      const queryEmbedding = await this.embeddingService.generateEmbedding(query, 'gemini');

      // Convertir l'embedding en format PostgreSQL vector
      let embeddingArray: number[];
      if (Array.isArray(queryEmbedding.embedding)) {
        embeddingArray = queryEmbedding.embedding;
      } else if (typeof queryEmbedding.embedding === 'string') {
        embeddingArray = JSON.parse(queryEmbedding.embedding);
      } else {
        embeddingArray = Object.values(queryEmbedding.embedding);
      }
      const vectorString = `[${embeddingArray.join(',')}]`;
      
      // Recherche vectorielle dans les mémoires archiviste
      const searchQuery = `
        SELECT 
          id,
          session_id,
          user_id,
          summary,
          timestamp,
          1 - (embedding <=> $1::vector) as similarity
        FROM archivist_memories
        WHERE 
          embedding IS NOT NULL
          AND user_id = $2
          AND (1 - (embedding <=> $1::vector)) >= $3
        ORDER BY embedding <=> $1::vector
        LIMIT $4
      `;

      let result = await this.pool.query(searchQuery, [
        vectorString,
        userId,
        similarityThreshold,
        maxResults
      ]);

      // Fallback si aucun résultat avec seuil élevé
      if (result.rows.length === 0 && similarityThreshold > 0.3) {
        const fb = await this.pool.query(searchQuery, [
          vectorString,
          userId,
          0.3,
          maxResults
        ]);
        result = fb;
      }

      return result.rows.map(row => ({
        id: row.id,
        content: row.summary,
        similarity: parseFloat(row.similarity),
        metadata: {
          sessionId: row.session_id,
          userId: row.user_id,
          timestamp: row.timestamp ? (typeof row.timestamp === 'string' ? row.timestamp : row.timestamp.toISOString()) : undefined,
          summary: row.summary
        }
      }));

    } catch (error) {
      console.error('❌ Erreur recherche sémantique mémoires archiviste:', error);
      throw error;
    }
  }

  /**
   * Recherche hybride (sémantique + mots-clés)
   */
  async hybridSearchMessages(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      userId,
      similarityThreshold = 0.6,
      maxResults = 10
    } = options;

    try {
      // Recherche sémantique
      const semanticResults = await this.searchMessages(query, {
        ...options,
        similarityThreshold: similarityThreshold,
        maxResults: Math.ceil(maxResults * 0.7) // 70% sémantique
      });

      // Recherche par mots-clés
      const keywordResults = await this.keywordSearchMessages(query, {
        ...options,
        maxResults: Math.ceil(maxResults * 0.3) // 30% mots-clés
      });

      // Fusionner et dédupliquer les résultats
      const combinedResults = this.mergeSearchResults(semanticResults, keywordResults);
      
      return combinedResults.slice(0, maxResults);

    } catch (error) {
      console.error('❌ Erreur recherche hybride:', error);
      throw error;
    }
  }

  /**
   * Recherche par mots-clés (fallback)
   */
  private async keywordSearchMessages(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      userId,
      maxResults = 10
    } = options;

    try {
      const searchQuery = `
        SELECT 
          m.id,
          m.content,
          m.role,
          m.created_at,
          s.id as session_id,
          s.user_id,
          ts_rank(to_tsvector('french', m.content), plainto_tsquery('french', $1)) as similarity
        FROM messages m
        JOIN sessions s ON m.session_id = s.id
        WHERE 
          to_tsvector('french', m.content) @@ plainto_tsquery('french', $1)
          ${userId ? 'AND s.user_id = $2' : ''}
        ORDER BY ts_rank(to_tsvector('french', m.content), plainto_tsquery('french', $1)) DESC
        LIMIT $${userId ? '3' : '2'}
      `;

      const params = userId 
        ? [query, userId, maxResults]
        : [query, maxResults];

      const result = await this.pool.query(searchQuery, params);

      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: {
          sessionId: row.session_id,
          userId: row.user_id,
          role: row.role,
          timestamp: row.created_at ? (typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString()) : undefined
        }
      }));

    } catch (error) {
      console.error('❌ Erreur recherche mots-clés:', error);
      return [];
    }
  }

  /**
   * Fusionne les résultats de recherche sémantique et mots-clés
   */
  private mergeSearchResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[]
  ): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();

    // Ajouter les résultats sémantiques
    semanticResults.forEach(result => {
      resultMap.set(result.id, result);
    });

    // Ajouter les résultats mots-clés (éviter les doublons)
    keywordResults.forEach(result => {
      if (!resultMap.has(result.id)) {
        resultMap.set(result.id, result);
      } else {
        // Améliorer le score si le résultat existe déjà
        const existing = resultMap.get(result.id)!;
        existing.similarity = Math.max(existing.similarity, result.similarity);
      }
    });

    return Array.from(resultMap.values())
      .sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Met à jour l'embedding d'un message
   */
  async updateMessageEmbedding(messageId: string, content: string): Promise<void> {
    try {
      const embedding = await this.embeddingService.generateEmbedding(content);
      const vectorString = Array.isArray(embedding.embedding)
        ? `[${embedding.embedding.join(',')}]`
        : (typeof embedding.embedding === 'string' ? embedding.embedding : `[${Object.values(embedding.embedding).join(',')}]`);
      
      await this.pool.query(
        'UPDATE messages SET embedding = $1::vector WHERE id = $2',
        [vectorString, messageId]
      );

      console.log(`✅ Embedding mis à jour pour le message ${messageId}`);
    } catch (error) {
      console.error('❌ Erreur mise à jour embedding message:', error);
      throw error;
    }
  }

  /**
   * Met à jour l'embedding d'une mémoire archiviste
   */
  async updateArchivistMemoryEmbedding(memoryId: string, content: string): Promise<void> {
    try {
      const embedding = await this.embeddingService.generateEmbedding(content);
      const vectorString = Array.isArray(embedding.embedding)
        ? `[${embedding.embedding.join(',')}]`
        : (typeof embedding.embedding === 'string' ? embedding.embedding : `[${Object.values(embedding.embedding).join(',')}]`);
      
      await this.pool.query(
        'UPDATE archivist_memories SET embedding = $1::vector WHERE id = $2',
        [vectorString, memoryId]
      );

      console.log(`✅ Embedding mis à jour pour la mémoire archiviste ${memoryId}`);
    } catch (error) {
      console.error('❌ Erreur mise à jour embedding mémoire archiviste:', error);
      throw error;
    }
  }

  /**
   * Génère les embeddings pour tous les messages sans embedding
   */
  async generateMissingEmbeddings(batchSize: number = 10): Promise<{processed: number, errors: number}> {
    let processed = 0;
    let errors = 0;

    try {
      // Messages sans embedding
      const messagesResult = await this.pool.query(`
        SELECT id, content 
        FROM messages 
        WHERE embedding IS NULL 
        LIMIT $1
      `, [batchSize]);

      for (const message of messagesResult.rows) {
        try {
          await this.updateMessageEmbedding(message.id, message.content);
          processed++;
        } catch (error) {
          console.error(`❌ Erreur embedding message ${message.id}:`, error);
          errors++;
        }
      }

      // Mémoires archiviste sans embedding
      const memoriesResult = await this.pool.query(`
        SELECT id, summary 
        FROM archivist_memories 
        WHERE embedding IS NULL 
        LIMIT $1
      `, [batchSize]);

      for (const memory of memoriesResult.rows) {
        try {
          await this.updateArchivistMemoryEmbedding(memory.id, memory.summary);
          processed++;
        } catch (error) {
          console.error(`❌ Erreur embedding mémoire ${memory.id}:`, error);
          errors++;
        }
      }

      console.log(`📊 Embeddings générés: ${processed} succès, ${errors} erreurs`);
      return { processed, errors };

    } catch (error) {
      console.error('❌ Erreur génération embeddings manquants:', error);
      throw error;
    }
  }

  /**
   * Teste la connexion et les fonctionnalités
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test de connexion
      await this.pool.query('SELECT 1');
      
      // Test de l'extension vector
      const vectorTest = await this.pool.query('SELECT extname FROM pg_extension WHERE extname = \'vector\'');
      if (vectorTest.rows.length === 0) {
        throw new Error('Extension vector non trouvée');
      }

      // Test des fonctions de recherche
      const functionTest = await this.pool.query(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_name IN ('semantic_search_messages', 'semantic_search_archivist_memories')
      `);

      console.log('✅ Service de recherche sémantique opérationnel');
      return true;

    } catch (error) {
      console.error('❌ Erreur test service recherche sémantique:', error);
      return false;
    }
  }
}
