/**
 * Outil MCP pour valider l'environnement
 * Migration depuis SecureEnvManager vers MCP "function as tool"
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { loadProjectEnvironment, checkApiKeys } from '@/lib/utils/SecureEnvManager.browser';

/**
 * Outil MCP pour valider la configuration de l'environnement
 */
export const validateEnvironmentTool: MCPTool = {
  name: "validate_environment",
  description: "Validate environment configuration and setup",
  inputSchema: {
    type: "object",
    properties: {
      checkApiKeys: {
        type: "boolean",
        description: "Check API keys availability",
        optional: true
      },
      checkEnvVars: {
        type: "boolean",
        description: "Check environment variables",
        optional: true
      },
      requiredProviders: {
        type: "array",
        items: { type: "string" },
        description: "List of required providers",
        optional: true
      }
    }
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { 
        checkApiKeys: shouldCheckApiKeys = true, 
        checkEnvVars = true,
        requiredProviders = ['gemini']
      } = args;
      
      const validation = {
        valid: true,
        errors: [] as string[],
        warnings: [] as string[],
        info: {} as Record<string, any>
      };
      
      // Vérifier les variables d'environnement
      if (checkEnvVars) {
        try {
          const applied = loadProjectEnvironment();
          validation.info.environmentVariables = {
            loaded: Object.keys(applied).length,
            variables: Object.keys(applied)
          };
          
          if (Object.keys(applied).length === 0) {
            validation.warnings.push('No environment variables loaded');
          }
        } catch (error) {
          validation.errors.push(`Failed to load environment: ${error}`);
          validation.valid = false;
        }
      }
      
      // Vérifier les clés API
      if (shouldCheckApiKeys) {
        try {
          const apiKeys = checkApiKeys();
          const availableProviders = Object.entries(apiKeys)
            .filter(([_, info]) => info.present)
            .map(([provider, _]) => provider);
          
          validation.info.apiKeys = {
            available: availableProviders,
            total: Object.keys(apiKeys).length,
            details: apiKeys
          };
          
          // Vérifier les providers requis
          for (const provider of requiredProviders) {
            if (!apiKeys[provider] || !apiKeys[provider].present) {
              validation.errors.push(`Required provider '${provider}' is not available`);
              validation.valid = false;
            }
          }
          
          if (availableProviders.length === 0) {
            validation.warnings.push('No API keys available');
          }
        } catch (error) {
          validation.errors.push(`Failed to check API keys: ${error}`);
          validation.valid = false;
        }
      }
      
      // Vérifier les variables d'environnement critiques
      const criticalVars = ['NODE_ENV', 'NEXT_PUBLIC_APP_URL'];
      for (const varName of criticalVars) {
        if (!process.env[varName]) {
          validation.warnings.push(`Critical environment variable '${varName}' is not set`);
        }
      }
      
      return {
        success: true,
        data: {
          validation,
          summary: {
            valid: validation.valid,
            errorCount: validation.errors.length,
            warningCount: validation.warnings.length,
            hasApiKeys: validation.info.apiKeys?.available?.length > 0,
            hasEnvVars: validation.info.environmentVariables?.loaded > 0
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to validate environment: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Test de l'outil validate_environment
 */
export async function testValidateEnvironmentTool(): Promise<void> {
  console.log('🧪 Test validate_environment MCP Tool');
  
  // Test complet
  const fullResult = await validateEnvironmentTool.handler({
    checkApiKeys: true,
    checkEnvVars: true,
    requiredProviders: ['gemini']
  });
  
  console.log(`✅ Full validation: ${fullResult.success ? 'SUCCESS' : 'FAILED'}`);
  if (fullResult.success) {
    const summary = fullResult.data.summary;
    console.log(`📊 Valid: ${summary.valid}`);
    console.log(`📊 Errors: ${summary.errorCount}, Warnings: ${summary.warningCount}`);
    console.log(`📊 Has API keys: ${summary.hasApiKeys}`);
    console.log(`📊 Has env vars: ${summary.hasEnvVars}`);
  }
  
  // Test avec providers requis
  const requiredResult = await validateEnvironmentTool.handler({
    requiredProviders: ['gemini', 'openai', 'anthropic']
  });
  
  console.log(`✅ Required providers: ${requiredResult.success ? 'SUCCESS' : 'FAILED'}`);
  if (requiredResult.success) {
    console.log(`📊 Validation result: ${requiredResult.data.summary.valid ? 'VALID' : 'INVALID'}`);
  }
}