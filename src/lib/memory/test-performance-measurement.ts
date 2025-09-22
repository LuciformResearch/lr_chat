#!/usr/bin/env npx tsx

/**
 * Test avec mesure de performance précise
 * Mesure chaque opération et génère un artefact de performance
 */

import { loadShadeosEnv } from '../utils/SecureEnvManager';
import { AdvancedMemoryEngineWithProactiveSearch } from './AdvancedMemoryEngineWithProactiveSearch';
import { MultiEntityMemorySystem } from './MultiEntityMemorySystem';
import { PerformanceProfiler, OperationTracker, PerformanceArtifactGenerator } from './PerformanceProfiler';
import * as fs from 'fs';

async function testWithPerformanceMeasurement(): Promise<void> {
  console.log('📊 Test avec Mesure de Performance');
  console.log('==================================');
  
  const startTime = Date.now();
  
  // Charger les variables d'environnement
  loadShadeosEnv();
  
  // Initialiser le profiler
  const profiler = new PerformanceProfiler();
  const tracker = new OperationTracker(profiler);
  const artifactGenerator = new PerformanceArtifactGenerator();
  
  console.log('⚙️  Profiler de performance initialisé');

  // Obtenir la clé Gemini
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY non trouvée');
    return;
  }

  // Mesurer l'initialisation
  profiler.startOperation('INITIALIZATION');
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
  profiler.endOperation();

  console.log('✅ Système initialisé');

  // Messages de test
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
    "Comment tu vois notre relation évoluer ?"
  ];

  console.log('\n💬 Génération des conversations avec mesure...');
  console.log('===============================================');

  // Mesurer la génération des conversations
  profiler.startOperation('CONVERSATION_GENERATION');
  
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    console.log(`🔄 Message ${i + 1}/${testMessages.length}: "${message.substring(0, 50)}..."`);
    
    try {
      // Mesurer chaque appel makeEntitySpeak
      await tracker.trackLLMCall('MAKE_ENTITY_SPEAK', async () => {
        return await system.makeEntitySpeak('algareth', 'lucie', message);
      });
      
    } catch (error) {
      console.error(`❌ Erreur message ${i + 1}:`, error);
    }
  }
  
  profiler.endOperation();

  console.log('\n🔍 Tests de recherche avec mesure...');
  console.log('====================================');

  // Mesurer les opérations de recherche
  profiler.startOperation('SEARCH_OPERATIONS');
  
  const searchQueries = [
    'conscience',
    'mémoire',
    'compression',
    'émotions',
    'évolution'
  ];

  // Accéder au moteur de recherche
  const systemAny = system as any;
  const algarethEntity = systemAny.entities?.get('algareth');
  const engine = algarethEntity?.memoryEngine;

  if (engine && engine.search) {
    for (const query of searchQueries) {
      console.log(`🔍 Recherche: "${query}"`);
      
      try {
        await tracker.trackSearch('SIMPLE_SEARCH', async () => {
          const results = await engine.search(query);
          return {
            query,
            results,
            resultsCount: results.length
          };
        });
        
      } catch (error) {
        console.error(`❌ Erreur recherche "${query}":`, error);
      }
    }
  }
  
  profiler.endOperation();

  console.log('\n📊 Génération du rapport de performance...');
  console.log('==========================================');

  // Générer le rapport de performance
  profiler.startOperation('REPORT_GENERATION');
  const performanceReport = artifactGenerator.generatePerformanceReport(profiler);
  profiler.endOperation();

  // Sauvegarder l'artefact
  const reportPath = `performance-report-${Date.now()}.md`;
  fs.writeFileSync(reportPath, performanceReport);
  
  console.log(`📄 Rapport sauvegardé: ${reportPath}`);

  // Afficher le résumé
  const report = profiler.getReport();
  const totalTime = Date.now() - startTime;
  
  console.log('\n📊 RÉSUMÉ DE PERFORMANCE');
  console.log('========================');
  console.log(`⏱️  Temps total: ${totalTime}ms`);
  console.log(`⏱️  Durée mesurée: ${report.totalDuration.toFixed(2)}ms`);
  console.log(`🔄 Opérations: ${report.summary.totalOperations}`);
  console.log(`🤖 Appels LLM: ${report.summary.totalLLMCalls}`);
  console.log(`📈 Durée moyenne: ${report.summary.averageDuration.toFixed(2)}ms`);
  console.log(`💾 Pic mémoire: ${(report.summary.memoryPeak / 1024 / 1024).toFixed(2)}MB`);

  console.log('\n⚠️  TOP 3 Goulots d\'Étranglement');
  console.log('==================================');
  report.bottlenecks.slice(0, 3).forEach((bottleneck, index) => {
    console.log(`${index + 1}. ${bottleneck.operation}: ${bottleneck.duration.toFixed(2)}ms (${bottleneck.percentage.toFixed(1)}%)`);
    console.log(`   ${bottleneck.recommendation}`);
  });

  console.log('\n💡 RECOMMANDATIONS PRIORITAIRES');
  console.log('================================');
  report.recommendations.slice(0, 5).forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });

  // Export JSON pour analyse
  const jsonReport = profiler.exportMetrics();
  const jsonPath = `performance-metrics-${Date.now()}.json`;
  fs.writeFileSync(jsonPath, jsonReport);
  console.log(`📊 Métriques JSON: ${jsonPath}`);

  console.log('\n🎉 TEST DE PERFORMANCE TERMINÉ !');
  console.log('=================================');
  console.log('✅ Mesure précise de toutes les opérations');
  console.log('✅ Identification des goulots d\'étranglement');
  console.log('✅ Recommandations d\'optimisation');
  console.log('✅ Artefacts de performance générés');
}

// Exécution du test
if (require.main === module) {
  testWithPerformanceMeasurement().catch(console.error);
}