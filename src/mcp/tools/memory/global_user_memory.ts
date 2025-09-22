/**
 * Outil MCP pour la mémoire globale utilisateur
 * Permet à Algareth de se souvenir entre les sessions
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { GlobalUserMemory } from '@/lib/memory/GlobalUserMemory';

// Instance globale de la mémoire utilisateur
const globalUserMemory = new GlobalUserMemory();

/**
 * Outil MCP pour obtenir le contexte global utilisateur
 */
export const getGlobalUserContextTool: MCPTool = {
  name: "get_global_user_context",
  description: "Get global user context and memory across all sessions",
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
      currentQuery: {
        type: "string",
        description: "Current user query for context relevance"
      }
    },
    required: ["userId", "userName"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { userId, userName, currentQuery = '' } = args;
      
      // Obtenir ou créer le profil utilisateur
      const profile = globalUserMemory.getOrCreateUserProfile(userId, userName);
      
      // Construire le contexte global
      const globalContext = globalUserMemory.buildGlobalContext(userId, currentQuery);
      
      // Obtenir les statistiques
      const stats = globalUserMemory.getGlobalStats(userId);
      
      return {
        success: true,
        data: {
          globalContext,
          profile,
          stats,
          hasGlobalMemory: globalContext.length > 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get global user context: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour mettre à jour le profil après une session
 */
export const updateGlobalUserProfileTool: MCPTool = {
  name: "update_global_user_profile",
  description: "Update global user profile after a session",
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
      sessionSummary: {
        type: "string",
        description: "Summary of the session"
      },
      messageCount: {
        type: "number",
        description: "Number of messages in the session"
      },
      keyTopics: {
        type: "array",
        items: { type: "string" },
        description: "Key topics discussed in the session"
      }
    },
    required: ["userId", "sessionId", "sessionTitle", "sessionSummary", "messageCount", "keyTopics"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { userId, sessionId, sessionTitle, sessionSummary, messageCount, keyTopics } = args;
      
      // Mettre à jour le profil
      globalUserMemory.updateUserProfileAfterSession(
        userId,
        sessionId,
        sessionTitle,
        sessionSummary,
        messageCount,
        keyTopics
      );
      
      // Obtenir les nouvelles statistiques
      const stats = globalUserMemory.getGlobalStats(userId);
      
      return {
        success: true,
        data: {
          message: "Profil utilisateur mis à jour",
          stats,
          updatedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update global user profile: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour ajouter un fait clé
 */
export const addGlobalKeyFactTool: MCPTool = {
  name: "add_global_key_fact",
  description: "Add a key fact to global user memory",
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User identifier"
      },
      fact: {
        type: "string",
        description: "Key fact to remember about the user"
      }
    },
    required: ["userId", "fact"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { userId, fact } = args;
      
      globalUserMemory.addKeyFact(userId, fact);
      
      return {
        success: true,
        data: {
          message: "Fait clé ajouté à la mémoire globale",
          fact,
          addedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add global key fact: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour ajouter un sujet en cours
 */
export const addGlobalOngoingTopicTool: MCPTool = {
  name: "add_global_ongoing_topic",
  description: "Add an ongoing topic to global user memory",
  inputSchema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "User identifier"
      },
      topic: {
        type: "string",
        description: "Ongoing topic to track"
      }
    },
    required: ["userId", "topic"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { userId, topic } = args;
      
      globalUserMemory.addOngoingTopic(userId, topic);
      
      return {
        success: true,
        data: {
          message: "Sujet en cours ajouté à la mémoire globale",
          topic,
          addedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add global ongoing topic: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour obtenir les statistiques globales
 */
export const getGlobalUserStatsTool: MCPTool = {
  name: "get_global_user_stats",
  description: "Get global user statistics and memory stats",
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
      
      const stats = globalUserMemory.getGlobalStats(userId);
      const profile = globalUserMemory.getUserProfile(userId);
      
      return {
        success: true,
        data: {
          stats,
          profile,
          hasProfile: !!profile
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get global user stats: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil get_global_user_context
 */
export async function testGetGlobalUserContextTool(): Promise<void> {
  console.log('🧪 Test get_global_user_context MCP Tool');
  
  const result = await getGlobalUserContextTool.handler({
    userId: 'test_user',
    userName: 'Test User',
    currentQuery: 'Comment ça va ?'
  });
  
  console.log(`✅ Get global user context: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📝 Context length: ${result.data.globalContext.length} chars`);
    console.log(`   👤 Profile: ${result.data.profile?.userName}`);
    console.log(`   📊 Stats: ${JSON.stringify(result.data.stats)}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}

/**
 * Test de l'outil update_global_user_profile
 */
export async function testUpdateGlobalUserProfileTool(): Promise<void> {
  console.log('🧪 Test update_global_user_profile MCP Tool');
  
  const result = await updateGlobalUserProfileTool.handler({
    userId: 'test_user',
    sessionId: 'session_123',
    sessionTitle: 'Test Session',
    sessionSummary: 'Nous avons discuté de la mémoire globale et des sessions.',
    messageCount: 10,
    keyTopics: ['mémoire', 'sessions', 'test']
  });
  
  console.log(`✅ Update global user profile: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📊 Stats: ${JSON.stringify(result.data.stats)}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}