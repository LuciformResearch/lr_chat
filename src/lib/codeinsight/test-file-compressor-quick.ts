#!/usr/bin/env node
/**
 * Test rapide du FileCompressor
 * 
 * Teste avec un fichier très simple pour validation rapide
 */

import { FileAnalyzer } from './FileAnalyzer';
import { FileCompressor } from './FileCompressor';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testFileCompressorQuick() {
  console.log('🧪 Test rapide du FileCompressor');
  console.log('================================\n');

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

    // Créer un fichier de test très simple
    const testFilePath = path.join(process.cwd(), 'test-compression-quick.ts');
    const testCode = `// Fichier de test simple pour compression
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

    // Étape 1: Analyser le fichier avec FileAnalyzer
    console.log('\n🔍 Étape 1: Analyse du fichier...');
    const fileAnalyzer = new FileAnalyzer();
    const analysisResult = await fileAnalyzer.analyzeFile(testFilePath);
    console.log(`✅ Analyse terminée: ${analysisResult.metadata.totalScopes} scopes analysés`);

    // Étape 2: Compresser le fichier avec FileCompressor
    console.log('\n🗜️ Étape 2: Compression du fichier...');
    const fileCompressor = new FileCompressor();
    const compressedFile = await fileCompressor.compressFile(analysisResult);
    console.log(`✅ Compression terminée: ${compressedFile.metadata.compressionRatio}% de compression`);

    // Afficher les résultats
    console.log('\n📊 Résultats de la compression:');
    console.log(`   Fichier: ${compressedFile.metadata.fileName}`);
    console.log(`   Type: ${compressedFile.metadata.fileType}`);
    console.log(`   Lignes: ${compressedFile.metadata.totalLines}`);
    console.log(`   Scopes: ${compressedFile.metadata.totalScopes}`);
    console.log(`   Ratio de compression: ${compressedFile.metadata.compressionRatio}%`);

    console.log('\n🏗️ Architecture:');
    console.log(`   Type: ${compressedFile.summary.architecture}`);
    console.log(`   But: ${compressedFile.summary.purpose}`);
    console.log(`   Patterns: ${compressedFile.summary.mainPatterns.join(', ')}`);

    console.log('\n📈 Complexité:');
    console.log(`   Globale: ${compressedFile.summary.complexity.overall}`);
    console.log(`   Distribution: ${compressedFile.summary.complexity.distribution.low} faible, ${compressedFile.summary.complexity.distribution.medium} moyenne, ${compressedFile.summary.complexity.distribution.high} élevée`);

    console.log('\n🎯 Qualité:');
    console.log(`   Maintenabilité: ${compressedFile.summary.quality.maintainability}`);
    console.log(`   Testabilité: ${compressedFile.summary.quality.testability}`);
    console.log(`   Lisibilité: ${compressedFile.summary.quality.readability}`);

    console.log('\n⚠️ Risques identifiés:');
    compressedFile.summary.risks.forEach(risk => {
      console.log(`   - ${risk}`);
    });

    console.log('\n💡 Recommandations:');
    compressedFile.summary.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });

    console.log('\n🗜️ Informations de compression:');
    console.log(`   Algorithme: ${compressedFile.compression.algorithm}`);
    console.log(`   Niveau: ${compressedFile.compression.compressionLevel}/10`);
    console.log(`   Taille originale: ${compressedFile.compression.originalSize} caractères`);
    console.log(`   Taille compressée: ${compressedFile.compression.compressedSize} caractères`);
    console.log(`   Temps: ${compressedFile.compression.compressionTime}ms`);
    console.log(`   Appels LLM: ${compressedFile.compression.llmCalls}`);

    console.log('\n🔄 Instructions de décompression:');
    compressedFile.decompression.instructions.forEach(instruction => {
      console.log(`   - ${instruction}`);
    });

    console.log('\n📋 Scopes compressés:');
    compressedFile.scopes.forEach((scope, index) => {
      console.log(`   ${index + 1}. ${scope.type} ${scope.name}`);
      console.log(`      ID: ${scope.id}`);
      console.log(`      Complexité: ${scope.complexity}`);
      console.log(`      Position: ${scope.position.startLine}-${scope.position.endLine} (${scope.position.relativeSize}%)`);
      console.log(`      Tags: ${scope.tags.join(', ')}`);
      console.log(`      Dépendances: ${scope.keyDependencies.length}`);
      console.log(`      Risques: ${scope.risks.length}`);
      console.log(`      Tests: ${scope.testIdeas.length}`);
    });

    // Sauvegarder les résultats
    console.log('\n💾 Sauvegarde des résultats...');
    const savedPath = await fileCompressor.saveCompressedFile(compressedFile);
    console.log(`✅ Fichier compressé sauvegardé: ${savedPath}`);

    // Nettoyer le fichier de test
    fs.unlinkSync(testFilePath);
    console.log('🧹 Fichier de test supprimé');

    console.log('\n🎉 Test rapide du FileCompressor réussi !');
    console.log('========================================');
    console.log('✅ Analyse de fichier fonctionne');
    console.log('✅ Compression de fichier fonctionne');
    console.log('✅ Génération de métadonnées fonctionne');
    console.log('✅ Sauvegarde des résultats fonctionne');

    return compressedFile;

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testFileCompressorQuick().catch(console.error);
}

export { testFileCompressorQuick };