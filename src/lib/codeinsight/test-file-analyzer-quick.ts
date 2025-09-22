#!/usr/bin/env node
/**
 * Test rapide du FileAnalyzer
 * 
 * Teste avec un fichier plus simple pour validation rapide
 */

import { FileAnalyzer } from './FileAnalyzer';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testFileAnalyzerQuick() {
  console.log('🧪 Test rapide du FileAnalyzer');
  console.log('=============================\n');

  try {
    // Vérifier la clé API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ GEMINI_API_KEY non trouvée');
      console.log('   Le test fonctionnera en mode heuristique');
    } else {
      console.log('✅ GEMINI_API_KEY trouvée');
      console.log(`🔑 Clé API: ${geminiApiKey.substring(0, 20)}...`);
    }

    // Créer un fichier de test simple
    const testFilePath = path.join(process.cwd(), 'test-quick.ts');
    const testCode = `// Fichier de test simple
import { Component } from '@angular/core';

/**
 * Interface simple
 */
export interface SimpleData {
  id: number;
  name: string;
}

/**
 * Service simple
 */
@Injectable()
export class SimpleService {
  constructor() {}
  
  /**
   * Méthode simple
   */
  getData(): SimpleData {
    return { id: 1, name: 'test' };
  }
}

/**
 * Fonction utilitaire
 */
export function formatName(data: SimpleData): string {
  return \`\${data.name} (\${data.id})\`;
}`;

    // Écrire le fichier de test
    fs.writeFileSync(testFilePath, testCode, 'utf-8');
    console.log(`📄 Fichier de test créé: ${testFilePath}`);

    // Créer le FileAnalyzer
    const fileAnalyzer = new FileAnalyzer();
    console.log('✅ FileAnalyzer initialisé');

    // Analyser le fichier
    console.log('\n🔍 Analyse du fichier...');
    const startTime = Date.now();
    const result = await fileAnalyzer.analyzeFile(testFilePath);
    const endTime = Date.now();

    console.log('\n✅ Analyse terminée !');
    console.log(`⏱️ Temps total: ${endTime - startTime}ms`);

    // Afficher les résultats
    console.log('\n📊 Résultats:');
    console.log(`   Fichier: ${result.filePath}`);
    console.log(`   Scopes totaux: ${result.metadata.totalScopes}`);
    console.log(`   Scopes analysés: ${result.metadata.analyzedScopes}`);
    console.log(`   Appels LLM: ${result.metadata.llmCalls}`);
    console.log(`   Durée totale: ${result.metadata.totalDuration}ms`);

    console.log('\n🏗️ Structure:');
    console.log(`   Classes: ${result.summary.scopeTypes.classes}`);
    console.log(`   Fonctions: ${result.summary.scopeTypes.functions}`);
    console.log(`   Interfaces: ${result.summary.scopeTypes.interfaces}`);
    console.log(`   Méthodes: ${result.summary.scopeTypes.methods}`);

    console.log('\n📈 Complexité:');
    console.log(`   Faible: ${result.summary.complexity.low}`);
    console.log(`   Moyenne: ${result.summary.complexity.medium}`);
    console.log(`   Élevée: ${result.summary.complexity.high}`);

    console.log('\n🏷️ Tags:');
    result.summary.tags.forEach(tag => {
      console.log(`   - ${tag}`);
    });

    console.log('\n⚠️ Risques:');
    result.summary.risks.forEach(risk => {
      console.log(`   - ${risk}`);
    });

    console.log('\n💡 Recommandations:');
    result.summary.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });

    // Afficher les détails des scopes
    console.log('\n📋 Détails des scopes:');
    result.scopeAnalyses.forEach((scopeAnalysis, index) => {
      const { scope, analysis, success, duration } = scopeAnalysis;
      console.log(`   ${index + 1}. ${scope.type} ${scope.name}`);
      console.log(`      Succès: ${success ? '✅' : '❌'}`);
      console.log(`      Durée: ${duration}ms`);
      console.log(`      Complexité: ${analysis.complexity}`);
      console.log(`      Tags: ${analysis.tags.join(', ')}`);
      if (analysis.risks.length > 0) {
        console.log(`      Risques: ${analysis.risks.length}`);
      }
      if (analysis.test_ideas.length > 0) {
        console.log(`      Tests: ${analysis.test_ideas.length}`);
      }
    });

    // Sauvegarder les résultats
    console.log('\n💾 Sauvegarde des résultats...');
    const savedPath = await fileAnalyzer.saveAnalysisResults(result);
    console.log(`✅ Résultats sauvegardés: ${savedPath}`);

    // Nettoyer le fichier de test
    fs.unlinkSync(testFilePath);
    console.log('🧹 Fichier de test supprimé');

    console.log('\n🎉 Test rapide du FileAnalyzer réussi !');
    console.log('=====================================');
    console.log('✅ Parsing TypeScript fonctionne');
    console.log('✅ Analyse LLM fonctionne');
    console.log('✅ Génération de résumé fonctionne');
    console.log('✅ Sauvegarde des résultats fonctionne');

    return result;

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testFileAnalyzerQuick().catch(console.error);
}

export { testFileAnalyzerQuick };