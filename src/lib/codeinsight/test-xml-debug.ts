#!/usr/bin/env node
/**
 * Test de debug du parsing XML
 * 
 * Debug étape par étape la conversion XML → objet
 */

import { LuciformXMLParser } from '../llm/LuciformXMLParser';

function xmlElementToObject(element: any): any {
  const obj: any = {};
  
  console.log(`🔍 Traitement élément: ${element.name || 'root'}`);
  console.log(`   Type: ${element.type || 'element'}`);
  console.log(`   Attributs: ${element.attributes?.size || 0}`);
  console.log(`   Enfants: ${element.children?.length || 0}`);
  
  // Ajouter les attributs
  if (element.attributes && element.attributes.size > 0) {
    for (const [key, value] of element.attributes) {
      obj[key] = value;
      console.log(`   🔧 Attribut: ${key} = ${value}`);
    }
  }
  
  // Traiter les enfants
  if (element.children && element.children.length > 0) {
    const children: any = {};
    const textContent: string[] = [];
    
    for (const child of element.children) {
      console.log(`   👶 Enfant: ${child.type} - ${child.name || 'text'}`);
      
      if (child.type === 'text') {
        const text = child.content.trim();
        if (text) {
          textContent.push(text);
          console.log(`      📝 Texte: "${text}"`);
        }
      } else if (child.type === 'element' || child.name) {
        const childName = child.name;
        const childObj = xmlElementToObject(child);
        
        // Si l'enfant n'a que du texte, utiliser directement le texte
        if (childObj._text && Object.keys(childObj).length === 1) {
          const value = childObj._text;
          console.log(`      📄 Valeur texte: "${value}"`);
          if (children[childName]) {
            // Si l'élément existe déjà, créer un tableau
            if (Array.isArray(children[childName])) {
              children[childName].push(value);
            } else {
              children[childName] = [children[childName], value];
            }
          } else {
            children[childName] = value;
          }
        } else {
          // Enfant complexe, garder la structure
          console.log(`      🏗️ Structure complexe:`, Object.keys(childObj));
          if (children[childName]) {
            if (Array.isArray(children[childName])) {
              children[childName].push(childObj);
            } else {
              children[childName] = [children[childName], childObj];
            }
          } else {
            children[childName] = childObj;
          }
        }
      }
    }
    
    // Fusionner les enfants et le contenu texte
    if (textContent.length > 0) {
      obj._text = textContent.join(' ');
      console.log(`   📝 Contenu texte: "${obj._text}"`);
    }
    
    console.log(`   🏗️ Enfants traités:`, Object.keys(children));
    Object.assign(obj, children);
  }
  
  console.log(`   ✅ Résultat:`, Object.keys(obj));
  return obj;
}

function xmlDocumentToObject(document: any): any {
  console.log('📄 Conversion document XML → objet');
  console.log(`   Racine: ${document.root?.name || 'Aucune'}`);
  console.log(`   Enfants: ${document.children.length}`);
  
  if (!document.root) {
    console.log('❌ Pas de racine');
    return {};
  }
  
  return xmlElementToObject(document.root);
}

async function testXMLDebug() {
  console.log('🧪 Test de debug du parsing XML');
  console.log('===============================\n');

  // XML de test simple
  const testXML = `<code_analysis>
  <name>SimpleTestFunction</name>
  <type>function</type>
  <purpose>Convertit une chaîne de caractères en majuscules.</purpose>
  <summary_bullets>
    <bullet>Fonction simple et concise</bullet>
    <bullet>Utilise la méthode toUpperCase()</bullet>
  </summary_bullets>
  <tags>
    <tag>string</tag>
    <tag>utility</tag>
  </tags>
</code_analysis>`;

  console.log('📝 XML de test:');
  console.log(testXML);
  console.log('');

  try {
    // Parser le XML
    console.log('🔍 Parsing XML...');
    const parser = new LuciformXMLParser(testXML);
    const result = parser.parse();

    console.log(`✅ Parsing réussi: ${result.success}`);
    console.log(`📄 Document: ${!!result.document}`);
    console.log(`🏗️ Racine: ${result.document?.root?.name || 'Aucune'}`);
    console.log('');

    if (result.document) {
      // Convertir en objet
      console.log('🔄 Conversion XML → objet...');
      const xmlObject = xmlDocumentToObject(result.document);
      
      console.log('\n📊 Résultat final:');
      console.log(JSON.stringify(xmlObject, null, 2));
      
      // Tester l'extraction
      console.log('\n🔍 Test d\'extraction:');
      console.log(`   name: ${xmlObject.name || 'undefined'}`);
      console.log(`   type: ${xmlObject.type || 'undefined'}`);
      console.log(`   purpose: ${xmlObject.purpose || 'undefined'}`);
      console.log(`   summary_bullets: ${Array.isArray(xmlObject.summary_bullets) ? xmlObject.summary_bullets.length : 'undefined'}`);
      console.log(`   tags: ${Array.isArray(xmlObject.tags) ? xmlObject.tags.length : 'undefined'}`);
      
      if (xmlObject.summary_bullets) {
        console.log(`   summary_bullets content:`, xmlObject.summary_bullets);
      }
      if (xmlObject.tags) {
        console.log(`   tags content:`, xmlObject.tags);
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testXMLDebug().catch(console.error);
}

export { testXMLDebug };