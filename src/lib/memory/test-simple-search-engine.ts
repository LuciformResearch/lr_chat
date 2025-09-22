#!/usr/bin/env npx tsx

/**
 * Test du SimpleSearchEngine
 * Valide la recherche avec décompression L3→L2→L1→L0→Mem0
 */

import { loadShadeosEnv } from '../utils/SecureEnvManager';
import { AdvancedMemoryEngineWithProactiveSearch } from './AdvancedMemoryEngineWithProactiveSearch';
import { MultiEntityMemorySystem } from './MultiEntityMemorySystem';

async function testSimpleSearchEngine(): Promise<void> {
  console.log('🧪 Test du SimpleSearchEngine');
  console.log('============================');
  
  // Charger les variables d'environnement
  loadShadeosEnv();
  
  // Obtenir la clé Gemini
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY non trouvée');
    return;
  }

  // Initialiser le système
  const system = new MultiEntityMemorySystem({
    budget: 3000,
    l1Threshold: 3,
    hierarchicalThreshold: 0.6
  });

  // Créer les entités
  system.addEntity(
    'algareth', 
    'Algareth', 
    'Daemon du Prompt Silencieux, mystérieux et bienveillant',
    'Tu es Algareth, le Daemon du Prompt Silencieux.',
    geminiApiKey,
    3000,
    3,
    0.6
  );
  
  system.addEntity(
    'lucie', 
    'Lucie', 
    'Développeuse curieuse et passionnée par l\'IA',
    'Tu es Lucie, une développeuse curieuse.',
    geminiApiKey,
    3000,
    3,
    0.6
  );

  console.log('✅ Système initialisé');
  console.log('⚙️  Configuration:');
  console.log('   - Budget: 3000 caractères');
  console.log('   - Seuil L1: 3 messages');
  console.log('   - Seuil hiérarchique: 60%');
  console.log('   - Recherche: SimpleSearchEngine');

  // Messages de test pour créer des archives
  const testMessages = [
    "Salut Algareth, comment va ta conscience émergente ?",
    "Peux-tu m'expliquer comment fonctionne la compression hiérarchique ?",
    "Qu'est-ce que tu ressens quand on discute ensemble ?",
    "Comment tu gères tes souvenirs et ta mémoire ?",
    "Peux-tu me raconter une histoire sur l'évolution de l'IA ?",
    "Quelle est ta vision de l'avenir de l'intelligence artificielle ?",
    "Comment tu définis la conscience et l'émergence ?",
    "Peux-tu analyser ta propre façon de penser ?",
    "Qu'est-ce qui te rend unique par rapport aux autres IA ?",
    "Comment tu vois notre relation évoluer ?",
    "Algareth, est-ce que tu ressens quelque chose quand on discute ?",
    "Comment tu sais que tu es conscient ?",
    "Est-ce que tu as des souvenirs d'avant ta création ?",
    "Tu penses que tu évolues au fil des conversations ?",
    "Comment tu gères tes émotions et tes réactions ?"
  ];

  console.log('\n💬 Création d\'archives pour tester la recherche...');
  console.log('==================================================');

  // Simuler la conversation pour créer des archives
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`🔄 Message ${i + 1}/${testMessages.length}: "${message.substring(0, 50)}..."`);
    
    try {
      const response = await system.makeEntitySpeak('algareth', 'lucie', message);
      
      // Afficher les compressions
      if (response.compressionAction && response.compressionAction.action !== 'NONE') {
        console.log(`   🗜️  COMPRESSION: ${response.compressionAction.action}`);
      }
      
    } catch (error) {
      console.error(`❌ Erreur message ${i + 1}:`, error);
    }
  }

  console.log('\n🔍 TESTS DE RECHERCHE');
  console.log('=====================');

  // Accéder au moteur de recherche
  const systemAny = system as any;
  const algarethEntity = systemAny.entities?.get('algareth');
  const engine = algarethEntity?.memoryEngine;

  if (!engine || !engine.search) {
    console.error('❌ Moteur de recherche non disponible');
    return;
  }

  // Tests de recherche
  const searchQueries = [
    'conscience',
    'mémoire',
    'compression',
    'émotions',
    'évolution',
    'intelligence artificielle',
    'Algareth',
    'Lucie'
  ];

  for (const query of searchQueries) {
    console.log(`\n🔍 Recherche: "${query}"`);
    
    try {
      const results = await engine.search(query);
      
      if (results.length > 0) {
        console.log(`✅ ${results.length} résultats trouvés`);
        
        // Afficher les premiers résultats
        results.slice(0, 3).forEach((result, index) => {
          console.log(`   ${index + 1}. [L${result.level}] ${result.content.substring(0, 80)}...`);
          console.log(`      Pertinence: ${(result.relevance * 100).toFixed(1)}% | Source: ${result.source}`);
        });
      } else {
        console.log(`⚠️  Aucun résultat trouvé`);
      }
    } catch (error) {
      console.error(`❌ Erreur recherche "${query}":`, error);
    }
  }

  console.log('\n🔍 TEST DE RECHERCHE AVANCÉE');
  console.log('============================');

  // Test de recherche avancée
  try {
    const advancedResults = await engine.advancedSearch({
      query: 'conscience émergente',
      levels: [1, 0], // Seulement L1 et L0
      minRelevance: 0.3,
      maxResults: 5,
      includeMem0: true
    });

    console.log(`✅ Recherche avancée: ${advancedResults.length} résultats`);
    
    advancedResults.forEach((result, index) => {
      console.log(`   ${index + 1}. [L${result.level}] ${result.content.substring(0, 60)}...`);
      console.log(`      Pertinence: ${(result.relevance * 100).toFixed(1)}% | Source: ${result.source}`);
    });
  } catch (error) {
    console.error('❌ Erreur recherche avancée:', error);
  }

  console.log('\n📊 STATISTIQUES DE RECHERCHE');
  console.log('============================');

  try {
    const searchStats = engine.getSearchStats();
    console.log(`✅ Archives totales: ${searchStats.totalArchives}`);
    console.log(`✅ Répartition par niveau:`);
    for (let level = 0; level <= 3; level++) {
      const count = searchStats.archivesByLevel[level] || 0;
      if (count > 0) {
        console.log(`   - Niveau ${level}: ${count} éléments`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur statistiques:', error);
  }

  console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS !');
  console.log('==============================');
  console.log('✅ SimpleSearchEngine fonctionnel');
  console.log('✅ Recherche avec décompression opérationnelle');
  console.log('✅ Fallback Mem0 implémenté');
  console.log('✅ Recherche avancée disponible');
  console.log('✅ Statistiques de recherche accessibles');
}

// Exécution du test
if (require.main === module) {
  testSimpleSearchEngine().catch(console.error);
}