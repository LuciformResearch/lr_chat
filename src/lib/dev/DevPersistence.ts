/**
 * DevPersistence - Persistance pour le développement
 * Évite de perdre les clés API et sessions à chaque rebuild
 */

import { ApiKeyConfig } from '@/lib/utils/SessionEncryption';

export interface DevSession {
  apiKeys: Partial<ApiKeyConfig>;
  supabaseConfig: {
    url: string;
    key: string;
  };
  lastSaved: string;
}

class DevPersistenceManager {
  private static instance: DevPersistenceManager;
  private readonly DEV_STORAGE_KEY = 'lr_tchatagent_dev_persistence';
  private readonly BACKUP_STORAGE_KEY = 'lr_tchatagent_dev_backup';

  private constructor() {}

  public static getInstance(): DevPersistenceManager {
    if (!DevPersistenceManager.instance) {
      DevPersistenceManager.instance = new DevPersistenceManager();
    }
    return DevPersistenceManager.instance;
  }

  /**
   * Sauvegarde la session de développement
   */
  public saveDevSession(apiKeys: Partial<ApiKeyConfig>, supabaseConfig?: { url: string; key: string }): void {
    if (typeof window === 'undefined') {
      return; // Côté serveur, pas de localStorage
    }
    
    try {
      const devSession: DevSession = {
        apiKeys,
        supabaseConfig: supabaseConfig || { url: '', key: '' },
        lastSaved: new Date().toISOString()
      };

      // Sauvegarder dans localStorage (persiste entre les rebuilds)
      localStorage.setItem(this.DEV_STORAGE_KEY, JSON.stringify(devSession));
      
      // Créer une sauvegarde
      localStorage.setItem(this.BACKUP_STORAGE_KEY, JSON.stringify(devSession));
      
      console.log('💾 Session de développement sauvegardée');
    } catch (error) {
      console.error('Erreur sauvegarde session dev:', error);
    }
  }

  /**
   * Restaure la session de développement
   */
  public restoreDevSession(): DevSession | null {
    if (typeof window === 'undefined') {
      return null; // Côté serveur, pas de localStorage
    }
    
    try {
      const saved = localStorage.getItem(this.DEV_STORAGE_KEY);
      if (saved) {
        const devSession: DevSession = JSON.parse(saved);
        console.log('🔄 Session de développement restaurée');
        return devSession;
      }
    } catch (error) {
      console.error('Erreur restauration session dev:', error);
    }
    return null;
  }

  /**
   * Restaure depuis la sauvegarde
   */
  public restoreFromBackup(): DevSession | null {
    if (typeof window === 'undefined') {
      return null; // Côté serveur, pas de localStorage
    }
    
    try {
      const backup = localStorage.getItem(this.BACKUP_STORAGE_KEY);
      if (backup) {
        const devSession: DevSession = JSON.parse(backup);
        console.log('🔄 Session restaurée depuis la sauvegarde');
        return devSession;
      }
    } catch (error) {
      console.error('Erreur restauration depuis backup:', error);
    }
    return null;
  }

  /**
   * Applique la session restaurée
   */
  public async applyRestoredSession(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false; // Côté serveur, pas de localStorage/sessionStorage
    }
    
    try {
      const devSession = this.restoreDevSession();
      if (!devSession) {
        return false;
      }

      // Restaurer les clés API dans la session chiffrée normale
      if (Object.keys(devSession.apiKeys).length > 0) {
        // Utiliser le système de chiffrement normal via ApiKeyManager
        const { apiKeyManager } = await import('@/lib/utils/ApiKeyManager');
        
        // Sauvegarder chaque clé via le système normal
        for (const [provider, key] of Object.entries(devSession.apiKeys)) {
          if (key) {
            await apiKeyManager.saveApiKey(provider as keyof import('@/lib/utils/SessionEncryption').ApiKeyConfig, key);
          }
        }
        
        console.log('✅ Clés API restaurées via le système de chiffrement normal');
      }

      // Restaurer la config Supabase si disponible
      if (devSession.supabaseConfig.url && devSession.supabaseConfig.key) {
        const { apiKeyManager } = await import('@/lib/utils/ApiKeyManager');
        await apiKeyManager.saveApiKey('supabase', devSession.supabaseConfig.key);
        await apiKeyManager.saveApiKey('supabaseUrl', devSession.supabaseConfig.url);
        console.log('✅ Config Supabase restaurée via le système normal');
      }

      return true;
    } catch (error) {
      console.error('Erreur application session restaurée:', error);
      return false;
    }
  }

  /**
   * Sauvegarde automatique des clés API
   */
  public autoSaveApiKeys(apiKeys: Partial<ApiKeyConfig>): void {
    if (typeof window === 'undefined') {
      return; // Côté serveur, pas de localStorage
    }
    
    // Sauvegarder automatiquement quand les clés changent
    this.saveDevSession(apiKeys);
  }

  /**
   * Obtient les clés API depuis la session restaurée
   */
  public getRestoredApiKeys(): Partial<ApiKeyConfig> {
    if (typeof window === 'undefined') {
      return {}; // Côté serveur, pas de sessionStorage
    }
    
    try {
      // Utiliser le système normal de lecture des clés
      const { sessionApiKeys } = require('@/lib/utils/SessionEncryption');
      return sessionApiKeys.loadApiKeys();
    } catch (error) {
      console.error('Erreur récupération clés restaurées:', error);
      return {};
    }
  }

  /**
   * Nettoie les données de développement
   */
  public clearDevData(): void {
    if (typeof window === 'undefined') {
      return; // Côté serveur, pas de localStorage
    }
    
    localStorage.removeItem(this.DEV_STORAGE_KEY);
    localStorage.removeItem(this.BACKUP_STORAGE_KEY);
    sessionStorage.removeItem('lr_tchatagent_encrypted_api_keys');
    console.log('🧹 Données de développement nettoyées');
  }

  /**
   * Vérifie si une session de dev existe
   */
  public hasDevSession(): boolean {
    if (typeof window === 'undefined') {
      return false; // Côté serveur, pas de localStorage
    }
    return !!localStorage.getItem(this.DEV_STORAGE_KEY);
  }

  /**
   * Obtient les infos de la session de dev
   */
  public getDevSessionInfo(): { lastSaved: string; hasKeys: boolean } | null {
    if (typeof window === 'undefined') {
      return null; // Côté serveur, pas de localStorage
    }
    
    try {
      const saved = localStorage.getItem(this.DEV_STORAGE_KEY);
      if (saved) {
        const devSession: DevSession = JSON.parse(saved);
        return {
          lastSaved: devSession.lastSaved,
          hasKeys: Object.keys(devSession.apiKeys).length > 0
        };
      }
    } catch (error) {
      console.error('Erreur récupération info session:', error);
    }
    return null;
  }
}

/**
 * Instance singleton
 */
export const devPersistence = DevPersistenceManager.getInstance();

/**
 * Hook React pour la persistance de dev
 */
export function useDevPersistence() {
  // Vérifications côté client uniquement
  const hasSession = typeof window !== 'undefined' ? devPersistence.hasDevSession() : false;
  const sessionInfo = typeof window !== 'undefined' ? devPersistence.getDevSessionInfo() : null;

  const saveSession = (apiKeys: Partial<ApiKeyConfig>, supabaseConfig?: { url: string; key: string }) => {
    if (typeof window !== 'undefined') {
      devPersistence.saveDevSession(apiKeys, supabaseConfig);
    }
  };

  const restoreSession = async () => {
    if (typeof window !== 'undefined') {
      return await devPersistence.applyRestoredSession();
    }
    return false;
  };

  const clearSession = () => {
    if (typeof window !== 'undefined') {
      devPersistence.clearDevData();
    }
  };

  return {
    hasSession,
    sessionInfo,
    saveSession,
    restoreSession,
    clearSession
  };
}