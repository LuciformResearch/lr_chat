#!/usr/bin/env node
/**
 * Test du parser TypeScript
 * 
 * Vérifie si le StructuredTypeScriptParser fonctionne
 */

import { StructuredTypeScriptParser } from './StructuredTypeScriptParser';

async function testTypeScriptParser() {
  console.log('🧪 Test du StructuredTypeScriptParser');
  console.log('====================================\n');

  try {
    const parser = new StructuredTypeScriptParser();
    console.log('✅ Parser initialisé');

    // Code de test simple
    const testCode = `// Test file
import { Component } from '@angular/core';

export class TestClass {
  private value: string = 'test';
  
  constructor(public name: string) {
    this.value = name;
  }
  
  public getValue(): string {
    return this.value;
  }
  
  private setValue(newValue: string): void {
    this.value = newValue;
  }
}

export function testFunction(input: string): string {
  return input.toUpperCase();
}

export interface TestInterface {
  id: number;
  name: string;
  optional?: boolean;
}`;

    console.log('📝 Code de test:');
    console.log(testCode.substring(0, 200) + '...\n');

    console.log('🔍 Parsing du fichier...');
    const startTime = Date.now();
    const analysis = await parser.parseFile('test.ts', testCode);
    const endTime = Date.now();

    console.log('✅ Parsing terminé !');
    console.log(`⏱️ Temps: ${endTime - startTime}ms`);
    console.log('\n📊 Résultats:');
    console.log(`   Fichier: ${analysis.filePath}`);
    console.log(`   Lignes totales: ${analysis.totalLines}`);
    console.log(`   Scopes trouvés: ${analysis.totalScopes}`);
    console.log(`   Imports: ${analysis.imports.length}`);
    console.log(`   Exports: ${analysis.exports.length}`);
    console.log(`   Dépendances: ${analysis.dependencies.length}`);
    console.log(`   AST valide: ${analysis.astValid}`);

    if (analysis.scopes.length > 0) {
      console.log('\n🏗️ Scopes détaillés:');
      analysis.scopes.forEach((scope, index) => {
        console.log(`   ${index + 1}. ${scope.type} ${scope.name}`);
        console.log(`      Lignes: ${scope.startLine}-${scope.endLine}`);
        console.log(`      Complexité: ${scope.complexity}`);
        console.log(`      Paramètres: ${scope.parameters.length}`);
        console.log(`      Dépendances: ${scope.dependencies.length}`);
        if (scope.parameters.length > 0) {
          console.log(`      Paramètres: ${scope.parameters.map(p => `${p.name}: ${p.type || 'any'}`).join(', ')}`);
        }
        if (scope.dependencies.length > 0) {
          console.log(`      Dépendances: ${scope.dependencies.join(', ')}`);
        }
      });
    } else {
      console.log('\n❌ Aucun scope trouvé');
    }

    if (analysis.imports.length > 0) {
      console.log('\n📥 Imports:');
      analysis.imports.forEach(imp => {
        console.log(`   - ${imp}`);
      });
    }

    if (analysis.exports.length > 0) {
      console.log('\n📤 Exports:');
      analysis.exports.forEach(exp => {
        console.log(`   - ${exp}`);
      });
    }

    // Test de compatibilité avec StructuredLLMAnalyzerXML
    console.log('\n🧠 Test de compatibilité avec StructuredLLMAnalyzerXML...');
    if (analysis.scopes.length > 0) {
      const firstScope = analysis.scopes[0];
      console.log(`   Premier scope: ${firstScope.type} ${firstScope.name}`);
      console.log(`   Signature: ${firstScope.signature}`);
      console.log(`   Contenu: ${firstScope.content.substring(0, 100)}...`);
      console.log(`   Compatible: ${!!firstScope.name && !!firstScope.type && !!firstScope.content}`);
    }

    return analysis;

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
    return null;
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testTypeScriptParser().catch(console.error);
}

export { testTypeScriptParser };