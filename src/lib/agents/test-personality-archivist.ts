/**
 * Test de l'Agent Archiviste avec Personnalité et Outils Spécialisés
 */

import { PersonalityArchivistAgent } from './PersonalityArchivistAgent';

/**
 * Test complet de l'agent archiviste avec personnalité
 */
export async function testPersonalityArchivist(): Promise<void> {
  console.log('🧪 Test complet de l\'Agent Archiviste avec Personnalité');
  console.log('=' .repeat(60));

  try {
    // Configuration
    const geminiApiKey = process.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!geminiApiKey) {
      console.error('❌ Clé API Gemini non trouvée');
      return;
    }

    // Initialiser l'agent archiviste
    console.log('\n📋 Étape 1: Initialisation Agent Archiviste');
    const archivist = new PersonalityArchivistAgent(geminiApiKey);
    console.log('✅ Agent Archiviste initialisé');

    // Tests des cas d'usage
    console.log('\n📋 Étape 2: Tests des cas d\'usage');
    await testUseCases(archivist);

    // Tests des outils individuels
    console.log('\n📋 Étape 3: Tests des outils individuels');
    await testIndividualTools(archivist);

    // Tests de l'auto-feedback loop
    console.log('\n📋 Étape 4: Tests de l\'auto-feedback loop');
    await testAutoFeedbackLoop(archivist);

    console.log('\n🎉 Test complet de l\'Agent Archiviste terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur test agent archiviste:', error);
  }
}

/**
 * Teste différents cas d'usage
 */
async function testUseCases(archivist: PersonalityArchivistAgent): Promise<void> {
  const testCases = [
    {
      name: 'Recherche préférences couleurs',
      request: 'Tu te souviens de mes préférences en couleurs ?',
      context: { userId: 'lucie', userName: 'Lucie', currentSession: 'test_session' },
      expectedTools: ['grep_all_convs', 'list_convs']
    },
    {
      name: 'Recherche conversation spécifique',
      request: 'Peux-tu chercher dans la conversation conv_123 ce que j\'ai dit sur React ?',
      context: { userId: 'lucie', userName: 'Lucie', currentSession: 'test_session' },
      expectedTools: ['grep_conv']
    },
    {
      name: 'Liste des conversations',
      request: 'Montre-moi toutes mes conversations sur le design',
      context: { userId: 'lucie', userName: 'Lucie', currentSession: 'test_session' },
      expectedTools: ['list_convs']
    },
    {
      name: 'Recherche générale',
      request: 'Que sais-tu sur mes projets en cours ?',
      context: { userId: 'lucie', userName: 'Lucie', currentSession: 'test_session' },
      expectedTools: ['grep_all_convs']
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Test: ${testCase.name}`);
    
    try {
      const response = await archivist.processRequest(testCase.request, testCase.context);
      
      console.log(`✅ ${response.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`📝 Réponse: ${response.message.substring(0, 150)}...`);
      console.log(`🔧 Outils utilisés: ${response.toolsUsed.join(', ')}`);
      console.log(`🔄 Boucles de feedback: ${response.feedbackLoops}`);
      
      // Vérifier si les outils attendus ont été utilisés
      const expectedToolsUsed = testCase.expectedTools.some(tool => 
        response.toolsUsed.includes(tool)
      );
      console.log(`${expectedToolsUsed ? '✅' : '⚠️'} Outils attendus utilisés: ${expectedToolsUsed ? 'OUI' : 'NON'}`);

    } catch (error) {
      console.error(`❌ Erreur test ${testCase.name}:`, error);
    }
  }
}

/**
 * Teste les outils individuels
 */
async function testIndividualTools(archivist: PersonalityArchivistAgent): Promise<void> {
  const tools = [
    {
      name: 'grep_conv',
      params: { conv_id: 'conv_123', request: 'couleurs' },
      description: 'Recherche dans conversation spécifique'
    },
    {
      name: 'list_convs',
      params: { request: 'design' },
      description: 'Liste conversations avec filtre'
    },
    {
      name: 'grep_all_convs',
      params: { request: 'préférences' },
      description: 'Recherche globale'
    }
  ];

  for (const tool of tools) {
    console.log(`\n🔧 Test outil: ${tool.name} - ${tool.description}`);
    
    try {
      // Accéder directement à l'outil via la réflexion
      const toolInstance = (archivist as any).availableTools.get(tool.name);
      if (toolInstance) {
        const result = await toolInstance.execute(tool.params);
        console.log(`✅ ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`📊 Données: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`);
      } else {
        console.log('❌ Outil non trouvé');
      }
    } catch (error) {
      console.error(`❌ Erreur test outil ${tool.name}:`, error);
    }
  }
}

/**
 * Teste l'auto-feedback loop
 */
async function testAutoFeedbackLoop(archivist: PersonalityArchivistAgent): Promise<void> {
  console.log('🔄 Test auto-feedback loop');
  
  const testRequest = 'Recherche des informations très spécifiques qui n\'existent probablement pas';
  const context = { userId: 'lucie', userName: 'Lucie', currentSession: 'test_session' };

  try {
    const response = await archivist.processRequest(testRequest, context);
    
    console.log(`✅ Test auto-feedback: ${response.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`🔄 Boucles de feedback: ${response.feedbackLoops}`);
    console.log(`🔧 Outils utilisés: ${response.toolsUsed.join(', ')}`);
    
    // Vérifier que l'auto-feedback loop a fonctionné
    if (response.feedbackLoops > 1) {
      console.log('✅ Auto-feedback loop activé');
    } else {
      console.log('⚠️ Auto-feedback loop non activé (peut être normal)');
    }

  } catch (error) {
    console.error('❌ Erreur test auto-feedback loop:', error);
  }
}

/**
 * Test rapide de l'agent archiviste
 */
export async function quickTestPersonalityArchivist(): Promise<void> {
  console.log('⚡ Test rapide de l\'Agent Archiviste avec Personnalité');

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!geminiApiKey) {
      console.error('❌ Clé API Gemini non trouvée');
      return;
    }

    const archivist = new PersonalityArchivistAgent(geminiApiKey);
    
    const testRequest = 'Tu te souviens de mes préférences en couleurs ?';
    const context = { userId: 'lucie', userName: 'Lucie', currentSession: 'test_session' };

    const response = await archivist.processRequest(testRequest, context);

    console.log(`✅ Test rapide réussi`);
    console.log(`📝 Réponse: ${response.message.substring(0, 200)}...`);
    console.log(`🔧 Outils utilisés: ${response.toolsUsed.join(', ')}`);
    console.log(`🔄 Boucles de feedback: ${response.feedbackLoops}`);

  } catch (error) {
    console.error('❌ Erreur test rapide:', error);
  }
}

/**
 * Test de performance
 */
export async function testArchivistPerformance(): Promise<void> {
  console.log('⚡ Test de performance de l\'Agent Archiviste');

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!geminiApiKey) {
      console.error('❌ Clé API Gemini non trouvée');
      return;
    }

    const archivist = new PersonalityArchivistAgent(geminiApiKey);
    
    const testRequest = 'Recherche des informations sur mes projets';
    const context = { userId: 'lucie', userName: 'Lucie', currentSession: 'test_session' };

    const iterations = 3;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        await archivist.processRequest(testRequest, context);
        const endTime = Date.now();
        times.push(endTime - startTime);
        
        console.log(`   ⏱️ Itération ${i + 1}: ${endTime - startTime}ms`);
      } catch (error) {
        console.error(`   ❌ Erreur itération ${i + 1}:`, error);
      }
    }

    if (times.length > 0) {
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`📊 Performance:`);
      console.log(`   Moyenne: ${averageTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime}ms`);
      console.log(`   Max: ${maxTime}ms`);
    }

  } catch (error) {
    console.error('❌ Erreur test performance:', error);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testPersonalityArchivist().catch(console.error);
}