/**
 * Interface MCP pour permettre à Algareth d'appeler l'archiviste directement
 * Permet à Algareth d'utiliser l'archiviste comme un outil dans ses réponses
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
    const geminiApiKey = localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.warn('⚠️ Clé API Gemini non trouvée pour l\'interface Algareth-Archiviste');
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
 * Outil MCP pour qu'Algareth appelle l'archiviste
 */
export const algarethCallArchivistTool: MCPTool = {
  name: "algareth_call_archivist",
  description: "Allow Algareth to call the Archivist Agent for memory analysis",
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User identifier"
      },
      userName: {
        type: "string",
        description: "User display name"
      },
      request: {
        type: "string",
        description: "Algareth's request to the Archivist (e.g., 'analyser_conversation', 'résumer_session', etc.)"
      },
      context: {
        type: "object",
        description: "Additional context for the request",
        properties: {
          currentMessage: { type: "string" },
          sessionId: { type: "string" },
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
    required: ["userId", "userName", "request"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { userId, userName, request, context } = args;
      
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
      
      // Obtenir l'agent Algareth
      const algarethAgent = manager.getAlgarethAgent();
      
      // Construire le contexte pour l'archiviste
      const archivistContext = {
        userId,
        userName,
        currentSession: context?.sessionId || 'default',
        userMessage: context?.currentMessage || '',
        conversationHistory: context?.conversationHistory || [],
        sessionStartTime: new Date(Date.now() - 300000).toISOString()
      };
      
      let archivistResponse: any;
      
      // Router la demande vers la bonne méthode de l'archiviste
      switch (request.toLowerCase()) {
        case 'analyser_conversation':
          archivistResponse = await algarethAgent.requestArchivistAnalysis(archivistContext);
          break;
          
        case 'résumer_session':
          archivistResponse = await algarethAgent.requestMemorySearch(archivistContext, 'résumé');
          break;
          
        case 'identifier_patterns':
          archivistResponse = await algarethAgent.requestMemorySearch(archivistContext, 'patterns');
          break;
          
        case 'évaluer_relation':
          archivistResponse = await algarethAgent.requestRelationshipEvaluation(archivistContext);
          break;
          
        case 'suggérer_améliorations':
          archivistResponse = await algarethAgent.requestImprovementSuggestions(archivistContext);
          break;
          
        case 'rechercher_mémoire':
          archivistResponse = await algarethAgent.requestMemorySearch(archivistContext, context?.currentMessage || '');
          break;
          
        case 'analyser_émotions':
          archivistResponse = await algarethAgent.requestEmotionalAnalysis(archivistContext);
          break;
          
        case 'tracker_objectifs':
          archivistResponse = await algarethAgent.requestMemorySearch(archivistContext, 'objectifs');
          break;
          
        default:
          // Demande générale
          archivistResponse = await algarethAgent.requestMemorySearch(archivistContext, request);
      }
      
      return {
        success: true,
        data: {
          archivistResponse: archivistResponse.content,
          requestType: request,
          processingTime: archivistResponse.processingTime,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to call Archivist: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour qu'Algareth obtienne un résumé intelligent
 */
export const algarethGetIntelligentSummaryTool: MCPTool = {
  name: "algareth_get_intelligent_summary",
  description: "Get intelligent summary from Archivist for Algareth's context",
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User identifier"
      },
      userName: {
        type: "string",
        description: "User display name"
      },
      query: {
        type: "string",
        description: "Current user query for context"
      },
      sessionId: {
        type: "string",
        description: "Current session ID"
      }
    },
    required: ["userId", "userName", "query"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { userId, userName, query, sessionId } = args;
      
      const manager = initializeAgentManager();
      if (!manager) {
        return {
          success: false,
          error: "Système multi-agents non initialisé",
          timestamp: new Date().toISOString()
        };
      }
      
      // Initialiser le système si nécessaire
      if (!manager.getSystemStats().isInitialized) {
        await manager.initialize();
      }
      
      // Obtenir l'agent Algareth
      const algarethAgent = manager.getAlgarethAgent();
      
      // Construire le contexte
      const context = {
        userId,
        userName,
        currentSession: sessionId || 'default',
        userMessage: query,
        conversationHistory: [], // On pourrait passer l'historique si nécessaire
        sessionStartTime: new Date(Date.now() - 300000).toISOString()
      };
      
      // Obtenir le contexte intelligent
      const intelligentContext = await algarethAgent.getIntelligentContext(context);
      
      return {
        success: true,
        data: {
          intelligentContext,
          contextLength: intelligentContext.length,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get intelligent summary: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil algareth_call_archivist
 */
export async function testAlgarethCallArchivistTool(): Promise<void> {
  console.log('🧪 Test algareth_call_archivist MCP Tool');
  
  const result = await algarethCallArchivistTool.handler({
    userId: 'test_user',
    userName: 'Test User',
    request: 'analyser_conversation',
    context: {
      currentMessage: 'Comment ça va ?',
      sessionId: 'session_123',
      conversationHistory: [
        { role: 'user', content: 'Salut !' },
        { role: 'assistant', content: 'Salut ! Comment puis-je t\'aider ?' }
      ]
    }
  });
  
  console.log(`✅ Algareth call Archivist: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📚 Archivist response: ${result.data.archivistResponse.substring(0, 100)}...`);
    console.log(`   ⏱️ Processing time: ${result.data.processingTime}ms`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}