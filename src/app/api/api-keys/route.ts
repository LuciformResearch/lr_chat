import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { api_keys } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { EncryptionService } from '@/lib/encryption/EncryptionService';

/**
 * GET /api/api-keys
 * Récupère les clés API pour l'utilisateur authentifié
 * Query Params: ?provider=<provider>
 * Protected by authentication middleware.
 */
export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');

  try {
    // Récupérer l'utilisateur authentifié depuis le middleware
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // DEBUG: Log de l'utilisateur récupéré
    console.log(`🔍 [API-KEYS] Utilisateur récupéré:`, {
      id: authUser.id,
      email: authUser.email,
      organizationId: authUser.organizationId
    });

    // Les clés API sont toujours liées à l'AuthUser, pas à l'identité utilisateur
    const userId = authUser.id;

    // Construire la requête avec tous les filtres en une fois
    const conditions = [eq(api_keys.userId, userId)];
    if (provider) {
      conditions.push(eq(api_keys.provider, provider));
    }
    
    const query = db.select().from(api_keys).where(and(...conditions));
    
    // DEBUG: Log de la requête SQL générée
    console.log(`🔍 [API-KEYS] Requête SQL pour userId=${userId}, provider=${provider}`);
    
    const keys = await query;
    
    // DEBUG: Log des clés trouvées
    console.log(`🔍 [API-KEYS] Clés trouvées pour userId=${userId}:`, keys.map(k => ({
      provider: k.provider,
      isActive: k.isActive,
      preview: k.apiKey.substring(0, 10) + '...' + k.apiKey.slice(-4)
    })));
    
    // Retourner les clés sous forme d'objet simple (déchiffrées)
    const result: Record<string, string> = {};
    keys.forEach(key => {
      if (key.isActive) {
        try {
          // Déchiffrer la clé API avant de la retourner
          const decryptedKey = EncryptionService.decrypt(key.apiKey);
          result[key.provider] = decryptedKey;
          console.log(`🔓 [API-KEYS] Clé déchiffrée pour ${key.provider}`);
        } catch (error) {
          console.error(`❌ [API-KEYS] Erreur déchiffrement pour ${key.provider}:`, error);
          // Si le déchiffrement échoue, on peut soit ignorer cette clé soit retourner une erreur
          // Pour l'instant, on ignore la clé corrompue
        }
      }
    });
    
    console.log(`🔍 [API-KEYS] Résultat final:`, Object.keys(result));
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get API keys:', error);
    return NextResponse.json({ error: 'Failed to retrieve API keys' }, { status: 500 });
  }
});

/**
 * POST /api/api-keys
 * Sauvegarde une clé API pour l'utilisateur authentifié
 * Body: { provider: string, apiKey: string }
 * Protected by authentication middleware.
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'provider and apiKey are required' }, { status: 400 });
    }

    // Récupérer l'utilisateur authentifié depuis le middleware
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Les clés API sont toujours liées à l'AuthUser, pas à l'identité utilisateur
    const userId = authUser.id;

    // Supprimer toutes les anciennes clés (actives et désactivées) pour cet utilisateur et provider
    console.log(`🔧 Suppression anciennes clés API pour userId=${userId}, provider=${provider}`);
    const deleteResult = await db.delete(api_keys)
      .where(eq(api_keys.userId, userId))
      .where(eq(api_keys.provider, provider));
    console.log(`🔧 Résultat suppression:`, deleteResult);

    // Chiffrer la clé API avant de la sauvegarder
    console.log(`🔐 [API-KEYS] Chiffrement de la clé pour ${provider}`);
    const encryptedApiKey = EncryptionService.encrypt(apiKey);
    console.log(`🔐 [API-KEYS] Clé chiffrée avec succès pour ${provider}`);

    // Insérer la nouvelle clé (chiffrée)
    const [newKey] = await db.insert(api_keys)
      .values({ 
        userId: userId, 
        provider: provider, 
        apiKey: encryptedApiKey, 
        isActive: true 
      })
      .returning();

    return NextResponse.json(newKey, { status: 201 });
  } catch (error) {
    console.error('Failed to save API key:', error);
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
  }
});