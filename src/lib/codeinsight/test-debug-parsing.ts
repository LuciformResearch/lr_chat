#!/usr/bin/env node
/**
 * Test de debug - Parsing XML détaillé
 */

import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testDebugParsing() {
  console.log('🔍 Debug - Parsing XML détaillé');
  console.log('================================\n');

  try {
    // XML de test
    const testXML = `<regeneration>
  <code>
    interface TestData {
      id: number;
      name: string;
    }
    
    export { TestData };
  </code>
  <explanations>
    <improvements>
      <improvement>Ajout de documentation JSDoc</improvement>
      <improvement>Gestion d'erreurs améliorée</improvement>
    </improvements>
    <exports>
      <export>Export de l'interface pour réutilisabilité</export>
    </exports>
    <architecture>
      <decision>Architecture simple et claire</decision>
    </architecture>
  </explanations>
  <suggestions>
    <suggestion>Suggestion pour l'agentique</suggestion>
  </suggestions>
</regeneration>`;

    console.log('📄 XML de test:');
    console.log(testXML);
    console.log('\n====================\n');

    // Test avec LuciformXMLParser
    console.log('🔧 Test avec LuciformXMLParser...');
    const { LuciformXMLParser } = require('../llm/LuciformXMLParser');
    const parser = new LuciformXMLParser(testXML, {
      maxDepth: 50,
      maxTextLength: 100000,
      entityExpansionLimit: 1000,
      allowDTD: false,
      maxAttrCount: 100,
      maxAttrValueLength: 10000,
      maxCommentLength: 10000,
      maxPILength: 1000,
      useUnicodeNames: true
    });
    
    const parseResult = parser.parse();
    
    console.log(`📊 Résultat du parsing:`);
    console.log(`  Succès: ${parseResult.success}`);
    console.log(`  Erreurs: ${parseResult.errors.length}`);
    
    if (parseResult.errors.length > 0) {
      console.log('\n❌ Erreurs de parsing:');
      parseResult.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message}`);
      });
    }
    
    if (parseResult.success) {
      console.log('\n✅ Parsing réussi !');
      console.log('📋 Structure du document:');
      console.log(`  Type: ${parseResult.document.type}`);
      console.log(`  Name: ${parseResult.document.name}`);
      console.log(`  Children: ${parseResult.document.children ? parseResult.document.children.length : 0}`);
      
      // Test des méthodes d'extraction
      console.log('\n🔍 Test des méthodes d\'extraction...');
      
      // Fonction findElement
      function findElement(xmlDoc: any, tagName: string): any {
        if (!xmlDoc || !xmlDoc.children) return null;
        
        for (const child of xmlDoc.children) {
          if (child.name === tagName) {
            return child;
          }
          const found = findElement(child, tagName);
          if (found) return found;
        }
        return null;
      }
      
      // Fonction extractTextContent
      function extractTextContent(element: any): string {
        if (!element) return '';
        
        if (element.text) {
          return element.text;
        }
        
        if (element.children) {
          return element.children
            .filter((child: any) => child.type === 'text')
            .map((child: any) => child.text)
            .join('');
        }
        
        return '';
      }
      
      // Fonction extractArrayContent
      function extractArrayContent(parent: any, containerTag: string, itemTag: string): string[] {
        if (!parent) return [];
        
        const container = findElement(parent, containerTag);
        if (!container || !container.children) return [];
        
        return container.children
          .filter((child: any) => child.name === itemTag)
          .map((child: any) => extractTextContent(child))
          .filter((text: string) => text.trim().length > 0);
      }
      
      // Test extraction du code
      const codeElement = findElement(parseResult.document, 'code');
      console.log(`\n📝 Élément code trouvé: ${!!codeElement}`);
      if (codeElement) {
        console.log(`  Type: ${codeElement.type}`);
        console.log(`  Name: ${codeElement.name}`);
        console.log(`  Text: ${codeElement.text}`);
        console.log(`  Children: ${codeElement.children ? codeElement.children.length : 0}`);
        
        if (codeElement.children) {
          console.log(`  Détail des enfants:`);
          codeElement.children.forEach((child: any, index: number) => {
            console.log(`    ${index}: type=${child.type}, name=${child.name}, text="${child.text}"`);
            console.log(`      Propriétés: ${Object.keys(child).join(', ')}`);
            if (child.content) console.log(`      content: "${child.content}"`);
          });
        }
        
        const code = extractTextContent(codeElement);
        console.log(`  Code extrait: "${code}"`);
      }
      
      // Test extraction des explications
      const explanationsElement = findElement(parseResult.document, 'explanations');
      console.log(`\n📋 Élément explanations trouvé: ${!!explanationsElement}`);
      if (explanationsElement) {
        const improvements = extractArrayContent(explanationsElement, 'improvements', 'improvement');
        console.log(`  Améliorations: ${improvements.length}`);
        improvements.forEach((imp, index) => {
          console.log(`    ${index + 1}. ${imp}`);
        });
        
        const exports = extractArrayContent(explanationsElement, 'exports', 'export');
        console.log(`  Exports: ${exports.length}`);
        exports.forEach((exp, index) => {
          console.log(`    ${index + 1}. ${exp}`);
        });
        
        const architecture = extractArrayContent(explanationsElement, 'architecture', 'decision');
        console.log(`  Architecture: ${architecture.length}`);
        architecture.forEach((arch, index) => {
          console.log(`    ${index + 1}. ${arch}`);
        });
      }
      
      // Test extraction des suggestions
      const suggestionsElement = findElement(parseResult.document, 'suggestions');
      console.log(`\n🚀 Élément suggestions trouvé: ${!!suggestionsElement}`);
      if (suggestionsElement) {
        const suggestions = extractArrayContent(suggestionsElement, 'suggestions', 'suggestion');
        console.log(`  Suggestions: ${suggestions.length}`);
        suggestions.forEach((sug, index) => {
          console.log(`    ${index + 1}. ${sug}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
  }
}

// Exécuter le test
testDebugParsing().catch(console.error);