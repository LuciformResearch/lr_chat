export interface Theme {
  id: string;
  name: string;
  description: string;
  emoji: string;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface ThemeContextType {
  currentTheme: string;
  setTheme: (theme: string) => void;
  availableThemes: Theme[];
  isLoading: boolean;
}