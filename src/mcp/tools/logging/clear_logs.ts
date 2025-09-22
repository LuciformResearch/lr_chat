/**
 * Outil MCP pour effacer les logs
 * Migration depuis Logger.ts vers MCP "function as tool"
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { getLogger, getLoggerManager } from '@/lib/utils/Logger';

/**
 * Outil MCP pour effacer les logs
 */
export const clearLogsTool: MCPTool = {
  name: "clear_logs",
  description: "Clear logs from a logger or all loggers",
  inputSchema: {
    type: "object",
    properties: {
      loggerName: {
        type: "string",
        description: "Name of the logger to clear logs from",
        optional: true
      },
      clearAllLoggers: {
        type: "boolean",
        description: "Clear logs from all loggers",
        optional: true
      },
      confirm: {
        type: "boolean",
        description: "Confirmation required to clear logs",
        optional: true
      }
    }
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { loggerName, clearAllLoggers = false, confirm = false } = args;
      
      // Vérifier la confirmation
      if (!confirm) {
        return {
          success: false,
          error: "Confirmation required to clear logs. Set 'confirm' to true.",
          timestamp: new Date().toISOString()
        };
      }
      
      if (clearAllLoggers) {
        // Effacer les logs de tous les loggers
        const loggerManager = getLoggerManager();
        const allLoggers = loggerManager.getAllLoggers();
        const loggerCount = allLoggers.length;
        
        loggerManager.clearAllLogs();
        
        return {
          success: true,
          data: {
            action: 'cleared_all_loggers',
            loggerCount,
            message: `Cleared logs from ${loggerCount} loggers`
          },
          timestamp: new Date().toISOString()
        };
      } else {
        // Effacer les logs d'un logger spécifique
        const logger = getLogger(loggerName);
        const logsBefore = logger.getLogs().length;
        
        logger.clearLogs();
        
        return {
          success: true,
          data: {
            action: 'cleared_single_logger',
            loggerName: loggerName || 'LR_TchatAgent',
            logsCleared: logsBefore,
            message: `Cleared ${logsBefore} logs from ${loggerName || 'LR_TchatAgent'}`
          },
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to clear logs: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil clear_logs
 */
export async function testClearLogsTool(): Promise<void> {
  console.log('🧪 Test clear_logs MCP Tool');
  
  // Générer quelques logs de test
  const logger = getLogger('test_clear_logger');
  logger.info('Test log 1');
  logger.warning('Test log 2');
  logger.error('Test log 3');
  
  // Vérifier qu'il y a des logs
  const logsBefore = logger.getLogs().length;
  console.log(`📊 Logs before clear: ${logsBefore}`);
  
  // Test effacement sans confirmation (doit échouer)
  const noConfirmResult = await clearLogsTool.handler({ loggerName: 'test_clear_logger' });
  console.log(`✅ No confirmation test: ${noConfirmResult.success ? 'FAILED (should fail)' : 'SUCCESS (correctly failed)'}`);
  
  // Test effacement avec confirmation
  const clearResult = await clearLogsTool.handler({ 
    loggerName: 'test_clear_logger',
    confirm: true 
  });
  console.log(`✅ Clear logs: ${clearResult.success ? 'SUCCESS' : 'FAILED'}`);
  if (clearResult.success) {
    console.log(`📊 ${clearResult.data.message}`);
    
    // Vérifier que les logs sont effacés
    const logsAfter = logger.getLogs().length;
    console.log(`📊 Logs after clear: ${logsAfter}`);
  } else {
    console.error(`❌ Error: ${clearResult.error}`);
  }
}