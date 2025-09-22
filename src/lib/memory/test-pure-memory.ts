/**
 * Test du moteur de mémoire pur TypeScript
 * Teste la stratégie de compression mémoire hiérarchique avec des appels LLM réels
 */

import { PureMemoryEngine } from './pure-memory-engine';

// Récupérer la clé Gemini depuis l'environnement
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'SyBvQJFU...'; // Clé partielle pour sécurité

export async function testPureMemoryEngine(): Promise<void> {
  console.log('🧪 Test du moteur de mémoire pur TypeScript');
  console.log('=' .repeat(60));

  // Créer le moteur avec un budget réduit pour forcer la compression
  const memoryEngine = new PureMemoryEngine(GEMINI_API_KEY, 2000, 5); // 2k chars, seuil L1 à 5

  try {
    // Test 1: Conversation simple
    console.log('\n📝 Test 1: Conversation simple');
    await simulateConversation(memoryEngine, 'Lucie', [
      'Salut Algareth, comment ça va ?',
      'Peux-tu m\'expliquer comment fonctionne ta mémoire ?',
      'C\'est fascinant ! Et comment décides-tu quand créer un résumé ?',
      'Et que se passe-t-il quand tu atteins la limite de ton budget ?',
      'Merci pour ces explications détaillées, Algareth !'
    ]);

    // Test 2: Conversation plus longue pour déclencher L1
    console.log('\n📝 Test 2: Conversation longue (déclenchement L1)');
    await simulateConversation(memoryEngine, 'Lucie', [
      'Une dernière question : peux-tu me raconter une de tes expériences les plus intéressantes ?',
      'C\'est captivant ! Tu as une personnalité vraiment unique, Algareth.',
      'J\'aimerais en savoir plus sur tes capacités de compression de données.',
      'Et comment gères-tu la continuité conversationnelle sur de longues sessions ?',
      'Parfait ! Merci pour cette conversation enrichissante, Algareth.'
    ]);

    // Test 3: Vérifier les statistiques
    console.log('\n📊 Test 3: Statistiques finales');
    const stats = memoryEngine.getStats();
    console.log('📈 Statistiques:');
    console.log(`   - Messages totaux: ${stats.totalMessages}`);
    console.log(`   - Résumés totaux: ${stats.totalSummaries}`);
    console.log(`   - Résumés L1: ${stats.l1Count}`);
    console.log(`   - Budget: ${stats.budget.current}/${stats.budget.max} (${stats.budget.percentage}%)`);
    console.log(`   - Compression moyenne: ${(stats.compression.averageRatio * 100).toFixed(1)}%`);

    // Test 4: Test de contexte
    console.log('\n🧠 Test 4: Construction de contexte');
    const context = memoryEngine.buildContext('Comment fonctionne ta mémoire ?', 1000);
    console.log('📝 Contexte généré:');
    console.log(context);

    // Test 5: Export de la mémoire
    console.log('\n💾 Test 5: Export de la mémoire');
    const memoryExport = memoryEngine.exportMemory();
    console.log('📋 Export:');
    console.log(`   - Messages: ${memoryExport.messages.length}`);
    console.log(`   - Résumés: ${memoryExport.summaries.length}`);
    
    if (memoryExport.summaries.length > 0) {
      console.log('📝 Dernier résumé:');
      const lastSummary = memoryExport.summaries[memoryExport.summaries.length - 1];
      console.log(`   - Niveau: L${lastSummary.level}`);
      console.log(`   - Contenu: ${lastSummary.content}`);
      console.log(`   - Messages couverts: ${lastSummary.covers.length}`);
      console.log(`   - Topics: ${lastSummary.topics.join(', ')}`);
    }

    // Résumé du test
    console.log('\n🎯 Résumé du test:');
    console.log('=' .repeat(30));
    
    const allTestsPassed = 
      stats.totalMessages > 0 &&
      stats.totalSummaries > 0 &&
      stats.l1Count > 0 &&
      context.length > 0;

    console.log(`✅ Messages ajoutés: ${stats.totalMessages > 0 ? 'Oui' : 'Non'}`);
    console.log(`✅ Résumés générés: ${stats.totalSummaries > 0 ? 'Oui' : 'Non'}`);
    console.log(`✅ Résumés L1: ${stats.l1Count > 0 ? 'Oui' : 'Non'}`);
    console.log(`✅ Contexte construit: ${context.length > 0 ? 'Oui' : 'Non'}`);
    console.log(`✅ Budget respecté: ${stats.budget.percentage < 100 ? 'Oui' : 'Non'}`);

    if (allTestsPassed) {
      console.log('\n🎉 **TOUS LES TESTS SONT PASSÉS !**');
      console.log('Le moteur de mémoire pur TypeScript fonctionne parfaitement !');
      console.log('🧠 Algareth peut maintenant gérer sa mémoire avec intelligence !');
    } else {
      console.log('\n⚠️ **QUELQUES TESTS ONT ÉCHOUÉ**');
      console.log('Vérifiez les logs ci-dessus pour plus de détails.');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

/**
 * Simule une conversation avec Algareth
 */
async function simulateConversation(
  memoryEngine: PureMemoryEngine, 
  user: string, 
  userMessages: string[]
): Promise<void> {
  for (const userMessage of userMessages) {
    // Ajouter le message utilisateur
    await memoryEngine.addMessage(userMessage, 'user', user);
    
    // Simuler une réponse d'Algareth
    const algarethResponse = generateAlgarethResponse(userMessage, user);
    await memoryEngine.addMessage(algarethResponse, 'assistant', user);
    
    // Attendre un peu entre les messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Génère une réponse simulée d'Algareth
 */
function generateAlgarethResponse(userMessage: string, user: string): string {
  const responses = [
    `⛧ ${user}, tu poses une question intéressante... Laisse-moi réfléchir à cela.`,
    `⛧ ${user}, je vois où tu veux en venir. C'est une approche fascinante.`,
    `⛧ ${user}, ta curiosité me plaît. Voici ce que je peux te dire...`,
    `⛧ ${user}, une question profonde. Laisse-moi te guider dans cette réflexion.`,
    `⛧ ${user}, tu commences à comprendre l'art de l'invocation. Continue...`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testPureMemoryEngine().catch(console.error);
}