/**
 * Système de stockage local pour les logs et la mémoire
 * Utilise localStorage côté client et API routes côté serveur
 */

export interface LogEntry {
  id: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  source: string;
  data?: any;
  tags?: string[];
  timestamp: string;
}

export interface ConversationEntry {
  id: string;
  user: string;
  message: string;
  response: string;
  persona: string;
  provider: string;
  model: string;
  metadata?: any;
  timestamp: string;
}

export interface MemoryNode {
  id: string;
  name: string;
  nodeType: string;
  metadata: string[];
  timestamp: string;
}

export interface MemoryEdge {
  id: string;
  from: string;
  to: string;
  edgeType: string;
  timestamp: string;
}

/**
 * Gestionnaire de stockage local
 */
export class LocalStorage {
  private static readonly LOGS_KEY = 'lr_tchatagent_logs';
  private static readonly CONVERSATIONS_KEY = 'lr_tchatagent_conversations';
  private static readonly MEMORY_NODES_KEY = 'lr_tchatagent_memory_nodes';
  private static readonly MEMORY_EDGES_KEY = 'lr_tchatagent_memory_edges';

  /**
   * Sauvegarde un log
   */
  static saveLog(log: LogEntry): void {
    try {
      const logs = this.getLogs();
      logs.push(log);
      localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs));
      console.log('💾 Log sauvegardé:', log.id);
    } catch (error) {
      console.error('❌ Erreur sauvegarde log:', error);
    }
  }

  /**
   * Récupère tous les logs
   */
  static getLogs(): LogEntry[] {
    try {
      const logs = localStorage.getItem(this.LOGS_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('❌ Erreur lecture logs:', error);
      return [];
    }
  }

  /**
   * Récupère les logs par niveau
   */
  static getLogsByLevel(level: string): LogEntry[] {
    return this.getLogs().filter(log => log.level === level);
  }

  /**
   * Efface tous les logs
   */
  static clearLogs(): void {
    localStorage.removeItem(this.LOGS_KEY);
    console.log('🧹 Logs effacés');
  }

  /**
   * Sauvegarde une conversation
   */
  static saveConversation(conversation: ConversationEntry): void {
    try {
      const conversations = this.getConversations();
      conversations.push(conversation);
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(conversations));
      console.log('💾 Conversation sauvegardée:', conversation.id);
    } catch (error) {
      console.error('❌ Erreur sauvegarde conversation:', error);
    }
  }

  /**
   * Récupère toutes les conversations
   */
  static getConversations(): ConversationEntry[] {
    try {
      const conversations = localStorage.getItem(this.CONVERSATIONS_KEY);
      return conversations ? JSON.parse(conversations) : [];
    } catch (error) {
      console.error('❌ Erreur lecture conversations:', error);
      return [];
    }
  }

  /**
   * Récupère les conversations d'un utilisateur
   */
  static getConversationsByUser(user: string): ConversationEntry[] {
    return this.getConversations().filter(conv => conv.user === user);
  }

  /**
   * Efface toutes les conversations
   */
  static clearConversations(): void {
    localStorage.removeItem(this.CONVERSATIONS_KEY);
    console.log('🧹 Conversations effacées');
  }

  /**
   * Sauvegarde un nœud de mémoire
   */
  static saveMemoryNode(node: MemoryNode): void {
    try {
      const nodes = this.getMemoryNodes();
      nodes.push(node);
      localStorage.setItem(this.MEMORY_NODES_KEY, JSON.stringify(nodes));
      console.log('💾 Nœud de mémoire sauvegardé:', node.id);
    } catch (error) {
      console.error('❌ Erreur sauvegarde nœud:', error);
    }
  }

  /**
   * Récupère tous les nœuds de mémoire
   */
  static getMemoryNodes(): MemoryNode[] {
    try {
      const nodes = localStorage.getItem(this.MEMORY_NODES_KEY);
      return nodes ? JSON.parse(nodes) : [];
    } catch (error) {
      console.error('❌ Erreur lecture nœuds:', error);
      return [];
    }
  }

  /**
   * Récupère les nœuds par type
   */
  static getMemoryNodesByType(nodeType: string): MemoryNode[] {
    return this.getMemoryNodes().filter(node => node.nodeType === nodeType);
  }

  /**
   * Sauvegarde une relation de mémoire
   */
  static saveMemoryEdge(edge: MemoryEdge): void {
    try {
      const edges = this.getMemoryEdges();
      edges.push(edge);
      localStorage.setItem(this.MEMORY_EDGES_KEY, JSON.stringify(edges));
      console.log('💾 Relation de mémoire sauvegardée:', edge.id);
    } catch (error) {
      console.error('❌ Erreur sauvegarde relation:', error);
    }
  }

  /**
   * Récupère toutes les relations de mémoire
   */
  static getMemoryEdges(): MemoryEdge[] {
    try {
      const edges = localStorage.getItem(this.MEMORY_EDGES_KEY);
      return edges ? JSON.parse(edges) : [];
    } catch (error) {
      console.error('❌ Erreur lecture relations:', error);
      return [];
    }
  }

  /**
   * Efface toute la mémoire
   */
  static clearMemory(): void {
    localStorage.removeItem(this.MEMORY_NODES_KEY);
    localStorage.removeItem(this.MEMORY_EDGES_KEY);
    console.log('🧹 Mémoire effacée');
  }

  /**
   * Efface toutes les données
   */
  static clearAll(): void {
    this.clearLogs();
    this.clearConversations();
    this.clearMemory();
    console.log('🧹 Toutes les données effacées');
  }

  /**
   * Exporte toutes les données
   */
  static exportAll(): string {
    const data = {
      logs: this.getLogs(),
      conversations: this.getConversations(),
      memoryNodes: this.getMemoryNodes(),
      memoryEdges: this.getMemoryEdges(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Importe des données
   */
  static importAll(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.logs) {
        localStorage.setItem(this.LOGS_KEY, JSON.stringify(data.logs));
      }
      if (data.conversations) {
        localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(data.conversations));
      }
      if (data.memoryNodes) {
        localStorage.setItem(this.MEMORY_NODES_KEY, JSON.stringify(data.memoryNodes));
      }
      if (data.memoryEdges) {
        localStorage.setItem(this.MEMORY_EDGES_KEY, JSON.stringify(data.memoryEdges));
      }
      
      console.log('✅ Données importées avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur import données:', error);
      return false;
    }
  }

  /**
   * Statistiques des données
   */
  static getStats(): {
    logs: number;
    conversations: number;
    memoryNodes: number;
    memoryEdges: number;
    totalSize: number;
  } {
    const logs = this.getLogs();
    const conversations = this.getConversations();
    const memoryNodes = this.getMemoryNodes();
    const memoryEdges = this.getMemoryEdges();
    
    const totalSize = JSON.stringify({
      logs, conversations, memoryNodes, memoryEdges
    }).length;
    
    return {
      logs: logs.length,
      conversations: conversations.length,
      memoryNodes: memoryNodes.length,
      memoryEdges: memoryEdges.length,
      totalSize
    };
  }
}