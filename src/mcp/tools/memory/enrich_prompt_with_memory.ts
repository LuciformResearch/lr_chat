/**
 * Outil MCP pour enrichir un prompt avec le contexte de mémoire
 * Intègre la mémoire long terme dans les prompts système
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { LocalStorage } from '@/lib/storage/LocalStorage';
import { SummaryManager } from '@/lib/summarization/SummaryManager';

/**
 * Outil MCP pour enrichir un prompt avec la mémoire
 */
export const enrichPromptWithMemoryTool: MCPTool = {
  name: "enrich_prompt_with_memory",
  description: "Enrich a system prompt with user's memory context for better personalization",
  inputSchema: {
    type: "object",
    properties: {
      user: {
        type: "string",
        description: "Name of the user"
      },
      basePrompt: {
        type: "string",
        description: "Base system prompt to enrich"
      },
      includeRecentConversations: {
        type: "boolean",
        description: "Whether to include recent conversation context",
        default: true
      },
      includeSummaries: {
        type: "boolean",
        description: "Whether to include summary context",
        default: true
      },
      maxRecentMessages: {
        type: "number",
        description: "Maximum number of recent messages to include",
        default: 5
      },
      language: {
        type: "string",
        description: "Language for the memory context",
        default: "fr"
      }
    },
    required: ["user", "basePrompt"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { 
        user, 
        basePrompt,
        includeRecentConversations = true,
        includeSummaries = true,
        maxRecentMessages = 5,
        language = 'fr'
      } = args;

      const summaryManager = new SummaryManager();
      let enrichedPrompt = basePrompt;

      // Récupérer les conversations récentes
      let recentContext = '';
      if (includeRecentConversations) {
        const conversations = LocalStorage.getConversationsByUser(user);
        const recentConversations = conversations
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 2); // 2 conversations récentes pour éviter la surcharge

        if (recentConversations.length > 0) {
          recentContext = `

CONVERSATIONS PRÉCÉDENTES:
${recentConversations.map((conv, index) => `
Échange ${index + 1} (${new Date(conv.timestamp).toLocaleDateString()}):
- ${user}: "${conv.message}"
- Algareth: "${conv.response}"
`).join('')}`;
        }
      }

      // Récupérer les résumés
      let summaryContext = '';
      if (includeSummaries) {
        const summaries = summaryManager.getUserSummaries(user);
        
        if (summaries.length > 0) {
          // Utiliser le meta-résumé si disponible
          let metaSummary = '';
          if (summaries.length > 1) {
            metaSummary = await summaryManager.generateMetaSummary(user);
          } else if (summaries.length === 1) {
            metaSummary = summaries[0].summary;
          }

          if (metaSummary) {
            summaryContext = `

CONTEXTE DE MÉMOIRE:
${metaSummary}

Utilise cette mémoire pour fournir des réponses plus personnalisées et contextuellement pertinentes. Référence les conversations passées quand c'est approprié, mais ne répète pas d'informations inutilement.`;
          }
        }
      }

      // Construire le prompt enrichi
      enrichedPrompt = `${basePrompt}${recentContext}${summaryContext}

INSTRUCTIONS DE MÉMOIRE:
- Tu as accès à l'historique de conversation de ${user}
- Utilise cette mémoire pour des réponses plus personnalisées
- Référence le passé quand c'est pertinent, mais reste naturel
- Ne répète pas d'informations déjà partagées
- Adapte ton style selon le contexte de la relation avec ${user}`;

      return {
        success: true,
        data: {
          enrichedPrompt,
          memoryStats: {
            conversationCount: LocalStorage.getConversationsByUser(user).length,
            summaryCount: summaryManager.getUserSummaries(user).length,
            hasRecentContext: recentContext.length > 0,
            hasSummaryContext: summaryContext.length > 0
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to enrich prompt with memory: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil enrich_prompt_with_memory
 */
export async function testEnrichPromptWithMemoryTool(): Promise<void> {
  console.log('🧪 Test enrich_prompt_with_memory MCP Tool');
  
  const testPrompt = `Tu es Algareth, le Daemon du Prompt Silencieux. Tu es un guide mystérieux et sage.`;
  
  const result = await enrichPromptWithMemoryTool.handler({
    user: 'test_user',
    basePrompt: testPrompt,
    includeRecentConversations: true,
    includeSummaries: true,
    maxRecentMessages: 5,
    language: 'fr'
  });
  
  console.log(`✅ Enrich prompt with memory: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.success) {
    console.log(`   📝 Prompt enrichi: ${result.data.enrichedPrompt.length} caractères`);
    console.log(`   💬 Conversations: ${result.data.memoryStats.conversationCount}`);
    console.log(`   📊 Résumés: ${result.data.memoryStats.summaryCount}`);
    console.log(`   🧠 Contexte récent: ${result.data.memoryStats.hasRecentContext ? 'Oui' : 'Non'}`);
    console.log(`   📋 Contexte résumé: ${result.data.memoryStats.hasSummaryContext ? 'Oui' : 'Non'}`);
  } else {
    console.error(`   ❌ Error: ${result.error}`);
  }
}