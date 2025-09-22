/**
 * IntelligentAnalyzer - Analyse optimisée avec stratégie adaptative
 * 
 * Fait une analyse préliminaire pour décider de la stratégie d'analyse
 * et optimise les appels LLM selon la complexité des scopes
 */

import { StructuredTypeScriptParser, TypeScriptScope, FileAnalysis } from './StructuredTypeScriptParser';
import { StructuredLLMAnalyzerXML, StructuredLLMAnalysisXML } from './StructuredLLMAnalyzerXML';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

export interface AnalysisStrategy {
  mode: 'grouped' | 'hierarchical' | 'individual';
  scopeGroups: ScopeGroup[];
  individualScopes: string[];
  reasoning: string;
}

export interface ScopeGroup {
  name: string;
  scopes: TypeScriptScope[];
  analysisType: 'interfaces' | 'functions' | 'classes' | 'mixed';
  complexity: 'low' | 'medium' | 'high';
}

export interface IntelligentAnalysisResult {
  filePath: string;
  fileAnalysis: FileAnalysis;
  strategy: AnalysisStrategy;
  scopeAnalyses: ScopeAnalysisResult[];
  summary: FileSummary;
  metadata: {
    totalScopes: number;
    analyzedScopes: number;
    totalDuration: number;
    llmCalls: number;
    apiKeyPresent: boolean;
    optimizationRatio: number;
  };
}

export interface ScopeAnalysisResult {
  scope: TypeScriptScope;
  analysis: StructuredLLMAnalysisXML;
  duration: number;
  success: boolean;
  error?: string;
  analysisMode: 'grouped' | 'hierarchical' | 'individual';
}

export interface FileSummary {
  fileName: string;
  fileType: 'typescript' | 'javascript' | 'unknown';
  totalLines: number;
  totalScopes: number;
  scopeTypes: {
    classes: number;
    functions: number;
    interfaces: number;
    methods: number;
    others: number;
  };
  complexity: {
    low: number;
    medium: number;
    high: number;
  };
  tags: string[];
  risks: string[];
  testIdeas: string[];
  overallPurpose: string;
  recommendations: string[];
}

export class IntelligentAnalyzer {
  private tsParser: StructuredTypeScriptParser;
  private llmAnalyzer: StructuredLLMAnalyzerXML;
  private useRealLLM: boolean;
  private llmCalls: number;

  constructor() {
    this.tsParser = new StructuredTypeScriptParser();
    this.llmAnalyzer = new StructuredLLMAnalyzerXML();
    this.useRealLLM = (this.llmAnalyzer as any).useRealLLM || false;
    this.llmCalls = 0;
    
    console.log('🧠 IntelligentAnalyzer initialisé');
    console.log(`🧠 Mode LLM: ${this.useRealLLM ? 'Vrais appels LLM' : 'Mode heuristique'}`);
  }

  /**
   * Analyse intelligente d'un fichier TypeScript
   */
  async analyzeFileIntelligently(filePath: string): Promise<IntelligentAnalysisResult> {
    const startTime = Date.now();
    console.log(`🧠 Analyse intelligente du fichier: ${filePath}`);

    try {
      // 1. Lire et parser le fichier
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(`📄 Fichier lu: ${content.length} caractères`);

      const fileAnalysis = await this.tsParser.parseFile(filePath, content);
      console.log(`✅ Parsing terminé: ${fileAnalysis.scopes.length} scopes trouvés`);

      // 2. Analyse préliminaire pour déterminer la stratégie
      console.log('🔍 Analyse préliminaire...');
      const strategy = await this.determineAnalysisStrategy(fileAnalysis);
      console.log(`📋 Stratégie déterminée: ${strategy.mode}`);
      console.log(`   Groupes: ${strategy.scopeGroups.length}`);
      console.log(`   Scopes individuels: ${strategy.individualScopes.length}`);
      console.log(`   Raisonnement: ${strategy.reasoning}`);

      // 3. Analyser selon la stratégie
      console.log('🧠 Analyse selon la stratégie...');
      const scopeAnalyses = await this.analyzeWithStrategy(fileAnalysis, strategy);

      // 4. Générer le résumé
      console.log('📊 Génération du résumé...');
      const summary = this.generateFileSummary(fileAnalysis, scopeAnalyses);

      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const optimizationRatio = ((fileAnalysis.scopes.length - this.llmCalls) / fileAnalysis.scopes.length) * 100;

      console.log(`✅ Analyse intelligente terminée: ${totalDuration}ms`);
      console.log(`📈 Optimisation: ${optimizationRatio.toFixed(1)}% (${this.llmCalls} appels au lieu de ${fileAnalysis.scopes.length})`);

      return {
        filePath,
        fileAnalysis,
        strategy,
        scopeAnalyses,
        summary,
        metadata: {
          totalScopes: fileAnalysis.scopes.length,
          analyzedScopes: scopeAnalyses.filter(s => s.success).length,
          totalDuration,
          llmCalls: this.llmCalls,
          apiKeyPresent: this.useRealLLM,
          optimizationRatio: Math.round(optimizationRatio * 10) / 10
        }
      };

    } catch (error) {
      console.error(`❌ Erreur analyse intelligente ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Détermine la stratégie d'analyse optimale
   */
  private async determineAnalysisStrategy(fileAnalysis: FileAnalysis): Promise<AnalysisStrategy> {
    if (!this.useRealLLM) {
      // Mode heuristique
      return this.generateHeuristicStrategy(fileAnalysis);
    }

    // Mode LLM - Analyse préliminaire
    const preliminaryPrompt = this.buildPreliminaryAnalysisPrompt(fileAnalysis);
    
    try {
      console.log('🧠 Appel LLM pour analyse préliminaire...');
      const response = await (this.llmAnalyzer as any).model.generateContent(preliminaryPrompt);
      const responseText = response.response.text();
      this.llmCalls++;

      console.log('🔍 Parsing de la réponse préliminaire...');
      const strategy = this.parsePreliminaryResponse(responseText, fileAnalysis);
      
      console.log(`📋 Stratégie LLM: ${strategy.mode}`);
      return strategy;

    } catch (error) {
      console.error('❌ Erreur analyse préliminaire LLM:', error);
      console.log('🔄 Fallback vers stratégie heuristique...');
      return this.generateHeuristicStrategy(fileAnalysis);
    }
  }

  /**
   * Construit le prompt pour l'analyse préliminaire
   */
  private buildPreliminaryAnalysisPrompt(fileAnalysis: FileAnalysis): string {
    const scopesInfo = fileAnalysis.scopes.map(scope => {
      const lines = scope.endLine - scope.startLine + 1;
      const methods = scope.type === 'class' ? 
        fileAnalysis.scopes.filter(s => s.type === 'method' && s.startLine > scope.startLine && s.endLine < scope.endLine).length : 0;
      
      return `- ${scope.type} ${scope.name} (lignes ${scope.startLine}-${scope.endLine}, ${lines} lignes${methods > 0 ? `, ${methods} méthodes` : ''})`;
    }).join('\n');

    return `Tu es un expert en analyse de code TypeScript. Analyse ce fichier et détermine la stratégie d'analyse optimale.

FICHIER: ${fileAnalysis.filePath}
LIGNES TOTALES: ${fileAnalysis.totalLines}
SCOPES: ${fileAnalysis.scopes.length}

DÉTAIL DES SCOPES:
${scopesInfo}

DÉTERMINE la stratégie d'analyse optimale en répondant en JSON:

{
  "strategy": "grouped|hierarchical|individual",
  "reasoning": "Explication de la stratégie choisie",
  "scopeGroups": [
    {
      "name": "Nom du groupe",
      "scopeNames": ["scope1", "scope2"],
      "analysisType": "interfaces|functions|classes|mixed",
      "complexity": "low|medium|high"
    }
  ],
  "individualScopes": ["scope1", "scope2"],
  "optimization": {
    "expectedCalls": 3,
    "reasoning": "Pourquoi cette optimisation"
  }
}

RÈGLES:
- Si scopes simples (< 20 lignes, < 3 méthodes) → grouped
- Si classe complexe avec beaucoup de méthodes → hierarchical  
- Si scope très complexe (> 50 lignes) → individual
- Minimiser les appels LLM tout en gardant la qualité
- Grouper les interfaces et fonctions simples
- Analyser les classes complexes de manière hiérarchique

Réponds UNIQUEMENT avec le JSON, sans autre texte.`;
  }

  /**
   * Parse la réponse de l'analyse préliminaire
   */
  private parsePreliminaryResponse(responseText: string, fileAnalysis: FileAnalysis): AnalysisStrategy {
    try {
      // Nettoyer la réponse
      const cleanResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const strategyData = JSON.parse(cleanResponse);

      // Construire les groupes de scopes
      const scopeGroups: ScopeGroup[] = [];
      const individualScopes: string[] = strategyData.individualScopes || [];

      for (const groupData of strategyData.scopeGroups || []) {
        const scopes = fileAnalysis.scopes.filter(scope => 
          groupData.scopeNames.includes(scope.name)
        );
        
        if (scopes.length > 0) {
          scopeGroups.push({
            name: groupData.name,
            scopes,
            analysisType: groupData.analysisType,
            complexity: groupData.complexity
          });
        }
      }

      return {
        mode: strategyData.strategy || 'grouped',
        scopeGroups,
        individualScopes,
        reasoning: strategyData.reasoning || 'Stratégie déterminée par LLM'
      };

    } catch (error) {
      console.error('❌ Erreur parsing réponse préliminaire:', error);
      return this.generateHeuristicStrategy(fileAnalysis);
    }
  }

  /**
   * Génère une stratégie heuristique optimisée
   */
  private generateHeuristicStrategy(fileAnalysis: FileAnalysis): AnalysisStrategy {
    const scopeGroups: ScopeGroup[] = [];
    const individualScopes: string[] = [];

    // Grouper les interfaces (toujours en groupe)
    const interfaces = fileAnalysis.scopes.filter(s => s.type === 'interface');
    if (interfaces.length > 0) {
      scopeGroups.push({
        name: 'Interfaces',
        scopes: interfaces,
        analysisType: 'interfaces',
        complexity: 'low'
      });
    }

    // Grouper les fonctions simples
    const simpleFunctions = fileAnalysis.scopes.filter(s => 
      s.type === 'function' && (s.endLine - s.startLine + 1) < 30
    );
    if (simpleFunctions.length > 0) {
      scopeGroups.push({
        name: 'Fonctions Simples',
        scopes: simpleFunctions,
        analysisType: 'functions',
        complexity: 'low'
      });
    }

    // Grouper les fonctions complexes
    const complexFunctions = fileAnalysis.scopes.filter(s => 
      s.type === 'function' && (s.endLine - s.startLine + 1) >= 30
    );
    if (complexFunctions.length > 0) {
      scopeGroups.push({
        name: 'Fonctions Complexes',
        scopes: complexFunctions,
        analysisType: 'functions',
        complexity: 'high'
      });
    }

    // Analyser les classes selon leur complexité
    const classes = fileAnalysis.scopes.filter(s => s.type === 'class');
    const simpleClasses: any[] = [];
    const complexClasses: any[] = [];

    for (const cls of classes) {
      const methods = fileAnalysis.scopes.filter(s => 
        s.type === 'method' && s.startLine > cls.startLine && s.endLine < cls.endLine
      );
      
      const classSize = cls.endLine - cls.startLine + 1;
      
      // Critères pour classe complexe
      if (methods.length > 8 || classSize > 100 || methods.some(m => (m.endLine - m.startLine + 1) > 20)) {
        complexClasses.push(cls);
      } else {
        simpleClasses.push(cls);
      }
    }

    // Grouper les classes simples
    if (simpleClasses.length > 0) {
      scopeGroups.push({
        name: 'Classes Simples',
        scopes: simpleClasses,
        analysisType: 'classes',
        complexity: 'medium'
      });
    }

    // Analyser les classes complexes individuellement
    individualScopes.push(...complexClasses.map(c => c.name));

    // Analyser les méthodes très complexes individuellement
    const veryComplexMethods = fileAnalysis.scopes.filter(s => 
      s.type === 'method' && (s.endLine - s.startLine + 1) > 40
    );
    individualScopes.push(...veryComplexMethods.map(m => m.name));

    const mode = individualScopes.length > 0 ? 'individual' : 'grouped';

    return {
      mode,
      scopeGroups,
      individualScopes,
      reasoning: `Stratégie heuristique optimisée: ${scopeGroups.length} groupes, ${individualScopes.length} scopes individuels`
    };
  }

  /**
   * Analyse selon la stratégie déterminée
   */
  private async analyzeWithStrategy(
    fileAnalysis: FileAnalysis, 
    strategy: AnalysisStrategy
  ): Promise<ScopeAnalysisResult[]> {
    const scopeAnalyses: ScopeAnalysisResult[] = [];

    // 1. Analyser les groupes
    for (const group of strategy.scopeGroups) {
      console.log(`   🔍 Analyse du groupe: ${group.name} (${group.scopes.length} scopes)`);
      
      try {
        const groupStartTime = Date.now();
        const groupAnalyses = await this.analyzeScopeGroup(group);
        const groupEndTime = Date.now();

        // Ajouter les résultats avec le mode d'analyse
        for (const analysis of groupAnalyses) {
          scopeAnalyses.push({
            ...analysis,
            analysisMode: 'grouped',
            duration: groupEndTime - groupStartTime
          });
        }

      } catch (error) {
        console.error(`   ❌ Erreur analyse groupe ${group.name}:`, error);
        // Fallback vers analyse individuelle
        for (const scope of group.scopes) {
          const fallbackAnalysis = await this.analyzeScopeIndividually(scope);
          scopeAnalyses.push({
            ...fallbackAnalysis,
            analysisMode: 'individual'
          });
        }
      }
    }

    // 2. Analyser les scopes individuels
    for (const scopeName of strategy.individualScopes) {
      const scope = fileAnalysis.scopes.find(s => s.name === scopeName);
      if (scope) {
        console.log(`   🔍 Analyse individuelle: ${scope.type} ${scope.name}`);
        const individualAnalysis = await this.analyzeScopeIndividually(scope);
        scopeAnalyses.push({
          ...individualAnalysis,
          analysisMode: 'individual'
        });
      }
    }

    return scopeAnalyses;
  }

  /**
   * Analyse un groupe de scopes
   */
  private async analyzeScopeGroup(group: ScopeGroup): Promise<ScopeAnalysisResult[]> {
    if (!this.useRealLLM) {
      // Mode heuristique
      return this.analyzeScopeGroupHeuristically(group);
    }

    // Mode LLM
    const groupPrompt = this.buildGroupAnalysisPrompt(group);
    
    try {
      console.log(`   🧠 Appel LLM pour groupe: ${group.name}`);
      const response = await (this.llmAnalyzer as any).model.generateContent(groupPrompt);
      const responseText = response.response.text();
      this.llmCalls++;

      console.log(`   🔍 Parsing réponse groupe: ${group.name}`);
      const groupAnalyses = this.parseGroupResponse(responseText, group);
      
      console.log(`   ✅ Groupe analysé: ${groupAnalyses.length} scopes`);
      return groupAnalyses;

    } catch (error) {
      console.error(`   ❌ Erreur analyse groupe LLM:`, error);
      return this.analyzeScopeGroupHeuristically(group);
    }
  }

  /**
   * Construit le prompt pour l'analyse de groupe
   */
  private buildGroupAnalysisPrompt(group: ScopeGroup): string {
    const scopesContent = group.scopes.map(scope => {
      return `### ${scope.type.toUpperCase()} ${scope.name}
Lignes: ${scope.startLine}-${scope.endLine}
Signature: ${scope.signature}
Contenu:
\`\`\`typescript
${scope.content}
\`\`\``;
    }).join('\n\n');

    return `Tu es un expert en analyse de code TypeScript. Analyse ce groupe de scopes et fournis une analyse complète pour chaque scope.

GROUPE: ${group.name}
TYPE: ${group.analysisType}
COMPLEXITÉ: ${group.complexity}
NOMBRE DE SCOPES: ${group.scopes.length}

SCOPES À ANALYSER:
${scopesContent}

Fournis une analyse XML pour chaque scope en utilisant ce format:

\`\`\`xml
<group_analysis>
  <scope_analysis>
    <name>NomDuScope</name>
    <type>type</type>
    <purpose>Description du but</purpose>
    <summary_bullets>
      <bullet>Point 1</bullet>
      <bullet>Point 2</bullet>
    </summary_bullets>
    <inputs>
      <input>Description des entrées</input>
    </inputs>
    <outputs>
      <output>Description des sorties</output>
    </outputs>
    <dependencies>
      <dependency>Dépendance 1</dependency>
    </dependencies>
    <risks>
      <risk>Risque 1</risk>
    </risks>
    <complexity>low|medium|high</complexity>
    <test_ideas>
      <idea>Idée de test 1</idea>
    </test_ideas>
    <docstring_suggestion>Suggestion de documentation</docstring_suggestion>
    <tags>
      <tag>tag1</tag>
      <tag>tag2</tag>
    </tags>
  </scope_analysis>
  <!-- Répéter pour chaque scope -->
</group_analysis>
\`\`\`

Réponds UNIQUEMENT avec le XML, sans autre texte.`;
  }

  /**
   * Parse la réponse d'analyse de groupe
   */
  private parseGroupResponse(responseText: string, group: ScopeGroup): ScopeAnalysisResult[] {
    try {
      // Utiliser le pré-processeur LLM
      const { LLMResponsePreprocessor } = require('../llm/LLMResponsePreprocessor');
      const cleanResponse = LLMResponsePreprocessor.preprocessLLMResponse(responseText);
      
      // Utiliser LuciformXMLParser comme dans FileRegeneratorV2
      const { LuciformXMLParser } = require('../llm/LuciformXMLParser');
      const parser = new LuciformXMLParser(cleanResponse, {
        maxDepth: 50,
        maxTextLength: 100000,
        entityExpansionLimit: 1000,
        allowDTD: false,
        maxAttrCount: 100,
        maxAttrValueLength: 10000,
        maxCommentLength: 10000,
        maxPILength: 1000,
        useUnicodeNames: true,
        mode: 'luciform-permissive'
      });
      
      const parseResult = parser.parse();
      
      if (!parseResult.success) {
        console.error('❌ Erreur parsing XML groupe:', parseResult.errors);
        return this.analyzeScopeGroupHeuristically(group);
      }
      
      const scopeAnalyses: ScopeAnalysisResult[] = [];
      
      // Extraire les analyses individuelles depuis le document XML
      const groupAnalysisElement = this.findElement(parseResult.document, 'group_analysis');
      if (groupAnalysisElement && groupAnalysisElement.children) {
        for (const child of groupAnalysisElement.children) {
          if (child.name === 'scope_analysis') {
            const analysisData = this.xmlElementToObject(child);
            const scope = group.scopes.find(s => s.name === analysisData.name);
            if (scope) {
              const analysis = this.convertToStructuredAnalysis(analysisData);
              scopeAnalyses.push({
                scope,
                analysis,
                duration: 0,
                success: true,
                analysisMode: 'grouped'
              });
            }
          }
        }
      }
      
      return scopeAnalyses;

    } catch (error) {
      console.error('❌ Erreur parsing réponse groupe:', error);
      return this.analyzeScopeGroupHeuristically(group);
    }
  }

  /**
   * Trouve un élément dans le document XML
   */
  private findElement(xmlDoc: any, tagName: string): any {
    if (!xmlDoc || !xmlDoc.children) return null;
    
    for (const child of xmlDoc.children) {
      if (child.name === tagName) {
        return child;
      }
      const found = this.findElement(child, tagName);
      if (found) return found;
    }
    return null;
  }

  /**
   * Convertit un élément XML en objet JavaScript
   */
  private xmlElementToObject(element: any): any {
    if (!element) return {};
    
    const result: any = {};
    
    // Ajouter le nom de l'élément
    if (element.name) {
      result.name = element.name;
    }
    
    // Traiter les enfants pour extraire le contenu
    if (element.children) {
      let textContent = '';
      const childElements: any = {};
      
      for (const child of element.children) {
        if (child.type === 'text' && child.content) {
          // Texte simple - l'ajouter au contenu principal
          textContent += child.content;
        } else if (child.name) {
          // Élément avec nom - le traiter récursivement
          const childData = this.xmlElementToObject(child);
          
          // Si l'élément enfant a du contenu texte, l'utiliser comme valeur
          if (childData.content && childData.content.trim()) {
            childElements[child.name] = childData.content.trim();
          } else if (childData.name && childData.name !== child.name) {
            // Si l'élément enfant a un nom différent, utiliser l'objet complet
            childElements[child.name] = childData;
          } else {
            // Sinon, utiliser l'objet complet
            childElements[child.name] = childData;
          }
        }
      }
      
      // Ajouter le contenu texte s'il existe
      if (textContent.trim()) {
        result.content = textContent.trim();
      }
      
      // Ajouter les éléments enfants
      Object.assign(result, childElements);
    }
    
    return result;
  }

  /**
   * Analyse heuristique d'un groupe
   */
  private analyzeScopeGroupHeuristically(group: ScopeGroup): ScopeAnalysisResult[] {
    const scopeAnalyses: ScopeAnalysisResult[] = [];

    for (const scope of group.scopes) {
      const analysis = this.createFallbackAnalysis(scope);
      scopeAnalyses.push({
        scope,
        analysis,
        duration: 0,
        success: true,
        analysisMode: 'grouped'
      });
    }

    return scopeAnalyses;
  }

  /**
   * Analyse individuelle d'un scope
   */
  private async analyzeScopeIndividually(scope: TypeScriptScope): Promise<ScopeAnalysisResult> {
    try {
      const scopeStartTime = Date.now();
      const analysis = await this.llmAnalyzer.analyzeScope(scope);
      const scopeEndTime = Date.now();

      if (this.useRealLLM) {
        this.llmCalls++;
      }

      return {
        scope,
        analysis,
        duration: scopeEndTime - scopeStartTime,
        success: true,
        analysisMode: 'individual'
      };

    } catch (error) {
      console.error(`❌ Erreur analyse individuelle ${scope.name}:`, error);
      return {
        scope,
        analysis: this.createFallbackAnalysis(scope),
        duration: 0,
        success: false,
        error: error.toString(),
        analysisMode: 'individual'
      };
    }
  }

  /**
   * Convertit les données XML en StructuredLLMAnalysisXML
   */
  private convertToStructuredAnalysis(data: any): StructuredLLMAnalysisXML {
    return {
      name: data.name || 'unknown',
      type: data.type || 'unknown',
      overall_purpose: data.purpose || 'Fonctionnalité non analysée',
      summary_bullets: Array.isArray(data.summary_bullets?.bullet) ? 
        data.summary_bullets.bullet : [data.summary_bullets?.bullet || 'Non analysé'],
      sub_scopes: [],
      global_analysis: {
        architecture: 'Architecture analysée en groupe',
        design_patterns: [],
        relationships: [],
        overall_purpose: data.purpose || 'But non déterminé',
        strengths: [],
        weaknesses: [],
        improvement_suggestions: [],
        performance_notes: [],
        type_safety_notes: []
      },
      dependencies: Array.isArray(data.dependencies?.dependency) ? 
        data.dependencies.dependency : [data.dependencies?.dependency || ''],
      inputs: Array.isArray(data.inputs?.input) ? 
        data.inputs.input : [data.inputs?.input || ''],
      outputs: Array.isArray(data.outputs?.output) ? 
        data.outputs.output : [data.outputs?.output || ''],
      complexity: data.complexity || 'low',
      maintainability: 'medium',
      testability: 'medium',
      risks: Array.isArray(data.risks?.risk) ? 
        data.risks.risk : [data.risks?.risk || ''],
      test_ideas: Array.isArray(data.test_ideas?.idea) ? 
        data.test_ideas.idea : [data.test_ideas?.idea || ''],
      docstring_suggestion: data.docstring_suggestion || 'Documentation suggérée',
      tags: Array.isArray(data.tags?.tag) ? 
        data.tags.tag : [data.tags?.tag || ''],
      type_safety_notes: [],
      async_patterns: [],
      performance_notes: []
    };
  }

  /**
   * Crée une analyse de fallback
   */
  private createFallbackAnalysis(scope: TypeScriptScope): StructuredLLMAnalysisXML {
    return {
      name: scope.name,
      type: scope.type,
      overall_purpose: `Fonctionnalité ${scope.type}`,
      summary_bullets: [`${scope.type} ${scope.name}`],
      sub_scopes: [],
      global_analysis: {
        architecture: 'Architecture non analysée',
        design_patterns: [],
        relationships: [],
        overall_purpose: 'But non déterminé',
        strengths: [],
        weaknesses: [],
        improvement_suggestions: [],
        performance_notes: [],
        type_safety_notes: []
      },
      dependencies: scope.dependencies,
      inputs: scope.parameters.map(p => `${p.name}: ${p.type || 'any'}`),
      outputs: scope.returnType ? [scope.returnType] : ['void'],
      complexity: scope.complexity > 10 ? 'high' : scope.complexity > 5 ? 'medium' : 'low',
      maintainability: 'medium',
      testability: 'medium',
      risks: ['Analyse limitée'],
      test_ideas: ['Tests basiques'],
      docstring_suggestion: `Documentation pour ${scope.name}`,
      tags: [scope.type, 'unanalyzed'],
      type_safety_notes: ['Analyse de sécurité des types non disponible'],
      async_patterns: [],
      performance_notes: ['Analyse de performance non disponible']
    };
  }

  /**
   * Génère le résumé du fichier
   */
  private generateFileSummary(
    fileAnalysis: FileAnalysis, 
    scopeAnalyses: ScopeAnalysisResult[]
  ): FileSummary {
    const fileName = path.basename(fileAnalysis.filePath);
    const fileType = this.determineFileType(fileName);

    // Compter les types de scopes
    const scopeTypes = {
      classes: 0,
      functions: 0,
      interfaces: 0,
      methods: 0,
      others: 0
    };

    // Compter la complexité
    const complexity = {
      low: 0,
      medium: 0,
      high: 0
    };

    // Collecter les données des analyses
    const allTags: string[] = [];
    const allRisks: string[] = [];
    const allTestIdeas: string[] = [];
    const allPurposes: string[] = [];

    for (const scopeAnalysis of scopeAnalyses) {
      const { scope, analysis } = scopeAnalysis;

      // Compter les types
      switch (scope.type) {
        case 'class':
          scopeTypes.classes++;
          break;
        case 'function':
          scopeTypes.functions++;
          break;
        case 'interface':
          scopeTypes.interfaces++;
          break;
        case 'method':
          scopeTypes.methods++;
          break;
        default:
          scopeTypes.others++;
      }

      // Compter la complexité
      if (analysis.complexity === 'low') complexity.low++;
      else if (analysis.complexity === 'medium') complexity.medium++;
      else if (analysis.complexity === 'high') complexity.high++;

      // Collecter les données
      allTags.push(...analysis.tags);
      allRisks.push(...analysis.risks);
      allTestIdeas.push(...analysis.test_ideas);
      if (analysis.overall_purpose) {
        allPurposes.push(analysis.overall_purpose);
      }
    }

    // Générer des recommandations
    const recommendations = this.generateRecommendations(scopeTypes, complexity, allRisks);

    return {
      fileName,
      fileType,
      totalLines: fileAnalysis.totalLines,
      totalScopes: fileAnalysis.scopes.length,
      scopeTypes,
      complexity,
      tags: [...new Set(allTags)],
      risks: [...new Set(allRisks)],
      testIdeas: [...new Set(allTestIdeas)],
      overallPurpose: allPurposes.length > 0 ? allPurposes[0] : 'Fichier TypeScript',
      recommendations
    };
  }

  /**
   * Détermine le type de fichier
   */
  private determineFileType(fileName: string): 'typescript' | 'javascript' | 'unknown' {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
      return 'typescript';
    } else if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
      return 'javascript';
    }
    return 'unknown';
  }

  /**
   * Génère des recommandations
   */
  private generateRecommendations(
    scopeTypes: any, 
    complexity: any, 
    risks: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (complexity.high > complexity.low + complexity.medium) {
      recommendations.push('Considérer la refactorisation - complexité élevée détectée');
    }

    if (scopeTypes.classes > 5) {
      recommendations.push('Trop de classes - considérer la séparation en modules');
    }

    if (scopeTypes.functions > 10) {
      recommendations.push('Trop de fonctions - considérer l\'organisation en classes');
    }

    if (risks.length > 3) {
      recommendations.push('Plusieurs risques identifiés - revue de code recommandée');
    }

    if (recommendations.length === 0) {
      recommendations.push('Code bien structuré - continuer les bonnes pratiques');
    }

    return recommendations;
  }

  /**
   * Sauvegarde les résultats d'analyse intelligente
   */
  async saveIntelligentAnalysisResults(result: IntelligentAnalysisResult, outputDir?: string): Promise<string> {
    const timestamp = new Date().toLocaleString('fr-FR', { 
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/[\/\s:]/g, '-');
    const fileName = path.basename(result.filePath, path.extname(result.filePath));
    const defaultOutputDir = path.join(process.cwd(), 'artefacts', 'Reports', 'CodeInsight', 'intelligent_analyses');
    const finalOutputDir = outputDir || defaultOutputDir;

    // Créer le dossier
    if (!fs.existsSync(finalOutputDir)) {
      fs.mkdirSync(finalOutputDir, { recursive: true });
    }

    // Sauvegarder le résultat JSON
    const jsonPath = path.join(finalOutputDir, `${fileName}_intelligent_analysis_${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');

    // Générer un rapport Markdown
    const markdownPath = path.join(finalOutputDir, `${fileName}_intelligent_report_${timestamp}.md`);
    const markdown = this.generateIntelligentReport(result);
    fs.writeFileSync(markdownPath, markdown, 'utf-8');

    console.log(`📄 Résultats d'analyse intelligente sauvegardés:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${markdownPath}`);

    return jsonPath;
  }

  /**
   * Génère un rapport Markdown pour l'analyse intelligente
   */
  private generateIntelligentReport(result: IntelligentAnalysisResult): string {
    const { fileAnalysis, strategy, scopeAnalyses, summary, metadata } = result;

    let markdown = `# Analyse Intelligente - ${summary.fileName}

**Fichier:** ${result.filePath}  
**Date:** ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}  
**Durée:** ${metadata.totalDuration}ms  
**Optimisation:** ${metadata.optimizationRatio}% (${metadata.llmCalls} appels au lieu de ${metadata.totalScopes})

## 🧠 Stratégie d'Analyse

- **Mode:** ${strategy.mode}
- **Raisonnement:** ${strategy.reasoning}
- **Groupes:** ${strategy.scopeGroups.length}
- **Scopes individuels:** ${strategy.individualScopes.length}

### 📋 Groupes de Scopes

${strategy.scopeGroups.map((group, index) => `
#### ${index + 1}. ${group.name}
- **Type:** ${group.analysisType}
- **Complexité:** ${group.complexity}
- **Scopes:** ${group.scopes.map(s => s.name).join(', ')}
`).join('\n')}

### 🔍 Scopes Individuels

${strategy.individualScopes.map((scopeName, index) => `
#### ${index + 1}. ${scopeName}
- **Raison:** Analyse individuelle requise
`).join('\n')}

## 📊 Résumé Exécutif

- **Type:** ${summary.fileType}
- **Lignes:** ${summary.totalLines}
- **Scopes:** ${summary.totalScopes}
- **Appels LLM:** ${metadata.llmCalls}
- **Mode:** ${metadata.apiKeyPresent ? 'Vrais appels LLM' : 'Mode heuristique'}

## 🏗️ Structure du Fichier

- **Classes:** ${summary.scopeTypes.classes}
- **Fonctions:** ${summary.scopeTypes.functions}
- **Interfaces:** ${summary.scopeTypes.interfaces}
- **Méthodes:** ${summary.scopeTypes.methods}
- **Autres:** ${summary.scopeTypes.others}

## 📈 Complexité

- **Faible:** ${summary.complexity.low}
- **Moyenne:** ${summary.complexity.medium}
- **Élevée:** ${summary.complexity.high}

## 🏷️ Tags

${summary.tags.map(tag => `- \`${tag}\``).join('\n')}

## ⚠️ Risques

${summary.risks.map(risk => `- ${risk}`).join('\n')}

## 🧪 Idées de Tests

${summary.testIdeas.map(idea => `- ${idea}`).join('\n')}

## 💡 Recommandations

${summary.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📋 Détails par Scope

${scopeAnalyses.map((scopeAnalysis, index) => `
### ${index + 1}. ${scopeAnalysis.scope.type} ${scopeAnalysis.scope.name}

**Lignes:** ${scopeAnalysis.scope.startLine}-${scopeAnalysis.scope.endLine}  
**Complexité:** ${scopeAnalysis.analysis.complexity}  
**Mode d'analyse:** ${scopeAnalysis.analysisMode}  
**Durée d'analyse:** ${scopeAnalysis.duration}ms  
**Succès:** ${scopeAnalysis.success ? '✅' : '❌'}

**But:** ${scopeAnalysis.analysis.overall_purpose}

**Tags:** ${scopeAnalysis.analysis.tags.join(', ')}

**Risques:**
${scopeAnalysis.analysis.risks.map(risk => `- ${risk}`).join('\n')}

**Tests suggérés:**
${scopeAnalysis.analysis.test_ideas.map(idea => `- ${idea}`).join('\n')}

${scopeAnalysis.error ? `**Erreur:** ${scopeAnalysis.error}` : ''}
`).join('\n')}

## 📈 Optimisation

- **Appels LLM économisés:** ${metadata.totalScopes - metadata.llmCalls}
- **Ratio d'optimisation:** ${metadata.optimizationRatio}%
- **Temps économisé:** Estimation basée sur la réduction des appels

---
*Généré automatiquement par IntelligentAnalyzer*
`;

    return markdown;
  }
}