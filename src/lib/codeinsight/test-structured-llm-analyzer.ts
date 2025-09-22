/**
 * Test Structured LLM Analyzer
 * 
 * Tests the structured LLM analyzer that asks the LLM to break down
 * explanations into sub-scopes before providing global insights.
 */

import { StructuredTypeScriptParser } from './StructuredTypeScriptParser';
import { StructuredLLMAnalyzer } from './StructuredLLMAnalyzer';

class StructuredLLMAnalyzerTest {
  private parser: StructuredTypeScriptParser;
  private analyzer: StructuredLLMAnalyzer;

  constructor() {
    this.parser = new StructuredTypeScriptParser();
    this.analyzer = new StructuredLLMAnalyzer();
  }

  async runTests(): Promise<void> {
    console.log('🧠 Test Structured LLM Analyzer - Démarrage...\n');

    // Test 1: Analyse d'un scope simple
    await this.testSimpleScopeAnalysis();
    
    // Test 2: Analyse d'un scope complexe
    await this.testComplexScopeAnalysis();
    
    // Test 3: Validation de la structure
    await this.testStructureValidation();
  }

  private async testSimpleScopeAnalysis(): Promise<void> {
    console.log('🔍 Test 1: Analyse d\'un scope simple...\n');

    const testCode = `
export function simpleFunction(param: string): string {
  return \`Hello \${param}\`;
}
`;

    try {
      const analysis = await this.parser.parseFile('simple-test.ts', testCode);
      const scope = analysis.scopes[0];
      
      console.log(`📊 Scope analysé: ${scope.name}`);
      console.log(`   Type: ${scope.type}`);
      console.log(`   Signature: ${scope.signature}`);
      
      const llmAnalysis = await this.analyzer.analyzeScope(scope);
      
      console.log(`\n🧠 Analyse LLM structurée:`);
      console.log(`   But global: ${llmAnalysis.overall_purpose}`);
      console.log(`   Sous-scopes: ${llmAnalysis.sub_scopes.length}`);
      console.log(`   Complexité: ${llmAnalysis.complexity}`);
      console.log(`   Maintenabilité: ${llmAnalysis.maintainability}`);
      console.log(`   Testabilité: ${llmAnalysis.testability}`);
      
      if (llmAnalysis.sub_scopes.length > 0) {
        console.log(`\n📋 Sous-scopes détectés:`);
        for (const subScope of llmAnalysis.sub_scopes) {
          console.log(`   - ${subScope.name} (${subScope.type})`);
          console.log(`     But: ${subScope.purpose}`);
          console.log(`     Complexité: ${subScope.complexity}`);
        }
      }
      
      console.log(`\n🏗️ Analyse globale:`);
      console.log(`   Architecture: ${llmAnalysis.global_analysis.architecture}`);
      console.log(`   Patterns: ${llmAnalysis.global_analysis.design_patterns.join(', ') || 'Aucun'}`);
      console.log(`   Forces: ${llmAnalysis.global_analysis.strengths.join(', ') || 'Aucune'}`);
      console.log(`   Faiblesses: ${llmAnalysis.global_analysis.weaknesses.join(', ') || 'Aucune'}`);
      
    } catch (error) {
      console.log(`❌ Erreur test simple: ${error}\n`);
    }
  }

  private async testComplexScopeAnalysis(): Promise<void> {
    console.log('\n🔍 Test 2: Analyse d\'un scope complexe...\n');

    const testCode = `
export class ComplexService {
  private dependencies: Map<string, any> = new Map();
  
  constructor(private config: ServiceConfig) {
    this.initializeDependencies();
  }
  
  public async processData(data: any[]): Promise<ProcessResult> {
    const results: ProcessResult[] = [];
    
    for (const item of data) {
      if (this.validateItem(item)) {
        const processed = await this.transformItem(item);
        results.push(processed);
      }
    }
    
    return this.aggregateResults(results);
  }
  
  private validateItem(item: any): boolean {
    return item && typeof item === 'object' && item.id;
  }
  
  private async transformItem(item: any): Promise<ProcessResult> {
    // Logique de transformation complexe
    return {
      id: item.id,
      processed: true,
      timestamp: new Date()
    };
  }
  
  private aggregateResults(results: ProcessResult[]): ProcessResult {
    return {
      id: 'aggregated',
      processed: results.length > 0,
      timestamp: new Date(),
      count: results.length
    };
  }
  
  private initializeDependencies(): void {
    this.dependencies.set('validator', new Validator());
    this.dependencies.set('transformer', new Transformer());
  }
}

interface ServiceConfig {
  timeout: number;
  retries: number;
}

interface ProcessResult {
  id: string;
  processed: boolean;
  timestamp: Date;
  count?: number;
}
`;

    try {
      const analysis = await this.parser.parseFile('complex-test.ts', testCode);
      const classScope = analysis.scopes.find(s => s.type === 'class');
      
      if (!classScope) {
        console.log('❌ Aucune classe trouvée dans le code de test');
        return;
      }
      
      console.log(`📊 Scope complexe analysé: ${classScope.name}`);
      console.log(`   Type: ${classScope.type}`);
      console.log(`   Lignes: ${classScope.startLine}-${classScope.endLine}`);
      console.log(`   Complexité: ${classScope.complexity}`);
      console.log(`   Dépendances: ${classScope.dependencies.length}`);
      
      const llmAnalysis = await this.analyzer.analyzeScope(classScope);
      
      console.log(`\n🧠 Analyse LLM structurée:`);
      console.log(`   But global: ${llmAnalysis.overall_purpose}`);
      console.log(`   Sous-scopes: ${llmAnalysis.sub_scopes.length}`);
      console.log(`   Complexité: ${llmAnalysis.complexity}`);
      console.log(`   Maintenabilité: ${llmAnalysis.maintainability}`);
      console.log(`   Testabilité: ${llmAnalysis.testability}`);
      
      console.log(`\n📋 Sous-scopes détectés:`);
      for (const subScope of llmAnalysis.sub_scopes) {
        console.log(`   - ${subScope.name} (${subScope.type})`);
        console.log(`     But: ${subScope.purpose}`);
        console.log(`     Complexité: ${subScope.complexity}`);
        console.log(`     Risques: ${subScope.risks.join(', ') || 'Aucun'}`);
        console.log(`     Tags: ${subScope.tags.join(', ')}`);
      }
      
      console.log(`\n🏗️ Analyse globale:`);
      console.log(`   Architecture: ${llmAnalysis.global_analysis.architecture}`);
      console.log(`   Patterns: ${llmAnalysis.global_analysis.design_patterns.join(', ') || 'Aucun'}`);
      console.log(`   Relations: ${llmAnalysis.global_analysis.relationships.join(', ') || 'Aucune'}`);
      console.log(`   Forces: ${llmAnalysis.global_analysis.strengths.join(', ') || 'Aucune'}`);
      console.log(`   Faiblesses: ${llmAnalysis.global_analysis.weaknesses.join(', ') || 'Aucune'}`);
      console.log(`   Suggestions: ${llmAnalysis.global_analysis.improvement_suggestions.join(', ') || 'Aucune'}`);
      
      console.log(`\n🔍 Analyse TypeScript:`);
      console.log(`   Sécurité des types: ${llmAnalysis.type_safety_notes.join(', ') || 'OK'}`);
      console.log(`   Patterns async: ${llmAnalysis.async_patterns.join(', ') || 'Aucun'}`);
      console.log(`   Notes performance: ${llmAnalysis.performance_notes.join(', ') || 'Aucune'}`);
      
    } catch (error) {
      console.log(`❌ Erreur test complexe: ${error}\n`);
    }
  }

  private async testStructureValidation(): Promise<void> {
    console.log('\n🔍 Test 3: Validation de la structure...\n');

    const testCode = `
export interface UserService {
  createUser(userData: CreateUserData): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  findUser(id: string): Promise<User | null>;
}

export type CreateUserData = {
  name: string;
  email: string;
  role: UserRole;
};

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}
`;

    try {
      const analysis = await this.parser.parseFile('structure-test.ts', testCode);
      
      console.log(`📊 Scopes trouvés: ${analysis.scopes.length}`);
      
      for (const scope of analysis.scopes) {
        console.log(`\n🔍 Analyse de ${scope.name} (${scope.type}):`);
        
        const llmAnalysis = await this.analyzer.analyzeScope(scope);
        
        // Validation de la structure
        const isValid = this.validateAnalysisStructure(llmAnalysis);
        console.log(`   Structure valide: ${isValid ? '✅' : '❌'}`);
        
        if (isValid) {
          console.log(`   But: ${llmAnalysis.overall_purpose}`);
          console.log(`   Sous-scopes: ${llmAnalysis.sub_scopes.length}`);
          console.log(`   Tags: ${llmAnalysis.tags.join(', ')}`);
          console.log(`   Risques: ${llmAnalysis.risks.length}`);
          console.log(`   Tests: ${llmAnalysis.test_ideas.length}`);
        } else {
          console.log(`   ❌ Structure invalide détectée`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Erreur validation structure: ${error}\n`);
    }
  }

  /**
   * Validate that the analysis structure is complete
   */
  private validateAnalysisStructure(analysis: any): boolean {
    const requiredFields = [
      'name', 'type', 'overall_purpose', 'summary_bullets',
      'sub_scopes', 'global_analysis', 'dependencies',
      'complexity', 'maintainability', 'testability',
      'risks', 'test_ideas', 'tags'
    ];
    
    for (const field of requiredFields) {
      if (!(field in analysis)) {
        console.log(`   ❌ Champ manquant: ${field}`);
        return false;
      }
    }
    
    // Validate sub_scopes structure
    if (Array.isArray(analysis.sub_scopes)) {
      for (const subScope of analysis.sub_scopes) {
        const requiredSubFields = ['name', 'type', 'purpose', 'complexity'];
        for (const field of requiredSubFields) {
          if (!(field in subScope)) {
            console.log(`   ❌ Champ sous-scope manquant: ${field}`);
            return false;
          }
        }
      }
    }
    
    // Validate global_analysis structure
    const requiredGlobalFields = ['architecture', 'design_patterns', 'strengths', 'weaknesses'];
    for (const field of requiredGlobalFields) {
      if (!(field in analysis.global_analysis)) {
        console.log(`   ❌ Champ analyse globale manquant: ${field}`);
        return false;
      }
    }
    
    return true;
  }
}

// Exécution du test
async function main() {
  try {
    const test = new StructuredLLMAnalyzerTest();
    await test.runTests();
    console.log('\n🎉 Test Structured LLM Analyzer terminé !');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

if (require.main === module) {
  main();
}

export { StructuredLLMAnalyzerTest };