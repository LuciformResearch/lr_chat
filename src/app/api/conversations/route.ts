/**
 * API route pour gérer les conversations
 * Permet au chat de sauvegarder et récupérer les conversations
 */

import { NextRequest, NextResponse } from 'next/server';
import { LocalStorage } from '@/lib/storage/LocalStorage';
import { SummaryManager } from '@/lib/summarization/SummaryManager';

// Mock localStorage pour le serveur
const mockLocalStorage = {
  data: new Map<string, string>(),
  getItem: function(key: string): string | null {
    return this.data.get(key) || null;
  },
  setItem: function(key: string, value: string): void {
    this.data.set(key, value);
  },
  removeItem: function(key: string): void {
    this.data.delete(key);
  },
  clear: function(): void {
    this.data.clear();
  }
};

// Remplacer localStorage global pour le serveur
(global as any).localStorage = mockLocalStorage;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'add_conversation':
        return await addConversation(data);
      case 'get_conversations':
        return await getConversations(data);
      case 'generate_summary':
        return await generateSummary(data);
      default:
        return NextResponse.json(
          { success: false, error: 'Action non reconnue' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Erreur API conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

async function addConversation(data: any) {
  try {
    const {
      user,
      message,
      response,
      persona = 'Algareth',
      provider = 'unified_provider',
      model = 'current_model',
      metadata = {}
    } = data;

    // Créer l'entrée de conversation
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const conversationEntry = {
      id: conversationId,
      user,
      message,
      response,
      persona,
      provider,
      model,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // Sauvegarder la conversation
    LocalStorage.saveConversation(conversationEntry);

    console.log('💾 Conversation sauvegardée:', conversationId);

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        message: 'Conversation sauvegardée avec succès'
      }
    });
  } catch (error) {
    console.error('Erreur sauvegarde conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur sauvegarde conversation' },
      { status: 500 }
    );
  }
}

async function getConversations(data: any) {
  try {
    const { user, limit = 10 } = data;

    // Utiliser le vrai LocalStorage au lieu du mock
    let conversations;
    if (user) {
      conversations = LocalStorage.getConversationsByUser(user);
    } else {
      conversations = LocalStorage.getConversations();
    }

    // Limiter le nombre de conversations
    const limitedConversations = conversations.slice(-limit);

    console.log(`📊 API getConversations: ${conversations.length} conversations trouvées, ${limitedConversations.length} retournées`);

    return NextResponse.json({
      success: true,
      data: {
        conversations: limitedConversations,
        total: conversations.length
      }
    });
  } catch (error) {
    console.error('Erreur récupération conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur récupération conversations' },
      { status: 500 }
    );
  }
}

async function generateSummary(data: any) {
  try {
    const { user, messages, language = 'fr' } = data;

    const summaryManager = new SummaryManager();
    
    // Convertir les messages au bon format
    const conversationMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || new Date().toISOString()
    }));

    // Générer le résumé
    const summary = await summaryManager.saveSummary(
      user,
      conversationMessages,
      [], // conversationData vide pour l'instant
      language
    );

    console.log('📝 Résumé généré:', summary.id);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        message: 'Résumé généré avec succès'
      }
    });
  } catch (error) {
    console.error('Erreur génération résumé:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur génération résumé' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const user = url.searchParams.get('user');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Utiliser le vrai LocalStorage au lieu du mock
    let conversations;
    if (user) {
      conversations = LocalStorage.getConversationsByUser(user);
    } else {
      conversations = LocalStorage.getConversations();
    }

    const limitedConversations = conversations.slice(-limit);

    console.log(`📊 API GET conversations: ${conversations.length} conversations trouvées, ${limitedConversations.length} retournées`);

    return NextResponse.json({
      success: true,
      data: {
        conversations: limitedConversations,
        total: conversations.length
      }
    });
  } catch (error) {
    console.error('Erreur GET conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur récupération conversations' },
      { status: 500 }
    );
  }
}