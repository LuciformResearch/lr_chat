/**
 * Base de données de conversations pour l'Agent Archiviste
 * Gère les conversations d'Algareth de manière persistante
 */

import { getNodeModules } from '@/lib/utils/web-mocks';

const { fs, path } = getNodeModules();

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  message: Message;
  relevanceScore: number;
  context: string;
}

export class ConversationDatabase {
  private dataDir: string;
  private conversations: Map<string, Conversation> = new Map();

  constructor(dataDir: string = 'artefacts/memories/algareth') {
    this.dataDir = path.resolve(dataDir);
    this.loadConversations();
  }

  /**
   * Charge toutes les conversations depuis les fichiers
   */
  private loadConversations(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        console.log(`📁 Création du dossier de données: ${this.dataDir}`);
        fs.mkdirSync(this.dataDir, { recursive: true });
        return;
      }

      const sessionDirs = fs.readdirSync(this.dataDir).filter(item => {
        const itemPath = path.join(this.dataDir, item);
        return fs.statSync(itemPath).isDirectory() && item.startsWith('conv_');
      });

      for (const sessionDir of sessionDirs) {
        const sessionPath = path.join(this.dataDir, sessionDir);
        const messagesFile = path.join(sessionPath, 'messages.json');
        
        if (fs.existsSync(messagesFile)) {
          try {
            const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
            const convFile = path.join(sessionPath, 'conv.md');
            const title = fs.existsSync(convFile) ? 
              fs.readFileSync(convFile, 'utf8').split('\n')[0].replace('# ', '') : 
              sessionDir;
            
            const conversation: Conversation = {
              id: sessionDir,
              userId: 'lucie', // Par défaut pour les tests
              title,
              messages,
              createdAt: messages[0]?.timestamp || new Date().toISOString(),
              updatedAt: messages[messages.length - 1]?.timestamp || new Date().toISOString(),
              metadata: {
                messageCount: messages.length,
                source: 'artefacts'
              }
            };
            
            this.conversations.set(sessionDir, conversation);
            console.log(`✅ Conversation chargée: ${title} (${messages.length} messages)`);
          } catch (error) {
            console.error(`❌ Erreur chargement ${sessionDir}:`, error);
          }
        }
      }

      console.log(`📚 ${this.conversations.size} conversations chargées`);
    } catch (error) {
      console.error('❌ Erreur chargement conversations:', error);
    }
  }

  /**
   * Récupère une conversation spécifique
   */
  async getConversation(convId: string): Promise<Conversation | null> {
    return this.conversations.get(convId) || null;
  }

  /**
   * Récupère toutes les conversations d'un utilisateur
   */
  async getAllConversations(userId?: string): Promise<Conversation[]> {
    const conversations = Array.from(this.conversations.values());
    
    if (userId) {
      return conversations.filter(conv => conv.userId === userId);
    }
    
    return conversations;
  }

  /**
   * Recherche dans une conversation spécifique
   */
  async searchInConversation(convId: string, query: string): Promise<SearchResult[]> {
    const conversation = this.conversations.get(convId);
    if (!conversation) return [];

    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const message of conversation.messages) {
      const contentLower = message.content.toLowerCase();
      
      // Recherche simple par mots-clés
      if (contentLower.includes(queryLower)) {
        // Calculer un score de pertinence basique
        const relevanceScore = this.calculateRelevanceScore(queryLower, contentLower);
        
        results.push({
          conversationId: conversation.id,
          conversationTitle: conversation.title,
          messageId: message.id,
          message: {
            ...message,
            id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          },
          relevanceScore,
          context: `Conversation ${conversation.title}`
        });
      }
    }

    // Trier par score de pertinence
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Recherche dans toutes les conversations
   */
  async searchInAllConversations(query: string, userId?: string): Promise<SearchResult[]> {
    const conversations = await this.getAllConversations(userId);
    const results: SearchResult[] = [];

    for (const conversation of conversations) {
      const convResults = await this.searchInConversation(conversation.id, query);
      results.push(...convResults);
    }

    // Trier par score de pertinence global
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calcule un score de pertinence basique
   */
  private calculateRelevanceScore(query: string, content: string): number {
    const queryWords = query.split(/\s+/).filter(word => word.length > 2);
    const contentWords = content.split(/\s+/);
    
    let score = 0;
    let totalMatches = 0;
    
    for (const queryWord of queryWords) {
      const matches = contentWords.filter(word => 
        word.includes(queryWord) || queryWord.includes(word)
      ).length;
      
      if (matches > 0) {
        score += matches;
        totalMatches++;
      }
    }
    
    // Score basé sur le ratio de correspondance
    const matchRatio = totalMatches / queryWords.length;
    const baseScore = score / contentWords.length;
    
    return Math.min(1.0, matchRatio * 0.7 + baseScore * 0.3);
  }

  /**
   * Ajoute une nouvelle conversation
   */
  async addConversation(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, conversation);
    
    // Sauvegarder sur disque
    const sessionPath = path.join(this.dataDir, conversation.id);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    
    const messagesFile = path.join(sessionPath, 'messages.json');
    fs.writeFileSync(messagesFile, JSON.stringify(conversation.messages, null, 2));
    
    console.log(`✅ Conversation ajoutée: ${conversation.title}`);
  }

  /**
   * Met à jour une conversation existante
   */
  async updateConversation(convId: string, updates: Partial<Conversation>): Promise<void> {
    const conversation = this.conversations.get(convId);
    if (!conversation) return;

    const updatedConversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.conversations.set(convId, updatedConversation);
    
    // Sauvegarder sur disque
    const sessionPath = path.join(this.dataDir, convId);
    const messagesFile = path.join(sessionPath, 'messages.json');
    fs.writeFileSync(messagesFile, JSON.stringify(updatedConversation.messages, null, 2));
    
    console.log(`✅ Conversation mise à jour: ${convId}`);
  }

  /**
   * Supprime une conversation
   */
  async deleteConversation(convId: string): Promise<void> {
    this.conversations.delete(convId);
    
    // Supprimer du disque
    const sessionPath = path.join(this.dataDir, convId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true });
    }
    
    console.log(`✅ Conversation supprimée: ${convId}`);
  }

  /**
   * Obtient les statistiques de la base de données
   */
  getStats(): {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    users: string[];
  } {
    const conversations = Array.from(this.conversations.values());
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const users = [...new Set(conversations.map(conv => conv.userId))];

    return {
      totalConversations: conversations.length,
      totalMessages,
      averageMessagesPerConversation: conversations.length > 0 ? totalMessages / conversations.length : 0,
      users
    };
  }

  /**
   * Recherche avancée avec filtres
   */
  async advancedSearch(options: {
    query: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<SearchResult[]> {
    let results = await this.searchInAllConversations(options.query, options.userId);

    // Filtrer par date si spécifié
    if (options.dateFrom || options.dateTo) {
      results = results.filter(result => {
        const messageDate = new Date(result.message.timestamp);
        const fromDate = options.dateFrom ? new Date(options.dateFrom) : null;
        const toDate = options.dateTo ? new Date(options.dateTo) : null;

        if (fromDate && messageDate < fromDate) return false;
        if (toDate && messageDate > toDate) return false;
        return true;
      });
    }

    // Limiter les résultats
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Teste la base de données
   */
  async testDatabase(): Promise<void> {
    console.log('🧪 Test de la base de données de conversations');
    
    const stats = this.getStats();
    console.log(`📊 Statistiques:`);
    console.log(`   Conversations: ${stats.totalConversations}`);
    console.log(`   Messages: ${stats.totalMessages}`);
    console.log(`   Utilisateurs: ${stats.users.join(', ')}`);
    
    // Test de recherche
    const searchResults = await this.searchInAllConversations('couleurs');
    console.log(`🔍 Recherche "couleurs": ${searchResults.length} résultats`);
    
    if (searchResults.length > 0) {
      console.log(`   Premier résultat: ${searchResults[0].conversationTitle}`);
      console.log(`   Score: ${searchResults[0].relevanceScore.toFixed(2)}`);
    }
    
    console.log('✅ Test de la base de données terminé');
  }
}