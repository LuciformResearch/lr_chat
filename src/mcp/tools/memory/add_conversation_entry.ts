/**
 * Outil MCP pour ajouter une entrée de conversation à la mémoire
 * Utilise le stockage local pour la persistance
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { LocalStorage, ConversationEntry, MemoryNode, MemoryEdge } from '@/lib/storage/LocalStorage';

/**
 * Outil MCP pour ajouter une entrée de conversation à la mémoire
 */
export const addConversationEntryTool: MCPTool = {
  name: "add_conversation_entry",
  description: "Add a conversation entry to the memory",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user"
      },
      message: {
        type: "string",
        description: "User message"
      },
      response: {
        type: "string",
        description: "Assistant response"
      },
      persona: {
        type: "string",
        description: "Persona used for the response",
        optional: true
      },
      provider: {
        type: "string",
        description: "LLM provider used",
        optional: true
      },
      model: {
        type: "string",
        description: "LLM model used",
        optional: true
      },
      metadata: {
        type: "object",
        description: "Additional metadata",
        optional: true
      }
    },
    required: ["user", "message", "response"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { 
        user, 
        message, 
        response, 
        persona = 'Algareth', 
        provider = 'gemini', 
        model = 'gemini-1.5-flash',
        metadata = {}
      } = args;
      
      // Créer l'entrée de conversation
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const conversationEntry: ConversationEntry = {
        id: conversationId,
        user,
        message,
        response,
        persona,
        provider,
        model,
        metadata,
        timestamp: new Date().toISOString()
      };
      
      // Sauvegarder la conversation
      LocalStorage.saveConversation(conversationEntry);
      
      // Créer un nœud de mémoire pour la conversation
      const conversationNode: MemoryNode = {
        id: conversationId,
        name: conversationId,
        nodeType: 'conversation_entry',
        metadata: [
          `User: ${user}`,
          `Message: ${message}`,
          `Response: ${response}`,
          `Persona: ${persona}`,
          `Provider: ${provider}`,
          `Model: ${model}`
        ],
        timestamp: new Date().toISOString()
      };
      
      LocalStorage.saveMemoryNode(conversationNode);
      
      // Créer un nœud utilisateur (vérifier s'il existe déjà)
      const userNodeId = `user_${user.toLowerCase().replace(/\s+/g, '_')}`;
      const existingUserNodes = LocalStorage.getMemoryNodesByType('user');
      const existingUser = existingUserNodes.find(node => node.name === userNodeId);
      
      if (!existingUser) {
        const userNode: MemoryNode = {
          id: userNodeId,
          name: userNodeId,
          nodeType: 'user',
          metadata: [
            `Name: ${user}`,
            `First seen: ${new Date().toISOString()}`,
            `Conversations: 1`
          ],
          timestamp: new Date().toISOString()
        };
        
        LocalStorage.saveMemoryNode(userNode);
      }
      
      // Créer une relation conversation -> user
      const edge: MemoryEdge = {
        id: `edge_${Date.now()}`,
        from: conversationId,
        to: userNodeId,
        edgeType: 'belongs_to',
        timestamp: new Date().toISOString()
      };
      
      LocalStorage.saveMemoryEdge(edge);
      
      return {
        success: true,
        data: {
          conversationEntry,
          memoryNode: conversationNode,
          userNode: userNodeId,
          edge: edge,
          saved: true
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add conversation entry: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil add_conversation_entry
 */
export async function testAddConversationEntryTool(): Promise<void> {
  console.log('🧪 Test add_conversation_entry MCP Tool');
  
  const testConversation = {
    user: 'Alice',
    message: 'Bonjour Algareth, comment ça va ?',
    response: '⛧ Algareth écoute... Je vais bien, merci de demander, Alice.',
    persona: 'Algareth',
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    metadata: {
      sessionId: 'test_session_123',
      messageCount: 1
    }
  };
  
  const result = await addConversationEntryTool.handler(testConversation);
  console.log(`✅ Add conversation entry: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   💬 Conversation ID: ${result.data.conversationEntry.id}`);
    console.log(`   👤 User: ${result.data.conversationEntry.user}`);
    console.log(`   🎭 Persona: ${result.data.conversationEntry.persona}`);
    console.log(`   💾 Saved: ${result.data.saved}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}