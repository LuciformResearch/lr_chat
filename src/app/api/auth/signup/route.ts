/**
 * API Route pour l'inscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { authUserService } from '@/lib/auth/AuthUserService';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validation des données
    if (!data.email || !data.password || !data.confirmPassword || !data.firstName || !data.lastName) {
      return NextResponse.json(
        { success: false, message: 'Tous les champs sont obligatoires' },
        { status: 400 }
      );
    }

    if (data.password !== data.confirmPassword) {
      return NextResponse.json(
        { success: false, message: 'Les mots de passe ne correspondent pas' },
        { status: 400 }
      );
    }

    if (data.password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    // Inscription
    const result = await authUserService.signUp(data);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Erreur inscription:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}