/**
 * API Route pour la sélection d'utilisateur
 */

import { NextRequest, NextResponse } from 'next/server';
import { authUserService } from '@/lib/auth/AuthUserService';

export async function POST(request: NextRequest) {
  try {
    const { authUserId, userIdentityId } = await request.json();

    if (!authUserId || !userIdentityId) {
      return NextResponse.json(
        { success: false, message: 'authUserId et userIdentityId requis' },
        { status: 400 }
      );
    }

    // Sélection de l'utilisateur
    const result = await authUserService.selectUser(authUserId, userIdentityId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        token: result.token
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erreur sélection utilisateur:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
