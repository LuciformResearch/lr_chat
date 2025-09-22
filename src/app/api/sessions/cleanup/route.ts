import { NextRequest, NextResponse } from 'next/server';
import { deleteAllUserSessions } from '@/lib/db/repo';
import { withAuth, AuthContext } from '@/lib/auth/middleware';

/**
 * DELETE /api/sessions/cleanup
 * Deletes all sessions for the authenticated user (useful for test cleanup).
 * Protected by authentication middleware.
 */
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    // Récupérer l'utilisateur authentifié depuis le middleware
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Utiliser l'identité sélectionnée si disponible, sinon l'AuthUser
    const selectedIdentity = AuthContext.getSelectedIdentity(request);
    const userId = selectedIdentity ? selectedIdentity.id : authUser.id;
    
    console.log('🧹 API Cleanup - Debug:', {
      authUserId: authUser.id,
      selectedIdentity: selectedIdentity,
      userIdUsed: userId
    });
    
    // Effectuer le nettoyage complet
    await deleteAllUserSessions(userId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Toutes les sessions de l'utilisateur ${userId} ont été supprimées avec nettoyage complet`,
      userId: userId
    });
    
  } catch (error) {
    console.error('Failed to cleanup user sessions:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup sessions',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    }, { status: 500 });
  }
});