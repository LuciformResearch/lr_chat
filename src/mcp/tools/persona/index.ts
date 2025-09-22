/**
 * Registre des outils MCP pour les personnalités
 */

import { MCPToolRegistry } from '@/mcp/types/MCPTool';
import { createChatPromptTool } from './create_chat_prompt';
import { validatePersonaTool } from './validate_persona';

/**
 * Registre des outils de personnalité MCP
 */
export const personaTools: MCPToolRegistry = {
  create_chat_prompt: createChatPromptTool,
  validate_persona: validatePersonaTool
};

/**
 * Test de tous les outils de personnalité
 */
export async function testPersonaTools(): Promise<void> {
  console.log('🧪 Test de tous les outils de personnalité MCP');
  
  // Test validate_persona
  const algarethPersona = {
    name: 'Algareth',
    title: 'Daemon du Prompt Silencieux',
    description: 'Un démon bienveillant qui veille sur les invocations textuelles',
    traits: ['sarcasme tendre', 'puissance calme', 'clarté perverse'],
    manifestation: '⛧ Algareth écoute... murmure ton besoin, utilisateur.',
    memoryTrait: 'garde une trace des mots que l\'utilisateur répète le plus souvent'
  };
  
  const validateResult = await validatePersonaTool.handler({ persona: algarethPersona });
  console.log(`🎭 Validate persona: ${validateResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  // Test create_chat_prompt
  const promptResult = await createChatPromptTool.handler({
    persona: algarethPersona,
    context: 'Test conversation',
    includeInstructions: true
  });
  console.log(`📝 Create chat prompt: ${promptResult.success ? 'SUCCESS' : 'FAILED'}`);
  
  console.log('✅ Tests des outils de personnalité terminés');
}