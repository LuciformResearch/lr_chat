/**
 * Logger pour la mémoire hiérarchique et les prompts Algareth
 * Active uniquement en mode debug pour tracer les données passées à Algareth
 */

import fs from 'fs';
import path from 'path';

export interface HierarchicalMemoryLogData {
  timestamp: string;
  sessionId: string;
  userId: string;
  userMessage: string;
  hierarchicalMemoryContext?: string;
  hierarchicalMemoryLength?: number;
  hierarchicalMemoryStats?: any;
  fullPrompt?: string;
  promptLength?: number;
  murmurs?: any[];
  conversationHistory?: any[];
}

export class HierarchicalMemoryLogger {
  private static instance: HierarchicalMemoryLogger;
  private isEnabled: boolean = false;
  private logsDir: string = '';

  private constructor() {
    // Activer seulement en mode debug
    this.isEnabled = process.env.NODE_ENV === 'development' && process.env.DEBUG_HIERARCHICAL_MEMORY === 'true';
    
    if (this.isEnabled) {
      this.logsDir = path.join(process.cwd(), 'logs', 'hierarchicalMemory');
      this.ensureLogsDirectory();
    }
  }

  public static getInstance(): HierarchicalMemoryLogger {
    if (!HierarchicalMemoryLogger.instance) {
      HierarchicalMemoryLogger.instance = new HierarchicalMemoryLogger();
    }
    return HierarchicalMemoryLogger.instance;
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Log les données de mémoire hiérarchique
   */
  public logHierarchicalMemory(data: HierarchicalMemoryLogData): void {
    if (!this.isEnabled) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sessionId = data.sessionId.substring(0, 8); // Raccourcir pour le nom de fichier
      const filename = `session-${sessionId}-${timestamp}.log`;
      const filepath = path.join(this.logsDir, filename);

      const logContent = this.formatLogContent(data);
      
      fs.writeFileSync(filepath, logContent, 'utf8');
      console.log(`📝 Log mémoire hiérarchique écrit: ${filename}`);
      
    } catch (error) {
      console.error('❌ Erreur écriture log mémoire hiérarchique:', error);
    }
  }

  /**
   * Log le prompt complet envoyé à Algareth
   */
  public logFullPrompt(data: HierarchicalMemoryLogData): void {
    if (!this.isEnabled) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sessionId = data.sessionId.substring(0, 8);
      const filename = `prompt-${sessionId}-${timestamp}.log`;
      const filepath = path.join(this.logsDir, filename);

      const logContent = this.formatPromptLogContent(data);
      
      fs.writeFileSync(filepath, logContent, 'utf8');
      console.log(`📝 Log prompt complet écrit: ${filename}`);
      
    } catch (error) {
      console.error('❌ Erreur écriture log prompt:', error);
    }
  }

  private formatLogContent(data: HierarchicalMemoryLogData): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('MÉMOIRE HIÉRARCHIQUE - LOG DEBUG');
    lines.push('='.repeat(80));
    lines.push(`Timestamp: ${data.timestamp}`);
    lines.push(`Session ID: ${data.sessionId}`);
    lines.push(`User ID: ${data.userId}`);
    lines.push(`User Message: "${data.userMessage}"`);
    lines.push('');
    
    if (data.hierarchicalMemoryContext) {
      lines.push('MÉMOIRE HIÉRARCHIQUE CONTEXT:');
      lines.push('-'.repeat(40));
      lines.push(data.hierarchicalMemoryContext);
      lines.push('-'.repeat(40));
      lines.push(`Longueur: ${data.hierarchicalMemoryLength} caractères`);
    } else {
      lines.push('MÉMOIRE HIÉRARCHIQUE: AUCUN CONTEXTE');
    }
    
    lines.push('');
    
    if (data.hierarchicalMemoryStats) {
      lines.push('STATISTIQUES MÉMOIRE HIÉRARCHIQUE:');
      lines.push('-'.repeat(40));
      lines.push(JSON.stringify(data.hierarchicalMemoryStats, null, 2));
    }
    
    lines.push('');
    
    if (data.murmurs && data.murmurs.length > 0) {
      lines.push('MURMURES DIVINS:');
      lines.push('-'.repeat(40));
      data.murmurs.forEach((murmur, index) => {
        lines.push(`${index + 1}. ${murmur.type}: ${murmur.content.substring(0, 200)}${murmur.content.length > 200 ? '...' : ''}`);
      });
    }
    
    lines.push('');
    
    if (data.conversationHistory && data.conversationHistory.length > 0) {
      lines.push('HISTORIQUE CONVERSATION:');
      lines.push('-'.repeat(40));
      data.conversationHistory.forEach((msg, index) => {
        lines.push(`${index + 1}. ${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
    }
    
    lines.push('');
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }

  private formatPromptLogContent(data: HierarchicalMemoryLogData): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('PROMPT COMPLET ALGARETH - LOG DEBUG');
    lines.push('='.repeat(80));
    lines.push(`Timestamp: ${data.timestamp}`);
    lines.push(`Session ID: ${data.sessionId}`);
    lines.push(`User ID: ${data.userId}`);
    lines.push(`User Message: "${data.userMessage}"`);
    lines.push(`Longueur prompt: ${data.promptLength} caractères`);
    lines.push('');
    lines.push('PROMPT COMPLET:');
    lines.push('-'.repeat(40));
    lines.push(data.fullPrompt || 'AUCUN PROMPT');
    lines.push('-'.repeat(40));
    lines.push('');
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }

  /**
   * Active le logging (pour les tests)
   */
  public enable(): void {
    this.isEnabled = true;
    this.logsDir = path.join(process.cwd(), 'logs', 'hierarchicalMemory');
    this.ensureLogsDirectory();
    console.log('🔍 Logging mémoire hiérarchique activé');
  }

  /**
   * Désactive le logging
   */
  public disable(): void {
    this.isEnabled = false;
    console.log('🔍 Logging mémoire hiérarchique désactivé');
  }

  /**
   * Vérifie si le logging est activé
   */
  public isLoggingEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export de l'instance singleton
export const hierarchicalMemoryLogger = HierarchicalMemoryLogger.getInstance();