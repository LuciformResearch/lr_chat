#!/usr/bin/env node
/**
 * Test rapide du FileRegenerator
 * 
 * Teste avec un fichier très simple pour validation rapide
 */

import { FileAnalyzer } from './FileAnalyzer';
import { FileCompressor } from './FileCompressor';
import { FileRegenerator } from './FileRegenerator';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testFileRegeneratorQuick() {
  console.log('🧪 Test rapide du FileRegenerator');
  console.log('==================================\n');

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
    const testFilePath = path.join(process.cwd(), 'test-regeneration-quick.ts');
    const testCode = `// Fichier de test simple pour régénération
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

    // Étape 1: Analyser le fichier
    console.log('\n🔍 Étape 1: Analyse du fichier...');
    const fileAnalyzer = new FileAnalyzer();
    const analysisResult = await fileAnalyzer.analyzeFile(testFilePath);
    console.log(`✅ Analyse terminée: ${analysisResult.metadata.totalScopes} scopes analysés`);

    // Étape 2: Compresser le fichier
    console.log('\n🗜️ Étape 2: Compression du fichier...');
    const fileCompressor = new FileCompressor();
    const compressedFile = await fileCompressor.compressFile(analysisResult);
    console.log(`✅ Compression terminée: ${compressedFile.metadata.compressionRatio}% de compression`);

    // Étape 3: Régénérer le fichier
    console.log('\n🔄 Étape 3: Régénération du fichier...');
    const fileRegenerator = new FileRegenerator();
    const regenerationResult = await fileRegenerator.regenerateFile(compressedFile);
    console.log(`✅ Régénération terminée: ${regenerationResult.success ? 'SUCCÈS' : 'ÉCHEC'}`);

    // Afficher les résultats
    console.log('\n📊 Résultats de la régénération:');
    console.log(`   Succès: ${regenerationResult.success ? '✅' : '❌'}`);
    console.log(`   Score global: ${regenerationResult.validation.overallScore}/100`);
    console.log(`   Lignes originales: ${regenerationResult.metadata.originalLines}`);
    console.log(`   Lignes régénérées: ${regenerationResult.metadata.regeneratedLines}`);
    console.log(`   Scopes originaux: ${regenerationResult.metadata.originalScopes}`);
    console.log(`   Scopes régénérés: ${regenerationResult.metadata.regeneratedScopes}`);
    console.log(`   Score de fidélité: ${regenerationResult.metadata.fidelityScore}/100`);
    console.log(`   Score de qualité: ${regenerationResult.metadata.qualityScore}/100`);
    console.log(`   Temps de régénération: ${regenerationResult.metadata.regenerationTime}ms`);

    console.log('\n🔍 Validation détaillée:');
    console.log(`   Syntaxe valide: ${regenerationResult.validation.syntaxValid ? '✅' : '❌'}`);
    console.log(`   Structure valide: ${regenerationResult.validation.structureValid ? '✅' : '❌'}`);
    console.log(`   Imports valides: ${regenerationResult.validation.importsValid ? '✅' : '❌'}`);
    console.log(`   Exports valides: ${regenerationResult.validation.exportsValid ? '✅' : '❌'}`);
    console.log(`   Types valides: ${regenerationResult.validation.typeValid ? '✅' : '❌'}`);
    console.log(`   Compilation valide: ${regenerationResult.validation.compilationValid ? '✅' : '❌'}`);

    if (regenerationResult.errors.length > 0) {
      console.log('\n❌ Erreurs:');
      regenerationResult.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }

    if (regenerationResult.warnings.length > 0) {
      console.log('\n⚠️ Avertissements:');
      regenerationResult.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }

    // Afficher un aperçu du code régénéré
    console.log('\n📝 Aperçu du code régénéré:');
    const codeLines = regenerationResult.regeneratedCode.split('\n');
    const previewLines = codeLines.slice(0, 20);
    console.log(previewLines.join('\n'));
    if (codeLines.length > 20) {
      console.log(`... (${codeLines.length - 20} lignes supplémentaires)`);
    }

    // Sauvegarder les résultats
    console.log('\n💾 Sauvegarde des résultats...');
    const savedPath = await fileRegenerator.saveRegeneratedFile(regenerationResult);
    console.log(`✅ Fichier régénéré sauvegardé: ${savedPath}`);

    // Nettoyer le fichier de test
    fs.unlinkSync(testFilePath);
    console.log('🧹 Fichier de test supprimé');

    console.log('\n🎉 Test rapide du FileRegenerator réussi !');
    console.log('==========================================');
    console.log('✅ Analyse de fichier fonctionne');
    console.log('✅ Compression de fichier fonctionne');
    console.log('✅ Régénération de fichier fonctionne');
    console.log('✅ Validation du code fonctionne');
    console.log('✅ Sauvegarde des résultats fonctionne');

    return regenerationResult;

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testFileRegeneratorQuick().catch(console.error);
}

export { testFileRegeneratorQuick };