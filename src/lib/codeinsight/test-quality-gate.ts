#!/usr/bin/env node
/**
 * Test QualityGate - Validation de la qualité du code régénéré
 * 
 * Teste les différentes validations du QualityGate :
 * - Compilation TypeScript
 * - Similarité avec l'original
 * - Ratio de taille
 * - Complexité cyclomatique
 */

import { QualityGate } from './QualityGate';

async function testQualityGate() {
  console.log('🧪 Test QualityGate - Validation de la qualité');
  console.log('===============================================\n');

  const qualityGate = new QualityGate({
    requireCompilation: true,
    requireLinting: false,
    minSimilarity: 0.5,
    maxSizeRatio: 2.0,
    maxComplexity: 8,
    enableTests: false,
    timeoutMs: 30000
  });

  // Test 1: Code valide (devrait passer)
  console.log('📝 Test 1: Code valide');
  const originalCode1 = `
interface User {
  id: number;
  name: string;
  email: string;
}

function getUserById(id: number): User | null {
  return null;
}
  `.trim();

  const regeneratedCode1 = `
interface User {
  id: number;
  name: string;
  email: string;
}

function getUserById(id: number): User | null {
  // Implementation improved
  return null;
}
  `.trim();

  const result1 = await qualityGate.validateCode(originalCode1, regeneratedCode1, 'test1.ts');
  
  console.log(`   Score: ${result1.score}/100`);
  console.log(`   Passé: ${result1.passed ? '✅' : '❌'}`);
  console.log(`   Compilation: ${result1.metrics.compilation ? '✅' : '❌'}`);
  console.log(`   Similarité: ${(result1.metrics.similarity * 100).toFixed(1)}%`);
  console.log(`   Ratio taille: ${result1.metrics.sizeRatio.toFixed(2)}x`);
  console.log(`   Complexité: ${result1.metrics.complexity}`);
  
  if (result1.issues.length > 0) {
    console.log(`   Problèmes: ${result1.issues.join(', ')}`);
  }

  // Test 2: Code avec erreur de compilation (devrait échouer)
  console.log('\n📝 Test 2: Code avec erreur de compilation');
  const originalCode2 = `
function add(a: number, b: number): number {
  return a + b;
}
  `.trim();

  const regeneratedCode2 = `
function add(a: number, b: number): number {
  return a + b + c; // 'c' n'est pas défini
}
  `.trim();

  const result2 = await qualityGate.validateCode(originalCode2, regeneratedCode2, 'test2.ts');
  
  console.log(`   Score: ${result2.score}/100`);
  console.log(`   Passé: ${result2.passed ? '✅' : '❌'}`);
  console.log(`   Compilation: ${result2.metrics.compilation ? '✅' : '❌'}`);
  console.log(`   Erreurs: ${result2.metrics.compilationErrors.length}`);
  
  if (result2.metrics.compilationErrors.length > 0) {
    console.log(`   Détails: ${result2.metrics.compilationErrors[0]}`);
  }

  // Test 3: Code avec similarité trop faible (devrait échouer)
  console.log('\n📝 Test 3: Code avec similarité trop faible');
  const originalCode3 = `
function calculate(x: number): number {
  return x * 2;
}
  `.trim();

  const regeneratedCode3 = `
function calculate(y: number): number {
  const result = y * 2;
  console.log('Calculating...');
  return result;
}
  `.trim();

  const result3 = await qualityGate.validateCode(originalCode3, regeneratedCode3, 'test3.ts');
  
  console.log(`   Score: ${result3.score}/100`);
  console.log(`   Passé: ${result3.passed ? '✅' : '❌'}`);
  console.log(`   Similarité: ${(result3.metrics.similarity * 100).toFixed(1)}%`);
  console.log(`   Ratio taille: ${result3.metrics.sizeRatio.toFixed(2)}x`);
  
  if (result3.issues.length > 0) {
    console.log(`   Problèmes: ${result3.issues.join(', ')}`);
  }

  // Test 4: Code avec complexité trop élevée (devrait échouer)
  console.log('\n📝 Test 4: Code avec complexité trop élevée');
  const originalCode4 = `
function simple(): void {
  console.log('Hello');
}
  `.trim();

  const regeneratedCode4 = `
function complex(): void {
  if (true) {
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        while (true) {
          if (Math.random() > 0.5) {
            break;
          }
        }
      }
    }
  }
}
  `.trim();

  const result4 = await qualityGate.validateCode(originalCode4, regeneratedCode4, 'test4.ts');
  
  console.log(`   Score: ${result4.score}/100`);
  console.log(`   Passé: ${result4.passed ? '✅' : '❌'}`);
  console.log(`   Complexité: ${result4.metrics.complexity}`);
  
  if (result4.issues.length > 0) {
    console.log(`   Problèmes: ${result4.issues.join(', ')}`);
  }

  // Test 5: Code parfaitement identique (devrait passer avec un score élevé)
  console.log('\n📝 Test 5: Code parfaitement identique');
  const perfectCode = `
interface Config {
  apiUrl: string;
  timeout: number;
}

function createConfig(): Config {
  return {
    apiUrl: 'https://api.example.com',
    timeout: 5000
  };
}
  `.trim();

  const result5 = await qualityGate.validateCode(perfectCode, perfectCode, 'test5.ts');
  
  console.log(`   Score: ${result5.score}/100`);
  console.log(`   Passé: ${result5.passed ? '✅' : '❌'}`);
  console.log(`   Similarité: ${(result5.metrics.similarity * 100).toFixed(1)}%`);
  console.log(`   Ratio taille: ${result5.metrics.sizeRatio.toFixed(2)}x`);

  // Résumé des tests
  console.log('\n📊 Résumé des tests:');
  const results = [result1, result2, result3, result4, result5];
  const passed = results.filter(r => r.passed).length;
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  
  console.log(`   Tests passés: ${passed}/${results.length}`);
  console.log(`   Score moyen: ${averageScore.toFixed(1)}/100`);
  console.log(`   Compilation OK: ${results.filter(r => r.metrics.compilation).length}/${results.length}`);
  
  // Nettoyage
  await qualityGate.cleanup();
  
  console.log('\n✅ Tests QualityGate terminés !');
}

// Exécuter les tests
testQualityGate().catch(console.error);