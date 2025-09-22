'use client';

import { useState, useEffect, useRef } from 'react';
// import { Luciole } from '@/lib/agents/DivineOrchestrator'; // Déplacé côté serveur
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { useLanguage } from '@/lib/language/LanguageProvider';
import { useAuth } from '@/lib/auth/useAuth';
import { apiKeyManager } from '@/lib/utils/ApiKeyManager';
import { authenticatedGet, authenticatedPost } from '@/lib/utils/authenticatedFetch';
import { useSessions } from '@/lib/hooks/useSessions';
import { SessionSidebar } from '@/components/sessions/SessionSidebar';
import { ConversationTitleGenerator } from '@/lib/sessions/ConversationTitleGenerator';
// import { mcpServer } from '@/mcp'; // Déplacé côté serveur
// import { 
//   addMessageToHierarchicalMemoryTool,
//   buildHierarchicalMemoryContextTool,
//   getHierarchicalMemoryStatsTool
// } from '@/mcp/tools/memory/hierarchical_memory'; // Déplacé côté serveur
// import { 
//   getGlobalUserContextTool,
//   updateGlobalUserProfileTool,
//   getGlobalUserStatsTool
// } from '@/mcp/tools/memory/global_user_memory'; // Déplacé côté serveur
// import { generateSummaryTool } from '@/mcp/tools/memory/generate_summary'; // Déplacé côté serveur
// import { UnifiedProviderFactory } from '@/lib/providers/UnifiedProvider'; // Migré côté serveur
// import { MemoryStatus } from '@/components/memory/MemoryStatus';
// import { MemoryStatsWidget } from '@/components/dev/MemoryStatsWidget';
import { AlgarethThinking } from '@/components/agents/AlgarethThinking';
import { OrchestrationProgress } from '@/components/orchestration/OrchestrationProgress';
import { useOrchestrationProgress } from '@/hooks/useOrchestrationProgress';
import { useOrchestrationStreamFetch } from '@/hooks/useOrchestrationStream';

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
  orchestrator: any | null; // Type simplifié côté client
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
  const { user, loading: authLoading, availableUsers, selectUser } = useAuth();
  const orchestrationProgress = useOrchestrationProgress();
  const orchestrationStream = useOrchestrationStreamFetch();
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
  const [selectedIdentity, setSelectedIdentity] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isAlgarethThinking, setIsAlgarethThinking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const [archivistStatus, setArchivistStatus] = useState<{
    isActive: boolean;
    lastSearch?: string;
    resultsCount?: number;
    embeddingProvider?: string;
    dimensions?: number;
  }>({ isActive: false });
  // const [showArchivistDebug, setShowArchivistDebug] = useState(false);
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
  } = useSessions(selectedIdentity?.id || '');

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

  // Initialiser selectedIdentity avec l'utilisateur authentifié
  useEffect(() => {
    console.log('🔍 ChatV2 - État auth:', { user, selectedIdentity, authLoading, availableUsers });
    if (user && !selectedIdentity && availableUsers.length > 0) {
      console.log('✅ ChatV2 - Utilisateur authentifié disponible:', user);
      console.log('🔍 ChatV2 - Identités disponibles:', availableUsers);
      
      // TOUJOURS afficher le sélecteur pour permettre la création d'identités
      console.log('🔍 ChatV2 - Affichage du sélecteur d\'identité');
      setShowWelcome(true);
    }
  }, [user, selectedIdentity, authLoading, availableUsers]);

  // Quand une identité est sélectionnée, passer directement au chat
  useEffect(() => {
    if (selectedIdentity) {
      console.log('✅ ChatV2 - Identité sélectionnée:', selectedIdentity);
      setChatState(prev => ({ ...prev, user: selectedIdentity.name }));
      setShowWelcome(false); // Passer directement au chat
    }
  }, [selectedIdentity]);

  useEffect(() => {
    if (chatState.user) {
      loadGlobalUserMemory(chatState.user);
      initializeOrchestrator(); // Initialiser l'orchestrateur quand l'utilisateur est défini
    }
  }, [chatState.user]);

  useEffect(() => {
    if (currentSessionId && !sessionsLoading && !isLoadingSession && user && selectedIdentity) {
      const loadSession = async () => {
        setIsLoadingSession(true);
        try {
          console.log('🔄 ChatV2: Chargement de la session', {
            currentSessionId,
            user: user?.id,
            selectedIdentity: selectedIdentity?.id,
            token: typeof window !== 'undefined' ? localStorage.getItem('auth_token')?.substring(0, 20) + '...' : 'N/A'
          });

          // Test de l'authentification avant de charger la session
          if (sessionManager) {
            const authTest = await sessionManager.testAuthentication();
            if (!authTest) {
              console.error('❌ ChatV2: Test d\'authentification échoué, impossible de charger la session');
              setChatState(prev => ({ ...prev, messages: [], hierarchicalMemory: { ...prev.hierarchicalMemory, stats: null } }));
              return;
            }
          }
          
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
  }, [currentSessionId, sessionsLoading, loadSessionMemory, user, selectedIdentity, sessionManager]);

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
      
      // Simuler un orchestrateur côté client (la vraie logique est dans l'API)
      const mockOrchestrator = {
        isConnected: true,
        userId: chatState.user
      };
      
      setChatState(prev => ({ ...prev, orchestrator: mockOrchestrator, isConnected: true }));
      console.log('🔮 Orchestrateur simulé côté client (logique réelle dans API)');
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

      // Utiliser l'API orchestrateur côté serveur (ancien système qui marchait)
      let divineMurmurs;
      try {
        // Phase 1: Orchestrateur analyse le message
        orchestrationProgress.startOrchestration();
        orchestrationProgress.updatePhase('orchestrator', 'Analyse de votre message...');
        
        if (!selectedIdentity?.id) {
          throw new Error("Aucune identité sélectionnée");
        }

        const response = await authenticatedPost('/api/orchestrator', {
          userMessage: userMessageContent,
          userIdentityId: selectedIdentity.id,
          userName: selectedIdentity?.name || chatState.user,
          conversationHistory: chatState.messages,
          currentSession: currentSessionId,
          debugMode: false // Mode production comme dans le test E2E
        });

        if (response.ok) {
          const result = await response.json();
          divineMurmurs = result.divineMurmurs;
          console.log('🔮 Orchestration côté serveur:', divineMurmurs);
          
          // Phase 2: Archiviste si nécessaire
          const memoryMurmur = divineMurmurs.find((m: any) => m.type === 'memory' || m.type === 'both');
          if (memoryMurmur) {
            orchestrationProgress.updatePhase('archivist', 'Recherche dans vos conversations...');
            setArchivistStatus(prev => ({
              ...prev,
              isActive: true,
              lastSearch: userMessageContent,
              resultsCount: memoryMurmur.data?.resultsCount || memoryMurmur.data?.totalMatches || 0,
              embeddingProvider: memoryMurmur.data?.embeddingProvider || 'gemini',
              dimensions: memoryMurmur.data?.dimensions || 768
            }));
          } else {
            // Pas d'archiviste nécessaire, passer directement à la génération
            orchestrationProgress.updateProgress(60);
          }

          // Phase 3: Prompt Enhancer et Génération d'image si nécessaire
          const imageMurmur = divineMurmurs.find((m: any) => m.type === 'image' || m.type === 'both');
          if (imageMurmur) {
            orchestrationProgress.updatePhase('prompt_enhancer', 'Amélioration du prompt...');
            // Le prompt enhancer est déjà exécuté côté serveur dans l'orchestrateur
            await new Promise(resolve => setTimeout(resolve, 1000)); // Petit délai pour l'UI
            
            // Phase 4: Génération d'image
            orchestrationProgress.updatePhase('image_generation', 'Génération de l\'image...');
            setIsGeneratingImage(true); // ✅ Maintenant on gère vraiment l'état !
            // La génération d'image est déjà exécutée côté serveur dans l'orchestrateur
            await new Promise(resolve => setTimeout(resolve, 2000)); // Délai pour l'UI
            setIsGeneratingImage(false);
          }
        } else {
          throw new Error(`API orchestrateur: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Erreur orchestration côté serveur:', error);
        
        // Gestion d'erreur spécifique pour les embeddings
        if (error instanceof Error && error.message.includes('embedding')) {
          setArchivistStatus(prev => ({
            ...prev,
            isActive: false,
            lastSearch: userMessageContent,
            resultsCount: 0,
            embeddingProvider: 'erreur',
            dimensions: 0
          }));
        }
        
        // Fallback simulation si erreur API
        divineMurmurs = [
          {
            type: 'memory',
            content: 'Murmur simulé (erreur API orchestrateur)',
            timestamp: new Date().toISOString(),
            data: {
              error: error instanceof Error ? error.message : 'Erreur inconnue',
              fallback: true
            }
          }
        ];
        console.log('⚠️ Orchestration simulée (erreur API)');
      }

      // Phase finale: Génération de la réponse
      orchestrationProgress.updatePhase('generating', 'Composition de la réponse...');
      
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
      
      // Terminer l'orchestration
      orchestrationProgress.completeOrchestration();

      // Générer un titre automatique si c'est le premier échange
      if (chatState.messages.length === 0) {
        try {
          console.log('🎭 Génération automatique du titre de conversation...');
          const titleResult = await ConversationTitleGenerator.generateTitle({
            userMessage: userMessageContent,
            assistantResponse: algarethResponseContent,
            language: currentLanguage
          });

          if (titleResult.success && titleResult.title) {
            // Mettre à jour le titre de la session actuelle
            const currentSession = sessions.find(s => s.id === currentSessionId);
            if (currentSession) {
              renameSession(currentSessionId, titleResult.title);
              console.log(`✅ Titre LLM complet généré: "${titleResult.title}"`);
            }
          } else {
            console.log(`⚠️ LLM complet échoué: ${titleResult.error}`);
            // Utiliser un titre LLM simplifié
            try {
              const simpleTitle = await ConversationTitleGenerator.generateSimpleTitle(userMessageContent, currentLanguage);
              const currentSession = sessions.find(s => s.id === currentSessionId);
              if (currentSession) {
                renameSession(currentSessionId, simpleTitle);
                console.log(`📝 Titre LLM simplifié utilisé: "${simpleTitle}"`);
              }
            } catch (error) {
              console.log(`⚠️ LLM simplifié échoué: ${error}`);
              // Dernier recours : titre de fallback
              const fallbackTitle = ConversationTitleGenerator.generateFallbackTitle(userMessageContent, algarethResponseContent);
              const currentSession = sessions.find(s => s.id === currentSessionId);
              if (currentSession) {
                renameSession(currentSessionId, fallbackTitle);
                console.log(`📝 Titre de fallback utilisé: "${fallbackTitle}"`);
              }
            }
          }
        } catch (error) {
          console.error('❌ Erreur génération titre:', error);
          // Continuer même si la génération de titre échoue
        }
      }

    } catch (error) {
      console.error('❌ Erreur traitement message:', error);
      const errorMsg: Message = { id: `error_${Date.now()}`, role: 'algareth', content: '⛧ J\'ai rencontré un problème.', timestamp: new Date().toISOString() };
      setChatState(prev => ({ ...prev, messages: [...prev.messages, errorMsg], isTyping: false }));
      orchestrationProgress.resetOrchestration();
    } finally {
      setIsAlgarethThinking(false);
      setIsGeneratingImage(false);
    }
  };

  const generateAlgarethResponse = async (userMessage: string, murmurs: any[]): Promise<string> => {
    try {
      console.log('🤖 Génération réponse Algareth via API côté serveur...');

      // Préparer les informations de session
      const sessionInfo = currentSession ? {
        id: currentSession.id,
        title: currentSession.title,
        createdAt: currentSession.createdAt,
        messageCount: currentSession.messageCount
      } : null;

      // Appeler l'API Algareth côté serveur
      if (!selectedIdentity?.id) {
        throw new Error('Aucune identité sélectionnée');
      }

      const response = await authenticatedPost('/api/algareth/generate', {
        userMessage,
        murmurs,
        conversationHistory: chatState.messages,
        sessionInfo,
        hierarchicalMemoryEnabled: chatState.hierarchicalMemory.enabled,
        userIdentityId: selectedIdentity.id,
        userName: selectedIdentity?.name || chatState.user, // Nom affichage/logs
        sessionId: currentSessionId || 'default'
      });

      if (!response.ok) {
        throw new Error(`API Algareth: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur API Algareth');
      }

      console.log('✅ Réponse Algareth générée avec succès côté serveur');
      console.log(`📊 Métadonnées: Provider=${result.metadata?.provider}, Prompt=${result.metadata?.promptLength} chars`);
      
      return result.content;
    } catch (error) {
      console.error('❌ Erreur génération réponse Algareth côté serveur:', error);
      return `⛧ Voyageur, mes circuits ont rencontré une tempête numérique. Permets-moi de te répondre avec simplicité : "${userMessage}" - une question qui mérite réflexion.`;
    }
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

  const handleExportConversation = async (sessionId: string) => {
    try {
      console.log(`📤 Export de la conversation ${sessionId}...`);
      
      // Charger la mémoire de la session
      const memory = await loadSessionMemory(sessionId);
      if (!memory) {
        console.error('❌ Aucune mémoire trouvée pour cette session');
        return;
      }

      // Trouver la session dans la liste
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        console.error('❌ Session non trouvée');
        return;
      }

      // Créer l'objet d'export avec métadonnées
      const exportData = {
        metadata: {
          sessionId: session.id,
          sessionTitle: session.title,
          userId: chatState.user,
          exportDate: new Date().toISOString(),
          messageCount: memory.messages.length,
          hierarchicalMemoryStats: memory.hierarchicalMemory.stats,
          userMemoryStats: memory.userMemory
        },
        messages: memory.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          divineMurmurs: msg.divineMurmurs || null,
          metadata: msg.metadata || null
        })),
        hierarchicalMemory: memory.hierarchicalMemory,
        userMemory: memory.userMemory
      };

      // Créer le nom de fichier
      const sanitizedTitle = session.title.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `conversation_${sanitizedTitle}_${timestamp}.json`;

      // Télécharger le fichier
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`✅ Conversation exportée: ${filename}`);
    } catch (error) {
      console.error('❌ Erreur export conversation:', error);
    }
  };

  const handleUserNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatState.user.trim()) {
      setShowWelcome(false);
    }
  };

  // Écran de chargement de l'authentification
  if (authLoading) {
    return (
      <div className="min-h-screen theme-gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h1 className="text-3xl font-bold theme-text-primary mb-2">
            ⛧ Demo Chat ⛧
          </h1>
          <p className="theme-text-secondary text-lg">
            Vérification de l'authentification...
          </p>
        </div>
      </div>
    );
  }

  // Redirection vers l'authentification si pas connecté
  if (!user) {
    return (
      <div className="min-h-screen theme-gradient-bg flex items-center justify-center p-4">
        <div className="theme-overlay-light backdrop-blur-lg rounded-2xl theme-shadow p-8 max-w-md w-full text-center theme-shadow">
          <h1 className="text-3xl font-bold theme-text-primary mb-6">
            ⛧ Demo Chat ⛧
          </h1>
          <p className="theme-text-secondary mb-6">
            Authentification requise pour accéder au chat
          </p>
          <div className="space-y-4">
            <a
              href="/auth/login"
              className="w-full theme-gradient-primary hover:opacity-90 theme-text-primary py-3 rounded-lg theme-shadow font-medium transition-colors inline-block"
            >
              🔐 Se connecter
            </a>
            <a
              href="/auth/register"
              className="w-full theme-gradient-secondary hover:opacity-90 theme-text-primary py-3 rounded-lg theme-shadow font-medium transition-colors inline-block"
            >
              🚀 Créer un compte
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Écran de sélection d'identité si pas d'identité sélectionnée
  if (showWelcome && !selectedIdentity) {
    return (
      <div className="min-h-screen theme-gradient-bg flex items-center justify-center p-4">
        <div className="theme-overlay-light backdrop-blur-lg rounded-2xl theme-shadow p-8 max-w-2xl w-full theme-shadow">
          <h1 className="text-3xl font-bold theme-text-primary text-center mb-6">
            ⛧ Demo Chat ⛧
          </h1>
          <p className="theme-text-secondary text-center mb-6">
            Choisissez votre identité pour commencer une session
          </p>
          <p className="theme-text-secondary text-center mb-6 text-sm">
            Vous avez {availableUsers.length} identité{availableUsers.length > 1 ? 's' : ''} disponible{availableUsers.length > 1 ? 's' : ''}
          </p>
          
          <div className="space-y-4">
            {availableUsers.map((identity: any) => (
              <button
                key={identity.id}
                onClick={async () => {
                  console.log('🔍 Sélection de l\'identité:', identity);
                  const result = await selectUser(identity.id);
                  if (result.success) {
                    console.log('✅ Identité sélectionnée avec succès');
                    setSelectedIdentity(identity);
                  } else {
                    console.error('❌ Erreur sélection identité:', result.message);
                  }
                }}
                className="w-full p-4 rounded-lg theme-shadow theme-overlay-light hover:theme-overlay-medium border border-white/20 theme-text-primary text-left transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">
                    {identity.persona === 'algareth' ? '🔮' : '👤'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{identity.name}</h3>
                    <p className="theme-text-secondary text-sm">
                      {identity.persona === 'algareth' ? 'Assistant mystique' : 'Assistant standard'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs theme-text-secondary">ID:</span>
                      <span className="text-xs theme-text-primary theme-overlay-medium px-2 py-1 rounded">
                        {identity.id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>
                  <div className="theme-text-secondary">
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-6 text-center space-y-3">
            <a
              href="/auth/select-user"
              className="theme-text-secondary hover:theme-text-secondary text-sm underline"
            >
              Gérer mes identités
            </a>
            <div className="theme-text-secondary text-sm">
              Vous avez {availableUsers.length} identité{availableUsers.length > 1 ? 's' : ''} disponible{availableUsers.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Écran d'accueil avec identité sélectionnée (désactivé - passe directement au chat)
  if (false && showWelcome && selectedIdentity) {
    return (
      <div className="min-h-screen theme-gradient-bg flex items-center justify-center p-4">
        <div className="theme-overlay-light backdrop-blur-lg rounded-2xl theme-shadow p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold theme-text-primary text-center mb-6">
            ⛧ Demo Chat ⛧
          </h1>
          <div className="text-center mb-6">
            <p className="theme-text-secondary mb-2">
              Identité sélectionnée :
            </p>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">
                {selectedIdentity.persona === 'algareth' ? '🔮' : '👤'}
              </span>
              <span className="theme-text-primary font-semibold">{selectedIdentity.name}</span>
            </div>
          </div>
          <p className="theme-text-secondary text-center mb-6">
            Entrez votre nom pour commencer une nouvelle session
          </p>
          <form onSubmit={handleUserNameSubmit} className="space-y-4">
            <input
              type="text"
              value={chatState.user}
              onChange={(e) => setChatState(prev => ({ ...prev, user: e.target.value }))}
              placeholder="Votre nom..."
              className="w-full p-3 rounded-lg theme-shadow theme-overlay-medium theme-text-primary placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              type="submit"
              className="w-full theme-gradient-primary hover:opacity-90 theme-text-primary font-semibold py-3 rounded-lg theme-shadow transition-colors"
            >
              Commencer la session
            </button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={() => setSelectedIdentity(null)}
              className="theme-text-secondary hover:theme-text-secondary text-sm underline"
            >
              Changer d'identité
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Interface principale
  return (
    <div className="min-h-screen theme-gradient-bg relative">
      {/* Image de fond floue */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/woman_in_black_background.png" 
          alt="Background" 
          className="w-full h-full object-cover opacity-5 blur-sm"
        />
      </div>
      
      {/* Header */}
      <div className="relative z-10 bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold theme-text-primary">⛧ Demo Chat ⛧</h1>
            {selectedIdentity && (
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 theme-text-secondary border border-purple-500/50">
                👤 {selectedIdentity.name} ({selectedIdentity.persona === 'algareth' ? '🔮' : '👤'})
              </div>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              chatState.isConnected 
                ? 'bg-green-500/20 text-green-300 border border-green-500/50' 
                : 'bg-red-500/20 text-red-300 border border-red-500/50'
            }`}>
              {chatState.isConnected ? '🔮 Orchestrateur connecté' : '⚠️ Pas de clé API'}
            </div>
            {archivistStatus.isActive && (
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 theme-text-secondary border border-blue-500/50">
                📚 Archiviste actif ({archivistStatus.resultsCount} résultats)
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            {/* Bouton de debug archiviste retiré pour la version démo */}
            {availableUsers.length > 1 && (
              <button
                onClick={() => {
                  setSelectedIdentity(null);
                  setShowWelcome(true);
                }}
                className="theme-gradient-secondary hover:opacity-90 theme-text-primary px-4 py-2 rounded-lg theme-shadow text-sm font-medium transition-colors"
              >
                🔄 Changer d'identité
              </button>
            )}
            {!chatState.isConnected && (
              <a 
                href="/settings" 
                className="theme-gradient-primary hover:opacity-90 theme-text-primary px-4 py-2 rounded-lg theme-shadow text-sm font-medium transition-colors"
              >
                ⚙️ Configurer API
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Panneau de debug archiviste retiré pour la version démo */}

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
            onExportConversation={handleExportConversation}
            onSessionRegenerateTitle={async (sessionId: string) => {
              try {
                console.log(`🔄 Régénération du titre pour la session ${sessionId}...`);
                
                // Sauvegarder la session actuelle avant de changer
                if (currentSessionId && currentSessionId !== sessionId && chatState.messages.length > 0) {
                  try {
                    await saveCurrentSessionWithMessages(
                      chatState.messages,
                      chatState.hierarchicalMemory.stats,
                      chatState.userMemory
                    );
                    console.log(`💾 Session ${currentSessionId} sauvegardée avant régénération`);
                  } catch (error) {
                    console.warn('⚠️ Erreur sauvegarde avant régénération:', error);
                  }
                }
                
                // Utiliser la même logique que switchToSession
                await switchToSession(sessionId);
                
                // Maintenant on a la bonne session chargée dans chatState.messages
                if (chatState.messages.length === 0) {
                  console.log('❌ Aucun message trouvé dans la session chargée');
                  return;
                }

                console.log(`📝 ${chatState.messages.length} messages trouvés dans la session chargée`);

                // Trouver le premier échange (message utilisateur + réponse assistant)
                const userMessage = chatState.messages.find(msg => msg.role === 'user');
                const assistantResponse = chatState.messages.find(msg => msg.role === 'algareth');

                if (!userMessage || !assistantResponse) {
                  console.log('❌ Pas d\'échange complet trouvé pour régénérer le titre');
                  return;
                }

                console.log(`💬 Premier échange trouvé:`);
                console.log(`   Utilisateur: "${userMessage.content.substring(0, 50)}..."`);
                console.log(`   Assistant: "${assistantResponse.content.substring(0, 50)}..."`);

                // Générer un nouveau titre en utilisant la langue de la session actuelle
                const titleResult = await ConversationTitleGenerator.generateTitle({
                  userMessage: userMessage.content,
                  assistantResponse: assistantResponse.content,
                  language: currentLanguage
                });

                if (titleResult.success && titleResult.title) {
                  console.log(`🎯 Renommage de la session ${sessionId} avec le titre: "${titleResult.title}"`);
                  renameSession(sessionId, titleResult.title);
                  console.log(`✅ Titre régénéré: "${titleResult.title}"`);
                } else {
                  console.log(`⚠️ Échec génération titre complet: ${titleResult.error}`);
                  
                  // Essayer avec le LLM simplifié
                  try {
                    const simpleTitle = await ConversationTitleGenerator.generateSimpleTitle(userMessage.content, currentLanguage);
                    console.log(`🎯 Renommage de la session ${sessionId} avec le titre simple: "${simpleTitle}"`);
                    renameSession(sessionId, simpleTitle);
                    console.log(`📝 Titre LLM simplifié régénéré: "${simpleTitle}"`);
                  } catch (error) {
                    console.log(`⚠️ Échec LLM simplifié: ${error}`);
                    
                    // Dernier recours : fallback
                    const fallbackTitle = ConversationTitleGenerator.generateFallbackTitle(userMessage.content, assistantResponse.content);
                    console.log(`🎯 Renommage de la session ${sessionId} avec le titre fallback: "${fallbackTitle}"`);
                    renameSession(sessionId, fallbackTitle);
                    console.log(`📝 Titre de fallback régénéré: "${fallbackTitle}"`);
                  }
                }
                
              } catch (error) {
                console.error('❌ Erreur régénération titre:', error);
              }
            }}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10">
            {chatState.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl p-4 rounded-2xl theme-shadow ${
                    message.role === 'user'
                      ? 'bg-purple-600 theme-text-primary'
                      : 'theme-overlay-light theme-text-primary backdrop-blur-lg'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.divineMurmurs && (
                    <div className="mt-3 space-y-3">
                      {message.divineMurmurs.map((murmur, i) => (
                        <div key={i} className="theme-overlay-dark rounded-lg theme-shadow p-3 border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            {murmur.type === 'memory' && (
                              <div className="flex items-center gap-1">
                                <span className="theme-text-secondary">📚</span>
                                <span className="theme-text-secondary font-medium">Archiviste Sémantique</span>
                              </div>
                            )}
                            {murmur.type === 'image' && (
                              <div className="flex items-center gap-1">
                                <span className="theme-text-secondary">🎨</span>
                                <span className="theme-text-secondary font-medium">Générateur d'Images</span>
                              </div>
                            )}
                            {murmur.type === 'both' && (
                              <div className="flex items-center gap-1">
                                <span className="text-green-400">📚🎨</span>
                                <span className="text-green-300 font-medium">Archiviste + Images</span>
                              </div>
                            )}
                            <span className="text-xs theme-text-muted ml-auto">
                              {new Date(murmur.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm theme-text-secondary leading-relaxed">
                            {murmur.content}
                          </div>
                          {murmur.data && (
                            <div className="mt-2 text-xs theme-text-muted">
                              {murmur.data.resultsCount && (
                                <span className="inline-block bg-blue-500/20 theme-text-secondary px-2 py-1 rounded mr-2">
                                  {murmur.data.resultsCount} résultats trouvés
                                </span>
                              )}
                              {murmur.data.embeddingProvider && (
                                <span className="inline-block bg-green-500/20 text-green-300 px-2 py-1 rounded mr-2">
                                  {murmur.data.embeddingProvider} ({murmur.data.dimensions}D)
                                </span>
                              )}
                              {murmur.data.searchTime && (
                                <span className="inline-block bg-purple-500/20 theme-text-secondary px-2 py-1 rounded mr-2">
                                  {murmur.data.searchTime}ms
                                </span>
                              )}
                              {murmur.data.error && (
                                <span className="inline-block bg-red-500/20 text-red-300 px-2 py-1 rounded mr-2">
                                  ⚠️ Erreur: {murmur.data.error}
                                </span>
                              )}
                              {murmur.data.fallback && (
                                <span className="inline-block bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                                  🔄 Mode fallback
                                </span>
                              )}
                            </div>
                          )}
                          {murmur.type === 'image' && murmur.data?.image && (
                            <div className="mt-2 p-2 theme-overlay-dark rounded-lg theme-shadow">
                              {murmur.data.image.url ? (
                                <img 
                                  src={murmur.data.image.url} 
                                  alt={murmur.data.enhancedPrompt || 'Image générée'}
                                  className="max-w-full h-auto rounded-lg theme-shadow"
                                  style={{ maxHeight: '300px' }}
                                />
                              ) : (
                                <div className="p-4 bg-gray-800 rounded-lg theme-shadow text-center">
                                  <div className="text-sm theme-text-muted">
                                    Image générée (format base64)
                                  </div>
                                  <div className="text-xs theme-text-muted mt-1">
                                    Taille: {murmur.data.image.size || 'Inconnue'}
                                  </div>
                                </div>
                              )}
                              <div className="mt-2 text-xs opacity-60">
                                Prompt amélioré: {murmur.data.enhancedPrompt}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {chatState.isTyping && (
              <div className="flex justify-start">
                <div className="max-w-2xl">
                  <OrchestrationProgress
                    isActive={orchestrationProgress.isActive}
                    currentPhase={orchestrationProgress.currentPhase}
                    progress={orchestrationProgress.progress}
                    details={orchestrationProgress.details}
                    currentMessage={orchestrationProgress.currentMessage}
                    isRotating={orchestrationProgress.isRotating}
                    phaseDuration={orchestrationProgress.phaseDuration}
                    estimatedRemainingTime={orchestrationProgress.estimatedRemainingTime}
                  />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-6 bg-black/20 backdrop-blur-lg border-t border-white/10">
            {/* Indicateur de statut archiviste */}
            {archivistStatus.isActive && (
              <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg theme-shadow">
                <div className="flex items-center gap-2 text-sm theme-text-secondary">
                  <span className="animate-pulse">📚</span>
                  <span>Archiviste sémantique actif - Recherche dans vos conversations passées</span>
                  {archivistStatus.resultsCount && (
                    <span className="ml-auto theme-text-secondary">
                      {archivistStatus.resultsCount} résultats trouvés
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <form onSubmit={handleUserSubmit} className="flex space-x-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={archivistStatus.isActive ? "L'archiviste analysera votre message..." : "Tapez votre message..."}
                className="flex-1 p-3 rounded-lg theme-shadow theme-overlay-medium theme-text-primary placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400"
                disabled={chatState.isTyping}
              />
              <button
                type="submit"
                disabled={chatState.isTyping || !inputMessage.trim()}
                className="theme-gradient-primary hover:opacity-90 disabled:bg-gray-600 theme-text-primary font-semibold px-6 py-3 rounded-lg theme-shadow transition-colors"
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
