#!/usr/bin/env node
/**
 * Test direct du LuciformXMLParser
 * 
 * Vérifie ce que retourne exactement le parser
 */

import { LuciformXMLParser } from '../llm/LuciformXMLParser';

async function testLuciformParserDirect() {
  console.log('🧪 Test direct du LuciformXMLParser');
  console.log('===================================\n');

  // XML de test simple
  const testXML = `<code_analysis>
  <name>SimpleTestFunction</name>
  <type>function</type>
  <purpose>Convertit une chaîne de caractères en majuscules.</purpose>
  <summary_bullets>
    <bullet>Fonction simple et concise</bullet>
    <bullet>Utilise la méthode toUpperCase()</bullet>
    <bullet>Retourne une chaîne transformée</bullet>
  </summary_bullets>
  <inputs>
    <input>input: string - Chaîne à convertir</input>
  </inputs>
  <outputs>
    <output>string - Chaîne en majuscules</output>
  </outputs>
  <dependencies>
    <dependency>Aucune dépendance externe</dependency>
  </dependencies>
  <risks>
    <risk>Aucun risque identifié</risk>
  </risks>
  <complexity>low</complexity>
  <test_ideas>
    <idea>Test avec chaîne vide</idea>
    <idea>Test avec chaîne normale</idea>
    <idea>Test avec caractères spéciaux</idea>
  </test_ideas>
  <docstring_suggestion><![CDATA[/**
 * Convertit une chaîne en majuscules
 * @param input Chaîne à convertir
 * @returns Chaîne en majuscules
 */]]></docstring_suggestion>
  <tags>
    <tag>string</tag>
    <tag>utility</tag>
    <tag>simple</tag>
  </tags>
</code_analysis>`;

  console.log('📝 XML de test:');
  console.log(testXML.substring(0, 200) + '...\n');

  try {
    // Parser le XML
    const parser = new LuciformXMLParser(testXML);
    const result = parser.parse();

    console.log('🔍 Résultat du parsing:');
    console.log(`   Succès: ${result.success}`);
    console.log(`   Bien formé: ${result.wellFormed}`);
    console.log(`   Récupéré: ${result.recovered}`);
    console.log(`   Nombre de nœuds: ${result.nodeCount}`);
    console.log(`   Diagnostics: ${result.diagnostics.length}`);
    console.log(`   Erreurs: ${result.errors.length}`);

    if (result.diagnostics.length > 0) {
      console.log('\n📊 Diagnostics:');
      result.diagnostics.forEach(d => {
        console.log(`   ${d.level.toUpperCase()}: ${d.message}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\n❌ Erreurs:');
      result.errors.forEach(e => {
        console.log(`   ${e.code}: ${e.message}`);
      });
    }

    if (result.document) {
      console.log('\n📄 Document XML:');
      console.log(`   Racine: ${result.document.root?.name || 'Aucune'}`);
      console.log(`   Enfants: ${result.document.children.length}`);
      
      if (result.document.root) {
        console.log(`   Enfants de la racine: ${result.document.root.children.length}`);
        
        // Afficher la structure
        console.log('\n🏗️ Structure du document:');
        printElementStructure(result.document.root, 0);
      }
    } else {
      console.log('\n❌ Aucun document généré');
    }

  } catch (error) {
    console.error('❌ Erreur lors du parsing:', error);
  }
}

function printElementStructure(element: any, depth: number) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}📁 ${element.name || 'element'}`);
  
  if (element.attributes && element.attributes.size > 0) {
    for (const [key, value] of element.attributes) {
      console.log(`${indent}  🔧 ${key}: ${value}`);
    }
  }
  
  if (element.children && element.children.length > 0) {
    for (const child of element.children) {
      if (child.type === 'text') {
        const text = child.content.trim();
        if (text) {
          console.log(`${indent}  📝 "${text}"`);
        }
      } else if (child.type === 'element') {
        printElementStructure(child, depth + 1);
      }
    }
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testLuciformParserDirect().catch(console.error);
}

export { testLuciformParserDirect };