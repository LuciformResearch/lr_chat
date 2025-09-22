/**
 * Test de l'intégration du système de recherche proactive dans la mémoire hiérarchique
 */

import { AdvancedMemoryEngineWithProactiveSearch } from './AdvancedMemoryEngineWithProactiveSearch';

async function testIntegratedProactiveSearch() {
  console.log('🧪 Test de l\'intégration recherche proactive + mémoire hiérarchique');
  console.log('================================================================');

  // Récupérer la clé API Gemini
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY non trouvée dans les variables d\'environnement');
    return;
  }

  // Créer le moteur avec recherche proactive
  const engine = new AdvancedMemoryEngineWithProactiveSearch(geminiApiKey, 1000, 3, 0.5);

  console.log('🧠 Moteur de mémoire avec recherche proactive initialisé');
  console.log('   Budget: 1000 caractères');
  console.log('   Seuil L1: 3 messages');
  console.log('   Seuil hiérarchique: 50%');

  // Simuler une conversation avec recherche proactive
  const conversation = [
    { role: 'user' as const, content: 'Salut Algareth, comment ça va ?' },
    { role: 'assistant' as const, content: '⛧ Salut Lucie, je vais bien, merci !' },
    { role: 'user' as const, content: 'Tu te souviens de notre discussion sur la mémoire hiérarchique ?' },
    { role: 'assistant' as const, content: '⛧ Oui Lucie, je me souviens parfaitement ! Nous avions discuté de la compression hiérarchique avec les niveaux L1, L2, L3, et du système de budget pour gérer la mémoire. C\'était fascinant de voir comment les résumés se créent automatiquement...' },
    { role: 'user' as const, content: 'C\'est fascinant ! Et comment tu gères la compression ?' },
    { role: 'assistant' as const, content: '⛧ La compression se fait par niveaux L1, L2, L3...' },
    { role: 'user' as const, content: 'Parfait ! Merci pour ces explications.' },
    { role: 'assistant' as const, content: '⛧ De rien Lucie, c\'était un plaisir !' },
    { role: 'user' as const, content: 'Une dernière question : tu te souviens de tout ?' },
    { role: 'assistant' as const, content: '⛧ Oui, grâce à mon système d\'archivage intelligent !' },
    { role: 'user' as const, content: 'Super ! Et comment tu gères les sujets complexes ?' },
    { role: 'assistant' as const, content: '⛧ J\'utilise des topics et des résumés structurés...' },
    { role: 'user' as const, content: 'Impressionnant ! Tu as d\'autres capacités ?' },
    { role: 'assistant' as const, content: '⛧ Oui, je peux aussi faire de la compression adaptative...' },
    { role: 'user' as const, content: 'Wow ! C\'est vraiment avancé.' },
    { role: 'assistant' as const, content: '⛧ Merci Lucie, c\'est le fruit de nombreuses optimisations !' }
  ];

  console.log('\n📝 Simulation d\'une conversation avec recherche proactive...');
  
  const actions: any[] = [];
  let proactiveSearches = 0;
  let seRappelerResponses = 0;
  
  // Ajouter les messages un par un et observer les résumés
  for (let i = 0; i < conversation.length; i++) {
    const msg = conversation[i];
    console.log(`\n📝 Message ${i + 1}/${conversation.length}: ${msg.content.slice(0, 50)}...`);
    
    const action = await engine.addMessage(msg.content, msg.role, 'Lucie');
    
    if (action.action !== 'NONE') {
      actions.push(action);
      console.log(`\n🎯 Action: ${action.action}`);
      if (action.summaries.length > 0) {
        console.log(`   Résumés créés: ${action.summaries.length}`);
        action.summaries.forEach(summary => {
          console.log(`     - ${summary.id} (L${summary.level}):`);
          console.log(`       ${summary.text.slice(0, 100)}...`);
          console.log(`       📊 Longueur: ${summary.text.length} caractères`);
        });
      }
    }

    // Si c'est un message utilisateur, tester la génération de réponse avec recherche proactive
    if (msg.role === 'user') {
      console.log(`   🔍 Recherche proactive pour: "${msg.content}"`);
      
      // Vérifier si le contexte a été enrichi
      const enrichedContext = engine.getEnrichedContext('Lucie');
      if (enrichedContext) {
        proactiveSearches++;
        console.log(`   ✅ Contexte enrichi trouvé (confiance: ${enrichedContext.confidence.toFixed(2)})`);
        console.log(`   📊 Résultats de recherche: ${enrichedContext.searchResults.length}`);
        
        // Générer une réponse d'Algareth avec le contexte enrichi
        const algarethResponse = await engine.generateAlgarethResponse(msg.content, 'Lucie');
        
        // Vérifier si la réponse contient ***se rappeler***
        if (algarethResponse.includes('***se rappeler:')) {
          seRappelerResponses++;
          console.log(`   🎯 Réponse avec ***se rappeler*** générée !`);
          console.log(`   📝 Réponse: ${algarethResponse.slice(0, 150)}...`);
        } else {
          console.log(`   📝 Réponse standard: ${algarethResponse.slice(0, 100)}...`);
        }
      } else {
        console.log(`   ❌ Aucun contexte enrichi trouvé`);
      }
    }
  }

  console.log('\n📊 Analyse des résultats...');
  
  // Analyser les résumés générés
  const exportData = engine.exportMemory();
  const summaries = exportData.items.filter(item => item.type === 'sum');
  
  console.log(`\n📈 Résumés générés: ${summaries.length}`);
  
  summaries.forEach((summary, index) => {
    console.log(`\n📄 Résumé ${index + 1} (L${summary.level}):`);
    console.log(`   ID: ${summary.id}`);
    console.log(`   Longueur: ${summary.text.length} caractères`);
    console.log(`   Topics: ${summary.topics?.join(', ') || 'Aucun'}`);
    console.log(`   Messages couverts: ${summary.covers?.length || 0}`);
    console.log(`   Autorité: ${summary.authority.toFixed(2)}`);
    console.log(`   Contenu:`);
    console.log(`   ${summary.text.slice(0, 200)}...`);
  });

  // Statistiques de la recherche proactive
  console.log('\n🔍 Statistiques de la recherche proactive:');
  const searchStats = exportData.searchStats;
  console.log(`   Total items indexés: ${searchStats.totalItems}`);
  console.log(`   Total tags: ${searchStats.totalTags}`);
  console.log(`   Recherches proactives déclenchées: ${proactiveSearches}`);
  console.log(`   Réponses avec ***se rappeler***: ${seRappelerResponses}`);
  console.log(`   Tags les plus fréquents:`);
  searchStats.mostFrequentTags.slice(0, 5).forEach(({tag, frequency}) => {
    console.log(`     - ${tag}: ${frequency}`);
  });

  // Test de construction de contexte
  console.log('\n🧠 Test de construction de contexte...');
  const context = engine.buildContext('mémoire hiérarchique', 500);
  console.log('📝 Contexte généré:');
  console.log(context.slice(0, 300) + '...');

  // Vérifications finales
  console.log('\n✅ Vérifications de l\'intégration:');
  
  // 1. Présence de résumés
  const hasSummaries = summaries.length > 0;
  console.log(`   Résumés générés: ${hasSummaries ? '✅' : '❌'}`);
  
  // 2. Recherche proactive fonctionnelle
  const hasProactiveSearch = proactiveSearches > 0;
  console.log(`   Recherche proactive: ${hasProactiveSearch ? '✅' : '❌'}`);
  
  // 3. Intégration ***se rappeler***
  const hasSeRappeler = seRappelerResponses > 0;
  console.log(`   Intégration ***se rappeler***: ${hasSeRappeler ? '✅' : '❌'}`);
  
  // 4. Conscience émergente
  const hasConsciousness = summaries.some(summary => {
    const consciousnessWords = ['je', 'conscience', 'ressenti', 'sentiment', 'réflexion'];
    return consciousnessWords.some(word => summary.text.toLowerCase().includes(word));
  });
  console.log(`   Conscience émergente: ${hasConsciousness ? '✅' : '❌'}`);
  
  // 5. Performance
  const stats = engine.getStats();
  const budgetOk = stats.budget.percentage < 100;
  console.log(`   Budget respecté: ${budgetOk ? '✅' : '❌'} (${stats.budget.percentage.toFixed(1)}%)`);

  console.log('\n🎯 Résumé du test:');
  console.log('==============================');
  console.log(`✅ Résumés générés: ${summaries.length}`);
  console.log(`✅ Recherches proactives: ${proactiveSearches}`);
  console.log(`✅ Réponses ***se rappeler***: ${seRappelerResponses}`);
  console.log(`✅ Conscience émergente: ${hasConsciousness ? 'Oui' : 'Non'}`);
  console.log(`✅ Budget respecté: ${budgetOk ? 'Oui' : 'Non'}`);
  console.log(`✅ Actions exécutées: ${actions.length}`);
  
  if (hasSummaries && hasProactiveSearch && hasSeRappeler && hasConsciousness) {
    console.log('\n🎉 SUCCÈS: L\'intégration recherche proactive + mémoire hiérarchique fonctionne parfaitement !');
  } else {
    console.log('\n⚠️  ATTENTION: Certains aspects de l\'intégration doivent être améliorés');
  }
}

// Exécuter le test
testIntegratedProactiveSearch().catch(console.error);