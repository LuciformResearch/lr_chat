/**
 * Point d'entrée principal pour MCP
 * Export de tous les composants MCP
 */

// Types
export * from './types/MCPTool';

// Serveur MCP
export { MCPServer, mcpServer, testMCPServer } from './server/MCPServer';

// Outils de logging
export { loggingTools, testLoggingTools } from './tools/logging';
export { logMessageTool } from './tools/logging/log_message';
export { getLogsTool } from './tools/logging/get_logs';
export { clearLogsTool } from './tools/logging/clear_logs';

// Outils d'environnement
export { environmentTools, testEnvironmentTools } from './tools/environment';
export { checkApiKeysTool } from './tools/environment/check_api_keys';
export { getApiKeyInfoTool } from './tools/environment/get_api_key_info';
export { validateEnvironmentTool } from './tools/environment/validate_environment';

// Outils de personnalité
export { personaTools, testPersonaTools } from './tools/persona';
export { createChatPromptTool } from './tools/persona/create_chat_prompt';
export { validatePersonaTool } from './tools/persona/validate_persona';

// Outils de mémoire (intégration avec @modelcontextprotocol/server-memory)
export { memoryTools, testMemoryTools } from './tools/memory';
export { addLogEntryTool } from './tools/memory/add_log_entry';
export { addConversationEntryTool } from './tools/memory/add_conversation_entry';

// Outils d'agents
export { dialogTool } from './tools/agents/dialog_tool';
export { listToolsTool } from './tools/agents/list_tools_tool';

// Démonstrations
export {
  runMCPDemo,
  demonstratePracticalUsage,
  demonstrateErrorHandling
} from './examples/mcp_demo';

/**
 * Initialisation rapide du système MCP
 */
export function initializeMCP(): void {
  const server = require('./server/MCPServer').mcpServer;
  console.log('🚀 Initialisation du système MCP');
  console.log(`📋 Outils disponibles: ${server.getAvailableTools().join(', ')}`);
  console.log(`📊 Statistiques:`, server.getStats());
  console.log('✅ Système MCP initialisé');
}

/**
 * Test rapide du système MCP
 */
export async function quickMCPTest(): Promise<void> {
  const server = require('./server/MCPServer').mcpServer;
  console.log('🧪 Test rapide du système MCP');
  
  // Test d'un outil simple
  const result = await server.executeTool({
    tool: 'log_message',
    arguments: {
      level: 'INFO',
      message: 'Quick MCP test',
      data: { test: true }
    }
  });
  
  console.log(`✅ Test result: ${result.result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.result.success) {
    console.log('🎉 Système MCP fonctionnel !');
  } else {
    console.error(`❌ Erreur: ${result.result.error}`);
  }
}