import { NextRequest, NextResponse } from 'next/server';
import {
  getSessions,
  createSession,
} from '@/lib/db/repo';
import { withAuth, AuthContext } from '@/lib/auth/middleware';

/**
 * GET /api/sessions
 * Retrieves all sessions for the authenticated user.
 * Protected by authentication middleware.
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    // Récupérer l'utilisateur authentifié depuis le middleware
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Utiliser l'identité sélectionnée si disponible, sinon l'AuthUser
    const selectedIdentity = AuthContext.getSelectedIdentity(request);
    const userIdentityId = selectedIdentity ? selectedIdentity.id : authUser.id;
    
    console.log('🔍 API Sessions - Debug:', {
      authUserId: authUser.id,
      selectedIdentity: selectedIdentity,
      userIdentityIdUsed: userIdentityId
    });
    
    const sessions = await getSessions(userIdentityId);
    // Ajouter des alias explicites pour éviter la confusion (compat: conserver clés existantes)
    const clarified = sessions.map((s: any) => ({
      ...s,
      authUserId: s.userId,
      userIdentityId: s.userIdentityId,
    }));
    return NextResponse.json(clarified);
  } catch (error) {
    console.error('Failed to get sessions:', error);
    return NextResponse.json({ error: 'Failed to retrieve sessions' }, { status: 500 });
  }
});

/**
 * POST /api/sessions
 * Creates a new session for the authenticated user.
 * Body: { title: string }
 * Protected by authentication middleware.
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    // Récupérer l'utilisateur authentifié depuis le middleware
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Utiliser l'identité sélectionnée si disponible, sinon l'AuthUser
    const selectedIdentity = AuthContext.getSelectedIdentity(request);
    const userIdentityId = selectedIdentity ? selectedIdentity.id : authUser.id;

    console.log('🔍 API Sessions POST - Debug création:', {
      authUserId: authUser.id,
      selectedIdentity: selectedIdentity,
      userIdentityIdUsed: userIdentityId,
      title
    });

    // Créer la session avec l'ID de l'identité sélectionnée et l'authUserId
    const newSession = await createSession(userIdentityId, title, authUser.id);
    
    console.log('✅ API Sessions POST - Session créée:', {
      sessionId: newSession.id,
      sessionUserId: newSession.userId,
      authUserId: authUser.id
    });
    
    return NextResponse.json({
      ...newSession,
      authUserId: newSession.userId,
      userIdentityId: newSession.userIdentityId,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
});
