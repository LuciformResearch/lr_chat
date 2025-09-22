/**
 * Service d'authentification côté client
 * Utilise les API routes pour éviter les modules Node.js côté client
 */

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

export interface AuthResult {
  success: boolean;
  message: string;
  authuser?: any;
  users?: any[];
  token?: string;
  needsUserSelection?: boolean;
}

export class ClientAuthService {
  private static instance: ClientAuthService;

  private constructor() {}

  public static getInstance(): ClientAuthService {
    if (!ClientAuthService.instance) {
      ClientAuthService.instance = new ClientAuthService();
    }
    return ClientAuthService.instance;
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Erreur de connexion. Veuillez réessayer.'
      };
    }
  }

  /**
   * Connexion d'un utilisateur
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Erreur de connexion. Veuillez réessayer.'
      };
    }
  }

  /**
   * Sélection d'un utilisateur
   */
  async selectUser(authUserId: string, userIdentityId: string): Promise<AuthResult> {
    try {
      const response = await fetch('/api/auth/select-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authUserId, userIdentityId }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Erreur de connexion. Veuillez réessayer.'
      };
    }
  }

  /**
   * Vérification d'email
   */
  async verifyEmail(token: string): Promise<AuthResult> {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Erreur de connexion. Veuillez réessayer.'
      };
    }
  }

  /**
   * Sauvegarde du token dans le localStorage
   */
  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Récupération du token depuis le localStorage
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Suppression du token
   */
  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Vérification d'un token JWT (côté client basique)
   */
  verifyToken(token: string): any {
    try {
      // Décodage basique du JWT côté client (sans vérification de signature)
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      return null;
    }
  }
}

/**
 * Instance singleton du service client
 */
export const clientAuthService = ClientAuthService.getInstance();
