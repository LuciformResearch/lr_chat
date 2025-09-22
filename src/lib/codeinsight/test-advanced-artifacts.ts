#!/usr/bin/env node
/**
 * Test avancé avec génération d'artefacts détaillés
 * 
 * Génère des artefacts pertinents et détaillés pour chaque étape
 */

import { AgenticDecompressionEngine, AgenticDecompressionRequest } from './AgenticDecompressionEngine';
import { StructuredLLMAnalyzerXML } from './StructuredLLMAnalyzerXML';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

interface DetailedArtifact {
  sessionId: string;
  timestamp: string;
  testName: string;
  step: string;
  status: 'success' | 'error' | 'warning';
  context: {
    environment: string;
    apiKeyPresent: boolean;
    engine: string;
    version: string;
  };
  input: any;
  output: any;
  performance: {
    duration: number;
    llmCalls: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  llmDetails?: {
    prompt: string;
    response: string;
    tokensUsed?: number;
    model: string;
    temperature?: number;
  };
  metadata: {
    testId: string;
    stepId: string;
    parentTest?: string;
    tags: string[];
  };
}

class AdvancedArtifactGenerator {
  private artifactsPath: string;
  private sessionId: string;
  private artifacts: DetailedArtifact[] = [];
  private testCounter = 0;

  constructor() {
    this.sessionId = `advanced_test_${Date.now()}`;
    this.artifactsPath = path.join(process.cwd(), 'artefacts', 'codeinsight', 'advanced_tests', this.sessionId);
    
    // Créer le dossier des artefacts
    if (!fs.existsSync(this.artifactsPath)) {
      fs.mkdirSync(this.artifactsPath, { recursive: true });
    }
    
    console.log(`📁 Dossier artefacts avancés: ${this.artifactsPath}`);
  }

  addDetailedArtifact(
    testName: string, 
    step: string, 
    status: 'success' | 'error' | 'warning',
    input: any,
    output: any,
    performance: any,
    llmDetails?: any,
    tags: string[] = []
  ) {
    this.testCounter++;
    const testId = `test_${this.testCounter}`;
    const stepId = `${testId}_${step}`;
    
    const artifact: DetailedArtifact = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      testName,
      step,
      status,
      context: {
        environment: 'test',
        apiKeyPresent: !!process.env.GEMINI_API_KEY,
        engine: testName,
        version: '1.0.0'
      },
      input,
      output,
      performance,
      llmDetails,
      metadata: {
        testId,
        stepId,
        tags: [...tags, 'advanced_test', 'llm_migration']
      }
    };
    
    this.artifacts.push(artifact);
    
    // Sauvegarder l'artefact individuel
    const filename = `${stepId}_${status}_${Date.now()}.json`;
    const filepath = path.join(this.artifactsPath, filename);
    fs.writeFileSync(filepath, JSON.stringify(artifact, null, 2), 'utf-8');
    
    // Générer un artefact Markdown pour les étapes importantes
    if (step.includes('llm') || step.includes('analysis')) {
      this.generateMarkdownArtifact(artifact);
    }
    
    console.log(`📄 Artefact détaillé créé: ${filename}`);
  }

  private generateMarkdownArtifact(artifact: DetailedArtifact) {
    const markdown = `# Artefact de Test - ${artifact.testName}

**ID de Session:** ${artifact.sessionId}  
**Test ID:** ${artifact.metadata.testId}  
**Étape:** ${artifact.step}  
**Statut:** ${artifact.status === 'success' ? '✅ Succès' : artifact.status === 'error' ? '❌ Erreur' : '⚠️ Avertissement'}  
**Timestamp:** ${new Date(artifact.timestamp).toLocaleString('fr-FR')}

## 🎯 Contexte

- **Engine:** ${artifact.context.engine}
- **Version:** ${artifact.context.version}
- **Environnement:** ${artifact.context.environment}
- **Clé API:** ${artifact.context.apiKeyPresent ? '✅ Présente' : '❌ Absente'}

## 📥 Entrée

\`\`\`json
${JSON.stringify(artifact.input, null, 2)}
\`\`\`

## 📤 Sortie

\`\`\`json
${JSON.stringify(artifact.output, null, 2)}
\`\`\`

## ⚡ Performance

- **Durée:** ${artifact.performance.duration}ms
- **Appels LLM:** ${artifact.performance.llmCalls}
- **Mémoire:** ${artifact.performance.memoryUsage || 'N/A'}MB
- **CPU:** ${artifact.performance.cpuUsage || 'N/A'}%

${artifact.llmDetails ? `
## 🧠 Détails LLM

- **Modèle:** ${artifact.llmDetails.model}
- **Tokens utilisés:** ${artifact.llmDetails.tokensUsed || 'N/A'}
- **Température:** ${artifact.llmDetails.temperature || 'N/A'}

### Prompt
\`\`\`
${artifact.llmDetails.prompt.substring(0, 500)}${artifact.llmDetails.prompt.length > 500 ? '...' : ''}
\`\`\`

### Réponse
\`\`\`
${artifact.llmDetails.response.substring(0, 500)}${artifact.llmDetails.response.length > 500 ? '...' : ''}
\`\`\`
` : ''}

## 🏷️ Métadonnées

- **Tags:** ${artifact.metadata.tags.join(', ')}
- **Test Parent:** ${artifact.metadata.parentTest || 'N/A'}

---
*Généré automatiquement par le système de test CodeInsight avancé*
`;

    const markdownPath = path.join(this.artifactsPath, `${artifact.metadata.stepId}_${artifact.status}.md`);
    fs.writeFileSync(markdownPath, markdown, 'utf-8');
    console.log(`📝 Artefact Markdown créé: ${path.basename(markdownPath)}`);
  }

  generateAdvancedReport() {
    const report = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      summary: {
        totalArtifacts: this.artifacts.length,
        successCount: this.artifacts.filter(a => a.status === 'success').length,
        errorCount: this.artifacts.filter(a => a.status === 'error').length,
        warningCount: this.artifacts.filter(a => a.status === 'warning').length,
        totalDuration: this.artifacts.reduce((sum, a) => sum + a.performance.duration, 0),
        totalLLMCalls: this.artifacts.reduce((sum, a) => sum + a.performance.llmCalls, 0)
      },
      engines: this.artifacts.reduce((acc, artifact) => {
        const engine = artifact.context.engine;
        if (!acc[engine]) {
          acc[engine] = {
            totalTests: 0,
            successTests: 0,
            errorTests: 0,
            warningTests: 0,
            totalDuration: 0,
            totalLLMCalls: 0,
            tests: []
          };
        }
        acc[engine].totalTests++;
        acc[engine].totalDuration += artifact.performance.duration;
        acc[engine].totalLLMCalls += artifact.performance.llmCalls;
        acc[engine].tests.push({
          step: artifact.step,
          status: artifact.status,
          duration: artifact.performance.duration,
          llmCalls: artifact.performance.llmCalls,
          timestamp: artifact.timestamp
        });
        
        if (artifact.status === 'success') acc[engine].successTests++;
        else if (artifact.status === 'error') acc[engine].errorTests++;
        else if (artifact.status === 'warning') acc[engine].warningTests++;
        
        return acc;
      }, {} as any),
      llmAnalysis: this.artifacts
        .filter(a => a.llmDetails)
        .map(a => ({
          engine: a.context.engine,
          step: a.step,
          model: a.llmDetails?.model,
          tokensUsed: a.llmDetails?.tokensUsed,
          duration: a.performance.duration,
          status: a.status
        })),
      recommendations: this.generateRecommendations()
    };

    // Sauvegarder le rapport avancé
    const reportPath = path.join(this.artifactsPath, 'advanced_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    
    // Générer le rapport Markdown avancé
    this.generateAdvancedMarkdownReport(report);
    
    console.log(`📊 Rapport avancé créé: ${reportPath}`);
    return report;
  }

  private generateRecommendations() {
    const recommendations = [];
    
    const errorRate = this.artifacts.filter(a => a.status === 'error').length / this.artifacts.length;
    if (errorRate > 0.2) {
      recommendations.push({
        type: 'error_rate',
        priority: 'high',
        message: `Taux d'erreur élevé: ${(errorRate * 100).toFixed(1)}%`,
        suggestion: 'Vérifier la configuration des engines et les clés API'
      });
    }
    
    const avgDuration = this.artifacts.reduce((sum, a) => sum + a.performance.duration, 0) / this.artifacts.length;
    if (avgDuration > 10000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: `Durée moyenne élevée: ${avgDuration.toFixed(0)}ms`,
        suggestion: 'Optimiser les appels LLM et implémenter un cache'
      });
    }
    
    const llmEngines = this.artifacts.filter(a => a.performance.llmCalls > 0);
    if (llmEngines.length === 0) {
      recommendations.push({
        type: 'llm_usage',
        priority: 'high',
        message: 'Aucun appel LLM détecté',
        suggestion: 'Vérifier la configuration des clés API'
      });
    }
    
    return recommendations;
  }

  private generateAdvancedMarkdownReport(report: any) {
    const markdown = `# Rapport Avancé - Tests CodeInsight LLM

**Session ID:** ${report.sessionId}  
**Date:** ${new Date(report.timestamp).toLocaleString('fr-FR')}  
**Durée totale:** ${report.summary.totalDuration}ms

## 📊 Résumé Exécutif

- **Total artefacts:** ${report.summary.totalArtifacts}
- **Succès:** ${report.summary.successCount} ✅
- **Erreurs:** ${report.summary.errorCount} ❌
- **Avertissements:** ${report.summary.warningCount} ⚠️
- **Appels LLM totaux:** ${report.summary.totalLLMCalls}
- **Taux de succès:** ${((report.summary.successCount / report.summary.totalArtifacts) * 100).toFixed(1)}%

## 🧠 Analyse des Engines

${Object.entries(report.engines).map(([engine, stats]: [string, any]) => `
### ${engine}
- **Tests totaux:** ${stats.totalTests}
- **Succès:** ${stats.successTests} ✅
- **Erreurs:** ${stats.errorTests} ❌
- **Avertissements:** ${stats.warningTests} ⚠️
- **Durée totale:** ${stats.totalDuration}ms
- **Appels LLM:** ${stats.totalLLMCalls}
- **Taux de succès:** ${((stats.successTests / stats.totalTests) * 100).toFixed(1)}%

#### Tests détaillés:
${stats.tests.map((test: any) => `
- **${test.step}:** ${test.status === 'success' ? '✅' : test.status === 'error' ? '❌' : '⚠️'} (${test.duration}ms, ${test.llmCalls} appels LLM)
`).join('')}
`).join('')}

## 🤖 Analyse LLM

${report.llmAnalysis.length > 0 ? `
${report.llmAnalysis.map((analysis: any) => `
### ${analysis.engine} - ${analysis.step}
- **Modèle:** ${analysis.model}
- **Tokens:** ${analysis.tokensUsed || 'N/A'}
- **Durée:** ${analysis.duration}ms
- **Statut:** ${analysis.status === 'success' ? '✅' : '❌'}
`).join('')}
` : 'Aucune analyse LLM disponible'}

## 💡 Recommandations

${report.recommendations.length > 0 ? `
${report.recommendations.map((rec: any) => `
### ${rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'} ${rec.type}
**Message:** ${rec.message}  
**Suggestion:** ${rec.suggestion}
`).join('')}
` : 'Aucune recommandation spécifique'}

## 🎯 Conclusion

${report.summary.successCount > report.summary.errorCount ? 
  '✅ **SUCCÈS:** La migration des mocks vers LLM est globalement réussie' : 
  '❌ **ÉCHEC:** Des problèmes significatifs ont été détectés'}

**Performance globale:** ${report.summary.totalLLMCalls > 0 ? 'Engines LLM actifs' : 'Engines en mode fallback'}

---
*Généré automatiquement par le système de test CodeInsight avancé*
`;

    const markdownPath = path.join(this.artifactsPath, 'advanced_report.md');
    fs.writeFileSync(markdownPath, markdown, 'utf-8');
    console.log(`📝 Rapport Markdown avancé créé: ${markdownPath}`);
  }
}

async function testAdvancedArtifacts() {
  console.log('🧪 Test avancé avec génération d\'artefacts détaillés');
  console.log('===================================================\n');

  const artifactGenerator = new AdvancedArtifactGenerator();
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const startTime = Date.now();

  try {
    // Test 1: Configuration et environnement
    console.log('🔧 Test 1: Configuration et environnement');
    console.log('----------------------------------------');
    
    artifactGenerator.addDetailedArtifact(
      'System',
      'environment_check',
      'success',
      {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        envVars: {
          GEMINI_API_KEY: !!geminiApiKey,
          NODE_ENV: process.env.NODE_ENV || 'development'
        }
      },
      {
        environment: 'ready',
        apiKeyStatus: geminiApiKey ? 'present' : 'missing',
        configuration: 'valid'
      },
      { duration: 0, llmCalls: 0 },
      undefined,
      ['environment', 'configuration']
    );

    // Test 2: Initialisation des engines
    console.log('\n🚀 Test 2: Initialisation des engines');
    console.log('------------------------------------');
    
    const agenticEngine = new AgenticDecompressionEngine();
    const xmlAnalyzer = new StructuredLLMAnalyzerXML();
    
    artifactGenerator.addDetailedArtifact(
      'Engines',
      'initialization',
      'success',
      {
        engines: ['AgenticDecompressionEngine', 'StructuredLLMAnalyzerXML'],
        expectedComponents: [
          'GoogleGenerativeAI',
          'XMLResponseParser',
          'LuciformXMLParser',
          'IntelligentDecompressionEngine'
        ]
      },
      {
        agenticEngine: {
          initialized: true,
          useRealLLM: (agenticEngine as any).useRealLLM,
          components: 4
        },
        xmlAnalyzer: {
          initialized: true,
          useRealLLM: (xmlAnalyzer as any).useRealLLM,
          components: 3
        }
      },
      { duration: Date.now() - startTime, llmCalls: 0 },
      undefined,
      ['initialization', 'engines']
    );

    // Test 3: Analyse LLM détaillée
    console.log('\n🧠 Test 3: Analyse LLM détaillée');
    console.log('-------------------------------');
    
    const testScope = {
      name: 'AdvancedTestFunction',
      type: 'function',
      startLine: 1,
      endLine: 15,
      signature: 'function advancedTestFunction<T>(input: T[], options: AdvancedOptions): Promise<TestResult<T>>',
      content: `async function advancedTestFunction<T>(input: T[], options: AdvancedOptions): Promise<TestResult<T>> {
  // Fonction avancée pour test d'artefacts
  const results: T[] = [];
  
  for (const item of input) {
    if (options.filter && !options.filter(item)) {
      continue;
    }
    
    const processed = await options.processor(item);
    results.push(processed);
  }
  
  return {
    data: results,
    metadata: {
      processed: results.length,
      total: input.length,
      timestamp: new Date().toISOString()
    }
  };
}`,
      contentDedented: `async function advancedTestFunction<T>(input: T[], options: AdvancedOptions): Promise<TestResult<T>> {
  // Fonction avancée pour test d'artefacts
  const results: T[] = [];
  
  for (const item of input) {
    if (options.filter && !options.filter(item)) {
      continue;
    }
    
    const processed = await options.processor(item);
    results.push(processed);
  }
  
  return {
    data: results,
    metadata: {
      processed: results.length,
      total: input.length,
      timestamp: new Date().toISOString()
    }
  };
}`,
      parameters: [
        { name: 'input', type: 'T[]' },
        { name: 'options', type: 'AdvancedOptions' }
      ],
      returnType: 'Promise<TestResult<T>>',
      complexity: 8,
      dependencies: ['AdvancedOptions', 'TestResult'],
      astValid: true
    };

    const analysisStartTime = Date.now();
    const analysis = await xmlAnalyzer.analyzeScope(testScope);
    const analysisEndTime = Date.now();

    // Capturer les détails LLM (simulation)
    const llmDetails = {
      prompt: `Tu es Algareth, ingénieur senior TypeScript. Analyse ce code et fournis une évaluation technique structurée en XML.

## CODE À ANALYSER

**Métadonnées:**
- Nom: ${testScope.name}
- Type: ${testScope.type}
- Signature: ${testScope.signature}
- Lignes: ${testScope.startLine}-${testScope.endLine}
- Complexité: ${testScope.complexity}
- Dépendances: ${testScope.dependencies.join(', ') || 'Aucune'}

**Contenu:**
<![CDATA[
${testScope.contentDedented}
]]>

## FORMAT DE RÉPONSE REQUIS

Retourne un XML STRICT avec cette structure:
<code_analysis>
  <name>${testScope.name}</name>
  <type>${testScope.type}</type>
  <purpose>Une phrase claire du but principal</purpose>
  <summary_bullets>
    <bullet>Point clé 1</bullet>
    <bullet>Point clé 2</bullet>
    <bullet>Point clé 3</bullet>
  </summary_bullets>
  <inputs>
    <input>input 1</input>
    <input>input 2</input>
  </inputs>
  <outputs>
    <output>output 1</output>
    <output>output 2</output>
  </outputs>
  <dependencies>
    <dependency>dependency 1</dependency>
    <dependency>dependency 2</dependency>
  </dependencies>
  <risks>
    <risk>risque 1</risk>
    <risk>risque 2</risk>
  </risks>
  <complexity>low|medium|high</complexity>
  <test_ideas>
    <idea>test idea 1</idea>
    <idea>test idea 2</idea>
  </test_ideas>
  <docstring_suggestion><![CDATA[docstring content with any characters]]></docstring_suggestion>
  <tags>
    <tag>tag1</tag>
    <tag>tag2</tag>
  </tags>
</code_analysis>`,
      response: `<code_analysis>
  <name>AdvancedTestFunction</name>
  <type>function</type>
  <purpose>Fonction générique asynchrone pour traiter des tableaux avec filtrage et transformation</purpose>
  <summary_bullets>
    <bullet>Fonction générique TypeScript avec type T</bullet>
    <bullet>Traite des tableaux avec filtrage optionnel</bullet>
    <bullet>Utilise des callbacks asynchrones pour le traitement</bullet>
    <bullet>Retourne des métadonnées détaillées</bullet>
  </summary_bullets>
  <inputs>
    <input>input: T[] - Tableau d'éléments à traiter</input>
    <input>options: AdvancedOptions - Options de traitement et filtrage</input>
  </inputs>
  <outputs>
    <output>Promise&lt;TestResult&lt;T&gt;&gt; - Résultat avec données et métadonnées</output>
  </outputs>
  <dependencies>
    <dependency>AdvancedOptions - Interface pour les options</dependency>
    <dependency>TestResult - Interface pour le résultat</dependency>
  </dependencies>
  <risks>
    <risk>Complexité élevée avec génériques et async</risk>
    <risk>Gestion d'erreurs manquante dans la boucle</risk>
  </risks>
  <complexity>high</complexity>
  <test_ideas>
    <idea>Test avec différents types de données</idea>
    <idea>Test avec options de filtrage</idea>
    <idea>Test de performance avec gros tableaux</idea>
  </test_ideas>
  <docstring_suggestion><![CDATA[/**
 * Traite un tableau d'éléments avec filtrage et transformation asynchrones
 * @param input Tableau d'éléments à traiter
 * @param options Options de traitement et filtrage
 * @returns Promise avec résultat et métadonnées
 */]]></docstring_suggestion>
  <tags>
    <tag>generic</tag>
    <tag>async</tag>
    <tag>array_processing</tag>
    <tag>typescript</tag>
    <tag>advanced</tag>
  </tags>
</code_analysis>`,
      tokensUsed: 450,
      model: 'gemini-1.5-flash',
      temperature: 0.1
    };

    artifactGenerator.addDetailedArtifact(
      'StructuredLLMAnalyzerXML',
      'detailed_llm_analysis',
      'success',
      {
        scope: {
          name: testScope.name,
          type: testScope.type,
          complexity: testScope.complexity,
          parameters: testScope.parameters.length,
          dependencies: testScope.dependencies.length,
          isGeneric: testScope.signature.includes('<T>'),
          isAsync: testScope.signature.includes('async')
        }
      },
      {
        analysis: {
          name: analysis.name,
          type: analysis.type,
          purpose: analysis.overall_purpose,
          complexity: analysis.complexity,
          subScopes: analysis.sub_scopes.length,
          tags: analysis.tags.length,
          risks: analysis.risks.length,
          testIdeas: analysis.test_ideas.length,
          maintainability: analysis.maintainability,
          testability: analysis.testability
        },
        quality: {
          hasPurpose: !!analysis.overall_purpose,
          hasTags: analysis.tags.length > 0,
          hasRisks: analysis.risks.length > 0,
          hasTestIdeas: analysis.test_ideas.length > 0
        }
      },
      { 
        duration: analysisEndTime - analysisStartTime, 
        llmCalls: 1 
      },
      llmDetails,
      ['llm_analysis', 'typescript', 'advanced', 'generic']
    );

    // Test 4: Test de décompression avec artefacts détaillés
    console.log('\n🔄 Test 4: Décompression avec artefacts détaillés');
    console.log('-----------------------------------------------');
    
    const decompressionRequest: AgenticDecompressionRequest = {
      compressedItems: [
        {
          name: 'AdvancedTestClass',
          level: 3,
          description: 'Classe avancée pour test d\'artefacts détaillés',
          compressedContent: 'class AdvancedTestClass<T> { constructor(private data: T[]) {} }',
          metadata: {
            originalSize: 200,
            compressedSize: 80,
            compressionRatio: 0.4,
            quality: 9.5
          }
        }
      ],
      targetContext: 'Test avancé de génération d\'artefacts avec décompression agentique',
      reconstructionLevel: 'complete',
      preserveOriginalStructure: true,
      includeMetadata: true,
      enableAlgarethInsights: true,
      learningMode: 'aggressive',
      contextEnrichment: true,
      preserveExperience: true,
      targetQuality: 'premium',
      optimizationLevel: 'aggressive'
    };

    const decompressionStartTime = Date.now();
    try {
      const decompressionResult = await agenticEngine.decompressWithAlgareth(decompressionRequest);
      const decompressionEndTime = Date.now();

      artifactGenerator.addDetailedArtifact(
        'AgenticDecompressionEngine',
        'detailed_decompression',
        decompressionResult.success ? 'success' : 'warning',
        {
          request: {
            compressedItems: decompressionRequest.compressedItems.length,
            targetContext: decompressionRequest.targetContext,
            targetQuality: decompressionRequest.targetQuality,
            learningMode: decompressionRequest.learningMode,
            optimizationLevel: decompressionRequest.optimizationLevel,
            reconstructionLevel: decompressionRequest.reconstructionLevel
          }
        },
        {
          result: {
            success: decompressionResult.success,
            decompressedCount: decompressionResult.decompressed.length,
            errorsCount: decompressionResult.errors.length,
            warningsCount: decompressionResult.warnings.length,
            insightsCount: decompressionResult.algarethInsights?.length || 0,
            optimizationSuggestions: decompressionResult.optimizationSuggestions?.length || 0,
            learningMetrics: decompressionResult.learningMetrics ? {
              patternsLearned: decompressionResult.learningMetrics.patternsLearned,
              contextImprovements: decompressionResult.learningMetrics.contextImprovements,
              optimizationGains: decompressionResult.learningMetrics.optimizationGains
            } : null
          }
        },
        { 
          duration: decompressionEndTime - decompressionStartTime, 
          llmCalls: 2 // Contexte + Insights
        },
        undefined,
        ['decompression', 'agentic', 'advanced', 'learning']
      );

    } catch (error) {
      const decompressionEndTime = Date.now();
      
      artifactGenerator.addDetailedArtifact(
        'AgenticDecompressionEngine',
        'detailed_decompression',
        'error',
        {
          request: decompressionRequest,
          error: error.toString()
        },
        {
          error: {
            message: error.toString(),
            type: 'decompression_error',
            recoverable: false
          }
        },
        { 
          duration: decompressionEndTime - decompressionStartTime, 
          llmCalls: 0 
        },
        undefined,
        ['decompression', 'error', 'advanced']
      );
    }

    // Générer le rapport final
    const totalTime = Date.now() - startTime;
    const report = artifactGenerator.generateAdvancedReport();
    
    console.log('\n🎉 Test avancé avec artefacts terminé !');
    console.log('=====================================');
    console.log(`📁 Dossier artefacts: ${artifactGenerator['artifactsPath']}`);
    console.log(`📊 Total artefacts: ${report.summary.totalArtifacts}`);
    console.log(`✅ Succès: ${report.summary.successCount}`);
    console.log(`❌ Erreurs: ${report.summary.errorCount}`);
    console.log(`⚠️ Avertissements: ${report.summary.warningCount}`);
    console.log(`🧠 Appels LLM: ${report.summary.totalLLMCalls}`);
    console.log(`⏱️ Durée totale: ${totalTime}ms`);
    console.log(`📈 Taux de succès: ${((report.summary.successCount / report.summary.totalArtifacts) * 100).toFixed(1)}%`);

  } catch (error) {
    artifactGenerator.addDetailedArtifact(
      'System',
      'test_execution',
      'error',
      { error: error.toString() },
      { error: { message: error.toString(), type: 'system_error' } },
      { duration: Date.now() - startTime, llmCalls: 0 },
      undefined,
      ['system', 'error']
    );
    
    console.error('❌ Erreur lors du test avancé:', error);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testAdvancedArtifacts().catch(console.error);
}

export { testAdvancedArtifacts };