/**
 * Registre des outils MCP pour l'environnement
 */

import { MCPToolRegistry } from '@/mcp/types/MCPTool';
import { checkApiKeysTool } from './check_api_keys';
import { getApiKeyInfoTool } from './get_api_key_info';
import { validateEnvironmentTool } from './validate_environment';

/**
 * Registre des outils d'environnement MCP
 */
export const environmentTools: MCPToolRegistry = {
  check_api_keys: checkApiKeysTool,
  get_api_key_info: getApiKeyInfoTool,
  validate_environment: validateEnvironmentTool
};

/**
 * Test de tous les outils d'environnement
 */
export async function testEnvironmentTools(): Promise<void> {
  console.log('🧪 Test de tous les outils d\'environnement MCP');
  
  // Test check_api_keys
  const checkResult = await checkApiKeysTool.handler({});
  console.log(`📋 Check API keys: ${checkResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  // Test get_api_key_info
  const infoResult = await getApiKeyInfoTool.handler({ provider: 'gemini' });
  console.log(`🔑 Get API key info: ${infoResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  // Test validate_environment
  const validateResult = await validateEnvironmentTool.handler({
    requiredProviders: ['gemini']
  });
  console.log(`✅ Validate environment: ${validateResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  console.log('✅ Tests des outils d\'environnement terminés');
}