#!/usr/bin/env node
/**
 * 🧪 Test de l'analyseur d'imports TypeScript
 * 
 * Script de test pour valider le fonctionnement de l'analyseur d'imports
 * Inspiré des tests de l'ancien projet Python avec validation des patterns :
 * - Détection automatique des modules locaux
 * - Résolution d'imports hybride
 * - Génération de rapports structurés
 * - Gestion d'erreurs robuste
 */

import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptImportAnalyzer, analyzeProject } from './ImportAnalyzer';

// Fichiers de test à créer
const TEST_FILES = {
  'test-utils.ts': `
import * as fs from 'fs';
import * as path from 'path';
import { SomeClass } from './test-class';
import { helperFunction } from '../lib/helpers';
import React from 'react';

export function testFunction() {
  return 'test';
}
`,
  'test-class.ts': `
import { testFunction } from './test-utils';
import axios from 'axios';

export class SomeClass {
  constructor() {
    testFunction();
  }
}
`,
  'lib/helpers.ts': `
import * as crypto from 'crypto';

export function helperFunction() {
  return crypto.randomBytes(16).toString('hex');
}
`
};

async function createTestFiles(testDir: string): Promise<void> {
  // Créer le répertoire de test
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Créer le sous-répertoire lib
  const libDir = path.join(testDir, 'lib');
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }
  
  // Créer les fichiers de test
  for (const [filename, content] of Object.entries(TEST_FILES)) {
    const filePath = path.join(testDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

async function cleanupTestFiles(testDir: string): Promise<void> {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

async function runTests(): Promise<void> {
  const testDir = path.join(process.cwd(), 'test-import-analyzer-temp');
  
  try {
    console.log("🧪 Création des fichiers de test...");
    await createTestFiles(testDir);
    
    console.log("🔍 Test 1: Analyse de fichiers spécifiques");
    await testSpecificFiles(testDir);
    
    console.log("🔍 Test 2: Analyse de projet complet");
    await testProjectAnalysis(testDir);
    
    console.log("🔍 Test 3: Détection automatique des modules locaux");
    await testLocalModuleDetection(testDir);
    
    console.log("🔍 Test 4: Génération de rapports");
    await testReportGeneration(testDir);
    
    console.log("🔍 Test 5: Gestion d'erreurs");
    await testErrorHandling(testDir);
    
    console.log("✅ Tous les tests sont passés avec succès!");
    
  } catch (error) {
    console.error("❌ Test échoué:", error);
    throw error;
  } finally {
    console.log("🧹 Nettoyage des fichiers de test...");
    await cleanupTestFiles(testDir);
  }
}

async function testSpecificFiles(testDir: string): Promise<void> {
  const analyzer = new TypeScriptImportAnalyzer(testDir);
  const testFile = path.join(testDir, 'test-utils.ts');
  
  const report = await analyzer.analyzeFiles([testFile], 2);
  
  // Vérifications
  if (report.statistics.filesAnalyzed === 0) {
    throw new Error("Aucun fichier analysé");
  }
  
  const fileAnalysis = report.filesAnalysis[testFile];
  if (!fileAnalysis) {
    throw new Error("Analyse du fichier test-utils.ts manquante");
  }
  
  // Vérifier les types d'imports
  const hasStandardImports = fileAnalysis.standardImports.some(imp => 
    imp === 'fs' || imp === 'path'
  );
  if (!hasStandardImports) {
    throw new Error("Imports standard non détectés");
  }
  
  const hasLocalImports = fileAnalysis.localImports.some(imp => 
    imp === './test-class' || imp === '../lib/helpers'
  );
  if (!hasLocalImports) {
    throw new Error("Imports locaux non détectés");
  }
  
  const hasExternalImports = fileAnalysis.externalImports.some(imp => 
    imp === 'react'
  );
  if (!hasExternalImports) {
    throw new Error("Imports externes non détectés");
  }
  
  console.log("   ✅ Analyse de fichiers spécifiques réussie");
}

async function testProjectAnalysis(testDir: string): Promise<void> {
  const report = await analyzeProject(testDir, ['**/*.ts'], 3);
  
  // Vérifications
  if (report.statistics.filesAnalyzed < 3) {
    throw new Error(`Seulement ${report.statistics.filesAnalyzed} fichiers analysés, attendu au moins 3`);
  }
  
  if (report.statistics.totalImports === 0) {
    throw new Error("Aucun import détecté");
  }
  
  console.log("   ✅ Analyse de projet complet réussie");
}

async function testLocalModuleDetection(testDir: string): Promise<void> {
  const analyzer = new TypeScriptImportAnalyzer(testDir);
  
  // Analyser un fichier pour déclencher la détection
  const testFile = path.join(testDir, 'test-utils.ts');
  await analyzer.analyzeFiles([testFile]);
  
  const detectedModules = analyzer.getDetectedLocalModules();
  
  // Vérifier que les modules locaux sont détectés
  const hasLocalModules = Object.values(detectedModules).some(isLocal => isLocal);
  if (!hasLocalModules) {
    throw new Error("Aucun module local détecté automatiquement");
  }
  
  console.log("   ✅ Détection automatique des modules locaux réussie");
}

async function testReportGeneration(testDir: string): Promise<void> {
  const analyzer = new TypeScriptImportAnalyzer(testDir);
  const testFile = path.join(testDir, 'test-utils.ts');
  
  const report = await analyzer.analyzeFiles([testFile]);
  
  // Test génération JSON
  const jsonPath = path.join(testDir, 'test-report.json');
  analyzer.saveReport(report, jsonPath);
  
  if (!fs.existsSync(jsonPath)) {
    throw new Error("Rapport JSON non généré");
  }
  
  const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  if (!jsonContent.statistics || !jsonContent.filesAnalysis) {
    throw new Error("Structure du rapport JSON invalide");
  }
  
  // Test génération Markdown
  const markdownContent = analyzer.generateMarkdownReport(report);
  if (!markdownContent.includes('# 📊 Rapport d\'Analyse d\'Imports TypeScript')) {
    throw new Error("Contenu du rapport Markdown invalide");
  }
  
  console.log("   ✅ Génération de rapports réussie");
}

async function testErrorHandling(testDir: string): Promise<void> {
  const analyzer = new TypeScriptImportAnalyzer(testDir);
  
  // Test avec un fichier inexistant
  const nonExistentFile = path.join(testDir, 'non-existent.ts');
  const report = await analyzer.analyzeFiles([nonExistentFile]);
  
  // Le rapport doit être généré même avec des erreurs
  if (!report) {
    throw new Error("Rapport non généré en cas d'erreur");
  }
  
  // Test avec un fichier malformé
  const malformedFile = path.join(testDir, 'malformed.ts');
  fs.writeFileSync(malformedFile, 'import { invalid syntax } from "test";', 'utf-8');
  
  const report2 = await analyzer.analyzeFiles([malformedFile]);
  
  // Le rapport doit contenir des erreurs
  const fileAnalysis = report2.filesAnalysis[malformedFile];
  if (!fileAnalysis || fileAnalysis.errors.length === 0) {
    throw new Error("Erreurs de syntaxe non détectées");
  }
  
  // Nettoyer le fichier malformé
  fs.unlinkSync(malformedFile);
  
  console.log("   ✅ Gestion d'erreurs réussie");
}

// Fonction principale
async function main(): Promise<void> {
  console.log("🚀 Début des tests de l'analyseur d'imports TypeScript");
  console.log("   Basé sur les patterns validés de l'ancien projet Python");
  console.log();
  
  try {
    await runTests();
    console.log();
    console.log("🎉 Tous les tests sont passés avec succès!");
    console.log("   L'analyseur d'imports TypeScript est prêt pour le MVP CodeInsight");
  } catch (error) {
    console.error();
    console.error("❌ Tests échoués:", error);
    process.exit(1);
  }
}

// Exécuter les tests si appelé directement
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale lors des tests:', error);
    process.exit(1);
  });
}

export { runTests as testImportAnalyzer };