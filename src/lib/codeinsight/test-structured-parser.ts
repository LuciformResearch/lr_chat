/**
 * Test Structured TypeScript Parser
 * 
 * Tests the structured parser with real TypeScript files to validate
 * the extraction of rich metadata for LLM analysis.
 */

import { StructuredTypeScriptParser } from './StructuredTypeScriptParser';
import * as fs from 'fs';
import * as path from 'path';

class StructuredParserTest {
  private parser: StructuredTypeScriptParser;

  constructor() {
    this.parser = new StructuredTypeScriptParser();
  }

  async runTests(): Promise<void> {
    console.log('🧠 Test Structured TypeScript Parser - Démarrage...\n');

    // Test 1: Parser simple
    await this.testSimpleParser();
    
    // Test 2: Analyse d'un fichier réel
    await this.testRealFileAnalysis();
    
    // Test 3: Validation des métadonnées
    await this.testMetadataValidation();
  }

  private async testSimpleParser(): Promise<void> {
    console.log('🔍 Test 1: Parser simple...\n');

    const testCode = `
export class TestClass {
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  public getName(): string {
    return this.name;
  }
  
  private async processData(data: any[]): Promise<string[]> {
    return data.map(item => item.toString());
  }
}

export interface TestInterface {
  id: number;
  name: string;
  optional?: boolean;
}

export function testFunction(param: string, optional?: number): string {
  return \`Hello \${param}\`;
}
`;

    try {
      const analysis = await this.parser.parseFile('test.ts', testCode);
      
      console.log(`📊 Analyse du code de test:`);
      console.log(`   Fichier: ${analysis.filePath}`);
      console.log(`   Lignes totales: ${analysis.totalLines}`);
      console.log(`   Scopes: ${analysis.totalScopes}`);
      console.log(`   AST valide: ${analysis.astValid}`);
      
      console.log(`\n📋 Scopes détectés:`);
      for (const scope of analysis.scopes) {
        console.log(`   ${scope.type} ${scope.name} (L${scope.startLine}-${scope.endLine})`);
        console.log(`     Signature: ${scope.signature}`);
        console.log(`     Paramètres: ${scope.parameters.length}`);
        console.log(`     Complexité: ${scope.complexity}`);
        console.log(`     Dépendances: ${scope.dependencies.length}`);
        console.log(`     AST valide: ${scope.astValid}`);
        console.log('');
      }
      
    } catch (error) {
      console.log(`❌ Erreur test simple: ${error}\n`);
    }
  }

  private async testRealFileAnalysis(): Promise<void> {
    console.log('🔍 Test 2: Analyse d\'un fichier réel...\n');

    const testFile = 'src/lib/memory/AutoEnrichmentEngine.ts';
    
    try {
      const content = fs.readFileSync(testFile, 'utf-8');
      const analysis = await this.parser.parseFile(testFile, content);
      
      console.log(`📊 Analyse de ${testFile}:`);
      console.log(`   Lignes totales: ${analysis.totalLines}`);
      console.log(`   Scopes: ${analysis.totalScopes}`);
      console.log(`   Imports: ${analysis.imports.length}`);
      console.log(`   Exports: ${analysis.exports.length}`);
      console.log(`   Dépendances: ${analysis.dependencies.length}`);
      console.log(`   AST valide: ${analysis.astValid}`);
      
      if (analysis.astIssues.length > 0) {
        console.log(`   Issues AST: ${analysis.astIssues.join(', ')}`);
      }
      
      console.log(`\n📋 Top 5 scopes:`);
      const topScopes = analysis.scopes
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 5);
        
      for (const scope of topScopes) {
        console.log(`   ${scope.type} ${scope.name} (L${scope.startLine}-${scope.endLine})`);
        console.log(`     Signature: ${scope.signature}`);
        console.log(`     Complexité: ${scope.complexity}`);
        console.log(`     Lignes: ${scope.linesOfCode}`);
        console.log(`     Dépendances: ${scope.dependencies.join(', ') || 'Aucune'}`);
        console.log('');
      }
      
    } catch (error) {
      console.log(`❌ Erreur analyse fichier réel: ${error}\n`);
    }
  }

  private async testMetadataValidation(): Promise<void> {
    console.log('🔍 Test 3: Validation des métadonnées...\n');

    const testCode = `
import { SomeClass } from './SomeClass';
import * as utils from './utils';

export class MetadataTest {
  private dependency: SomeClass;
  
  constructor(dep: SomeClass) {
    this.dependency = dep;
  }
  
  public async complexMethod(
    param1: string, 
    param2?: number, 
    param3: any[] = []
  ): Promise<{ result: string; count: number }> {
    if (param1.length > 10) {
      for (const item of param3) {
        if (item.valid) {
          return { result: 'success', count: param2 || 0 };
        }
      }
    }
    return { result: 'failure', count: 0 };
  }
}
`;

    try {
      const analysis = await this.parser.parseFile('metadata-test.ts', testCode);
      
      console.log(`📊 Validation des métadonnées:`);
      
      for (const scope of analysis.scopes) {
        console.log(`\n🔍 Scope: ${scope.name}`);
        console.log(`   Type: ${scope.type}`);
        console.log(`   Signature: ${scope.signature}`);
        console.log(`   Paramètres: ${scope.parameters.length}`);
        
        if (scope.parameters.length > 0) {
          console.log(`   Détail paramètres:`);
          for (const param of scope.parameters) {
            console.log(`     - ${param.name}: ${param.type || 'any'} ${param.optional ? '(optionnel)' : ''}`);
          }
        }
        
        console.log(`   Type de retour: ${scope.returnType || 'void'}`);
        console.log(`   Modificateurs: ${scope.modifiers.join(', ') || 'Aucun'}`);
        console.log(`   Dépendances: ${scope.dependencies.join(', ') || 'Aucune'}`);
        console.log(`   Imports: ${scope.imports.join(', ') || 'Aucun'}`);
        console.log(`   Exports: ${scope.exports.join(', ') || 'Aucun'}`);
        console.log(`   Complexité: ${scope.complexity}`);
        console.log(`   Lignes: ${scope.linesOfCode}`);
        console.log(`   AST valide: ${scope.astValid}`);
        
        if (scope.astIssues.length > 0) {
          console.log(`   Issues AST: ${scope.astIssues.join(', ')}`);
        }
        
        if (scope.astNotes.length > 0) {
          console.log(`   Notes AST: ${scope.astNotes.join(', ')}`);
        }
        
        console.log(`   Parent: ${scope.parent || 'Racine'}`);
        console.log(`   Profondeur: ${scope.depth}`);
      }
      
    } catch (error) {
      console.log(`❌ Erreur validation métadonnées: ${error}\n`);
    }
  }
}

// Exécution du test
async function main() {
  try {
    const test = new StructuredParserTest();
    await test.runTests();
    console.log('🎉 Test Structured TypeScript Parser terminé !');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

if (require.main === module) {
  main();
}

export { StructuredParserTest };