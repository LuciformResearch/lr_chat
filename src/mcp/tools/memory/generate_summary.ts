/**
 * Outil MCP pour générer un résumé de conversation
 * Utilise le système de résumé pour créer des résumés narratifs
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { SummaryManager } from '@/lib/summarization/SummaryManager';
import { ConversationMessage } from '@/lib/summarization/SummarizationAgent';

/**
 * Outil MCP pour générer un résumé de conversation
 */
export const generateSummaryTool: MCPTool = {
  name: "generate_summary",
  description: "Generate a narrative summary of a conversation",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user"
      },
      messages: {
        type: "array",
        description: "Array of conversation messages",
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              enum: ["user", "assistant"],
              description: "Role of the message sender"
            },
            content: {
              type: "string",
              description: "Content of the message"
            },
            timestamp: {
              type: "string",
              description: "Timestamp of the message"
            }
          },
          required: ["role", "content", "timestamp"]
        }
      },
      language: {
        type: "string",
        description: "Language for the summary",
        default: "fr"
      },
      saveSummary: {
        type: "boolean",
        description: "Whether to save the summary to memory",
        default: true
      }
    },
    required: ["user", "messages"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { 
        user, 
        messages, 
        language = 'fr',
        saveSummary = true
      } = args;

      const summaryManager = new SummaryManager();

      // Convertir les messages au format attendu
      const conversationMessages: ConversationMessage[] = messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
        metadata: msg.metadata || {}
      }));

      // Générer le résumé
      const userSummary = await summaryManager.saveSummary(
        user,
        conversationMessages,
        [], // Pas de conversationData pour l'instant
        language
      );

      return {
        success: true,
        data: {
          summary: userSummary,
          summaryText: userSummary.summary,
          metadata: userSummary.metadata,
          saved: saveSummary
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate summary: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil generate_summary
 */
export async function testGenerateSummaryTool(): Promise<void> {
  console.log('🧪 Test generate_summary MCP Tool');
  
  const testMessages = [
    {
      role: 'user',
      content: 'Bonjour Algareth, comment ça va ?',
      timestamp: new Date().toISOString()
    },
    {
      role: 'assistant', 
      content: '⛧ Algareth écoute... Je vais bien, merci de demander.',
      timestamp: new Date().toISOString()
    },
    {
      role: 'user',
      content: 'Peux-tu me raconter une histoire ?',
      timestamp: new Date().toISOString()
    },
    {
      role: 'assistant',
      content: '⛧ Algareth sourit mystérieusement... Il était une fois...',
      timestamp: new Date().toISOString()
    }
  ];
  
  const result = await generateSummaryTool.handler({
    user: 'test_user',
    messages: testMessages,
    language: 'fr',
    saveSummary: true
  });
  
  console.log(`✅ Generate summary: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   👤 User: test_user`);
    console.log(`   📝 Summary: ${result.data.summaryText.substring(0, 100)}...`);
    console.log(`   📊 Compression ratio: ${(result.data.metadata.compressionRatio * 100).toFixed(1)}%`);
    console.log(`   💾 Saved: ${result.data.saved}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}