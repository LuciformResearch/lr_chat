#!/usr/bin/env node
/**
 * Test de correction du parsing XML
 * 
 * Valide que le LuciformXMLParser fonctionne correctement
 */

import { StructuredLLMAnalyzerXML } from './StructuredLLMAnalyzerXML';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testXMLParsingFix() {
  console.log('🧪 Test de correction du parsing XML');
  console.log('===================================\n');

  try {
    // Vérifier la clé API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ GEMINI_API_KEY non trouvée');
      return;
    }

    console.log('✅ GEMINI_API_KEY trouvée');
    console.log(`🔑 Clé API: ${geminiApiKey.substring(0, 20)}...`);

    // Créer l'analyzer
    const xmlAnalyzer = new StructuredLLMAnalyzerXML();
    console.log('✅ StructuredLLMAnalyzerXML initialisé');

    // Test avec une fonction simple
    const testScope = {
      name: 'SimpleTestFunction',
      type: 'function',
      startLine: 1,
      endLine: 5,
      signature: 'function simpleTestFunction(input: string): string',
      content: `function simpleTestFunction(input: string): string {
  return input.toUpperCase();
}`,
      contentDedented: `function simpleTestFunction(input: string): string {
  return input.toUpperCase();
}`,
      parameters: [
        { name: 'input', type: 'string' }
      ],
      returnType: 'string',
      complexity: 2,
      dependencies: [],
      astValid: true
    };

    console.log('\n🧠 Test d\'analyse LLM avec parsing XML corrigé...');
    console.log(`📝 Fonction: ${testScope.name}`);
    console.log(`📝 Signature: ${testScope.signature}`);

    const startTime = Date.now();
    const analysis = await xmlAnalyzer.analyzeScope(testScope);
    const endTime = Date.now();

    console.log('\n✅ Analyse terminée !');
    console.log(`⏱️ Temps: ${endTime - startTime}ms`);
    console.log('\n📊 Résultats:');
    console.log(`   Nom: ${analysis.name}`);
    console.log(`   Type: ${analysis.type}`);
    console.log(`   But: ${analysis.overall_purpose}`);
    console.log(`   Complexité: ${analysis.complexity}`);
    console.log(`   Sous-scopes: ${analysis.sub_scopes.length}`);
    console.log(`   Tags: ${analysis.tags.length}`);
    console.log(`   Risques: ${analysis.risks.length}`);
    console.log(`   Idées de tests: ${analysis.test_ideas.length}`);

    // Vérifier si le parsing a fonctionné
    const parsingWorked = analysis.name !== 'unknown' && 
                         analysis.overall_purpose !== '' && 
                         analysis.tags.length > 0;

    if (parsingWorked) {
      console.log('\n🎉 SUCCÈS: Le parsing XML fonctionne !');
      console.log('✅ Les données LLM sont correctement extraites');
      
      // Afficher les détails
      if (analysis.tags.length > 0) {
        console.log(`   Tags: ${analysis.tags.join(', ')}`);
      }
      if (analysis.risks.length > 0) {
        console.log(`   Risques: ${analysis.risks.join(', ')}`);
      }
      if (analysis.test_ideas.length > 0) {
        console.log(`   Tests: ${analysis.test_ideas.join(', ')}`);
      }
    } else {
      console.log('\n❌ ÉCHEC: Le parsing XML ne fonctionne toujours pas');
      console.log('🔧 Les données LLM ne sont pas correctement extraites');
    }

    // Sauvegarder les résultats pour analyse
    const resultsPath = path.join(process.cwd(), 'artefacts', 'codeinsight', 'xml_parsing_test');
    if (!fs.existsSync(resultsPath)) {
      fs.mkdirSync(resultsPath, { recursive: true });
    }

    const testResult = {
      timestamp: new Date().toISOString(),
      testScope,
      analysis,
      parsingWorked,
      duration: endTime - startTime,
      apiKeyPresent: !!geminiApiKey
    };

    const resultFile = path.join(resultsPath, `xml_parsing_test_${Date.now()}.json`);
    fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2), 'utf-8');
    console.log(`\n📄 Résultats sauvegardés: ${resultFile}`);

    console.log('\n🎯 Prochaines étapes:');
    if (parsingWorked) {
      console.log('✅ Parsing XML corrigé - on peut continuer avec:');
      console.log('   1. Analyse fichier par fichier');
      console.log('   2. Compression avec résumé + métadonnées');
      console.log('   3. Régénération de fichier complet');
    } else {
      console.log('❌ Parsing XML à corriger - priorité absolue');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testXMLParsingFix().catch(console.error);
}

export { testXMLParsingFix };