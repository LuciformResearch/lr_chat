/**
 * Outil MCP pour le système multi-agents
 * Permet à Algareth d'utiliser les agents spécialisés
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { AgentManager } from '@/lib/agents/AgentManager';

// Instance globale du gestionnaire d'agents
let agentManager: AgentManager | null = null;

/**
 * Initialise le système multi-agents
 */
function initializeAgentManager(): AgentManager | null {
  if (agentManager) return agentManager;
  
  try {
    // Récupérer la clé API Gemini
    const geminiApiKey = localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.warn('⚠️ Clé API Gemini non trouvée pour le système multi-agents');
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
 * Outil MCP pour générer une réponse enrichie avec les agents
 */
export const generateEnhancedResponseTool: MCPTool = {
  name: "generate_enhanced_response",
  description: "Generate enhanced response using multi-agent system",
  inputSchema: {
    type: "object",
    properties: {
      basePrompt: {
        type: "string",
        description: "Base prompt for Algareth"
      },
      context: {
        type: "object",
        properties: {
          userId: { type: "string" },
          userName: { type: "string" },
          currentSession: { type: "string" },
          userMessage: { type: "string" },
          conversationHistory: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string" },
                content: { type: "string" }
              }
            }
          },
          sessionStartTime: { type: "string" }
        },
        required: ["userId", "userName", "currentSession", "userMessage", "conversationHistory", "sessionStartTime"]
      }
    },
    required: ["basePrompt", "context"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { basePrompt, context } = args;
      
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
      
      const enhancedPrompt = await manager.generateEnhancedResponse(basePrompt, context);
      
      return {
        success: true,
        data: {
          enhancedPrompt,
          originalLength: basePrompt.length,
          enhancedLength: enhancedPrompt.length,
          enhancementRatio: enhancedPrompt.length / basePrompt.length,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate enhanced response: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour archiver une conversation
 */
export const archiveConversationWithAgentsTool: MCPTool = {
  name: "archive_conversation_with_agents",
  description: "Archive conversation using multi-agent system",
  inputSchema: {
    type: "object",
    properties: {
      context: {
        type: "object",
        properties: {
          userId: { type: "string" },
          userName: { type: "string" },
          currentSession: { type: "string" },
          userMessage: { type: "string" },
          conversationHistory: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string" },
                content: { type: "string" }
              }
            }
          },
          sessionStartTime: { type: "string" }
        },
        required: ["userId", "userName", "currentSession", "userMessage", "conversationHistory", "sessionStartTime"]
      }
    },
    required: ["context"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { context } = args;
      
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
      
      await manager.archiveConversation(context);
      
      return {
        success: true,
        data: {
          message: "Conversation archivée avec succès",
          userId: context.userId,
          sessionId: context.currentSession,
          messageCount: context.conversationHistory.length,
          archivedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to archive conversation: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour tester la communication inter-agents
 */
export const testAgentCommunicationTool: MCPTool = {
  name: "test_agent_communication",
  description: "Test communication between agents",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
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
      
      const testResults = await manager.testAgentCommunication();
      
      return {
        success: true,
        data: {
          testResults,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to test agent communication: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour obtenir les statistiques du système multi-agents
 */
export const getMultiAgentSystemStatsTool: MCPTool = {
  name: "get_multi_agent_system_stats",
  description: "Get multi-agent system statistics",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const manager = initializeAgentManager();
      if (!manager) {
        return {
          success: false,
          error: "Système multi-agents non initialisé",
          timestamp: new Date().toISOString()
        };
      }
      
      const stats = manager.getSystemStats();
      
      return {
        success: true,
        data: {
          stats,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get multi-agent system stats: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour notifier les agents d'un événement
 */
export const notifyAgentsTool: MCPTool = {
  name: "notify_agents",
  description: "Notify agents of an event",
  inputSchema: {
    type: "object",
    properties: {
      event: {
        type: "string",
        description: "Event description"
      },
      context: {
        type: "object",
        properties: {
          userId: { type: "string" },
          userName: { type: "string" },
          currentSession: { type: "string" },
          userMessage: { type: "string" },
          conversationHistory: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string" },
                content: { type: "string" }
              }
            }
          },
          sessionStartTime: { type: "string" }
        },
        required: ["userId", "userName", "currentSession", "userMessage", "conversationHistory", "sessionStartTime"]
      }
    },
    required: ["event", "context"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { event, context } = args;
      
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
      
      await manager.notifyAgents(event, context);
      
      return {
        success: true,
        data: {
          message: "Agents notifiés avec succès",
          event,
          notifiedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to notify agents: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil generate_enhanced_response
 */
export async function testGenerateEnhancedResponseTool(): Promise<void> {
  console.log('🧪 Test generate_enhanced_response MCP Tool');
  
  const result = await generateEnhancedResponseTool.handler({
    basePrompt: 'Tu es Algareth, réponds à cette question.',
    context: {
      userId: 'test_user',
      userName: 'Test User',
      currentSession: 'session_123',
      userMessage: 'Comment ça va ?',
      conversationHistory: [
        { role: 'user', content: 'Salut !' },
        { role: 'assistant', content: 'Salut ! Comment puis-je t\'aider ?' }
      ],
      sessionStartTime: new Date(Date.now() - 60000).toISOString()
    }
  });
  
  console.log(`✅ Generate enhanced response: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📝 Enhancement ratio: ${result.data.enhancementRatio.toFixed(2)}x`);
    console.log(`   📊 Length: ${result.data.originalLength} → ${result.data.enhancedLength}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}

/**
 * Test de l'outil test_agent_communication
 */
export async function testTestAgentCommunicationTool(): Promise<void> {
  console.log('🧪 Test test_agent_communication MCP Tool');
  
  const result = await testAgentCommunicationTool.handler({});
  
  console.log(`✅ Test agent communication: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📊 Test results: ${JSON.stringify(result.data.testResults)}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}