/**
 * Script de test pour le système de mémoire hiérarchique
 * Teste la Phase 1 : résumés L1 automatiques
 */

import { HierarchicalMemoryManager } from './HierarchicalMemoryManager';

export async function testHierarchicalMemoryPhase1(): Promise<void> {
  console.log('🧪 Test Phase 1 - Système de mémoire hiérarchique');
  console.log('=' .repeat(60));
  
  // Créer un gestionnaire avec un budget réduit pour les tests
  const memoryManager = new HierarchicalMemoryManager(2000); // 2k chars pour forcer la compression
  
  console.log('📊 Budget initial:', memoryManager.getCurrentBudget());
  
  // Simuler une conversation avec 10 messages (devrait créer 2 résumés L1)
  const testMessages = [
    { role: 'user' as const, content: 'Salut Algareth, comment ça va ?' },
    { role: 'assistant' as const, content: '⛧ Salut voyageur, je vais bien. Que puis-je faire pour toi ?' },
    { role: 'user' as const, content: 'Peux-tu m\'expliquer comment fonctionne ta mémoire ?' },
    { role: 'assistant' as const, content: '⛧ Ma mémoire fonctionne par couches hiérarchiques...' },
    { role: 'user' as const, content: 'C\'est fascinant ! Peux-tu me donner un exemple concret ?' },
    { role: 'assistant' as const, content: '⛧ Bien sûr ! Imagine que nous ayons 5 messages...' },
    { role: 'user' as const, content: 'Et que se passe-t-il quand tu atteins la limite de caractères ?' },
    { role: 'assistant' as const, content: '⛧ Quand je dépasse mon budget, je commence à compresser...' },
    { role: 'user' as const, content: 'C\'est très intelligent ! Et les résumés L2, L3 ?' },
    { role: 'assistant' as const, content: '⛧ Les résumés L2 et L3 sont créés quand j\'ai plus de 50% de résumés...' }
  ];
  
  console.log('\n📝 Ajout de 10 messages de test...');
  
  for (let i = 0; i < testMessages.length; i++) {
    const msg = testMessages[i];
    memoryManager.addMessage(msg.content, msg.role, 'test_user');
    
    const stats = memoryManager.getMemoryStats();
    console.log(`   Message ${i + 1}: ${msg.role} - ${msg.content.substring(0, 30)}...`);
    console.log(`   📊 Stats: ${stats.totalItems} items, ${stats.totalCharacters} chars, ${stats.l1Count} L1`);
    
    // Attendre un peu pour simuler le temps de traitement
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 Statistiques finales:');
  const finalStats = memoryManager.getMemoryStats();
  console.log(`   Total items: ${finalStats.totalItems}`);
  console.log(`   Messages bruts: ${finalStats.rawMessages}`);
  console.log(`   Résumés: ${finalStats.summaries}`);
  console.log(`   Résumés L1: ${finalStats.l1Count}`);
  console.log(`   Caractères totaux: ${finalStats.totalCharacters}`);
  console.log(`   Budget: ${finalStats.budget.currentCharacters}/${finalStats.budget.maxCharacters} (${Math.round((finalStats.budget.currentCharacters / finalStats.budget.maxCharacters) * 100)}%)`);
  console.log(`   Ratio résumés: ${Math.round(finalStats.budget.summaryRatio * 100)}%`);
  
  console.log('\n🧠 Test de construction de contexte:');
  const context = memoryManager.buildContextForPrompt('Comment fonctionne ta mémoire ?', 1000);
  console.log(`   Contexte généré (${context.length} chars):`);
  console.log(`   ${context.substring(0, 200)}...`);
  
  console.log('\n📋 Export de la mémoire:');
  const memoryExport = memoryManager.exportMemory();
  console.log(`   ${memoryExport.length} items en mémoire:`);
  memoryExport.forEach((item, index) => {
    const type = item.type === 'raw' ? 'RAW' : `L${item.level}`;
    console.log(`   ${index + 1}. [${type}] ${item.content.substring(0, 50)}... (${item.characterCount} chars)`);
  });
  
  console.log('\n✅ Test Phase 1 terminé !');
  console.log('=' .repeat(60));
}

// Fonction pour tester la compression de budget
export async function testBudgetCompression(): Promise<void> {
  console.log('🧪 Test Compression de Budget');
  console.log('=' .repeat(40));
  
  // Créer un gestionnaire avec un budget très petit
  const memoryManager = new HierarchicalMemoryManager(500); // 500 chars seulement
  
  console.log('📊 Budget très réduit:', memoryManager.getCurrentBudget());
  
  // Ajouter beaucoup de messages pour dépasser le budget
  const longMessages = [
    'Ceci est un message très long pour tester la compression de budget et voir comment le système gère le dépassement de la limite de caractères.',
    'Un autre message très long pour continuer à tester la compression et voir si les résumés L1 sont créés automatiquement.',
    'Encore un message long pour s\'assurer que le système de compression fonctionne correctement et que les anciens messages sont remplacés par des résumés.',
    'Message supplémentaire pour tester la robustesse du système de compression de mémoire hiérarchique.',
    'Dernier message long pour compléter le test de compression de budget et vérifier que tout fonctionne bien.'
  ];
  
  for (let i = 0; i < longMessages.length; i++) {
    memoryManager.addMessage(longMessages[i], 'user', 'test_user');
    memoryManager.addMessage(`Réponse ${i + 1} d'Algareth`, 'assistant', 'test_user');
    
    const stats = memoryManager.getMemoryStats();
    console.log(`   Après ${(i + 1) * 2} messages: ${stats.totalCharacters} chars, ${stats.l1Count} L1`);
  }
  
  const finalStats = memoryManager.getMemoryStats();
  console.log(`\n📊 Résultat final: ${finalStats.totalCharacters} chars (limite: ${finalStats.budget.maxCharacters})`);
  console.log(`   Compression réussie: ${finalStats.totalCharacters <= finalStats.budget.maxCharacters ? '✅' : '❌'}`);
  
  console.log('\n✅ Test de compression terminé !');
}

// Exécuter les tests si ce fichier est appelé directement
if (require.main === module) {
  testHierarchicalMemoryPhase1()
    .then(() => testBudgetCompression())
    .catch(console.error);
}