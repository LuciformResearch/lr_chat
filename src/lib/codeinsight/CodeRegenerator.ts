/**
 * Code Regenerator - Utilise les analyses CodeInsight pour régénérer du code optimisé
 * 
 * Prend un scope analysé et génère une version moderne et optimisée
 */

import { TypeScriptScope } from './TypeScriptParser';
import { ImprovedScopeAnalysis } from './ImprovedCodeAnalyzer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

export interface RegenerationRequest {
  scope: TypeScriptScope;
  analysis: ImprovedScopeAnalysis;
  targetTypeScriptVersion: string;
  modernizationLevel: 'conservative' | 'moderate' | 'aggressive';
  includeTests: boolean;
  includeDocumentation: boolean;
}

export interface RegenerationResult {
  success: boolean;
  originalCode: string;
  regeneratedCode: string;
  improvements: string[];
  changes: CodeChange[];
  confidence: number;
  metadata: {
    generationTime: number;
    algorithm: string;
    parameters: any;
  };
}

export interface CodeChange {
  type: 'refactor' | 'optimize' | 'modernize' | 'fix' | 'add';
  description: string;
  before: string;
  after: string;
  line?: number;
}

export class CodeRegenerator {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private isInitialized: boolean = false;
  private artefactsPath: string;

  constructor() {
    // Load environment variables
    loadShadeosEnv({ override: true });
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found, using fallback regeneration');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.isInitialized = true;
      this.artefactsPath = path.join(process.cwd(), 'artefacts/codeinsight');
      console.log('✅ Code Regenerator with LLM initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Code Regenerator:', error);
    }
  }

  /**
   * Régénère un scope basé sur son analyse CodeInsight
   */
  async regenerateScope(request: RegenerationRequest): Promise<RegenerationResult> {
    if (!this.isInitialized) {
      return this.generateFallbackRegeneration(request);
    }

    const prompt = this.buildRegenerationPrompt(request);
    
    try {
      console.log(`🔄 Régénération du scope ${request.scope.type} ${request.scope.name}...`);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const regeneration = this.parseRegenerationResponse(text, request);
      
      // Sauvegarder les artefacts
      await this.saveArtefacts(request, regeneration);
      
      return regeneration;
    } catch (error) {
      console.error('❌ Régénération échouée:', error);
      return this.generateFallbackRegeneration(request);
    }
  }

  /**
   * Construit le prompt de régénération
   */
  private buildRegenerationPrompt(request: RegenerationRequest): string {
    const { scope, analysis, targetTypeScriptVersion, modernizationLevel, includeTests, includeDocumentation } = request;

    return `
You are an expert TypeScript developer specializing in code modernization and optimization.

**TASK**: Regenerate the following code based on CodeInsight analysis to make it modern, optimized, and maintainable.

**ORIGINAL CODE:**
\`\`\`typescript
${scope.content}
\`\`\`

**CODEINSIGHT ANALYSIS:**
- Summary: ${analysis.summary}
- Purpose: ${analysis.purpose}
- Complexity: ${analysis.complexity}/10
- Maintainability: ${analysis.maintainability}/10
- Testability: ${analysis.testability}/10

**STRENGTHS:**
${analysis.strengths.map(s => `- ${s}`).join('\n')}

**WEAKNESSES:**
${analysis.weaknesses.map(w => `- ${w}`).join('\n')}

**RECOMMENDATIONS:**
${analysis.recommendations.map(r => `- ${r}`).join('\n')}

**AI INSIGHTS:**
${analysis.aiInsights.map(i => `- ${i}`).join('\n')}

**REFACTORING SUGGESTIONS:**
${analysis.refactoringSuggestions.map(s => `- ${s}`).join('\n')}

**REQUIREMENTS:**
- Target TypeScript: ${targetTypeScriptVersion}
- Modernization Level: ${modernizationLevel}
- Include Tests: ${includeTests}
- Include Documentation: ${includeDocumentation}

**MODERNIZATION GUIDELINES:**
${this.getModernizationGuidelines(modernizationLevel)}

**RESPONSE FORMAT:**
Respond in JSON format:
{
  "regeneratedCode": "// Modern TypeScript code here",
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "changes": [
    {
      "type": "refactor|optimize|modernize|fix|add",
      "description": "What was changed",
      "before": "old code snippet",
      "after": "new code snippet",
      "line": 10
    }
  ],
  "confidence": 0.8,
  "explanation": "Why these changes were made"
}

**FOCUS ON:**
- Modern TypeScript features (strict mode, proper typing)
- Performance optimizations
- Error handling and validation
- Code readability and maintainability
- SOLID principles
- Design patterns
- Best practices
- Type safety
`;
  }

  /**
   * Obtient les guidelines de modernisation selon le niveau
   */
  private getModernizationGuidelines(level: string): string {
    switch (level) {
      case 'conservative':
        return `
- Keep existing structure and logic
- Only fix obvious issues and add type safety
- Minimal changes to preserve functionality
- Focus on TypeScript strict mode compliance
`;
      case 'moderate':
        return `
- Refactor for better structure
- Add proper error handling
- Improve type safety and interfaces
- Apply basic design patterns
- Optimize performance where obvious
`;
      case 'aggressive':
        return `
- Complete architectural refactoring
- Apply advanced design patterns
- Modern ES6+ features
- Performance optimizations
- Comprehensive error handling
- Full type safety
- Clean code principles
`;
      default:
        return '- Apply best practices and modern TypeScript features';
    }
  }

  /**
   * Parse la réponse de régénération
   */
  private parseRegenerationResponse(text: string, request: RegenerationRequest): RegenerationResult {
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in regeneration response');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      return {
        success: true,
        originalCode: request.scope.content,
        regeneratedCode: data.regeneratedCode || request.scope.content,
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        changes: Array.isArray(data.changes) ? data.changes : [],
        confidence: Math.max(0, Math.min(1, data.confidence || 0.5)),
        metadata: {
          generationTime: Date.now(),
          algorithm: 'gemini-1.5-flash',
          parameters: {
            scope: request.scope.name,
            modernizationLevel: request.modernizationLevel,
            targetTypeScript: request.targetTypeScriptVersion
          }
        }
      };
    } catch (error) {
      console.error('❌ Failed to parse regeneration response:', error);
      return this.generateFallbackRegeneration(request);
    }
  }

  /**
   * Sauvegarde les artefacts d'analyse et de régénération
   */
  private async saveArtefacts(request: RegenerationRequest, result: RegenerationResult): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const scopeName = request.scope.name.replace(/[^a-zA-Z0-9]/g, '_');
      
      // Sauvegarder l'analyse originale
      const analysisPath = path.join(this.artefactsPath, 'analyses', `${scopeName}_analysis_${timestamp}.json`);
      const analysisData = {
        scope: request.scope,
        analysis: request.analysis,
        timestamp: new Date().toISOString(),
        metadata: {
          type: request.scope.type,
          complexity: request.scope.complexity,
          lines: request.scope.endLine - request.scope.startLine
        }
      };
      fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2));
      
      // Sauvegarder le code régénéré
      const regeneratedPath = path.join(this.artefactsPath, 'regenerated', `${scopeName}_regenerated_${timestamp}.ts`);
      fs.writeFileSync(regeneratedPath, result.regeneratedCode);
      
      // Sauvegarder la comparaison
      const comparisonPath = path.join(this.artefactsPath, 'comparisons', `${scopeName}_comparison_${timestamp}.md`);
      const comparisonContent = this.generateComparisonMarkdown(request, result);
      fs.writeFileSync(comparisonPath, comparisonContent);
      
      console.log(`📁 Artefacts sauvegardés:`);
      console.log(`   Analyse: ${analysisPath}`);
      console.log(`   Code régénéré: ${regeneratedPath}`);
      console.log(`   Comparaison: ${comparisonPath}`);
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde artefacts:', error);
    }
  }

  /**
   * Génère le markdown de comparaison
   */
  private generateComparisonMarkdown(request: RegenerationRequest, result: RegenerationResult): string {
    return `# Comparaison de régénération - ${request.scope.name}

## 📊 Analyse originale

**Scope:** ${request.scope.type} ${request.scope.name}  
**Lignes:** ${request.scope.startLine}-${request.scope.endLine}  
**Complexité:** ${request.scope.complexity}  

### Résumé
${request.analysis.summary}

### But
${request.analysis.purpose}

### Métriques
- **Complexité:** ${request.analysis.complexity}/10
- **Maintenabilité:** ${request.analysis.maintainability}/10
- **Testabilité:** ${request.analysis.testability}/10

## 🔄 Régénération

**Niveau de modernisation:** ${request.modernizationLevel}  
**TypeScript cible:** ${request.targetTypeScriptVersion}  
**Confiance:** ${(result.confidence * 100).toFixed(1)}%  

### Améliorations apportées
${result.improvements.map(imp => `- ${imp}`).join('\n')}

### Changements détaillés
${result.changes.map(change => `
#### ${change.type.toUpperCase()}: ${change.description}
\`\`\`diff
- ${change.before}
+ ${change.after}
\`\`\`
`).join('\n')}

## 📝 Code original
\`\`\`typescript
${result.originalCode}
\`\`\`

## ✨ Code régénéré
\`\`\`typescript
${result.regeneratedCode}
\`\`\`

## 📈 Métadonnées
- **Temps de génération:** ${new Date(result.metadata.generationTime).toISOString()}
- **Algorithme:** ${result.metadata.algorithm}
- **Paramètres:** ${JSON.stringify(result.metadata.parameters, null, 2)}
`;
  }

  /**
   * Génère une régénération de fallback
   */
  private generateFallbackRegeneration(request: RegenerationRequest): RegenerationResult {
    return {
      success: false,
      originalCode: request.scope.content,
      regeneratedCode: request.scope.content,
      improvements: ['Régénération non disponible - LLM indisponible'],
      changes: [],
      confidence: 0.1,
      metadata: {
        generationTime: Date.now(),
        algorithm: 'fallback',
        parameters: request
      }
    };
  }
}