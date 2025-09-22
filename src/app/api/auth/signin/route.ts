/**
 * API Route pour la connexion
 */

import { NextRequest, NextResponse } from 'next/server';
import { authUserService } from '@/lib/auth/AuthUserService';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validation des données
    if (!data.email || !data.password) {
      return NextResponse.json(
        { success: false, message: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Connexion
    const result = await authUserService.signIn(data);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        authuser: result.authuser,
        users: result.users,
        token: result.token,
        needsUserSelection: result.users && result.users.length > 1
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erreur connexion:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}