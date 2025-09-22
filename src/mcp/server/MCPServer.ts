/**
 * Serveur MCP pour LR_TchatAgent Web
 * Gestionnaire central des outils MCP
 */

import { MCPTool, MCPToolRegistry, MCPToolCall, MCPToolResponse, MCPToolResult } from '@/mcp/types/MCPTool';
import { loggingTools } from '@/mcp/tools/logging';
import { environmentTools } from '@/mcp/tools/environment';
import { personaTools } from '@/mcp/tools/persona';
import { memoryTools } from '@/mcp/tools/memory';
import { dialogTool } from '@/mcp/tools/agents/dialog_tool';
import { listToolsTool } from '@/mcp/tools/agents/list_tools_tool';

/**
 * Serveur MCP principal
 */
export class MCPServer {
  private tools: MCPToolRegistry = {};
  private isInitialized = false;

  constructor() {
    this.initializeTools();
  }

  /**
   * Initialise tous les outils MCP
   */
  private initializeTools(): void {
    // Ajouter les outils de logging
    Object.assign(this.tools, loggingTools);
    
    // Ajouter les outils d'environnement
    Object.assign(this.tools, environmentTools);
    
    // Ajouter les outils de personnalité
    Object.assign(this.tools, personaTools);
    
    // Ajouter les outils de mémoire (intégration avec @modelcontextprotocol/server-memory)
    Object.assign(this.tools, memoryTools);
    
    // Ajouter l'outil dialog
    this.tools['dialog'] = dialogTool;
    
    // Ajouter l'outil list_tools
    this.tools['list_tools'] = listToolsTool;
    
    this.isInitialized = true;
    console.log(`✅ MCP Server initialized with ${Object.keys(this.tools).length} tools`);
  }

  /**
   * Récupère la liste des outils disponibles
   */
  getAvailableTools(): string[] {
    return Object.keys(this.tools);
  }

  /**
   * Récupère les informations d'un outil
   */
  getToolInfo(toolName: string): MCPTool | null {
    return this.tools[toolName] || null;
  }

  /**
   * Récupère tous les outils avec leurs informations
   */
  getAllToolsInfo(): Record<string, MCPTool> {
    return { ...this.tools };
  }

  /**
   * Exécute un outil MCP
   */
  async executeTool(toolCall: MCPToolCall): Promise<MCPToolResponse> {
    const { tool, arguments: args } = toolCall;
    
    if (!this.tools[tool]) {
      return {
        tool,
        result: {
          success: false,
          error: `Tool '${tool}' not found`,
          timestamp: new Date().toISOString()
        }
      };
    }

    try {
      // Valider les arguments
      const validation = this.validateToolArguments(tool, args);
      if (!validation.valid) {
        return {
          tool,
          result: {
            success: false,
            error: `Invalid arguments: ${validation.errors.join(', ')}`,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Exécuter l'outil
      const result = await this.tools[tool].handler(args);
      
      return {
        tool,
        result
      };
    } catch (error) {
      return {
        tool,
        result: {
          success: false,
          error: `Tool execution failed: ${error}`,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Exécute plusieurs outils en parallèle
   */
  async executeTools(toolCalls: MCPToolCall[]): Promise<MCPToolResponse[]> {
    const promises = toolCalls.map(call => this.executeTool(call));
    return Promise.all(promises);
  }

  /**
   * Valide les arguments d'un outil
   */
  private validateToolArguments(toolName: string, args: any): { valid: boolean; errors: string[] } {
    const tool = this.tools[toolName];
    if (!tool) {
      return { valid: false, errors: [`Tool '${toolName}' not found`] };
    }

    const { inputSchema } = tool;
    const errors: string[] = [];

    // Vérifier les propriétés requises
    if (inputSchema.required) {
      for (const requiredProp of inputSchema.required) {
        if (!(requiredProp in args)) {
          errors.push(`Required property '${requiredProp}' is missing`);
        }
      }
    }

    // Vérifier les types des propriétés
    if (inputSchema.properties) {
      for (const [propName, propSchema] of Object.entries(inputSchema.properties)) {
        if (propName in args) {
          const value = args[propName];
          const schema = propSchema as any;

          // Vérifier le type
          if (schema.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== schema.type) {
              errors.push(`Property '${propName}' must be of type '${schema.type}', got '${actualType}'`);
            }
          }

          // Vérifier les valeurs énumérées
          if (schema.enum && !schema.enum.includes(value)) {
            errors.push(`Property '${propName}' must be one of: ${schema.enum.join(', ')}`);
          }

          // Vérifier les contraintes numériques
          if (schema.type === 'number') {
            if (schema.minimum !== undefined && value < schema.minimum) {
              errors.push(`Property '${propName}' must be >= ${schema.minimum}`);
            }
            if (schema.maximum !== undefined && value > schema.maximum) {
              errors.push(`Property '${propName}' must be <= ${schema.maximum}`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Ajoute un outil personnalisé
   */
  addTool(tool: MCPTool): void {
    this.tools[tool.name] = tool;
    console.log(`✅ Added MCP tool: ${tool.name}`);
  }

  /**
   * Supprime un outil
   */
  removeTool(toolName: string): boolean {
    if (this.tools[toolName]) {
      delete this.tools[toolName];
      console.log(`✅ Removed MCP tool: ${toolName}`);
      return true;
    }
    return false;
  }

  /**
   * Récupère les statistiques du serveur
   */
  getStats(): {
    totalTools: number;
    toolsByCategory: Record<string, number>;
    isInitialized: boolean;
  } {
    const toolsByCategory: Record<string, number> = {};
    
    for (const toolName of Object.keys(this.tools)) {
      const category = toolName.split('_')[0] || 'other';
      toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;
    }

    return {
      totalTools: Object.keys(this.tools).length,
      toolsByCategory,
      isInitialized: this.isInitialized
    };
  }
}

// Instance globale du serveur MCP
export const mcpServer = new MCPServer();

/**
 * Test du serveur MCP
 */
export async function testMCPServer(): Promise<void> {
  console.log('🧪 Test MCP Server');
  
  // Test récupération des outils
  const availableTools = mcpServer.getAvailableTools();
  console.log(`📋 Available tools: ${availableTools.join(', ')}`);
  
  // Test exécution d'un outil
  const result = await mcpServer.executeTool({
    tool: 'log_message',
    arguments: {
      level: 'INFO',
      message: 'Test from MCP Server',
      data: { server: 'mcp' }
    }
  });
  
  console.log(`✅ Tool execution: ${result.result.success ? 'SUCCESS' : 'FAILED'}`);
  if (!result.result.success) {
    console.error(`❌ Error: ${result.result.error}`);
  }
  
  // Test validation d'arguments
  const invalidResult = await mcpServer.executeTool({
    tool: 'log_message',
    arguments: {
      level: 'INVALID',
      message: 'This should fail'
    }
  });
  
  console.log(`✅ Validation test: ${invalidResult.result.success ? 'FAILED (should fail)' : 'SUCCESS (correctly failed)'}`);
  
  // Test statistiques
  const stats = mcpServer.getStats();
  console.log(`📊 Server stats:`, stats);
  
  console.log('✅ MCP Server tests completed');
}