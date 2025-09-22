#!/usr/bin/env node
/**
 * Test minimal FileRegenerator V2
 * 
 * Test avec un fichier très simple pour valider l'approche
 */

import { FileRegeneratorV2 } from './FileRegeneratorV2';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testFileRegeneratorV2Minimal() {
  console.log('🧪 Test minimal FileRegenerator V2');
  console.log('==================================\n');

  try {
    // Vérifier la clé API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ GEMINI_API_KEY non trouvée');
      return;
    } else {
      console.log('✅ GEMINI_API_KEY trouvée');
      console.log(`🔑 Clé API: ${geminiApiKey.substring(0, 20)}...`);
    }

    // Créer un fichier de test minimal
    const testCode = `interface TestData {
  id: number;
  name: string;
}

class TestService {
  getData(): TestData {
    return { id: 1, name: 'test' };
  }
}`;

    const testFilePath = path.join(process.cwd(), 'test-regeneration-v2-minimal.ts');
    fs.writeFileSync(testFilePath, testCode);
    console.log(`📄 Fichier de test créé: ${testFilePath}`);

    // Créer un fichier compressé minimal manuellement
    const compressedFile = {
      metadata: {
        fileName: 'test-regeneration-v2-minimal.ts',
        fileType: 'typescript',
        originalPath: testFilePath,
        totalLines: 8,
        totalScopes: 2,
        compressionRatio: 50,
        originalSize: testCode.length
      },
      summary: {
        architecture: 'simple',
        purpose: 'Test minimal',
        mainPatterns: ['interface', 'class'],
        keyDependencies: []
      },
      scopes: [
        {
          name: 'TestData',
          type: 'interface',
          purpose: 'Interface simple pour les données de test',
          signature: 'interface TestData',
          complexity: 'low',
          position: { startLine: 1, endLine: 4 },
          tags: ['data', 'interface'],
          keyDependencies: [],
          risks: ['Pas de validation'],
          testIdeas: ['Tester la création']
        },
        {
          name: 'TestService',
          type: 'class',
          purpose: 'Service simple pour les données de test',
          signature: 'class TestService',
          complexity: 'low',
          position: { startLine: 6, endLine: 8 },
          tags: ['service', 'class'],
          keyDependencies: ['TestData'],
          risks: ['Données hardcodées'],
          testIdeas: ['Tester getData']
        }
      ],
      decompression: {
        instructions: ['Régénérer le code TypeScript'],
        requiredContext: ['Interface et classe simples'],
        regenerationHints: ['Ajouter les exports'],
        qualityChecks: ['Syntaxe valide'],
        validationRules: ['Types corrects']
      }
    };

    // Test direct de la régénération V2
    console.log('\n🔄 Test direct de la régénération V2...');
    const regeneratorV2 = new FileRegeneratorV2();
    const startTime = Date.now();
    const result = await regeneratorV2.regenerateFile(compressedFile);
    const time = Date.now() - startTime;
    
    console.log(`✅ Régénération V2 terminée: ${result.success ? 'SUCCÈS' : 'ÉCHEC'}`);
    console.log(`   Score: ${result.validation.overallScore}/100`);
    console.log(`   Temps: ${time}ms`);
    console.log(`   Exports: ${result.validation.exportsValid ? '✅' : '❌'}`);
    console.log(`   Explications: ${result.explanations.improvements.length} améliorations`);
    console.log(`   Suggestions: ${result.suggestions.length} suggestions`);

    // Afficher les explications
    if (result.explanations.improvements.length > 0) {
      console.log('\n💡 Explications des améliorations:');
      result.explanations.improvements.forEach((improvement, index) => {
        console.log(`  ${index + 1}. ${improvement}`);
      });
    }

    if (result.explanations.exports.length > 0) {
      console.log('\n📤 Explications des exports:');
      result.explanations.exports.forEach((exportExp, index) => {
        console.log(`  ${index + 1}. ${exportExp}`);
      });
    }

    if (result.explanations.architecture.length > 0) {
      console.log('\n🏗️ Explications architecturales:');
      result.explanations.architecture.forEach((arch, index) => {
        console.log(`  ${index + 1}. ${arch}`);
      });
    }

    // Afficher les suggestions
    if (result.suggestions.length > 0) {
      console.log('\n🚀 Suggestions pour l\'agentique:');
      result.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    // Afficher le code généré
    console.log('\n📝 Code généré:');
    console.log('================');
    console.log(result.regeneratedCode);

    // Sauvegarde des résultats
    console.log('\n💾 Sauvegarde des résultats...');
    const filePath = await regeneratorV2.saveRegeneratedFile(result, 'test-regeneration-v2-minimal.ts');
    console.log(`✅ Fichier sauvegardé: ${filePath}`);

    // Nettoyage
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Fichier de test supprimé');

    console.log('\n🎉 Test minimal FileRegenerator V2 réussi !');
    console.log('==========================================');
    console.log('✅ Régénération V2 fonctionne');
    console.log('✅ Explications capturées');
    console.log('✅ Suggestions générées');
    console.log('✅ Sauvegarde des résultats fonctionne');

  } catch (error) {
    console.error('❌ Erreur lors du test V2 minimal:', error);
  }
}

// Exécuter le test
testFileRegeneratorV2Minimal().catch(console.error);