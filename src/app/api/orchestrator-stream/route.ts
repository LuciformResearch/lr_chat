/**
 * API Route pour l'orchestrateur divin avec streaming des phases
 * Utilise Server-Sent Events pour transmettre les phases en temps réel
 */

import { NextRequest } from 'next/server';
import { Pool } from 'pg';
import { ServerOrchestratorWithPhases } from '@/lib/agents/ServerOrchestratorWithPhases';
import { PhaseUpdate } from '@/lib/agents/ServerOrchestratorWithPhases';
import { withAuth, AuthContext } from '@/lib/auth/middleware';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    // Récupérer l'utilisateur authentifié
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json();
    const { userMessage, userId, userName, conversationHistory, currentSession, archivistVerbose } = body;

    if (!userMessage || !userId || !userName) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Vérification simplifiée : accepter seulement si l'AuthUser est bon
    // Pour l'instant, on ignore les identités et on vérifie seulement l'AuthUser
    console.log('🔍 API Orchestrator - AuthUser vérifié:', authUser.id);

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

    // Récupérer la clé API Gemini depuis la base de données
    let geminiApiKey: string | null = null;
    try {
      if (dbPool) {
        const result = await dbPool.query(
          'SELECT api_key FROM api_keys WHERE user_id = $1 AND provider = $2 AND is_active = true',
          [authUser.id, 'gemini']
        );
        if (result.rows.length > 0 && result.rows[0].api_key) {
          geminiApiKey = result.rows[0].api_key;
          console.log('🔑 Clé API Gemini chargée depuis la base de données');
        }
      }
    } catch (error) {
      console.warn('⚠️ Erreur chargement clé API depuis DB:', error);
    }
    
    // Fallback vers les variables d'environnement
    if (!geminiApiKey) {
      geminiApiKey = process.env.GEMINI_API_KEY || null;
      if (geminiApiKey) {
        console.log('🔑 Clé API Gemini chargée depuis les variables d\'environnement');
      }
    }
    
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Clé API Gemini non configurée (ni en DB ni en env)' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Configurer la clé API dans l'environnement
    process.env.GEMINI_API_KEY = geminiApiKey;
    console.log('🔑 Clé API Gemini configurée dans l\'environnement');

    // Déterminer le nom de la persona assistant à partir de l'identité sélectionnée
    const selectedIdentity = AuthContext.getSelectedIdentity(request);
    const basePersona = (selectedIdentity as any)?.chat_persona_config?.base_persona || (selectedIdentity as any)?.persona || 'algareth';
    const assistantName = basePersona.charAt(0).toUpperCase() + basePersona.slice(1);

    // Créer un ReadableStream pour Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        // Encoder pour UTF-8
        const encoder = new TextEncoder();

        // Fonction pour envoyer un message SSE
        const sendSSE = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Fonction pour envoyer une phase
        const sendPhase = (phaseUpdate: PhaseUpdate) => {
          sendSSE({
            type: 'phase',
            ...phaseUpdate
          });
        };

        // Fonction pour envoyer le résultat final
        const sendResult = (divineMurmurs: any[]) => {
          sendSSE({
            type: 'result',
            divineMurmurs,
            timestamp: new Date().toISOString()
          });
        };

        // Fonction pour envoyer une erreur
        const sendError = (error: any) => {
          sendSSE({
            type: 'error',
            error: error.message || 'Erreur inconnue',
            timestamp: new Date().toISOString()
          });
        };

        // Fonction principale d'orchestration
        const runOrchestration = async () => {
          try {
            // Créer l'orchestrateur avec le pool DB
            const orchestrator = new ServerOrchestratorWithPhases(geminiApiKey!, dbPool);
            
            // Définir le callback pour les phases
            orchestrator.setPhaseCallback(sendPhase);
            
            await orchestrator.initializeServants(geminiApiKey!);

            // Effectuer l'orchestration
            const context = {
              userMessage,
              userId,
              userName,
              conversationHistory: conversationHistory || [],
              currentSession: currentSession || 'default',
              assistantName,
              archivistVerbose: archivistVerbose || process.env.ARCHIVIST_VERBOSE || 'none'
            };

            const divineMurmurs = await orchestrator.orchestrate(context);

            // Envoyer le résultat final
            sendResult(divineMurmurs);

            // Fermer le pool DB
            if (dbPool) {
              await dbPool.end();
            }

            // Fermer le stream
            controller.close();

          } catch (error) {
            console.error('❌ Erreur orchestration:', error);
            sendError(error);
            
            // Fermer le pool DB en cas d'erreur
            if (dbPool) {
              try {
                await dbPool.end();
              } catch (dbError) {
                console.error('❌ Erreur fermeture pool DB:', dbError);
              }
            }
            
            controller.close();
          }
        };

        // Démarrer l'orchestration
        runOrchestration();
      }
    });

    // Retourner le stream avec les headers SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('❌ Erreur orchestration stream:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de l\'orchestration',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
