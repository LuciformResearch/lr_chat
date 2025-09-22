/**
 * Script de migration sécurisé pour les tables AuthUser
 * Préserve toutes les données existantes (sessions, messages, etc.)
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

export class AuthUserMigration {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  /**
   * Vérifie l'état actuel de la base de données
   */
  async checkCurrentState(): Promise<{
    hasSessions: boolean;
    hasMessages: boolean;
    hasAuthUsers: boolean;
    sessionCount: number;
    messageCount: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Vérifier les tables existantes
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('sessions', 'messages', 'authusers', 'users', 'families')
      `);

      const existingTables = tablesResult.rows.map(row => row.table_name);
      
      // Compter les données existantes
      let sessionCount = 0;
      let messageCount = 0;

      if (existingTables.includes('sessions')) {
        const sessionsResult = await client.query('SELECT COUNT(*) FROM sessions');
        sessionCount = parseInt(sessionsResult.rows[0].count);
      }

      if (existingTables.includes('messages')) {
        const messagesResult = await client.query('SELECT COUNT(*) FROM messages');
        messageCount = parseInt(messagesResult.rows[0].count);
      }

      return {
        hasSessions: existingTables.includes('sessions'),
        hasMessages: existingTables.includes('messages'),
        hasAuthUsers: existingTables.includes('authusers'),
        sessionCount,
        messageCount
      };

    } finally {
      client.release();
    }
  }

  /**
   * Exécute la migration AuthUser
   */
  async migrate(): Promise<{ success: boolean; message: string; details?: any }> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Vérifier l'état actuel
      const state = await this.checkCurrentState();
      console.log('📊 État actuel de la base:', state);

      if (state.sessionCount > 0 || state.messageCount > 0) {
        console.log(`✅ Données existantes détectées: ${state.sessionCount} sessions, ${state.messageCount} messages`);
        console.log('🔒 Migration sécurisée: les données existantes seront préservées');
      }

      // Lire et exécuter le script de migration
      const migrationPath = path.join(process.cwd(), 'migrations', '001_create_authuser_tables.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      // Exécuter la migration
      await client.query(migrationSQL);

      // Vérifier que les nouvelles tables ont été créées
      const newTablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('authusers', 'users', 'families')
      `);

      const newTables = newTablesResult.rows.map(row => row.table_name);
      
      if (newTables.length === 3) {
        await client.query('COMMIT');
        return {
          success: true,
          message: 'Migration AuthUser réussie ! Tables créées sans affecter les données existantes.',
          details: {
            newTables,
            preservedData: {
              sessions: state.sessionCount,
              messages: state.messageCount
            }
          }
        };
      } else {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: `Migration échouée: seules ${newTables.length}/3 tables créées`
        };
      }

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Erreur lors de la migration:', error);
      return {
        success: false,
        message: `Erreur de migration: ${error.message}`
      };
    } finally {
      client.release();
    }
  }

  /**
   * Teste la connexion à la base de données
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query('SELECT NOW()');
        return {
          success: true,
          message: `Connexion réussie - ${result.rows[0].now}`
        };
      } finally {
        client.release();
      }

    } catch (error) {
      return {
        success: false,
        message: `Erreur de connexion: ${error.message}`
      };
    }
  }

  /**
   * Ferme la connexion
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Script de migration en ligne de commande
 */
async function runMigration() {
  console.log('🚀 Démarrage de la migration AuthUser...');
  
  const migration = new AuthUserMigration();
  
  try {
    // Test de connexion
    console.log('🔗 Test de connexion à la base de données...');
    const connectionTest = await migration.testConnection();
    if (!connectionTest.success) {
      console.error('❌', connectionTest.message);
      process.exit(1);
    }
    console.log('✅', connectionTest.message);

    // Vérification de l'état
    console.log('📊 Vérification de l\'état actuel...');
    const state = await migration.checkCurrentState();
    console.log('📋 État actuel:', state);

    if (state.hasAuthUsers) {
      console.log('ℹ️  Les tables AuthUser existent déjà.');
      // Vérifier si elles sont vides
      const client = await migration.pool.connect();
      try {
        const authUsersCount = await client.query('SELECT COUNT(*) FROM authusers');
        const usersCount = await client.query('SELECT COUNT(*) FROM users');
        const orgsCount = await client.query('SELECT COUNT(*) FROM organizations');
        
        if (parseInt(authUsersCount.rows[0].count) === 0 && 
            parseInt(usersCount.rows[0].count) === 0 && 
            parseInt(orgsCount.rows[0].count) === 0) {
          console.log('📝 Tables vides détectées. Exécution de la migration des données...');
        } else {
          console.log('✅ Données déjà présentes. Migration non nécessaire.');
          return;
        }
      } finally {
        client.release();
      }
    }

    // Exécution de la migration
    console.log('🔄 Exécution de la migration...');
    const result = await migration.migrate();
    
    if (result.success) {
      console.log('✅', result.message);
      if (result.details) {
        console.log('📋 Détails:', result.details);
      }
    } else {
      console.error('❌', result.message);
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  } finally {
    await migration.close();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  runMigration();
}

// Export déjà fait en haut du fichier