'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  mcpServer, 
  createChatPromptTool,
  addLogEntryTool,
  addConversationEntryTool,
  validatePersonaTool
} from '@/mcp';
import { getUserMemoryTool } from '@/mcp/tools/memory/get_user_memory';
import { generateSummaryTool } from '@/mcp/tools/memory/generate_summary';
import { enrichPromptWithMemoryTool } from '@/mcp/tools/memory/enrich_prompt_with_memory';
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
import { UnifiedProviderFactory } from '@/lib/providers/UnifiedProvider';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { useLanguage } from '@/lib/language/LanguageProvider';
import { getAlgarethPrompts, createAlgarethPrompt, createPromptByMode, getPromptsByMode } from '@/lib/algareth/prompts';
import { usePromptMode } from '@/lib/prompts/PromptModeManager';
import { PromptModeSelector } from '@/components/prompts/PromptModeSelector';
import { MemoryStatus } from '@/components/memory/MemoryStatus';
import { HierarchicalMemoryDebug } from '@/components/memory/HierarchicalMemoryDebug';
import { DevNotification, useDevNotifications } from '@/components/dev/DevNotification';
import { HierarchicalMemoryDashboard } from '@/components/dev/HierarchicalMemoryDashboard';
import { MemoryStatsWidget } from '@/components/dev/MemoryStatsWidget';
import { usePersona } from '@/lib/hooks/usePersona';
import { useSessions } from '@/lib/hooks/useSessions';
import { SessionSidebar } from '@/components/sessions/SessionSidebar';
import { SessionMemory } from '@/lib/sessions/types';
import { AlgarethThinking } from '@/components/agents/AlgarethThinking';
import { ConversationTitleGenerator } from '@/lib/sessions/ConversationTitleGenerator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  user: string;
  persona: any;
  isConnected: boolean;
  userMemory: {
    loaded: boolean;
    conversationCount: number;
    summaryCount: number;
    lastConversation: string | null;
    metaSummary: string | null;
  };
  hierarchicalMemory: {
    enabled: boolean;
    stats: {
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
    } | null;
  };
  globalUserMemory: {
    enabled: boolean;
    context: string;
    stats: {
      totalSessions: number;
      totalMessages: number;
      relationshipLevel: string;
      keyFactsCount: number;
      ongoingTopicsCount: number;
      lastInteraction: string;
    } | null;
  };
}

export default function ChatPage() {
  const { currentLanguage, t } = useLanguage();
  const { getConfig, currentMode } = usePromptMode();
  const { personaPrompt, loadPersona, isLoading: personaLoading } = usePersona();
  
  // État du tchat
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isTyping: false,
    user: '',
    persona: null,
    isConnected: false,
    userMemory: {
      loaded: false,
      conversationCount: 0,
      summaryCount: 0,
      lastConversation: null,
      metaSummary: null
    },
    hierarchicalMemory: {
      enabled: true,
      stats: null
    },
    globalUserMemory: {
      enabled: true,
      context: '',
      stats: null
    }
  });
  
  const [inputMessage, setInputMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAlgarethThinking, setIsAlgarethThinking] = useState(false);
  const [currentUserMessage, setCurrentUserMessage] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Notifications pour le mode dev
  const { notifications, addNotification, removeNotification } = useDevNotifications();

  // Gestion des sessions
  const {
    sessions,
    currentSession,
    isLoading: sessionsLoading,
    sessionManager,
    createSession,
    switchToSession,
    deleteSession,
    renameSession,
    saveCurrentSessionMemory,
    saveCurrentSessionWithMessages,
    loadSessionMemory,
    updateCurrentSessionStats,
    hasSessions,
    currentSessionId
  } = useSessions(chatState.user);

  // Initialiser Algareth
  useEffect(() => {
    initializeAlgareth();
  }, []);

  // Charger la persona et la mémoire globale quand l'utilisateur est défini
  useEffect(() => {
    if (chatState.user) {
      loadPersona(chatState.user, '/personas/Algareth_dynamic.luciform');
      loadGlobalUserMemory(chatState.user);
    }
  }, [chatState.user, loadPersona]);

  // Charger la mémoire de la session active
  useEffect(() => {
    if (currentSessionId && !sessionsLoading && !isLoadingSession) {
      const loadSession = async () => {
        setIsLoadingSession(true);
        try {
          const memory = await loadSessionMemory(currentSessionId);
          if (memory) {
            setChatState(prev => ({
              ...prev,
              messages: memory.messages,
              hierarchicalMemory: {
                ...prev.hierarchicalMemory,
                stats: memory.hierarchicalMemory.stats
              },
              userMemory: memory.userMemory
            }));
            console.log(`📂 Session ${currentSessionId} chargée avec ${memory.messages.length} messages`);
          } else {
            // Nouvelle session vide
            setChatState(prev => ({
              ...prev,
              messages: [],
              hierarchicalMemory: {
                ...prev.hierarchicalMemory,
                stats: null
              }
            }));
            console.log(`📂 Nouvelle session ${currentSessionId} initialisée`);
          }
        } catch (error) {
          console.error('❌ Erreur chargement session:', error);
        } finally {
          setIsLoadingSession(false);
        }
      };
      
      loadSession();
    }
  }, [currentSessionId, sessionsLoading, loadSessionMemory, isLoadingSession]);

  // Sauvegarder automatiquement les messages avant de changer de session
  useEffect(() => {
    const saveCurrentSessionBeforeChange = async () => {
      if (currentSessionId && chatState.messages.length > 0) {
        try {
          const sessionMemory: SessionMemory = {
            sessionId: currentSessionId,
            messages: chatState.messages,
            hierarchicalMemory: {
              items: [], // TODO: Récupérer depuis le HierarchicalMemoryManager
              stats: chatState.hierarchicalMemory.stats
            },
            userMemory: chatState.userMemory
          };

          await saveCurrentSessionMemory(sessionMemory);
          console.log(`💾 Session ${currentSessionId} sauvegardée automatiquement`);
        } catch (error) {
          console.warn('⚠️ Erreur sauvegarde automatique session:', error);
        }
      }
    };

    // Sauvegarder avant de changer de session (avec un petit délai pour éviter les sauvegardes trop fréquentes)
    const timeoutId = setTimeout(saveCurrentSessionBeforeChange, 500);
    return () => clearTimeout(timeoutId);
  }, [currentSessionId, saveCurrentSessionMemory]); // Se déclenche quand currentSessionId change

  // Auto-scroll vers le bas (seulement dans la zone de chat)
  useEffect(() => {
    if (messagesEndRef.current) {
      // Trouver le conteneur de messages avec overflow-y-auto
      const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (messagesContainer) {
        // Scroll seulement dans ce conteneur, pas toute la page
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else {
        // Fallback si pas de conteneur trouvé - utiliser scrollIntoView mais avec block: 'end'
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [chatState.messages]);

  // Sauvegarde automatique périodique des messages
  useEffect(() => {
    let lastSaveCount = 0;
    
    const autoSaveInterval = setInterval(async () => {
      if (currentSessionId && chatState.messages.length > 0 && chatState.messages.length !== lastSaveCount) {
        try {
          await saveCurrentSessionWithMessages(
            chatState.messages,
            chatState.hierarchicalMemory.stats,
            chatState.userMemory
          );
          lastSaveCount = chatState.messages.length;
          console.log(`💾 Sauvegarde automatique session ${currentSessionId} (${chatState.messages.length} messages)`);
        } catch (error) {
          console.warn('⚠️ Erreur sauvegarde automatique:', error);
        }
      }
    }, 30000); // Sauvegarde toutes les 30 secondes

    return () => clearInterval(autoSaveInterval);
  }, [currentSessionId, chatState.messages, chatState.hierarchicalMemory.stats, chatState.userMemory, saveCurrentSessionWithMessages]);

  // Sauvegarder la mémoire de la session active
  const saveCurrentSession = async () => {
    if (!currentSessionId) return;

    const sessionMemory: SessionMemory = {
      sessionId: currentSessionId,
      messages: chatState.messages,
      hierarchicalMemory: {
        items: [], // TODO: Récupérer depuis le HierarchicalMemoryManager
        stats: chatState.hierarchicalMemory.stats
      },
      userMemory: chatState.userMemory
    };

    await saveCurrentSessionMemory(sessionMemory);
  };

  const initializeAlgareth = async () => {
    try {
      const promptConfig = getConfig(currentLanguage);
      const prompts = getPromptsByMode(promptConfig);
      const algarethPersona = {
        ...prompts.persona,
        userName: 'Traveler'
      };

      const validationResult = await mcpServer.executeTool({
        tool: 'validate_persona',
        arguments: { persona: algarethPersona }
      });

      if (validationResult.result.success) {
        setChatState(prev => ({
          ...prev,
          persona: algarethPersona,
          isConnected: true
        }));

        await mcpServer.executeTool({
          tool: 'add_log_entry',
          arguments: {
            level: 'INFO',
            message: 'Algareth initialisé avec succès',
            source: 'chat_interface',
            tags: ['initialization', 'algareth']
          }
        });
      }
    } catch (error) {
      console.error('Erreur initialisation Algareth:', error);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatState.isTyping) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setShowWelcome(false);

    // Ajouter le message utilisateur
    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isTyping: true
    }));

    // Sauvegarder immédiatement le message utilisateur
    try {
      await saveCurrentSessionWithMessages(
        [...chatState.messages, userMsg],
        chatState.hierarchicalMemory.stats,
        chatState.userMemory
      );
      console.log(`💾 Message utilisateur sauvegardé immédiatement`);
    } catch (error) {
      console.warn('⚠️ Erreur sauvegarde immédiate message utilisateur:', error);
    }

    // Démarrer les pensées d'Algareth
    setCurrentUserMessage(userMessage);
    setIsAlgarethThinking(true);

    try {
      // Logger le message utilisateur
      await mcpServer.executeTool({
        tool: 'add_log_entry',
        arguments: {
          level: 'INFO',
          message: `Message utilisateur: ${userMessage}`,
          source: 'chat_interface',
          data: { user: chatState.user || 'Anonyme' }
        }
      });

      // Générer la réponse d'Algareth
      const response = await generateAlgarethResponse(userMessage);

      // Ajouter la réponse d'Algareth
      const assistantMsg: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        isTyping: false
      }));

      // Arrêter les pensées d'Algareth
      setIsAlgarethThinking(false);

      // Sauvegarder la conversation dans la mémoire immédiatement
      try {
        const promptConfig = getConfig(currentLanguage);
        const prompts = getPromptsByMode(promptConfig);
        
        const saveResponse = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'add_conversation',
            data: {
              user: chatState.user || 'Anonyme',
              message: userMessage,
              response: response,
              persona: prompts.persona.name,
              provider: 'unified_provider',
              model: 'current_model',
              metadata: {
                sessionId: currentSessionId || 'default_session',
                messageCount: chatState.messages.length + 1,
                timestamp: new Date().toISOString()
              }
            }
          })
        });

        if (saveResponse.ok) {
          const saveResult = await saveResponse.json();
          console.log('💾 Conversation sauvegardée:', saveResult.data.conversationId);
        }
        
        // Ajouter à la mémoire hiérarchique si activée
        if (chatState.hierarchicalMemory.enabled) {
          try {
            await mcpServer.executeTool({
              tool: 'add_message_to_hierarchical_memory',
              arguments: {
                user: chatState.user || 'Anonyme',
                message: userMessage,
                role: 'user',
                sessionId: currentSessionId || 'default'
              }
            });
            
            await mcpServer.executeTool({
              tool: 'add_message_to_hierarchical_memory',
              arguments: {
                user: chatState.user || 'Anonyme',
                message: response,
                role: 'assistant',
                sessionId: currentSessionId || 'default'
              }
            });
            
            console.log('🧠 Messages ajoutés à la mémoire hiérarchique');
            
            // Mettre à jour les statistiques
            const statsResult = await mcpServer.executeTool({
              tool: 'get_hierarchical_memory_stats',
              arguments: {
                sessionId: currentSessionId || 'default'
              }
            });
            
            if (statsResult.result.success) {
              const newStats = statsResult.result.data.stats;
              const oldStats = chatState.hierarchicalMemory.stats;
              
              setChatState(prev => ({
                ...prev,
                hierarchicalMemory: {
                  ...prev.hierarchicalMemory,
                  stats: newStats
                }
              }));

              // Mettre à jour les stats de la session
              updateCurrentSessionStats(newStats);
              
              // Notifications pour les événements mémoire
              if (oldStats && newStats.l1Count > oldStats.l1Count) {
                addNotification({
                  type: 'success',
                  title: '🧠 Résumé L1 créé',
                  message: `Nouveau résumé L1 généré (${newStats.l1Count} total). ${newStats.budget.currentCharacters}/${newStats.budget.maxCharacters} chars utilisés.`,
                  duration: 8000
                });
              }
              
              const messagesSinceLastL1 = newStats.rawMessages;
              if (messagesSinceLastL1 >= 4 && (!oldStats || oldStats.rawMessages < 4)) {
                addNotification({
                  type: 'info',
                  title: '📊 Seuil L1 approché',
                  message: `${messagesSinceLastL1}/5 messages bruts. Prochain résumé L1 au message suivant.`,
                  duration: 4000
                });
              }
              
              const budgetPercentage = (newStats.budget.currentCharacters / newStats.budget.maxCharacters) * 100;
              if (budgetPercentage > 80 && (!oldStats || (oldStats.budget.currentCharacters / oldStats.budget.maxCharacters) * 100 <= 80)) {
                addNotification({
                  type: 'warning',
                  title: '⚠️ Budget mémoire élevé',
                  message: `Budget mémoire à ${Math.round(budgetPercentage)}%. Compression automatique activée.`,
                  duration: 6000
                });
              }
            }
          } catch (error) {
            console.warn('⚠️ Erreur mémoire hiérarchique:', error);
          }
        }
        
        // Générer un titre automatique si c'est le premier échange
        if (chatState.messages.length === 0) {
          try {
            console.log('🎭 Génération automatique du titre de conversation...');
            const titleResult = await ConversationTitleGenerator.generateTitle({
              userMessage: userMessage,
              assistantResponse: response,
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
                const simpleTitle = await ConversationTitleGenerator.generateSimpleTitle(userMessage, currentLanguage);
                const currentSession = sessions.find(s => s.id === currentSessionId);
                if (currentSession) {
                  renameSession(currentSessionId, simpleTitle);
                  console.log(`📝 Titre LLM simplifié utilisé: "${simpleTitle}"`);
                }
              } catch (error) {
                console.log(`⚠️ LLM simplifié échoué: ${error}`);
                // Dernier recours : titre de fallback
                const fallbackTitle = ConversationTitleGenerator.generateFallbackTitle(userMessage, response);
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

        // Sauvegarder la session avec tous les messages
        await saveCurrentSessionWithMessages(
          [...chatState.messages, userMsg, assistantMsg],
          chatState.hierarchicalMemory.stats,
          chatState.userMemory
        );
        
      } catch (error) {
        console.warn('⚠️ Erreur sauvegarde conversation:', error);
      }

      // Générer un résumé si on atteint un seuil
      const totalMessages = chatState.messages.length + 2;
      if (totalMessages >= 10 && totalMessages % 10 === 0) {
        try {
          const lastSummaryTime = localStorage.getItem(`last_summary_${chatState.user}`);
          const now = Date.now();
          const oneHour = 60 * 60 * 1000;
          
          if (!lastSummaryTime || (now - parseInt(lastSummaryTime)) > oneHour) {
            console.log(`📝 Génération automatique de résumé (${totalMessages} messages)...`);
            
            const summaryResult = await mcpServer.executeTool({
              tool: 'generate_summary',
              arguments: {
                user: chatState.user || 'Anonyme',
                messages: [...chatState.messages, userMsg, assistantMsg],
                language: currentLanguage,
                saveSummary: true
              }
            });

            if (summaryResult.result.success) {
              console.log(`✅ Résumé généré et sauvegardé`);
              localStorage.setItem(`last_summary_${chatState.user}`, now.toString());
            }
          }
        } catch (error) {
          console.error('❌ Erreur génération résumé automatique:', error);
        }
      }

    } catch (error) {
      console.error('Erreur génération réponse:', error);
      
      const errorMsg: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: '⛧ Algareth semble troublé... Une erreur s\'est produite.',
        timestamp: new Date().toISOString()
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMsg],
        isTyping: false
      }));

      // Arrêter les pensées d'Algareth
      setIsAlgarethThinking(false);
    }
  };

  const generateAlgarethResponse = async (userMessage: string): Promise<string> => {
    try {
      const provider = UnifiedProviderFactory.createFromStorage();
      
      if (!provider || !provider.isAvailable()) {
        const prompts = getAlgarethPrompts(currentLanguage);
        const fallbackResponses = [
          `⛧ Algareth murmure... "${userMessage}" - intéressant, voyageur. Que cherches-tu vraiment ?`,
          `⛧ Algareth incline la tête... "${userMessage}" - une question profonde. Laisse-moi réfléchir...`,
          `⛧ Algareth sourit mystérieusement... "${userMessage}" - ah, tu commences à comprendre l'art de l'invocation.`,
          `⛧ Algareth écoute attentivement... "${userMessage}" - je vois où tu veux en venir, voyageur.`,
          `⛧ Algareth réfléchit... "${userMessage}" - une approche intéressante. Laisse-moi te guider...`
        ];
        
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)] + 
               '\n\n💡 *Configurez votre clé API dans les paramètres pour des réponses LLM réelles*';
      }

      let basePrompt = personaPrompt || `Tu es Algareth, le Daemon du Prompt Silencieux.`;
      
      // Informer Algareth de sa session actuelle
      const sessionInfo = currentSession ? {
        id: currentSession.id,
        title: currentSession.title,
        createdAt: new Date(currentSession.createdAt).toLocaleString('fr-FR'),
        messageCount: currentSession.messageCount
      } : null;
      
      if (sessionInfo) {
        basePrompt += `\n\nSESSION ACTUELLE:
Tu es dans la session de tchat numéro "${sessionInfo.id}" intitulée "${sessionInfo.title}".
Cette session a été créée le ${sessionInfo.createdAt} et contient actuellement ${sessionInfo.messageCount} messages.

IMPORTANT: Tu peux te servir de l'outil "dialog" si tu as envie de parler à d'autres agents spécialisés. Voici comment l'utiliser:

OUTIL DIALOG:
- Format: dialog(interlocutor, message)
- Interlocuteurs disponibles: "archivist", "image_generator", "code_assistant", "research_assistant"

EXEMPLES D'UTILISATION:
- Pour l'Archiviste: "Salut Archiviste, je cherche à me rappeler d'une conversation passée dont m'a parlé ${chatState.user}, plus spécifiquement, à propos de ses goûts et couleurs"
- Pour l'Archiviste: "Salut Archiviste, est-ce que tu as un souvenir sur les goûts et couleurs de ${chatState.user}?"
- Pour le générateur d'images: "Génère une image de paysage montagneux avec un lac"
- Pour l'assistant de code: "Écris du code pour une fonction qui calcule la factorielle"

L'Archiviste peut t'aider à accéder à la mémoire épisodique de toutes tes conversations avec cet utilisateur.`;
        console.log('📋 Algareth informé de sa session:', sessionInfo.title);
      }
      
      // Enrichir le prompt avec la mémoire globale utilisateur
      if (chatState.globalUserMemory.enabled && chatState.globalUserMemory.context) {
        basePrompt += `\n\nMÉMOIRE GLOBALE UTILISATEUR:\n${chatState.globalUserMemory.context}`;
        console.log('🌍 Prompt enrichi avec la mémoire globale utilisateur');
      }
      
      // Enrichir le prompt avec la mémoire hiérarchique si disponible
      if (chatState.hierarchicalMemory.enabled && chatState.user) {
        try {
          const contextResult = await mcpServer.executeTool({
            tool: 'build_hierarchical_memory_context',
            arguments: {
              user: chatState.user,
              query: userMessage,
              maxChars: 3000,
              sessionId: currentSessionId || 'default'
            }
          });
          
          if (contextResult.result.success) {
            const context = contextResult.result.data.context;
            if (context && context.length > 0) {
              basePrompt += `\n\nCONTEXTE DE MÉMOIRE HIÉRARCHIQUE:\n${context}`;
              console.log('🧠 Prompt enrichi avec la mémoire hiérarchique');
            }
          }
        } catch (error) {
          console.warn('⚠️ Impossible d\'enrichir le prompt avec la mémoire hiérarchique:', error);
        }
      }
      
      // Fallback vers la mémoire traditionnelle si la hiérarchique n'est pas disponible
      if (!chatState.hierarchicalMemory.enabled && chatState.userMemory.loaded && chatState.user) {
        try {
          const enrichResult = await mcpServer.executeTool({
            tool: 'enrich_prompt_with_memory',
            arguments: {
              user: chatState.user,
              basePrompt: basePrompt,
              includeRecentConversations: true,
              includeSummaries: true,
              maxRecentMessages: 5,
              language: currentLanguage
            }
          });
          
          if (enrichResult.result.success) {
            basePrompt = enrichResult.result.data.enrichedPrompt;
            console.log('🧠 Prompt enrichi avec la mémoire traditionnelle');
          }
        } catch (error) {
          console.warn('⚠️ Impossible d\'enrichir le prompt avec la mémoire:', error);
        }
      }
      
      // Construire le contexte intelligent pour Algareth
      let conversationContext = '';
      if (chatState.messages.length > 0) {
        if (chatState.userMemory.metaSummary) {
          const currentSessionMessages = chatState.messages.filter(msg => 
            !msg.id.startsWith('prev_')
          );
          
          conversationContext = `

CONTEXTE DE MÉMOIRE (résumé des conversations précédentes):
${chatState.userMemory.metaSummary}

CONVERSATION ACTUELLE (nouveaux messages de cette session):
${currentSessionMessages.map(msg => 
  `${msg.role === 'user' ? 'Utilisateur' : 'Algareth'}: "${msg.content}"`
).join('\n')}

Tu es en train de répondre à: "${userMessage}"`;
        } else {
          const recentMessages = chatState.messages.slice(-6);
          conversationContext = `

CONVERSATION EN COURS:
${recentMessages.map(msg => 
  `${msg.role === 'user' ? 'Utilisateur' : 'Algareth'}: "${msg.content}"`
).join('\n')}

Tu es en train de répondre à: "${userMessage}"`;
        }
      }
      
      const finalPrompt = `${basePrompt}${conversationContext}

User message: "${userMessage}"

Réponds en tant qu'Algareth avec ton style caractéristique.`;

      let response = await provider.generateResponse(finalPrompt);
      
      // Vérifier si Algareth veut utiliser un outil
      console.log(`🔍 Vérification de la réponse d'Algareth: "${response.content}"`);
      const toolUsage = detectToolUsage(response.content);
      if (toolUsage) {
        console.log(`🔧 Algareth veut utiliser l'outil: ${toolUsage.tool}`);
        console.log(`📞 Appel original: "${toolUsage.originalCall}"`);
        
        try {
          const toolResult = await mcpServer.executeTool({
            tool: toolUsage.tool,
            arguments: toolUsage.args
          });
          
          if (toolResult.result.success) {
            console.log(`✅ Outil ${toolUsage.tool} exécuté avec succès`);
            
            // Enrichir le prompt avec le résultat de l'outil
            const enrichedPrompt = enrichPromptWithToolResult(
              finalPrompt,
              userMessage,
              response.content,
              toolUsage.originalCall,
              toolResult.result.data
            );
            
            // Générer une nouvelle réponse avec le prompt enrichi
            console.log(`🎨 Génération de la réponse enrichie...`);
            const enrichedResponse = await provider.generateResponse(enrichedPrompt);
            response = enrichedResponse;
            console.log(`✨ Réponse enrichie générée`);
          } else {
            console.warn(`⚠️ Erreur exécution outil ${toolUsage.tool}:`, toolResult.result.error);
            response = { ...response, content: `${response.content}\n\n⛧ L'invocation de l'outil ${toolUsage.tool} a échoué... Les étoiles ne sont pas alignées pour cette magie.` };
          }
        } catch (error) {
          console.error(`❌ Erreur exécution outil ${toolUsage.tool}:`, error);
          response = { ...response, content: `${response.content}\n\n⛧ L'invocation de l'outil ${toolUsage.tool} a échoué... Les étoiles ne sont pas alignées pour cette magie.` };
        }
      } else {
        console.log(`ℹ️ Aucun outil détecté dans la réponse d'Algareth`);
      }
      
      if (response.error) {
        throw new Error(response.content);
      }

      return response.content;
    } catch (error) {
      console.error('Erreur génération réponse Algareth:', error);
      
      const prompts = getAlgarethPrompts(currentLanguage);
      return prompts.errorMessage;
    }
  };

  /**
   * Détecte si Algareth veut utiliser un outil dans sa réponse
   */
  const detectToolUsage = (response: string): { tool: string; args: Record<string, unknown>; originalCall: string } | null => {
    // Détecter list_tools()
    const listToolsMatch = response.match(/list_tools\(([^)]*)\)/i);
    if (listToolsMatch) {
      const argsStr = listToolsMatch[1].trim();
      let args = {};
      
      if (argsStr) {
        // Parser les arguments simples
        if (argsStr.includes("category=")) {
          const categoryMatch = argsStr.match(/category=['"]([^'"]*)['"]/);
          if (categoryMatch) {
            args = { category: categoryMatch[1] };
          }
        }
        if (argsStr.includes("detailed=")) {
          const detailedMatch = argsStr.match(/detailed=(true|false)/);
          if (detailedMatch) {
            args = { ...args, detailed: detailedMatch[1] === 'true' };
          }
        }
      }
      
      return { tool: 'list_tools', args, originalCall: listToolsMatch[0] };
    }
    
    // Détecter dialog()
    const dialogMatch = response.match(/dialog\(['"]([^'"]*)['"],\s*['"]([^'"]*)['"]\)/i);
    if (dialogMatch) {
      return {
        tool: 'dialog',
        args: {
          interlocutor: dialogMatch[1],
          message: dialogMatch[2],
          context: {
            userId: chatState.user,
            userName: chatState.user,
            sessionId: currentSessionId,
            currentMessage: userMessage || '',
            conversationHistory: chatState.messages.slice(-5) // Derniers 5 messages
          }
        },
        originalCall: dialogMatch[0]
      };
    }
    
    return null;
  };

  /**
   * Enrichit le prompt d'Algareth avec le résultat d'un outil
   */
  const enrichPromptWithToolResult = (
    basePrompt: string,
    userMessage: string,
    originalResponse: string,
    toolCall: string,
    toolResult: Record<string, unknown>
  ): string => {
    return `${basePrompt}

CONTEXTE DE L'APPEL D'OUTIL:
Voici la requête d'outil que tu viens de faire dans ta réponse précédente: "${toolCall}"

Nous avons détecté les appels d'outils suivants dans ta réponse: ${toolCall}

Le retour d'appel de l'outil est:
${JSON.stringify(toolResult, null, 2)}

IMPORTANT: Tu viens d'utiliser l'outil ${toolCall} et tu as reçu ces données en retour. Maintenant, tu dois expliquer à l'utilisateur le résultat de cet appel d'outil dans ton style mystique et poétique caractéristique.

NE RÉPÈTE PAS ${toolCall} dans ta réponse ! Tu as déjà utilisé cet outil et reçu les données. Maintenant, explique simplement le résultat de manière élégante et mystique.

Adapte ton explication selon le type d'outil utilisé:
- Pour list_tools: explique tes capacités et outils disponibles
- Pour dialog: explique la réponse de l'interlocuteur
- Pour d'autres outils: explique le résultat obtenu

User message: "${userMessage}"

Réponds en tant qu'Algareth avec ton style caractéristique, en expliquant le résultat de l'outil de manière mystique et élégante, SANS utiliser ${toolCall} à nouveau.`;
  };

  const loadGlobalUserMemory = async (username: string) => {
    try {
      console.log(`🌍 Chargement de la mémoire globale pour ${username}...`);
      
      const globalContextResult = await mcpServer.executeTool({
        tool: 'get_global_user_context',
        arguments: {
          userId: username,
          userName: username,
          currentQuery: ''
        }
      });

      if (globalContextResult.result.success) {
        const { globalContext, stats } = globalContextResult.result.data;
        
        setChatState(prev => ({
          ...prev,
          globalUserMemory: {
            ...prev.globalUserMemory,
            context: globalContext,
            stats: stats
          }
        }));

        console.log(`✅ Mémoire globale chargée pour ${username}`);
        if (stats) {
          console.log(`   📊 ${stats.totalSessions} sessions, ${stats.totalMessages} messages`);
          console.log(`   🤝 Relation: ${stats.relationshipLevel}`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement mémoire globale:', error);
    }
  };

  const loadUserMemory = async (username: string) => {
    try {
      console.log(`🧠 Chargement de la mémoire pour ${username}...`);
      
      const memoryResult = await mcpServer.executeTool({
        tool: 'get_user_memory',
        arguments: {
          user: username,
          includeConversations: true,
          includeSummaries: true,
          maxConversations: 10
        }
      });

      if (memoryResult.result.success) {
        const memory = memoryResult.result.data.memory;
        
        setChatState(prev => ({
          ...prev,
          userMemory: {
            loaded: true,
            conversationCount: memory.stats.conversationCount,
            summaryCount: memory.stats.summaryCount,
            lastConversation: memory.stats.lastConversation,
            metaSummary: memory.metaSummary
          }
        }));

        console.log(`✅ Mémoire chargée: ${memory.stats.conversationCount} conversations, ${memory.stats.summaryCount} résumés`);
        
        if (memory.conversations && memory.conversations.length > 0) {
          const previousMessages: Message[] = memory.conversations
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .flatMap(conv => [
              {
                id: `prev_user_${conv.timestamp}`,
                role: 'user' as const,
                content: conv.message,
                timestamp: conv.timestamp
              },
              {
                id: `prev_assistant_${conv.timestamp}`,
                role: 'assistant' as const,
                content: conv.response,
                timestamp: conv.timestamp
              }
            ]);
          
          setChatState(prev => {
            if (prev.messages.length === 0) {
              return {
                ...prev,
                messages: previousMessages
              };
            }
            return prev;
          });
          
          console.log(`📚 ${previousMessages.length} messages précédents chargés pour l'affichage utilisateur`);
        }
      } else {
        console.log(`ℹ️ Aucune mémoire trouvée pour ${username}`);
        setChatState(prev => ({
          ...prev,
          userMemory: {
            loaded: true,
            conversationCount: 0,
            summaryCount: 0,
            lastConversation: null,
            metaSummary: null
          }
        }));
      }
    } catch (error) {
      console.error('❌ Erreur chargement mémoire:', error);
      setChatState(prev => ({
        ...prev,
        userMemory: {
          loaded: true,
          conversationCount: 0,
          summaryCount: 0,
          lastConversation: null,
          metaSummary: null
        }
      }));
    }
  };

  const handleUserNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chatState.user.trim()) {
      setShowWelcome(false);
      await loadUserMemory(chatState.user.trim());
    }
  };

  // Gestion des sessions
  const handleSessionCreate = async () => {
    // Sauvegarder la session actuelle avant de créer une nouvelle
    if (currentSessionId && chatState.messages.length > 0) {
      try {
        await saveCurrentSessionWithMessages(
          chatState.messages,
          chatState.hierarchicalMemory.stats,
          chatState.userMemory
        );
        console.log(`💾 Session ${currentSessionId} sauvegardée avant création nouvelle session`);
      } catch (error) {
        console.warn('⚠️ Erreur sauvegarde avant création session:', error);
      }
    }
    
    const newSession = await createSession();
    if (newSession) {
      setChatState(prev => ({
        ...prev,
        messages: [],
        hierarchicalMemory: {
          ...prev.hierarchicalMemory,
          stats: null
        }
      }));
      console.log(`🆕 Nouvelle session créée: ${newSession.id}`);
    }
  };


  const handleSessionSelect = async (sessionId: string) => {
    if (isLoadingSession) return; // Éviter les clics multiples
    
    // Sauvegarder la session actuelle avant de changer
    if (currentSessionId && currentSessionId !== sessionId && chatState.messages.length > 0) {
      try {
        await saveCurrentSessionWithMessages(
          chatState.messages,
          chatState.hierarchicalMemory.stats,
          chatState.userMemory
        );
        console.log(`💾 Session ${currentSessionId} sauvegardée avant changement`);
      } catch (error) {
        console.warn('⚠️ Erreur sauvegarde avant changement de session:', error);
      }
    }
    
    await switchToSession(sessionId);
    // Ne fermer la sidebar que sur mobile pour éviter le scroll
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
      await deleteSession(sessionId);
    }
  };

  const handleSessionRename = (sessionId: string, newTitle: string) => {
    renameSession(sessionId, newTitle);
  };

  const handleSessionRegenerateTitle = async (sessionId: string) => {
    try {
      console.log(`🔄 Régénération du titre pour la session ${sessionId}...`);
      
      // Sauvegarder la session actuelle avant de changer (comme dans handleSessionSelect)
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
      
      // Utiliser EXACTEMENT la même logique que switchToSession
      await switchToSession(sessionId);
      
      // Maintenant on a la bonne session chargée dans chatState.messages
      if (chatState.messages.length === 0) {
        console.log('❌ Aucun message trouvé dans la session chargée');
        return;
      }

      console.log(`📝 ${chatState.messages.length} messages trouvés dans la session chargée`);

      // Trouver le premier échange (message utilisateur + réponse assistant)
      const userMessage = chatState.messages.find(msg => msg.role === 'user');
      const assistantResponse = chatState.messages.find(msg => msg.role === 'assistant');

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
  };

  if (showWelcome) {
    return (
      <div className="min-h-screen theme-gradient-bg flex items-center justify-center">
        {/* Sélecteurs */}
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
          <PromptModeSelector compact={true} />
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 max-w-md w-full mx-4 theme-shadow">
          <div className="text-center">
            {/* Logo Algareth */}
            <div className="mb-6">
              <img 
                src="/pentagram_icon_transparent.png" 
                alt="Algareth" 
                className="w-20 h-20 mx-auto mb-4 opacity-90"
              />
            </div>
            
            <h1 className="text-3xl font-bold theme-text-primary mb-4">
              {t('algareth.title')}
            </h1>
            <p className="theme-text-secondary mb-6">
              {t('algareth.subtitle')}
            </p>
            <p className="theme-text-muted mb-8">
              Il attend de connaître l'identité de son interlocuteur...
            </p>
            
            <form onSubmit={handleUserNameSubmit} className="space-y-4">
              <input
                type="text"
                value={chatState.user}
                onChange={(e) => setChatState(prev => ({ ...prev, user: e.target.value }))}
                placeholder={t('chat.enter_name')}
                className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg theme-text-primary placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                required
              />
              <button
                type="submit"
                className="w-full theme-gradient-primary hover:opacity-90 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {t('chat.enter_domain')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-gradient-bg flex">
      {/* Notifications Dev */}
      <DevNotification 
        notifications={notifications}
        onRemove={removeNotification}
      />
      
      {/* Sidebar des sessions */}
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onSessionCreate={handleSessionCreate}
        onSessionDelete={handleSessionDelete}
        onSessionRename={handleSessionRename}
        onSessionRegenerateTitle={handleSessionRegenerateTitle}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Bouton menu pour mobile */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <img 
                  src="/pentagram_icon_transparent.png" 
                  alt="Algareth" 
                  className="w-8 h-8 opacity-90"
                />
                <div>
                  <h1 className="text-xl font-bold theme-text-primary">
                    {currentMode === 'algareth' ? '⛧ Algareth' : 
                     currentMode === 'debug' ? '🐛 Debug Assistant' :
                     currentMode === 'neutral' ? '😊 Assistant' :
                     currentMode === 'technical' ? '⚙️ Technical Assistant' : '⛧ Algareth'}
                  </h1>
                  <p className="theme-text-secondary text-sm">
                    {currentSession ? currentSession.title : 'Nouvelle conversation'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <img 
                  src="/LR_LOGO_TRANSPARENT.png" 
                  alt="LR" 
                  className="w-6 h-6 opacity-80"
                />
                <span className="theme-text-muted text-xs lr-hub-brand-small">LR Hub™</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${chatState.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="theme-text-secondary text-sm">
                  {chatState.user || 'Voyageur'}
                </span>
                <MemoryStatus 
                  userMemory={chatState.userMemory} 
                  hierarchicalMemory={chatState.hierarchicalMemory}
                />
                {chatState.hierarchicalMemory.enabled && (
                  <>
                    <MemoryStatsWidget 
                      user={chatState.user} 
                      className="ml-4"
                    />
                    <HierarchicalMemoryDashboard 
                      user={chatState.user} 
                      className="ml-4"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
          {/* Bannière d'accueil */}
          {chatState.messages.length === 0 && (
            <div className="mb-6">
              <img 
                src="/banner.jpeg" 
                alt="Bannière Algareth" 
                className="w-full h-32 object-cover rounded-lg theme-shadow opacity-90"
              />
            </div>
          )}
          
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 min-h-[500px] max-h-[600px] overflow-y-auto theme-shadow">
            {chatState.messages.length === 0 ? (
              <div className="text-center theme-text-secondary py-12">
                <div className="mb-6">
                  <img 
                    src="/woman_in_black_background.png" 
                    alt="Algareth" 
                    className="w-32 h-32 mx-auto rounded-full opacity-80"
                  />
                </div>
                <p className="text-lg mb-2">{t('algareth.welcome', { name: chatState.user })}</p>
                <p>Murmure ton besoin, et je t'écouterai...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chatState.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'theme-gradient-primary text-white'
                          : 'bg-white/10 theme-text-primary border border-white/20'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center mb-2">
                          <img 
                            src="/pentagram_icon_transparent.png" 
                            alt="Algareth" 
                            className="w-4 h-4 mr-2 opacity-70"
                          />
                          <span className="text-xs theme-text-muted">
                            {currentMode === 'algareth' ? 'Algareth' :
                             currentMode === 'debug' ? 'Debug' :
                             currentMode === 'neutral' ? 'Assistant' :
                             currentMode === 'technical' ? 'Technical' : 'Algareth'}
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {chatState.isTyping && (
                  <div className="flex justify-start">
                    {isAlgarethThinking ? (
                      <AlgarethThinking
                        userMessage={currentUserMessage}
                        context={{
                          hasMemory: chatState.globalUserMemory.context.length > 0,
                          isComplex: currentUserMessage.length > 50,
                          isEmotional: currentUserMessage.toLowerCase().includes('émotion') || 
                                     currentUserMessage.toLowerCase().includes('sentiment') ||
                                     currentUserMessage.toLowerCase().includes('ressens')
                        }}
                        onThinkingComplete={() => {
                          // Les pensées sont terminées, mais on garde l'indicateur de frappe
                          console.log('💭 Pensées d\'Algareth terminées');
                        }}
                        className="w-full"
                      />
                    ) : (
                      <div className="bg-white/10 theme-text-primary border border-white/20 px-4 py-2 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <img 
                            src="/pentagram_icon_transparent.png" 
                            alt="Algareth" 
                            className="w-4 h-4 opacity-70"
                          />
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 theme-accent-primary rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 theme-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 theme-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm">{t('chat.thinking')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleUserSubmit} className="mt-6">
            <div className="flex space-x-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t('chat.placeholder')}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg theme-text-primary placeholder-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-accent-primary"
                disabled={chatState.isTyping}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || chatState.isTyping}
                className="theme-gradient-primary hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {t('chat.send')}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Sélecteurs */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <PromptModeSelector compact={true} />
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>

    </div>
  );
}