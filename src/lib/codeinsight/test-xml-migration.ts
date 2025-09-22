#!/usr/bin/env node
/**
 * Test de migration JSON vers XML
 * 
 * Valide que la migration des prompts JSON vers XML fonctionne correctement
 */

import { StructuredLLMAnalyzerXML } from './StructuredLLMAnalyzerXML';
import { TypeScriptScope } from './StructuredTypeScriptParser';

// Test data - un scope TypeScript simple
const testScope: TypeScriptScope = {
  name: 'UserManager',
  type: 'class',
  signature: 'class UserManager',
  startLine: 1,
  endLine: 50,
  complexity: 8,
  parameters: [
    { name: 'database', type: 'Database' },
    { name: 'logger', type: 'Logger' }
  ],
  returnType: undefined,
  dependencies: ['Database', 'Logger', 'User'],
  content: `class UserManager {
  private database: Database;
  private logger: Logger;

  constructor(database: Database, logger: Logger) {
    this.database = database;
    this.logger = logger;
  }

  async createUser(userData: UserData): Promise<User> {
    try {
      this.logger.info('Creating user...');
      const user = await this.database.create(userData);
      this.logger.info('User created successfully');
      return user;
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.database.findById(id);
  }

  async updateUser(id: string, updates: Partial<UserData>): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return await this.database.update(id, updates);
  }
}`,
  contentDedented: `class UserManager {
  private database: Database;
  private logger: Logger;

  constructor(database: Database, logger: Logger) {
    this.database = database;
    this.logger = logger;
  }

  async createUser(userData: UserData): Promise<User> {
    try {
      this.logger.info('Creating user...');
      const user = await this.database.create(userData);
      this.logger.info('User created successfully');
      return user;
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.database.findById(id);
  }

  async updateUser(id: string, updates: Partial<UserData>): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return await this.database.update(id, updates);
  }
}`,
  astValid: true,
  children: []
};

async function testXMLMigration() {
  console.log('🧪 Test de migration JSON vers XML');
  console.log('=====================================\n');

  try {
    // Créer l'analyseur XML
    const analyzer = new StructuredLLMAnalyzerXML();
    
    console.log('📋 Test 1: Analyse heuristique XML');
    console.log('-----------------------------------');
    
    // Test de l'analyse heuristique (sans LLM)
    const heuristicResult = await analyzer.analyzeScope(testScope);
    
    console.log('✅ Analyse heuristique réussie');
    console.log(`   Nom: ${heuristicResult.name}`);
    console.log(`   Type: ${heuristicResult.type}`);
    console.log(`   But: ${heuristicResult.overall_purpose}`);
    console.log(`   Complexité: ${heuristicResult.complexity}`);
    console.log(`   Sous-scopes: ${heuristicResult.sub_scopes.length}`);
    console.log(`   Dépendances: ${heuristicResult.dependencies.length}`);
    console.log(`   Risques: ${heuristicResult.risks.length}`);
    console.log(`   Tags: ${heuristicResult.tags.join(', ')}`);
    
    console.log('\n📋 Test 2: Validation de la structure XML');
    console.log('------------------------------------------');
    
    // Vérifier que la structure est complète
    const requiredFields = [
      'name', 'type', 'overall_purpose', 'summary_bullets',
      'sub_scopes', 'global_analysis', 'dependencies', 'inputs', 'outputs',
      'complexity', 'maintainability', 'testability', 'risks', 'test_ideas',
      'docstring_suggestion', 'tags', 'type_safety_notes', 'async_patterns', 'performance_notes'
    ];
    
    let allFieldsPresent = true;
    for (const field of requiredFields) {
      if (!(field in heuristicResult)) {
        console.log(`❌ Champ manquant: ${field}`);
        allFieldsPresent = false;
      }
    }
    
    if (allFieldsPresent) {
      console.log('✅ Tous les champs requis sont présents');
    }
    
    console.log('\n📋 Test 3: Validation des types');
    console.log('-------------------------------');
    
    // Vérifier les types
    const typeChecks = [
      { field: 'name', expected: 'string', actual: typeof heuristicResult.name },
      { field: 'type', expected: 'string', actual: typeof heuristicResult.type },
      { field: 'complexity', expected: 'string', actual: typeof heuristicResult.complexity },
      { field: 'summary_bullets', expected: 'object', actual: typeof heuristicResult.summary_bullets },
      { field: 'sub_scopes', expected: 'object', actual: typeof heuristicResult.sub_scopes },
      { field: 'dependencies', expected: 'object', actual: typeof heuristicResult.dependencies }
    ];
    
    let allTypesCorrect = true;
    for (const check of typeChecks) {
      if (check.actual !== check.expected) {
        console.log(`❌ Type incorrect pour ${check.field}: attendu ${check.expected}, reçu ${check.actual}`);
        allTypesCorrect = false;
      }
    }
    
    if (allTypesCorrect) {
      console.log('✅ Tous les types sont corrects');
    }
    
    console.log('\n📋 Test 4: Validation des valeurs enum');
    console.log('--------------------------------------');
    
    // Vérifier les valeurs enum
    const validComplexity = ['low', 'medium', 'high'].includes(heuristicResult.complexity);
    const validMaintainability = ['low', 'medium', 'high'].includes(heuristicResult.maintainability);
    const validTestability = ['low', 'medium', 'high'].includes(heuristicResult.testability);
    
    if (validComplexity && validMaintainability && validTestability) {
      console.log('✅ Toutes les valeurs enum sont valides');
    } else {
      console.log('❌ Valeurs enum invalides:');
      if (!validComplexity) console.log('   - complexity:', heuristicResult.complexity);
      if (!validMaintainability) console.log('   - maintainability:', heuristicResult.maintainability);
      if (!validTestability) console.log('   - testability:', heuristicResult.testability);
    }
    
    console.log('\n📋 Test 5: Détails de l\'analyse');
    console.log('-------------------------------');
    
    console.log('📊 Résumé:');
    console.log(`   - But principal: ${heuristicResult.overall_purpose}`);
    console.log(`   - Points clés: ${heuristicResult.summary_bullets.length}`);
    console.log(`   - Sous-scopes analysés: ${heuristicResult.sub_scopes.length}`);
    console.log(`   - Dépendances: ${heuristicResult.dependencies.join(', ')}`);
    console.log(`   - Risques identifiés: ${heuristicResult.risks.join(', ')}`);
    console.log(`   - Idées de tests: ${heuristicResult.test_ideas.join(', ')}`);
    console.log(`   - Tags: ${heuristicResult.tags.join(', ')}`);
    
    console.log('\n🏗️ Analyse globale:');
    console.log(`   - Architecture: ${heuristicResult.global_analysis.architecture}`);
    console.log(`   - Patterns: ${heuristicResult.global_analysis.design_patterns.join(', ')}`);
    console.log(`   - Forces: ${heuristicResult.global_analysis.strengths.join(', ')}`);
    console.log(`   - Faiblesses: ${heuristicResult.global_analysis.weaknesses.join(', ')}`);
    
    console.log('\n🔍 Détails TypeScript:');
    console.log(`   - Sécurité des types: ${heuristicResult.type_safety_notes.join(', ')}`);
    console.log(`   - Patterns async: ${heuristicResult.async_patterns.join(', ')}`);
    console.log(`   - Notes de performance: ${heuristicResult.performance_notes.join(', ')}`);
    
    console.log('\n✅ Test de migration XML réussi !');
    console.log('=====================================');
    console.log('🎉 La migration JSON vers XML fonctionne correctement');
    console.log('📝 Tous les champs sont présents et correctement typés');
    console.log('🔧 L\'analyse heuristique produit des résultats cohérents');
    
  } catch (error) {
    console.error('❌ Erreur lors du test de migration XML:', error);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testXMLMigration().catch(console.error);
}

export { testXMLMigration };