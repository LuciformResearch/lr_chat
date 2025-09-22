/**
 * Outil List Tools - Permet à Algareth de lister ses outils disponibles
 * Algareth peut ainsi informer l'utilisateur de ses capacités
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { mcpServer } from '@/mcp/server/MCPServer';

/**
 * Outil List Tools - Permet à Algareth de lister ses outils disponibles
 */
export const listToolsTool: MCPTool = {
  name: "list_tools",
  description: "Allow Algareth to list all available tools and their capabilities",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Filter tools by category (optional)",
        enum: ["all", "memory", "agents", "logging", "environment", "persona"]
      },
      detailed: {
        type: "boolean",
        description: "Whether to include detailed descriptions",
        default: false
      }
    },
    required: []
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { category = "all", detailed = false } = args;
      
      console.log(`🔧 Algareth liste ses outils (catégorie: ${category}, détaillé: ${detailed})`);
      
      const allTools = mcpServer.getAllToolsInfo();
      const availableTools = mcpServer.getAvailableTools();
      
      // Catégoriser les outils
      const categorizedTools = {
        memory: [],
        agents: [],
        logging: [],
        environment: [],
        persona: [],
        other: []
      };
      
      for (const [toolName, toolInfo] of Object.entries(allTools)) {
        const toolCategory = categorizeTool(toolName, toolInfo);
        categorizedTools[toolCategory].push({
          name: toolName,
          description: (toolInfo as any).description || 'Pas de description',
          inputSchema: detailed ? (toolInfo as any).inputSchema : undefined
        });
      }
      
      // Filtrer selon la catégorie demandée
      let toolsToShow = [];
      if (category === "all") {
        toolsToShow = Object.values(categorizedTools).flat();
      } else if (categorizedTools[category]) {
        toolsToShow = categorizedTools[category];
      } else {
        toolsToShow = categorizedTools.other;
      }
      
      // Générer la réponse formatée
      const toolsList = formatToolsList(toolsToShow, detailed);
      
      return {
        success: true,
        data: {
          totalTools: availableTools.length,
          category: category,
          tools: toolsToShow,
          formattedList: toolsList,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Erreur lors du listing des outils: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Catégorise un outil selon son nom et sa description
 */
function categorizeTool(toolName: string, toolInfo: MCPTool): string {
  const name = toolName.toLowerCase();
  const description = toolInfo.description.toLowerCase();
  
  // Outils de mémoire
  if (name.includes('memory') || name.includes('hierarchical') || 
      name.includes('conversation') || name.includes('summary') ||
      description.includes('memory') || description.includes('mémoire')) {
    return 'memory';
  }
  
  // Outils d'agents
  if (name.includes('dialog') || name.includes('agent') ||
      description.includes('agent') || description.includes('dialogue')) {
    return 'agents';
  }
  
  // Outils de logging
  if (name.includes('log') || name.includes('entry') ||
      description.includes('log') || description.includes('journal')) {
    return 'logging';
  }
  
  // Outils d'environnement
  if (name.includes('env') || name.includes('environment') ||
      description.includes('environment') || description.includes('environnement')) {
    return 'environment';
  }
  
  // Outils de personnalité
  if (name.includes('persona') || name.includes('prompt') ||
      description.includes('persona') || description.includes('personnalité')) {
    return 'persona';
  }
  
  return 'other';
}

/**
 * Formate la liste des outils pour l'affichage
 */
function formatToolsList(tools: any[], detailed: boolean): string {
  if (tools.length === 0) {
    return "Aucun outil disponible dans cette catégorie.";
  }
  
  let formattedList = `🔧 **Outils disponibles (${tools.length}):**\n\n`;
  
  for (const tool of tools) {
    formattedList += `**${tool.name}**\n`;
    formattedList += `   ${tool.description}\n`;
    
    if (detailed && tool.inputSchema) {
      const properties = tool.inputSchema.properties;
      if (properties && Object.keys(properties).length > 0) {
        formattedList += `   **Paramètres:**\n`;
        for (const [paramName, paramInfo] of Object.entries(properties)) {
          const param = paramInfo as any;
          formattedList += `   - \`${paramName}\`: ${param.description || 'Pas de description'}`;
          if (param.type) {
            formattedList += ` (${param.type})`;
          }
          formattedList += `\n`;
        }
      }
    }
    formattedList += `\n`;
  }
  
  return formattedList;
}

/**
 * Test de l'outil list_tools
 */
export async function testListToolsTool(): Promise<void> {
  console.log('🧪 Test list_tools MCP Tool');
  
  const testCases = [
    { category: "all", detailed: false },
    { category: "agents", detailed: true },
    { category: "memory", detailed: false }
  ];
  
  for (const testCase of testCases) {
    const result = await listToolsTool.handler(testCase);
    console.log(`✅ List Tools (${testCase.category}): ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (result.success) {
      console.log(`   📋 ${result.data.totalTools} outils trouvés`);
      console.log(`   📝 Liste formatée: ${result.data.formattedList.substring(0, 200)}...`);
    } else {
      console.error(`   ❌ Error: ${result.error}`);
    }
  }
}