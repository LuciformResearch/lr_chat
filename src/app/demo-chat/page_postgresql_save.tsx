'use client';

import { useState, useEffect, useRef } from 'react';
import { Luciole } from '@/lib/agents/DivineOrchestrator';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { useLanguage } from '@/lib/language/LanguageProvider';
import { apiKeyManager } from '@/lib/utils/ApiKeyManager';
import { useSessions } from '@/lib/hooks/useSessions';
import { SessionSidebar } from '@/components/sessions/SessionSidebar';
import { ConversationTitleGenerator } from '@/lib/sessions/ConversationTitleGenerator';
import { mcpServer } from '@/mcp';
import { 
  addMessageToHierarchicalMemoryTool,
  buildHierarchicalMemoryContextTool,
  getHierarchicalMemoryStatsTool
} from '@/mcp/tools/memory/hierarchical_memory';
import { 
  getGlobalUserContextTool,
  updateGlobalUserProfileTool,
  getGlobalUserStatsTool
} from '@/mcp/tools/memory/global_user_memory';
import { generateSummaryTool } from '@/mcp/tools/memory/generate_summary';
import { UnifiedProviderFactory } from '@/lib/providers/UnifiedProvider';
import { MemoryStatus } from '@/components/memory/MemoryStatus';
import { MemoryStatsWidget } from '@/components/dev/MemoryStatsWidget';
import { AlgarethThinking } from '@/components/agents/AlgarethThinking';

interface Message {
  id: string;
  role: 'user' | 'algareth';
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

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  user: string;
  isConnected: boolean;
  orchestrator: Luciole | null;
  hierarchicalMemory: {
    enabled: boolean;
    stats: any | null;
  };
  userMemory: any;
  globalUserMemory: {
    enabled: boolean;
    context: string;
    stats: any | null;
  };
}

export default function ChatV2Page() {
  const { currentLanguage, t } = useLanguage();
  void currentLanguage;
  void t;
  
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isTyping: false,
    user: '',
    isConnected: false,
    orchestrator: null,
    hierarchicalMemory: { enabled: true, stats: null },
    userMemory: { loaded: false, conversationCount: 0, summaryCount: 0, lastConversation: null, metaSummary: null },
    globalUserMemory: { enabled: true, context: '', stats: null }
  });
  
  const [inputMessage, setInputMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isAlgarethThinking, setIsAlgarethThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sessions: rawSessions,
    currentSession,
    isLoading: sessionsLoading,
    sessionManager,
    createSession,
    switchToSession,
    deleteSession,
    renameSession,
    loadSessionMemory,
    updateCurrentSessionStats,
    currentSessionId
  } = useSessions(chatState.user);

  // Transformer les sessions pour correspondre au type ChatSession
  const sessions = rawSessions.map(session => ({
    ...session,
    messageCount: session.messageCount || 0,
    lastMessage: session.lastMessage || '',
    user: session.user || chatState.user,
    persona: session.persona || 'Algareth',
    mode: session.mode || 'algareth' as const,
    language: session.language || 'fr',
    memoryStats: session.memoryStats || {
      totalItems: 0,
      rawMessages: 0,
      summaries: 0,
      l1Count: 0,
      totalCharacters: 0,
      budget: {
        maxCharacters: 10000,
        currentCharacters: 0,
        summaryRatio: 0
      }
    },
    isActive: session.isActive || false
  }));

  useEffect(() => {
    const savedUser = localStorage.getItem('lr_tchatagent_current_user');
    if (savedUser) {
      setChatState(prev => ({ ...prev, user: savedUser }));
      setShowWelcome(false); // Si l'utilisateur est déjà sauvegardé, ne pas afficher l'écran d'accueil
    }
  }, []);

  useEffect(() => {
    if (chatState.user) {
      loadGlobalUserMemory(chatState.user);
      initializeOrchestrator(); // Initialiser l'orchestrateur quand l'utilisateur est défini
    }
  }, [chatState.user]);

  useEffect(() => {
    if (currentSessionId && !sessionsLoading && !isLoadingSession) {
      const loadSession = async () => {
        setIsLoadingSession(true);
        try {
          const memory = await loadSessionMemory(currentSessionId);
          if (memory) {
            setChatState(prev => ({
              ...prev,
              messages: memory.messages as Message[],
              hierarchicalMemory: { ...prev.hierarchicalMemory, stats: memory.hierarchicalMemory.stats },
              userMemory: memory.userMemory
            }));
          } else {
            setChatState(prev => ({ ...prev, messages: [], hierarchicalMemory: { ...prev.hierarchicalMemory, stats: null } }));
          }
        } catch (error) {
          console.error('❌ Erreur chargement session:', error);
          setChatState(prev => ({ ...prev, messages: [], hierarchicalMemory: { ...prev.hierarchicalMemory, stats: null } }));
        } finally {
          setIsLoadingSession(false);
        }
      };
      loadSession();
    }
  }, [currentSessionId, sessionsLoading, loadSessionMemory]);

  useEffect(() => {
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, [chatState.messages]);

  const initializeOrchestrator = async () => {
    try {
      console.log(`🔮 Initialisation orchestrateur pour utilisateur: "${chatState.user}"`);
      
      // Charger les clés API depuis PostgreSQL avec authentification
      const response = await authenticatedGet(`/api/api-keys`);
      if (!response.ok) {
        throw new Error(`Impossible de charger les clés API: ${response.status}`);
      }
      
      const apiKeys = await response.json();
      console.log('🔑 Clés API chargées depuis PostgreSQL:', Object.keys(apiKeys));
      console.log('🔑 Clé Gemini présente:', !!apiKeys.gemini);
      
      if (!apiKeys.gemini && !apiKeys.openrouter) {
        console.warn('⚠️ Aucune clé API configurée pour l\'orchestrateur');
        setChatState(prev => ({ ...prev, orchestrator: null, isConnected: false }));
        return;
      }
      
      // Utiliser Gemini si disponible, sinon OpenRouter
      const apiKey = apiKeys.gemini || apiKeys.openrouter;
      console.log(`🔑 Utilisation de la clé: ${apiKey.substring(0, 10)}...`);
      
      const orchestrator = new Luciole(apiKey, true);
      await orchestrator.initializeServants(apiKey);
      setChatState(prev => ({ ...prev, orchestrator, isConnected: true }));
      console.log('🔮 Orchestrateur initialisé avec clé API depuis PostgreSQL');
    } catch (error) {
      console.error('❌ Erreur initialisation orchestrateur:', error);
      setChatState(prev => ({ ...prev, orchestrator: null, isConnected: false }));
    }
  };

  const loadGlobalUserMemory = async (username: string) => {
    try {
      // Simulation du chargement de la mémoire utilisateur
      console.log(`🧠 Chargement mémoire utilisateur: ${username}`);
      setChatState(prev => ({
        ...prev,
        globalUserMemory: {
          ...prev.globalUserMemory,
          context: `Contexte pour ${username}`,
          stats: { loaded: true }
        }
      }));
    } catch (error) {
      console.error('❌ Erreur chargement mémoire:', error);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatState.isTyping || !sessionManager) {
      console.log('❌ Conditions non remplies:', {
        hasMessage: !!inputMessage.trim(),
        isTyping: chatState.isTyping,
        hasSessionManager: !!sessionManager
      });
      return;
    }

    const userMessageContent = inputMessage.trim();
    setInputMessage('');
    setShowWelcome(false);

    const userMsgForState: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date().toISOString()
    };

    setChatState(prev => ({ ...prev, messages: [...prev.messages, userMsgForState], isTyping: true }));
    setCurrentUserMessage(userMessageContent);
    setIsAlgarethThinking(true);

    try {
      await sessionManager.addMessageToCurrentSession({ role: 'user', content: userMessageContent });

      // Utiliser l'orchestrateur réel si disponible
      let divineMurmurs;
      if (chatState.orchestrator) {
        const context = { 
          userMessage: userMessageContent, 
          userId: chatState.user, 
          userName: chatState.user,
          conversationHistory: chatState.messages, 
          currentSession: currentSessionId 
        };
        divineMurmurs = await chatState.orchestrator.orchestrate(context);
        console.log('🔮 Orchestration réelle:', divineMurmurs);
      } else {
        // Fallback simulation si pas d'orchestrateur
        divineMurmurs = [
          {
            type: 'memory',
            content: 'Murmur simulé (pas de clé API)',
            timestamp: new Date().toISOString()
          }
        ];
        console.log('⚠️ Orchestration simulée (pas de clé API)');
      }

      const algarethResponseContent = await generateAlgarethResponse(userMessageContent, divineMurmurs);

      const algarethMsgForState: Message = {
        id: `algareth_${Date.now()}`,
        role: 'algareth',
        content: algarethResponseContent,
        timestamp: new Date().toISOString(),
        divineMurmurs: divineMurmurs
      };

      await sessionManager.addMessageToCurrentSession({ role: 'assistant', content: algarethResponseContent, metadata: { divineMurmurs } });

      setChatState(prev => ({ ...prev, messages: [...prev.messages, algarethMsgForState], isTyping: false }));

    } catch (error) {
      console.error('❌ Erreur traitement message:', error);
      const errorMsg: Message = { id: `error_${Date.now()}`, role: 'algareth', content: '⛧ J\'ai rencontré un problème.', timestamp: new Date().toISOString() };
      setChatState(prev => ({ ...prev, messages: [...prev.messages, errorMsg], isTyping: false }));
    } finally {
      setIsAlgarethThinking(false);
      setIsGeneratingImage(false);
    }
  };

  const generateAlgarethResponse = async (userMessage: string, murmurs: any[]): Promise<string> => {
    // Simulation simple de la réponse d'Algareth
    return `Réponse d'Algareth pour: "${userMessage}"`;
  };

  const handleSessionCreate = async () => { 
    await createSession(); 
  };

  const handleSessionSelect = async (sessionId: string) => { 
    await switchToSession(sessionId); 
  };

  const handleSessionDelete = async (sessionId: string) => { 
    if (confirm('Supprimer?')) await deleteSession(sessionId); 
  };

  const handleSessionRename = (sessionId: string, newTitle: string) => { 
    renameSession(sessionId, newTitle); 
  };

  const handleUserNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatState.user.trim()) {
      localStorage.setItem('lr_tchatagent_current_user', chatState.user.trim());
      setShowWelcome(false);
    }
  };

  // Écran d'accueil si pas d'utilisateur
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-white text-center mb-6">
            ⛧ Chat V2 ⛧
          </h1>
          <form onSubmit={handleUserNameSubmit} className="space-y-4">
            <input
              type="text"
              value={chatState.user}
              onChange={(e) => setChatState(prev => ({ ...prev, user: e.target.value }))}
              placeholder="Entrez votre nom..."
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Commencer
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Interface principale
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">⛧ Chat V2 ⛧</h1>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              chatState.isConnected 
                ? 'bg-green-500/20 text-green-300 border border-green-500/50' 
                : 'bg-red-500/20 text-red-300 border border-red-500/50'
            }`}>
              {chatState.isConnected ? '🔮 Orchestrateur connecté' : '⚠️ Pas de clé API'}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            {!chatState.isConnected && (
              <a 
                href="/settings" 
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ⚙️ Configurer API
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-80 bg-black/20 backdrop-blur-lg border-r border-white/10">
          <SessionSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSessionSelect={handleSessionSelect}
            onSessionCreate={handleSessionCreate}
            onSessionDelete={handleSessionDelete}
            onSessionRename={handleSessionRename}
            onSessionRegenerateTitle={async (sessionId: string) => {
              // Simulation de régénération de titre
              console.log(`Régénération titre pour session ${sessionId}`);
            }}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatState.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white backdrop-blur-lg'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.divineMurmurs && (
                    <div className="mt-2 text-sm opacity-70">
                      {message.divineMurmurs.map((murmur, i) => (
                        <div key={i}>👑 {murmur.content}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {chatState.isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white backdrop-blur-lg p-4 rounded-2xl">
                  <AlgarethThinking />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-6 bg-black/20 backdrop-blur-lg border-t border-white/10">
            <form onSubmit={handleUserSubmit} className="flex space-x-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Tapez votre message..."
                className="flex-1 p-3 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400"
                disabled={chatState.isTyping}
              />
              <button
                type="submit"
                disabled={chatState.isTyping || !inputMessage.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}