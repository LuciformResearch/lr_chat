import { NextRequest, NextResponse } from 'next/server';
import { mcpServer } from '@/mcp';
import { withAuth, AuthContext } from '@/lib/auth/middleware';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { user, message, role = 'user', sessionId = 'default' } = body;

    if (!user || !message) {
      return NextResponse.json(
        { error: 'Paramètres manquants: user et message requis' },
        { status: 400 }
      );
    }

    const result = await mcpServer.executeTool({
      tool: 'add_message_to_hierarchical_memory',
      arguments: { user, message, role, sessionId }
    });

    if (!result.result.success) {
      return NextResponse.json(
        { error: 'Erreur ajout mémoire hiérarchique', details: result.result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.result.data });
  } catch (error) {
    console.error('❌ Erreur ajout mémoire hiérarchique:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout en mémoire', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
});

