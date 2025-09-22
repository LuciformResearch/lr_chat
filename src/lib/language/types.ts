export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  emoji: string;
}

export interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (language: string) => void;
  availableLanguages: Language[];
  isLoading: boolean;
  t: (key: string, params?: Record<string, string>) => string;
}

export interface TranslationKey {
  // Chat
  'chat.welcome': string;
  'chat.placeholder': string;
  'chat.send': string;
  'chat.thinking': string;
  'chat.enter_name': string;
  'chat.enter_domain': string;
  
  // Algareth
  'algareth.title': string;
  'algareth.subtitle': string;
  'algareth.welcome': string;
  'algareth.manifestation': string;
  
  // Dashboard
  'dashboard.title': string;
  'dashboard.subtitle': string;
  'dashboard.features': string;
  'dashboard.development': string;
  
  // Common
  'common.loading': string;
  'common.error': string;
  'common.success': string;
  'common.cancel': string;
  'common.save': string;
}