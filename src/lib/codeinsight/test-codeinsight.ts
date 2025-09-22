/**
 * Test CodeInsight TypeScript Engine
 * 
 * Tests the CodeInsight engine with real TypeScript files from the project.
 */

import { CodeInsightEngine } from './CodeInsightEngine';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

class CodeInsightTest {
  private engine: CodeInsightEngine;

  constructor() {
    this.engine = new CodeInsightEngine();
  }

  async runTests(): Promise<void> {
    console.log('🧠 Test CodeInsight TypeScript - Démarrage...\n');

    // Test 1: Analyse d'un fichier spécifique
    await this.testSingleFileAnalysis();
    
    // Test 2: Analyse du module de mémoire
    await this.testMemoryModuleAnalysis();
    
    // Test 3: Génération de rapport complet
    await this.testProjectReport();
  }

  private async testSingleFileAnalysis(): Promise<void> {
    console.log('🔍 Test 1: Analyse d\'un fichier spécifique...\n');

    const testFile = 'src/lib/memory/AutoEnrichmentEngine.ts';
    
    try {
      const fileReport = await this.engine.analyzeFile(testFile);
      
      console.log(`📊 Analyse de ${testFile}:`);
      console.log(`   Score: ${fileReport.score}/10`);
      console.log(`   Scopes: ${fileReport.report.scopes.length}`);
      console.log(`   Patterns: ${fileReport.report.patterns.designPatterns.length} design, ${fileReport.report.patterns.antiPatterns.length} anti`);
      console.log(`   Recommandations: ${fileReport.report.recommendations.length}`);
      
      if (fileReport.issues.length > 0) {
        console.log(`   Problèmes: ${fileReport.issues.join(', ')}`);
      }
      
      console.log(`   Résumé: ${fileReport.report.summary}\n`);
      
    } catch (error) {
      console.log(`❌ Erreur analyse ${testFile}: ${error}\n`);
    }
  }

  private async testMemoryModuleAnalysis(): Promise<void> {
    console.log('🔍 Test 2: Analyse du module de mémoire...\n');

    try {
      const projectReport = await this.engine.analyzeProject('src/lib/memory/');
      
      console.log(`📊 Analyse du module mémoire:`);
      console.log(`   Fichiers: ${projectReport.summary.totalFiles}`);
      console.log(`   Scopes: ${projectReport.summary.totalScopes}`);
      console.log(`   Lignes de code: ${projectReport.summary.totalLinesOfCode}`);
      console.log(`   Complexité moyenne: ${projectReport.summary.averageComplexity.toFixed(2)}`);
      console.log(`   Maintenabilité moyenne: ${projectReport.summary.averageMaintainability.toFixed(2)}/10`);
      
      if (projectReport.summary.designPatterns.length > 0) {
        console.log(`   Patterns de design: ${projectReport.summary.designPatterns.join(', ')}`);
      }
      
      if (projectReport.summary.antiPatterns.length > 0) {
        console.log(`   Anti-patterns: ${projectReport.summary.antiPatterns.join(', ')}`);
      }
      
      if (projectReport.recommendations.length > 0) {
        console.log(`   Recommandations principales:`);
        projectReport.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`     ${index + 1}. ${rec}`);
        });
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ Erreur analyse module mémoire: ${error}\n`);
    }
  }

  private async testProjectReport(): Promise<void> {
    console.log('🔍 Test 3: Génération de rapport complet...\n');

    try {
      const reportPath = await this.engine.saveReport('src/lib/memory/');
      console.log(`✅ Rapport généré: ${reportPath}\n`);
      
      // Afficher un aperçu du rapport
      const fs = require('fs');
      const content = fs.readFileSync(reportPath, 'utf-8');
      const lines = content.split('\n');
      
      console.log('📄 Aperçu du rapport:');
      lines.slice(0, 20).forEach(line => {
        console.log(`   ${line}`);
      });
      console.log('   ...\n');
      
    } catch (error) {
      console.log(`❌ Erreur génération rapport: ${error}\n`);
    }
  }
}

// Exécution du test
async function main() {
  try {
    const test = new CodeInsightTest();
    await test.runTests();
    console.log('🎉 Test CodeInsight TypeScript terminé !');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

if (require.main === module) {
  main();
}

export { CodeInsightTest };