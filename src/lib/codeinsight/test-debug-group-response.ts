#!/usr/bin/env node
/**
 * Test de debug - Réponse groupée
 */

import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testDebugGroupResponse() {
  console.log('🔍 Debug - Réponse groupée');
  console.log('===========================\n');

  try {
    // Vérifier la clé API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ GEMINI_API_KEY non trouvée');
      return;
    }

    // Prompt de test pour analyse de groupe
    const groupPrompt = `Tu es un expert en analyse de code TypeScript. Analyse ce groupe de scopes et fournis une analyse complète pour chaque scope.

GROUPE: Interfaces et Fonctions Simples
TYPE: mixed
COMPLEXITÉ: low
NOMBRE DE SCOPES: 4

SCOPES À ANALYSER:
### INTERFACE UserData
Lignes: 1-8
Signature: interface UserData
Contenu:
\`\`\`typescript
interface UserData {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
}
\`\`\`

### INTERFACE SearchParams
Lignes: 10-15
Signature: interface SearchParams
Contenu:
\`\`\`typescript
interface SearchParams {
  query?: string;
  limit?: number;
  offset?: number;
}
\`\`\`

### FUNCTION formatUserName
Lignes: 20-25
Signature: function formatUserName(user: UserData): string
Contenu:
\`\`\`typescript
function formatUserName(user: UserData): string {
  return \`\${user.name} (\${user.email})\`;
}
\`\`\`

### FUNCTION isValidEmail
Lignes: 30-35
Signature: function isValidEmail(email: string): boolean
Contenu:
\`\`\`typescript
function isValidEmail(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}
\`\`\`

Fournis une analyse XML pour chaque scope en utilisant ce format:

\`\`\`xml
<group_analysis>
  <scope_analysis>
    <name>NomDuScope</name>
    <type>type</type>
    <purpose>Description du but</purpose>
    <summary_bullets>
      <bullet>Point 1</bullet>
      <bullet>Point 2</bullet>
    </summary_bullets>
    <inputs>
      <input>Description des entrées</input>
    </inputs>
    <outputs>
      <output>Description des sorties</output>
    </outputs>
    <dependencies>
      <dependency>Dépendance 1</dependency>
    </dependencies>
    <risks>
      <risk>Risque 1</risk>
    </risks>
    <complexity>low|medium|high</complexity>
    <test_ideas>
      <idea>Idée de test 1</idea>
    </test_ideas>
    <docstring_suggestion>Suggestion de documentation</docstring_suggestion>
    <tags>
      <tag>tag1</tag>
      <tag>tag2</tag>
    </tags>
  </scope_analysis>
</group_analysis>
\`\`\``;

    // Appel LLM direct
    console.log('🧠 Appel LLM pour analyse de groupe...');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(groupPrompt);
    const response = await result.response;
    const rawResponse = response.text();
    
    console.log('📄 Réponse brute du LLM pour groupe:');
    console.log('====================================');
    console.log(rawResponse);
    console.log('\n====================================\n');

    // Utiliser le pré-processeur LLM
    const { LLMResponsePreprocessor } = require('../llm/LLMResponsePreprocessor');
    const cleanResponse = LLMResponsePreprocessor.preprocessLLMResponse(rawResponse);
    
    console.log('🧹 Réponse nettoyée:');
    console.log('====================');
    console.log(cleanResponse);
    console.log('\n====================\n');

    // Test avec LuciformXMLParser
    console.log('🔧 Test avec LuciformXMLParser...');
    const { LuciformXMLParser } = require('../llm/LuciformXMLParser');
    const parser = new LuciformXMLParser(cleanResponse, {
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
      
      // Test de recherche d'éléments
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
      
      // Test de conversion XML vers objet
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
      
      const groupAnalysisElement = findElement(parseResult.document, 'group_analysis');
      console.log(`📋 Élément group_analysis trouvé: ${!!groupAnalysisElement}`);
      
      if (groupAnalysisElement) {
        console.log(`📋 Détail de group_analysis:`);
        console.log(`  Type: ${groupAnalysisElement.type}`);
        console.log(`  Name: ${groupAnalysisElement.name}`);
        console.log(`  Children: ${groupAnalysisElement.children ? groupAnalysisElement.children.length : 0}`);
        
        if (groupAnalysisElement.children) {
          console.log(`📋 Détail des enfants de group_analysis:`);
          groupAnalysisElement.children.forEach((child: any, index: number) => {
            console.log(`  ${index}: type=${child.type}, name=${child.name}`);
            if (child.name === 'scope_analysis') {
              console.log(`    -> C'est un scope_analysis !`);
              const scopeData = xmlElementToObject(child);
              console.log(`    -> Données extraites:`, Object.keys(scopeData));
              if (scopeData.name) {
                console.log(`    -> Nom du scope: ${scopeData.name}`);
              }
            }
          });
        }
        
        // Test d'extraction des scope_analysis
        const scopeAnalyses: any[] = [];
        if (groupAnalysisElement.children) {
          for (const child of groupAnalysisElement.children) {
            if (child.name === 'scope_analysis') {
              const analysisData = xmlElementToObject(child);
              scopeAnalyses.push(analysisData);
            }
          }
        }
        
        console.log(`\n📊 Scopes extraits: ${scopeAnalyses.length}`);
        scopeAnalyses.forEach((scope, index) => {
          console.log(`  ${index + 1}. ${scope.name} (${scope.type})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
  }
}

// Exécuter le test
testDebugGroupResponse().catch(console.error);