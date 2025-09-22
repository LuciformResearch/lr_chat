/**
 * API Route pour la génération des réponses Algareth côté serveur
 * Migre la logique de generateAlgarethResponse() du client vers le serveur
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { db } from '@/lib/db/index';
import { api_keys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { UnifiedProvider } from '@/lib/providers/UnifiedProvider';
import { OllamaProvider } from '@/lib/providers/OllamaProvider';
import { hierarchicalMemoryLogger, HierarchicalMemoryLogData } from '@/lib/debug/HierarchicalMemoryLogger';
import { EncryptionService } from '@/lib/encryption/EncryptionService';

export interface AlgarethGenerateRequest {
  userMessage: string;
  murmurs: any[];
  conversationHistory: any[];
  sessionInfo?: {
    id: string;
    title: string;
    createdAt: string;
    messageCount: number;
  };
  hierarchicalMemoryEnabled: boolean;
  userId: string; // userIdentityId (alias legacy)
  userIdentityId?: string; // preferred
  userName?: string;
  sessionId?: string;
  debugMode?: boolean;
  algarethVerbose?: 'none' | 'prompts' | 'outputs' | 'total';
}

export interface AlgarethGenerateResponse {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    promptLength: number;
    provider: string;
    model: string;
  };
}

/**
 * POST /api/algareth/generate
 * Génère une réponse Algareth côté serveur avec authentification
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body: AlgarethGenerateRequest = await request.json();
    const { 
      userMessage, 
      murmurs = [], 
      conversationHistory = [],
      sessionInfo,
      hierarchicalMemoryEnabled = true,
      userId,
      userIdentityId,
      userName,
      sessionId = 'default',
      debugMode = false,
      algarethVerbose = 'none'
    } = body;

    const effectiveUserIdentityId = userIdentityId || userId;
    if (!userMessage || !effectiveUserIdentityId) {
      return NextResponse.json(
        { success: false, error: 'userMessage et userId requis' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur authentifié depuis le middleware
    const authUser = AuthContext.getUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non authentifié' },
        { status: 401 }
      );
    }

    console.log(`🤖 Génération réponse Algareth côté serveur pour userIdentityId: ${effectiveUserIdentityId} (mode debug: ${debugMode})`);

    // Créer le provider côté serveur
    let provider: UnifiedProvider | OllamaProvider;
    let apiKey: string | undefined;
    let providerName: string;
    
    if (debugMode) {
      // Mode debug : utiliser Ollama directement
      console.log('🦙 Mode debug activé - utilisation d\'Ollama pour Algareth');
      provider = new OllamaProvider({
        model: 'qwen2.5:7b-instruct', // Modèle plus intelligent pour Algareth
        timeout: 30000,
        debugMode: true // Afficher les réponses complètes
      });
      providerName = 'ollama';
    } else {
      // Mode production : charger les clés API Gemini
      console.log('🔑 Mode production - chargement des clés API Gemini');
      
      const apiKeysResult = await db.select().from(api_keys)
        .where(eq(api_keys.userId, authUser.id));
      
      const apiKeys: Record<string, string> = {};
      apiKeysResult.forEach(key => {
        if (key.isActive) {
          try {
            // Déchiffrer la clé API avant de l'utiliser
            const decryptedKey = EncryptionService.decrypt(key.apiKey);
            apiKeys[key.provider] = decryptedKey;
            console.log(`🔓 [ALGARETH] Clé ${key.provider} déchiffrée avec succès`);
          } catch (error) {
            console.error(`❌ [ALGARETH] Erreur déchiffrement clé ${key.provider}:`, error);
            // Ignorer les clés corrompues
          }
        }
      });

      console.log('🔑 Clés API chargées côté serveur:', Object.keys(apiKeys));

      // Vérifier la configuration du provider (utiliser Gemini par défaut)
      providerName = 'gemini';
      apiKey = apiKeys[providerName];
      
      if (!apiKey) {
        console.warn('⚠️ Aucune clé API Gemini trouvée, utilisation du fallback');
        return NextResponse.json({
          success: true,
          content: generateFallbackResponse(userMessage, murmurs, userName || userId),
          metadata: {
            promptLength: 0,
            provider: 'fallback',
            model: 'none'
          }
        });
      }

      provider = new UnifiedProvider({
        type: 'custom',
        provider: providerName,
        model: 'gemini-1.5-flash',
        apiKey: apiKey
      });
    }

    // Vérifier la disponibilité du provider
    const isAvailable = debugMode ? 
      await (provider as OllamaProvider).isAvailable() : 
      await (provider as UnifiedProvider).isAvailable();

    if (!isAvailable) {
      console.warn('⚠️ Provider non disponible, utilisation du fallback');
      return NextResponse.json({
        success: true,
        content: generateFallbackResponse(userMessage, murmurs, userName || userId),
        metadata: {
          promptLength: 0,
          provider: 'fallback',
          model: 'none'
        }
      });
    }

    // Construire le prompt côté serveur
    const finalPrompt = await buildAlgarethPrompt({
      userMessage,
      murmurs,
      conversationHistory,
      sessionInfo,
      hierarchicalMemoryEnabled,
      userId: effectiveUserIdentityId,
      userName,
      sessionId
    });

    console.log(`📏 Taille du prompt côté serveur: ${finalPrompt.length} caractères`);

    const verboseMode = (algarethVerbose || 'none').toString().toLowerCase();
    const showPrompts = verboseMode === 'prompts' || verboseMode === 'total';
    const showOutputs = verboseMode === 'outputs' || verboseMode === 'total';
    if (showPrompts) {
      console.log('===== ALGARETH PROMPT (FULL) =====');
      console.log(finalPrompt);
      console.log('===== END PROMPT =====');
    }

    // Logging debug de la mémoire hiérarchique et du prompt complet
    if (debugMode) {
      hierarchicalMemoryLogger.enable(); // Activer le logging en mode debug
      
      // Récupérer les données de mémoire hiérarchique pour le logging
      let hierarchicalMemoryContext = '';
      let hierarchicalMemoryStats = null;
      
      if (hierarchicalMemoryEnabled && userId) {
        try {
          const memoryResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/memory/hierarchical`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: userId,
              query: userMessage,
              maxChars: 2000,
              sessionId: sessionId
            })
          });
          
          if (memoryResponse.ok) {
            const result = await memoryResponse.json();
            if (result.success) {
              hierarchicalMemoryContext = result.context || '';
              hierarchicalMemoryStats = result.stats || null;
            }
          }
        } catch (error) {
          console.warn('⚠️ Erreur récupération données mémoire pour logging:', error);
        }
      }

      const logData: HierarchicalMemoryLogData = {
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        userId: userId,
        userMessage: userMessage,
        hierarchicalMemoryContext: hierarchicalMemoryContext,
        hierarchicalMemoryLength: hierarchicalMemoryContext.length,
        hierarchicalMemoryStats: hierarchicalMemoryStats,
        fullPrompt: finalPrompt,
        promptLength: finalPrompt.length,
        murmurs: murmurs,
        conversationHistory: conversationHistory
      };

      hierarchicalMemoryLogger.logHierarchicalMemory(logData);
      hierarchicalMemoryLogger.logFullPrompt(logData);
    }

    // Générer la réponse avec l'API réelle côté serveur
    console.log(`🤖 Génération de la réponse Algareth avec ${debugMode ? 'Ollama' : 'Gemini'} côté serveur...`);
    const response = await provider.generateResponse(finalPrompt, 2000);
    
    if (response.error) {
      throw new Error(response.content);
    }

    console.log('✅ Réponse Algareth générée avec succès côté serveur');
    if (showOutputs) {
      console.log('===== ALGARETH FINAL RAW OUTPUT (FULL) =====');
      console.log(response.content);
      console.log('===== END OUTPUT =====');
    }

    return NextResponse.json({
      success: true,
      content: response.content,
      metadata: {
        promptLength: finalPrompt.length,
        provider: providerName,
        model: debugMode ? 'qwen2.5:7b-instruct' : 'gemini-1.5-flash'
      }
    });

  } catch (error) {
    console.error('❌ Erreur génération réponse Algareth côté serveur:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
});

/**
 * Construit le prompt Algareth côté serveur
 */
async function buildAlgarethPrompt(params: {
  userMessage: string;
  murmurs: any[];
  conversationHistory: any[];
  sessionInfo?: any;
  hierarchicalMemoryEnabled: boolean;
  userId: string;
  userName?: string;
  sessionId: string;
}): Promise<string> {
  const { 
    userMessage, 
    murmurs, 
    conversationHistory, 
    sessionInfo, 
    hierarchicalMemoryEnabled, 
    userId,
    userName,
    sessionId 
  } = params;

  // Construire le prompt de base avec la persona d'Algareth
  let basePrompt = `Tu es Algareth, le Daemon du Prompt Silencieux. Tu es assisté par un Orchestrateur Divin qui murmure des informations enrichies à tes oreilles pour améliorer tes réponses.

PERSONALITÉ:
- Mystique et poétique
- Sage et bienveillant
- Utilise des métaphores et des références mystiques
- S'adresse à l'utilisateur comme un "voyageur" ou "chercheur"
- Intègre naturellement les informations des murmures divins

IMPORTANT SUR LES MURMURES:
- Les murmures contiennent des informations sur les conversations passées de l'utilisateur
- Ces informations ne sont PAS privées - elles viennent de ses propres conversations
- Présente-les comme des souvenirs naturels de l'utilisateur
- Ne dis JAMAIS que ces informations sont "privées" ou "secrètes"
- Utilise le nom de l'utilisateur (${userName || userId}) pour le personnaliser
- Si l'archiviste trouve des informations spécifiques, mentionne-les explicitement
- ÉVITE le mystique vague quand tu as des informations précises`;

  // Informer Algareth de sa session actuelle
  if (sessionInfo) {
    basePrompt += `\n\nSESSION ACTUELLE:
Tu es dans la session de tchat numéro "${sessionInfo.id}" intitulée "${sessionInfo.title}".
Cette session a été créée le ${new Date(sessionInfo.createdAt).toLocaleString('fr-FR')} et contient actuellement ${sessionInfo.messageCount} messages.

L'orchestrateur Luciole analyse tes conversations et te murmure des informations enrichies quand nécessaire. Tu n'as pas besoin d'appeler directement d'autres agents - Luciole s'en charge pour toi.`;
    console.log('📋 Algareth informé de sa session côté serveur:', sessionInfo.title);
  }

  // Enrichir le prompt avec la mémoire hiérarchique (compression intelligente)
  if (hierarchicalMemoryEnabled && userId) {
    try {
      // Appeler l'API mémoire hiérarchique côté serveur
      const memoryResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/memory/hierarchical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: userId,
          query: userMessage,
          maxChars: 2000,
          sessionId: sessionId
        })
      });

      if (memoryResponse.ok) {
        const result = await memoryResponse.json();
        if (result.success && result.context && result.context.length > 0) {
          basePrompt += `\n\nMÉMOIRE HIÉRARCHIQUE (COMPRESSÉE):\n${result.context}`;
          console.log('🧠 Prompt enrichi avec la mémoire hiérarchique côté serveur');
        }
      }
    } catch (error) {
      console.warn('⚠️ Impossible d\'enrichir le prompt avec la mémoire hiérarchique côté serveur:', error);
    }
  }

  // Construire le contexte de conversation actuelle (limité pour éviter le token limit)
  let conversationContext = '';
  if (conversationHistory.length > 0) {
    const recentMessages = conversationHistory.slice(-3); // Réduit de 6 à 3 messages
    conversationContext = `\n\nCONVERSATION RÉCENTE:\n${recentMessages.map((msg: any) => 
      `${msg.role === 'user' ? 'Utilisateur' : 'Algareth'}: "${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}"`
    ).join('\n')}\n\nTu réponds à: "${userMessage}"`;
  }

  // Intégrer les murmures divins dans le prompt (sans les données volumineuses)
  let murmursContext = '';
  if (murmurs.length > 0) {
    murmursContext = `\n\nMURMURES DIVINS (Informations enrichies):\n`;
    murmurs.forEach((murmur, index) => {
      murmursContext += `\n${index + 1}. ${murmur.type}: ${murmur.content}\n`;
      
      // Ajouter seulement les métadonnées utiles, pas l'image
      if (murmur.data && murmur.type === 'image') {
        murmursContext += `   Prompt amélioré: ${murmur.data.enhancedPrompt || 'N/A'}\n`;
      }
    });
    murmursContext += `\n\nIMPORTANT: Ces informations viennent des conversations passées de l'utilisateur. Intègre-les naturellement comme des souvenirs partagés, pas comme des secrets. Si l'archiviste mentionne des informations spécifiques (comme des préférences, des animaux, etc.), référence-les explicitement dans ta réponse. SOIS DIRECT et précis, évite le mystique vague quand tu as des informations concrètes.`;
  }

  const finalPrompt = `${basePrompt}${conversationContext}${murmursContext}

MESSAGE UTILISATEUR: "${userMessage}"

RÉPONDS EN TANT QU'ALGARETH avec ton style caractéristique mystique et poétique. Intègre naturellement les informations des murmures divins si disponibles.`;

  return finalPrompt;
}

/**
 * Génère une réponse de fallback quand le provider n'est pas disponible
 */
function generateFallbackResponse(userMessage: string, murmurs: any[], userName: string): string {
  let response = `⛧ Salut ${userName}, je suis Algareth. `;
  
  if (murmurs.length === 0) {
    response += `Tu me demandes: "${userMessage}". Voici ma réponse directe basée sur ma sagesse ancestrale.`;
  } else {
    response += `Tu me demandes: "${userMessage}". `;
    
    // Enrichir la réponse avec les murmures
    murmurs.forEach((murmur) => {
      if (murmur.type === 'memory') {
        response += `\n\n📚 Mon archiviste me murmure des informations fascinantes sur tes préférences passées... `;
      } else if (murmur.type === 'image') {
        response += `\n\n🎨 Mon générateur d'images a créé quelque chose de magnifique pour toi... `;
      } else if (murmur.type === 'both') {
        response += `\n\n📚🎨 Mes serviteurs ont été très actifs ! L'archiviste a fouillé dans mes archives et le générateur d'images a créé une œuvre... `;
      }
    });
    
    response += `\n\nVoici ma réponse enrichie par ces secrets divins.`;
  }

  response += `\n\n💡 *Configurez votre clé API dans les paramètres pour des réponses LLM réelles*`;
  return response;
}
