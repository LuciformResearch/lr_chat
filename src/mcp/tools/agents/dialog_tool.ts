/**
 * Outil Dialog - Interface générique pour qu'Algareth parle à d'autres agents
 * Permet à Algareth d'avoir des conversations naturelles avec différents interlocuteurs
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { AgentManager } from '@/lib/agents/AgentManager';

// Instance globale du gestionnaire d'agents
let agentManager: AgentManager | null = null;

/**
 * Initialise le gestionnaire d'agents
 */
function initializeAgentManager(): AgentManager | null {
  if (agentManager) return agentManager;
  
  try {
    // Gérer localStorage selon l'environnement (client vs serveur)
    let geminiApiKey: string | null = null;
    
    if (typeof window !== 'undefined' && window.localStorage) {
      // Côté client - utiliser localStorage
      geminiApiKey = localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY;
    } else {
      // Côté serveur - utiliser seulement process.env
      geminiApiKey = process.env.GEMINI_API_KEY;
    }
    
    if (!geminiApiKey) {
      console.warn('⚠️ Clé API Gemini non trouvée pour l\'outil Dialog');
      return null;
    }
    
    const config = {
      geminiApiKey,
      enableArchivist: true,
      enableLogging: true,
      maxConcurrentRequests: 5
    };
    
    agentManager = new AgentManager(config);
    return agentManager;
  } catch (error) {
    console.error('❌ Erreur initialisation AgentManager:', error);
    return null;
  }
}

/**
 * Outil Dialog - Permet à Algareth de parler à d'autres agents
 */
export const dialogTool: MCPTool = {
  name: "dialog",
  description: "Allow Algareth to have conversations with other agents (archivist, image_generator, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      interlocutor: {
        type: "string",
        description: "The agent to talk to (archivist, image_generator, etc.)",
        enum: ["archivist", "image_generator", "code_assistant", "research_assistant"]
      },
      message: {
        type: "string",
        description: "The message to send to the interlocutor"
      },
      context: {
        type: "object",
        description: "Additional context for the conversation",
        properties: {
          userId: { type: "string" },
          userName: { type: "string" },
          sessionId: { type: "string" },
          currentMessage: { type: "string" },
          conversationHistory: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string" },
                content: { type: "string" }
              }
            }
          }
        }
      }
    },
    required: ["interlocutor", "message"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { interlocutor, message, context } = args;
      
      console.log(`💬 Algareth dialogue avec ${interlocutor}: "${message}"`);
      
      const manager = initializeAgentManager();
      if (!manager) {
        return {
          success: false,
          error: "Système multi-agents non initialisé (clé API Gemini manquante)",
          timestamp: new Date().toISOString()
        };
      }
      
      // Initialiser le système si nécessaire
      if (!manager.getSystemStats().isInitialized) {
        await manager.initialize();
      }
      
      // Router vers le bon interlocuteur
      switch (interlocutor.toLowerCase()) {
        case 'archivist':
          return await handleArchivistDialog(message, context);
          
        case 'image_generator':
          return await handleImageGeneratorDialog(message, context);
          
        case 'code_assistant':
          return await handleCodeAssistantDialog(message, context);
          
        case 'research_assistant':
          return await handleResearchAssistantDialog(message, context);
          
        default:
          return {
            success: false,
            error: `Interlocuteur "${interlocutor}" non reconnu. Disponibles: archivist, image_generator, code_assistant, research_assistant`,
            timestamp: new Date().toISOString()
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Erreur dialogue avec ${args.interlocutor}: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Gère le dialogue avec l'Archiviste
 */
async function handleArchivistDialog(message: string, context: any): Promise<MCPToolResult> {
  try {
    console.log(`📚 Dialog Archiviste: "${message}"`);
    console.log(`📚 Contexte:`, context);
    
    // Utiliser directement PersonalityArchivistAgent (le bon archiviste)
    const { PersonalityArchivistAgent } = await import('@/lib/agents/PersonalityArchivistAgent');
    
    // Charger la clé API
    let geminiApiKey: string | null = null;
    
    if (typeof window !== 'undefined' && window.localStorage) {
      // Côté client - utiliser localStorage
      geminiApiKey = localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY;
    } else {
      // Côté serveur - utiliser seulement process.env
      geminiApiKey = process.env.GEMINI_API_KEY;
    }
    
    if (!geminiApiKey) {
      return {
        success: false,
        error: "Clé API Gemini non trouvée pour l'Archiviste",
        timestamp: new Date().toISOString()
      };
    }
    
    // Créer l'archiviste avec le bon système
    const archivist = new PersonalityArchivistAgent(geminiApiKey);
    
    // Construire le contexte pour l'archiviste (enrichi pour Chat V2)
    const archivistContext = {
      userId: context?.userId || 'unknown',
      userName: context?.userName || 'Utilisateur',
      currentSession: context?.sessionId || 'default',
      // Ajouter plus de contexte pour améliorer les recherches
      userMessage: context?.currentMessage || '',
      conversationHistory: context?.conversationHistory || [],
      sessionStartTime: new Date(Date.now() - 300000).toISOString(),
      // Contexte spécifique pour Chat V2
      chatV2Context: true,
      enhancedSearch: true
    };
    
    console.log(`📚 Archiviste traite: "${message}" avec contexte:`, archivistContext);
    
    // Traiter la requête avec l'archiviste
    const archivistResponse = await archivist.processRequest(message, archivistContext);
    
    console.log(`📚 Archiviste réponse:`, archivistResponse);
    
    return {
      success: true,
      data: {
        interlocutor: 'archivist',
        response: archivistResponse.message,
        processingTime: archivistResponse.timestamp,
        toolsUsed: archivistResponse.toolsUsed,
        feedbackLoops: archivistResponse.feedbackLoops,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Erreur dialogue Archiviste:', error);
    return {
      success: false,
      error: `Erreur dialogue Archiviste: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Gère le dialogue avec le générateur d'images (PromptEnhancerAgent)
 */
async function handleImageGeneratorDialog(message: string, context: any): Promise<MCPToolResult> {
  try {
    console.log(`🎨 Dialog Image Generator: "${message}"`);
    console.log(`🎨 Contexte:`, context);
    
    // Utiliser directement PromptEnhancerAgent (le vrai générateur d'images)
    const { PromptEnhancerAgent } = await import('@/lib/agents/PromptEnhancerAgent');
    const { GeminiImageProvider } = await import('@/lib/providers/GeminiImageProvider');
    
    // Charger la clé API
    let geminiApiKey: string | null = null;
    
    if (typeof window !== 'undefined' && window.localStorage) {
      // Côté client - utiliser localStorage
      geminiApiKey = localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY;
    } else {
      // Côté serveur - utiliser seulement process.env
      geminiApiKey = process.env.GEMINI_API_KEY;
    }
    
    if (!geminiApiKey) {
      return {
        success: false,
        error: "Clé API Gemini non trouvée pour le générateur d'images",
        timestamp: new Date().toISOString()
      };
    }
    
    // Créer le prompt enhancer avec le vrai système
    const promptEnhancer = new PromptEnhancerAgent(geminiApiKey);
    const imageProvider = new GeminiImageProvider(geminiApiKey);
    
    // Construire le contexte pour le prompt enhancer
    const enhancerContext = {
      userId: context?.userId || 'unknown',
      userName: context?.userName || 'Utilisateur',
      currentSession: context?.sessionId || 'default',
      // Contexte spécifique pour Chat V2
      chatV2Context: true,
      enhancedGeneration: true
    };
    
    console.log(`🎨 Prompt Enhancer traite: "${message}" avec contexte:`, enhancerContext);
    
    // Traiter la requête avec le prompt enhancer
    const enhancerResponse = await promptEnhancer.processRequest(message, enhancerContext);
    
    console.log(`🎨 Prompt Enhancer réponse:`, enhancerResponse);
    
    // Si le prompt enhancer a généré une image, l'inclure dans la réponse
    let imageData = null;
    if (enhancerResponse.data && enhancerResponse.data.image) {
      imageData = enhancerResponse.data.image;
    }
    
    return {
      success: true,
      data: {
        interlocutor: 'image_generator',
        response: enhancerResponse.message,
        imagePrompt: enhancerResponse.data?.enhancedPrompt || message,
        imageData: imageData,
        processingTime: enhancerResponse.timestamp,
        toolsUsed: enhancerResponse.toolsUsed,
        feedbackLoops: enhancerResponse.feedbackLoops,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Erreur dialogue Image Generator:', error);
    return {
      success: false,
      error: `Erreur générateur d'images: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Gère le dialogue avec l'assistant de code
 */
async function handleCodeAssistantDialog(message: string, context: any): Promise<MCPToolResult> {
  try {
    // Simulation d'un assistant de code
    const codeRequest = extractCodeRequest(message);
    
    return {
      success: true,
      data: {
        interlocutor: 'code_assistant',
        response: `💻 Assistant de code: "${codeRequest}"\n\n[Simulation] Code généré et optimisé. Suggestions d'amélioration disponibles.`,
        codeRequest: codeRequest,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur assistant de code: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Gère le dialogue avec l'assistant de recherche
 */
async function handleResearchAssistantDialog(message: string, context: any): Promise<MCPToolResult> {
  try {
    // Simulation d'un assistant de recherche
    const researchQuery = extractResearchQuery(message);
    
    return {
      success: true,
      data: {
        interlocutor: 'research_assistant',
        response: `🔍 Recherche effectuée: "${researchQuery}"\n\n[Simulation] Sources trouvées et synthétisées. Résultats disponibles.`,
        researchQuery: researchQuery,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: `Erreur assistant de recherche: ${error}`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Extrait la requête de recherche du message
 */
function extractSearchQuery(message: string): string {
  // Extraire les mots-clés après "souvenir", "mémoire", "rappeler"
  const patterns = [
    /souvenir (?:de|sur|à propos de) (.+)/i,
    /mémoire (?:de|sur|à propos de) (.+)/i,
    /rappeler (?:de|sur|à propos de) (.+)/i,
    /cherche (?:à|de) (.+)/i,
    /trouve (?:des informations sur|à propos de) (.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Si pas de pattern trouvé, retourner le message entier
  return message;
}

/**
 * Extrait le prompt d'image du message
 */
function extractImagePrompt(message: string): string {
  // Extraire le prompt après "génère", "crée", "dessine"
  const patterns = [
    /génère (?:une image de|un dessin de) (.+)/i,
    /crée (?:une image de|un dessin de) (.+)/i,
    /dessine (?:une image de|un dessin de) (.+)/i,
    /image (?:de|du|des) (.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return message;
}

/**
 * Extrait la requête de code du message
 */
function extractCodeRequest(message: string): string {
  // Extraire la demande de code
  const patterns = [
    /écris (?:du code pour|une fonction pour) (.+)/i,
    /génère (?:du code pour|une fonction pour) (.+)/i,
    /crée (?:du code pour|une fonction pour) (.+)/i,
    /code (?:pour|qui fait) (.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return message;
}

/**
 * Extrait la requête de recherche du message
 */
function extractResearchQuery(message: string): string {
  // Extraire la requête de recherche
  const patterns = [
    /recherche (?:des informations sur|à propos de) (.+)/i,
    /trouve (?:des informations sur|à propos de) (.+)/i,
    /cherche (?:des informations sur|à propos de) (.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return message;
}

/**
 * Test de l'outil dialog
 */
export async function testDialogTool(): Promise<void> {
  console.log('🧪 Test dialog MCP Tool');
  
  const testCases = [
    {
      interlocutor: 'archivist',
      message: 'Salut Archiviste, je cherche à me rappeler d\'une conversation passée dont m\'a parlé Lucie, plus spécifiquement, à propos de ses goûts et couleurs',
      context: {
        userId: 'test_user',
        userName: 'Lucie',
        sessionId: 'session_123'
      }
    },
    {
      interlocutor: 'image_generator',
      message: 'Génère une image de paysage montagneux avec un lac',
      context: {}
    },
    {
      interlocutor: 'code_assistant',
      message: 'Écris du code pour une fonction qui calcule la factorielle',
      context: {}
    }
  ];
  
  for (const testCase of testCases) {
    const result = await dialogTool.handler(testCase);
    console.log(`✅ Dialog ${testCase.interlocutor}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (result.success) {
      console.log(`   💬 Response: ${result.data.response.substring(0, 100)}...`);
    } else {
      console.error(`   ❌ Error: ${result.error}`);
    }
  }
}