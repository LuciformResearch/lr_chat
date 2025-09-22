/**
 * API Route pour la gestion des identités utilisateur d'un AuthUser
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { authUserService } from '@/lib/auth/AuthUserService';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const authUser = request.authUser!;
    
    // Récupérer les identités utilisateur pour cet AuthUser
    const users = await authUserService.getUsersByAuthUser(authUser.id);
    
    return NextResponse.json({
      success: true,
      users: users
    });
    
  } catch (error) {
    console.error('Erreur récupération identités utilisateur:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des identités',
        code: 'FETCH_USERS_ERROR'
      }, 
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const authUser = request.authUser!;
    const body = await request.json();
    
    const { name, persona, displayName } = body;
    
    if (!name || !persona) {
      return NextResponse.json(
        { success: false, message: 'name et persona sont requis' },
        { status: 400 }
      );
    }
    
    // Créer une nouvelle identité utilisateur
    const result = await authUserService.createUserIdentity({
      authuser_id: authUser.id,
      name: name,
      persona: persona,
      display_name: displayName || name,
      chat_persona_config: {
        base_persona: persona,
        communication_style: persona === 'algareth' ? 'mystique' : 'standard',
        personality_traits: persona === 'algareth' ? ['sage', 'bienveillant', 'mystique'] : ['utile', 'professionnel']
      },
      preferences: {},
      theme: 'auto',
      is_default_identity: false
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        user: result.user,
        message: 'Identité créée avec succès'
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Erreur création identité utilisateur:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la création de l\'identité',
        code: 'CREATE_USER_ERROR'
      }, 
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const authUser = request.authUser!;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId est requis' },
        { status: 400 }
      );
    }
    
    // Supprimer l'identité utilisateur
    const result = await authUserService.deleteUserIdentity(userId, authUser.id);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Identité supprimée avec succès'
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Erreur suppression identité utilisateur:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la suppression de l\'identité',
        code: 'DELETE_USER_ERROR'
      }, 
      { status: 500 }
    );
  }
});