#!/usr/bin/env node
/**
 * Test de debug - Élément XML simple
 */

import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testDebugSimpleElement() {
  console.log('🔍 Debug - Élément XML simple');
  console.log('==============================\n');

  try {
    // XML simple pour tester
    const simpleXML = `<scope_analysis>
  <name>UserData</name>
  <type>interface</type>
  <purpose>Définit la structure des données d'un utilisateur.</purpose>
</scope_analysis>`;
    
    console.log('📄 XML simple:');
    console.log(simpleXML);
    console.log('\n');

    // Test avec LuciformXMLParser
    console.log('🔧 Test avec LuciformXMLParser...');
    const { LuciformXMLParser } = require('../llm/LuciformXMLParser');
    const parser = new LuciformXMLParser(simpleXML, {
      maxDepth: 50,
      maxTextLength: 100000,
      entityExpansionLimit: 1000,
      allowDTD: false,
      maxAttrCount: 100,
      maxAttrValueLength: 10000,
      maxCommentLength: 10000,
      maxPILength: 1000,
      useUnicodeNames: true,
      mode: 'luciform-permissive'
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
      
      // Afficher la structure complète
      console.log('\n📋 Structure complète:');
      console.log(`  - type: ${parseResult.document.type}`);
      console.log(`  - name: ${parseResult.document.name}`);
      console.log(`  - content: ${parseResult.document.content}`);
      console.log(`  - children: ${parseResult.document.children ? parseResult.document.children.length : 0}`);
      if (parseResult.document.children) {
        parseResult.document.children.forEach((child: any, index: number) => {
          console.log(`    ${index}: type=${child.type}, name=${child.name}, content="${child.content}"`);
        });
      }
      
      // Test de la méthode xmlElementToObject
      function xmlElementToObject(element: any): any {
        if (!element) return {};
        
        const result: any = {};
        
        // Ajouter le nom de l'élément
        if (element.name) {
          result.name = element.name;
        }
        
        // Traiter les enfants pour extraire le contenu
        if (element.children) {
          let textContent = '';
          const childElements: any = {};
          
          for (const child of element.children) {
            if (child.type === 'text' && child.content) {
              // Texte simple - l'ajouter au contenu principal
              textContent += child.content;
            } else if (child.name) {
              // Élément avec nom - le traiter récursivement
              const childData = xmlElementToObject(child);
              
              // Si l'élément enfant a du contenu texte, l'utiliser comme valeur
              if (childData.content && childData.content.trim()) {
                childElements[child.name] = childData.content.trim();
              } else if (childData.name && childData.name !== child.name) {
                // Si l'élément enfant a un nom différent, utiliser l'objet complet
                childElements[child.name] = childData;
              } else {
                // Sinon, utiliser l'objet complet
                childElements[child.name] = childData;
              }
            }
          }
          
          // Ajouter le contenu texte s'il existe
          if (textContent.trim()) {
            result.content = textContent.trim();
          }
          
          // Ajouter les éléments enfants
          Object.assign(result, childElements);
        }
        
        return result;
      }
      
      const result = xmlElementToObject(parseResult.document);
      console.log('\n📊 Résultat de xmlElementToObject:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
  }
}

// Exécuter le test
testDebugSimpleElement().catch(console.error);