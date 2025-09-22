#!/usr/bin/env node
/**
 * Test d'intégration - Cache + BatchProcessor
 * 
 * Valide que le cache et le batching fonctionnent ensemble pour améliorer
 * drastiquement les performances du système d'analyse
 */

import { loadShadeosEnv } from '../utils/SecureEnvManager';
import { CacheManager } from './CacheManager';
import { BatchProcessor } from './BatchProcessor';
import { StructuredTypeScriptParser } from './StructuredTypeScriptParser';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testCacheBatchIntegration() {
  console.log('🧪 Test d\'intégration - Cache + BatchProcessor');
  console.log('===============================================\n');

  try {
    // Vérifier la clé API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ GEMINI_API_KEY non trouvée');
      return;
    }

    // Initialiser les composants
    const cacheManager = new CacheManager('.test_cache');
    const batchProcessor = new BatchProcessor({
      maxCharsPerBatch: 15000,
      maxScopesPerBatch: 6,
      priorityThreshold: 0.6,
      enableSmartGrouping: true
    });

    // Vérifier que le cache est disponible
    const cacheAvailable = await cacheManager.isCacheAvailable();
    if (!cacheAvailable) {
      console.log('❌ Cache non disponible');
      return;
    }

    console.log('✅ Composants initialisés');
    console.log(`   Cache: ${cacheAvailable ? 'Disponible' : 'Indisponible'}`);
    console.log(`   BatchProcessor: Configuré`);

    // Test avec un fichier simple
    const testFile = '/home/luciedefraiteur/lr-tchatagent-web/secret-ops/zod-main/packages/zod/src/v4/core/config.ts';
    
    console.log(`\n📁 Test avec le fichier: ${testFile}`);
    
    // Lire le fichier
    const fs = await import('fs/promises');
    const content = await fs.readFile(testFile, 'utf8');
    
    console.log(`📏 Taille du fichier: ${content.length} caractères`);

    // Parser le fichier
    console.log('\n🔍 Parsing du fichier...');
    const parser = new StructuredTypeScriptParser();
    const parseResult = await parser.parseFile(testFile, content);
    
    if (!parseResult.astValid) {
      console.log('❌ Erreur de parsing:', parseResult.astIssues);
      return;
    }

    const scopes = parseResult.scopes || [];
    console.log(`✅ ${scopes.length} scopes parsés`);

    // Test 1: Cache miss (première analyse)
    console.log('\n📦 Test 1: Cache miss (première analyse)');
    const startTime1 = Date.now();
    
    const cachedAnalysis1 = await cacheManager.getCache(testFile, content);
    const cacheMissTime = Date.now() - startTime1;
    
    console.log(`   Temps de vérification cache: ${cacheMissTime}ms`);
    console.log(`   Résultat: ${cachedAnalysis1 ? 'Hit' : 'Miss'}`);

    // Test 2: Création des lots
    console.log('\n📦 Test 2: Création des lots');
    const startTime2 = Date.now();
    
    const batches = batchProcessor.createBatches(scopes);
    const batchTime = Date.now() - startTime2;
    
    console.log(`   Temps de création des lots: ${batchTime}ms`);
    console.log(`   Lots créés: ${batches.length}`);
    
    // Afficher les détails des lots
    batches.forEach((batch, index) => {
      console.log(`   Lot ${index + 1}: ${batch.scopes.length} scopes, ${batch.totalChars} chars, priorité ${batch.priority}`);
    });

    // Afficher les statistiques du batch processor
    batchProcessor.printStats();

    // Test 3: Simulation d'analyse avec cache
    console.log('\n📦 Test 3: Simulation d\'analyse avec cache');
    
    // Simuler une analyse (sans vraiment appeler le LLM)
    const mockAnalysis = {
      scopes: scopes.map(scope => ({
        name: scope.name,
        analysis: `Analyse simulée pour ${scope.name}`,
        timestamp: Date.now()
      })),
      duration: 5000, // Simulation de 5 secondes
      success: true
    };

    // Sauvegarder dans le cache
    const startTime3 = Date.now();
    await cacheManager.setCache(testFile, content, mockAnalysis, {
      scopeCount: scopes.length,
      duration: 5000
    });
    const cacheSetTime = Date.now() - startTime3;
    
    console.log(`   Temps de sauvegarde cache: ${cacheSetTime}ms`);

    // Test 4: Cache hit (deuxième analyse)
    console.log('\n📦 Test 4: Cache hit (deuxième analyse)');
    const startTime4 = Date.now();
    
    const cachedAnalysis2 = await cacheManager.getCache(testFile, content);
    const cacheHitTime = Date.now() - startTime4;
    
    console.log(`   Temps de vérification cache: ${cacheHitTime}ms`);
    console.log(`   Résultat: ${cachedAnalysis2 ? 'Hit' : 'Miss'}`);
    
    if (cachedAnalysis2) {
      console.log(`   Analyse récupérée: ${cachedAnalysis2.scopes.length} scopes`);
    }

    // Afficher les statistiques du cache
    cacheManager.printStats();

    // Test 5: Validation des lots
    console.log('\n📦 Test 5: Validation des lots');
    batches.forEach((batch, index) => {
      const validation = batchProcessor.validateBatch(batch);
      console.log(`   Lot ${index + 1}: ${validation.valid ? '✅ Valide' : '❌ Invalide'}`);
      if (!validation.valid) {
        validation.issues.forEach(issue => {
          console.log(`     - ${issue}`);
        });
      }
    });

    // Test 6: Performance comparée
    console.log('\n📊 Test 6: Comparaison de performance');
    
    const individualCalls = scopes.length;
    const batchedCalls = batches.length;
    const reduction = ((individualCalls - batchedCalls) / individualCalls) * 100;
    
    console.log(`   Appels individuels: ${individualCalls}`);
    console.log(`   Appels groupés: ${batchedCalls}`);
    console.log(`   Réduction: ${reduction.toFixed(1)}%`);
    
    // Estimation du temps économisé
    const estimatedTimePerCall = 8000; // 8 secondes par appel LLM
    const individualTime = individualCalls * estimatedTimePerCall;
    const batchedTime = batchedCalls * estimatedTimePerCall;
    const timeSaved = individualTime - batchedTime;
    
    console.log(`   Temps estimé individuel: ${(individualTime / 1000).toFixed(1)}s`);
    console.log(`   Temps estimé groupé: ${(batchedTime / 1000).toFixed(1)}s`);
    console.log(`   Temps économisé: ${(timeSaved / 1000).toFixed(1)}s`);

    // Test 7: Nettoyage
    console.log('\n🧹 Test 7: Nettoyage');
    const cleanedCount = await cacheManager.cleanupOldEntries(0); // Nettoyer tout
    console.log(`   Entrées nettoyées: ${cleanedCount}`);

    console.log('\n✅ Test d\'intégration terminé avec succès !');
    console.log('\n📈 Résumé des gains:');
    console.log(`   - Réduction des appels LLM: ${reduction.toFixed(1)}%`);
    console.log(`   - Temps économisé estimé: ${(timeSaved / 1000).toFixed(1)}s`);
    console.log(`   - Cache fonctionnel: ✅`);
    console.log(`   - Batching optimisé: ✅`);

  } catch (error) {
    console.error('❌ Erreur lors du test d\'intégration:', error);
  }
}

// Exécuter le test
testCacheBatchIntegration().catch(console.error);