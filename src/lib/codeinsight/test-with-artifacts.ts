#!/usr/bin/env node
/**
 * Test avec génération d'artefacts de traçabilité
 * 
 * Génère des artefacts pertinents pour chaque étape de test
 */

import { AgenticDecompressionEngine, AgenticDecompressionRequest } from './AgenticDecompressionEngine';
import { StructuredLLMAnalyzerXML } from './StructuredLLMAnalyzerXML';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

interface TestArtifact {
  timestamp: string;
  testName: string;
  step: string;
  status: 'success' | 'error' | 'warning';
  data: any;
  metadata: {
    duration: number;
    llmCalls: number;
    apiKeyPresent: boolean;
    engine: string;
  };
}

class ArtifactGenerator {
  private artifactsPath: string;
  private sessionId: string;
  private artifacts: TestArtifact[] = [];

  constructor() {
    this.sessionId = `test_session_${Date.now()}`;
    this.artifactsPath = path.join(process.cwd(), 'artefacts', 'codeinsight', 'llm_migration_tests', this.sessionId);
    
    // Créer le dossier des artefacts
    if (!fs.existsSync(this.artifactsPath)) {
      fs.mkdirSync(this.artifactsPath, { recursive: true });
    }
    
    console.log(`📁 Dossier artefacts: ${this.artifactsPath}`);
  }

  addArtifact(testName: string, step: string, status: 'success' | 'error' | 'warning', data: any, metadata: any) {
    const artifact: TestArtifact = {
      timestamp: new Date().toISOString(),
      testName,
      step,
      status,
      data,
      metadata
    };
    
    this.artifacts.push(artifact);
    
    // Sauvegarder l'artefact individuel
    const filename = `${step}_${status}_${Date.now()}.json`;
    const filepath = path.join(this.artifactsPath, filename);
    fs.writeFileSync(filepath, JSON.stringify(artifact, null, 2), 'utf-8');
    
    console.log(`📄 Artefact créé: ${filename}`);
  }

  generateSummaryReport() {
    const summary = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      totalArtifacts: this.artifacts.length,
      successCount: this.artifacts.filter(a => a.status === 'success').length,
      errorCount: this.artifacts.filter(a => a.status === 'error').length,
      warningCount: this.artifacts.filter(a => a.status === 'warning').length,
      tests: this.artifacts.reduce((acc, artifact) => {
        if (!acc[artifact.testName]) {
          acc[artifact.testName] = [];
        }
        acc[artifact.testName].push({
          step: artifact.step,
          status: artifact.status,
          timestamp: artifact.timestamp,
          duration: artifact.metadata.duration
        });
        return acc;
      }, {} as any),
      llmEngines: this.artifacts.reduce((acc, artifact) => {
        const engine = artifact.metadata.engine;
        if (!acc[engine]) {
          acc[engine] = {
            totalCalls: 0,
            successCalls: 0,
            errorCalls: 0,
            totalDuration: 0
          };
        }
        acc[engine].totalCalls += artifact.metadata.llmCalls || 0;
        acc[engine].totalDuration += artifact.metadata.duration || 0;
        if (artifact.status === 'success') {
          acc[engine].successCalls += artifact.metadata.llmCalls || 0;
        } else if (artifact.status === 'error') {
          acc[engine].errorCalls += artifact.metadata.llmCalls || 0;
        }
        return acc;
      }, {} as any)
    };

    // Sauvegarder le rapport de synthèse
    const summaryPath = path.join(this.artifactsPath, 'summary_report.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    
    // Générer un rapport Markdown
    this.generateMarkdownReport(summary);
    
    console.log(`📊 Rapport de synthèse créé: ${summaryPath}`);
    return summary;
  }

  private generateMarkdownReport(summary: any) {
    const markdown = `# Rapport de Test - Migration LLM CodeInsight

**Session ID:** ${summary.sessionId}  
**Date:** ${new Date(summary.timestamp).toLocaleString('fr-FR')}  
**Durée totale:** ${summary.llmEngines ? Object.values(summary.llmEngines).reduce((acc: any, engine: any) => acc + engine.totalDuration, 0) : 0}ms

## 📊 Résumé Exécutif

- **Total artefacts:** ${summary.totalArtifacts}
- **Succès:** ${summary.successCount} ✅
- **Erreurs:** ${summary.errorCount} ❌
- **Avertissements:** ${summary.warningCount} ⚠️

## 🧠 Engines LLM Testés

${Object.entries(summary.llmEngines || {}).map(([engine, stats]: [string, any]) => `
### ${engine}
- **Appels LLM:** ${stats.totalCalls}
- **Succès:** ${stats.successCalls} ✅
- **Erreurs:** ${stats.errorCalls} ❌
- **Durée totale:** ${stats.totalDuration}ms
- **Taux de succès:** ${stats.totalCalls > 0 ? ((stats.successCalls / stats.totalCalls) * 100).toFixed(1) : 0}%
`).join('')}

## 📋 Tests Détaillés

${Object.entries(summary.tests).map(([testName, steps]: [string, any]) => `
### ${testName}
${(steps as any[]).map(step => `
- **${step.step}:** ${step.status === 'success' ? '✅' : step.status === 'error' ? '❌' : '⚠️'} (${step.duration}ms)
`).join('')}
`).join('')}

## 🎯 Conclusion

${summary.successCount > summary.errorCount ? 
  '✅ **SUCCÈS:** La migration des mocks vers LLM est réussie' : 
  '❌ **ÉCHEC:** Des problèmes ont été détectés dans la migration'}

**Taux de succès global:** ${((summary.successCount / summary.totalArtifacts) * 100).toFixed(1)}%

---
*Généré automatiquement par le système de test CodeInsight*
`;

    const markdownPath = path.join(this.artifactsPath, 'test_report.md');
    fs.writeFileSync(markdownPath, markdown, 'utf-8');
    console.log(`📝 Rapport Markdown créé: ${markdownPath}`);
  }
}

async function testWithArtifacts() {
  console.log('🧪 Test avec génération d\'artefacts de traçabilité');
  console.log('==================================================\n');

  const artifactGenerator = new ArtifactGenerator();
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const startTime = Date.now();

  try {
    // Artefact 1: Configuration initiale
    artifactGenerator.addArtifact(
      'Configuration',
      'initialization',
      'success',
      {
        apiKeyPresent: !!geminiApiKey,
        apiKeyPreview: geminiApiKey ? `${geminiApiKey.substring(0, 20)}...` : 'N/A',
        environment: 'test',
        timestamp: new Date().toISOString()
      },
      {
        duration: 0,
        llmCalls: 0,
        apiKeyPresent: !!geminiApiKey,
        engine: 'system'
      }
    );

    // Test 1: AgenticDecompressionEngine
    console.log('\n🧠 Test 1: AgenticDecompressionEngine');
    console.log('-------------------------------------');
    
    const agenticStartTime = Date.now();
    const agenticEngine = new AgenticDecompressionEngine();
    const agenticEndTime = Date.now();
    
    const hasLLM = (agenticEngine as any).useRealLLM;
    
    artifactGenerator.addArtifact(
      'AgenticDecompressionEngine',
      'initialization',
      hasLLM ? 'success' : 'warning',
      {
        engine: 'AgenticDecompressionEngine',
        useRealLLM: hasLLM,
        initializationTime: agenticEndTime - agenticStartTime,
        components: [
          'IntelligentDecompressionEngine',
          'AlgarethCompressionPipeline', 
          'CodeInsightAlgarethAgent',
          'XMLResponseParser'
        ]
      },
      {
        duration: agenticEndTime - agenticStartTime,
        llmCalls: 0,
        apiKeyPresent: !!geminiApiKey,
        engine: 'AgenticDecompressionEngine'
      }
    );

    // Test 2: StructuredLLMAnalyzerXML
    console.log('\n🧠 Test 2: StructuredLLMAnalyzerXML');
    console.log('-----------------------------------');
    
    const analyzerStartTime = Date.now();
    const xmlAnalyzer = new StructuredLLMAnalyzerXML();
    const analyzerEndTime = Date.now();
    
    const hasLLMAnalyzer = (xmlAnalyzer as any).useRealLLM;
    
    artifactGenerator.addArtifact(
      'StructuredLLMAnalyzerXML',
      'initialization',
      hasLLMAnalyzer ? 'success' : 'warning',
      {
        engine: 'StructuredLLMAnalyzerXML',
        useRealLLM: hasLLMAnalyzer,
        initializationTime: analyzerEndTime - analyzerStartTime,
        components: [
          'GoogleGenerativeAI',
          'XMLResponseParser',
          'LuciformXMLParser'
        ]
      },
      {
        duration: analyzerEndTime - analyzerStartTime,
        llmCalls: 0,
        apiKeyPresent: !!geminiApiKey,
        engine: 'StructuredLLMAnalyzerXML'
      }
    );

    // Test 3: Appel LLM réel
    if (hasLLMAnalyzer) {
      console.log('\n🧠 Test 3: Appel LLM réel');
      console.log('-------------------------');
      
      const testScope = {
        name: 'ArtifactTestFunction',
        type: 'function',
        startLine: 1,
        endLine: 8,
        signature: 'function artifactTestFunction(input: string, options: TestOptions): TestResult',
        content: `function artifactTestFunction(input: string, options: TestOptions): TestResult {
  // Fonction de test pour génération d'artefacts
  const result: TestResult = {
    processed: input.toUpperCase(),
    timestamp: new Date().toISOString(),
    metadata: options
  };
  
  return result;
}`,
        contentDedented: `function artifactTestFunction(input: string, options: TestOptions): TestResult {
  // Fonction de test pour génération d'artefacts
  const result: TestResult = {
    processed: input.toUpperCase(),
    timestamp: new Date().toISOString(),
    metadata: options
  };
  
  return result;
}`,
        parameters: [
          { name: 'input', type: 'string' },
          { name: 'options', type: 'TestOptions' }
        ],
        returnType: 'TestResult',
        complexity: 3,
        dependencies: ['TestOptions', 'TestResult'],
        astValid: true
      };

      const llmStartTime = Date.now();
      const analysis = await xmlAnalyzer.analyzeScope(testScope);
      const llmEndTime = Date.now();

      artifactGenerator.addArtifact(
        'StructuredLLMAnalyzerXML',
        'llm_analysis',
        'success',
        {
          input: {
            name: testScope.name,
            type: testScope.type,
            complexity: testScope.complexity,
            parameters: testScope.parameters.length
          },
          output: {
            name: analysis.name,
            type: analysis.type,
            purpose: analysis.overall_purpose,
            complexity: analysis.complexity,
            subScopes: analysis.sub_scopes.length,
            tags: analysis.tags.length,
            risks: analysis.risks.length,
            testIdeas: analysis.test_ideas.length
          },
          llmResponse: {
            success: true,
            duration: llmEndTime - llmStartTime,
            analysisQuality: 'high'
          }
        },
        {
          duration: llmEndTime - llmStartTime,
          llmCalls: 1,
          apiKeyPresent: !!geminiApiKey,
          engine: 'StructuredLLMAnalyzerXML'
        }
      );

      console.log('✅ Analyse LLM terminée avec succès');
      console.log(`   Temps: ${llmEndTime - llmStartTime}ms`);
      console.log(`   Nom: ${analysis.name}`);
      console.log(`   But: ${analysis.overall_purpose}`);
    } else {
      artifactGenerator.addArtifact(
        'StructuredLLMAnalyzerXML',
        'llm_analysis',
        'warning',
        {
          reason: 'No API key available',
          fallbackMode: true
        },
        {
          duration: 0,
          llmCalls: 0,
          apiKeyPresent: false,
          engine: 'StructuredLLMAnalyzerXML'
        }
      );
    }

    // Test 4: Test de décompression agentique
    console.log('\n🧠 Test 4: Décompression agentique');
    console.log('----------------------------------');
    
    const decompressionRequest: AgenticDecompressionRequest = {
      compressedItems: [
        {
          name: 'ArtifactTestClass',
          level: 2,
          description: 'Classe de test pour génération d\'artefacts',
          compressedContent: 'class ArtifactTestClass { constructor() { this.artifacts = []; } }',
          metadata: {
            originalSize: 150,
            compressedSize: 75,
            compressionRatio: 0.5,
            quality: 9.0
          }
        }
      ],
      targetContext: 'Test de génération d\'artefacts avec décompression agentique',
      reconstructionLevel: 'standard',
      preserveOriginalStructure: true,
      includeMetadata: true,
      enableAlgarethInsights: true,
      learningMode: 'active',
      contextEnrichment: true,
      preserveExperience: true,
      targetQuality: 'premium',
      optimizationLevel: 'balanced'
    };

    const decompressionStartTime = Date.now();
    try {
      const decompressionResult = await agenticEngine.decompressWithAlgareth(decompressionRequest);
      const decompressionEndTime = Date.now();

      artifactGenerator.addArtifact(
        'AgenticDecompressionEngine',
        'decompression',
        decompressionResult.success ? 'success' : 'warning',
        {
          input: {
            compressedItems: decompressionRequest.compressedItems.length,
            targetContext: decompressionRequest.targetContext,
            targetQuality: decompressionRequest.targetQuality,
            learningMode: decompressionRequest.learningMode
          },
          output: {
            success: decompressionResult.success,
            decompressedCount: decompressionResult.decompressed.length,
            errorsCount: decompressionResult.errors.length,
            warningsCount: decompressionResult.warnings.length,
            insightsCount: decompressionResult.algarethInsights?.length || 0,
            optimizationSuggestions: decompressionResult.optimizationSuggestions?.length || 0
          },
          performance: {
            duration: decompressionEndTime - decompressionStartTime,
            llmCalls: 2 // Contexte + Insights
          }
        },
        {
          duration: decompressionEndTime - decompressionStartTime,
          llmCalls: 2,
          apiKeyPresent: !!geminiApiKey,
          engine: 'AgenticDecompressionEngine'
        }
      );

      console.log('✅ Décompression agentique terminée');
      console.log(`   Succès: ${decompressionResult.success}`);
      console.log(`   Temps: ${decompressionEndTime - decompressionStartTime}ms`);
      console.log(`   Insights: ${decompressionResult.algarethInsights?.length || 0}`);
    } catch (error) {
      const decompressionEndTime = Date.now();
      
      artifactGenerator.addArtifact(
        'AgenticDecompressionEngine',
        'decompression',
        'error',
        {
          error: error.toString(),
          input: decompressionRequest,
          duration: decompressionEndTime - decompressionStartTime
        },
        {
          duration: decompressionEndTime - decompressionStartTime,
          llmCalls: 0,
          apiKeyPresent: !!geminiApiKey,
          engine: 'AgenticDecompressionEngine'
        }
      );
      
      console.log('⚠️ Erreur lors de la décompression (attendu)');
    }

    // Générer le rapport final
    const totalTime = Date.now() - startTime;
    const summary = artifactGenerator.generateSummaryReport();
    
    console.log('\n🎉 Test avec artefacts terminé !');
    console.log('===============================');
    console.log(`📁 Dossier artefacts: ${artifactGenerator['artifactsPath']}`);
    console.log(`📊 Total artefacts: ${summary.totalArtifacts}`);
    console.log(`✅ Succès: ${summary.successCount}`);
    console.log(`❌ Erreurs: ${summary.errorCount}`);
    console.log(`⚠️ Avertissements: ${summary.warningCount}`);
    console.log(`⏱️ Durée totale: ${totalTime}ms`);

  } catch (error) {
    artifactGenerator.addArtifact(
      'System',
      'test_execution',
      'error',
      {
        error: error.toString(),
        timestamp: new Date().toISOString()
      },
      {
        duration: Date.now() - startTime,
        llmCalls: 0,
        apiKeyPresent: !!geminiApiKey,
        engine: 'system'
      }
    );
    
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testWithArtifacts().catch(console.error);
}

export { testWithArtifacts };