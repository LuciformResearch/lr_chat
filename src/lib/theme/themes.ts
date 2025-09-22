import { Theme } from './types';

export const AVAILABLE_THEMES: Theme[] = [
  {
    id: 'dark-modern',
    name: 'Dark Modern',
    description: 'Moderne et sombre, parfait pour LinkedIn',
    emoji: '🌙',
    preview: {
      primary: '#0f0f23',
      secondary: '#1a1a2e',
      accent: '#6366f1'
    }
  },
  {
    id: 'dark-vampiric',
    name: 'Dark Vampiric',
    description: 'Gothique et élégant, rouge et or',
    emoji: '🧛',
    preview: {
      primary: '#1a0a0a',
      secondary: '#2d1b1b',
      accent: '#dc2626'
    }
  },
  {
    id: 'dark-lord',
    name: 'Dark Lord',
    description: 'Puissant et intimidant, vert sombre',
    emoji: '👑',
    preview: {
      primary: '#0a0a0a',
      secondary: '#1a1a1a',
      accent: '#22c55e'
    }
  },
  {
    id: 'white-knight',
    name: 'White Knight',
    description: 'Pur et noble, bleu clair',
    emoji: '⚔️',
    preview: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      accent: '#3b82f6'
    }
  },
  {
    id: 'princess-bubblegum',
    name: 'Princess Bubblegum',
    description: 'Coloré et fun, rose et violet',
    emoji: '🌸',
    preview: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      accent: '#8b5cf6'
    }
  },
  {
    id: 'succubus-hell-red',
    name: 'Succubus Hell Red',
    description: 'Sensuel et intense, rouge vif',
    emoji: '🔥',
    preview: {
      primary: '#1a0a0a',
      secondary: '#2d0a0a',
      accent: '#ef4444'
    }
  },
  {
    id: 'evil-hell-bloody',
    name: 'Evil Hell Bloody',
    description: 'Agressif et intense, rouge sang',
    emoji: '💀',
    preview: {
      primary: '#0a0000',
      secondary: '#1a0000',
      accent: '#dc2626'
    }
  }
];

export const DEFAULT_THEME = 'succubus-hell-red';