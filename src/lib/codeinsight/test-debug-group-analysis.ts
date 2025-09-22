#!/usr/bin/env node
/**
 * Test de debug - Analyse de groupe IntelligentAnalyzer
 */

import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testDebugGroupAnalysis() {
  console.log('🔍 Debug - Analyse de groupe IntelligentAnalyzer');
  console.log('===============================================\n');

  try {
    // Vérifier la clé API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ GEMINI_API_KEY non trouvée');
      return;
    }

    // Prompt de test pour analyse de groupe
    const groupPrompt = `Tu es un expert en analyse de code TypeScript. Analyse ce groupe de scopes et fournis une analyse complète pour chaque scope.

GROUPE: Interfaces et Fonctions Utilitaires
TYPE: mixed
COMPLEXITÉ: low
NOMBRE DE SCOPES: 2

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

### FUNCTION formatUserName
Lignes: 20-25
Signature: function formatUserName(user: UserData): string
Contenu:
\`\`\`typescript
function formatUserName(user: UserData): string {
  return \`\${user.name} (\${user.email})\`;
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

    // Test avec LuciformXMLParser
    console.log('🔧 Test avec LuciformXMLParser...');
    const { LuciformXMLParser } = require('../llm/LuciformXMLParser');
    const parser = new LuciformXMLParser(rawResponse, {
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
      
      const groupAnalysisElement = findElement(parseResult.document, 'group_analysis');
      console.log(`📋 Élément group_analysis trouvé: ${!!groupAnalysisElement}`);
      
      if (groupAnalysisElement) {
        const scopeAnalyses = findElement(groupAnalysisElement, 'scope_analysis');
        console.log(`📋 Élément scope_analysis trouvé: ${!!scopeAnalyses}`);
        
        if (scopeAnalyses && scopeAnalyses.children) {
          console.log(`📊 Nombre de scope_analysis: ${scopeAnalyses.children.length}`);
          
          scopeAnalyses.children.forEach((child: any, index: number) => {
            if (child.name === 'scope_analysis') {
              const nameElement = findElement(child, 'name');
              const name = nameElement && nameElement.content ? nameElement.content : 'Inconnu';
              console.log(`  ${index + 1}. Scope: ${name}`);
            }
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du debug:', error);
  }
}

// Exécuter le test
testDebugGroupAnalysis().catch(console.error);