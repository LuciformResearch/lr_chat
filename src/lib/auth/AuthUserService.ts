/**
 * Service AuthUser - Gestion de l'authentification avec PostgreSQL
 * Séparation AuthUser (authentification) et User (données applicatives)
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { oauthEmailService } from '@/lib/email/oauth-email-service';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  organization_id: string;
  role: 'admin' | 'member';
  is_active: boolean;
  email_verified: boolean;
  email_verification_token?: string;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  authuser_id: string;
  name: string;
  persona: 'algareth' | 'assistant' | 'custom';
  persona_type: 'identity' | 'chat_style' | 'generated';
  display_name: string;
  avatar_url?: string;
  chat_persona_config: any;
  is_default_identity: boolean;
  preferences: Record<string, any>;
  theme: 'light' | 'dark' | 'auto';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: string;
  name: string;
  admin_authuser_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthResult {
  success: boolean;
  message: string;
  authuser?: AuthUser;
  users?: User[];
  token?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface UserSelectionData {
  authuser_id: string;
  user_id: string;
}

export class AuthUserService {
  private static instance: AuthUserService;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  public static getInstance(): AuthUserService {
    if (!AuthUserService.instance) {
      AuthUserService.instance = new AuthUserService();
    }
    return AuthUserService.instance;
  }

  /**
   * Inscription d'un nouvel AuthUser
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      // Validation des données
      if (data.password !== data.confirmPassword) {
        return { success: false, message: 'Les mots de passe ne correspondent pas' };
      }

      if (data.password.length < 6) {
        return { success: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };
      }

      // Vérifier si l'email existe déjà
      const existingAuthUser = await this.getAuthUserByEmail(data.email);
      if (existingAuthUser) {
        return { success: false, message: 'Cet email est déjà utilisé' };
      }

      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Créer l'organisation si nécessaire
        let organizationId: string | null = null;
        if (data.organizationName) {
          const organizationResult = await client.query(
            'INSERT INTO organizations (name) VALUES ($1) RETURNING id',
            [data.organizationName]
          );
          organizationId = organizationResult.rows[0].id;
        } else {
          // Essayer de trouver l'organisation par défaut, sinon laisser null
          const organizationResult = await client.query(
            'SELECT id FROM organizations WHERE name = $1',
            ['Luciform Research']
          );
          organizationId = organizationResult.rows[0]?.id || null;
        }

        // Hasher le mot de passe
        const passwordHash = await bcrypt.hash(data.password, 10);

        // Générer un token de vérification
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Créer l'AuthUser
        const authUserResult = await client.query(
          `INSERT INTO authusers (email, password_hash, first_name, last_name, organization_id, role, email_verification_token) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           RETURNING id, email, first_name, last_name, organization_id, role, is_active, email_verified, created_at, updated_at`,
          [data.email, passwordHash, data.firstName, data.lastName, organizationId, 'member', verificationToken]
        );

        const authUser = authUserResult.rows[0] as AuthUser;

        await client.query('COMMIT');

        // Envoyer l'email de vérification
        try {
          await oauthEmailService.sendVerificationEmail(data.email, data.firstName, verificationToken);
        } catch (emailError) {
          console.error('Erreur envoi email:', emailError);
          // Ne pas faire échouer l'inscription si l'email échoue
        }

        return {
          success: true,
          message: 'Inscription réussie ! Vérifiez votre email pour confirmer votre compte.',
          authuser: authUser,
          users: []
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      return { success: false, message: 'Erreur lors de l\'inscription' };
    }
  }

  /**
   * Connexion d'un AuthUser
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const client = await this.pool.connect();
      
      try {
        // Récupérer l'AuthUser avec le mot de passe hashé
        const authUserResult = await client.query(
          `SELECT id, email, password_hash, organization_id, role, is_active, email_verified, 
                  last_login, created_at, updated_at 
           FROM authusers 
           WHERE email = $1 AND is_active = true`,
          [data.email]
        );

        if (authUserResult.rows.length === 0) {
          return { success: false, message: 'Email ou mot de passe incorrect' };
        }

        const authUser = authUserResult.rows[0];
        
        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(data.password, authUser.password_hash);
        if (!isValidPassword) {
          return { success: false, message: 'Email ou mot de passe incorrect' };
        }

        // Mettre à jour la dernière connexion
        await client.query(
          'UPDATE authusers SET last_login = NOW() WHERE id = $1',
          [authUser.id]
        );

        // Récupérer les identités utilisateur associées
        const usersResult = await client.query(
          `SELECT id, authuser_id, name, persona, persona_type, display_name, 
                  avatar_url, chat_persona_config, is_default_identity, 
                  preferences, theme, is_active, created_at, updated_at 
           FROM user_identities 
           WHERE authuser_id = $1 AND is_active = true 
           ORDER BY created_at`,
          [authUser.id]
        );

        const users = usersResult.rows as User[];

        // Générer un token JWT
        const token = jwt.sign(
          { 
            authuser_id: authUser.id, 
            email: authUser.email,
            organization_id: authUser.organization_id,
            role: authUser.role
          },
          process.env.JWT_SECRET || 'default-secret',
          { expiresIn: '7d' }
        );

        return {
          success: true,
          message: 'Connexion réussie !',
          authuser: {
            id: authUser.id,
            email: authUser.email,
            organization_id: authUser.organization_id,
            role: authUser.role,
            is_active: authUser.is_active,
            email_verified: authUser.email_verified,
            last_login: authUser.last_login,
            created_at: authUser.created_at,
            updated_at: authUser.updated_at
          },
          users,
          token
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return { success: false, message: 'Erreur lors de la connexion' };
    }
  }

  /**
   * Sélection d'un User après authentification
   */
  async selectUser(authuser_id: string, user_id: string): Promise<AuthResult> {
    try {
      const client = await this.pool.connect();
      
      try {
        // Vérifier que l'identité utilisateur appartient à l'AuthUser
        const userResult = await client.query(
          `SELECT u.id, u.authuser_id, u.name, u.persona, u.persona_type, u.display_name, u.chat_persona_config, u.preferences, u.theme, u.is_active, u.created_at, u.updated_at,
                  a.email, a.organization_id, a.role
           FROM user_identities u
           JOIN authusers a ON u.authuser_id = a.id
           WHERE u.id = $1 AND u.authuser_id = $2 AND u.is_active = true`,
          [user_id, authuser_id]
        );

        if (userResult.rows.length === 0) {
          return { success: false, message: 'User non trouvé ou non autorisé' };
        }

        const user = userResult.rows[0];

        // Générer un token avec le User sélectionné
        const token = jwt.sign(
          { 
            authuser_id: authuser_id,
            user_id: user_id,
            email: user.email,
            organization_id: user.organization_id,
            role: user.role,
            persona: user.persona
          },
          process.env.JWT_SECRET || 'your_jwt_secret_here_change_this_in_production',
          { 
            expiresIn: '7d',
            issuer: 'lr-tchatagent-web',
            audience: 'lr-tchatagent-users'
          }
        );

        return {
          success: true,
          message: 'User sélectionné avec succès !',
          token
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erreur lors de la sélection du User:', error);
      return { success: false, message: 'Erreur lors de la sélection du User' };
    }
  }

  /**
   * Récupérer un AuthUser par son ID
   */
  async getAuthUserById(authUserId: string): Promise<AuthUser | null> {
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query(
          'SELECT id, email, first_name, last_name, organization_id, role, is_active, email_verified, created_at, updated_at FROM authusers WHERE id = $1',
          [authUserId]
        );

        if (result.rows.length === 0) {
          return null;
        }

        return result.rows[0] as AuthUser;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'AuthUser:', error);
      return null;
    }
  }

  /**
   * Créer un nouveau User pour un AuthUser
   */
  async createUser(authuser_id: string, name: string, persona: string, theme: string = 'auto'): Promise<AuthResult> {
    try {
      const client = await this.pool.connect();
      
      try {
        // Vérifier que l'AuthUser existe
        const authUserResult = await client.query(
          'SELECT id FROM authusers WHERE id = $1 AND is_active = true',
          [authuser_id]
        );

        if (authUserResult.rows.length === 0) {
          return { success: false, message: 'AuthUser non trouvé' };
        }

        // Créer l'identité utilisateur
        const userResult = await client.query(
          `INSERT INTO user_identities (authuser_id, name, persona, persona_type, display_name, chat_persona_config, preferences, theme, is_default_identity) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
           RETURNING id, authuser_id, name, persona, persona_type, display_name, chat_persona_config, preferences, theme, is_active, created_at, updated_at`,
          [authuser_id, name, persona, 'identity', name, '{"base_persona": "' + persona + '", "communication_style": "mystique", "personality_traits": ["sage", "bienveillant", "mystique"]}', '{}', theme, false]
        );

        const user = userResult.rows[0] as User;

        return {
          success: true,
          message: 'User créé avec succès !',
          users: [user]
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erreur lors de la création du User:', error);
      return { success: false, message: 'Erreur lors de la création du User' };
    }
  }

  /**
   * Récupérer un AuthUser par email
   */
  async getAuthUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query(
          `SELECT id, email, organization_id, role, is_active, email_verified, 
                  last_login, created_at, updated_at 
           FROM authusers 
           WHERE email = $1`,
          [email]
        );

        return result.rows.length > 0 ? result.rows[0] as AuthUser : null;

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'AuthUser:', error);
      return null;
    }
  }

  /**
   * Récupérer les Users d'un AuthUser
   */
  async getUsersByAuthUser(authuser_id: string): Promise<User[]> {
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query(
          `SELECT id, authuser_id, name, persona, persona_type, display_name, chat_persona_config, preferences, theme, is_active, created_at, updated_at 
           FROM user_identities 
           WHERE authuser_id = $1 AND is_active = true 
           ORDER BY created_at`,
          [authuser_id]
        );

        return result.rows as User[];

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erreur lors de la récupération des Users:', error);
      return [];
    }
  }

  /**
   * Vérifier un token JWT
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    } catch (error) {
      return null;
    }
  }

  /**
   * Déconnexion (invalidation du token côté client)
   */
  async signOut(): Promise<AuthResult> {
    // Dans notre implémentation, la déconnexion se fait côté client
    // en supprimant le token. On pourrait ajouter une blacklist de tokens
    // si nécessaire pour une sécurité renforcée.
    return {
      success: true,
      message: 'Déconnexion réussie !'
    };
  }

  /**
   * Vérifie un email avec un token
   */
  async verifyEmail(token: string): Promise<AuthResult> {
    try {
      const client = await this.pool.connect();
      
      try {
        // Trouver l'AuthUser avec ce token
        const authUserResult = await client.query(
          `SELECT id, email, first_name, email_verified 
           FROM authusers 
           WHERE email_verification_token = $1 AND email_verified = false`,
          [token]
        );

        if (authUserResult.rows.length === 0) {
          return { success: false, message: 'Token de vérification invalide ou expiré' };
        }

        const authUser = authUserResult.rows[0];

        // Marquer l'email comme vérifié et supprimer le token
        await client.query(
          `UPDATE authusers 
           SET email_verified = true, email_verification_token = NULL, updated_at = NOW()
           WHERE id = $1`,
          [authUser.id]
        );

        return {
          success: true,
          message: 'Email vérifié avec succès !'
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erreur vérification email:', error);
      return { success: false, message: 'Erreur lors de la vérification' };
    }
  }

  /**
   * Récupérer une identité utilisateur par son ID
   */
  async getUserIdentityById(identityId: string): Promise<any> {
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query(
          `SELECT id, authuser_id, name, persona, persona_type, display_name, 
                  avatar_url, chat_persona_config, is_default_identity, 
                  preferences, theme, is_active, created_at, updated_at
           FROM user_identities 
           WHERE id = $1 AND is_active = true`,
          [identityId]
        );

        if (result.rows.length === 0) {
          return null;
        }

        return result.rows[0];
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erreur récupération identité utilisateur:', error);
      return null;
    }
  }

  /**
   * Test de connexion à la base de données
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const client = await this.pool.connect();
      
      try {
        const result = await client.query('SELECT NOW()');
        return {
          success: true,
          message: `Connexion à la base de données réussie - ${result.rows[0].now}`
        };
      } finally {
        client.release();
      }

    } catch (error) {
      return {
        success: false,
        message: `Erreur de connexion à la base de données: ${error}`
      };
    }
  }

  /**
   * Créer une nouvelle identité utilisateur
   */
  async createUserIdentity(data: {
    authuser_id: string;
    name: string;
    persona: 'algareth' | 'assistant' | 'custom';
    display_name: string;
    chat_persona_config: any;
    preferences: Record<string, any>;
    theme: 'light' | 'dark' | 'auto';
    is_default_identity: boolean;
  }): Promise<AuthResult> {
    try {
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Créer l'identité utilisateur
        const userResult = await client.query(
          `INSERT INTO user_identities (authuser_id, name, persona, persona_type, display_name, chat_persona_config, preferences, theme, is_default_identity) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
           RETURNING id, authuser_id, name, persona, persona_type, display_name, chat_persona_config, preferences, theme, is_active, created_at, updated_at`,
          [data.authuser_id, data.name, data.persona, 'identity', data.display_name, JSON.stringify(data.chat_persona_config), JSON.stringify(data.preferences), data.theme, data.is_default_identity]
        );

        const user = userResult.rows[0] as User;

        await client.query('COMMIT');

        return {
          success: true,
          message: 'Identité utilisateur créée avec succès',
          user: user
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erreur création identité utilisateur:', error);
      return { success: false, message: 'Erreur lors de la création de l\'identité' };
    }
  }

  /**
   * Supprimer une identité utilisateur
   */
  async deleteUserIdentity(userId: string, authuser_id: string): Promise<AuthResult> {
    try {
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Vérifier que l'identité appartient à cet AuthUser
        const checkResult = await client.query(
          'SELECT id FROM user_identities WHERE id = $1 AND authuser_id = $2',
          [userId, authuser_id]
        );

        if (checkResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return { success: false, message: 'Identité non trouvée ou non autorisée' };
        }

        // Supprimer l'identité utilisateur
        await client.query('DELETE FROM user_identities WHERE id = $1 AND authuser_id = $2', [userId, authuser_id]);

        await client.query('COMMIT');

        return { success: true, message: 'Identité supprimée avec succès' };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Erreur suppression identité utilisateur:', error);
      return { success: false, message: 'Erreur lors de la suppression de l\'identité' };
    }
  }
}

/**
 * Instance singleton du service AuthUser
 */
export const authUserService = AuthUserService.getInstance();