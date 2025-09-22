/**
 * Outil MCP pour valider une personnalité
 * Migration depuis PersonaManager vers MCP "function as tool"
 */

import { MCPTool, MCPToolResult } from '@/mcp/types/MCPTool';
import { Persona } from '@/lib/types/Persona';

/**
 * Outil MCP pour valider une configuration de personnalité
 */
export const validatePersonaTool: MCPTool = {
  name: "validate_persona",
  description: "Validate a persona configuration",
  inputSchema: {
    type: "object",
    properties: {
      persona: {
        type: "object",
        description: "Persona object to validate",
        properties: {
          name: { type: "string" },
          title: { type: "string" },
          style: { type: "string", optional: true },
          traits: { type: "array", items: { type: "string" } },
          manifestation: { type: "string" },
          description: { type: "string" },
          memoryTrait: { type: "string" },
          userName: { type: "string", optional: true }
        }
      },
      strict: {
        type: "boolean",
        description: "Use strict validation (check all fields)",
        optional: true
      }
    },
    required: ["persona"]
  },
  handler: async (args): Promise<MCPToolResult> => {
    try {
      const { persona, strict = false } = args;
      
      const validation = validatePersonaData(persona, strict);
      
      return {
        success: true,
        data: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          persona: {
            name: persona.name || 'Unknown',
            title: persona.title || 'Unknown',
            traitsCount: persona.traits?.length || 0,
            hasManifestation: !!persona.manifestation,
            hasDescription: !!persona.description,
            hasMemoryTrait: !!persona.memoryTrait
          },
          suggestions: validation.suggestions
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to validate persona: ${error}`,
        timestamp: new Date().toISOString()
      };
    }
  }
};

/**
 * Valide les données d'une personnalité
 */
function validatePersonaData(persona: any, strict: boolean): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Validation des champs requis
  if (!persona.name || typeof persona.name !== 'string' || persona.name.trim() === '') {
    errors.push('Name is required and must be a non-empty string');
  } else if (persona.name.length < 2) {
    warnings.push('Name is very short, consider a more descriptive name');
  }
  
  if (!persona.title || typeof persona.title !== 'string' || persona.title.trim() === '') {
    errors.push('Title is required and must be a non-empty string');
  }
  
  if (!persona.description || typeof persona.description !== 'string' || persona.description.trim() === '') {
    errors.push('Description is required and must be a non-empty string');
  } else if (persona.description.length < 20) {
    warnings.push('Description is quite short, consider adding more details');
  }
  
  if (!persona.traits || !Array.isArray(persona.traits) || persona.traits.length === 0) {
    errors.push('Traits is required and must be a non-empty array');
  } else {
    if (persona.traits.length < 2) {
      warnings.push('Consider adding more traits for a richer personality');
    }
    if (persona.traits.length > 10) {
      warnings.push('Many traits might make the personality inconsistent');
    }
    
    // Vérifier que tous les traits sont des strings
    const invalidTraits = persona.traits.filter((trait: any) => typeof trait !== 'string' || trait.trim() === '');
    if (invalidTraits.length > 0) {
      errors.push(`Invalid traits found: ${invalidTraits.length} non-string or empty traits`);
    }
  }
  
  if (!persona.manifestation || typeof persona.manifestation !== 'string' || persona.manifestation.trim() === '') {
    errors.push('Manifestation is required and must be a non-empty string');
  } else if (!persona.manifestation.includes('{name}') && !persona.manifestation.includes(persona.name)) {
    warnings.push('Manifestation should include the persona name or {name} placeholder');
  }
  
  if (!persona.memoryTrait || typeof persona.memoryTrait !== 'string' || persona.memoryTrait.trim() === '') {
    errors.push('MemoryTrait is required and must be a non-empty string');
  }
  
  // Validation stricte
  if (strict) {
    if (!persona.style || typeof persona.style !== 'string') {
      warnings.push('Style is recommended for strict validation');
    }
    
    if (!persona.userName && !persona.memoryTrait.includes('{user_name}')) {
      warnings.push('Consider including userName or {user_name} placeholder in memoryTrait');
    }
  }
  
  // Suggestions d'amélioration
  if (persona.name && persona.name.length > 0) {
    if (!persona.manifestation?.toLowerCase().includes(persona.name.toLowerCase())) {
      suggestions.push('Consider including the persona name in the manifestation');
    }
  }
  
  if (persona.traits && persona.traits.length > 0) {
    const hasContradictoryTraits = checkContradictoryTraits(persona.traits);
    if (hasContradictoryTraits.length > 0) {
      suggestions.push(`Consider reviewing potentially contradictory traits: ${hasContradictoryTraits.join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Vérifie les traits contradictoires
 */
function checkContradictoryTraits(traits: string[]): string[] {
  const contradictory = [];
  const traitLower = traits.map(t => t.toLowerCase());
  
  // Paires de traits potentiellement contradictoires
  const contradictions = [
    ['gentil', 'méchant'],
    ['calme', 'agité'],
    ['sérieux', 'drôle'],
    ['timide', 'extraverti'],
    ['patient', 'impulsif']
  ];
  
  for (const [trait1, trait2] of contradictions) {
    if (traitLower.some(t => t.includes(trait1)) && traitLower.some(t => t.includes(trait2))) {
      contradictory.push(`${trait1}/${trait2}`);
    }
  }
  
  return contradictory;
}

/**
 * Test de l'outil validate_persona
 */
export async function testValidatePersonaTool(): Promise<void> {
  console.log('🧪 Test validate_persona MCP Tool');
  
  // Test avec personnalité valide
  const validPersona = {
    name: 'Algareth',
    title: 'Daemon du Prompt Silencieux',
    description: 'Un démon bienveillant qui veille sur les invocations textuelles',
    traits: ['sarcasme tendre', 'puissance calme', 'clarté perverse'],
    manifestation: '⛧ Algareth écoute... murmure ton besoin, utilisateur.',
    memoryTrait: 'garde une trace des mots que l\'utilisateur répète le plus souvent'
  };
  
  const validResult = await validatePersonaTool.handler({ persona: validPersona });
  console.log(`✅ Valid persona: ${validResult.success ? 'SUCCESS' : 'FAILED'}`);
  if (validResult.success) {
    console.log(`📊 Valid: ${validResult.data.valid}`);
    console.log(`📊 Errors: ${validResult.data.errors.length}, Warnings: ${validResult.data.warnings.length}`);
  }
  
  // Test avec personnalité invalide
  const invalidPersona = {
    name: '',
    title: 'Test',
    traits: []
  };
  
  const invalidResult = await validatePersonaTool.handler({ persona: invalidPersona });
  console.log(`✅ Invalid persona: ${invalidResult.success ? 'SUCCESS' : 'FAILED'}`);
  if (invalidResult.success) {
    console.log(`📊 Valid: ${invalidResult.data.valid}`);
    console.log(`📊 Errors: ${invalidResult.data.errors.length}`);
  }
  
  // Test avec validation stricte
  const strictResult = await validatePersonaTool.handler({ 
    persona: validPersona, 
    strict: true 
  });
  console.log(`✅ Strict validation: ${strictResult.success ? 'SUCCESS' : 'FAILED'}`);
}