#!/usr/bin/env node
/**
 * Test du LLMResponsePreprocessor
 */

import { LLMResponsePreprocessor } from '../llm/LLMResponsePreprocessor';

function testLLMPreprocessor() {
  console.log('🧪 Test du LLMResponsePreprocessor');
  console.log('==================================\n');

  // Test 1: Réponse avec markdown fences
  const test1 = `\`\`\`xml
<group_analysis>
  <scope_analysis>
    <name>TestData</name>
    <type>interface</type>
  </scope_analysis>
</group_analysis>
\`\`\``;

  console.log('📄 Test 1: Réponse avec markdown fences');
  console.log('Input:');
  console.log(test1);
  console.log('\nOutput:');
  const cleaned1 = LLMResponsePreprocessor.preprocessLLMResponse(test1);
  console.log(cleaned1);
  console.log(`Valid XML: ${LLMResponsePreprocessor.isValidXML(test1)}`);
  console.log(`Root element: ${LLMResponsePreprocessor.getRootElementName(test1)}`);
  console.log('\n---\n');

  // Test 2: Réponse avec texte en dehors
  const test2 = `Voici la réponse XML:

\`\`\`xml
<regeneration>
  <code>
    interface TestData {
      id: number;
    }
  </code>
</regeneration>
\`\`\`

C'est tout !`;

  console.log('📄 Test 2: Réponse avec texte en dehors');
  console.log('Input:');
  console.log(test2);
  console.log('\nOutput:');
  const cleaned2 = LLMResponsePreprocessor.preprocessLLMResponse(test2);
  console.log(cleaned2);
  console.log(`Valid XML: ${LLMResponsePreprocessor.isValidXML(test2)}`);
  console.log(`Root element: ${LLMResponsePreprocessor.getRootElementName(test2)}`);
  console.log('\n---\n');

  // Test 3: XML complexe avec plusieurs éléments
  const test3 = `\`\`\`xml
<group_analysis>
  <scope_analysis>
    <name>UserData</name>
    <type>interface</type>
    <purpose>Interface pour les données utilisateur</purpose>
  </scope_analysis>
  <scope_analysis>
    <name>formatUserName</name>
    <type>function</type>
    <purpose>Formate le nom d'utilisateur</purpose>
  </scope_analysis>
</group_analysis>
\`\`\``;

  console.log('📄 Test 3: XML complexe');
  console.log('Input:');
  console.log(test3);
  console.log('\nOutput:');
  const cleaned3 = LLMResponsePreprocessor.preprocessLLMResponse(test3);
  console.log(cleaned3);
  console.log(`Valid XML: ${LLMResponsePreprocessor.isValidXML(test3)}`);
  console.log(`Root element: ${LLMResponsePreprocessor.getRootElementName(test3)}`);
  console.log('\n---\n');

  // Test 4: XML invalide
  const test4 = `Ceci n'est pas du XML valide`;

  console.log('📄 Test 4: XML invalide');
  console.log('Input:');
  console.log(test4);
  console.log('\nOutput:');
  const cleaned4 = LLMResponsePreprocessor.preprocessLLMResponse(test4);
  console.log(cleaned4);
  console.log(`Valid XML: ${LLMResponsePreprocessor.isValidXML(test4)}`);
  console.log(`Root element: ${LLMResponsePreprocessor.getRootElementName(test4)}`);
  console.log('\n---\n');

  console.log('🎉 Tests du LLMResponsePreprocessor terminés !');
}

// Exécuter les tests
testLLMPreprocessor();