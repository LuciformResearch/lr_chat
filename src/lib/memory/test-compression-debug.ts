/**
 * Test de debug pour comprendre pourquoi la compression ne se déclenche pas
 */

import { AdvancedMemoryEngineWithProactiveSearch } from './AdvancedMemoryEngineWithProactiveSearch';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

async function testCompressionDebug() {
  console.log('🔍 Debug de la compression - Analyse détaillée');
  console.log('==============================================');

  // Charger les variables d'environnement
  loadShadeosEnv();
  
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY non trouvée');
    return;
  }

  // Créer un moteur avec des seuils très bas
  const engine = new AdvancedMemoryEngineWithProactiveSearch(
    geminiApiKey,
    500,  // budget très petit
    2,    // l1Threshold très petit
    0.3   // hierarchicalThreshold très petit
  );

  console.log('\n⚙️  Configuration:');
  console.log(`   - Budget: 500 caractères`);
  console.log(`   - Seuil L1: 2 messages`);
  console.log(`   - Seuil hiérarchique: 30%`);

  // Simuler l'ajout de messages un par un
  const messages = [
    'Message 1: Salut Algareth',
    'Message 2: Comment vas-tu ?',
    'Message 3: Parle-moi de ta mémoire',
    'Message 4: Comment fonctionne la compression ?',
    'Message 5: C\'est fascinant !',
    'Message 6: Et les seuils automatiques ?',
    'Message 7: Comment tu décides de compresser ?',
    'Message 8: C\'est très intelligent !'
  ];

  for (let i = 0; i < messages.length; i++) {
    console.log(`\n🔄 Ajout du message ${i + 1}: "${messages[i]}"`);
    
    const action = await engine.addMessage(messages[i], 'user', 'lucie');
    
    console.log(`   Action: ${action.action}`);
    if (action.message) {
      console.log(`   Détail: ${action.message}`);
    }
    
    // Debug des conditions de compression
    const stats = engine.getStats();
    console.log(`   Messages bruts: ${stats.rawCount}`);
    console.log(`   Résumés L1: ${stats.l1Count}`);
    console.log(`   Budget utilisé: ${stats.budget.percentage.toFixed(1)}%`);
    
    // Vérifier les conditions manuellement
    const rawMessages = engine['memory'].items.filter(item => item.type === 'raw');
    const shouldCreateL1 = rawMessages.length >= (engine['memory'].l1Threshold + 2);
    const budgetThreshold = engine['memory'].budget.percentage > engine['memory'].hierarchicalThreshold;
    
    console.log(`   Condition L1: ${rawMessages.length} >= ${engine['memory'].l1Threshold + 2} = ${shouldCreateL1}`);
    console.log(`   Condition budget: ${engine['memory'].budget.percentage.toFixed(1)}% > ${engine['memory'].hierarchicalThreshold * 100}% = ${budgetThreshold}`);
    
    if (shouldCreateL1) {
      const messagesToSummarize = rawMessages.slice(-engine['memory'].l1Threshold, -2);
      console.log(`   Messages à résumer: ${messagesToSummarize.length} (slice(-${engine['memory'].l1Threshold}, -2))`);
      console.log(`   Condition finale: ${messagesToSummarize.length} >= ${engine['memory'].l1Threshold} = ${messagesToSummarize.length >= engine['memory'].l1Threshold}`);
    }
    
    // Pause pour voir les détails
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 RÉSUMÉ FINAL:');
  console.log('================');
  const finalStats = engine.getStats();
  console.log(`Messages bruts: ${finalStats.rawCount}`);
  console.log(`Résumés L1: ${finalStats.l1Count}`);
  console.log(`Budget utilisé: ${finalStats.budget.percentage.toFixed(1)}%`);
  console.log(`Compressions: ${finalStats.compressionCount}`);
}

// Exécuter le test
testCompressionDebug().catch(console.error);