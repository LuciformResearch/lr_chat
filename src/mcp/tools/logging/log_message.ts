/**
 * Outil MCP pour logger des messages
 * Migration depuis Logger.ts vers MCP "function as tool"
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { getLogger } from '@/lib/utils/Logger';

/**
 * Outil MCP pour logger un message avec un niveau spécifique
 */
export const logMessageTool: MCPTool = {
  name: "log_message",
  description: "Log a message with specified level",
  inputSchema: {
    type: "object",
    properties: {
      level: { 
        type: "string", 
        enum: ["DEBUG", "INFO", "WARNING", "ERROR"],
        description: "Log level"
      },
      message: { 
        type: "string",
        description: "Message to log"
      },
      data: { 
        type: "object",
        description: "Additional data to log",
        optional: true
      },
      loggerName: {
        type: "string",
        description: "Name of the logger to use",
        optional: true
      }
    },
    required: ["level", "message"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const logger = getLogger(args.loggerName || 'mcp_tool');
      
      // Valider le niveau de log
      const validLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR'];
      if (!validLevels.includes(args.level)) {
        return {
          success: false,
          error: `Invalid log level: ${args.level}. Must be one of: ${validLevels.join(', ')}`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Logger le message
      const logMethod = args.level.toLowerCase() as 'debug' | 'info' | 'warning' | 'error';
      logger[logMethod](args.message, args.data);
      
      return {
        success: true,
        data: {
          level: args.level,
          message: args.message,
          data: args.data,
          loggerName: args.loggerName || 'mcp_tool'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to log message: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil log_message
 */
export async function testLogMessageTool(): Promise<void> {
  console.log('🧪 Test log_message MCP Tool');
  
  // Test avec différents niveaux
  const testCases = [
    { level: 'INFO', message: 'Test info message', data: { test: true } },
    { level: 'WARNING', message: 'Test warning message' },
    { level: 'ERROR', message: 'Test error message', data: { error: 'test error' } },
    { level: 'DEBUG', message: 'Test debug message', loggerName: 'test_logger' }
  ];
  
  for (const testCase of testCases) {
    const result = await logMessageTool.handler(testCase);
    console.log(`✅ ${testCase.level}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (!result.success) {
      console.error(`❌ Error: ${result.error}`);
    }
  }
  
  // Test avec niveau invalide
  const invalidResult = await logMessageTool.handler({
    level: 'INVALID',
    message: 'This should fail'
  });
  console.log(`✅ Invalid level test: ${invalidResult.success ? 'FAILED (should fail)' : 'SUCCESS (correctly failed)'}`);
}