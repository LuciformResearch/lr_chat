/**
 * Outil MCP pour créer un prompt de chat avec personnalité
 * Migration depuis PersonaManager vers MCP "function as tool"
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { Persona } from '@/lib/types/Persona';
import { PersonaManager } from '@/lib/managers/PersonaManager';

/**
 * Outil MCP pour créer un prompt de chat avec personnalité
 */
export const createChatPromptTool: MCPTool = {
  name: "create_chat_prompt",
  description: "Create a chat prompt with persona",
  inputSchema: {
    type: "object",
    properties: {
      persona: {
        type: "object",
        description: "Persona object with name, title, description, etc.",
        properties: {
          name: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          traits: { type: "array", items: { type: "string" } },
          manifestation: { type: "string" },
          memoryTrait: { type: "string" },
          userName: { type: "string", optional: true }
        },
        required: ["name", "title", "description", "traits", "manifestation", "memoryTrait"]
      },
      context: {
        type: "string",
        description: "Additional context for the prompt",
        optional: true
      },
      includeInstructions: {
        type: "boolean",
        description: "Include detailed instructions in the prompt",
        optional: true
      }
    },
    required: ["persona"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { persona, context, includeInstructions = true } = args;
      
      // Valider la personnalité
      const validation = validatePersona(persona);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid persona: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString()
        };
      }
      
      // Créer le gestionnaire de personnalité
      const personaManager = new PersonaManager();
      
      // Créer le prompt de chat
      let prompt = personaManager.createChatPrompt(persona);
      
      // Ajouter le contexte si fourni
      if (context) {
        prompt += `\n\nContexte supplémentaire:\n${context}`;
      }
      
      // Ajouter des instructions détaillées si demandé
      if (includeInstructions) {
        prompt += `\n\nInstructions détaillées:\n`;
        prompt += `- Réponds toujours en tant que ${persona.name}\n`;
        prompt += `- Utilise le style: ${persona.traits.join(', ')}\n`;
        prompt += `- Sois cohérent avec la personnalité définie\n`;
        prompt += `- Adapte ton langage au contexte de la conversation\n`;
      }
      
      return {
        success: true,
        data: {
          prompt,
          persona: {
            name: persona.name,
            title: persona.title,
            traits: persona.traits
          },
          context: context || null,
          includeInstructions,
          promptLength: prompt.length,
          wordCount: prompt.split(' ').length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create chat prompt: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Valide une personnalité
 */
function validatePersona(persona: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!persona.name || typeof persona.name !== 'string' || persona.name.trim() === '') {
    errors.push('Name is required and must be a non-empty string');
  }
  
  if (!persona.title || typeof persona.title !== 'string' || persona.title.trim() === '') {
    errors.push('Title is required and must be a non-empty string');
  }
  
  if (!persona.description || typeof persona.description !== 'string' || persona.description.trim() === '') {
    errors.push('Description is required and must be a non-empty string');
  }
  
  if (!persona.traits || !Array.isArray(persona.traits) || persona.traits.length === 0) {
    errors.push('Traits is required and must be a non-empty array');
  }
  
  if (!persona.manifestation || typeof persona.manifestation !== 'string' || persona.manifestation.trim() === '') {
    errors.push('Manifestation is required and must be a non-empty string');
  }
  
  if (!persona.memoryTrait || typeof persona.memoryTrait !== 'string' || persona.memoryTrait.trim() === '') {
    errors.push('MemoryTrait is required and must be a non-empty string');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Test de l'outil create_chat_prompt
 */
export async function testCreateChatPromptTool(): Promise<void> {
  console.log('🧪 Test create_chat_prompt MCP Tool');
  
  // Test avec Algareth
  const algarethPersona = {
    name: 'Algareth',
    title: 'Daemon du Prompt Silencieux',
    description: 'Un démon bienveillant qui veille sur les invocations textuelles',
    traits: ['sarcasme tendre', 'puissance calme', 'clarté perverse'],
    manifestation: '⛧ Algareth écoute... murmure ton besoin, utilisateur.',
    memoryTrait: 'garde une trace des mots que l\'utilisateur répète le plus souvent',
    userName: 'Alice'
  };
  
  const result = await createChatPromptTool.handler({
    persona: algarethPersona,
    context: 'Conversation de test avec Alice',
    includeInstructions: true
  });
  
  console.log(`✅ Create chat prompt: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  if (result.success) {
    console.log(`📝 Prompt length: ${result.data.promptLength} characters`);
    console.log(`📝 Word count: ${result.data.wordCount} words`);
    console.log(`🎭 Persona: ${result.data.persona.name}`);
  } else {
    console.error(`❌ Error: ${result.error}`);
  }
  
  // Test avec personnalité invalide
  const invalidResult = await createChatPromptTool.handler({
    persona: { name: 'Test' } // Manque des champs requis
  });
  
  console.log(`✅ Invalid persona test: ${invalidResult.success ? 'FAILED (should fail)' : 'SUCCESS (correctly failed)'}`);
}