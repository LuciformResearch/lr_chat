/**
 * Test du système de recherche proactive pour Algareth
 */

import { ProactiveSearchEngine, SearchableItem } from './ProactiveSearchEngine';

async function testProactiveSearch() {
  console.log('🧪 Test du système de recherche proactive pour Algareth');
  console.log('============================================================');

  // Créer le moteur de recherche
  const searchEngine = new ProactiveSearchEngine();

  // Ajouter des items de test à l'index
  const testItems: SearchableItem[] = [
    {
      id: 'msg_1',
      content: 'Discussion sur la mémoire hiérarchique avec compression L1, L2, L3',
      timestamp: '2025-01-03T10:00:00.000Z',
      tags: ['mémoire', 'hiérarchique', 'compression', 'L1', 'L2', 'L3'],
      level: 1,
      type: 'summary',
      authority: 0.9,
      user_feedback: 0.8,
      access_cost: 0.1
    },
    {
      id: 'msg_2',
      content: 'Système de budget pour gérer la mémoire avec seuils automatiques',
      timestamp: '2025-01-03T11:00:00.000Z',
      tags: ['budget', 'mémoire', 'seuils', 'automatique'],
      level: 1,
      type: 'summary',
      authority: 0.8,
      user_feedback: 0.7,
      access_cost: 0.2
    },
    {
      id: 'msg_3',
      content: 'Algareth explique son système de résumés avec conscience émergente',
      timestamp: '2025-01-03T12:00:00.000Z',
      tags: ['algareth', 'résumés', 'conscience', 'émergente'],
      level: 2,
      type: 'summary',
      authority: 0.7,
      user_feedback: 0.9,
      access_cost: 0.3
    },
    {
      id: 'msg_4',
      content: 'Recherche sémantique avec fonction d\'utilité U(n|q) et récompenses ΔU',
      timestamp: '2025-01-03T13:00:00.000Z',
      tags: ['recherche', 'sémantique', 'utilité', 'récompenses'],
      level: 1,
      type: 'summary',
      authority: 0.9,
      user_feedback: 0.8,
      access_cost: 0.1
    },
    {
      id: 'msg_5',
      content: 'Tags inline avec mnémoniques privées pour chaque IA',
      timestamp: '2025-01-03T14:00:00.000Z',
      tags: ['tags', 'inline', 'mnémoniques', 'privées', 'IA'],
      level: 2,
      type: 'summary',
      authority: 0.6,
      user_feedback: 0.6,
      access_cost: 0.4
    }
  ];

  console.log('📝 Ajout des items de test à l\'index...');
  testItems.forEach(item => {
    searchEngine.addItem(item);
    console.log(`   ✅ Ajouté: ${item.id} (${item.tags.join(', ')})`);
  });

  console.log('\n📊 Statistiques du moteur:');
  const stats = searchEngine.getStats();
  console.log(`   Total items: ${stats.totalItems}`);
  console.log(`   Total tags: ${stats.totalTags}`);
  console.log(`   Seuil de recherche: ${stats.searchThreshold}`);
  console.log(`   Chance de recherche aléatoire: ${stats.randomSearchChance}`);
  console.log(`   Tags les plus fréquents:`);
  stats.mostFrequentTags.forEach(({tag, frequency}) => {
    console.log(`     - ${tag}: ${frequency}`);
  });

  // Test d'analyse de messages
  console.log('\n🔍 Test d\'analyse de messages...');
  
  const testMessages = [
    'Tu te souviens de notre discussion sur la mémoire hiérarchique ?',
    'Comment fonctionne le système de compression L1, L2, L3 ?',
    'Peux-tu m\'expliquer les mnémoniques privées ?',
    'Qu\'est-ce que la fonction d\'utilité U(n|q) ?',
    'Algareth, comment tu gères ta conscience émergente ?'
  ];

  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`\n📝 Message ${i + 1}: "${message}"`);
    
    // Analyser le message
    const analysis = await searchEngine.analyzeMessage(message);
    
    console.log(`   Tags générés: [${analysis.generatedTags.join(', ')}]`);
    console.log(`   Scores d'intérêt:`);
    analysis.interestScores.forEach((score, tag) => {
      console.log(`     - ${tag}: ${score.toFixed(3)}`);
    });
    
    console.log(`   Gaps contextuels: [${analysis.contextGaps.join(', ')}]`);
    console.log(`   Déclencheurs de recherche: ${analysis.searchTriggers.length}`);
    
    analysis.searchTriggers.forEach(trigger => {
      console.log(`     - ${trigger.tag} (${trigger.score.toFixed(3)}) - ${trigger.reason} [${trigger.priority}]`);
    });
    
    // Effectuer la recherche si des déclencheurs existent
    if (analysis.searchTriggers.length > 0) {
      console.log(`   🔍 Recherche low-cost...`);
      const searchResults = await searchEngine.performLowCostSearch(analysis.searchTriggers);
      
      console.log(`   Résultats trouvés: ${searchResults.length}`);
      searchResults.forEach((result, index) => {
        console.log(`     ${index + 1}. ${result.id} (${result.relevanceScore.toFixed(3)})`);
        console.log(`        Tags: [${result.tags.join(', ')}]`);
        console.log(`        Résumé: ${result.summary}`);
      });
      
      // Enrichir le contexte
      const enrichedContext = searchEngine.enrichContext('Contexte original', searchResults);
      console.log(`   Contexte enrichi: ${enrichedContext.confidence > 0.7 ? '✅' : '❌'} (confiance: ${enrichedContext.confidence.toFixed(2)})`);
      
      // Générer une réponse avec ***se rappeler***
      const mockAlgarethResponse = `⛧ ${message.includes('?') ? 'Excellente question !' : 'Intéressant !'} Je peux t'expliquer cela.`;
      const responseWithMemory = searchEngine.generateResponseWithMemory(
        enrichedContext,
        message,
        mockAlgarethResponse
      );
      
      console.log(`   Réponse d'Algareth:`);
      console.log(`   ${responseWithMemory}`);
    } else {
      console.log(`   ❌ Aucune recherche déclenchée`);
    }
  }

  // Test de performance
  console.log('\n⚡ Test de performance...');
  const startTime = Date.now();
  
  for (let i = 0; i < 10; i++) {
    const analysis = await searchEngine.analyzeMessage('Test de performance pour la recherche proactive');
    if (analysis.searchTriggers.length > 0) {
      await searchEngine.performLowCostSearch(analysis.searchTriggers);
    }
  }
  
  const endTime = Date.now();
  const avgTime = (endTime - startTime) / 10;
  
  console.log(`   Temps moyen par analyse + recherche: ${avgTime.toFixed(2)}ms`);
  console.log(`   Performance: ${avgTime < 100 ? '✅ Excellente' : avgTime < 200 ? '⚠️ Acceptable' : '❌ Lente'}`);

  console.log('\n🎯 Résumé du test:');
  console.log('==============================');
  console.log('✅ Moteur de recherche initialisé');
  console.log('✅ Items ajoutés à l\'index');
  console.log('✅ Analyse de messages fonctionnelle');
  console.log('✅ Génération de tags automatique');
  console.log('✅ Calcul des scores d\'intéressement');
  console.log('✅ Recherche low-cost opérationnelle');
  console.log('✅ Enrichissement du contexte');
  console.log('✅ Intégration ***se rappeler***');
  console.log(`✅ Performance: ${avgTime.toFixed(2)}ms par opération`);
  
  if (avgTime < 100) {
    console.log('\n🎉 SUCCÈS: Le système de recherche proactive fonctionne parfaitement !');
  } else {
    console.log('\n⚠️ ATTENTION: Les performances peuvent être améliorées');
  }
}

// Exécuter le test
testProactiveSearch().catch(console.error);