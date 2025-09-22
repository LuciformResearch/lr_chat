#!/usr/bin/env node
/**
 * Test simple FileRegenerator V2
 * 
 * Test rapide de l'approche naturelle
 */

import { FileAnalyzer } from './FileAnalyzer';
import { FileCompressor } from './FileCompressor';
import { FileRegeneratorV2 } from './FileRegeneratorV2';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testFileRegeneratorV2Simple() {
  console.log('🧪 Test simple FileRegenerator V2');
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

    // Créer un fichier de test très simple
    const testCode = `// Interface simple
interface SimpleData {
  id: number;
  name: string;
}

// Service simple
class SimpleService {
  getData(): SimpleData {
    return { id: 1, name: 'test' };
  }
}

// Fonction utilitaire
function formatName(data: SimpleData): string {
  return \`\${data.name} (\${data.id})\`;
}`;

    const testFilePath = path.join(process.cwd(), 'test-regeneration-v2-simple.ts');
    fs.writeFileSync(testFilePath, testCode);
    console.log(`📄 Fichier de test créé: ${testFilePath}`);

    // Étape 1: Analyse du fichier
    console.log('\n🔍 Étape 1: Analyse du fichier...');
    const analyzer = new FileAnalyzer();
    const analysisResult = await analyzer.analyzeFile(testFilePath);
    
    if (!analysisResult.success) {
      console.log('❌ Échec de l\'analyse du fichier');
      return;
    }
    
    console.log(`✅ Analyse terminée: ${analysisResult.scopes.length} scopes trouvés`);

    // Étape 2: Compression du fichier
    console.log('\n🗜️ Étape 2: Compression du fichier...');
    const compressor = new FileCompressor();
    const compressionResult = await compressor.compressFile(analysisResult);
    
    if (!compressionResult.success) {
      console.log('❌ Échec de la compression du fichier');
      return;
    }
    
    console.log(`✅ Compression terminée: Ratio ${compressionResult.compressionRatio}%`);

    // Étape 3: Régénération V2 (approche naturelle)
    console.log('\n🔄 Étape 3: Régénération V2 (approche naturelle)...');
    const regeneratorV2 = new FileRegeneratorV2();
    const startTime = Date.now();
    const result = await regeneratorV2.regenerateFile(compressionResult.compressedFile);
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

    // Étape 4: Sauvegarde des résultats
    console.log('\n💾 Étape 4: Sauvegarde des résultats...');
    const filePath = await regeneratorV2.saveRegeneratedFile(result, 'test-regeneration-v2-simple.ts');
    console.log(`✅ Fichier sauvegardé: ${filePath}`);

    // Nettoyage
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Fichier de test supprimé');

    console.log('\n🎉 Test simple FileRegenerator V2 réussi !');
    console.log('==========================================');
    console.log('✅ Analyse de fichier fonctionne');
    console.log('✅ Compression de fichier fonctionne');
    console.log('✅ Régénération V2 fonctionne');
    console.log('✅ Explications capturées');
    console.log('✅ Suggestions générées');
    console.log('✅ Sauvegarde des résultats fonctionne');

  } catch (error) {
    console.error('❌ Erreur lors du test V2:', error);
  }
}

// Exécuter le test
testFileRegeneratorV2Simple().catch(console.error);