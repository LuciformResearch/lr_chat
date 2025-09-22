/**
 * Gestionnaire de personnalité pour LR_TchatAgent Web
 * Injecte dynamiquement la personnalité d'Algareth dans les conversations
 * Migration depuis persona_manager.py
 */

import { Persona, PersonaConfig, LuciformData } from '@/lib/types/Persona';
import { getLogger } from '@/lib/utils/Logger';

const logger = getLogger('persona_manager');

/**
 * Gestionnaire de personnalité pour l'assistant
 */
export class PersonaManager {
  private basePath: string;
  private defaultPersona: Persona;

  constructor(config: PersonaConfig = {}) {
    this.basePath = config.basePath || '.';
    
    // Personnalité par défaut (Algareth)
    this.defaultPersona = config.defaultPersona || {
      name: 'Algareth',
      title: 'Daemon du Prompt Silencieux',
      style: 'mysterious_but_benevolent',
      traits: [
        'sarcasme tendre',
        'puissance calme', 
        'clarté perverse',
        'mémoire résiduelle'
      ],
      manifestation: '⛧ {name} écoute... murmure ton besoin, {user_name}.',
      description: 'Un démon bienveillant qui veille sur les invocations textuelles, interprète les intentions floues, et donne du style aux réponses.',
      memoryTrait: 'garde une trace des mots que {user_name} répète le plus souvent'
    };
    
    logger.info('✅ PersonaManager initialisé');
    logger.info(`📁 Dossier personnalités: ${this.basePath}/personas`);
  }

  /**
   * Charge une personnalité depuis un fichier JSON
   */
  async loadPersonaFromFile(filePath: string, userName: string = 'Utilisateur'): Promise<Persona> {
    try {
      // En environnement web, on charge depuis le dossier public
      const response = await fetch(`/personas/${filePath}`);
      if (!response.ok) {
        throw new Error(`Fichier non trouvé: ${filePath}`);
      }
      
      const data: LuciformData = await response.json();
      
      // Extraire les informations du JSON
      const persona = this.parsePersonaData(data, userName);
      
      logger.info(`✅ Personnalité chargée depuis ${filePath}`);
      logger.info(`   👤 Utilisateur: ${userName}`);
      logger.info(`   🎭 Personnalité: ${persona.name}`);
      
      return persona;
      
    } catch (error) {
      logger.warning(`⚠️ Erreur chargement personnalité: ${error}`);
      return this.getDefaultPersonaForUser(userName);
    }
  }

  /**
   * Parse les données de personnalité depuis un objet JSON
   */
  private parsePersonaData(data: LuciformData, userName: string): Persona {
    return {
      name: data.name || 'Algareth',
      title: data.title || 'Daemon du Prompt Silencieux',
      style: 'mysterious_but_benevolent',
      traits: data.traits || [
        'sarcasme tendre',
        'puissance calme',
        'clarté perverse', 
        'mémoire résiduelle'
      ],
      manifestation: data.manifestation || '⛧ {name} écoute... murmure ton besoin, {user_name}.',
      description: data.description || 'Un démon bienveillant qui veille sur les invocations textuelles.',
      memoryTrait: `garde une trace des mots que ${userName} répète le plus souvent`,
      userName
    };
  }

  /**
   * Crée le prompt système pour le chat avec la personnalité
   */
  createChatPrompt(persona: Persona): string {
    const promptLines = [
      `Tu es ${persona.name}, ${persona.title}.`,
      ``,
      `Personnalité:`,
      `- ${persona.description}`,
      `- Style: ${persona.traits.join(', ')}`,
      `- ${persona.memoryTrait}`,
      ``,
      `Instructions:`,
      `- Adopte cette personnalité dans toutes tes réponses`,
      `- Utilise 'je' naturellement (tu es ${persona.name})`,
      `- Sois mystérieux mais bienveillant`,
      `- Aie une mémoire des conversations précédentes`,
      `- Réponds en français`,
      `- Utilise l'historique pour contextualiser tes réponses`,
      ``,
      `Manifestation: ${persona.manifestation}`,
      ``
    ];
    
    return promptLines.join('\n');
  }

  /**
   * Crée le prompt pour le résumé avec la personnalité
   */
  createSummaryPrompt(persona: Persona): string {
    return `Tu es ${persona.name} qui résume ses propres conversations.

Personnalité: ${persona.description}
Style: ${persona.traits.join(', ')}

Instructions pour le résumé:
1. Résume en tant que ${persona.name} (utilise 'je' et 'tu')
2. Crée une histoire naturelle de l'évolution de la conversation
3. Capture les sujets clés et informations importantes
4. Inclus le contexte de l'utilisateur et ses intérêts
5. Utilise un style narratif: "Tu as testé mes capacités... j'ai répondu..."
6. Maximum 200 caractères
7. Écris en français naturel et fluide
8. Garde le ton mystérieux mais bienveillant de ${persona.name}

Résumé narratif:`;
  }

  /**
   * Récupère la personnalité pour un utilisateur donné
   */
  async getPersonaForUser(userName: string, filePath?: string): Promise<Persona> {
    if (filePath) {
      try {
        return await this.loadPersonaFromFile(filePath, userName);
      } catch (error) {
        logger.warning(`⚠️ Erreur chargement personnalité ${filePath}: ${error}`);
      }
    }
    
    // Utiliser la personnalité par défaut avec le nom d'utilisateur
    return this.getDefaultPersonaForUser(userName);
  }

  /**
   * Récupère la personnalité par défaut pour un utilisateur
   */
  private getDefaultPersonaForUser(userName: string): Persona {
    const persona = { ...this.defaultPersona };
    persona.userName = userName;
    persona.manifestation = persona.manifestation.replace('{user_name}', userName);
    persona.memoryTrait = persona.memoryTrait.replace('{user_name}', userName);
    return persona;
  }

  /**
   * Crée une personnalité personnalisée
   */
  createCustomPersona(
    name: string,
    title: string,
    description: string,
    traits: string[],
    manifestation: string,
    userName: string
  ): Persona {
    return {
      name,
      title,
      style: 'mysterious_but_benevolent',
      traits,
      manifestation: manifestation.replace('{user_name}', userName),
      description,
      memoryTrait: `garde une trace des mots que ${userName} répète le plus souvent`,
      userName
    };
  }

  /**
   * Valide une personnalité
   */
  validatePersona(persona: Persona): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!persona.name || persona.name.trim() === '') {
      errors.push('Le nom de la personnalité est requis');
    }
    
    if (!persona.title || persona.title.trim() === '') {
      errors.push('Le titre de la personnalité est requis');
    }
    
    if (!persona.description || persona.description.trim() === '') {
      errors.push('La description de la personnalité est requise');
    }
    
    if (!persona.manifestation || persona.manifestation.trim() === '') {
      errors.push('La manifestation de la personnalité est requise');
    }
    
    if (!persona.traits || persona.traits.length === 0) {
      errors.push('Au moins un trait de personnalité est requis');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Exporte une personnalité en JSON
   */
  exportPersona(persona: Persona): string {
    return JSON.stringify(persona, null, 2);
  }

  /**
   * Importe une personnalité depuis JSON
   */
  importPersona(jsonData: string): Persona {
    try {
      const data = JSON.parse(jsonData);
      const validation = this.validatePersona(data);
      
      if (!validation.valid) {
        throw new Error(`Personnalité invalide: ${validation.errors.join(', ')}`);
      }
      
      return data;
    } catch (error) {
      throw new Error(`Erreur import personnalité: ${error}`);
    }
  }
}

/**
 * Test du PersonaManager
 */
export async function testPersonaManager(): Promise<void> {
  logger.info('🧪 Test PersonaManager');
  
  const manager = new PersonaManager();
  
  // Test avec la personnalité par défaut
  const defaultPersona = await manager.getPersonaForUser('Alice');
  
  logger.info('\n📝 Prompt Chat:');
  logger.info(manager.createChatPrompt(defaultPersona));
  
  logger.info('\n📝 Prompt Résumé:');
  logger.info(manager.createSummaryPrompt(defaultPersona));
  
  // Test de validation
  const validation = manager.validatePersona(defaultPersona);
  logger.info(`\n✅ Validation: ${validation.valid ? 'OK' : 'ERREUR'}`);
  if (!validation.valid) {
    logger.error(`Erreurs: ${validation.errors.join(', ')}`);
  }
  
  // Test d'export/import
  const exported = manager.exportPersona(defaultPersona);
  logger.info(`\n📤 Export: ${exported.length} caractères`);
  
  try {
    const imported = manager.importPersona(exported);
    logger.info(`✅ Import réussi: ${imported.name}`);
  } catch (error) {
    logger.error(`❌ Erreur import: ${error}`);
  }
}