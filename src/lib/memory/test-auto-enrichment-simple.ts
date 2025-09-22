import { AutoEnrichmentEngine } from './AutoEnrichmentEngine';
import { ArchiveManager } from './ArchiveManager';
import { SimpleSearchEngine } from './SimpleSearchEngine';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv();

class SimpleAutoEnrichmentTest {
  private archiveManager: ArchiveManager;
  private searchEngine: SimpleSearchEngine;
  private enrichmentEngine: AutoEnrichmentEngine;

  constructor() {
    this.archiveManager = new ArchiveManager();
    this.searchEngine = new SimpleSearchEngine(this.archiveManager);
    this.enrichmentEngine = new AutoEnrichmentEngine(this.searchEngine);
    
    this.setupTestData();
  }

  private setupTestData() {
    // Simuler des messages archivés pour les tests
    const testMessages = [
      { id: 'msg1', text: 'Discussion sur la compression hiérarchique L1, L2, L3', level: 0 },
      { id: 'msg2', text: 'Mem0 est une solution intéressante pour la mémoire', level: 0 },
      { id: 'msg3', text: 'Optimisation de la recherche dans les archives', level: 0 },
      { id: 'sum1', text: 'Résumé: Compression et optimisation des performances', level: 1 }
    ];

    // Archiver les messages de test
    for (const msg of testMessages) {
      this.archiveManager.archiveItem({
        id: msg.id,
        text: msg.text,
        level: msg.level,
        topics: ['compression', 'optimisation', 'mémoire'],
        covers: [msg.id],
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Données de test créées avec 4 éléments archivés');
  }

  async runTests(): Promise<void> {
    console.log('🧠 Test d\'auto-enrichissement simplifié - Démarrage...\n');

    // Test 1: Détection de triggers
    await this.testTriggerDetection();
    
    // Test 2: Recherche et enrichissement
    await this.testSearchAndEnrichment();
    
    // Test 3: Performance
    await this.testPerformance();
    
    // Test 4: Métriques
    await this.testMetrics();
  }

  private async testTriggerDetection(): Promise<void> {
    console.log('🔍 Test 1: Détection de triggers...');
    
    const testMessages = [
      'Tu te rappelles de ce qu\'on a dit sur la compression ?',
      'Peux-tu me rappeler notre discussion sur Mem0 ?',
      'Qu\'est-ce qu\'on avait conclu sur L2 et L3 ?',
      'Tu te souviens de l\'optimisation de recherche ?',
      'Salut, comment ça va ?' // Pas de trigger
    ];

    for (const message of testMessages) {
      const triggers = this.enrichmentEngine['detectTriggers'](message);
      console.log(`   "${message}" → ${triggers.length} trigger(s): ${triggers.map(t => t.pattern).join(', ')}`);
    }
    
    console.log('✅ Détection de triggers testée\n');
  }

  private async testSearchAndEnrichment(): Promise<void> {
    console.log('🔍 Test 2: Recherche et enrichissement...');
    
    const testQueries = [
      'compression',
      'Mem0',
      'optimisation',
      'recherche'
    ];

    for (const query of testQueries) {
      const startTime = Date.now();
      const results = await this.searchEngine.search(query);
      const duration = Date.now() - startTime;
      
      console.log(`   Recherche "${query}": ${results.length} résultats (${duration}ms)`);
      if (results.length > 0) {
        console.log(`     Premier résultat: "${results[0].content.substring(0, 50)}..."`);
      }
    }
    
    console.log('✅ Recherche et enrichissement testés\n');
  }

  private async testPerformance(): Promise<void> {
    console.log('⏱️  Test 3: Performance...');
    
    const iterations = 100;
    const query = 'compression';
    
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await this.searchEngine.search(query);
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`   ${iterations} recherches en ${totalTime}ms`);
    console.log(`   Moyenne: ${avgTime.toFixed(2)}ms par recherche`);
    console.log(`   Performance: ${(1000 / avgTime).toFixed(0)} recherches/seconde`);
    
    console.log('✅ Performance testée\n');
  }

  private async testMetrics(): Promise<void> {
    console.log('📊 Test 4: Métriques...');
    
    const stats = this.enrichmentEngine.getMetrics();
    const searchStats = this.searchEngine.getSearchStats();
    
    console.log('   Métriques d\'enrichissement:');
    console.log(`     Analyses: ${stats.totalAnalyses}`);
    console.log(`     Enrichissements: ${stats.totalEnrichments}`);
    console.log(`     Taux de succès: ${stats.successRate.toFixed(1)}%`);
    console.log(`     Cache hits: ${stats.cacheHits}`);
    
    console.log('   Statistiques de recherche:');
    console.log(`     Recherches totales: ${searchStats.totalSearches}`);
    console.log(`     Temps moyen: ${searchStats.averageSearchTime.toFixed(2)}ms`);
    console.log(`     Fallbacks Mem0: ${searchStats.mem0Fallbacks}`);
    
    console.log('✅ Métriques affichées\n');
  }
}

// Exécution du test
async function main() {
  try {
    const test = new SimpleAutoEnrichmentTest();
    await test.runTests();
    console.log('🎉 Test d\'auto-enrichissement simplifié terminé !');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

if (require.main === module) {
  main();
}

export { SimpleAutoEnrichmentTest };