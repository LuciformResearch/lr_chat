#!/usr/bin/env node
/**
 * Test de debug - Réponse LLM pour FileRegeneratorV2
 * 
 * Capture la réponse brute du LLM pour analyser le format XML
 */

import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testDebugLLMResponse() {
  console.log('🔍 Debug - Réponse LLM FileRegeneratorV2');
  console.log('========================================\n');

  try {
    // Vérifier la clé API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ GEMINI_API_KEY non trouvée');
      return;
    }

    // Prompt de test
    const prompt = `Tu es un expert en génération de code TypeScript. Je vais te demander de régénérer un fichier complet à partir d'une analyse compressée, en appliquant les bonnes pratiques et en expliquant tes choix.

CONTEXTE DU FICHIER:
- **Fichier:** test-debug.ts
- **Type:** typescript
- **Architecture:** simple
- **But global:** Test de debug
- **Patterns:** interface, class
- **Dépendances clés:** aucune

SCOPES À RÉGÉNÉRER:
### INTERFACE TestData
- **But:** Interface simple pour les données de test
- **Signature:** interface TestData
- **Complexité:** low
- **Position:** Lignes 1-4
- **Tags:** data, interface
- **Dépendances:** aucune
- **Risques identifiés:** Pas de validation
- **Tests suggérés:** Tester la création

### CLASS TestService
- **But:** Service simple pour les données de test
- **Signature:** class TestService
- **Complexité:** low
- **Position:** Lignes 6-8
- **Tags:** service, class
- **Dépendances:** TestData
- **Risques identifiés:** Données hardcodées
- **Tests suggérés:** Tester getData

TA MISSION:
Régénère le code TypeScript complet en appliquant les bonnes pratiques modernes. Pense aux exports appropriés, à la gestion d'erreurs, à la documentation, et aux améliorations suggérées par l'analyse.

RÉPONDS DANS CE FORMAT XML:

<regeneration>
  <code>
    // Ton code TypeScript complet ici
  </code>
  <explanations>
    <improvements>
      <improvement>Explication de chaque amélioration apportée</improvement>
    </improvements>
    <exports>
      <export>Explication des choix d'export</export>
    </exports>
    <architecture>
      <decision>Explication des décisions architecturales</decision>
    </architecture>
  </explanations>
  <suggestions>
    <suggestion>Suggestion pour l'agentique future</suggestion>
  </suggestions>
</regeneration>`;

    // Appel LLM direct
    console.log('🧠 Appel LLM direct...');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawResponse = response.text();
    
    console.log('📄 Réponse brute du LLM:');
    console.log('========================');
    console.log(rawResponse);
    console.log('\n========================\n');

    // Test avec LuciformXMLParser
    console.log('🔧 Test avec LuciformXMLParser...');
    const { LuciformXMLParser } = require('../llm/LuciformXMLParser');
    const parser = new LuciformXMLParser();
    
    console.log('📋 Configuration du parser:');
    console.log(`  Mode permissif: ${parser.permissiveMode}`);
    console.log(`  CDATA support: ${parser.cdataSupport}`);
    console.log(`  Namespace support: ${parser.namespaceSupport}`);
    
    const parseResult = parser.parse(rawResponse);
    
    console.log('\n📊 Résultat du parsing:');
    console.log(`  Succès: ${parseResult.success}`);
    console.log(`  Erreurs: ${parseResult.errors.length}`);
    
    if (parseResult.errors.length > 0) {
      console.log('\n❌ Erreurs de parsing:');
      parseResult.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message} (ligne ${error.line}, colonne ${error.column})`);
      });
    }
    
    if (parseResult.success) {
      console.log('\n✅ Parsing réussi !');
      console.log('📋 Structure du document:');
      console.log(JSON.stringify(parseResult.document, null, 2));
    }

    // Test de nettoyage
    console.log('\n🧹 Test de nettoyage...');
    let cleanResponse = rawResponse.trim();
    cleanResponse = cleanResponse.replace(/```xml\n?/g, '').replace(/```\n?/g, '');
    
    console.log('📄 Réponse nettoyée:');
    console.log('====================');
    console.log(cleanResponse);
    console.log('\n====================\n');

    // Test parsing sur réponse nettoyée
    console.log('🔧 Test parsing sur réponse nettoyée...');
    const cleanParseResult = parser.parse(cleanResponse);
    
    console.log(`  Succès: ${cleanParseResult.success}`);
    console.log(`  Erreurs: ${cleanParseResult.errors.length}`);
    
    if (cleanParseResult.errors.length > 0) {
      console.log('\n❌ Erreurs de parsing (nettoyé):');
      cleanParseResult.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message} (ligne ${error.line}, colonne ${error.column})`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
  }
}

// Exécuter le test
testDebugLLMResponse().catch(console.error);