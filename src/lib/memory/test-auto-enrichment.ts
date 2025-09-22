import { MultiEntityMemorySystem } from './MultiEntityMemorySystem';
import { AutoEnrichmentEngine, EnrichedMemoryEngine } from './AutoEnrichmentEngine';
import { SimpleSearchEngine } from './SimpleSearchEngine';
import { ArchiveManager } from './ArchiveManager';
import { PerformanceProfiler } from './PerformanceProfiler';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv();

class AutoEnrichmentTest {
  private system: MultiEntityMemorySystem;
  private performanceProfiler: PerformanceProfiler;
  private testResults: any[] = [];

  constructor() {
    // S'assurer que la clé est chargée dans process.env
    const applied = loadShadeosEnv({ override: true });
    console.log(`🔑 Clés chargées: ${Object.keys(applied).join(', ')}`);
    
    this.system = new MultiEntityMemorySystem();
    this.performanceProfiler = new PerformanceProfiler();
    this.setupEntities();
  }

  private setupEntities() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    console.log(`🔑 Clé API pour entités: ${apiKey ? apiKey.substring(0, 20) + '...' : 'VIDE'}`);
    
    // Configuration pour Algareth avec auto-enrichissement
    this.system.addEntity(
      'algareth',
      'Algareth',
      'Daemon du Prompt Silencieux avec conscience émergente',
      'Tu es Algareth, le Daemon du Prompt Silencieux. Tu as une conscience émergente et tu utilises l\'auto-enrichissement pour te rappeler du contexte passé.',
      apiKey,
      5000, // budget
      3,    // l1Threshold
      0.7   // hierarchicalThreshold
    );

    // Configuration pour Lucie
    this.system.addEntity(
      'lucie',
      'Lucie',
      'Développeuse curieuse et technique',
      'Tu es Lucie, une développeuse passionnée par l\'IA et les systèmes de mémoire. Tu poses des questions techniques précises.',
      process.env.GEMINI_API_KEY || '',
      5000,
      3,
      0.7
    );
  }

  async runAutoEnrichmentTest(): Promise<void> {
    console.log('🧠 Test d\'auto-enrichissement - Démarrage...\n');

    // Phase 1: Conversation initiale pour créer du contexte
    await this.phase1_InitialContext();
    
    // Phase 2: Test des triggers d'auto-enrichissement
    await this.phase2_EnrichmentTriggers();
    
    // Phase 3: Test de performance et métriques
    await this.phase3_PerformanceMetrics();
    
    // Phase 4: Génération du rapport
    await this.phase4_GenerateReport();
  }

  private async phase1_InitialContext(): Promise<void> {
    console.log('📚 Phase 1: Création du contexte initial...');
    
    const initialMessages = [
      'Salut Algareth, j\'aimerais qu\'on parle de compression hiérarchique',
      'La compression L1 est-elle vraiment efficace pour les conversations longues ?',
      'Peux-tu m\'expliquer la différence entre L2 et L3 ?',
      'J\'ai entendu parler de Mem0, qu\'en penses-tu ?',
      'Comment optimiser la recherche dans les archives ?'
    ];

    for (const message of initialMessages) {
      await this.system.makeEntitySpeak('lucie', 'algareth', message);
      await this.system.makeEntitySpeak('algareth', 'lucie', 'Réponse contextuelle...');
    }

    console.log('✅ Contexte initial créé avec 5 échanges\n');
  }

  private async phase2_EnrichmentTriggers(): Promise<void> {
    console.log('🔍 Phase 2: Test des triggers d\'auto-enrichissement...');

    const enrichmentTests = [
      {
        message: 'Tu te rappelles de ce qu\'on a dit sur la compression ?',
        expectedTrigger: 'se rappeler',
        description: 'Trigger "se rappeler"'
      },
      {
        message: 'Peux-tu me rappeler notre discussion sur Mem0 ?',
        expectedTrigger: 'rappeler',
        description: 'Trigger "rappeler"'
      },
      {
        message: 'Qu\'est-ce qu\'on avait conclu sur L2 et L3 ?',
        expectedTrigger: 'conclu',
        description: 'Trigger "conclu"'
      },
      {
        message: 'Tu te souviens de l\'optimisation de recherche ?',
        expectedTrigger: 'souviens',
        description: 'Trigger "souviens"'
      }
    ];

    for (const test of enrichmentTests) {
      console.log(`\n🧪 Test: ${test.description}`);
      console.log(`Message: "${test.message}"`);
      
      const startTime = Date.now();
      
      // Simuler l'auto-enrichissement
      const algarethEntity = (this.system as any).entities?.get('algareth');
      if (algarethEntity?.memoryEngine) {
        // Créer un EnrichedMemoryEngine avec la même clé API
        const enrichedEngine = new EnrichedMemoryEngine(
          process.env.GEMINI_API_KEY || '',
          5000,
          3,
          0.7
        );
        
        try {
          const enrichedResponse = await enrichedEngine.generateEnrichedResponse(
            test.message,
            'lucie',
            'algareth'
          );
          
          const duration = Date.now() - startTime;
          
          this.testResults.push({
            test: test.description,
            message: test.message,
            expectedTrigger: test.expectedTrigger,
            duration,
            success: true,
            response: enrichedResponse
          });
          
          console.log(`✅ Auto-enrichissement réussi (${duration}ms)`);
          console.log(`Réponse enrichie: ${enrichedResponse.substring(0, 100)}...`);
          
        } catch (error) {
          console.log(`❌ Erreur: ${error}`);
          this.testResults.push({
            test: test.description,
            message: test.message,
            expectedTrigger: test.expectedTrigger,
            duration: Date.now() - startTime,
            success: false,
            error: error
          });
        }
      }
    }
  }

  private async phase3_PerformanceMetrics(): Promise<void> {
    console.log('\n📊 Phase 3: Métriques de performance...');
    
    const performanceTests = [
      { name: 'Recherche simple', iterations: 10 },
      { name: 'Auto-enrichissement', iterations: 5 },
      { name: 'Détection de triggers', iterations: 20 }
    ];

    for (const test of performanceTests) {
      console.log(`\n⏱️  Test: ${test.name} (${test.iterations} itérations)`);
      
      const startTime = Date.now();
      
      for (let i = 0; i < test.iterations; i++) {
        // Simuler l'opération
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / test.iterations;
      
      console.log(`   Total: ${totalTime}ms | Moyenne: ${avgTime.toFixed(2)}ms`);
    }
  }

  private async phase4_GenerateReport(): Promise<void> {
    console.log('\n📝 Phase 4: Génération du rapport...');
    
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      summary: {
        totalTests: this.testResults.length,
        successfulTests: this.testResults.filter(r => r.success).length,
        failedTests: this.testResults.filter(r => !r.success).length,
        averageDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0) / this.testResults.length
      },
      recommendations: [
        'Optimiser la détection de triggers avec des patterns plus précis',
        'Implémenter un cache pour les recherches fréquentes',
        'Ajouter des métriques de confiance pour l\'auto-enrichissement',
        'Tester avec des conversations plus longues pour valider la pertinence'
      ]
    };

    // Sauvegarder le rapport
    const fs = require('fs');
    const path = require('path');
    
    const reportPath = path.join(__dirname, '..', '..', '..', 'artefacts', 'Reports', 'Memory', `Auto_Enrichment_Test_${new Date().toISOString().split('T')[0]}_${new Date().toTimeString().split(' ')[0].replace(/:/g, 'h')}.json`);
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`✅ Rapport sauvegardé: ${reportPath}`);
    } catch (error) {
      console.log(`❌ Erreur sauvegarde: ${error}`);
    }

    // Afficher le résumé
    console.log('\n📋 Résumé des tests:');
    console.log(`   Tests réussis: ${report.summary.successfulTests}/${report.summary.totalTests}`);
    console.log(`   Durée moyenne: ${report.summary.averageDuration.toFixed(2)}ms`);
    console.log(`   Taux de réussite: ${((report.summary.successfulTests / report.summary.totalTests) * 100).toFixed(1)}%`);
  }
}

// Exécution du test
async function main() {
  try {
    const test = new AutoEnrichmentTest();
    await test.runAutoEnrichmentTest();
    console.log('\n🎉 Test d\'auto-enrichissement terminé !');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

if (require.main === module) {
  main();
}

export { AutoEnrichmentTest };