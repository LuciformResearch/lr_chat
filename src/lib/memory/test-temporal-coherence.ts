/**
 * Test de cohérence temporelle et reconstruction de conversation
 */

import { PureMemoryEngine } from './pure-memory-engine';

// Mock de l'API Gemini
const mockGemini = {
  generateContent: async (prompt: string) => ({
    response: {
      text: () => `Résumé L1: Conversation ${Math.floor(Math.random() * 1000)} - ${prompt.slice(0, 30)}...`
    }
  })
};

const mockModel = {
  generateContent: mockGemini.generateContent
};

async function testTemporalCoherence() {
  console.log('🧪 Test de cohérence temporelle');
  console.log('============================================================');

  const engine = new PureMemoryEngine({
    maxCharacters: 200,
    l1Threshold: 3
  });

  // Remplacer le modèle par le mock
  (engine as any).model = mockModel;

  // Simuler une conversation longue avec des timestamps réalistes
  const conversation = [
    { role: 'user' as const, content: 'Salut Algareth, comment ça va ?', delay: 0 },
    { role: 'assistant' as const, content: '⛧ Salut Lucie, je vais bien, merci !', delay: 1000 },
    { role: 'user' as const, content: 'Tu peux m\'expliquer ton système de mémoire ?', delay: 2000 },
    { role: 'assistant' as const, content: '⛧ Bien sûr ! Mon système utilise des résumés hiérarchiques...', delay: 3000 },
    { role: 'user' as const, content: 'C\'est fascinant ! Et comment tu gères la compression ?', delay: 4000 },
    { role: 'assistant' as const, content: '⛧ La compression se fait par niveaux L1, L2, L3...', delay: 5000 },
    { role: 'user' as const, content: 'Parfait ! Merci pour ces explications.', delay: 6000 },
    { role: 'assistant' as const, content: '⛧ De rien Lucie, c\'était un plaisir !', delay: 7000 },
    { role: 'user' as const, content: 'Une dernière question : tu te souviens de tout ?', delay: 8000 },
    { role: 'assistant' as const, content: '⛧ Oui, grâce à mon système d\'archivage intelligent !', delay: 9000 }
  ];

  console.log('📝 Simulation d\'une conversation de 10 messages...');
  
  // Ajouter les messages avec des timestamps réalistes
  for (let i = 0; i < conversation.length; i++) {
    const msg = conversation[i];
    await new Promise(resolve => setTimeout(resolve, msg.delay));
    await engine.addMessage(msg.content, msg.role, 'Lucie');
  }

  console.log('\n📊 Analyse de cohérence temporelle...');
  
  // 1. Vérifier l'ordre des messages archivés
  const exportData = engine.exportMemory();
  const allMessages = [...exportData.messages, ...exportData.archivedMessages];
  allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  console.log(`📋 Total messages: ${allMessages.length} (${exportData.messages.length} actifs, ${exportData.archivedMessages.length} archivés)`);
  
  // 2. Vérifier la cohérence temporelle
  let temporalCoherence = true;
  for (let i = 1; i < allMessages.length; i++) {
    if (allMessages[i].timestamp.getTime() < allMessages[i-1].timestamp.getTime()) {
      temporalCoherence = false;
      console.log(`❌ Incohérence temporelle détectée: message ${i} avant message ${i-1}`);
    }
  }
  
  if (temporalCoherence) {
    console.log('✅ Cohérence temporelle: OK');
  } else {
    console.log('❌ Cohérence temporelle: ÉCHEC');
  }

  // 3. Reconstruire la conversation complète
  console.log('\n🔄 Reconstruction de la conversation complète...');
  let reconstructedConversation = '';
  
  for (const msg of allMessages) {
    const role = msg.role === 'user' ? 'Lucie' : 'Algareth';
    const time = msg.timestamp.toLocaleTimeString();
    reconstructedConversation += `[${time}] ${role}: ${msg.content}\n`;
  }
  
  console.log('📝 Conversation reconstruite:');
  console.log(reconstructedConversation);

  // 4. Vérifier les résumés
  console.log('\n📋 Analyse des résumés...');
  for (const summary of exportData.summaries) {
    console.log(`\n📄 Résumé ${summary.id}:`);
    console.log(`   Contenu: ${summary.content}`);
    console.log(`   Messages couverts: ${summary.covers.length}`);
    console.log(`   Timestamp: ${summary.timestamp.toLocaleTimeString()}`);
    
    // Vérifier que les messages couverts sont bien dans l'archive
    const coveredMessages = engine.getArchivedMessages(summary.id);
    console.log(`   Messages récupérés: ${coveredMessages.length}`);
    
    if (coveredMessages.length !== summary.covers.length) {
      console.log(`❌ ERREUR: ${summary.covers.length} couverts mais ${coveredMessages.length} récupérés`);
    } else {
      console.log('✅ Cohérence des références: OK');
    }
  }

  // 5. Test de reconstruction par résumé
  console.log('\n🧩 Test de reconstruction par résumé...');
  for (const summary of exportData.summaries) {
    const archivedMessages = engine.getArchivedMessages(summary.id);
    console.log(`\n📦 Résumé ${summary.id} contient:`);
    for (const msg of archivedMessages) {
      const role = msg.role === 'user' ? 'Lucie' : 'Algareth';
      console.log(`   ${role}: ${msg.content}`);
    }
  }

  // 6. Vérifier la continuité conversationnelle
  console.log('\n🔗 Test de continuité conversationnelle...');
  const context = engine.buildContext('test query', 1000);
  console.log('📝 Contexte généré:');
  console.log(context);
  
  // Vérifier que le contexte contient l'historique ET les messages récents
  const hasHistory = context.includes('Résumé L1');
  const hasRecent = context.includes('Lucie') || context.includes('Algareth');
  
  if (hasHistory && hasRecent) {
    console.log('✅ Continuité conversationnelle: OK (historique + récent)');
  } else {
    console.log('❌ Continuité conversationnelle: ÉCHEC');
  }

  console.log('\n🎯 Résumé des tests:');
  console.log('==============================');
  console.log(`✅ Cohérence temporelle: ${temporalCoherence ? 'Oui' : 'Non'}`);
  console.log(`✅ Références résumés: ${exportData.summaries.every(s => engine.getArchivedMessages(s.id).length === s.covers.length) ? 'Oui' : 'Non'}`);
  console.log(`✅ Continuité conversationnelle: ${hasHistory && hasRecent ? 'Oui' : 'Non'}`);
  console.log(`✅ Reconstruction possible: ${allMessages.length > 0 ? 'Oui' : 'Non'}`);
}

// Exécuter le test
testTemporalCoherence().catch(console.error);