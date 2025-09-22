/**
 * Gestionnaire des modes de prompt
 * Permet de basculer entre différents modes (Algareth, Debug, Neutral, Technical)
 */

import { PromptMode, PromptConfig } from '@/lib/algareth/prompts';

export interface PromptModeSettings {
  currentMode: PromptMode;
  autoSwitch: boolean;
  debugModeEnabled: boolean;
  lastUsedMode: PromptMode;
}

class PromptModeManager {
  private static instance: PromptModeManager;
  private readonly STORAGE_KEY = 'lr_tchatagent_prompt_mode';
  private settings: PromptModeSettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  public static getInstance(): PromptModeManager {
    if (!PromptModeManager.instance) {
      PromptModeManager.instance = new PromptModeManager();
    }
    return PromptModeManager.instance;
  }

  /**
   * Charge les paramètres depuis localStorage
   */
  private loadSettings(): PromptModeSettings {
    if (typeof window === 'undefined') {
      return this.getDefaultSettings();
    }

    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.getDefaultSettings(), ...parsed };
      }
    } catch (error) {
      console.error('Erreur chargement paramètres prompt mode:', error);
    }

    return this.getDefaultSettings();
  }

  /**
   * Sauvegarde les paramètres dans localStorage
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Erreur sauvegarde paramètres prompt mode:', error);
    }
  }

  /**
   * Paramètres par défaut
   */
  private getDefaultSettings(): PromptModeSettings {
    return {
      currentMode: 'algareth',
      autoSwitch: false,
      debugModeEnabled: false,
      lastUsedMode: 'algareth'
    };
  }

  /**
   * Obtient le mode actuel
   */
  public getCurrentMode(): PromptMode {
    return this.settings.currentMode;
  }

  /**
   * Définit le mode actuel
   */
  public setCurrentMode(mode: PromptMode): void {
    this.settings.lastUsedMode = this.settings.currentMode;
    this.settings.currentMode = mode;
    this.saveSettings();
    
    console.log(`🔄 Mode de prompt changé: ${this.settings.lastUsedMode} → ${mode}`);
  }

  /**
   * Active/désactive le mode debug
   */
  public setDebugMode(enabled: boolean): void {
    this.settings.debugModeEnabled = enabled;
    
    if (enabled && this.settings.currentMode === 'algareth') {
      this.setCurrentMode('debug');
    } else if (!enabled && this.settings.currentMode === 'debug') {
      this.setCurrentMode(this.settings.lastUsedMode);
    }
    
    this.saveSettings();
  }

  /**
   * Vérifie si le mode debug est activé
   */
  public isDebugModeEnabled(): boolean {
    return this.settings.debugModeEnabled;
  }

  /**
   * Active/désactive le changement automatique
   */
  public setAutoSwitch(enabled: boolean): void {
    this.settings.autoSwitch = enabled;
    this.saveSettings();
  }

  /**
   * Obtient la configuration complète
   */
  public getConfig(language: string = 'fr'): PromptConfig {
    return {
      mode: this.settings.currentMode,
      language
    };
  }

  /**
   * Obtient tous les paramètres
   */
  public getSettings(): PromptModeSettings {
    return { ...this.settings };
  }

  /**
   * Met à jour les paramètres
   */
  public updateSettings(newSettings: Partial<PromptModeSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  /**
   * Réinitialise les paramètres
   */
  public resetSettings(): void {
    this.settings = this.getDefaultSettings();
    this.saveSettings();
    console.log('🔄 Paramètres de mode de prompt réinitialisés');
  }

  /**
   * Obtient la liste des modes disponibles
   */
  public getAvailableModes(): Array<{ value: PromptMode; label: string; description: string }> {
    return [
      {
        value: 'algareth',
        label: 'Algareth',
        description: 'Mode mystique et poétique (par défaut)'
      },
      {
        value: 'debug',
        label: 'Debug',
        description: 'Mode neutre pour le débogage et les tests'
      },
      {
        value: 'neutral',
        label: 'Neutre',
        description: 'Assistant amical et utile'
      },
      {
        value: 'technical',
        label: 'Technique',
        description: 'Assistant technique et précis'
      }
    ];
  }

  /**
   * Bascule automatiquement vers le mode debug si nécessaire
   */
  public autoSwitchToDebug(): void {
    if (this.settings.autoSwitch && this.settings.currentMode === 'algareth') {
      this.setCurrentMode('debug');
      console.log('🔄 Basculement automatique vers le mode debug');
    }
  }

  /**
   * Bascule automatiquement vers le mode normal si nécessaire
   */
  public autoSwitchToNormal(): void {
    if (this.settings.autoSwitch && this.settings.currentMode === 'debug') {
      this.setCurrentMode(this.settings.lastUsedMode);
      console.log('🔄 Basculement automatique vers le mode normal');
    }
  }

  /**
   * Obtient les statistiques d'utilisation
   */
  public getUsageStats(): {
    currentMode: PromptMode;
    isDebugEnabled: boolean;
    autoSwitchEnabled: boolean;
    lastUsedMode: PromptMode;
  } {
    return {
      currentMode: this.settings.currentMode,
      isDebugEnabled: this.settings.debugModeEnabled,
      autoSwitchEnabled: this.settings.autoSwitch,
      lastUsedMode: this.settings.lastUsedMode
    };
  }
}

/**
 * Instance singleton
 */
export const promptModeManager = PromptModeManager.getInstance();

/**
 * Hook React pour la gestion des modes de prompt
 */
export function usePromptMode() {
  const manager = promptModeManager;
  
  const currentMode = manager.getCurrentMode();
  const isDebugEnabled = manager.isDebugModeEnabled();
  const settings = manager.getSettings();
  const availableModes = manager.getAvailableModes();

  const setMode = (mode: PromptMode) => {
    manager.setCurrentMode(mode);
  };

  const toggleDebugMode = () => {
    manager.setDebugMode(!isDebugEnabled);
  };

  const setAutoSwitch = (enabled: boolean) => {
    manager.setAutoSwitch(enabled);
  };

  const resetSettings = () => {
    manager.resetSettings();
  };

  const getConfig = (language: string = 'fr') => {
    return manager.getConfig(language);
  };

  return {
    currentMode,
    isDebugEnabled,
    settings,
    availableModes,
    setMode,
    toggleDebugMode,
    setAutoSwitch,
    resetSettings,
    getConfig
  };
}