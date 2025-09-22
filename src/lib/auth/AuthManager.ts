/**
 * AuthManager - Gestionnaire d'authentification avec PostgreSQL AuthUserService
 */

import { clientAuthService, SignUpData, SignInData } from './client-auth-service';
import { AuthState } from './types';

export class AuthManager {
  private static instance: AuthManager;
  private authState: AuthState = {
    user: null,
    loading: true,
    error: null
  };
  private listeners: ((state: AuthState) => void)[] = [];
  private currentAuthUser: any = null;
  private availableUsers: any[] = [];
  private selectedUser: any = null;
  private token: string | null = null;

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Initialise l'AuthManager
   */
  public async initialize(): Promise<void> {
    try {
      // Vérifier s'il y a un token en session
      if (typeof window !== 'undefined') {
        const savedToken = clientAuthService.getToken();
        if (savedToken) {
          const decoded = clientAuthService.verifyToken(savedToken);
          if (decoded) {
            this.token = savedToken;
            this.currentAuthUser = {
              id: decoded.authuser_id,
              email: decoded.email,
              organization_id: decoded.organization_id,
              role: decoded.role,
              is_active: true,
              email_verified: true,
              created_at: new Date(),
              updated_at: new Date()
            };

            // Récupérer les identités disponibles depuis la base de données
            await this.loadAvailableUsers(decoded.authuser_id);

            // Si une identité est sélectionnée dans le token, la trouver dans la liste des utilisateurs disponibles
            if (decoded.selectedIdentityId || decoded.user_id) {
              const identityId = decoded.selectedIdentityId || decoded.user_id;
              // Chercher l'utilisateur dans la liste des utilisateurs disponibles
              this.selectedUser = this.availableUsers.find(u => u.id === identityId) || null;
              
              // Si pas trouvé dans la liste, créer un utilisateur basique à partir du token
              if (!this.selectedUser) {
                this.selectedUser = {
                  id: identityId,
                  authuser_id: decoded.authuser_id,
                  name: decoded.name || 'User',
                  persona: decoded.persona || 'algareth',
                  persona_type: decoded.persona_type || 'identity',
                  display_name: decoded.display_name || 'User',
                  chat_persona_config: decoded.chat_persona_config || {},
                  is_default_identity: decoded.is_default_identity || false,
                  preferences: decoded.preferences || {},
                  theme: decoded.theme || 'auto',
                  is_active: true,
                  created_at: new Date(),
                  updated_at: new Date()
                };
              }
            } else if (this.availableUsers.length === 1) {
              // Si une seule identité disponible, la sélectionner automatiquement
              this.selectedUser = this.availableUsers[0];
            } else {
              // Aucune identité disponible, l'utilisateur devra en créer une
              this.selectedUser = null;
            }
          }
        }
      }

      this.authState.loading = false;
      this.authState.user = this.selectedUser;
      this.notifyListeners();
    } catch (error) {
      console.error('Erreur initialisation AuthManager:', error);
      this.authState.loading = false;
      this.authState.error = error.message;
      this.notifyListeners();
    }
  }

  /**
   * Charge les identités disponibles depuis la base de données
   */
  private async loadAvailableUsers(authUserId: string): Promise<void> {
    try {
      const response = await fetch('/api/auth/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.users) {
          this.availableUsers = data.users;
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des identités:', error);
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  public async signUp(data: SignUpData): Promise<{ success: boolean; message: string }> {
    try {
      this.authState.loading = true;
      this.notifyListeners();

      const result = await clientAuthService.signUp(data);
      
      if (result.success && result.authuser && result.users) {
        this.currentAuthUser = result.authuser;
        this.availableUsers = result.users;
        this.selectedUser = result.users[0]; // Sélectionner le premier user par défaut
        
        // Sauvegarder le token si disponible
        if (result.token) {
          clientAuthService.saveToken(result.token);
          this.token = result.token;
        }
        
        this.authState.user = this.selectedUser;
        this.authState.error = null;
      } else {
        this.authState.error = result.message;
      }

      this.authState.loading = false;
      this.notifyListeners();
      return { success: result.success, message: result.message };
    } catch (error) {
      this.authState.error = error.message;
      this.authState.loading = false;
      this.notifyListeners();
      return { success: false, message: error.message };
    }
  }

  /**
   * Connexion d'un utilisateur
   */
  public async signIn(data: SignInData): Promise<{ success: boolean; message: string; needsUserSelection?: boolean }> {
    try {
      this.authState.loading = true;
      this.notifyListeners();

      const result = await clientAuthService.signIn(data);
      
      if (result.success && result.authuser && result.users) {
        this.currentAuthUser = result.authuser;
        this.availableUsers = result.users;
        
        // Sauvegarder le token si disponible
        if (result.token) {
          clientAuthService.saveToken(result.token);
          this.token = result.token;
        }
        
        // Si plusieurs users disponibles, demander la sélection
        if (result.users.length > 1) {
          this.authState.user = null; // Pas de user sélectionné encore
          this.authState.error = null;
          this.authState.loading = false;
          this.notifyListeners();
          return { success: true, message: 'Connexion réussie ! Sélectionnez votre persona.', needsUserSelection: true };
        } else if (result.users.length === 1) {
          // Un seul user, le sélectionner automatiquement
          this.selectedUser = result.users[0];
          this.authState.user = this.selectedUser;
          this.authState.error = null;
        } else {
          // Aucun user disponible, rediriger vers la sélection d'identité
          this.selectedUser = null;
          this.authState.user = null;
          this.authState.error = null;
          this.authState.loading = false;
          this.notifyListeners();
          return { success: true, message: 'Connexion réussie ! Créez votre identité.', needsUserSelection: true };
        }
      } else {
        this.authState.error = result.message;
      }

      this.authState.loading = false;
      this.notifyListeners();
      return { success: result.success, message: result.message };
    } catch (error) {
      this.authState.error = error.message;
      this.authState.loading = false;
      this.notifyListeners();
      return { success: false, message: error.message };
    }
  }

  /**
   * Sélection d'un User après authentification
   */
  public async selectUser(userIdentityId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.currentAuthUser) {
        return { success: false, message: 'Authentification requise' };
      }

      this.authState.loading = true;
      this.notifyListeners();

      const result = await clientAuthService.selectUser(this.currentAuthUser.id, userIdentityId);
      
      if (result.success && result.token) {
        // Mettre à jour le token avec le user sélectionné
        clientAuthService.saveToken(result.token);
        this.token = result.token;
        
        // Trouver le user sélectionné
        this.selectedUser = this.availableUsers.find(u => u.id === userIdentityId) || null;
        this.authState.user = this.selectedUser;
        this.authState.error = null;
      } else {
        this.authState.error = result.message;
      }

      this.authState.loading = false;
      this.notifyListeners();
      return { success: result.success, message: result.message };
    } catch (error) {
      this.authState.error = error.message;
      this.authState.loading = false;
      this.notifyListeners();
      return { success: false, message: error.message };
    }
  }

  /**
   * Déconnexion de l'utilisateur
   */
  public async signOut(): Promise<{ success: boolean; message: string }> {
    try {
      this.authState.loading = true;
      this.notifyListeners();

      // Supprimer le token
      clientAuthService.removeToken();

      // Réinitialiser l'état
      this.currentAuthUser = null;
      this.availableUsers = [];
      this.selectedUser = null;
      this.token = null;
      this.authState.user = null;
      this.authState.error = null;

      this.authState.loading = false;
      this.notifyListeners();
      return { success: true, message: 'Déconnexion réussie !' };
    } catch (error) {
      this.authState.error = error.message;
      this.authState.loading = false;
      this.notifyListeners();
      return { success: false, message: error.message };
    }
  }

  /**
   * Obtient l'utilisateur actuel
   */
  public getCurrentUser(): User | null {
    return this.authState.user;
  }

  /**
   * Obtient l'AuthUser actuel
   */
  public getCurrentAuthUser(): AuthUser | null {
    return this.currentAuthUser;
  }

  /**
   * Obtient les utilisateurs disponibles
   */
  public getAvailableUsers(): User[] {
    return this.availableUsers;
  }

  /**
   * Obtient l'état d'authentification
   */
  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  public isAuthenticated(): boolean {
    return !!this.authState.user;
  }

  /**
   * Vérifie si l'authentification est en cours de chargement
   */
  public isLoading(): boolean {
    return this.authState.loading;
  }

  /**
   * Ajoute un listener pour les changements d'état
   */
  public addAuthStateListener(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifie tous les listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }
}

/**
 * Instance singleton de l'AuthManager
 */
export const authManager = AuthManager.getInstance();
