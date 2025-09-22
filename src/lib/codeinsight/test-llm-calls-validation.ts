#!/usr/bin/env node
/**
 * Test de validation des appels LLM dans CodeInsight
 * 
 * Valide que les mocks ont été remplacés par de vrais appels LLM
 */

import { AgenticDecompressionEngine } from './AgenticDecompressionEngine';
import { StructuredLLMAnalyzerXML } from './StructuredLLMAnalyzerXML';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testLLMCallsValidation() {
  console.log('🧪 Test de validation des appels LLM dans CodeInsight');
  console.log('====================================================\n');

  try {
    // Vérifier la clé API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ GEMINI_API_KEY non trouvée dans ~/.shadeos_env');
      console.log('   Les tests fonctionneront en mode heuristique (fallback)');
    } else {
      console.log('✅ GEMINI_API_KEY trouvée');
      console.log(`🔑 Clé API: ${geminiApiKey.substring(0, 20)}...`);
    }

    // Test 1: AgenticDecompressionEngine
    console.log('\n🧠 Test 1: AgenticDecompressionEngine');
    console.log('-------------------------------------');
    
    const agenticEngine = new AgenticDecompressionEngine();
    console.log('✅ AgenticDecompressionEngine initialisé');
    
    // Vérifier si l'engine utilise de vrais appels LLM
    const hasLLM = (agenticEngine as any).useRealLLM;
    console.log(`🧠 Utilise de vrais appels LLM: ${hasLLM ? '✅ OUI' : '❌ NON (fallback)'}`);

    // Test 2: StructuredLLMAnalyzerXML
    console.log('\n🧠 Test 2: StructuredLLMAnalyzerXML');
    console.log('-----------------------------------');
    
    const xmlAnalyzer = new StructuredLLMAnalyzerXML();
    console.log('✅ StructuredLLMAnalyzerXML initialisé');
    
    // Vérifier si l'analyzer utilise de vrais appels LLM
    const hasLLMAnalyzer = (xmlAnalyzer as any).useRealLLM;
    console.log(`🧠 Utilise de vrais appels LLM: ${hasLLMAnalyzer ? '✅ OUI' : '❌ NON (fallback)'}`);

    // Test 3: Test d'appel LLM simple
    console.log('\n🧠 Test 3: Test d\'appel LLM simple');
    console.log('-----------------------------------');
    
    if (hasLLMAnalyzer) {
      console.log('🧠 Test d\'appel LLM avec StructuredLLMAnalyzerXML...');
      
      // Créer un scope de test simple
      const testScope = {
        name: 'TestFunction',
        type: 'function',
        startLine: 1,
        endLine: 5,
        signature: 'function testFunction(param: string): string',
        content: 'function testFunction(param: string): string {\n  return param.toUpperCase();\n}',
        contentDedented: 'function testFunction(param: string): string {\n  return param.toUpperCase();\n}',
        parameters: [{ name: 'param', type: 'string' }],
        returnType: 'string',
        complexity: 2,
        dependencies: [],
        astValid: true
      };

      const startTime = Date.now();
      const analysis = await xmlAnalyzer.analyzeScope(testScope);
      const endTime = Date.now();

      console.log('✅ Analyse LLM terminée');
      console.log(`   Temps d'exécution: ${endTime - startTime}ms`);
      console.log(`   Nom: ${analysis.name}`);
      console.log(`   Type: ${analysis.type}`);
      console.log(`   But: ${analysis.overall_purpose}`);
      console.log(`   Complexité: ${analysis.complexity}`);
      console.log(`   Sous-scopes: ${analysis.sub_scopes.length}`);
      console.log(`   Tags: ${analysis.tags.length}`);
      
      if (analysis.sub_scopes.length > 0) {
        console.log('   Premier sous-scope:');
        console.log(`     - Nom: ${analysis.sub_scopes[0].name}`);
        console.log(`     - Type: ${analysis.sub_scopes[0].type}`);
        console.log(`     - But: ${analysis.sub_scopes[0].purpose}`);
      }
    } else {
      console.log('⚠️ Pas de clé API, test d\'appel LLM ignoré');
    }

    // Résumé
    console.log('\n🎉 Résumé de la validation');
    console.log('===========================');
    
    const totalEngines = 2;
    const enginesWithLLM = (hasLLM ? 1 : 0) + (hasLLMAnalyzer ? 1 : 0);
    
    console.log(`📊 Engines testés: ${totalEngines}`);
    console.log(`🧠 Engines avec vrais appels LLM: ${enginesWithLLM}/${totalEngines}`);
    console.log(`📈 Taux de migration: ${(enginesWithLLM / totalEngines * 100).toFixed(1)}%`);
    
    if (enginesWithLLM === totalEngines) {
      console.log('✅ SUCCÈS: Tous les engines utilisent de vrais appels LLM');
      console.log('🎯 Les mocks ont été remplacés avec succès');
    } else if (enginesWithLLM > 0) {
      console.log('⚠️ PARTIEL: Certains engines utilisent de vrais appels LLM');
      console.log('🔧 Migration en cours');
    } else {
      console.log('❌ ÉCHEC: Aucun engine n\'utilise de vrais appels LLM');
      console.log('🔧 Vérifiez la clé API GEMINI_API_KEY');
    }

    console.log('\n✅ Test de validation des appels LLM terminé !');
    console.log('==============================================');
    console.log('🎯 Validation que les mocks ont été remplacés par de vrais appels LLM');
    console.log('🧠 Test des intégrations LLM dans CodeInsight');
    console.log('📊 Mesure du taux de migration des mocks vers LLM');

  } catch (error) {
    console.error('❌ Erreur lors du test de validation:', error);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testLLMCallsValidation().catch(console.error);
}

export { testLLMCallsValidation };