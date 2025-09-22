/**
 * Système de communication inter-agents
 * Permet à Algareth de "parler" à d'autres agents spécialisés
 */

export interface AgentMessage {
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification';
  content: string;
  metadata?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    timeout?: number;
    requiresResponse?: boolean;
    context?: any;
  };
  timestamp: string;
  id: string;
}

export interface AgentCapabilities {
  name: string;
  description: string;
  capabilities: string[];
  responseTime: 'instant' | 'fast' | 'slow' | 'background';
  requiresContext: boolean;
}

export interface AgentResponse {
  success: boolean;
  content: string;
  metadata?: any;
  processingTime?: number;
  confidence?: number;
}

export abstract class BaseAgent {
  public name: string;
  public capabilities: AgentCapabilities;
  protected messageQueue: AgentMessage[] = [];
  protected isProcessing: boolean = false;

  constructor(name: string, capabilities: AgentCapabilities) {
    this.name = name;
    this.capabilities = capabilities;
    console.log(`🤖 Agent ${name} initialisé`);
  }

  /**
   * Envoie un message à un autre agent
   */
  async sendMessage(to: string, content: string, metadata?: any): Promise<AgentResponse> {
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: this.name,
      to,
      type: 'request',
      content,
      metadata: {
        priority: 'normal',
        requiresResponse: true,
        context: metadata
      },
      timestamp: new Date().toISOString()
    };

    console.log(`📤 ${this.name} → ${to}: ${content.substring(0, 50)}...`);
    
    // Simuler l'envoi via le système de communication
    return await AgentCommunicationSystem.sendMessage(message);
  }

  /**
   * Reçoit un message d'un autre agent
   */
  async receiveMessage(message: AgentMessage): Promise<AgentResponse> {
    console.log(`📥 ${this.name} reçoit de ${message.from}: ${message.content.substring(0, 50)}...`);
    
    try {
      const response = await this.processMessage(message);
      return {
        success: true,
        content: response,
        processingTime: Date.now() - new Date(message.timestamp).getTime()
      };
    } catch (error) {
      console.error(`❌ Erreur traitement message dans ${this.name}:`, error);
      return {
        success: false,
        content: `Erreur: ${error}`,
        processingTime: Date.now() - new Date(message.timestamp).getTime()
      };
    }
  }

  /**
   * Traite un message reçu (à implémenter par chaque agent)
   */
  abstract processMessage(message: AgentMessage): Promise<string>;

  /**
   * Envoie une notification (sans réponse attendue)
   */
  async sendNotification(to: string, content: string, metadata?: any): Promise<void> {
    const message: AgentMessage = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: this.name,
      to,
      type: 'notification',
      content,
      metadata: {
        priority: 'normal',
        requiresResponse: false,
        context: metadata
      },
      timestamp: new Date().toISOString()
    };

    console.log(`🔔 ${this.name} → ${to} (notification): ${content.substring(0, 50)}...`);
    await AgentCommunicationSystem.sendMessage(message);
  }
}

/**
 * Système de communication central
 */
export class AgentCommunicationSystem {
  private static agents: Map<string, BaseAgent> = new Map();
  private static messageHistory: AgentMessage[] = [];

  /**
   * Enregistre un agent dans le système
   */
  static registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.name, agent);
    console.log(`✅ Agent ${agent.name} enregistré dans le système`);
  }

  /**
   * Envoie un message entre agents
   */
  static async sendMessage(message: AgentMessage): Promise<AgentResponse> {
    this.messageHistory.push(message);
    
    const targetAgent = this.agents.get(message.to);
    if (!targetAgent) {
      return {
        success: false,
        content: `Agent ${message.to} non trouvé`
      };
    }

    if (message.type === 'notification') {
      // Les notifications ne nécessitent pas de réponse
      targetAgent.receiveMessage(message);
      return {
        success: true,
        content: 'Notification envoyée'
      };
    }

    // Traitement des requêtes
    return await targetAgent.receiveMessage(message);
  }

  /**
   * Obtient la liste des agents disponibles
   */
  static getAvailableAgents(): AgentCapabilities[] {
    return Array.from(this.agents.values()).map(agent => agent.capabilities);
  }

  /**
   * Obtient l'historique des messages
   */
  static getMessageHistory(): AgentMessage[] {
    return [...this.messageHistory];
  }

  /**
   * Obtient les statistiques de communication
   */
  static getCommunicationStats(): {
    totalAgents: number;
    totalMessages: number;
    messagesByAgent: Record<string, number>;
  } {
    const messagesByAgent: Record<string, number> = {};
    
    this.messageHistory.forEach(msg => {
      messagesByAgent[msg.from] = (messagesByAgent[msg.from] || 0) + 1;
    });

    return {
      totalAgents: this.agents.size,
      totalMessages: this.messageHistory.length,
      messagesByAgent
    };
  }
}