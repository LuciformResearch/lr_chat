/**
 * Registre des outils MCP pour la mémoire officielle
 * Intégration avec @modelcontextprotocol/server-memory
 */

import { MCPToolRegistry } from '@/mcp/types/MCPTool';
import { addLogEntryTool } from './add_log_entry';
import { addConversationEntryTool } from './add_conversation_entry';
import { getUserMemoryTool } from './get_user_memory';
import { generateSummaryTool } from './generate_summary';
import { enrichPromptWithMemoryTool } from './enrich_prompt_with_memory';
import { 
  addMessageToHierarchicalMemoryTool,
  buildHierarchicalMemoryContextTool,
  getHierarchicalMemoryStatsTool,
  forceCreateL1SummaryTool,
  clearHierarchicalMemoryTool
} from './hierarchical_memory';

/**
 * Registre des outils de mémoire MCP
 */
export const memoryTools: MCPToolRegistry = {
  add_log_entry: addLogEntryTool,
  add_conversation_entry: addConversationEntryTool,
  get_user_memory: getUserMemoryTool,
  generate_summary: generateSummaryTool,
  enrich_prompt_with_memory: enrichPromptWithMemoryTool,
  // Outils de mémoire hiérarchique (Phase 1)
  add_message_to_hierarchical_memory: addMessageToHierarchicalMemoryTool,
  build_hierarchical_memory_context: buildHierarchicalMemoryContextTool,
  get_hierarchical_memory_stats: getHierarchicalMemoryStatsTool,
  force_create_l1_summary: forceCreateL1SummaryTool,
  clear_hierarchical_memory: clearHierarchicalMemoryTool
};

/**
 * Test de tous les outils de mémoire
 */
export async function testMemoryTools(): Promise<void> {
  console.log('🧪 Test de tous les outils de mémoire MCP');
  
  // Test add_log_entry
  const logResult = await addLogEntryTool.handler({
    level: 'INFO',
    message: 'Test log entry from memory tools',
    source: 'memory_test',
    tags: ['test', 'memory', 'mcp']
  });
  console.log(`📝 Add log entry: ${logResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  // Test add_conversation_entry
  const convResult = await addConversationEntryTool.handler({
    user: 'TestUser',
    message: 'Test message for memory',
    response: 'Test response from Algareth',
    persona: 'Algareth',
    provider: 'gemini'
  });
  console.log(`💬 Add conversation entry: ${convResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  // Test get_user_memory
  const memoryResult = await getUserMemoryTool.handler({
    user: 'TestUser',
    includeConversations: true,
    includeSummaries: true,
    maxConversations: 5
  });
  console.log(`🧠 Get user memory: ${memoryResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  // Test generate_summary
  const summaryResult = await generateSummaryTool.handler({
    user: 'TestUser',
    messages: [
      {
        role: 'user',
        content: 'Test message for summary',
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant',
        content: 'Test response for summary',
        timestamp: new Date().toISOString()
      }
    ],
    language: 'fr',
    saveSummary: true
  });
  console.log(`📝 Generate summary: ${summaryResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  console.log('✅ Tests des outils de mémoire terminés');
}