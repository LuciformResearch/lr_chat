/**
 * Provider d'authentification pour l'application
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authManager } from './AuthManager';
import { AuthState } from './types';

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(authManager.getAuthState());

  useEffect(() => {
    // Initialiser l'AuthManager au démarrage de l'app
    authManager.initialize().catch(error => {
      console.error('Erreur lors de l\'initialisation de l\'AuthManager:', error);
    });

    // Écouter les changements d'état
    const unsubscribe = authManager.addAuthStateListener((state) => {
      setAuthState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}