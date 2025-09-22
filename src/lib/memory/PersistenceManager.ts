/**
 * Module de persistance pour tester la mémoire sur le long terme
 * Séparé du projet web pour validation indépendante
 */

import * as fs from 'fs';
import * as path from 'path';
import { AdvancedMemoryEngineWithProactiveSearch } from './AdvancedMemoryEngineWithProactiveSearch';
import { EmotionalStateManager, EmotionalSnapshot } from './EmotionalStateManager';

export interface PersistenceSession {
  id: string;
  startTime: string;
  endTime?: string;
  totalMessages: number;
  totalCompressions: number;
  memorySnapshots: MemorySnapshot[];
  compressionHistory: CompressionEvent[];
  internalReactions: InternalReactionSnapshot[];
  conversationHistory: ConversationSnapshot[];
  emotionalSnapshots: EmotionalSnapshot[];
}

export interface MemorySnapshot {
  timestamp: string;
  messageCount: number;
  summaryCount: number;
  budgetUsage: number;
  memoryItems: MemoryItemSnapshot[];
}

export interface MemoryItemSnapshot {
  id: string;
  type: 'raw' | 'sum';
  level: number;
  length: number;
  topics: string[];
  covers?: string[];
  content: string; // Contenu réel du message/résumé
  timestamp: string; // Timestamp original
}

export interface CompressionEvent {
  timestamp: string;
  action: string;
  level: number;
  itemsAffected: number;
  reason: string;
}

export interface InternalReactionSnapshot {
  timestamp: string;
  messageId: string;
  trigger: string;
  reaction: string;
  emotionalTone: string;
  preparationForResponse: string;
  memoryTriggers: string[];
}

export interface ConversationSnapshot {
  timestamp: string;
  messageId: string;
  speaker: string;
  message: string;
  response: string;
  compressionAction?: string;
}

export class PersistenceManager {
  private sessions: Map<string, PersistenceSession> = new Map();
  private dataDir: string;
  private emotionalStateManager: EmotionalStateManager;

  constructor(dataDir: string = './memory-persistence-data') {
    this.dataDir = dataDir;
    this.emotionalStateManager = new EmotionalStateManager();
    this.ensureDataDir();
  }

  /**
   * Crée une nouvelle session de persistance
   */
  createSession(sessionId: string): PersistenceSession {
    const session: PersistenceSession = {
      id: sessionId,
      startTime: new Date().toISOString(),
      totalMessages: 0,
      totalCompressions: 0,
      memorySnapshots: [],
      compressionHistory: [],
      internalReactions: [],
      conversationHistory: [],
      emotionalSnapshots: []
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Sauvegarde un snapshot de la mémoire
   */
  saveMemorySnapshot(sessionId: string, engine: AdvancedMemoryEngineWithProactiveSearch): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const stats = engine.getStats();
    const snapshot: MemorySnapshot = {
      timestamp: new Date().toISOString(),
      messageCount: stats.rawCount,
      summaryCount: stats.l1Count + stats.l2Count + stats.l3Count,
      budgetUsage: stats.budget.percentage,
      memoryItems: (engine['memory'].items || []).map(item => ({
        id: item.id,
        type: item.type,
        level: item.level,
        length: item.text?.length || 0,
        topics: item.topics || [],
        covers: item.covers || [],
        content: item.text || '', // Sauvegarder le contenu réel
        timestamp: item.timestamp || new Date().toISOString() // Sauvegarder le timestamp original
      }))
    };

    session.memorySnapshots.push(snapshot);
  }

  /**
   * Enregistre un événement de compression
   */
  recordCompressionEvent(sessionId: string, action: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (action.action !== 'NONE') {
      const event: CompressionEvent = {
        timestamp: new Date().toISOString(),
        action: action.action,
        level: this.extractLevelFromAction(action),
        itemsAffected: action.summaries?.length || 0,
        reason: action.message || 'Compression automatique'
      };

      session.compressionHistory.push(event);
      session.totalCompressions++;
    }
  }

  /**
   * Sauvegarde une réaction interne
   */
  saveInternalReaction(sessionId: string, reaction: any, messageId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const reactionSnapshot: InternalReactionSnapshot = {
      timestamp: reaction.timestamp,
      messageId,
      trigger: reaction.trigger,
      reaction: reaction.reaction,
      emotionalTone: reaction.emotionalTone,
      preparationForResponse: reaction.preparationForResponse,
      memoryTriggers: reaction.memoryTriggers
    };

    session.internalReactions.push(reactionSnapshot);
  }

  /**
   * Sauvegarde un échange de conversation
   */
  saveConversationExchange(
    sessionId: string, 
    messageId: string,
    speaker: string,
    message: string,
    response: string,
    compressionAction?: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const conversationSnapshot: ConversationSnapshot = {
      timestamp: new Date().toISOString(),
      messageId,
      speaker,
      message,
      response,
      compressionAction
    };

    session.conversationHistory.push(conversationSnapshot);
  }

  /**
   * Initialise l'état émotionnel d'une entité
   */
  initializeEmotionalState(entityId: string, sessionId: string, personality: string): void {
    this.emotionalStateManager.initializeEmotionalState(entityId, sessionId);
    this.emotionalStateManager.generateInitialEmotions(entityId, personality);
  }

  /**
   * Génère et sauvegarde une modification d'émotion
   */
  async processEmotionalReaction(
    entityId: string,
    internalReaction: any,
    conversationContext: string,
    sessionId: string
  ): Promise<any> {
    const modification = await this.emotionalStateManager.generateEmotionModification(
      entityId,
      internalReaction,
      conversationContext
    );

    if (modification) {
      // Sauvegarder le snapshot émotionnel
      const snapshot = this.emotionalStateManager.generateEmotionalSnapshot(entityId);
      const session = this.sessions.get(sessionId);
      if (session) {
        session.emotionalSnapshots.push(snapshot);
      }
    }

    return modification;
  }

  /**
   * Récupère l'état émotionnel actuel
   */
  getCurrentEmotionalState(entityId: string): any {
    return this.emotionalStateManager.getCurrentEmotionalState(entityId);
  }

  /**
   * Génère un rapport émotionnel
   */
  generateEmotionalReport(entityId: string): string {
    return this.emotionalStateManager.generateEmotionalReport(entityId);
  }

  /**
   * Met à jour les statistiques de session
   */
  updateSessionStats(sessionId: string, messageCount: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.totalMessages = messageCount;
  }

  /**
   * Finalise une session
   */
  finalizeSession(sessionId: string): PersistenceSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endTime = new Date().toISOString();
    this.saveSessionToFile(session);
    return session;
  }

  /**
   * Sauvegarde une session dans un fichier
   */
  private saveSessionToFile(session: PersistenceSession): void {
    const sessionDir = path.join(this.dataDir, session.id);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Sauvegarder la session complète
    const sessionFile = path.join(sessionDir, 'session.json');
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));

    // Sauvegarder les snapshots détaillés
    const snapshotsFile = path.join(sessionDir, 'snapshots.json');
    fs.writeFileSync(snapshotsFile, JSON.stringify(session.memorySnapshots, null, 2));

    // Sauvegarder l'historique de compression
    const compressionFile = path.join(sessionDir, 'compression-history.json');
    fs.writeFileSync(compressionFile, JSON.stringify(session.compressionHistory, null, 2));

    // Générer un rapport markdown
    this.generateSessionReport(session, sessionDir);
  }

  /**
   * Génère un rapport markdown de la session
   */
  private generateSessionReport(session: PersistenceSession, sessionDir: string): void {
    const report = `# Rapport de Session - ${session.id}

**Début:** ${session.startTime}  
**Fin:** ${session.endTime}  
**Durée:** ${this.calculateDuration(session.startTime, session.endTime!)}  
**Messages totaux:** ${session.totalMessages}  
**Compressions:** ${session.totalCompressions}

## 📊 Évolution de la Mémoire

### Snapshots (${session.memorySnapshots.length})
${session.memorySnapshots.map((snapshot, index) => `
**Snapshot ${index + 1}** (${snapshot.timestamp})
- Messages: ${snapshot.messageCount}
- Résumés: ${snapshot.summaryCount}
- Budget: ${snapshot.budgetUsage.toFixed(1)}%
- Items: ${snapshot.memoryItems.length}
`).join('')}

## 🗜️ Historique de Compression

${session.compressionHistory.map((event, index) => `
**${index + 1}.** ${event.timestamp}
- Action: ${event.action}
- Niveau: L${event.level}
- Items affectés: ${event.itemsAffected}
- Raison: ${event.reason}
`).join('')}

## 📈 Analyse de Compression

### Niveaux atteints
${this.analyzeCompressionLevels(session)}

### Efficacité
- **Ratio compression:** ${(session.totalCompressions / session.totalMessages * 100).toFixed(1)}%
- **Compression moyenne:** ${(session.totalCompressions / session.memorySnapshots.length).toFixed(1)} par snapshot

---
*Généré automatiquement par PersistenceManager*
`;

    const reportFile = path.join(sessionDir, 'session-report.md');
    fs.writeFileSync(reportFile, report);
  }

  /**
   * Analyse les niveaux de compression atteints
   */
  private analyzeCompressionLevels(session: PersistenceSession): string {
    const levels = new Set<number>();
    session.compressionHistory.forEach(event => {
      levels.add(event.level);
    });

    const levelAnalysis = Array.from(levels).sort().map(level => {
      const count = session.compressionHistory.filter(e => e.level === level).length;
      return `- **L${level}:** ${count} compressions`;
    }).join('\n');

    return levelAnalysis || '- Aucune compression détectée';
  }

  /**
   * Calcule la durée entre deux timestamps
   */
  private calculateDuration(start: string, end: string): string {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = endTime - startTime;
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Extrait le niveau de compression d'une action
   */
  private extractLevelFromAction(action: any): number {
    if (action.action.includes('L1')) return 1;
    if (action.action.includes('L2')) return 2;
    if (action.action.includes('L3')) return 3;
    return 1; // Par défaut
  }

  /**
   * S'assure que le répertoire de données existe
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Charge une session depuis un fichier
   */
  loadSession(sessionId: string): PersistenceSession | null {
    const sessionFile = path.join(this.dataDir, sessionId, 'session.json');
    if (!fs.existsSync(sessionFile)) return null;

    try {
      const data = fs.readFileSync(sessionFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erreur lors du chargement de la session:', error);
      return null;
    }
  }

  /**
   * Liste toutes les sessions disponibles
   */
  listSessions(): string[] {
    if (!fs.existsSync(this.dataDir)) return [];
    
    return fs.readdirSync(this.dataDir)
      .filter(item => {
        const itemPath = path.join(this.dataDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
  }
}