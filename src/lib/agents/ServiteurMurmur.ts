/**
 * Interfaces pour le système de murmures proactifs des serviteurs
 */

import { AlgarethContext } from './AlgarethAgent';
import { ServiteurSuggestion } from './PertinenceAnalyzer';

/**
 * Murmure d'un serviteur à Algareth
 */
export interface ServiteurMurmur {
  serviteur: string;
  message: string;
  informations: any;
  urgence: 'faible' | 'moyenne' | 'élevée';
  discret: boolean;
  timestamp: string;
  processingTime: number;
}

/**
 * Agent serviteur capable de préparer des murmures
 */
export abstract class ServiteurAgent {
  protected name: string;
  protected description: string;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  /**
   * Prépare un murmure pour Algareth basé sur la question utilisateur
   */
  abstract prepareMurmur(
    userMessage: string, 
    context: AlgarethContext, 
    suggestion: ServiteurSuggestion
  ): Promise<ServiteurMurmur>;

  /**
   * Génère le message du murmure
   */
  protected abstract generateMurmurMessage(
    userName: string, 
    informations: any, 
    suggestion: ServiteurSuggestion
  ): string;

  /**
   * Obtient le nom du serviteur
   */
  getName(): string {
    return this.name;
  }

  /**
   * Obtient la description du serviteur
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Teste le serviteur
   */
  async testServiteur(): Promise<boolean> {
    try {
      const testContext: AlgarethContext = {
        userId: 'test_user',
        userName: 'Test User',
        currentSession: 'test_session',
        userMessage: 'Test message',
        conversationHistory: [],
        sessionStartTime: new Date().toISOString()
      };

      const testSuggestion: ServiteurSuggestion = {
        serviteur: this.name,
        pertinence: 0.8,
        raison: 'Test',
        urgence: 'moyenne'
      };

      const murmur = await this.prepareMurmur('Test message', testContext, testSuggestion);
      return murmur !== null;
    } catch (error) {
      console.error(`❌ Erreur test serviteur ${this.name}:`, error);
      return false;
    }
  }
}

/**
 * Informations spécifiques à l'archiviste
 */
export interface ArchivistInformations {
  memories: any[];
  relationship: {
    level: string;
    trustLevel: number;
    comfortLevel: number;
    evolution: string;
  };
  emotions: {
    patterns: string[];
    currentMood: string;
  };
  personality: {
    communicationStyle: string;
    interests: string[];
    preferences: string[];
  };
}

/**
 * Informations spécifiques au générateur d'images
 */
export interface ImageGeneratorInformations {
  imagePrompt: string;
  style: string;
  dimensions: string;
  estimatedTime: number;
  canGenerate: boolean;
}

/**
 * Informations spécifiques à l'assistant de recherche
 */
export interface ResearchAssistantInformations {
  researchQuery: string;
  sources: string[];
  keyFindings: string[];
  confidence: number;
  lastUpdated: string;
}

/**
 * Informations spécifiques à l'assistant de code
 */
export interface CodeAssistantInformations {
  codeRequest: string;
  language: string;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTime: number;
  canHelp: boolean;
}