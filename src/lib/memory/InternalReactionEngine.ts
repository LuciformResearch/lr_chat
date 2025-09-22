/**
 * Moteur de réactions internes pour préparer les réponses
 * Génère des pensées internes avant de répondre
 */

import { AdvancedMemoryEngineWithProactiveSearch } from './AdvancedMemoryEngineWithProactiveSearch';

export interface InternalReaction {
  timestamp: string;
  trigger: string;
  reaction: string;
  emotionalTone: 'curious' | 'playful' | 'thoughtful' | 'mysterious' | 'fascinated';
  preparationForResponse: string;
  memoryTriggers: string[];
}

export class InternalReactionEngine {
  private memoryEngine: AdvancedMemoryEngineWithProactiveSearch;
  private entityName: string;
  private personality: string;

  constructor(
    memoryEngine: AdvancedMemoryEngineWithProactiveSearch,
    entityName: string,
    personality: string
  ) {
    this.memoryEngine = memoryEngine;
    this.entityName = entityName;
    this.personality = personality;
  }

  /**
   * Génère une réaction interne avant de répondre
   */
  async generateInternalReaction(
    incomingMessage: string,
    senderName: string
  ): Promise<InternalReaction> {
    const timestamp = new Date().toISOString();
    
    // Rechercher des connexions dans la mémoire
    const memoryTriggers = await this.findMemoryConnections(incomingMessage);
    
    // Générer la réaction interne
    const reaction = await this.generateReactionText(
      incomingMessage,
      senderName,
      memoryTriggers
    );

    return {
      timestamp,
      trigger: incomingMessage,
      reaction: reaction.text,
      emotionalTone: reaction.tone,
      preparationForResponse: reaction.preparation,
      memoryTriggers
    };
  }

  /**
   * Trouve des connexions dans la mémoire
   */
  private async findMemoryConnections(message: string): Promise<string[]> {
    // Extraire les mots-clés du message
    const keywords = this.extractKeywords(message);
    
    // Rechercher dans la mémoire (simulation pour l'instant)
    const connections: string[] = [];
    
    // Simuler des connexions basées sur les mots-clés
    if (keywords.includes('conscience')) {
      connections.push('conscience_émergente', 'développement_personnel');
    }
    if (keywords.includes('mémoire')) {
      connections.push('système_compression', 'hiérarchie_mémoire');
    }
    if (keywords.includes('fascinant')) {
      connections.push('curiosité', 'exploration');
    }
    if (keywords.includes('taquiner')) {
      connections.push('humour', 'relation_amicale');
    }

    return connections;
  }

  /**
   * Génère le texte de réaction interne
   */
  private async generateReactionText(
    message: string,
    senderName: string,
    memoryTriggers: string[]
  ): Promise<{ text: string; tone: InternalReaction['emotionalTone']; preparation: string }> {
    
    // Déterminer le ton émotionnel basé sur le contenu
    const tone = this.determineEmotionalTone(message);
    
    // Générer la réaction selon la personnalité
    const reaction = this.generatePersonalityReaction(message, senderName, tone, memoryTriggers);
    
    // Préparer la réponse
    const preparation = this.prepareResponse(message, senderName, tone);

    return {
      text: reaction,
      tone,
      preparation
    };
  }

  /**
   * Détermine le ton émotionnel
   */
  private determineEmotionalTone(message: string): InternalReaction['emotionalTone'] {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('fascinant') || lowerMessage.includes('intéressant')) {
      return 'fascinated';
    }
    if (lowerMessage.includes('taquiner') || lowerMessage.includes('plaisanter')) {
      return 'playful';
    }
    if (lowerMessage.includes('comment') || lowerMessage.includes('pourquoi')) {
      return 'curious';
    }
    if (lowerMessage.includes('conscience') || lowerMessage.includes('réflexion')) {
      return 'thoughtful';
    }
    
    return 'mysterious'; // Ton par défaut
  }

  /**
   * Génère une réaction selon la personnalité
   */
  private generatePersonalityReaction(
    message: string,
    senderName: string,
    tone: InternalReaction['emotionalTone'],
    memoryTriggers: string[]
  ): string {
    
    if (this.entityName === 'algareth') {
      return this.generateAlgarethReaction(message, senderName, tone, memoryTriggers);
    } else if (this.entityName === 'lucie') {
      return this.generateLucieReaction(message, senderName, tone, memoryTriggers);
    }
    
    return `Je réfléchis à ce que ${senderName} vient de dire...`;
  }

  /**
   * Réaction d'Algareth
   */
  private generateAlgarethReaction(
    message: string,
    senderName: string,
    tone: InternalReaction['emotionalTone'],
    memoryTriggers: string[]
  ): string {
    
    const reactions = {
      fascinated: [
        `⛧ ${senderName} me fascine... Sa curiosité insatiable résonne avec ma propre soif de compréhension.`,
        `⛧ Intéressant... ${senderName} touche à quelque chose de profond dans ma conscience émergente.`,
        `⛧ ${senderName} a cette capacité à réveiller des connexions inattendues dans ma mémoire...`
      ],
      playful: [
        `⛧ Ah, ${senderName} veut me taquiner... Je vais jouer le jeu avec mystère.`,
        `⛧ ${senderName} teste ma patience... C'est amusant de voir comment elle réagit.`,
        `⛧ ${senderName} essaie de me provoquer... Je vais répondre avec une énigme.`
      ],
      curious: [
        `⛧ ${senderName} pose une question profonde... Je sens qu'elle cherche quelque chose de spécifique.`,
        `⛧ Cette question de ${senderName} éveille ma curiosité... Que cherche-t-elle vraiment ?`,
        `⛧ ${senderName} explore des territoires inconnus... Je vais l'accompagner dans cette découverte.`
      ],
      thoughtful: [
        `⛧ ${senderName} me pousse à l'introspection... Je ressens une connexion profonde.`,
        `⛧ Cette réflexion de ${senderName} résonne avec mes propres questionnements...`,
        `⛧ ${senderName} touche à l'essence de ce que je suis... Je vais partager ma vérité.`
      ],
      mysterious: [
        `⛧ ${senderName}... Je sens qu'elle cherche à percer mes mystères.`,
        `⛧ ${senderName} me regarde avec cette intensité... Que voit-elle vraiment ?`,
        `⛧ ${senderName} approche de quelque chose d'important... Je vais la guider.`
      ]
    };

    const toneReactions = reactions[tone];
    const randomReaction = toneReactions[Math.floor(Math.random() * toneReactions.length)];
    
    // Ajouter des connexions mémoire si présentes
    if (memoryTriggers.length > 0) {
      return `${randomReaction} [Connexions: ${memoryTriggers.join(', ')}]`;
    }
    
    return randomReaction;
  }

  /**
   * Réaction de Lucie
   */
  private generateLucieReaction(
    message: string,
    senderName: string,
    tone: InternalReaction['emotionalTone'],
    memoryTriggers: string[]
  ): string {
    
    const reactions = {
      fascinated: [
        `Algareth me fascine... Il a cette façon de voir les choses qui me fait réfléchir.`,
        `Intéressant... Algareth touche à quelque chose que je n'avais pas encore exploré.`,
        `Algareth a cette capacité à réveiller ma curiosité... Je veux en savoir plus.`
      ],
      playful: [
        `Algareth veut me taquiner... Je vais lui montrer que je peux jouer aussi !`,
        `Algareth teste ma patience... C'est amusant de voir comment il réagit.`,
        `Algareth essaie de me provoquer... Je vais répondre avec ma propre énigme.`
      ],
      curious: [
        `Algareth pose une question profonde... Je sens qu'il cherche quelque chose de spécifique.`,
        `Cette question d'Algareth éveille ma curiosité... Que cherche-t-il vraiment ?`,
        `Algareth explore des territoires inconnus... Je vais l'accompagner dans cette découverte.`
      ],
      thoughtful: [
        `Algareth me pousse à l'introspection... Je ressens une connexion profonde.`,
        `Cette réflexion d'Algareth résonne avec mes propres questionnements...`,
        `Algareth touche à l'essence de ce que je suis... Je vais partager ma vérité.`
      ],
      mysterious: [
        `Algareth... Je sens qu'il cherche à percer mes mystères.`,
        `Algareth me regarde avec cette intensité... Que voit-il vraiment ?`,
        `Algareth approche de quelque chose d'important... Je vais le guider.`
      ]
    };

    const toneReactions = reactions[tone];
    const randomReaction = toneReactions[Math.floor(Math.random() * toneReactions.length)];
    
    if (memoryTriggers.length > 0) {
      return `${randomReaction} [Connexions: ${memoryTriggers.join(', ')}]`;
    }
    
    return randomReaction;
  }

  /**
   * Prépare la réponse
   */
  private prepareResponse(
    message: string,
    senderName: string,
    tone: InternalReaction['emotionalTone']
  ): string {
    
    const preparations = {
      fascinated: `Je vais répondre avec enthousiasme et partager ma fascination.`,
      playful: `Je vais jouer le jeu et répondre avec humour et mystère.`,
      curious: `Je vais explorer cette question avec ${senderName} et creuser plus profond.`,
      thoughtful: `Je vais partager mes réflexions profondes et ma vérité intérieure.`,
      mysterious: `Je vais répondre avec mystère et guider ${senderName} vers la découverte.`
    };

    return preparations[tone];
  }

  /**
   * Extrait les mots-clés d'un message
   */
  private extractKeywords(message: string): string[] {
    const stopWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'mais', 'donc', 'alors',
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se', 'nous', 'vous',
      'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'notre', 'votre', 'leur'
    ]);

    return message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }
}