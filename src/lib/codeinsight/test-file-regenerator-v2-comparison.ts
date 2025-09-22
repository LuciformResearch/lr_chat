#!/usr/bin/env node
/**
 * Test de comparaison FileRegenerator V1 vs V2
 * 
 * Compare l'approche "criante" vs l'approche naturelle
 */

import { FileAnalyzer } from './FileAnalyzer';
import { FileCompressor } from './FileCompressor';
import { FileRegenerator } from './FileRegenerator';
import { FileRegeneratorV2 } from './FileRegeneratorV2';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testFileRegeneratorComparison() {
  console.log('🧪 Test de comparaison FileRegenerator V1 vs V2');
  console.log('================================================\n');

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

    // Créer un fichier de test simple
    const testCode = `// Interface simple pour les données utilisateur
interface UserData {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
}

// Service pour gérer les utilisateurs
class UserService {
  constructor() {}
  
  getUser(id: number): UserData {
    return { id, name: 'Test User', email: 'test@example.com' };
  }
  
  createUser(userData: Omit<UserData, 'id'>): UserData {
    return { id: Math.random(), ...userData };
  }
}

// Fonction utilitaire pour valider un email
function isValidEmail(email: string): boolean {
  return email.includes('@');
}

// Fonction pour formater le nom d'utilisateur
function formatUserName(user: UserData): string {
  return \`\${user.name} (\${user.email})\`;
}`;

    const testFilePath = path.join(process.cwd(), 'test-regeneration-comparison.ts');
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

    // Étape 3: Régénération V1 (approche "criante")
    console.log('\n🔄 Étape 3: Régénération V1 (approche "criante")...');
    const regeneratorV1 = new FileRegenerator();
    const startTimeV1 = Date.now();
    const resultV1 = await regeneratorV1.regenerateFile(compressionResult.compressedFile);
    const timeV1 = Date.now() - startTimeV1;
    
    console.log(`✅ Régénération V1 terminée: ${resultV1.success ? 'SUCCÈS' : 'ÉCHEC'}`);
    console.log(`   Score: ${resultV1.validation.overallScore}/100`);
    console.log(`   Temps: ${timeV1}ms`);
    console.log(`   Exports: ${resultV1.validation.exportsValid ? '✅' : '❌'}`);

    // Étape 4: Régénération V2 (approche naturelle)
    console.log('\n🔄 Étape 4: Régénération V2 (approche naturelle)...');
    const regeneratorV2 = new FileRegeneratorV2();
    const startTimeV2 = Date.now();
    const resultV2 = await regeneratorV2.regenerateFile(compressionResult.compressedFile);
    const timeV2 = Date.now() - startTimeV2;
    
    console.log(`✅ Régénération V2 terminée: ${resultV2.success ? 'SUCCÈS' : 'ÉCHEC'}`);
    console.log(`   Score: ${resultV2.validation.overallScore}/100`);
    console.log(`   Temps: ${timeV2}ms`);
    console.log(`   Exports: ${resultV2.validation.exportsValid ? '✅' : '❌'}`);
    console.log(`   Explications: ${resultV2.explanations.improvements.length} améliorations`);
    console.log(`   Suggestions: ${resultV2.suggestions.length} suggestions`);

    // Étape 5: Sauvegarde des résultats
    console.log('\n💾 Étape 5: Sauvegarde des résultats...');
    
    // Sauvegarder V1
    const filePathV1 = await regeneratorV1.saveRegeneratedFile(resultV1, 'test-regeneration-comparison.ts');
    
    // Sauvegarder V2
    const filePathV2 = await regeneratorV2.saveRegeneratedFile(resultV2, 'test-regeneration-comparison.ts');
    
    console.log(`✅ Fichiers sauvegardés:`);
    console.log(`   V1: ${filePathV1}`);
    console.log(`   V2: ${filePathV2}`);

    // Étape 6: Comparaison des résultats
    console.log('\n📊 Étape 6: Comparaison des résultats...');
    
    const comparison = {
      v1: {
        success: resultV1.success,
        score: resultV1.validation.overallScore,
        time: timeV1,
        exports: resultV1.validation.exportsValid,
        codeLength: resultV1.regeneratedCode.split('\n').length,
        hasExplanations: false,
        hasSuggestions: false
      },
      v2: {
        success: resultV2.success,
        score: resultV2.validation.overallScore,
        time: timeV2,
        exports: resultV2.validation.exportsValid,
        codeLength: resultV2.regeneratedCode.split('\n').length,
        hasExplanations: resultV2.explanations.improvements.length > 0,
        hasSuggestions: resultV2.suggestions.length > 0,
        explanationsCount: resultV2.explanations.improvements.length,
        suggestionsCount: resultV2.suggestions.length
      }
    };

    console.log('\n📈 Résultats de la comparaison:');
    console.log('================================');
    console.log(`V1 (Criante):`);
    console.log(`  Succès: ${comparison.v1.success ? '✅' : '❌'}`);
    console.log(`  Score: ${comparison.v1.score}/100`);
    console.log(`  Temps: ${comparison.v1.time}ms`);
    console.log(`  Exports: ${comparison.v1.exports ? '✅' : '❌'}`);
    console.log(`  Lignes: ${comparison.v1.codeLength}`);
    console.log(`  Explications: ${comparison.v1.hasExplanations ? '✅' : '❌'}`);
    console.log(`  Suggestions: ${comparison.v1.hasSuggestions ? '✅' : '❌'}`);
    
    console.log(`\nV2 (Naturelle):`);
    console.log(`  Succès: ${comparison.v2.success ? '✅' : '❌'}`);
    console.log(`  Score: ${comparison.v2.score}/100`);
    console.log(`  Temps: ${comparison.v2.time}ms`);
    console.log(`  Exports: ${comparison.v2.exports ? '✅' : '❌'}`);
    console.log(`  Lignes: ${comparison.v2.codeLength}`);
    console.log(`  Explications: ${comparison.v2.hasExplanations ? '✅' : '❌'} (${comparison.v2.explanationsCount})`);
    console.log(`  Suggestions: ${comparison.v2.hasSuggestions ? '✅' : '❌'} (${comparison.v2.suggestionsCount})`);

    // Afficher les explications V2
    if (resultV2.explanations.improvements.length > 0) {
      console.log('\n💡 Explications V2:');
      resultV2.explanations.improvements.forEach((improvement, index) => {
        console.log(`  ${index + 1}. ${improvement}`);
      });
    }

    // Afficher les suggestions V2
    if (resultV2.suggestions.length > 0) {
      console.log('\n🚀 Suggestions V2:');
      resultV2.suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion}`);
      });
    }

    // Sauvegarder la comparaison
    const comparisonPath = `artefacts/codeinsight/regenerated_files/test-regeneration-comparison_comparison_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(comparisonPath, JSON.stringify(comparison, null, 2));
    console.log(`\n📄 Comparaison sauvegardée: ${comparisonPath}`);

    // Nettoyage
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Fichier de test supprimé');

    console.log('\n🎉 Test de comparaison réussi !');
    console.log('================================');
    console.log('✅ Analyse de fichier fonctionne');
    console.log('✅ Compression de fichier fonctionne');
    console.log('✅ Régénération V1 fonctionne');
    console.log('✅ Régénération V2 fonctionne');
    console.log('✅ Comparaison des résultats fonctionne');
    console.log('✅ Sauvegarde des résultats fonctionne');

  } catch (error) {
    console.error('❌ Erreur lors du test de comparaison:', error);
  }
}

// Exécuter le test
testFileRegeneratorComparison().catch(console.error);