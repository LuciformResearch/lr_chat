/**
 * Test de la logique de compression sans appels LLM
 * Valide que les résumés remplacent bien les messages originaux
 */

import { PureMemoryEngine } from './pure-memory-engine';

// Mock de l'API Gemini
const mockGemini = {
  generateContent: async (prompt: string) => ({
    response: {
      text: () => `Résumé L1: ${prompt.slice(0, 50)}...`
    }
  })
};

// Mock du modèle
const mockModel = {
  generateContent: mockGemini.generateContent
};

async function testCompressionLogic() {
  console.log('🧪 Test de la logique de compression');
  console.log('============================================================');

  // Créer un moteur avec un budget très petit pour forcer la compression
  const engine = new PureMemoryEngine({
    maxCharacters: 100, // Budget très petit
    l1Threshold: 3,     // Seuil L1 très bas
    budgetThreshold: 0.5
  });

  // Remplacer le modèle par le mock
  (engine as any).model = mockModel;

  console.log('📝 Ajout de 5 messages...');
  
  // Ajouter 5 messages
  for (let i = 1; i <= 5; i++) {
    await engine.addMessage(`Message utilisateur ${i}`, 'user', 'Lucie');
    await engine.addMessage(`Réponse Algareth ${i}`, 'assistant', 'Lucie');
  }

  const stats = engine.getStats();
  console.log('\n📊 Statistiques après ajout:');
  console.log(`   - Messages bruts: ${stats.totalMessages}`);
  console.log(`   - Résumés L1: ${stats.l1Count}`);
  console.log(`   - Budget: ${stats.budget.current}/${stats.budget.max} (${stats.budget.percentage}%)`);

  // Vérifier que les messages ont été remplacés par des résumés
  if (stats.totalMessages === 0 && stats.l1Count > 0) {
    console.log('✅ SUCCÈS: Les messages ont été remplacés par des résumés');
  } else {
    console.log('❌ ÉCHEC: Les messages n\'ont pas été remplacés');
    console.log(`   Messages bruts restants: ${stats.totalMessages}`);
    console.log(`   Résumés créés: ${stats.l1Count}`);
  }

  // Tester la construction de contexte
  console.log('\n🧠 Test de construction de contexte...');
  const context = engine.buildContext('test query', 200);
  console.log(`📝 Contexte généré (${context.length} chars):`);
  console.log(context);

  // Vérifier que le contexte contient les résumés
  if (context.includes('Résumé L1')) {
    console.log('✅ SUCCÈS: Le contexte contient les résumés');
  } else {
    console.log('❌ ÉCHEC: Le contexte ne contient pas les résumés');
  }

  // Tester l'export
  console.log('\n💾 Test d\'export...');
  const exportData = engine.exportMemory();
  console.log(`📋 Export: ${exportData.messages.length} messages, ${exportData.summaries.length} résumés, ${exportData.archivedMessages.length} messages archivés`);

  if (exportData.summaries.length > 0) {
    console.log('✅ SUCCÈS: Les résumés sont exportés');
    console.log(`   Premier résumé: ${exportData.summaries[0].content}`);
    console.log(`   Messages couverts: ${exportData.summaries[0].covers.length}`);
    
    // Tester la récupération des messages archivés
    console.log('\n📦 Test de récupération des messages archivés...');
    const archivedMessages = engine.getArchivedMessages(exportData.summaries[0].id);
    console.log(`   Messages archivés récupérés: ${archivedMessages.length}`);
    
    if (archivedMessages.length > 0) {
      console.log('✅ SUCCÈS: Les messages archivés sont récupérables');
      console.log(`   Premier message archivé: ${archivedMessages[0].content}`);
    } else {
      console.log('❌ ÉCHEC: Impossible de récupérer les messages archivés');
    }
  } else {
    console.log('❌ ÉCHEC: Aucun résumé dans l\'export');
  }

  console.log('\n🎯 Résumé du test:');
  console.log('==============================');
  console.log(`✅ Messages remplacés: ${stats.totalMessages === 0 ? 'Oui' : 'Non'}`);
  console.log(`✅ Résumés créés: ${stats.l1Count > 0 ? 'Oui' : 'Non'}`);
  console.log(`✅ Contexte avec résumés: ${context.includes('Résumé L1') ? 'Oui' : 'Non'}`);
  console.log(`✅ Export des résumés: ${exportData.summaries.length > 0 ? 'Oui' : 'Non'}`);
  console.log(`✅ Messages archivés: ${exportData.archivedMessages.length > 0 ? 'Oui' : 'Non'}`);
  console.log(`✅ Récupération archivés: ${exportData.summaries.length > 0 && engine.getArchivedMessages(exportData.summaries[0].id).length > 0 ? 'Oui' : 'Non'}`);
}

// Exécuter le test
testCompressionLogic().catch(console.error);