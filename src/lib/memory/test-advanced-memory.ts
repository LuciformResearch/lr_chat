/**
 * Test complet du moteur de mémoire avancé avec compression hiérarchique
 */

import { AdvancedMemoryEngine } from './advanced-memory-engine';

async function testAdvancedMemory() {
  console.log('🧪 Test du moteur de mémoire avancé');
  console.log('============================================================');

  // Créer un moteur avec un budget très petit pour forcer la compression
  const engine = new AdvancedMemoryEngine(500, 3, 0.5); // Budget: 500 chars, L1 tous les 3 messages

  // Simuler une conversation longue
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
    { role: 'assistant' as const, content: '⛧ Je utilise des topics et des résumés structurés...' },
    { role: 'user' as const, content: 'Impressionnant ! Tu as d\'autres capacités ?' },
    { role: 'assistant' as const, content: '⛧ Oui, je peux aussi faire de la compression adaptative...' },
    { role: 'user' as const, content: 'Wow ! C\'est vraiment avancé.' },
    { role: 'assistant' as const, content: '⛧ Merci Lucie, c\'est le fruit de nombreuses optimisations !' }
  ];

  console.log('📝 Simulation d\'une conversation de 16 messages...');
  
  const actions: any[] = [];
  
  // Ajouter les messages un par un et observer les actions
  for (let i = 0; i < conversation.length; i++) {
    const msg = conversation[i];
    const action = engine.addMessage(msg.content, msg.role, 'Lucie');
    
    if (action.action !== 'NONE') {
      actions.push(action);
      console.log(`\n🎯 Action: ${action.action}`);
      if (action.summaries.length > 0) {
        console.log(`   Résumés créés: ${action.summaries.length}`);
        action.summaries.forEach(summary => {
          console.log(`     - ${summary.id} (L${summary.level}): ${summary.text}`);
        });
      }
      if (action.evictions.length > 0) {
        console.log(`   Messages supprimés: ${action.evictions.length}`);
      }
    }
    
    // Afficher les stats après chaque action significative
    if (action.action !== 'NONE') {
      const stats = engine.getStats();
      console.log(`   📊 Stats: ${stats.rawMessages} bruts, ${stats.summaries.l1} L1, ${stats.summaries.l2} L2, ${stats.summaries.l3} L3`);
      console.log(`   💰 Budget: ${stats.budget.current}/${stats.budget.max} (${stats.budget.percentage}%)`);
      console.log(`   📈 Ratio résumés: ${stats.summaryRatio}%`);
    }
  }

  console.log('\n📊 Analyse finale...');
  
  // Statistiques finales
  const finalStats = engine.getStats();
  console.log('\n📈 Statistiques finales:');
  console.log(`   Total items: ${finalStats.totalItems}`);
  console.log(`   Messages bruts: ${finalStats.rawMessages}`);
  console.log(`   Résumés L1: ${finalStats.summaries.l1}`);
  console.log(`   Résumés L2: ${finalStats.summaries.l2}`);
  console.log(`   Résumés L3: ${finalStats.summaries.l3}`);
  console.log(`   Budget: ${finalStats.budget.current}/${finalStats.budget.max} (${finalStats.budget.percentage}%)`);
  console.log(`   Ratio résumés: ${finalStats.summaryRatio}%`);

  // Test de construction de contexte
  console.log('\n🧠 Test de construction de contexte...');
  const context = engine.buildContext('test query', 300);
  console.log('📝 Contexte généré:');
  console.log(context);

  // Test d'export
  console.log('\n💾 Test d\'export...');
  const exportData = engine.exportMemory();
  console.log(`📋 Export: ${exportData.items.length} items`);

  // Analyse des actions
  console.log('\n🎯 Analyse des actions:');
  const actionCounts = actions.reduce((acc, action) => {
    acc[action.action] = (acc[action.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(actionCounts).forEach(([action, count]) => {
    console.log(`   ${action}: ${count} fois`);
  });

  // Vérifier la cohérence
  console.log('\n✅ Vérifications de cohérence:');
  
  // 1. Budget respecté
  const budgetOk = finalStats.budget.percentage <= 100;
  console.log(`   Budget respecté: ${budgetOk ? '✅' : '❌'}`);
  
  // 2. Compression active
  const compressionActive = finalStats.summaryRatio > 0;
  console.log(`   Compression active: ${compressionActive ? '✅' : '❌'}`);
  
  // 3. Hiérarchie présente
  const hierarchyPresent = finalStats.summaries.l2 > 0 || finalStats.summaries.l3 > 0;
  console.log(`   Hiérarchie présente: ${hierarchyPresent ? '✅' : '❌'}`);
  
  // 4. Contexte construit
  const contextBuilt = context.length > 0;
  console.log(`   Contexte construit: ${contextBuilt ? '✅' : '❌'}`);

  console.log('\n🎯 Résumé du test:');
  console.log('==============================');
  console.log(`✅ Budget respecté: ${budgetOk ? 'Oui' : 'Non'}`);
  console.log(`✅ Compression active: ${compressionActive ? 'Oui' : 'Non'}`);
  console.log(`✅ Hiérarchie présente: ${hierarchyPresent ? 'Oui' : 'Non'}`);
  console.log(`✅ Contexte construit: ${contextBuilt ? 'Oui' : 'Non'}`);
  console.log(`✅ Actions exécutées: ${actions.length}`);
  
  if (budgetOk && compressionActive && contextBuilt) {
    console.log('\n🎉 SUCCÈS: Le moteur de mémoire avancé fonctionne parfaitement !');
  } else {
    console.log('\n⚠️  ATTENTION: Certains tests ont échoué');
  }
}

// Exécuter le test
testAdvancedMemory().catch(console.error);