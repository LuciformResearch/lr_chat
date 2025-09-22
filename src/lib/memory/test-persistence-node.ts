/**
 * Test de persistance avec mock localStorage pour Node.js
 * Vérifie que les résumés sont bien sauvegardés et récupérables
 */

// Mock localStorage pour Node.js
const localStorageMock = {
  data: new Map<string, string>(),
  getItem: function(key: string): string | null {
    return this.data.get(key) || null;
  },
  setItem: function(key: string, value: string): void {
    this.data.set(key, value);
  },
  removeItem: function(key: string): void {
    this.data.delete(key);
  },
  clear: function(): void {
    this.data.clear();
  }
};

// Remplacer localStorage global
(global as any).localStorage = localStorageMock;

import { LocalStorage } from '@/lib/storage/LocalStorage';
import { SummaryManager } from '@/lib/summarization/SummaryManager';
import { ConversationMessage } from '@/lib/summarization/SummarizationAgent';

export async function testMemoryPersistenceNode(): Promise<void> {
  console.log('🧪 Test de persistance de la mémoire hiérarchique (Node.js)');
  console.log('=' .repeat(60));
  
  const testUser = 'Lucie_Test';
  const summaryManager = new SummaryManager();
  
  try {
    // 1. Nettoyer les données de test précédentes
    console.log('🧹 Nettoyage des données de test précédentes...');
    summaryManager.deleteUserSummaries(testUser);
    
    // 2. Créer des conversations de test
    console.log('📝 Création de conversations de test...');
    const testConversations = [
      {
        user: testUser,
        message: 'Salut Algareth, comment ça va ?',
        response: '⛧ Salut Lucie, je vais bien. Que puis-je faire pour toi ?',
        persona: 'Algareth',
        provider: 'test',
        metadata: { sessionId: 'test_session_1' }
      },
      {
        user: testUser,
        message: 'Peux-tu m\'expliquer ton système de mémoire ?',
        response: '⛧ Bien sûr Lucie, ma mémoire fonctionne par couches hiérarchiques...',
        persona: 'Algareth',
        provider: 'test',
        metadata: { sessionId: 'test_session_1' }
      },
      {
        user: testUser,
        message: 'C\'est fascinant ! Comment décides-tu de créer un résumé ?',
        response: '⛧ Je crée un résumé L1 tous les 5 messages, Lucie...',
        persona: 'Algareth',
        provider: 'test',
        metadata: { sessionId: 'test_session_1' }
      },
      {
        user: testUser,
        message: 'Et que se passe-t-il avec le budget mémoire ?',
        response: '⛧ Quand je dépasse mon budget, je commence à compresser les anciens messages...',
        persona: 'Algareth',
        provider: 'test',
        metadata: { sessionId: 'test_session_1' }
      },
      {
        user: testUser,
        message: 'Merci pour ces explications, Algareth !',
        response: '⛧ De rien Lucie, c\'était un plaisir de t\'expliquer mon fonctionnement.',
        persona: 'Algareth',
        provider: 'test',
        metadata: { sessionId: 'test_session_1' }
      }
    ];
    
    // Sauvegarder les conversations
    for (const conv of testConversations) {
      LocalStorage.saveConversation({
        ...conv,
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`✅ ${testConversations.length} conversations sauvegardées`);
    
    // 3. Créer des résumés de test
    console.log('📊 Création de résumés de test...');
    
    const testMessages: ConversationMessage[] = testConversations.map(conv => [
      { role: 'user', content: conv.message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: conv.response, timestamp: new Date().toISOString() }
    ]).flat();
    
    // Créer un résumé L1
    const summary1 = await summaryManager.saveSummary(
      testUser,
      testMessages.slice(0, 6), // 3 paires de messages
      testConversations.slice(0, 3),
      'fr'
    );
    
    console.log(`✅ Résumé L1 créé: ${summary1.id}`);
    console.log(`   📝 Contenu: ${summary1.summary.substring(0, 100)}...`);
    console.log(`   📊 Compression: ${(summary1.metadata.compressionRatio * 100).toFixed(1)}%`);
    
    // 4. Vérifier la persistance
    console.log('💾 Vérification de la persistance...');
    
    // Récupérer les conversations
    const savedConversations = LocalStorage.getConversationsByUser(testUser);
    console.log(`📋 Conversations récupérées: ${savedConversations.length}`);
    
    // Récupérer les résumés
    const savedSummaries = summaryManager.getUserSummaries(testUser);
    console.log(`📝 Résumés récupérés: ${savedSummaries.length}`);
    
    // Vérifier le contenu
    const hasCorrectContent = savedSummaries.some(s => 
      s.summary.includes('Lucie') && s.summary.includes('Algareth')
    );
    
    console.log(`✅ Contenu vérifié: ${hasCorrectContent ? 'Oui' : 'Non'}`);
    
    // 5. Test de génération de meta-résumé
    console.log('🧠 Test de génération de meta-résumé...');
    
    const metaSummary = await summaryManager.generateMetaSummary(testUser, 'fr');
    console.log(`✅ Meta-résumé généré: ${metaSummary.substring(0, 100)}...`);
    
    // 6. Vérifier les statistiques
    console.log('📊 Statistiques finales:');
    const stats = summaryManager.getSummaryStats();
    const userStats = stats.users[testUser];
    
    if (userStats) {
      console.log(`   👤 Utilisateur: ${testUser}`);
      console.log(`   📝 Nombre de résumés: ${userStats.count}`);
      console.log(`   💬 Messages totaux: ${userStats.totalMessages}`);
      console.log(`   📈 Compression moyenne: ${(userStats.averageCompressionRatio * 100).toFixed(1)}%`);
    }
    
    // 7. Test de chargement de mémoire
    console.log('🔄 Test de chargement de mémoire...');
    const memoryData = await summaryManager.loadUserMemory(testUser, 'fr');
    
    console.log(`✅ Mémoire chargée:`);
    console.log(`   📝 Résumé récent: ${memoryData.recentSummary ? 'Oui' : 'Non'}`);
    console.log(`   🧠 Meta-résumé: ${memoryData.metaSummary ? 'Oui' : 'Non'}`);
    console.log(`   💬 Conversations: ${memoryData.conversationCount}`);
    console.log(`   📅 Dernière conversation: ${memoryData.lastConversation ? 'Oui' : 'Non'}`);
    
    // 8. Test de vérification du localStorage mock
    console.log('🔍 Vérification du localStorage mock...');
    const localStorageData = localStorageMock.getItem('lr_tchatagent_user_summaries');
    const hasLocalStorageData = localStorageData !== null;
    console.log(`✅ Données dans localStorage: ${hasLocalStorageData ? 'Oui' : 'Non'}`);
    
    if (hasLocalStorageData) {
      const parsedData = JSON.parse(localStorageData!);
      console.log(`   📊 Nombre d'entrées: ${parsedData.length}`);
    }
    
    // 9. Résumé du test
    console.log('\n🎯 Résumé du test:');
    console.log('=' .repeat(30));
    
    const allTestsPassed = 
      savedConversations.length === testConversations.length &&
      savedSummaries.length >= 1 &&
      hasCorrectContent &&
      memoryData.recentSummary !== null &&
      hasLocalStorageData;
    
    console.log(`✅ Conversations sauvegardées: ${savedConversations.length}/${testConversations.length}`);
    console.log(`✅ Résumés créés: ${savedSummaries.length} (attendu: ≥1)`);
    console.log(`✅ Contenu correct: ${hasCorrectContent ? 'Oui' : 'Non'}`);
    console.log(`✅ Mémoire chargée: ${memoryData.recentSummary ? 'Oui' : 'Non'}`);
    console.log(`✅ Persistance localStorage: ${hasLocalStorageData ? 'Oui' : 'Non'}`);
    
    if (allTestsPassed) {
      console.log('\n🎉 **TOUS LES TESTS SONT PASSÉS !**');
      console.log('La persistance de la mémoire hiérarchique fonctionne correctement.');
      console.log('Algareth peut maintenant gérer sa mémoire avec efficacité ! 🧠');
    } else {
      console.log('\n⚠️ **QUELQUES TESTS ONT ÉCHOUÉ**');
      console.log('Vérifiez les logs ci-dessus pour plus de détails.');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    // Nettoyage
    console.log('\n🧹 Nettoyage des données de test...');
    summaryManager.deleteUserSummaries(testUser);
    localStorageMock.clear();
    console.log('✅ Nettoyage terminé');
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testMemoryPersistenceNode().catch(console.error);
}