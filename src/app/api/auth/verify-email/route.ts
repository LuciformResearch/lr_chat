/**
 * API Route pour la vérification d'email
 */

import { NextRequest, NextResponse } from 'next/server';
import { authUserService } from '@/lib/auth/AuthUserService';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token de vérification requis' },
        { status: 400 }
      );
    }

    // Vérifier le token et activer le compte
    const result = await authUserService.verifyEmail(token);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email vérifié avec succès'
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erreur vérification email:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}