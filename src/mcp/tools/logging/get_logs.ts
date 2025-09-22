/**
 * Outil MCP pour récupérer les logs
 * Migration depuis Logger.ts vers MCP "function as tool"
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { getLogger, getLoggerManager } from '@/lib/utils/Logger';

/**
 * Outil MCP pour récupérer les logs récents
 */
export const getLogsTool: MCPTool = {
  name: "get_logs",
  description: "Retrieve recent logs from a logger",
  inputSchema: {
    type: "object",
    properties: {
      loggerName: {
        type: "string",
        description: "Name of the logger to get logs from",
        optional: true
      },
      limit: { 
        type: "number",
        description: "Maximum number of logs to retrieve",
        optional: true,
        minimum: 1,
        maximum: 1000
      },
      level: { 
        type: "string", 
        enum: ["DEBUG", "INFO", "WARNING", "ERROR"],
        description: "Filter logs by level",
        optional: true
      },
      includeAllLoggers: {
        type: "boolean",
        description: "Include logs from all loggers",
        optional: true
      }
    }
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { loggerName, limit = 50, level, includeAllLoggers = false } = args;
      
      if (includeAllLoggers) {
        // Récupérer les logs de tous les loggers
        const loggerManager = getLoggerManager();
        const allLogs = loggerManager.exportAllLogs();
        
        // Filtrer par niveau si spécifié
        let filteredLogs = allLogs;
        if (level) {
          filteredLogs = {};
          for (const [name, logs] of Object.entries(allLogs)) {
            filteredLogs[name] = logs.filter(log => log.level === level);
          }
        }
        
        // Limiter le nombre de logs
        const limitedLogs: Record<string, any[]> = {};
        for (const [name, logs] of Object.entries(filteredLogs)) {
          limitedLogs[name] = (logs as any[]).slice(-limit);
        }
        
        return {
          success: true,
          data: {
            logs: limitedLogs,
            totalLoggers: Object.keys(limitedLogs).length,
            totalLogs: Object.values(limitedLogs).reduce((sum, logs) => sum + logs.length, 0),
            level,
            limit
          },
          timestamp: new Date().toISOString()
        };
      } else {
        // Récupérer les logs d'un logger spécifique
        const logger = getLogger(loggerName);
        let logs = logger.getLogs(limit);
        
        // Filtrer par niveau si spécifié
        if (level) {
          logs = logs.filter(log => log.level === level);
        }
        
        return {
          success: true,
          data: {
            logs,
            loggerName: loggerName || 'LR_TchatAgent',
            totalLogs: logs.length,
            level,
            limit
          },
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get logs: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil get_logs
 */
export async function testGetLogsTool(): Promise<void> {
  console.log('🧪 Test get_logs MCP Tool');
  
  // Générer quelques logs de test
  const logger = getLogger('test_logger');
  logger.info('Test log 1');
  logger.warning('Test log 2');
  logger.error('Test log 3');
  logger.debug('Test log 4');
  
  // Test récupération de logs
  const result = await getLogsTool.handler({ loggerName: 'test_logger', limit: 10 });
  console.log(`✅ Get logs: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  if (result.success) {
    console.log(`📊 Retrieved ${result.data.totalLogs} logs`);
  } else {
    console.error(`❌ Error: ${result.error}`);
  }
  
  // Test filtrage par niveau
  const filteredResult = await getLogsTool.handler({ 
    loggerName: 'test_logger', 
    level: 'INFO',
    limit: 5 
  });
  console.log(`✅ Filtered logs: ${filteredResult.success ? 'SUCCESS' : 'FAILED'}`);
  if (filteredResult.success) {
    console.log(`📊 Retrieved ${filteredResult.data.totalLogs} INFO logs`);
  }
  
  // Test tous les loggers
  const allLogsResult = await getLogsTool.handler({ includeAllLoggers: true, limit: 20 });
  console.log(`✅ All loggers: ${allLogsResult.success ? 'SUCCESS' : 'FAILED'}`);
  if (allLogsResult.success) {
    console.log(`📊 Retrieved from ${allLogsResult.data.totalLoggers} loggers`);
  }
}