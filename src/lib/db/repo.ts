import { db } from './index';
import { sessions, messages } from './schema';
import { eq, desc } from 'drizzle-orm';

// --- SESSIONS ---

/**
 * Creates a new session for a user identity.
 * @param userIdentityId The ID of the user identity.
 * @param title The initial title of the session.
 * @param authUserId The ID of the authenticated user (optional, defaults to 'migrated' for backward compatibility).
 * @returns The newly created session object.
 */
export async function createSession(userIdentityId: string, title: string, authUserId: string = 'migrated') {
  const [newSession] = await db
    .insert(sessions)
    .values({ userIdentityId: userIdentityId, userId: authUserId })
    .returning();
  return newSession;
}

/**
 * Retrieves all sessions for a given user identity.
 * @param userIdentityId The ID of the user identity.
 * @returns A promise that resolves to an array of sessions.
 */
export async function getSessions(userIdentityId: string) {
  return db.select().from(sessions).where(eq(sessions.userIdentityId, userIdentityId)).orderBy(desc(sessions.updatedAt));
}

/**
 * Retrieves a session by its ID.
 * @param sessionId The ID of the session.
 * @returns A promise that resolves to the session object or null if not found.
 */
export async function getSessionById(sessionId: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  return session || null;
}

/**
 * Renames a session.
 * @param sessionId The ID of the session to rename.
 * @param newTitle The new title for the session.
 * @returns The updated session object.
 */
export async function renameSession(sessionId: string, newTitle: string) {
  const [updatedSession] = await db
    .update(sessions)
    .set({ title: newTitle, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();
  return updatedSession;
}

/**
 * Deletes a session and all its related data (messages, traces, embeddings, archivist memories).
 * This function performs a complete cleanup to avoid data pollution in tests.
 * @param sessionId The ID of the session to delete.
 */
export async function deleteSession(sessionId: string) {
  console.log(`🧹 Nettoyage complet de la session ${sessionId}...`);
  
  try {
    // 1. Récupérer les informations de la session avant suppression
    const sessionInfo = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (sessionInfo.length === 0) {
      console.log(`⚠️ Session ${sessionId} non trouvée, rien à supprimer`);
      return;
    }
    
    const userIdentityId = sessionInfo[0].userIdentityId;
    console.log(`📋 Session trouvée pour userIdentityId: ${userIdentityId}`);
    
    // 2. Supprimer les mémoires archiviste liées à cette session
    // Note: archivist_memories n'est pas dans le schéma Drizzle, on utilise une requête SQL brute
    const pool = new (await import('pg')).Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    
    try {
      // Supprimer les mémoires archiviste
      const archivistResult = await pool.query(
        'DELETE FROM archivist_memories WHERE session_id = $1',
        [sessionId]
      );
      console.log(`🗑️ ${archivistResult.rowCount} mémoire(s) archiviste supprimée(s)`);
      
      // Note: Table archivist_profiles n'existe pas encore, skip pour l'instant
      console.log(`📊 Profil archiviste: table archivist_profiles non disponible`);
      
    } catch (poolError) {
      console.warn('⚠️ Erreur nettoyage archiviste (tables peuvent ne pas exister):', poolError);
    } finally {
      await pool.end();
    }
    
    // 3. Supprimer la session (cascade supprimera messages, traces, images générées)
    const deleteResult = await db.delete(sessions).where(eq(sessions.id, sessionId));
    console.log(`✅ Session ${sessionId} supprimée avec succès`);
    
    // 4. Les embeddings sont automatiquement supprimés avec les messages via CASCADE
    console.log(`🧹 Nettoyage complet terminé pour la session ${sessionId}`);
    
  } catch (error) {
    console.error(`❌ Erreur lors du nettoyage de la session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Deletes all sessions for a specific user (useful for test cleanup).
 * Performs complete cleanup including archivist memories and embeddings.
 * @param userId The ID of the user whose sessions should be deleted.
 */
export async function deleteAllUserSessions(userId: string) {
  console.log(`🧹 Nettoyage complet de toutes les sessions pour l'utilisateur ${userId}...`);
  
  try {
    // 1. Récupérer toutes les sessions de l'utilisateur (chercher dans les deux champs)
    const userSessionsByIdentity = await db.select().from(sessions).where(eq(sessions.userIdentityId, userId));
    const userSessionsByUserId = await db.select().from(sessions).where(eq(sessions.userId, userId));
    
    // Combiner les résultats en évitant les doublons
    const allUserSessions = [...userSessionsByIdentity];
    userSessionsByUserId.forEach(session => {
      if (!allUserSessions.find(s => s.id === session.id)) {
        allUserSessions.push(session);
      }
    });
    
    console.log(`📋 ${allUserSessions.length} session(s) trouvée(s) pour l'utilisateur ${userId}`);
    
    if (allUserSessions.length === 0) {
      console.log(`⚠️ Aucune session trouvée pour l'utilisateur ${userId}`);
      return;
    }
    
    // 2. Supprimer les mémoires archiviste pour toutes les sessions
    const pool = new (await import('pg')).Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    
    try {
      // Supprimer toutes les mémoires archiviste de l'utilisateur
      const archivistResult = await pool.query(
        'DELETE FROM archivist_memories WHERE user_id = $1',
        [userId]
      );
      console.log(`🗑️ ${archivistResult.rowCount} mémoire(s) archiviste supprimée(s)`);
      
      // Supprimer le profil archiviste de l'utilisateur
      const profileResult = await pool.query(
        'DELETE FROM archivist_profiles WHERE user_id = $1',
        [userId]
      );
      console.log(`🗑️ ${profileResult.rowCount} profil(s) archiviste supprimé(s)`);
      
    } catch (poolError) {
      console.warn('⚠️ Erreur nettoyage archiviste (tables peuvent ne pas exister):', poolError);
    } finally {
      await pool.end();
    }
    
    // 3. Supprimer toutes les sessions (cascade supprimera messages, traces, images générées)
    // Supprimer d'abord les sessions avec userIdentityId
    const deleteByIdentityResult = await db.delete(sessions).where(eq(sessions.userIdentityId, userId));
    // Puis supprimer les sessions avec userId
    const deleteByUserIdResult = await db.delete(sessions).where(eq(sessions.userId, userId));
    console.log(`✅ ${allUserSessions.length} session(s) supprimée(s) avec succès`);
    
    // 4. Les embeddings sont automatiquement supprimés avec les messages via CASCADE
    console.log(`🧹 Nettoyage complet terminé pour l'utilisateur ${userId}`);
    
  } catch (error) {
    console.error(`❌ Erreur lors du nettoyage des sessions de l'utilisateur ${userId}:`, error);
    throw error;
  }
}

// --- MESSAGES ---

export type NewMessage = {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
  embedding?: string | null;
};

/**
 * Adds a new message to a specific session.
 * @param message The message object to add.
 * @returns The newly created message object.
 */
export async function addMessage(message: NewMessage) {
  const [newMessage] = await db.insert(messages).values(message).returning();
  // Also update the session's updatedAt timestamp
  await db.update(sessions).set({ updatedAt: new Date() }).where(eq(sessions.id, message.sessionId));
  return newMessage;
}

/**
 * Retrieves all messages for a given session, in chronological order.
 * @param sessionId The ID of the session.
 * @returns A promise that resolves to an array of messages.
 */
export async function getMessages(sessionId: string) {
  return db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(messages.createdAt);
}
