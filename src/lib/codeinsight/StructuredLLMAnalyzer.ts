/**
 * Structured LLM Analyzer
 * 
 * Analyzes TypeScript scopes using structured prompts that ask the LLM
 * to break down explanations into sub-scopes before providing global insights.
 */

import { TypeScriptScope } from './StructuredTypeScriptParser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadShadeosEnv } from '@/lib/utils/SecureEnvManager';

export interface SubScopeAnalysis {
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

export interface GlobalAnalysis {
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

export interface StructuredLLMAnalysis {
  name: string;
  type: string;
  overall_purpose: string;
  summary_bullets: string[];
  
  // Sub-scopes analysis (découpé par l'LLM)
  sub_scopes: SubScopeAnalysis[];
  
  // Global analysis (synthèse)
  global_analysis: GlobalAnalysis;
  
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

export class StructuredLLMAnalyzer {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private useRealLLM: boolean = false;

  constructor() {
    // Charger les variables d'environnement comme dans le memory engine
    loadShadeosEnv();
    
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.useRealLLM = true;
      console.log('🧠 StructuredLLMAnalyzer initialisé avec vrais appels LLM (Gemini)');
      console.log(`🔑 Clé API: ${geminiApiKey.substring(0, 20)}...`);
    } else {
      console.log('🧠 StructuredLLMAnalyzer initialisé en mode heuristique');
      console.log('⚠️ GEMINI_API_KEY non trouvée dans ~/.shadeos_env');
    }
  }

  /**
   * Analyze a TypeScript scope with structured breakdown
   */
  async analyzeScope(scope: TypeScriptScope): Promise<StructuredLLMAnalysis> {
    const prompt = this.buildStructuredPrompt(scope);
    
    try {
      if (this.useRealLLM && this.model) {
        console.log(`🧠 Appel LLM pour analyse de ${scope.name}...`);
        return await this.analyzeWithLLM(scope, prompt);
      } else {
        console.log(`🧠 Analyse heuristique de ${scope.name}...`);
        return this.generateStructuredAnalysis(scope);
      }
    } catch (error) {
      console.error('Error analyzing scope:', error);
      return this.generateFallbackAnalysis(scope);
    }
  }

  /**
   * Analyze scope using real LLM calls
   */
  private async analyzeWithLLM(scope: TypeScriptScope, prompt: string): Promise<StructuredLLMAnalysis> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text().trim();
      
      console.log(`🧠 Réponse LLM pour ${scope.name}: ${response.slice(0, 100)}...`);

      // Parse JSON response
      const analysis = this.parseLLMResponse(response, scope);
      
      if (analysis) {
        console.log(`✅ Analyse LLM réussie pour ${scope.name}`);
        return analysis;
      } else {
        console.warn(`⚠️ Parsing JSON échoué pour ${scope.name}, fallback vers heuristiques`);
        return this.generateStructuredAnalysis(scope);
      }
      
    } catch (error) {
      console.error(`❌ Erreur LLM pour ${scope.name}:`, error);
      return this.generateStructuredAnalysis(scope); // Fallback to heuristics
    }
  }

  /**
   * Parse LLM JSON response
   */
  private parseLLMResponse(content: string, scope: TypeScriptScope): StructuredLLMAnalysis | null {
    try {
      // Extract JSON from response (handle cases where LLM adds extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('Aucun JSON trouvé dans la réponse LLM');
        return null;
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      // Validate and transform the response
      return this.validateAndTransformLLMResponse(parsed, scope);
      
    } catch (error) {
      console.error('Erreur parsing JSON LLM:', error);
      return null;
    }
  }

  /**
   * Validate and transform LLM response to our interface
   */
  private validateAndTransformLLMResponse(parsed: any, scope: TypeScriptScope): StructuredLLMAnalysis {
    return {
      name: parsed.name || scope.name,
      type: parsed.type || scope.type,
      overall_purpose: parsed.overall_purpose || this.inferPurpose(scope),
      summary_bullets: parsed.summary_bullets || this.generateSummaryBullets(scope),
      
      sub_scopes: parsed.sub_scopes || [],
      global_analysis: parsed.global_analysis || this.generateGlobalAnalysis(scope, []),
      
      dependencies: parsed.dependencies || scope.dependencies,
      inputs: parsed.inputs || this.extractInputs(scope),
      outputs: parsed.outputs || this.extractOutputs(scope),
      
      complexity: parsed.complexity || this.assessComplexity(scope),
      maintainability: parsed.maintainability || this.assessMaintainability(scope),
      testability: parsed.testability || this.assessTestability(scope),
      
      risks: parsed.risks || this.identifyRisks(scope),
      test_ideas: parsed.test_ideas || this.generateTestIdeas(scope),
      docstring_suggestion: parsed.docstring_suggestion || this.generateDocstringSuggestion(scope),
      tags: parsed.tags || this.generateTags(scope),
      
      type_safety_notes: parsed.type_safety_notes || this.assessTypeSafety(scope),
      async_patterns: parsed.async_patterns || this.identifyAsyncPatterns(scope),
      performance_notes: parsed.performance_notes || this.assessPerformance(scope)
    };
  }

  /**
   * Build structured prompt for LLM analysis
   */
  private buildStructuredPrompt(scope: TypeScriptScope): string {
    return `
Tu es Algareth, ingénieur senior TypeScript. Analyse ce code et fournis une évaluation technique structurée.

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
\`\`\`typescript
${scope.contentDedented}
\`\`\`

## FORMAT DE RÉPONSE REQUIS

Retourne un JSON STRICT avec cette structure:

\`\`\`json
{
  "name": "${scope.name}",
  "type": "${scope.type}",
  "overall_purpose": "Une phrase claire du but principal",
  "summary_bullets": [
    "Point clé 1",
    "Point clé 2",
    "Point clé 3"
  ],
  "sub_scopes": [
    {
      "name": "nom_du_sous_scope",
      "type": "method|property|constructor|interface_member",
      "purpose": "But de ce sous-scope",
      "summary": "Résumé de ce que fait ce sous-scope",
      "inputs": ["paramètre 1", "paramètre 2"],
      "outputs": ["retour 1", "effet de bord 1"],
      "complexity": "low|medium|high",
      "risks": ["risque 1", "risque 2"],
      "test_ideas": ["test 1", "test 2"],
      "tags": ["tag1", "tag2", "tag3"]
    }
  ],
  "global_analysis": {
    "architecture": "Description de l'architecture générale",
    "design_patterns": ["pattern1", "pattern2"],
    "relationships": ["relation1", "relation2"],
    "overall_purpose": "But global du scope",
    "strengths": ["force1", "force2"],
    "weaknesses": ["faiblesse1", "faiblesse2"],
    "improvement_suggestions": ["suggestion1", "suggestion2"],
    "performance_notes": ["note1", "note2"],
    "type_safety_notes": ["note1", "note2"]
  },
  "dependencies": ["dep1", "dep2"],
  "inputs": ["input1", "input2"],
  "outputs": ["output1", "output2"],
  "complexity": "low|medium|high",
  "maintainability": "low|medium|high",
  "testability": "low|medium|high",
  "risks": ["risque global 1", "risque global 2"],
  "test_ideas": ["test global 1", "test global 2"],
  "docstring_suggestion": "Suggestion de docstring complète",
  "tags": ["tag1", "tag2", "tag3"],
  "type_safety_notes": ["note1", "note2"],
  "async_patterns": ["pattern1", "pattern2"],
  "performance_notes": ["note1", "note2"]
}
\`\`\`

## RÈGLES IMPORTANTES

1. **Découpage intelligent** : Identifie les sous-éléments logiques (méthodes, propriétés, etc.)
2. **Analyse détaillée** : Chaque sous-scope doit avoir une analyse complète
3. **Synthèse globale** : L'analyse globale doit utiliser les insights des sous-scopes
4. **Format strict** : Respecte exactement la structure JSON
5. **TypeScript focus** : Mets l'accent sur les aspects TypeScript (types, async, performance)
6. **Vision d'ingénieur** : Analyse comme un senior, pas comme un automate

## EXEMPLES DE DÉCOUPAGE

**Pour une classe:**
- Sous-scopes: constructor, méthodes publiques, méthodes privées, propriétés

**Pour une interface:**
- Sous-scopes: propriétés, méthodes, types imbriqués

**Pour une fonction:**
- Sous-scopes: paramètres, logique principale, gestion d'erreurs, retours

Analyse maintenant ce code en suivant cette structure.
`;
  }

  /**
   * Generate structured analysis (heuristic fallback)
   */
  private generateStructuredAnalysis(scope: TypeScriptScope): StructuredLLMAnalysis {
    // Découpage intelligent des sous-scopes
    const subScopes = this.extractSubScopes(scope);
    
    // Analyse globale basée sur les sous-scopes
    const globalAnalysis = this.generateGlobalAnalysis(scope, subScopes);
    
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
   * Extract sub-scopes from the main scope
   */
  private extractSubScopes(scope: TypeScriptScope): SubScopeAnalysis[] {
    const subScopes: SubScopeAnalysis[] = [];
    
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
   * Generate global analysis based on sub-scopes
   */
  private generateGlobalAnalysis(scope: TypeScriptScope, subScopes: SubScopeAnalysis[]): GlobalAnalysis {
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
   * Generate fallback analysis when LLM fails
   */
  private generateFallbackAnalysis(scope: TypeScriptScope): StructuredLLMAnalysis {
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

  // Helper methods for analysis generation
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

  private identifyStrengths(scope: TypeScriptScope, subScopes: SubScopeAnalysis[]): string[] {
    const strengths: string[] = [];
    if (scope.astValid) strengths.push('Code valide');
    if (scope.complexity < 10) strengths.push('Complexité raisonnable');
    return strengths;
  }

  private identifyWeaknesses(scope: TypeScriptScope, subScopes: SubScopeAnalysis[]): string[] {
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