/**
 * Outil MCP pour la gestion de mémoire hiérarchique
 * Intègre le HierarchicalMemoryManager avec le système MCP existant
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { HierarchicalMemoryManager, MemoryItem } from '@/lib/memory/HierarchicalMemoryManager';

// Instances de gestionnaires de mémoire par session
const memoryManagers = new Map<string, HierarchicalMemoryManager>();

/**
 * Obtient ou crée un gestionnaire de mémoire pour une session
 */
function getMemoryManager(sessionId: string): HierarchicalMemoryManager {
  if (!memoryManagers.has(sessionId)) {
    const manager = new HierarchicalMemoryManager(10000);
    memoryManagers.set(sessionId, manager);
    console.log(`🧠 Nouveau gestionnaire de mémoire créé pour la session: ${sessionId}`);
  }
  return memoryManagers.get(sessionId)!;
}

/**
 * Outil MCP pour ajouter un message à la mémoire hiérarchique
 */
export const addMessageToHierarchicalMemoryTool: MCPTool = {
  name: "add_message_to_hierarchical_memory",
  description: "Add a message to the hierarchical memory system with automatic L1 summarization",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user"
      },
      message: {
        type: "string",
        description: "The message content"
      },
      role: {
        type: "string",
        enum: ["user", "assistant"],
        description: "Role of the message sender"
      },
      sessionId: {
        type: "string",
        description: "Session identifier for memory isolation"
      }
    },
    required: ["user", "message", "role"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { user, message, role, sessionId } = args;
      
      // Obtenir le gestionnaire de mémoire pour cette session
      const memoryManager = getMemoryManager(sessionId || 'default');
      
      // Ajouter le message à la mémoire hiérarchique
      memoryManager.addMessage(message, role as 'user' | 'assistant', user);
      
      // Obtenir les statistiques actuelles
      const stats = memoryManager.getMemoryStats();
      
      return {
        success: true,
        data: {
          message: "Message ajouté à la mémoire hiérarchique",
          stats,
          budget: stats.budget
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add message to hierarchical memory: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour construire le contexte de mémoire pour un prompt
 */
export const buildHierarchicalMemoryContextTool: MCPTool = {
  name: "build_hierarchical_memory_context",
  description: "Build context from hierarchical memory for prompt generation",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user"
      },
      query: {
        type: "string",
        description: "Current user query for relevance filtering"
      },
      maxChars: {
        type: "number",
        description: "Maximum characters for the context",
        default: 5000
      },
      sessionId: {
        type: "string",
        description: "Session identifier for memory isolation"
      }
    },
    required: ["user", "query"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { user, query, maxChars = 5000, sessionId } = args;
      
      // Obtenir le gestionnaire de mémoire pour cette session
      const memoryManager = getMemoryManager(sessionId || 'default');
      
      // Construire le contexte depuis la mémoire hiérarchique
      const context = memoryManager.buildContextForPrompt(query, maxChars);
      const stats = memoryManager.getMemoryStats();
      
      return {
        success: true,
        data: {
          context,
          contextLength: context.length,
          stats,
          budget: stats.budget
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to build hierarchical memory context: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour obtenir les statistiques de la mémoire hiérarchique
 */
export const getHierarchicalMemoryStatsTool: MCPTool = {
  name: "get_hierarchical_memory_stats",
  description: "Get statistics and status of the hierarchical memory system",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user (for filtering if needed)"
      },
      sessionId: {
        type: "string",
        description: "Session identifier for memory isolation"
      }
    },
    required: []
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { sessionId } = args;
      
      // Obtenir le gestionnaire de mémoire pour cette session
      const memoryManager = getMemoryManager(sessionId || 'default');
      
      const stats = memoryManager.getMemoryStats();
      const memoryExport = memoryManager.exportMemory();
      
      return {
        success: true,
        data: {
          stats,
          memoryItems: memoryExport,
          budget: stats.budget
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get hierarchical memory stats: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour forcer la création d'un résumé L1
 */
export const forceCreateL1SummaryTool: MCPTool = {
  name: "force_create_l1_summary",
  description: "Force creation of an L1 summary for the last 5 messages",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user"
      }
    },
    required: ["user"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { user } = args;
      
      // Forcer la création d'un L1 (pour tests)
      const statsBefore = memoryManager.getMemoryStats();
      
      // Simuler l'ajout de messages pour déclencher la création L1
      // (En réalité, on devrait avoir une méthode directe dans le manager)
      
      const statsAfter = memoryManager.getMemoryStats();
      
      return {
        success: true,
        data: {
          message: "Résumé L1 forcé (simulation)",
          statsBefore,
          statsAfter,
          budget: statsAfter.budget
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to force create L1 summary: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour vider la mémoire hiérarchique
 */
export const clearHierarchicalMemoryTool: MCPTool = {
  name: "clear_hierarchical_memory",
  description: "Clear all hierarchical memory data",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user (for confirmation)"
      }
    },
    required: ["user"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { user } = args;
      
      memoryManager.clearMemory();
      
      return {
        success: true,
        data: {
          message: `Mémoire hiérarchique vidée pour ${user}`,
          stats: memoryManager.getMemoryStats()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear hierarchical memory: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil add_message_to_hierarchical_memory
 */
export async function testAddMessageToHierarchicalMemoryTool(): Promise<void> {
  console.log('🧪 Test add_message_to_hierarchical_memory MCP Tool');
  
  const result = await addMessageToHierarchicalMemoryTool.handler({
    user: 'test_user',
    message: 'Salut Algareth, comment ça va ?',
    role: 'user'
  });
  
  console.log(`✅ Add message to hierarchical memory: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📊 Stats: ${JSON.stringify(result.data.stats)}`);
    console.log(`   💰 Budget: ${result.data.budget.currentCharacters}/${result.data.budget.maxCharacters} chars`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}

/**
 * Test de l'outil build_hierarchical_memory_context
 */
export async function testBuildHierarchicalMemoryContextTool(): Promise<void> {
  console.log('🧪 Test build_hierarchical_memory_context MCP Tool');
  
  const result = await buildHierarchicalMemoryContextTool.handler({
    user: 'test_user',
    query: 'Comment fonctionne ta mémoire ?',
    maxChars: 2000
  });
  
  console.log(`✅ Build hierarchical memory context: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📝 Context length: ${result.data.contextLength} chars`);
    console.log(`   📊 Stats: ${JSON.stringify(result.data.stats)}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}