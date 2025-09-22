/**
 * Registre des outils MCP pour le logging
 */

import { MCPToolRegistry } from '@/mcp/types/MCPTool';
import { logMessageTool } from './log_message';
import { getLogsTool } from './get_logs';
import { clearLogsTool } from './clear_logs';

/**
 * Registre des outils de logging MCP
 */
export const loggingTools: MCPToolRegistry = {
  log_message: logMessageTool,
  get_logs: getLogsTool,
  clear_logs: clearLogsTool
};

/**
 * Test de tous les outils de logging
 */
export async function testLoggingTools(): Promise<void> {
  console.log('🧪 Test de tous les outils de logging MCP');
  
  // Test log_message
  await logMessageTool.handler({
    level: 'INFO',
    message: 'Test message from MCP tool',
    data: { test: true }
  });
  
  // Test get_logs
  const logsResult = await getLogsTool.handler({ limit: 5 });
  console.log(`📊 Retrieved ${logsResult.data?.totalLogs || 0} logs`);
  
  // Test clear_logs (avec confirmation)
  const clearResult = await clearLogsTool.handler({ 
    loggerName: 'test_logger',
    confirm: true 
  });
  console.log(`🧹 Clear result: ${clearResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  console.log('✅ Tests des outils de logging terminés');
}