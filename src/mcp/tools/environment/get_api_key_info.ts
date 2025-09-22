/**
 * Outil MCP pour récupérer les informations d'une clé API
 * Migration depuis SecureEnvManager vers MCP "function as tool"
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { getApiKey } from '@/lib/utils/SecureEnvManager.browser';

/**
 * Outil MCP pour récupérer les informations d'une clé API spécifique
 */
export const getApiKeyInfoTool: MCPTool = {
  name: "get_api_key_info",
  description: "Get API key information for a specific provider",
  inputSchema: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        enum: ["gemini", "openai", "anthropic", "claude"],
        description: "Provider to get API key info for"
      },
      includePreview: {
        type: "boolean",
        description: "Include masked preview of the key",
        optional: true
      }
    },
    required: ["provider"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { provider, includePreview = true } = args;
      
      // Récupérer la clé API
      const apiKey = getApiKey(provider);
      
      if (!apiKey) {
        return {
          success: true,
          data: {
            provider,
            present: false,
            preview: 'absent',
            message: `No API key found for provider: ${provider}`
          },
          timestamp: new Date().toISOString()
        };
      }
      
      // Vérifier si c'est un placeholder
      const placeholderPatterns = [
        'your_', 'your-', 'example_', 'example-', 'placeholder', 
        'replace_', 'replace-', 'api_key_here', 'key_here'
      ];
      
      const keyLower = apiKey.toLowerCase();
      const isPlaceholder = placeholderPatterns.some(pattern => keyLower.includes(pattern));
      
      let preview = 'set';
      if (includePreview && !isPlaceholder) {
        preview = apiKey.length >= 10 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-3)}` : 'set';
      } else if (isPlaceholder) {
        preview = 'placeholder';
      }
      
      return {
        success: true,
        data: {
          provider,
          present: !isPlaceholder,
          preview,
          isPlaceholder,
          keyLength: apiKey.length,
          message: isPlaceholder 
            ? `Placeholder key detected for provider: ${provider}`
            : `Valid API key found for provider: ${provider}`
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get API key info: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil get_api_key_info
 */
export async function testGetApiKeyInfoTool(): Promise<void> {
  console.log('🧪 Test get_api_key_info MCP Tool');
  
  const providers = ['gemini', 'openai', 'anthropic', 'claude'];
  
  for (const provider of providers) {
    const result = await getApiKeyInfoTool.handler({ provider });
    console.log(`✅ ${provider}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (result.success) {
      const data = result.data;
      console.log(`   Present: ${data.present}`);
      console.log(`   Preview: ${data.preview}`);
      console.log(`   Message: ${data.message}`);
    } else {
      console.error(`   Error: ${result.error}`);
    }
  }
  
  // Test avec preview désactivé
  const noPreviewResult = await getApiKeyInfoTool.handler({
    provider: 'gemini',
    includePreview: false
  });
  console.log(`✅ No preview: ${noPreviewResult.success ? 'SUCCESS' : 'FAILED'}`);
}