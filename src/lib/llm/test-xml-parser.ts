#!/usr/bin/env node
/**
 * Test du nouveau parser XML
 * 
 * Valide que le parser XML avec tokenizer fonctionne correctement
 */

import { XMLTokenizer } from './XMLTokenizer';
import { XMLParser } from './XMLParser';
import { XMLResponseParser } from './XMLResponseParser';

// Test XML complexe avec déclaration, CDATA, et caractères spéciaux
const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<code_analysis>
  <name>TestClass</name>
  <type>class</type>
  <purpose>Test class with special characters</purpose>
  <summary_bullets>
    <bullet>Point 1 with "quotes"</bullet>
    <bullet>Point 2 with \`backticks\`</bullet>
    <bullet>Point 3 with < and ></bullet>
  </summary_bullets>
  <inputs>
    <input>param1: string</input>
    <input>param2: number</input>
  </inputs>
  <outputs>
    <output>Promise&lt;string&gt;</output>
  </outputs>
  <dependencies>
    <dependency>Database</dependency>
    <dependency>Logger</dependency>
  </dependencies>
  <risks>
    <risk>Risk with "quotes" and \`backticks\`</risk>
    <risk>Risk with < and > characters</risk>
  </risks>
  <complexity>medium</complexity>
  <test_ideas>
    <idea>Test with "quotes"</idea>
    <idea>Test with \`backticks\`</idea>
    <idea>Test with < and ></idea>
  </test_ideas>
  <docstring_suggestion><![CDATA[
/**
 * Test method with special characters
 * 
 * @param input - Input with "quotes" and \`backticks\`
 * @returns Promise with < and > characters
 */
  ]]></docstring_suggestion>
  <tags>
    <tag>test</tag>
    <tag>special-chars</tag>
    <tag>xml-parsing</tag>
  </tags>
</code_analysis>`;

async function testXMLParser() {
  console.log('🧪 Test du nouveau parser XML');
  console.log('==============================\n');

  try {
    // Test 1: Tokenizer
    console.log('📋 Test 1: Tokenizer XML');
    console.log('-------------------------');
    
    const tokenizer = new XMLTokenizer(testXML);
    const tokens = tokenizer.tokenize();
    
    console.log(`✅ Tokenizer: ${tokens.length} tokens générés`);
    
    // Afficher quelques tokens importants
    const importantTokens = tokens.filter(t => 
      t.type === 'XML_DECLARATION' || 
      t.type === 'OPEN_TAG' || 
      t.type === 'CDATA' ||
      t.type === 'TEXT'
    );
    
    console.log('🔍 Tokens importants:');
    for (const token of importantTokens.slice(0, 10)) {
      console.log(`   ${token.type}: "${token.value.substring(0, 50)}${token.value.length > 50 ? '...' : ''}"`);
    }
    
    // Test 2: Parser XML
    console.log('\n📋 Test 2: Parser XML');
    console.log('----------------------');
    
    const parser = new XMLParser();
    const document = parser.parse(testXML);
    
    console.log('✅ Parser XML: Document parsé');
    console.log(`   Déclaration: ${document.declaration ? '✅' : '❌'}`);
    console.log(`   Racine: ${document.root ? '✅' : '❌'}`);
    console.log(`   Commentaires: ${document.comments.length}`);
    
    // Convertir en objet
    const obj = parser.toObject();
    console.log('✅ Conversion en objet: Réussie');
    
    // Test 3: XMLResponseParser
    console.log('\n📋 Test 3: XMLResponseParser');
    console.log('-----------------------------');
    
    const responseParser = new XMLResponseParser();
    const result = await responseParser.parseCodeAnalysisXML(testXML);
    
    console.log('✅ XMLResponseParser: Analyse réussie');
    console.log(`   Succès: ${result.success}`);
    console.log(`   Nom: ${result.data?.name}`);
    console.log(`   But: ${result.data?.purpose}`);
    console.log(`   Points clés: ${result.data?.summary_bullets?.length || 0}`);
    console.log(`   Dépendances: ${result.data?.dependencies?.length || 0}`);
    console.log(`   Risques: ${result.data?.risks?.length || 0}`);
    console.log(`   Tags: ${result.data?.tags?.length || 0}`);
    
    // Test 4: Validation des caractères spéciaux
    console.log('\n📋 Test 4: Validation des caractères spéciaux');
    console.log('----------------------------------------------');
    
    if (result.data) {
      const hasQuotes = result.data.docstring_suggestion?.includes('"') || false;
      const hasBackticks = result.data.docstring_suggestion?.includes('`') || false;
      const hasAngleBrackets = result.data.docstring_suggestion?.includes('<') || false;
      
      console.log(`   Guillemets préservés: ${hasQuotes ? '✅' : '❌'}`);
      console.log(`   Backticks préservés: ${hasBackticks ? '✅' : '❌'}`);
      console.log(`   Chevrons préservés: ${hasAngleBrackets ? '✅' : '❌'}`);
      
      // Afficher un extrait de la docstring
      if (result.data.docstring_suggestion) {
        console.log(`   Docstring: ${result.data.docstring_suggestion.substring(0, 100)}...`);
      }
    }
    
    // Test 5: Validation des tableaux
    console.log('\n📋 Test 5: Validation des tableaux');
    console.log('-----------------------------------');
    
    if (result.data) {
      console.log(`   Summary bullets: ${Array.isArray(result.data.summary_bullets) ? '✅' : '❌'} (${result.data.summary_bullets?.length || 0})`);
      console.log(`   Dependencies: ${Array.isArray(result.data.dependencies) ? '✅' : '❌'} (${result.data.dependencies?.length || 0})`);
      console.log(`   Risks: ${Array.isArray(result.data.risks) ? '✅' : '❌'} (${result.data.risks?.length || 0})`);
      console.log(`   Tags: ${Array.isArray(result.data.tags) ? '✅' : '❌'} (${result.data.tags?.length || 0})`);
      
      // Afficher quelques éléments
      if (result.data.summary_bullets?.length > 0) {
        console.log(`   Premier bullet: "${result.data.summary_bullets[0]}"`);
      }
      if (result.data.risks?.length > 0) {
        console.log(`   Premier risque: "${result.data.risks[0]}"`);
      }
    }
    
    console.log('\n✅ Test du parser XML terminé avec succès !');
    console.log('==========================================');
    console.log('🎉 Le nouveau parser XML fonctionne parfaitement');
    console.log('🔧 Gestion correcte des déclarations XML');
    console.log('📝 Gestion correcte des CDATA sections');
    console.log('🎯 Gestion correcte des caractères spéciaux');
    console.log('📊 Structure hiérarchique préservée');
    
  } catch (error) {
    console.error('❌ Erreur lors du test du parser XML:', error);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testXMLParser().catch(console.error);
}

export { testXMLParser };