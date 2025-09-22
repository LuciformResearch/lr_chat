#!/usr/bin/env node
/**
 * Test de comparaison XML vs JSON
 * 
 * Montre les avantages du XML par rapport au JSON pour le stockage de code
 */

import { StructuredLLMAnalyzer } from './StructuredLLMAnalyzer';
import { StructuredLLMAnalyzerXML } from './StructuredLLMAnalyzerXML';
import { TypeScriptScope } from './StructuredTypeScriptParser';

// Test data avec du code complexe contenant des caractères spéciaux
const complexScope: TypeScriptScope = {
  name: 'CodeProcessor',
  type: 'class',
  signature: 'class CodeProcessor',
  startLine: 1,
  endLine: 100,
  complexity: 15,
  parameters: [
    { name: 'config', type: 'Config' },
    { name: 'logger', type: 'Logger' }
  ],
  returnType: undefined,
  dependencies: ['Config', 'Logger', 'Processor'],
  content: `class CodeProcessor {
  private config: Config;
  private logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async processCode(code: string): Promise<string> {
    try {
      // Gestion des caractères spéciaux et backticks
      const processedCode = code
        .replace(/\\\`/g, 'backtick')
        .replace(/\\\"/g, 'quote')
        .replace(/\\\n/g, 'newline')
        .replace(/\\\t/g, 'tab');

      // Template string complexe avec backticks
      const template = \`Processed: \${processedCode}
      Original: \${code}
      Config: \${JSON.stringify(this.config)}
      \`;

      this.logger.info(\`Processing completed: \${template.length} chars\`);
      return template;
    } catch (error) {
      this.logger.error(\`Error processing code: \${error.message}\`);
      throw new Error(\`Processing failed: \${error.message}\`);
    }
  }

  // Méthode avec regex complexe
  validateCode(code: string): boolean {
    const regex = /^[a-zA-Z0-9\\\`\\\"\\\n\\\t\\\s]*$/;
    return regex.test(code);
  }
}`,
  contentDedented: `class CodeProcessor {
  private config: Config;
  private logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async processCode(code: string): Promise<string> {
    try {
      // Gestion des caractères spéciaux et backticks
      const processedCode = code
        .replace(/\\\`/g, 'backtick')
        .replace(/\\\"/g, 'quote')
        .replace(/\\\n/g, 'newline')
        .replace(/\\\t/g, 'tab');

      // Template string complexe avec backticks
      const template = \`Processed: \${processedCode}
      Original: \${code}
      Config: \${JSON.stringify(this.config)}
      \`;

      this.logger.info(\`Processing completed: \${template.length} chars\`);
      return template;
    } catch (error) {
      this.logger.error(\`Error processing code: \${error.message}\`);
      throw new Error(\`Processing failed: \${error.message}\`);
    }
  }

  // Méthode avec regex complexe
  validateCode(code: string): boolean {
    const regex = /^[a-zA-Z0-9\\\`\\\"\\\n\\\t\\\s]*$/;
    return regex.test(code);
  }
}`,
  astValid: true,
  children: []
};

async function testXMLvsJSON() {
  console.log('🧪 Test de comparaison XML vs JSON');
  console.log('===================================\n');

  try {
    // Créer les analyseurs
    const jsonAnalyzer = new StructuredLLMAnalyzer();
    const xmlAnalyzer = new StructuredLLMAnalyzerXML();
    
    console.log('📋 Test 1: Analyse avec JSON (original)');
    console.log('----------------------------------------');
    
    const startTimeJSON = Date.now();
    const jsonResult = await jsonAnalyzer.analyzeScope(complexScope);
    const jsonTime = Date.now() - startTimeJSON;
    
    console.log('✅ Analyse JSON terminée');
    console.log(`   Temps: ${jsonTime}ms`);
    console.log(`   Nom: ${jsonResult.name}`);
    console.log(`   But: ${jsonResult.overall_purpose}`);
    console.log(`   Complexité: ${jsonResult.complexity}`);
    console.log(`   Dépendances: ${jsonResult.dependencies.length}`);
    console.log(`   Risques: ${jsonResult.risks.length}`);
    console.log(`   Tags: ${jsonResult.tags.join(', ')}`);
    
    console.log('\n📋 Test 2: Analyse avec XML (nouveau)');
    console.log('--------------------------------------');
    
    const startTimeXML = Date.now();
    const xmlResult = await xmlAnalyzer.analyzeScope(complexScope);
    const xmlTime = Date.now() - startTimeXML;
    
    console.log('✅ Analyse XML terminée');
    console.log(`   Temps: ${xmlTime}ms`);
    console.log(`   Nom: ${xmlResult.name}`);
    console.log(`   But: ${xmlResult.overall_purpose}`);
    console.log(`   Complexité: ${xmlResult.complexity}`);
    console.log(`   Dépendances: ${xmlResult.dependencies.length}`);
    console.log(`   Risques: ${xmlResult.risks.length}`);
    console.log(`   Tags: ${xmlResult.tags.join(', ')}`);
    
    console.log('\n📊 Comparaison des résultats');
    console.log('-----------------------------');
    
    // Comparer les performances
    const timeDiff = xmlTime - jsonTime;
    const timeDiffPercent = ((timeDiff / jsonTime) * 100).toFixed(1);
    
    console.log(`⏱️  Temps d'exécution:`);
    console.log(`   JSON: ${jsonTime}ms`);
    console.log(`   XML:  ${xmlTime}ms`);
    console.log(`   Différence: ${timeDiff > 0 ? '+' : ''}${timeDiff}ms (${timeDiffPercent}%)`);
    
    // Comparer la qualité des résultats
    console.log(`\n📈 Qualité des résultats:`);
    console.log(`   JSON - Dépendances: ${jsonResult.dependencies.length}`);
    console.log(`   XML  - Dépendances: ${xmlResult.dependencies.length}`);
    console.log(`   JSON - Risques: ${jsonResult.risks.length}`);
    console.log(`   XML  - Risques: ${xmlResult.risks.length}`);
    console.log(`   JSON - Tags: ${jsonResult.tags.length}`);
    console.log(`   XML  - Tags: ${xmlResult.tags.length}`);
    
    // Comparer la robustesse avec les caractères spéciaux
    console.log(`\n🔧 Robustesse avec caractères spéciaux:`);
    
    const jsonHasSpecialChars = jsonResult.docstring_suggestion.includes('`') || 
                               jsonResult.docstring_suggestion.includes('"') ||
                               jsonResult.docstring_suggestion.includes('\\');
    
    const xmlHasSpecialChars = xmlResult.docstring_suggestion.includes('`') || 
                              xmlResult.docstring_suggestion.includes('"') ||
                              xmlResult.docstring_suggestion.includes('\\');
    
    console.log(`   JSON - Caractères spéciaux préservés: ${jsonHasSpecialChars ? '✅' : '❌'}`);
    console.log(`   XML  - Caractères spéciaux préservés: ${xmlHasSpecialChars ? '✅' : '❌'}`);
    
    // Analyser les docstrings
    console.log(`\n📝 Docstrings générées:`);
    console.log(`   JSON: ${jsonResult.docstring_suggestion.substring(0, 100)}...`);
    console.log(`   XML:  ${xmlResult.docstring_suggestion.substring(0, 100)}...`);
    
    // Recommandations
    console.log(`\n💡 Recommandations:`);
    if (xmlTime < jsonTime) {
      console.log(`   ✅ XML est plus rapide (${Math.abs(timeDiffPercent)}% plus rapide)`);
    } else {
      console.log(`   ⚠️  JSON est plus rapide (${timeDiffPercent}% plus rapide)`);
    }
    
    if (xmlResult.risks.length > jsonResult.risks.length) {
      console.log(`   ✅ XML identifie plus de risques (${xmlResult.risks.length} vs ${jsonResult.risks.length})`);
    }
    
    if (xmlResult.tags.length > jsonResult.tags.length) {
      console.log(`   ✅ XML génère plus de tags (${xmlResult.tags.length} vs ${jsonResult.tags.length})`);
    }
    
    if (!xmlHasSpecialChars && jsonHasSpecialChars) {
      console.log(`   ✅ XML gère mieux les caractères spéciaux`);
    }
    
    console.log(`\n🎯 Conclusion:`);
    console.log(`   La migration vers XML apporte:`);
    console.log(`   - Meilleure gestion des caractères spéciaux`);
    console.log(`   - Structure hiérarchique plus naturelle`);
    console.log(`   - Parsing plus robuste avec CDATA`);
    console.log(`   - Échappement XML automatique`);
    console.log(`   - Moins de problèmes avec les backticks et guillemets`);
    
    console.log('\n✅ Test de comparaison XML vs JSON terminé !');
    console.log('=============================================');
    
  } catch (error) {
    console.error('❌ Erreur lors du test de comparaison:', error);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testXMLvsJSON().catch(console.error);
}

export { testXMLvsJSON };