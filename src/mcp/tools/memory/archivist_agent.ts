/**
 * Outil MCP pour l'Agent Archiviste
 * Permet à Algareth d'accéder secrètement à la mémoire épisodique
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { ArchivistAgent } from '@/lib/memory/ArchivistAgent';

// Instance globale de l'agent archiviste
let archivistAgent: ArchivistAgent | null = null;

/**
 * Initialise l'agent archiviste avec la clé API Gemini
 */
function initializeArchivistAgent(): ArchivistAgent | null {
  if (archivistAgent) return archivistAgent;
  
  try {
    // Récupérer la clé API Gemini depuis localStorage ou variables d'environnement
    const geminiApiKey = localStorage.getItem('gemini_api_key') || process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.warn('⚠️ Clé API Gemini non trouvée pour l\'Agent Archiviste');
      return null;
    }
    
    archivistAgent = new ArchivistAgent(geminiApiKey);
    return archivistAgent;
  } catch (error) {
    console.error('❌ Erreur initialisation Agent Archiviste:', error);
    return null;
  }
}

/**
 * Outil MCP pour obtenir un résumé secret de l'archiviste
 */
export const getSecretArchivistSummaryTool: MCPTool = {
  name: "get_secret_archivist_summary",
  description: "Get secret summary from Archivist Agent for Algareth's memory",
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User identifier"
      },
      query: {
        type: "string",
        description: "Current user query for contextual advice"
      }
    },
    required: ["userId", "query"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { userId, query } = args;
      
      const agent = initializeArchivistAgent();
      if (!agent) {
        return {
          success: false,
          error: "Agent Archiviste non initialisé (clé API Gemini manquante)",
          timestamp: new Date().toISOString()
        };
      }
      
      const secretSummary = await agent.getSecretSummary(userId, query);
      
      return {
        success: true,
        data: {
          secretSummary,
          hasMemory: secretSummary.length > 0,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get secret archivist summary: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour archiver une conversation
 */
export const archiveConversationTool: MCPTool = {
  name: "archive_conversation",
  description: "Archive a conversation for episodic memory",
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User identifier"
      },
      sessionId: {
        type: "string",
        description: "Session identifier"
      },
      sessionTitle: {
        type: "string",
        description: "Session title"
      },
      messages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            role: { type: "string" },
            content: { type: "string" },
            timestamp: { type: "string" }
          }
        },
        description: "Array of messages from the conversation"
      },
      startTime: {
        type: "string",
        description: "Session start time"
      },
      endTime: {
        type: "string",
        description: "Session end time"
      }
    },
    required: ["userId", "sessionId", "sessionTitle", "messages", "startTime", "endTime"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { userId, sessionId, sessionTitle, messages, startTime, endTime } = args;
      
      const agent = initializeArchivistAgent();
      if (!agent) {
        return {
          success: false,
          error: "Agent Archiviste non initialisé (clé API Gemini manquante)",
          timestamp: new Date().toISOString()
        };
      }
      
      await agent.archiveConversation(
        userId,
        sessionId,
        sessionTitle,
        messages,
        startTime,
        endTime
      );
      
      return {
        success: true,
        data: {
          message: "Conversation archivée avec succès",
          sessionId,
          messageCount: messages.length,
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
 * Outil MCP pour obtenir les statistiques de l'archiviste
 */
export const getArchivistStatsTool: MCPTool = {
  name: "get_archivist_stats",
  description: "Get Archivist Agent statistics",
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User identifier (optional, for user-specific stats)"
      }
    },
    required: []
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const agent = initializeArchivistAgent();
      if (!agent) {
        return {
          success: false,
          error: "Agent Archiviste non initialisé",
          timestamp: new Date().toISOString()
        };
      }
      
      const stats = agent.getArchivistStats();
      
      return {
        success: true,
        data: {
          stats,
          isActive: true,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get archivist stats: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour obtenir l'analyse détaillée d'un utilisateur
 */
export const getDetailedUserAnalysisTool: MCPTool = {
  name: "get_detailed_user_analysis",
  description: "Get detailed user analysis from Archivist Agent",
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User identifier"
      }
    },
    required: ["userId"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { userId } = args;
      
      const agent = initializeArchivistAgent();
      if (!agent) {
        return {
          success: false,
          error: "Agent Archiviste non initialisé",
          timestamp: new Date().toISOString()
        };
      }
      
      const data = agent.exportArchivistData();
      const userAnalysis = data.analyses.find(([id]) => id === userId);
      
      if (!userAnalysis) {
        return {
          success: false,
          error: `Aucune analyse trouvée pour l'utilisateur ${userId}`,
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: true,
        data: {
          analysis: userAnalysis[1],
          hasAnalysis: true,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get detailed user analysis: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil get_secret_archivist_summary
 */
export async function testGetSecretArchivistSummaryTool(): Promise<void> {
  console.log('🧪 Test get_secret_archivist_summary MCP Tool');
  
  const result = await getSecretArchivistSummaryTool.handler({
    userId: 'test_user',
    query: 'Comment ça va ?'
  });
  
  console.log(`✅ Get secret archivist summary: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📚 Summary length: ${result.data.secretSummary.length} chars`);
    console.log(`   🧠 Has memory: ${result.data.hasMemory}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}

/**
 * Test de l'outil archive_conversation
 */
export async function testArchiveConversationTool(): Promise<void> {
  console.log('🧪 Test archive_conversation MCP Tool');
  
  const result = await archiveConversationTool.handler({
    userId: 'test_user',
    sessionId: 'session_123',
    sessionTitle: 'Test Session',
    messages: [
      { role: 'user', content: 'Salut Algareth !', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'Salut ! Comment puis-je t\'aider ?', timestamp: new Date().toISOString() }
    ],
    startTime: new Date(Date.now() - 60000).toISOString(),
    endTime: new Date().toISOString()
  });
  
  console.log(`✅ Archive conversation: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📚 Session archived: ${result.data.sessionId}`);
    console.log(`   💬 Messages: ${result.data.messageCount}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}