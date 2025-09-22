/**
 * Hook React pour l'authentification avec AuthUser/User
 */

import { useState, useEffect } from 'react';
import { authManager, AuthState } from './AuthManager';
// Types simplifiés pour éviter les imports côté client
interface User {
  id: string;
  authuser_id: string;
  name: string;
  persona: string;
  persona_type: 'identity' | 'chat_style' | 'generated';
  display_name: string;
  avatar_url?: string;
  chat_persona_config: any;
  is_default_identity: boolean;
  preferences: Record<string, any>;
  theme: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(authManager.getAuthState());
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    // Initialiser l'AuthManager si pas déjà fait
    authManager.initialize().catch(error => {
      console.error('Erreur lors de l\'initialisation de l\'AuthManager dans useAuth:', error);
    });

    const unsubscribe = authManager.addAuthStateListener((state) => {
      setAuthState(state);
      // Récupérer les utilisateurs disponibles depuis l'AuthManager
      setAvailableUsers(authManager.getAvailableUsers());
    });
    return unsubscribe;
  }, []);

  return {
    ...authState,
    availableUsers,
    signUp: authManager.signUp.bind(authManager),
    signIn: authManager.signIn.bind(authManager),
    selectUser: authManager.selectUser.bind(authManager),
    signOut: authManager.signOut.bind(authManager),
    getCurrentAuthUser: authManager.getCurrentAuthUser.bind(authManager),
    getAvailableUsers: authManager.getAvailableUsers.bind(authManager)
  };
}