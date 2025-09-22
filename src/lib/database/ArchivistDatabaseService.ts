/**
 * Service de base de données pour l'archiviste
 * Gère la persistance des mémoires de conversation et profils utilisateur
 */

import { Pool } from 'pg';
import { ConversationMemory, UserProfile } from '../agents/ArchivistAgent';

export interface ArchivistStats {
  totalUsers: number;
  totalMemories: number;
  averageMemoriesPerUser: number;
  recentActivity: {
    lastWeek: number;
    lastMonth: number;
  };
}

export class ArchivistDatabaseService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Sauvegarde une mémoire de conversation
   */
  async saveConversationMemory(memory: ConversationMemory): Promise<void> {
    const query = `
      INSERT INTO archivist_memories (
        session_id, user_id, timestamp, summary, key_topics, 
        emotional_tone, important_facts, user_mood, algareth_performance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (session_id, user_id, timestamp) 
      DO UPDATE SET 
        summary = EXCLUDED.summary,
        key_topics = EXCLUDED.key_topics,
        emotional_tone = EXCLUDED.emotional_tone,
        important_facts = EXCLUDED.important_facts,
        user_mood = EXCLUDED.user_mood,
        algareth_performance = EXCLUDED.algareth_performance,
        updated_at = NOW()
    `;

    const values = [
      memory.sessionId,
      memory.userId,
      memory.timestamp,
      memory.summary,
      JSON.stringify(memory.keyTopics),
      memory.emotionalTone,
      JSON.stringify(memory.importantFacts),
      memory.userMood,
      memory.algarethPerformance
    ];

    try {
      await this.pool.query(query, values);
      console.log(`💾 Mémoire archiviste sauvegardée: ${memory.userId} - ${memory.sessionId}`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde mémoire archiviste:', error);
      throw error;
    }
  }

  /**
   * Récupère les mémoires d'un utilisateur
   */
  async getUserMemories(userId: string, limit?: number): Promise<ConversationMemory[]> {
    const query = `
      SELECT 
        session_id, user_id, timestamp, summary, key_topics,
        emotional_tone, important_facts, user_mood, algareth_performance
      FROM archivist_memories 
      WHERE user_id = $1 
      ORDER BY timestamp DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      
      return result.rows.map(row => ({
        sessionId: row.session_id,
        userId: row.user_id,
        timestamp: row.timestamp,
        summary: row.summary,
        keyTopics: row.key_topics || [],
        emotionalTone: row.emotional_tone,
        importantFacts: row.important_facts || [],
        userMood: row.user_mood,
        algarethPerformance: row.algareth_performance
      }));
    } catch (error) {
      console.error('❌ Erreur récupération mémoires utilisateur:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde un profil utilisateur
   */
  async saveUserProfile(profile: UserProfile): Promise<void> {
    const query = `
      INSERT INTO archivist_profiles (
        user_id, user_name, total_sessions, communication_style,
        interests, relationship_level, trust_level, ongoing_topics, user_goals
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        user_name = EXCLUDED.user_name,
        total_sessions = EXCLUDED.total_sessions,
        communication_style = EXCLUDED.communication_style,
        interests = EXCLUDED.interests,
        relationship_level = EXCLUDED.relationship_level,
        trust_level = EXCLUDED.trust_level,
        ongoing_topics = EXCLUDED.ongoing_topics,
        user_goals = EXCLUDED.user_goals,
        updated_at = NOW()
    `;

    const values = [
      profile.userId,
      profile.userName,
      profile.totalSessions,
      profile.communicationStyle,
      JSON.stringify(profile.interests),
      profile.relationshipLevel,
      profile.trustLevel,
      JSON.stringify(profile.ongoingTopics),
      JSON.stringify(profile.userGoals)
    ];

    try {
      await this.pool.query(query, values);
      console.log(`💾 Profil archiviste sauvegardé: ${profile.userId}`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde profil archiviste:', error);
      throw error;
    }
  }

  /**
   * Récupère un profil utilisateur
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const query = `
      SELECT 
        user_id, user_name, total_sessions, communication_style,
        interests, relationship_level, trust_level, ongoing_topics, user_goals
      FROM archivist_profiles 
      WHERE user_id = $1
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        userId: row.user_id,
        userName: row.user_name,
        totalSessions: row.total_sessions,
        communicationStyle: row.communication_style,
        interests: row.interests || [],
        relationshipLevel: row.relationship_level,
        trustLevel: row.trust_level,
        ongoingTopics: row.ongoing_topics || [],
        userGoals: row.user_goals || []
      };
    } catch (error) {
      console.error('❌ Erreur récupération profil utilisateur:', error);
      throw error;
    }
  }

  /**
   * Recherche dans les mémoires d'un utilisateur
   */
  async searchUserMemories(userId: string, query: string): Promise<ConversationMemory[]> {
    const searchQuery = `
      SELECT 
        session_id, user_id, timestamp, summary, key_topics,
        emotional_tone, important_facts, user_mood, algareth_performance
      FROM archivist_memories 
      WHERE user_id = $1 
      AND (
        summary ILIKE $2 
        OR key_topics::text ILIKE $2 
        OR important_facts::text ILIKE $2
      )
      ORDER BY timestamp DESC
    `;

    try {
      const result = await this.pool.query(searchQuery, [userId, `%${query}%`]);
      
      return result.rows.map(row => ({
        sessionId: row.session_id,
        userId: row.user_id,
        timestamp: row.timestamp,
        summary: row.summary,
        keyTopics: row.key_topics || [],
        emotionalTone: row.emotional_tone,
        importantFacts: row.important_facts || [],
        userMood: row.user_mood,
        algarethPerformance: row.algareth_performance
      }));
    } catch (error) {
      console.error('❌ Erreur recherche mémoires:', error);
      throw error;
    }
  }

  /**
   * Obtient les statistiques de l'archiviste
   */
  async getArchivistStats(): Promise<ArchivistStats> {
    const query = `
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        COUNT(*) as total_memories,
        AVG(user_memory_count) as avg_memories_per_user,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_week,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_month
      FROM (
        SELECT 
          user_id,
          COUNT(*) as user_memory_count
        FROM archivist_memories 
        GROUP BY user_id
      ) user_counts
      CROSS JOIN archivist_memories
    `;

    try {
      const result = await this.pool.query(query);
      const row = result.rows[0];

      return {
        totalUsers: parseInt(row.total_users) || 0,
        totalMemories: parseInt(row.total_memories) || 0,
        averageMemoriesPerUser: parseFloat(row.avg_memories_per_user) || 0,
        recentActivity: {
          lastWeek: parseInt(row.last_week) || 0,
          lastMonth: parseInt(row.last_month) || 0
        }
      };
    } catch (error) {
      console.error('❌ Erreur récupération statistiques archiviste:', error);
      throw error;
    }
  }

  /**
   * Supprime les anciennes mémoires (garder seulement les 50 dernières par utilisateur)
   */
  async cleanupOldMemories(): Promise<void> {
    const query = `
      DELETE FROM archivist_memories 
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY timestamp DESC) as rn
          FROM archivist_memories
        ) ranked 
        WHERE rn > 50
      )
    `;

    try {
      const result = await this.pool.query(query);
      console.log(`🧹 Nettoyage archiviste: ${result.rowCount} mémoires supprimées`);
    } catch (error) {
      console.error('❌ Erreur nettoyage mémoires archiviste:', error);
      throw error;
    }
  }

  /**
   * Teste la connexion à la base de données
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      console.log('✅ Connexion archiviste DB OK');
      return true;
    } catch (error) {
      console.error('❌ Erreur connexion archiviste DB:', error);
      return false;
    }
  }
}