/**
 * Types pour le système de sessions multiples
 * Inspiré de l'interface ChatGPT avec persistence localStorage
 */

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
  user: string;
  persona: string;
  mode: 'algareth' | 'debug' | 'neutral' | 'technical';
  language: string;
  memoryStats: {
    totalItems: number;
    rawMessages: number;
    summaries: number;
    l1Count: number;
    totalCharacters: number;
    budget: {
      maxCharacters: number;
      currentCharacters: number;
      summaryRatio: number;
    };
  };
  isActive: boolean;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
  divineMurmurs?: Array<{
    type: 'memory' | 'image' | 'both' | 'none';
    content: string;
    data?: any;
    timestamp: string;
  }>;
}

export interface SessionMemory {
  sessionId: string;
  messages: SessionMessage[];
  hierarchicalMemory: {
    items: any[];
    stats: any;
  };
  userMemory: {
    loaded: boolean;
    conversationCount: number;
    summaryCount: number;
    lastConversation: string | null;
    metaSummary: string | null;
  };
}

export interface SessionManager {
  sessions: ChatSession[];
  currentSessionId: string | null;
  createSession: (user: string, title?: string) => ChatSession;
  switchToSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSessionTitle: (sessionId: string, title: string) => void;
  saveSessionMemory: (sessionId: string, memory: SessionMemory) => Promise<void>;
  loadSessionMemory: (sessionId: string) => Promise<SessionMemory | null>;
  exportSessions: () => ChatSession[];
  importSessions: (sessions: ChatSession[]) => void;
}

export interface SessionStorage {
  saveSession: (session: ChatSession) => Promise<void>;
  loadSessions: (user: string) => Promise<ChatSession[]>;
  deleteSession: (sessionId: string) => Promise<void>;
  saveSessionMemory: (sessionId: string, memory: SessionMemory) => Promise<void>;
  loadSessionMemory: (sessionId: string) => Promise<SessionMemory | null>;
  clearAllSessions: (user: string) => Promise<void>;
}