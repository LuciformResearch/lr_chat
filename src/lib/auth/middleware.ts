/**
 * Middleware d'authentification pour les API Routes Next.js
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractTokenFromHeader, JWTPayload } from './jwt';
import { authUserService } from './AuthUserService';

// Étendre NextRequest pour inclure l'utilisateur authentifié et l'identité sélectionnée
declare global {
  interface NextRequest {
    authUser?: {
      id: string;
      email: string;
      organizationId: string;
      role: string;
    };
    selectedIdentity?: {
      id: string;
      name: string;
      display_name: string;
      persona: string;
      persona_type: string;
      chat_persona_config: any;
    };
  }
}

/**
 * Middleware d'authentification pour protéger les API routes
 */
export function withAuth(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Extraire le token depuis l'en-tête Authorization
      const authHeader = request.headers.get('authorization');
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Token d\'authentification manquant',
            code: 'MISSING_TOKEN'
          }, 
          { status: 401 }
        );
      }

      // Vérifier le token JWT
      const payload = verifyJWT(token);
      if (!payload) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Token d\'authentification invalide',
            code: 'INVALID_TOKEN'
          }, 
          { status: 401 }
        );
      }

      // Récupérer l'ID de l'AuthUser (gérer les deux formats)
      const authUserId = payload.authUserId || payload.authuser_id;
      if (!authUserId) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Token invalide: ID utilisateur manquant',
            code: 'INVALID_TOKEN_PAYLOAD'
          }, 
          { status: 401 }
        );
      }

      // Vérifier que l'utilisateur existe toujours en base
      const authUser = await authUserService.getAuthUserById(authUserId);
      if (!authUser) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Utilisateur non trouvé',
            code: 'USER_NOT_FOUND'
          }, 
          { status: 401 }
        );
      }

      // Vérifier que l'utilisateur est actif
      if (!authUser.is_active) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Compte utilisateur désactivé',
            code: 'USER_DISABLED'
          }, 
          { status: 403 }
        );
      }

      // Ajouter l'utilisateur authentifié au contexte de la requête
      request.authUser = {
        id: authUser.id,
        email: authUser.email,
        organizationId: authUser.organization_id,
        role: authUser.role
      };

      // Récupérer l'identité sélectionnée si présente dans le token
      const identityId = payload.selectedIdentityId || payload.user_id;
      if (identityId) {
        try {
          const selectedIdentity = await authUserService.getUserIdentityById(identityId);
          if (selectedIdentity && selectedIdentity.authuser_id === authUser.id) {
            request.selectedIdentity = {
              id: selectedIdentity.id,
              name: selectedIdentity.name,
              display_name: selectedIdentity.display_name,
              persona: selectedIdentity.persona,
              persona_type: selectedIdentity.persona_type,
              chat_persona_config: selectedIdentity.chat_persona_config
            };
          }
        } catch (error) {
          console.warn('⚠️ Impossible de récupérer l\'identité sélectionnée:', error);
        }
      }

      // Appeler le handler original avec l'utilisateur authentifié et le contexte
      return await handler(request, context);

    } catch (error) {
      console.error('❌ Erreur middleware d\'authentification:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erreur interne d\'authentification',
          code: 'AUTH_ERROR'
        }, 
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware d'authentification optionnelle (pour les routes qui peuvent fonctionner avec ou sans auth)
 */
export function withOptionalAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Essayer d'extraire et vérifier le token
      const authHeader = request.headers.get('authorization');
      const token = extractTokenFromHeader(authHeader);

      if (token) {
        const payload = verifyJWT(token);
        if (payload) {
          const authUser = await authUserService.getAuthUserById(payload.authUserId);
          if (authUser && authUser.is_active) {
            request.authUser = {
              id: authUser.id,
              email: authUser.email,
              organizationId: authUser.organization_id,
              role: authUser.role
            };
          }
        }
      }

      // Appeler le handler original (avec ou sans utilisateur authentifié)
      return await handler(request);

    } catch (error) {
      console.error('❌ Erreur middleware d\'authentification optionnelle:', error);
      // En cas d'erreur, continuer sans authentification
      return await handler(request);
    }
  };
}

/**
 * Middleware pour vérifier les permissions d'organisation
 */
export function withOrganizationAccess(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest) => {
    const authUser = request.authUser!;
    
    // Vérifier que l'utilisateur a accès à l'organisation
    if (!authUser.organizationId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Aucune organisation associée',
          code: 'NO_ORGANIZATION'
        }, 
        { status: 403 }
      );
    }

    return await handler(request);
  });
}

/**
 * Middleware pour vérifier les permissions d'admin
 */
export function withAdminAccess(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest) => {
    const authUser = request.authUser!;
    
    if (authUser.role !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Accès administrateur requis',
          code: 'ADMIN_REQUIRED'
        }, 
        { status: 403 }
      );
    }

    return await handler(request);
  });
}

/**
 * Utilitaires pour les handlers authentifiés
 */
export class AuthContext {
  static getUser(request: NextRequest) {
    return request.authUser;
  }

  static getUserId(request: NextRequest): string {
    const user = request.authUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    return user.id;
  }

  static getUserEmail(request: NextRequest): string {
    const user = request.authUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    return user.email;
  }

  static getOrganizationId(request: NextRequest): string {
    const user = request.authUser;
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }
    return user.organizationId;
  }

  static isAdmin(request: NextRequest): boolean {
    const user = request.authUser;
    return user?.role === 'admin';
  }

  static getSelectedIdentity(request: NextRequest) {
    return request.selectedIdentity;
  }

  static getSelectedIdentityId(request: NextRequest): string {
    const identity = request.selectedIdentity;
    if (!identity) {
      throw new Error('Aucune identité sélectionnée');
    }
    return identity.id;
  }

  static hasSelectedIdentity(request: NextRequest): boolean {
    return !!request.selectedIdentity;
  }
}