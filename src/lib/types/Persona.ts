/**
 * Types pour les personnalités
 */

export interface Persona {
  name: string;
  title: string;
  style: string;
  traits: string[];
  manifestation: string;
  description: string;
  memoryTrait: string;
  userName?: string;
}

export interface PersonaConfig {
  basePath?: string;
  defaultPersona?: Persona;
}

export interface LuciformData {
  name: string;
  title: string;
  description: string;
  manifestation: string;
  traits?: string[];
}