/**
 * Outils MCP pour la mémoire hiérarchique avec recherche sémantique
 * Intègre les embeddings Gemini pour une recherche plus intelligente
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { SemanticHierarchicalMemoryManager, SemanticMemoryItem } from '@/lib/memory/SemanticHierarchicalMemoryManager';

// Instances de gestionnaires de mémoire sémantique par session
const semanticMemoryManagers = new Map<string, SemanticHierarchicalMemoryManager>();

/**
 * Obtient ou crée un gestionnaire de mémoire sémantique pour une session
 */
function getSemanticMemoryManager(sessionId: string): SemanticHierarchicalMemoryManager {
  if (!semanticMemoryManagers.has(sessionId)) {
    const manager = new SemanticHierarchicalMemoryManager(10000, {
      embeddingEnabled: true,
      semanticThreshold: 0.6,
      maxSemanticResults: 10,
      cacheEmbeddings: true,
      autoGenerateEmbeddings: true
    });
    semanticMemoryManagers.set(sessionId, manager);
    console.log(`🧠 Gestionnaire de mémoire sémantique créé pour la session: ${sessionId}`);
  }
  return semanticMemoryManagers.get(sessionId)!;
}

/**
 * Outil MCP pour ajouter un message avec génération automatique d'embedding
 */
export const addMessageToSemanticMemoryTool: MCPTool = {
  name: "add_message_to_semantic_memory",
  description: "Add a message to the semantic hierarchical memory system with automatic embedding generation",
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
      },
      generateEmbedding: {
        type: "boolean",
        description: "Whether to generate embedding automatically",
        default: true
      }
    },
    required: ["user", "message", "role"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { user, message, role, sessionId, generateEmbedding = true } = args;
      
      // Obtenir le gestionnaire de mémoire sémantique pour cette session
      const memoryManager = getSemanticMemoryManager(sessionId || 'default');
      
      // Ajouter le message à la mémoire hiérarchique avec embedding
      memoryManager.addMessage(message, role as 'user' | 'assistant', user);
      
      // Obtenir les statistiques actuelles
      const stats = memoryManager.getMemoryStats();
      const semanticStats = memoryManager.getSemanticStats();
      
      return {
        success: true,
        data: {
          message: "Message ajouté à la mémoire sémantique hiérarchique",
          stats,
          semanticStats,
          embeddingGenerated: generateEmbedding,
          budget: stats.budget
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add message to semantic memory: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour construire le contexte avec recherche sémantique
 */
export const buildSemanticMemoryContextTool: MCPTool = {
  name: "build_semantic_memory_context",
  description: "Build context from semantic hierarchical memory using embedding-based relevance",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user"
      },
      query: {
        type: "string",
        description: "Current user query for semantic relevance filtering"
      },
      maxChars: {
        type: "number",
        description: "Maximum characters for the context",
        default: 5000
      },
      sessionId: {
        type: "string",
        description: "Session identifier for memory isolation"
      },
      semanticThreshold: {
        type: "number",
        description: "Minimum similarity threshold for semantic search",
        default: 0.6
      }
    },
    required: ["user", "query"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { user, query, maxChars = 5000, sessionId, semanticThreshold = 0.6 } = args;
      
      // Obtenir le gestionnaire de mémoire sémantique pour cette session
      const memoryManager = getSemanticMemoryManager(sessionId || 'default');
      
      // Mettre à jour le seuil sémantique si nécessaire
      if (semanticThreshold !== 0.6) {
        memoryManager.updateSemanticConfig({ semanticThreshold });
      }
      
      // Construire le contexte avec recherche sémantique
      const context = memoryManager.buildContextForPrompt(query, maxChars);
      const stats = memoryManager.getMemoryStats();
      const semanticStats = memoryManager.getSemanticStats();
      
      return {
        success: true,
        data: {
          context,
          contextLength: context.length,
          stats,
          semanticStats,
          semanticThreshold,
          budget: stats.budget
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to build semantic memory context: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour recherche sémantique dans la mémoire
 */
export const searchSemanticMemoryTool: MCPTool = {
  name: "search_semantic_memory",
  description: "Search through semantic memory using embedding-based similarity",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user"
      },
      query: {
        type: "string",
        description: "Search query for semantic matching"
      },
      sessionId: {
        type: "string",
        description: "Session identifier for memory isolation"
      },
      similarityThreshold: {
        type: "number",
        description: "Minimum similarity score (0-1)",
        default: 0.6
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return",
        default: 10
      },
      includeMetadata: {
        type: "boolean",
        description: "Whether to include metadata in results",
        default: true
      }
    },
    required: ["user", "query"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { user, query, sessionId, similarityThreshold = 0.6, maxResults = 10, includeMetadata = true } = args;
      
      // Obtenir le gestionnaire de mémoire sémantique pour cette session
      const memoryManager = getSemanticMemoryManager(sessionId || 'default');
      
      // Effectuer la recherche sémantique
      const searchResults = memoryManager.searchSemanticMemory(query);
      
      // Filtrer et limiter les résultats
      const filteredResults = searchResults
        .filter(result => result.similarity >= similarityThreshold)
        .slice(0, maxResults)
        .map(result => ({
          id: result.item.id,
          content: result.item.content,
          similarity: result.similarity,
          relevanceScore: result.relevanceScore,
          type: result.item.type,
          level: result.item.level,
          timestamp: result.item.timestamp,
          ...(includeMetadata && {
            metadata: {
              characterCount: result.item.characterCount,
              topics: result.item.semanticTopics,
              hasEmbedding: !!result.item.embedding
            }
          })
        }));
      
      return {
        success: true,
        data: {
          query,
          results: filteredResults,
          totalFound: searchResults.length,
          filteredCount: filteredResults.length,
          similarityThreshold,
          semanticStats: memoryManager.getSemanticStats()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search semantic memory: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour obtenir les statistiques sémantiques
 */
export const getSemanticMemoryStatsTool: MCPTool = {
  name: "get_semantic_memory_stats",
  description: "Get statistics and status of the semantic hierarchical memory system",
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
      },
      includeSemanticStats: {
        type: "boolean",
        description: "Whether to include semantic-specific statistics",
        default: true
      }
    },
    required: []
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { sessionId, includeSemanticStats = true } = args;
      
      // Obtenir le gestionnaire de mémoire sémantique pour cette session
      const memoryManager = getSemanticMemoryManager(sessionId || 'default');
      
      const stats = memoryManager.getMemoryStats();
      const memoryExport = memoryManager.exportMemory();
      
      const result: any = {
        stats,
        memoryItems: memoryExport,
        budget: stats.budget
      };
      
      if (includeSemanticStats) {
        result.semanticStats = memoryManager.getSemanticStats();
      }
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get semantic memory stats: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour recherche par topic sémantique
 */
export const searchBySemanticTopicTool: MCPTool = {
  name: "search_by_semantic_topic",
  description: "Search memory items by semantic topic",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user"
      },
      topic: {
        type: "string",
        description: "Semantic topic to search for"
      },
      sessionId: {
        type: "string",
        description: "Session identifier for memory isolation"
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results to return",
        default: 10
      }
    },
    required: ["user", "topic"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { user, topic, sessionId, maxResults = 10 } = args;
      
      // Obtenir le gestionnaire de mémoire sémantique pour cette session
      const memoryManager = getSemanticMemoryManager(sessionId || 'default');
      
      // Rechercher par topic
      const topicResults = memoryManager.searchByTopic(topic);
      
      // Limiter les résultats
      const limitedResults = topicResults.slice(0, maxResults).map(item => ({
        id: item.id,
        content: item.content,
        type: item.type,
        level: item.level,
        timestamp: item.timestamp,
        topics: item.semanticTopics,
        characterCount: item.characterCount
      }));
      
      return {
        success: true,
        data: {
          topic,
          results: limitedResults,
          totalFound: topicResults.length,
          semanticStats: memoryManager.getSemanticStats()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search by semantic topic: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour tester le service sémantique
 */
export const testSemanticMemoryServiceTool: MCPTool = {
  name: "test_semantic_memory_service",
  description: "Test the semantic memory service functionality",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user"
      },
      sessionId: {
        type: "string",
        description: "Session identifier for memory isolation"
      }
    },
    required: ["user"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { user, sessionId } = args;
      
      // Obtenir le gestionnaire de mémoire sémantique pour cette session
      const memoryManager = getSemanticMemoryManager(sessionId || 'default');
      
      // Tester le service
      const isWorking = await memoryManager.testSemanticService();
      
      return {
        success: true,
        data: {
          serviceWorking: isWorking,
          semanticStats: memoryManager.getSemanticStats(),
          message: isWorking ? "Service sémantique opérationnel" : "Service sémantique non opérationnel"
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to test semantic memory service: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Outil MCP pour vider le cache sémantique
 */
export const clearSemanticMemoryCacheTool: MCPTool = {
  name: "clear_semantic_memory_cache",
  description: "Clear the semantic memory cache and embeddings",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user (for confirmation)"
      },
      sessionId: {
        type: "string",
        description: "Session identifier for memory isolation"
      },
      clearEmbeddings: {
        type: "boolean",
        description: "Whether to clear embedding cache",
        default: true
      },
      clearSemanticIndex: {
        type: "boolean",
        description: "Whether to clear semantic index",
        default: true
      }
    },
    required: ["user"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { user, sessionId, clearEmbeddings = true, clearSemanticIndex = true } = args;
      
      // Obtenir le gestionnaire de mémoire sémantique pour cette session
      const memoryManager = getSemanticMemoryManager(sessionId || 'default');
      
      if (clearEmbeddings || clearSemanticIndex) {
        memoryManager.clearEmbeddingCache();
      }
      
      return {
        success: true,
        data: {
          message: `Cache sémantique vidé pour ${user}`,
          clearedEmbeddings: clearEmbeddings,
          clearedSemanticIndex: clearSemanticIndex,
          stats: memoryManager.getMemoryStats(),
          semanticStats: memoryManager.getSemanticStats()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear semantic memory cache: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil add_message_to_semantic_memory
 */
export async function testAddMessageToSemanticMemoryTool(): Promise<void> {
  console.log('🧪 Test add_message_to_semantic_memory MCP Tool');
  
  const result = await addMessageToSemanticMemoryTool.handler({
    user: 'test_user',
    message: 'Salut Algareth, comment fonctionne ta mémoire sémantique ?',
    role: 'user',
    generateEmbedding: true
  });
  
  console.log(`✅ Add message to semantic memory: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📊 Stats: ${JSON.stringify(result.data.stats)}`);
    console.log(`   🧠 Semantic Stats: ${JSON.stringify(result.data.semanticStats)}`);
    console.log(`   💰 Budget: ${result.data.budget.currentCharacters}/${result.data.budget.maxCharacters} chars`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}

/**
 * Test de l'outil build_semantic_memory_context
 */
export async function testBuildSemanticMemoryContextTool(): Promise<void> {
  console.log('🧪 Test build_semantic_memory_context MCP Tool');
  
  const result = await buildSemanticMemoryContextTool.handler({
    user: 'test_user',
    query: 'Comment fonctionne ta mémoire sémantique avec les embeddings ?',
    maxChars: 2000,
    semanticThreshold: 0.6
  });
  
  console.log(`✅ Build semantic memory context: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📝 Context length: ${result.data.contextLength} chars`);
    console.log(`   📊 Stats: ${JSON.stringify(result.data.stats)}`);
    console.log(`   🧠 Semantic Stats: ${JSON.stringify(result.data.semanticStats)}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}