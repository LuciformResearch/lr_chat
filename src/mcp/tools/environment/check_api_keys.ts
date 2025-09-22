/**
 * Outil MCP pour vérifier les clés API
 * Migration depuis SecureEnvManager vers MCP "function as tool"
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { checkApiKeys } from '@/lib/utils/SecureEnvManager.browser';

/**
 * Outil MCP pour vérifier la présence des clés API sans révéler les valeurs
 */
export const checkApiKeysTool: MCPTool = {
  name: "check_api_keys",
  description: "Check presence of API keys without revealing values",
  inputSchema: {
    type: "object",
    properties: {
      providers: {
        type: "array",
        items: { type: "string" },
        description: "List of providers to check (optional, defaults to all)",
        optional: true
      },
      includePlaceholders: {
        type: "boolean",
        description: "Include placeholder keys in results",
        optional: true
      }
    }
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { providers, includePlaceholders = false } = args;
      
      // Récupérer toutes les clés API
      const allApiKeys = checkApiKeys();
      
      // Filtrer par providers si spécifié
      let filteredKeys: Record<string, any> = allApiKeys;
      if (providers && Array.isArray(providers)) {
        filteredKeys = {};
        for (const provider of providers) {
          if (allApiKeys[provider]) {
            filteredKeys[provider] = allApiKeys[provider];
          }
        }
      }
      
      // Filtrer les placeholders si demandé
      if (!includePlaceholders) {
        const cleanedKeys: Record<string, any> = {};
        for (const [provider, info] of Object.entries(filteredKeys)) {
          if (info.preview !== 'placeholder') {
            cleanedKeys[provider] = info;
          }
        }
        filteredKeys = cleanedKeys;
      }
      
      // Compter les clés disponibles
      const availableCount = Object.values(filteredKeys).filter(info => info.present).length;
      const totalCount = Object.keys(filteredKeys).length;
      
      return {
        success: true,
        data: {
          apiKeys: filteredKeys,
          summary: {
            total: totalCount,
            available: availableCount,
            missing: totalCount - availableCount
          },
          providers: Object.keys(filteredKeys)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check API keys: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil check_api_keys
 */
export async function testCheckApiKeysTool(): Promise<void> {
  console.log('🧪 Test check_api_keys MCP Tool');
  
  // Test avec tous les providers
  const allResult = await checkApiKeysTool.handler({});
  console.log(`✅ All providers: ${allResult.success ? 'SUCCESS' : 'FAILED'}`);
  if (allResult.success) {
    console.log(`📊 Summary: ${allResult.data.summary.available}/${allResult.data.summary.total} available`);
  }
  
  // Test avec providers spécifiques
  const specificResult = await checkApiKeysTool.handler({
    providers: ['gemini', 'openai']
  });
  console.log(`✅ Specific providers: ${specificResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  // Test avec placeholders
  const withPlaceholdersResult = await checkApiKeysTool.handler({
    includePlaceholders: true
  });
  console.log(`✅ With placeholders: ${withPlaceholdersResult.success ? 'SUCCESS' : 'FAILED'}`);
}