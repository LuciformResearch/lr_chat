/**
 * Utilitaires JWT pour l'authentification
 */

import jwt from 'jsonwebtoken';
import { AuthUser } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here_change_this_in_production';
const JWT_EXPIRES_IN = '7d'; // Token valide 7 jours

export interface JWTPayload {
  authUserId?: string;  // Format attendu par le middleware
  authuser_id?: string; // Format généré par l'API de connexion
  user_id?: string;     // ID du User sélectionné
  email: string;
  organizationId?: string;
  organization_id?: string;
  role: string;
  persona?: string;
  iat?: number;
  exp?: number;
}

/**
 * Génère un token JWT pour un utilisateur authentifié
 */
export function generateJWT(authUser: AuthUser): string {
  const payload: JWTPayload = {
    authUserId: authUser.id,
    email: authUser.email,
    organizationId: authUser.organization_id,
    role: authUser.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'lr-tchatagent-web',
    audience: 'lr-tchatagent-users'
  });
}

/**
 * Vérifie et décode un token JWT
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    // Essayer d'abord avec les options strictes (nouveaux tokens)
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'lr-tchatagent-web',
      audience: 'lr-tchatagent-users'
    }) as JWTPayload;

    return decoded;
  } catch (strictError) {
    try {
      // Si ça échoue, essayer sans les options strictes (anciens tokens)
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      console.log('⚠️ Token vérifié sans options strictes (ancien format)');
      return decoded;
    } catch (permissiveError) {
      console.error('❌ Erreur vérification JWT:', permissiveError);
      return null;
    }
  }
}

/**
 * Extrait le token JWT depuis l'en-tête Authorization
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Vérifie si un token JWT est valide (sans le décoder)
 */
export function isTokenValid(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

/**
 * Décode un token JWT sans vérifier la signature (pour debug)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}