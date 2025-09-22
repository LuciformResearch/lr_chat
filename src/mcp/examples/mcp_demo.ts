/**
 * Démonstration des outils MCP
 * Exemples d'utilisation des outils MCP "function as tool"
 */

import { mcpServer, testMCPServer } from '@/mcp/server/MCPServer';
import { testLoggingTools } from '@/mcp/tools/logging';

/**
 * Démonstration complète des outils MCP
 */
export async function runMCPDemo(): Promise<void> {
  console.log('🚀 Démonstration MCP "Function as Tool"');
  console.log('='.repeat(50));
  
  // 1. Test du serveur MCP
  console.log('\n📋 1. Test du serveur MCP');
  await testMCPServer();
  
  // 2. Test des outils de logging
  console.log('\n📋 2. Test des outils de logging');
  await testLoggingTools();
  
  // 3. Démonstration d'utilisation pratique
  console.log('\n📋 3. Démonstration d\'utilisation pratique');
  await demonstratePracticalUsage();
  
  // 4. Test de validation et gestion d'erreurs
  console.log('\n📋 4. Test de validation et gestion d\'erreurs');
  await demonstrateErrorHandling();
  
  console.log('\n✅ Démonstration MCP terminée');
}

/**
 * Démonstration d'utilisation pratique
 */
async function demonstratePracticalUsage(): Promise<void> {
  console.log('🔧 Utilisation pratique des outils MCP');
  
  // Scénario: Logging d'une conversation de chat
  const conversationLogs = [
    { level: 'INFO', message: 'User connected', data: { userId: 'alice', timestamp: Date.now() } },
    { level: 'INFO', message: 'Chat message received', data: { message: 'Bonjour Algareth!' } },
    { level: 'WARNING', message: 'Long conversation detected', data: { messageCount: 25 } },
    { level: 'ERROR', message: 'API rate limit exceeded', data: { provider: 'gemini', retryAfter: 60 } }
  ];
  
  // Logger chaque événement
  for (const logEntry of conversationLogs) {
    const result = await mcpServer.executeTool({
      tool: 'log_message',
      arguments: {
        level: logEntry.level,
        message: logEntry.message,
        data: logEntry.data,
        loggerName: 'chat_conversation'
      }
    });
    
    console.log(`📝 Logged: ${logEntry.level} - ${logEntry.message}`);
  }
  
  // Récupérer les logs récents
  const logsResult = await mcpServer.executeTool({
    tool: 'get_logs',
    arguments: {
      loggerName: 'chat_conversation',
      limit: 10
    }
  });
  
  if (logsResult.result.success) {
    console.log(`📊 Retrieved ${logsResult.result.data.totalLogs} conversation logs`);
  }
  
  // Nettoyer les logs de test
  const clearResult = await mcpServer.executeTool({
    tool: 'clear_logs',
    arguments: {
      loggerName: 'chat_conversation',
      confirm: true
    }
  });
  
  if (clearResult.result.success) {
    console.log(`🧹 ${clearResult.result.data.message}`);
  }
}

/**
 * Démonstration de la gestion d'erreurs
 */
async function demonstrateErrorHandling(): Promise<void> {
  console.log('⚠️ Gestion d\'erreurs et validation');
  
  // Test 1: Outil inexistant
  const unknownToolResult = await mcpServer.executeTool({
    tool: 'unknown_tool',
    arguments: { test: true }
  });
  
  console.log(`❌ Unknown tool: ${unknownToolResult.result.success ? 'FAILED (should fail)' : 'SUCCESS (correctly failed)'}`);
  if (!unknownToolResult.result.success) {
    console.log(`   Error: ${unknownToolResult.result.error}`);
  }
  
  // Test 2: Arguments invalides
  const invalidArgsResult = await mcpServer.executeTool({
    tool: 'log_message',
    arguments: {
      level: 'INVALID_LEVEL',
      message: 'This should fail'
    }
  });
  
  console.log(`❌ Invalid arguments: ${invalidArgsResult.result.success ? 'FAILED (should fail)' : 'SUCCESS (correctly failed)'}`);
  if (!invalidArgsResult.result.success) {
    console.log(`   Error: ${invalidArgsResult.result.error}`);
  }
  
  // Test 3: Propriété requise manquante
  const missingRequiredResult = await mcpServer.executeTool({
    tool: 'log_message',
    arguments: {
      level: 'INFO'
      // message manquant
    }
  });
  
  console.log(`❌ Missing required: ${missingRequiredResult.result.success ? 'FAILED (should fail)' : 'SUCCESS (correctly failed)'}`);
  if (!missingRequiredResult.result.success) {
    console.log(`   Error: ${missingRequiredResult.result.error}`);
  }
  
  // Test 4: Nettoyage sans confirmation
  const noConfirmResult = await mcpServer.executeTool({
    tool: 'clear_logs',
    arguments: {
      loggerName: 'test_logger'
      // confirm manquant
    }
  });
  
  console.log(`❌ No confirmation: ${noConfirmResult.result.success ? 'FAILED (should fail)' : 'SUCCESS (correctly failed)'}`);
  if (!noConfirmResult.result.success) {
    console.log(`   Error: ${noConfirmResult.result.error}`);
  }
}

/**
 * Démonstration de l'exécution en parallèle
 */
export async function demonstrateParallelExecution(): Promise<void> {
  console.log('⚡ Exécution en parallèle d\'outils MCP');
  
  // Créer plusieurs appels d'outils
  const toolCalls = [
    {
      tool: 'log_message',
      arguments: { level: 'INFO', message: 'Parallel log 1' }
    },
    {
      tool: 'log_message',
      arguments: { level: 'WARNING', message: 'Parallel log 2' }
    },
    {
      tool: 'log_message',
      arguments: { level: 'ERROR', message: 'Parallel log 3' }
    }
  ];
  
  // Exécuter en parallèle
  const startTime = Date.now();
  const results = await mcpServer.executeTools(toolCalls);
  const endTime = Date.now();
  
  console.log(`⚡ Executed ${toolCalls.length} tools in parallel in ${endTime - startTime}ms`);
  
  // Vérifier les résultats
  const successCount = results.filter(r => r.result.success).length;
  console.log(`📊 Success rate: ${successCount}/${results.length} (${(successCount/results.length*100).toFixed(1)}%)`);
  
  // Afficher les résultats
  results.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.tool}: ${result.result.success ? '✅' : '❌'}`);
  });
}

/**
 * Démonstration des statistiques du serveur
 */
function demonstrateServerStatsInternal(): void {
  console.log('📊 Statistiques du serveur MCP');
  
  const stats = mcpServer.getStats();
  console.log(`   Total tools: ${stats.totalTools}`);
  console.log(`   Initialized: ${stats.isInitialized}`);
  console.log(`   Tools by category:`);
  
  for (const [category, count] of Object.entries(stats.toolsByCategory)) {
    console.log(`     ${category}: ${count}`);
  }
  
  // Afficher tous les outils disponibles
  const availableTools = mcpServer.getAvailableTools();
  console.log(`   Available tools: ${availableTools.join(', ')}`);
}

// Export des fonctions de démonstration
export {
  demonstratePracticalUsage,
  demonstrateErrorHandling
};