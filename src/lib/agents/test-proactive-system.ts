/**
 * Test d'intégration du système proactif de serviteurs
 * Teste l'ensemble du pipeline : analyseur → orchestrateur → serviteurs → réponse enrichie
 */

import { AlgarethProactiveService } from './AlgarethProactiveService';
import { AgentManager } from './AgentManager';
import { AlgarethContext } from './AlgarethAgent';

/**
 * Test complet du système proactif
 */
export async function testProactiveSystem(): Promise<void> {
  console.log('🧪 Test complet du système proactif de serviteurs');
  console.log('=' .repeat(60));

  try {
    // Configuration
    const geminiApiKey = process.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!geminiApiKey) {
      console.error('❌ Clé API Gemini non trouvée');
      return;
    }

    // 1. Initialiser l'AgentManager
    console.log('\n📋 Étape 1: Initialisation AgentManager');
    const agentManager = new AgentManager({
      geminiApiKey,
      enableArchivist: true,
      enableLogging: true,
      maxConcurrentRequests: 5
    });

    await agentManager.initialize();
    console.log('✅ AgentManager initialisé');

    // 2. Initialiser le service proactif
    console.log('\n📋 Étape 2: Initialisation Service Proactif');
    const proactiveService = new AlgarethProactiveService(geminiApiKey, agentManager);
    await proactiveService.initialize();
    console.log('✅ Service Proactif initialisé');

    // 3. Tests des cas d'usage
    console.log('\n📋 Étape 3: Tests des cas d\'usage');
    await testUseCases(proactiveService);

    // 4. Tests de performance
    console.log('\n📋 Étape 4: Tests de performance');
    await testPerformance(proactiveService);

    // 5. Statistiques finales
    console.log('\n📋 Étape 5: Statistiques finales');
    const stats = proactiveService.getStats();
    console.log('📊 Statistiques:', JSON.stringify(stats, null, 2));

    console.log('\n🎉 Test complet du système proactif terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur test système proactif:', error);
  }
}

/**
 * Teste différents cas d'usage
 */
async function testUseCases(proactiveService: AlgarethProactiveService): Promise<void> {
  const testCases = [
    {
      name: 'Question sur préférences (Archiviste)',
      message: 'Tu te souviens de mes préférences en couleurs ?',
      expectedServiteur: 'archivist'
    },
    {
      name: 'Question générale (Aucun serviteur)',
      message: 'Comment ça va ?',
      expectedServiteur: null
    },
    {
      name: 'Question technique (Future: Research Assistant)',
      message: 'Qu\'est-ce que React et comment ça marche ?',
      expectedServiteur: null // Pas encore implémenté
    },
    {
      name: 'Demande d\'image (Future: Image Generator)',
      message: 'Génère une image de paysage montagneux',
      expectedServiteur: null // Pas encore implémenté
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Test: ${testCase.name}`);
    
    const context: AlgarethContext = {
      userId: 'test_user',
      userName: 'Lucie',
      currentSession: 'test_session',
      userMessage: testCase.message,
      conversationHistory: [
        { role: 'user', content: 'Salut Algareth !' },
        { role: 'assistant', content: 'Salut Lucie ! Comment puis-je t\'aider ?' }
      ],
      sessionStartTime: new Date(Date.now() - 300000).toISOString()
    };

    try {
      // Test génération réponse enrichie
      const result = await proactiveService.generateEnhancedAlgarethResponse(
        testCase.message,
        context
      );

      console.log(`✅ Réponse générée en ${result.processingTime}ms`);
      
      // Vérifier si le prompt a été enrichi
      const isEnriched = result.enhancedPrompt.includes('CONTEXTE ENRICHI PAR TES SERVITEURS');
      console.log(`${isEnriched ? '✅' : '⚠️'} Prompt enrichi: ${isEnriched ? 'OUI' : 'NON'}`);

      // Test murmures détaillés
      const murmurs = await proactiveService.getDetailedMurmurs(testCase.message, context);
      console.log(`🔍 ${murmurs.length} murmurs générés`);
      
      if (murmurs.length > 0) {
        murmurs.forEach(murmur => {
          console.log(`   📝 ${murmur.serviteur}: ${murmur.message.substring(0, 100)}...`);
        });
      }

    } catch (error) {
      console.error(`❌ Erreur test ${testCase.name}:`, error);
    }
  }
}

/**
 * Teste les performances du système
 */
async function testPerformance(proactiveService: AlgarethProactiveService): Promise<void> {
  console.log('⚡ Test de performance');

  const context: AlgarethContext = {
    userId: 'test_user',
    userName: 'Lucie',
    currentSession: 'test_session',
    userMessage: 'Tu te souviens de mes préférences ?',
    conversationHistory: [],
    sessionStartTime: new Date().toISOString()
  };

  const iterations = 3;
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    try {
      await proactiveService.generateEnhancedAlgarethResponse(
        context.userMessage,
        context
      );
      
      const endTime = Date.now();
      times.push(endTime - startTime);
      
      console.log(`   ⏱️ Itération ${i + 1}: ${endTime - startTime}ms`);
    } catch (error) {
      console.error(`   ❌ Erreur itération ${i + 1}:`, error);
    }
  }

  if (times.length > 0) {
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`📊 Performance:`);
    console.log(`   Moyenne: ${averageTime.toFixed(2)}ms`);
    console.log(`   Min: ${minTime}ms`);
    console.log(`   Max: ${maxTime}ms`);
  }
}

/**
 * Test rapide du système
 */
export async function quickTestProactiveSystem(): Promise<void> {
  console.log('⚡ Test rapide du système proactif');

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!geminiApiKey) {
      console.error('❌ Clé API Gemini non trouvée');
      return;
    }

    // Initialisation rapide
    const agentManager = new AgentManager({
      geminiApiKey,
      enableArchivist: true,
      enableLogging: false, // Désactiver les logs pour le test rapide
      maxConcurrentRequests: 3
    });

    await agentManager.initialize();
    
    const proactiveService = new AlgarethProactiveService(geminiApiKey, agentManager);
    await proactiveService.initialize();

    // Test simple
    const context: AlgarethContext = {
      userId: 'test_user',
      userName: 'Lucie',
      currentSession: 'test_session',
      userMessage: 'Tu te souviens de mes préférences ?',
      conversationHistory: [],
      sessionStartTime: new Date().toISOString()
    };

    const result = await proactiveService.generateEnhancedAlgarethResponse(
      context.userMessage,
      context
    );

    console.log(`✅ Test rapide réussi en ${result.processingTime}ms`);
    console.log(`📝 Prompt enrichi: ${result.enhancedPrompt.substring(0, 200)}...`);

  } catch (error) {
    console.error('❌ Erreur test rapide:', error);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testProactiveSystem().catch(console.error);
}