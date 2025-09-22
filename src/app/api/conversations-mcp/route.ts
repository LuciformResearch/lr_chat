/**
 * API route pour récupérer les conversations via le système MCP
 * Utilise le même système que le chat pour accéder aux données
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserMemoryTool } from '@/mcp/tools/memory/get_user_memory';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const user = url.searchParams.get('user');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Paramètre user requis' },
        { status: 400 }
      );
    }

    console.log(`📊 API MCP conversations pour utilisateur: ${user}`);

    // Utiliser le système MCP pour récupérer les conversations
    const memoryResult = await getUserMemoryTool.handler({
      user,
      includeConversations: true,
      includeSummaries: false,
      maxConversations: limit
    });

    if (!memoryResult.success) {
      return NextResponse.json(
        { success: false, error: memoryResult.error },
        { status: 500 }
      );
    }

    const conversations = memoryResult.data.memory.conversations;
    const totalCount = memoryResult.data.memory.stats.conversationCount;

    console.log(`📊 API MCP: ${totalCount} conversations totales, ${conversations.length} retournées`);

    return NextResponse.json({
      success: true,
      data: {
        conversations: conversations,
        total: totalCount,
        user: user,
        source: 'mcp'
      }
    });
  } catch (error) {
    console.error('Erreur API MCP conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur récupération conversations MCP' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, user, query } = body;

    if (action === 'search') {
      if (!user || !query) {
        return NextResponse.json(
          { success: false, error: 'Paramètres user et query requis' },
          { status: 400 }
        );
      }

      console.log(`🔍 Recherche MCP: "${query}" pour ${user}`);

      // Récupérer toutes les conversations de l'utilisateur
      const memoryResult = await getUserMemoryTool.handler({
        user,
        includeConversations: true,
        includeSummaries: false,
        maxConversations: 100 // Plus de conversations pour la recherche
      });

      if (!memoryResult.success) {
        return NextResponse.json(
          { success: false, error: memoryResult.error },
          { status: 500 }
        );
      }

      const conversations = memoryResult.data.memory.conversations;
      const queryLower = query.toLowerCase();

      // Rechercher dans les conversations
      const matches = conversations.filter(conv => 
        conv.message.toLowerCase().includes(queryLower) ||
        conv.response.toLowerCase().includes(queryLower)
      );

      console.log(`🔍 Recherche MCP: ${matches.length} correspondances trouvées sur ${conversations.length} conversations`);

      return NextResponse.json({
        success: true,
        data: {
          query: query,
          matches: matches,
          totalMatches: matches.length,
          totalConversations: conversations.length,
          user: user,
          source: 'mcp'
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Action non supportée' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erreur API MCP POST:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur API MCP' },
      { status: 500 }
    );
  }
}