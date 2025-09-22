import { NextRequest, NextResponse } from 'next/server';
import {
  getMessages,
  addMessage,
  getSessionById,
} from '@/lib/db/repo';
import { embeddingService } from '@/lib/embeddings/EmbeddingService';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { db } from '@/lib/db/index';
import { api_keys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { EncryptionService } from '@/lib/encryption/EncryptionService';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * GET /api/sessions/[sessionId]/messages
 * Retrieves all messages for a specific session.
 * Protected by authentication middleware.
 */
export const GET = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  const { sessionId } = await params;
  
  try {
    // Récupérer l'utilisateur authentifié
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Vérifier que la session existe et appartient à l'authuser
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    // Vérification simplifiée : accepter seulement si l'AuthUser est bon
    // Pour l'instant, on ignore les identités et on vérifie seulement l'AuthUser
    console.log('🔍 API Messages - Debug autorisation:', {
      sessionId,
      authUserIdFromSession: session.userId,
      authUserIdFromToken: authUser.id,
      isAuthorized: true // Pour l'instant, on accepte tout si AuthUser est bon
    });

    const messages = await getMessages(sessionId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error(`Failed to get messages for session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 });
  }
});

/**
 * POST /api/sessions/[sessionId]/messages
 * Adds a new message to a specific session.
 * Body: { role: 'user' | 'assistant', content: string, metadata?: any }
 * Protected by authentication middleware.
 */
export const POST = withAuth(async (request: NextRequest, { params }: RouteParams) => {
  const { sessionId } = await params;
  
  try {
    // Récupérer l'utilisateur authentifié
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Vérifier que la session existe et appartient à l'authuser
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    // Vérification simplifiée : accepter seulement si l'AuthUser est bon
    // Pour l'instant, on ignore les identités et on vérifie seulement l'AuthUser

    const body = await request.json();
    const { role, content, metadata } = body;

    if (!role || !content) {
      return NextResponse.json({ error: 'role and content are required' }, { status: 400 });
    }

    // Configurer les clés API pour le service d'embeddings
    try {
      const apiKeysResult = await db.select().from(api_keys)
        .where(eq(api_keys.userId, authUser.id));
      
      const apiKeys: Record<string, string> = {};
      apiKeysResult.forEach(key => {
        if (key.isActive) {
          try {
            // Déchiffrer la clé API avant de l'utiliser
            const decryptedKey = EncryptionService.decrypt(key.apiKey);
            apiKeys[key.provider] = decryptedKey;
            console.log(`🔓 [MESSAGES] Clé ${key.provider} déchiffrée avec succès`);
          } catch (error) {
            console.error(`❌ [MESSAGES] Erreur déchiffrement clé ${key.provider}:`, error);
            // Ignorer les clés corrompues
          }
        }
      });

      // Configurer les clés API dans le service d'embeddings
      embeddingService.configureApiKeys(apiKeys);
    } catch (error) {
      console.warn('⚠️ Erreur configuration clés API pour embeddings:', error);
    }

    // Générer l'embedding pour la recherche sémantique
    let embeddingVector = null;
    try {
      console.log(`🔮 Génération embedding pour message: "${content.substring(0, 50)}..."`);
      const embeddingResult = await embeddingService.generateEmbedding(content, 'gemini');
      embeddingVector = embeddingResult.embedding;
      console.log(`✅ Embedding généré: ${Array.isArray(embeddingVector) ? embeddingVector.length : 'N/A'} dimensions`);
    } catch (embeddingError) {
      console.warn('⚠️ Erreur génération embedding:', embeddingError);
      // Continuer sans embedding si erreur
    }

    const newMessage = await addMessage({
      sessionId,
      role,
      content,
      metadata,
      embedding: embeddingVector ? JSON.stringify(embeddingVector) : null,
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error(`Failed to add message to session ${sessionId}:`, error);
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 });
  }
});
