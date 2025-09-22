/**
 * API Route pour l'orchestrateur divin
 * Gère la création du pool DB côté serveur et l'orchestration
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ServerOrchestrator } from '@/lib/agents/ServerOrchestrator';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { api_keys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { userMessage, userIdentityId, userName, conversationHistory, currentSession, debugMode, disableArchivist, archivistVerbose } = body;

    if (!userMessage || !userIdentityId || !userName) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur authentifié depuis le middleware
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }

    console.log(`🦋 Orchestrateur côté serveur pour: ${userName} (AuthUser: ${authUser.id})`);

    // Créer le pool de base de données côté serveur (Neon via DATABASE_URL)
    let dbPool: Pool | null = null;
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL manquant');
      }
      dbPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      console.log('🗄️ Pool de base de données (Neon) créé via DATABASE_URL');
    } catch (dbError) {
      console.warn('⚠️ Erreur création pool DB (DATABASE_URL):', dbError);
      console.warn('⚠️ Archiviste fonctionnera en mode fallback');
    }

    // Charger les clés API depuis PostgreSQL côté serveur (utilisateur authentifié)
    if (!dbPool) {
      return NextResponse.json(
        { error: 'Base de données non disponible' },
        { status: 500 }
      );
    }
    
    // Utiliser Drizzle ORM comme Algareth pour la cohérence
    const apiKeysResult = await db.select().from(api_keys)
      .where(eq(api_keys.userId, authUser.id));
    
    const apiKeys: Record<string, string> = {};
    apiKeysResult.forEach(key => {
      if (key.isActive) {
        try {
          // Déchiffrer la clé API avant de l'utiliser
          const decryptedKey = EncryptionService.decrypt(key.apiKey);
          apiKeys[key.provider] = decryptedKey;
          console.log(`🔓 [ORCHESTRATOR] Clé ${key.provider} déchiffrée avec succès`);
        } catch (error) {
          console.error(`❌ [ORCHESTRATOR] Erreur déchiffrement clé ${key.provider}:`, error);
          // Ignorer les clés corrompues
        }
      }
    });

    console.log('🔑 Clés API chargées côté serveur:', Object.keys(apiKeys));

    // Vérifier la configuration du provider (utiliser Gemini par défaut)
    const providerName = 'gemini';
    const geminiApiKey = apiKeys[providerName];
    
    if (!geminiApiKey) {
      console.warn('⚠️ Aucune clé API Gemini trouvée pour l\'utilisateur authentifié');
      return NextResponse.json(
        { 
          error: 'Clé API Gemini non configurée pour cet utilisateur',
          suggestion: 'Veuillez configurer votre clé API Gemini dans les paramètres'
        },
        { status: 400 }
      );
    }

    // Configurer la clé API dans l'environnement AVANT d'initialiser l'orchestrateur
    process.env.GEMINI_API_KEY = geminiApiKey;
    console.log('🔑 Clé API Gemini configurée dans l\'environnement');
    
    // Activer le mode debug si demandé
    if (debugMode) {
      process.env.ORCHESTRATOR_DEBUG_MODE = 'true';
      console.log('🔧 Mode debug activé pour cette requête');
    }

    // Déterminer le nom de la persona assistant à partir de l'identité sélectionnée
    const selectedIdentity = AuthContext.getSelectedIdentity(request);
    const basePersona = selectedIdentity?.chat_persona_config?.base_persona || selectedIdentity?.persona || 'algareth';
    const assistantName = basePersona.charAt(0).toUpperCase() + basePersona.slice(1);

    // Créer l'orchestrateur avec le pool DB et le mode debug
    const orchestrator = new ServerOrchestrator(geminiApiKey, dbPool, debugMode);
    await orchestrator.initializeServants(geminiApiKey);

    // Effectuer l'orchestration
    const context = {
      userMessage,
      userIdentityId,
      userName,
      conversationHistory: conversationHistory || [],
      currentSession: currentSession || 'default',
      assistantName,
      authUserId: authUser.id,
      disableArchivist: !!disableArchivist,
      archivistVerbose: archivistVerbose || process.env.ARCHIVIST_VERBOSE || 'none'
    };

    const divineMurmurs = await orchestrator.orchestrate(context);

    // Fermer le pool DB
    if (dbPool) {
      await dbPool.end();
    }

    return NextResponse.json({
      success: true,
      divineMurmurs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur orchestration:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'orchestration',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
});
