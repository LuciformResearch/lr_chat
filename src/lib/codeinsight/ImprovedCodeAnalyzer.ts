/**
 * Improved Code Analyzer with Real LLM Integration
 * 
 * Replaces mocks with actual LLM calls for intelligent code analysis
 */

import { TypeScriptScope, CodeInsightReport, TypeScriptMetrics } from './TypeScriptParser';
import { PatternAnalysis } from './PatternAnalyzer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

export interface ImprovedScopeAnalysis {
  summary: string;
  purpose: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  complexity: number;
  maintainability: number;
  testability: number;
  aiInsights: string[];
  refactoringSuggestions: string[];
}

export class ImprovedCodeAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private isInitialized: boolean = false;

  constructor() {
    // Load environment variables
    loadShadeosEnv({ override: true });
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found, using fallback analysis');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.isInitialized = true;
      console.log('✅ Improved CodeAnalyzer with LLM initialized');
    } catch (error) {
      console.error('❌ Failed to initialize LLM analyzer:', error);
    }
  }

  /**
   * Analyze a TypeScript scope using real LLM calls
   */
  async analyzeScope(scope: TypeScriptScope, context: string = ''): Promise<ImprovedScopeAnalysis> {
    if (!this.isInitialized) {
      return this.generateFallbackAnalysis(scope);
    }

    const prompt = this.buildAnalysisPrompt(scope, context);
    
    try {
      console.log(`🧠 Analyzing ${scope.type} ${scope.name} with LLM...`);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return this.parseLLMResponse(text, scope);
    } catch (error) {
      console.error('❌ LLM analysis failed:', error);
      return this.generateFallbackAnalysis(scope);
    }
  }

  /**
   * Generate a comprehensive code insight report with LLM
   */
  async generateReport(
    file: string, 
    scopes: TypeScriptScope[], 
    patterns: PatternAnalysis,
    metrics: TypeScriptMetrics
  ): Promise<CodeInsightReport> {
    console.log(`🔍 Generating improved CodeInsight report for ${file}...`);

    const recommendations: string[] = [];
    const scopeAnalyses: ImprovedScopeAnalysis[] = [];

    // Analyze each scope with LLM
    for (const scope of scopes) {
      const analysis = await this.analyzeScope(scope, file);
      scopeAnalyses.push(analysis);
      
      // Collect recommendations
      recommendations.push(...analysis.recommendations);
      recommendations.push(...analysis.refactoringSuggestions);
    }

    // Generate overall recommendations with LLM
    const overallRecommendations = await this.generateOverallRecommendations(
      scopes, patterns, metrics, scopeAnalyses
    );
    recommendations.push(...overallRecommendations);

    // Generate summary with LLM
    const summary = await this.generateSummary(scopes, patterns, metrics, scopeAnalyses);

    return {
      file,
      scopes,
      patterns,
      metrics,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      summary
    };
  }

  /**
   * Build comprehensive analysis prompt for LLM
   */
  private buildAnalysisPrompt(scope: TypeScriptScope, context: string): string {
    return `
You are an expert TypeScript code analyst specializing in code quality, maintainability, and best practices.

Analyze this ${scope.type} and provide a comprehensive assessment:

**CODE TO ANALYZE:**
\`\`\`typescript
${scope.content}
\`\`\`

**SCOPE INFORMATION:**
- Name: ${scope.name}
- Type: ${scope.type}
- Lines: ${scope.startLine}-${scope.endLine}
- Complexity: ${scope.complexity}
- Modifiers: ${scope.modifiers.join(', ')}
- Dependencies: ${scope.dependencies.join(', ')}
- Parameters: ${scope.parameters?.join(', ') || 'none'}
- Return Type: ${scope.returnType || 'none'}

**CONTEXT:**
${context}

**ANALYSIS REQUIREMENTS:**
Provide a detailed analysis covering:

1. **Summary**: Brief description of what this code does
2. **Purpose**: The main purpose and responsibility
3. **Strengths**: What the code does well (3-5 points)
4. **Weaknesses**: Areas for improvement (3-5 points)
5. **Recommendations**: Specific actionable improvements (3-5 points)
6. **Complexity Assessment**: Rate complexity 1-10
7. **Maintainability**: Rate maintainability 1-10
8. **Testability**: Rate testability 1-10
9. **AI Insights**: Advanced insights about patterns, architecture, etc.
10. **Refactoring Suggestions**: Specific refactoring ideas

**RESPONSE FORMAT:**
Respond in JSON format:
{
  "summary": "Brief description",
  "purpose": "Main purpose",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "complexity": 5,
  "maintainability": 7,
  "testability": 6,
  "aiInsights": ["insight1", "insight2"],
  "refactoringSuggestions": ["suggestion1", "suggestion2"]
}

**FOCUS ON:**
- TypeScript best practices
- Code readability and maintainability
- Performance considerations
- Error handling
- Type safety
- Design patterns
- SOLID principles
- Modern JavaScript/TypeScript features
`;
  }

  /**
   * Parse LLM response into structured analysis
   */
  private parseLLMResponse(text: string, scope: TypeScriptScope): ImprovedScopeAnalysis {
    try {
      // Extract JSON from response (handle cases where LLM adds extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      return {
        summary: data.summary || `${scope.type} ${scope.name} - Analysis unavailable`,
        purpose: data.purpose || 'Purpose not determined',
        strengths: Array.isArray(data.strengths) ? data.strengths : ['Code structured'],
        weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : ['Analysis limited'],
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : ['Improve documentation'],
        complexity: Math.max(1, Math.min(10, data.complexity || scope.complexity)),
        maintainability: Math.max(1, Math.min(10, data.maintainability || 5)),
        testability: Math.max(1, Math.min(10, data.testability || 5)),
        aiInsights: Array.isArray(data.aiInsights) ? data.aiInsights : ['AI analysis unavailable'],
        refactoringSuggestions: Array.isArray(data.refactoringSuggestions) ? data.refactoringSuggestions : ['Consider refactoring']
      };
    } catch (error) {
      console.error('❌ Failed to parse LLM response:', error);
      return this.generateFallbackAnalysis(scope);
    }
  }

  /**
   * Generate overall recommendations using LLM
   */
  private async generateOverallRecommendations(
    scopes: TypeScriptScope[],
    patterns: PatternAnalysis,
    metrics: TypeScriptMetrics,
    scopeAnalyses: ImprovedScopeAnalysis[]
  ): Promise<string[]> {
    if (!this.isInitialized) {
      return this.generateHeuristicRecommendations(scopes, patterns, metrics);
    }

    const prompt = `
You are an expert code reviewer analyzing a TypeScript file.

**FILE ANALYSIS:**
- Total scopes: ${scopes.length}
- Total lines: ${metrics.linesOfCode}
- Average complexity: ${metrics.cyclomaticComplexity / scopes.length}
- Maintainability index: ${metrics.maintainabilityIndex}/10

**SCOPE ANALYSES:**
${scopeAnalyses.map((analysis, index) => `
${index + 1}. ${scopes[index].type} ${scopes[index].name}:
   - Summary: ${analysis.summary}
   - Main issues: ${analysis.weaknesses.slice(0, 2).join(', ')}
   - Key recommendations: ${analysis.recommendations.slice(0, 2).join(', ')}
`).join('')}

**PATTERNS DETECTED:**
- Design patterns: ${patterns.designPatterns.join(', ') || 'none'}
- Anti-patterns: ${patterns.antiPatterns.join(', ') || 'none'}
- Performance issues: ${patterns.performanceIssues.join(', ') || 'none'}

Provide 5-7 high-level recommendations for improving this file overall.

Respond in JSON format:
{
  "recommendations": ["rec1", "rec2", "rec3", "rec4", "rec5"]
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return Array.isArray(data.recommendations) ? data.recommendations : [];
      }
    } catch (error) {
      console.error('❌ LLM overall recommendations failed:', error);
    }

    return this.generateHeuristicRecommendations(scopes, patterns, metrics);
  }

  /**
   * Generate summary using LLM
   */
  private async generateSummary(
    scopes: TypeScriptScope[],
    patterns: PatternAnalysis,
    metrics: TypeScriptMetrics,
    scopeAnalyses: ImprovedScopeAnalysis[]
  ): Promise<string> {
    if (!this.isInitialized) {
      return this.generateHeuristicSummary(scopes, patterns, metrics);
    }

    const prompt = `
You are an expert code analyst. Provide a concise summary of this TypeScript file analysis.

**FILE METRICS:**
- Scopes: ${scopes.length} (${scopes.filter(s => s.type === 'class').length} classes, ${scopes.filter(s => s.type === 'function').length} functions)
- Lines of code: ${metrics.linesOfCode}
- Complexity: ${metrics.cyclomaticComplexity}
- Maintainability: ${metrics.maintainabilityIndex}/10

**KEY FINDINGS:**
${scopeAnalyses.slice(0, 3).map((analysis, index) => `
- ${scopes[index].name}: ${analysis.summary}
`).join('')}

**PATTERNS:**
- Design patterns: ${patterns.designPatterns.length}
- Anti-patterns: ${patterns.antiPatterns.length}
- Performance issues: ${patterns.performanceIssues.length}

Provide a 2-3 sentence summary of the overall code quality and main areas for improvement.

Respond with just the summary text, no JSON formatting.
`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('❌ LLM summary generation failed:', error);
    }

    return this.generateHeuristicSummary(scopes, patterns, metrics);
  }

  /**
   * Generate fallback analysis when LLM is not available
   */
  private generateFallbackAnalysis(scope: TypeScriptScope): ImprovedScopeAnalysis {
    return {
      summary: `${scope.type} ${scope.name} - Fallback analysis`,
      purpose: 'Fonctionnalité non déterminée',
      strengths: ['Code structuré'],
      weaknesses: ['Analyse limitée'],
      recommendations: ['Améliorer la documentation'],
      complexity: scope.complexity,
      maintainability: 5,
      testability: 5,
      aiInsights: ['LLM analysis unavailable'],
      refactoringSuggestions: ['Consider manual review']
    };
  }

  /**
   * Generate heuristic recommendations (fallback)
   */
  private generateHeuristicRecommendations(
    scopes: TypeScriptScope[],
    patterns: PatternAnalysis,
    metrics: TypeScriptMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.cyclomaticComplexity > 20) {
      recommendations.push('Réduire la complexité cyclomatique globale');
    }
    if (metrics.maintainabilityIndex < 6) {
      recommendations.push('Améliorer la maintenabilité générale');
    }
    if (patterns.antiPatterns.length > 3) {
      recommendations.push('Refactoriser les anti-patterns détectés');
    }
    if (patterns.performanceIssues.length > 2) {
      recommendations.push('Optimiser les performances');
    }

    return recommendations;
  }

  /**
   * Generate heuristic summary (fallback)
   */
  private generateHeuristicSummary(
    scopes: TypeScriptScope[],
    patterns: PatternAnalysis,
    metrics: TypeScriptMetrics
  ): string {
    const scopeCount = scopes.length;
    const classCount = scopes.filter(s => s.type === 'class').length;
    const functionCount = scopes.filter(s => s.type === 'function').length;

    return `Analyse de ${scopeCount} scopes (${classCount} classes, ${functionCount} fonctions). ` +
           `Complexité: ${metrics.cyclomaticComplexity}, Maintenabilité: ${metrics.maintainabilityIndex}/10. ` +
           `${patterns.antiPatterns.length} anti-patterns détectés.`;
  }
}