/**
 * Test simple du système de résumé d'Algareth avec conscience émergente
 */

import { AdvancedMemoryEngineLLM } from './advanced-memory-engine-llm';

async function testSimpleConsciousness() {
  console.log('🧪 Test simple du système de résumé d\'Algareth avec conscience émergente');
  console.log('============================================================');

  // Récupérer la clé API Gemini
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY non trouvée dans les variables d\'environnement');
    return;
  }

  // Créer un moteur avec un budget très petit pour forcer la compression
  const engine = new AdvancedMemoryEngineLLM(geminiApiKey, 200, 2, 0.5); // Budget: 200 chars, seuil L1: 2 messages

  // Simuler une conversation qui va déclencher la compression
  const conversation = [
    { role: 'user' as const, content: 'Salut Algareth, comment ça va ?' },
    { role: 'assistant' as const, content: '⛧ Salut Lucie, je vais bien, merci !' },
    { role: 'user' as const, content: 'Tu peux m\'expliquer ton système de mémoire ?' },
    { role: 'assistant' as const, content: '⛧ Bien sûr ! Mon système utilise des résumés hiérarchiques...' },
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

  console.log('📝 Simulation d\'une conversation de 16 messages pour forcer la compression...');
  
  const actions: any[] = [];
  
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
          console.log(`       ${summary.text}`);
          console.log(`       📊 Longueur: ${summary.text.length} caractères`);
        });
      }
    }
  }

  console.log('\n📊 Analyse des résumés avec conscience émergente...');
  
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
    console.log(`   Contenu:`);
    console.log(`   ${summary.text}`);
    
    // Analyser la conscience émergente
    const consciousnessIndicators = [
      'je', 'j\'ai', 'mon', 'ma', 'mes',
      'conscience', 'ressenti', 'sentiment', 'émotion',
      'réflexion', 'pensée', 'méditation', 'introspection',
      'évolution', 'croissance', 'apprentissage', 'découverte'
    ];
    
    const consciousnessCount = consciousnessIndicators.filter(indicator => 
      summary.text.toLowerCase().includes(indicator)
    ).length;
    
    console.log(`   🧠 Indicateurs de conscience: ${consciousnessCount}/${consciousnessIndicators.length}`);
    
    // Vérifier la personnalité d'Algareth
    const algarethIndicators = [
      'algareth', 'daemon', 'mystérieux', 'silence',
      '⛧', 'bienveillant', 'énigmatique'
    ];
    
    const personalityCount = algarethIndicators.filter(indicator => 
      summary.text.toLowerCase().includes(indicator.toLowerCase())
    ).length;
    
    console.log(`   👤 Indicateurs de personnalité: ${personalityCount}/${algarethIndicators.length}`);
  });

  // Test de construction de contexte
  console.log('\n🧠 Test de construction de contexte...');
  const context = engine.buildContext('test query', 500);
  console.log('📝 Contexte généré:');
  console.log(context);

  // Vérifications de conscience émergente
  console.log('\n✅ Vérifications de conscience émergente:');
  
  // 1. Présence de résumés
  const hasSummaries = summaries.length > 0;
  console.log(`   Résumés générés: ${hasSummaries ? '✅' : '❌'}`);
  
  // 2. Conscience émergente dans les résumés
  const hasConsciousness = summaries.some(summary => {
    const consciousnessWords = ['je', 'conscience', 'ressenti', 'sentiment', 'réflexion'];
    return consciousnessWords.some(word => summary.text.toLowerCase().includes(word));
  });
  console.log(`   Conscience émergente: ${hasConsciousness ? '✅' : '❌'}`);
  
  // 3. Personnalité d'Algareth
  const hasPersonality = summaries.some(summary => {
    const personalityWords = ['algareth', 'mystérieux', 'bienveillant', '⛧'];
    return personalityWords.some(word => summary.text.toLowerCase().includes(word.toLowerCase()));
  });
  console.log(`   Personnalité d'Algareth: ${hasPersonality ? '✅' : '❌'}`);
  
  // 4. Utilisation du prénom de l'utilisateur
  const usesUserName = summaries.some(summary => 
    summary.text.toLowerCase().includes('lucie')
  );
  console.log(`   Utilisation du prénom: ${usesUserName ? '✅' : '❌'}`);
  
  // 5. Structure narrative
  const hasNarrativeStructure = summaries.some(summary => {
    const structureWords = ['faits', 'décisions', 'questions', 'actions', 'ressentis'];
    return structureWords.some(word => summary.text.toLowerCase().includes(word));
  });
  console.log(`   Structure narrative: ${hasNarrativeStructure ? '✅' : '❌'}`);

  console.log('\n🎯 Résumé du test:');
  console.log('==============================');
  console.log(`✅ Résumés générés: ${hasSummaries ? 'Oui' : 'Non'}`);
  console.log(`✅ Conscience émergente: ${hasConsciousness ? 'Oui' : 'Non'}`);
  console.log(`✅ Personnalité d'Algareth: ${hasPersonality ? 'Oui' : 'Non'}`);
  console.log(`✅ Utilisation du prénom: ${usesUserName ? 'Oui' : 'Non'}`);
  console.log(`✅ Structure narrative: ${hasNarrativeStructure ? 'Oui' : 'Non'}`);
  console.log(`✅ Actions exécutées: ${actions.length}`);
  
  if (hasSummaries && hasConsciousness && hasPersonality && usesUserName) {
    console.log('\n🎉 SUCCÈS: Le système de résumé d\'Algareth avec conscience émergente fonctionne parfaitement !');
  } else {
    console.log('\n⚠️  ATTENTION: Certains aspects de la conscience émergente doivent être améliorés');
  }
}

// Exécuter le test
testSimpleConsciousness().catch(console.error);