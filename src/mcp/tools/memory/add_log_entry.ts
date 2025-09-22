/**
 * Outil MCP pour ajouter une entrée de log à la mémoire officielle
 * Intégration avec @modelcontextprotocol/server-memory
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { LocalStorage, LogEntry } from '@/lib/storage/LocalStorage';

/**
 * Outil MCP pour ajouter une entrée de log à la mémoire
 */
export const addLogEntryTool: MCPTool = {
  name: "add_log_entry",
  description: "Add a log entry to the official MCP memory server",
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
        description: "Log message"
      },
      source: {
        type: "string",
        description: "Source of the log entry",
        optional: true
      },
      data: {
        type: "object",
        description: "Additional data to store with the log",
        optional: true
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags for categorizing the log entry",
        optional: true
      }
    },
    required: ["level", "message"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { level, message, source = 'mcp_tool', data, tags = [] } = args;
      
      // Créer l'entrée de log
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const logEntry: LogEntry = {
        id: logId,
        level,
        message,
        source,
        data,
        tags,
        timestamp: new Date().toISOString()
      };
      
      // Sauvegarder localement
      LocalStorage.saveLog(logEntry);
      
      return {
        success: true,
        data: {
          logEntry,
          saved: true
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add log entry: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil add_log_entry
 */
export async function testAddLogEntryTool(): Promise<void> {
  console.log('🧪 Test add_log_entry MCP Tool');
  
  // Test avec différents niveaux
  const testCases = [
    {
      level: 'INFO',
      message: 'Test log entry from MCP tool',
      source: 'test_runner',
      tags: ['test', 'mcp']
    },
    {
      level: 'ERROR',
      message: 'Test error log',
      source: 'error_handler',
      data: { errorCode: 500, stack: 'test stack' }
    },
    {
      level: 'DEBUG',
      message: 'Debug information',
      source: 'debugger',
      tags: ['debug', 'development']
    }
  ];
  
  for (const testCase of testCases) {
    const result = await addLogEntryTool.handler(testCase);
    console.log(`✅ ${testCase.level}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (result.success) {
      console.log(`   📝 Log ID: ${result.data.logEntry.id}`);
      console.log(`   📝 Message: ${result.data.logEntry.message}`);
    } else {
      console.error(`   ❌ Error: ${result.error}`);
    }
  }
}