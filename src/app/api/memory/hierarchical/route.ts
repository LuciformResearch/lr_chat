/**
 * API Route pour la mémoire hiérarchique
 * Gère la construction du contexte mémoire côté serveur
 */

import { NextRequest, NextResponse } from 'next/server';
import { mcpServer } from '@/mcp';
import { withAuth, AuthContext } from '@/lib/auth/middleware';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    // Récupérer l'utilisateur authentifié
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { user, query, maxChars = 2000, sessionId = 'default' } = body;

    if (!user || !query) {
      return NextResponse.json(
        { error: 'Paramètres manquants: user et query requis' },
        { status: 400 }
      );
    }

    // Vérification simplifiée : accepter seulement si l'AuthUser est bon
    // Pour l'instant, on ignore les identités et on vérifie seulement l'AuthUser
    console.log('🔍 API Memory - AuthUser vérifié:', authUser.id);

    // Utiliser le MCP server côté serveur
    const contextResult = await mcpServer.executeTool({
      tool: 'build_hierarchical_memory_context',
      arguments: {
        user,
        query,
        maxChars,
        sessionId
      }
    });

    if (contextResult.result.success) {
      return NextResponse.json({
        success: true,
        context: contextResult.result.data.context,
        contextLength: contextResult.result.data.context?.length || 0,
        stats: contextResult.result.data.stats,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { 
          error: 'Erreur construction contexte mémoire',
          details: contextResult.result.error
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Erreur mémoire hiérarchique:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la construction du contexte mémoire',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
});