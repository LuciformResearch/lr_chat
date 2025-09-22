/**
 * Outil MCP pour récupérer la mémoire d'un utilisateur
 * Charge les conversations et résumés existants pour un utilisateur donné
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { LocalStorage } from '@/lib/storage/LocalStorage';
import { SummaryManager } from '@/lib/summarization/SummaryManager';

/**
 * Outil MCP pour récupérer la mémoire d'un utilisateur
 */
export const getUserMemoryTool: MCPTool = {
  name: "get_user_memory",
  description: "Get user's conversation history and summaries from memory",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user to get memory for"
      },
      includeConversations: {
        type: "boolean",
        description: "Whether to include full conversation history",
        default: true
      },
      includeSummaries: {
        type: "boolean", 
        description: "Whether to include conversation summaries",
        default: true
      },
      maxConversations: {
        type: "number",
        description: "Maximum number of recent conversations to include",
        default: 10
      }
    },
    required: ["user"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { 
        user, 
        includeConversations = true,
        includeSummaries = true,
        maxConversations = 10
      } = args;

      const summaryManager = new SummaryManager();
      const result: any = {
        user,
        timestamp: new Date().toISOString(),
        memory: {
          conversations: [],
          summaries: [],
          metaSummary: null,
          stats: {
            conversationCount: 0,
            summaryCount: 0,
            lastConversation: null
          }
        }
      };

      // Récupérer les conversations
      if (includeConversations) {
        const conversations = LocalStorage.getConversationsByUser(user);
        result.memory.conversations = conversations
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, maxConversations);
        result.memory.stats.conversationCount = conversations.length;
        
        if (conversations.length > 0) {
          result.memory.stats.lastConversation = conversations[0].timestamp;
        }
      }

      // Récupérer les résumés
      if (includeSummaries) {
        const summaries = summaryManager.getUserSummaries(user);
        result.memory.summaries = summaries;
        result.memory.stats.summaryCount = summaries.length;

        // Générer un meta-résumé si plusieurs résumés existent
        if (summaries.length > 1) {
          result.memory.metaSummary = await summaryManager.generateMetaSummary(user);
        } else if (summaries.length === 1) {
          result.memory.metaSummary = summaries[0].summary;
        }
      }

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get user memory: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil get_user_memory
 */
export async function testGetUserMemoryTool(): Promise<void> {
  console.log('🧪 Test get_user_memory MCP Tool');
  
  const result = await getUserMemoryTool.handler({
    user: 'test_user',
    includeConversations: true,
    includeSummaries: true,
    maxConversations: 5
  });
  
  console.log(`✅ Get user memory: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   👤 User: ${result.data.user}`);
    console.log(`   💬 Conversations: ${result.data.memory.stats.conversationCount}`);
    console.log(`   📝 Summaries: ${result.data.memory.stats.summaryCount}`);
    console.log(`   🧠 Meta-summary: ${result.data.memory.metaSummary ? 'Available' : 'None'}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}