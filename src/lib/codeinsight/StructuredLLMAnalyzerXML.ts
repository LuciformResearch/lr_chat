/**
 * Structured LLM Analyzer XML - Version XML du StructuredLLMAnalyzer
 * 
 * Migre les prompts JSON vers XML pour une meilleure gestion du code
 * - CDATA sections pour le code avec caractères spéciaux
 * - Échappement XML robuste
 * - Structure hiérarchique naturelle
 * - Parsing plus fiable
 */

import { TypeScriptScope } from './StructuredTypeScriptParser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadShadeosEnv } from '@/lib/utils/SecureEnvManager';
import { XMLResponseParser, CodeAnalysisXML } from '../llm/XMLResponseParser';

export interface SubScopeAnalysisXML {
  name: string;
  type: 'method' | 'property' | 'constructor' | 'interface_member';
  purpose: string;
  summary: string;
  inputs: string[];
  outputs: string[];
  complexity: 'low' | 'medium' | 'high';
  risks: string[];
  test_ideas: string[];
  tags: string[];
}

export interface GlobalAnalysisXML {
  architecture: string;
  design_patterns: string[];
  relationships: string[];
  overall_purpose: string;
  strengths: string[];
  weaknesses: string[];
  improvement_suggestions: string[];
  performance_notes: string[];
  type_safety_notes: string[];
}

export interface StructuredLLMAnalysisXML {
  name: string;
  type: string;
  overall_purpose: string;
  summary_bullets: string[];
  
  // Sub-scopes analysis (découpé par l'LLM)
  sub_scopes: SubScopeAnalysisXML[];
  
  // Global analysis (synthèse)
  global_analysis: GlobalAnalysisXML;
  
  // Dependencies and context
  dependencies: string[];
  inputs: string[];
  outputs: string[];
  
  // Quality metrics
  complexity: 'low' | 'medium' | 'high';
  maintainability: 'low' | 'medium' | 'high';
  testability: 'low' | 'medium' | 'high';
  
  // Recommendations
  risks: string[];
  test_ideas: string[];
  docstring_suggestion: string;
  tags: string[];
  
  // TypeScript specific
  type_safety_notes: string[];
  async_patterns: string[];
  performance_notes: string[];
}

export class StructuredLLMAnalyzerXML {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private useRealLLM: boolean = false;
  private xmlParser: XMLResponseParser;

  constructor() {
    // Charger les variables d'environnement
    loadShadeosEnv();
    
    // Initialiser le parser XML
    this.xmlParser = new XMLResponseParser();
    
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.useRealLLM = true;
      console.log('🧠 StructuredLLMAnalyzerXML initialisé avec vrais appels LLM (Gemini)');
      console.log(`🔑 Clé API: ${geminiApiKey.substring(0, 20)}...`);
    } else {
      console.log('🧠 StructuredLLMAnalyzerXML initialisé en mode heuristique');
      console.log('⚠️ GEMINI_API_KEY non trouvée dans ~/.shadeos_env');
    }
  }

  /**
   * Analyze a TypeScript scope with structured breakdown using XML
   */
  async analyzeScope(scope: TypeScriptScope): Promise<StructuredLLMAnalysisXML> {
    const prompt = this.buildStructuredXMLPrompt(scope);
    
    try {
      if (this.useRealLLM && this.model) {
        console.log(`🧠 Appel LLM XML pour analyse de ${scope.name}...`);
        return await this.analyzeWithLLMXML(scope, prompt);
      } else {
        console.log(`🧠 Analyse heuristique XML de ${scope.name}...`);
        return this.generateStructuredAnalysisXML(scope);
      }
    } catch (error) {
      console.error('Error analyzing scope with XML:', error);
      return this.generateFallbackAnalysisXML(scope);
    }
  }

  /**
   * Analyze scope using real LLM calls with XML parsing
   */
  private async analyzeWithLLMXML(scope: TypeScriptScope, prompt: string): Promise<StructuredLLMAnalysisXML> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text().trim();
      
      console.log(`🧠 Réponse LLM XML pour ${scope.name}: ${response.slice(0, 100)}...`);

      // Parse XML response using our XML parser
      const xmlResult = await this.xmlParser.parseCodeAnalysisXML(response);
      
      if (xmlResult.success && xmlResult.data) {
        console.log(`✅ Analyse LLM XML réussie pour ${scope.name}`);
        return this.convertCodeAnalysisToStructuredAnalysis(xmlResult.data, scope);
      } else {
        console.warn(`⚠️ Parsing XML échoué pour ${scope.name}, fallback vers heuristiques`);
        return this.generateStructuredAnalysisXML(scope);
      }
      
    } catch (error) {
      console.error(`❌ Erreur LLM XML pour ${scope.name}:`, error);
      return this.generateStructuredAnalysisXML(scope); // Fallback to heuristics
    }
  }

  /**
   * Convert CodeAnalysisXML to StructuredLLMAnalysisXML
   */
  private convertCodeAnalysisToStructuredAnalysis(
    codeAnalysis: CodeAnalysisXML, 
    scope: TypeScriptScope
  ): StructuredLLMAnalysisXML {
    console.log('🔄 Conversion CodeAnalysisXML vers StructuredLLMAnalysisXML');
    console.log('   CodeAnalysis reçu:', {
      name: codeAnalysis.name,
      purpose: codeAnalysis.purpose,
      summary_bullets: codeAnalysis.summary_bullets?.length || 0,
      dependencies: codeAnalysis.dependencies?.length || 0,
      risks: codeAnalysis.risks?.length || 0,
      tags: codeAnalysis.tags?.length || 0
    });

    return {
      name: codeAnalysis.name || scope.name,
      type: scope.type,
      overall_purpose: codeAnalysis.purpose || this.inferPurpose(scope),
      summary_bullets: codeAnalysis.summary_bullets || this.generateSummaryBullets(scope),
      
      sub_scopes: [], // Will be populated from XML structure
      global_analysis: {
        architecture: this.describeArchitecture(scope),
        design_patterns: this.identifyDesignPatterns(scope),
        relationships: this.identifyRelationships(scope),
        overall_purpose: codeAnalysis.purpose || this.inferPurpose(scope),
        strengths: this.identifyStrengths(scope, []),
        weaknesses: this.identifyWeaknesses(scope, []),
        improvement_suggestions: this.generateImprovementSuggestions(scope),
        performance_notes: this.assessPerformance(scope),
        type_safety_notes: this.assessTypeSafety(scope)
      },
      
      dependencies: codeAnalysis.dependencies || scope.dependencies,
      inputs: codeAnalysis.inputs || this.extractInputs(scope),
      outputs: codeAnalysis.outputs || this.extractOutputs(scope),
      
      complexity: codeAnalysis.complexity || this.assessComplexity(scope),
      maintainability: this.assessMaintainability(scope),
      testability: this.assessTestability(scope),
      
      risks: codeAnalysis.risks || this.identifyRisks(scope),
      test_ideas: codeAnalysis.test_ideas || this.generateTestIdeas(scope),
      docstring_suggestion: codeAnalysis.docstring_suggestion || this.generateDocstringSuggestion(scope),
      tags: codeAnalysis.tags || this.generateTags(scope),
      
      type_safety_notes: this.assessTypeSafety(scope),
      async_patterns: this.identifyAsyncPatterns(scope),
      performance_notes: this.assessPerformance(scope)
    };
  }

  /**
   * Build structured XML prompt for LLM analysis
   */
  private buildStructuredXMLPrompt(scope: TypeScriptScope): string {
    return `Tu es Algareth, ingénieur senior TypeScript. Analyse ce code et fournis une évaluation technique structurée en XML.

## INSTRUCTIONS D'ANALYSE

### Phase 1: Découpage en Sous-Scopes
D'abord, découpe ce ${scope.type} en sous-éléments logiques et analyse chacun individuellement.

### Phase 2: Synthèse Globale
Ensuite, fournis une analyse globale de l'architecture et des relations.

## CODE À ANALYSER

**Métadonnées:**
- Nom: ${scope.name}
- Type: ${scope.type}
- Signature: ${scope.signature}
- Lignes: ${scope.startLine}-${scope.endLine}
- Complexité: ${scope.complexity}
- Dépendances: ${scope.dependencies.join(', ') || 'Aucune'}

**Contenu:**
<![CDATA[
${scope.contentDedented}
]]>

## FORMAT DE RÉPONSE REQUIS

Retourne un XML STRICT avec cette structure:

<code_analysis>
  <name>${scope.name}</name>
  <type>${scope.type}</type>
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
</code_analysis>

## RÈGLES IMPORTANTES

1. **Découpage intelligent** : Identifie les sous-éléments logiques (méthodes, propriétés, etc.)
2. **Analyse détaillée** : Chaque sous-scope doit avoir une analyse complète
3. **Synthèse globale** : L'analyse globale doit utiliser les insights des sous-scopes
4. **Format strict** : Respecte exactement la structure XML
5. **TypeScript focus** : Mets l'accent sur les aspects TypeScript (types, async, performance)
6. **Vision d'ingénieur** : Analyse comme un senior, pas comme un automate
7. **CDATA sections** : Utilise CDATA pour tout contenu qui pourrait contenir des caractères spéciaux

## EXEMPLES DE DÉCOUPAGE

**Pour une classe:**
- Sous-scopes: constructor, méthodes publiques, méthodes privées, propriétés

**Pour une interface:**
- Sous-scopes: propriétés, méthodes, types imbriqués

**Pour une fonction:**
- Sous-scopes: paramètres, logique principale, gestion d'erreurs, retours

Analyse maintenant ce code en suivant cette structure XML.`;
  }

  /**
   * Generate structured analysis XML (heuristic fallback)
   */
  private generateStructuredAnalysisXML(scope: TypeScriptScope): StructuredLLMAnalysisXML {
    // Découpage intelligent des sous-scopes
    const subScopes = this.extractSubScopesXML(scope);
    
    // Analyse globale basée sur les sous-scopes
    const globalAnalysis = this.generateGlobalAnalysisXML(scope, subScopes);
    
    return {
      name: scope.name,
      type: scope.type,
      overall_purpose: this.inferPurpose(scope),
      summary_bullets: this.generateSummaryBullets(scope),
      
      sub_scopes: subScopes,
      global_analysis: globalAnalysis,
      
      dependencies: scope.dependencies,
      inputs: this.extractInputs(scope),
      outputs: this.extractOutputs(scope),
      
      complexity: this.assessComplexity(scope),
      maintainability: this.assessMaintainability(scope),
      testability: this.assessTestability(scope),
      
      risks: this.identifyRisks(scope),
      test_ideas: this.generateTestIdeas(scope),
      docstring_suggestion: this.generateDocstringSuggestion(scope),
      tags: this.generateTags(scope),
      
      type_safety_notes: this.assessTypeSafety(scope),
      async_patterns: this.identifyAsyncPatterns(scope),
      performance_notes: this.assessPerformance(scope)
    };
  }

  /**
   * Extract sub-scopes from the main scope (XML version)
   */
  private extractSubScopesXML(scope: TypeScriptScope): SubScopeAnalysisXML[] {
    const subScopes: SubScopeAnalysisXML[] = [];
    
    // Si c'est une classe, analyser les méthodes et propriétés
    if (scope.type === 'class') {
      // Analyser le constructeur
      if (scope.parameters.length > 0) {
        subScopes.push({
          name: 'constructor',
          type: 'constructor',
          purpose: `Initialise une instance de ${scope.name}`,
          summary: `Constructeur avec ${scope.parameters.length} paramètre(s)`,
          inputs: scope.parameters.map(p => `${p.name}: ${p.type || 'any'}`),
          outputs: [`Instance de ${scope.name}`],
          complexity: scope.parameters.length > 3 ? 'high' : 'medium',
          risks: scope.parameters.length > 5 ? ['Trop de paramètres'] : [],
          test_ideas: ['Test avec paramètres valides', 'Test avec paramètres invalides'],
          tags: ['constructor', 'initialization', 'dependency_injection']
        });
      }
      
      // Analyser les méthodes (simulé - dans la vraie implémentation, on analyserait les enfants)
      if (scope.complexity > 5) {
        subScopes.push({
          name: 'main_method',
          type: 'method',
          purpose: 'Méthode principale de la classe',
          summary: 'Méthode avec logique complexe',
          inputs: ['Paramètres de la méthode'],
          outputs: ['Résultat de la méthode'],
          complexity: 'high',
          risks: ['Complexité élevée', 'Difficile à tester'],
          test_ideas: ['Test avec cas normaux', 'Test avec cas limites'],
          tags: ['main_logic', 'complex_method', 'business_logic']
        });
      }
    }
    
    // Si c'est une fonction, analyser les parties
    if (scope.type === 'function') {
      subScopes.push({
        name: 'function_body',
        type: 'method',
        purpose: `Exécute la logique de ${scope.name}`,
        summary: `Fonction avec ${scope.parameters.length} paramètre(s)`,
        inputs: scope.parameters.map(p => `${p.name}: ${p.type || 'any'}`),
        outputs: [scope.returnType || 'void'],
        complexity: scope.complexity > 5 ? 'high' : 'medium',
        risks: scope.complexity > 10 ? ['Logique complexe'] : [],
        test_ideas: ['Test avec paramètres valides', 'Test de performance'],
        tags: ['function', 'logic', 'computation']
      });
    }
    
    return subScopes;
  }

  /**
   * Generate global analysis based on sub-scopes (XML version)
   */
  private generateGlobalAnalysisXML(scope: TypeScriptScope, subScopes: SubScopeAnalysisXML[]): GlobalAnalysisXML {
    return {
      architecture: this.describeArchitecture(scope),
      design_patterns: this.identifyDesignPatterns(scope),
      relationships: this.identifyRelationships(scope),
      overall_purpose: this.inferPurpose(scope),
      strengths: this.identifyStrengths(scope, subScopes),
      weaknesses: this.identifyWeaknesses(scope, subScopes),
      improvement_suggestions: this.generateImprovementSuggestions(scope),
      performance_notes: this.assessPerformance(scope),
      type_safety_notes: this.assessTypeSafety(scope)
    };
  }

  /**
   * Generate fallback analysis when LLM fails (XML version)
   */
  private generateFallbackAnalysisXML(scope: TypeScriptScope): StructuredLLMAnalysisXML {
    return {
      name: scope.name,
      type: scope.type,
      overall_purpose: `Fonctionnalité ${scope.type}`,
      summary_bullets: ['Analyse non disponible'],
      
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
      inputs: [],
      outputs: [],
      
      complexity: 'medium',
      maintainability: 'medium',
      testability: 'medium',
      
      risks: ['Analyse limitée'],
      test_ideas: ['Tests basiques'],
      docstring_suggestion: 'Ajouter une docstring',
      tags: ['unanalyzed'],
      
      type_safety_notes: ['Analyse de sécurité des types non disponible'],
      async_patterns: [],
      performance_notes: ['Analyse de performance non disponible']
    };
  }

  // Helper methods (same as original, but adapted for XML)
  private inferPurpose(scope: TypeScriptScope): string {
    const name = scope.name.toLowerCase();
    if (name.includes('manager')) return 'Gestion de ressources';
    if (name.includes('service')) return 'Service métier';
    if (name.includes('engine')) return 'Moteur de traitement';
    if (name.includes('parser')) return 'Analyse de données';
    if (name.includes('validator')) return 'Validation de données';
    return 'Fonctionnalité générale';
  }

  private generateSummaryBullets(scope: TypeScriptScope): string[] {
    return [
      `${scope.type} ${scope.name} avec ${scope.parameters.length} paramètre(s)`,
      `Complexité: ${scope.complexity}`,
      `Dépendances: ${scope.dependencies.length}`
    ];
  }

  private extractInputs(scope: TypeScriptScope): string[] {
    return scope.parameters.map(p => `${p.name}: ${p.type || 'any'}`);
  }

  private extractOutputs(scope: TypeScriptScope): string[] {
    return scope.returnType ? [scope.returnType] : ['void'];
  }

  private assessComplexity(scope: TypeScriptScope): 'low' | 'medium' | 'high' {
    if (scope.complexity < 5) return 'low';
    if (scope.complexity < 15) return 'medium';
    return 'high';
  }

  private assessMaintainability(scope: TypeScriptScope): 'low' | 'medium' | 'high' {
    if (scope.dependencies.length > 10) return 'low';
    if (scope.dependencies.length > 5) return 'medium';
    return 'high';
  }

  private assessTestability(scope: TypeScriptScope): 'low' | 'medium' | 'high' {
    if (scope.complexity > 15) return 'low';
    if (scope.complexity > 8) return 'medium';
    return 'high';
  }

  private identifyRisks(scope: TypeScriptScope): string[] {
    const risks: string[] = [];
    if (scope.complexity > 15) risks.push('Complexité élevée');
    if (scope.dependencies.length > 8) risks.push('Couplage fort');
    if (scope.parameters.length > 5) risks.push('Trop de paramètres');
    return risks;
  }

  private generateTestIdeas(scope: TypeScriptScope): string[] {
    return [
      'Test avec paramètres valides',
      'Test avec paramètres invalides',
      'Test de performance'
    ];
  }

  private generateDocstringSuggestion(scope: TypeScriptScope): string {
    return `Documentation pour ${scope.name} - ${this.inferPurpose(scope)}`;
  }

  private generateTags(scope: TypeScriptScope): string[] {
    const tags = [scope.type];
    if (scope.complexity > 10) tags.push('complex');
    if (scope.dependencies.length > 5) tags.push('coupled');
    return tags;
  }

  private assessTypeSafety(scope: TypeScriptScope): string[] {
    const notes: string[] = [];
    if (scope.parameters.some(p => !p.type)) notes.push('Types manquants sur certains paramètres');
    if (!scope.returnType) notes.push('Type de retour non spécifié');
    return notes;
  }

  private identifyAsyncPatterns(scope: TypeScriptScope): string[] {
    const patterns: string[] = [];
    if (scope.content.includes('async')) patterns.push('async/await');
    if (scope.content.includes('Promise')) patterns.push('Promise');
    return patterns;
  }

  private assessPerformance(scope: TypeScriptScope): string[] {
    const notes: string[] = [];
    if (scope.complexity > 10) notes.push('Complexité élevée - vérifier les performances');
    return notes;
  }

  private describeArchitecture(scope: TypeScriptScope): string {
    return `Architecture ${scope.type} avec ${scope.parameters.length} paramètre(s) et complexité ${scope.complexity}`;
  }

  private identifyDesignPatterns(scope: TypeScriptScope): string[] {
    const patterns: string[] = [];
    if (scope.name.includes('Manager')) patterns.push('Manager Pattern');
    if (scope.name.includes('Factory')) patterns.push('Factory Pattern');
    return patterns;
  }

  private identifyRelationships(scope: TypeScriptScope): string[] {
    return scope.dependencies.map(dep => `Dépend de ${dep}`);
  }

  private identifyStrengths(scope: TypeScriptScope, subScopes: SubScopeAnalysisXML[]): string[] {
    const strengths: string[] = [];
    if (scope.astValid) strengths.push('Code valide');
    if (scope.complexity < 10) strengths.push('Complexité raisonnable');
    return strengths;
  }

  private identifyWeaknesses(scope: TypeScriptScope, subScopes: SubScopeAnalysisXML[]): string[] {
    const weaknesses: string[] = [];
    if (scope.complexity > 15) weaknesses.push('Complexité élevée');
    if (scope.dependencies.length > 8) weaknesses.push('Trop de dépendances');
    return weaknesses;
  }

  private generateImprovementSuggestions(scope: TypeScriptScope): string[] {
    const suggestions: string[] = [];
    if (scope.complexity > 15) suggestions.push('Refactoriser pour réduire la complexité');
    if (scope.dependencies.length > 8) suggestions.push('Réduire les dépendances');
    return suggestions;
  }
}