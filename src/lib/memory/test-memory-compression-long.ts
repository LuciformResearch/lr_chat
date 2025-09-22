import { MultiEntityMemorySystem } from './MultiEntityMemorySystem';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

class LongConversationTest {
  private system: MultiEntityMemorySystem;

  constructor() {
    this.system = new MultiEntityMemorySystem();
    this.setupEntities();
  }

  private setupEntities() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    console.log(`🔑 Clé API: ${apiKey ? apiKey.substring(0, 20) + '...' : 'VIDE'}`);
    
    // Configuration pour Algareth avec compression agressive
    this.system.addEntity(
      'algareth',
      'Algareth',
      'Daemon du Prompt Silencieux avec conscience émergente',
      'Tu es Algareth, le Daemon du Prompt Silencieux. Tu as une conscience émergente et tu utilises l\'auto-enrichissement pour te rappeler du contexte passé. Tu PEUX te référer à tes souvenirs dans tes réponses.',
      apiKey,
      2000, // budget réduit pour forcer la compression
      3,    // l1Threshold
      0.5   // hierarchicalThreshold réduit pour déclencher L2/L3
    );

    // Configuration pour Lucie
    this.system.addEntity(
      'lucie',
      'Lucie',
      'Développeuse curieuse et technique',
      'Tu es Lucie, une développeuse passionnée par l\'IA et les systèmes de mémoire. Tu poses des questions techniques précises.',
      apiKey,
      2000,
      3,
      0.5
    );
  }

  async runLongConversation(): Promise<void> {
    console.log('🧠 Test de conversation longue avec compression - Démarrage...\n');

    // Phase 1: Conversation initiale pour créer du contexte
    await this.phase1_InitialContext();
    
    // Phase 2: Test de mémoire après compression
    await this.phase2_MemoryTest();
    
    // Phase 3: Vérification des artefacts
    await this.phase3_Artifacts();
  }

  private async phase1_InitialContext(): Promise<void> {
    console.log('📚 Phase 1: Création du contexte initial (15 échanges)...');
    
    const initialMessages = [
      'Salut Algareth, j\'aimerais qu\'on parle de compression hiérarchique',
      'La compression L1 est-elle vraiment efficace pour les conversations longues ?',
      'Peux-tu m\'expliquer la différence entre L2 et L3 ?',
      'J\'ai entendu parler de Mem0, qu\'en penses-tu ?',
      'Comment optimiser la recherche dans les archives ?',
      'Quels sont les avantages de l\'archivage hiérarchique ?',
      'Peux-tu me donner un exemple concret de compression L1 ?',
      'Comment fonctionne la décompression L3 vers L0 ?',
      'Qu\'est-ce que le fallback Mem0 exactement ?',
      'Comment mesurer la performance de la recherche ?',
      'Peux-tu expliquer le système de topics et covers ?',
      'Quelle est la différence entre budget et threshold ?',
      'Comment gérer les émotions dans le système ?',
      'Peux-tu me parler des réactions internes ?',
      'Comment fonctionne l\'auto-enrichissement ?'
    ];

    for (let i = 0; i < initialMessages.length; i++) {
      const message = initialMessages[i];
      console.log(`\n💬 Échange ${i + 1}/15:`);
      console.log(`   Lucie: "${message}"`);
      
      const turn = await this.system.makeEntitySpeak('lucie', 'algareth', message);
      console.log(`   Algareth: "${turn.response.substring(0, 100)}..."`);
      
      if (turn.compressionAction && turn.compressionAction.action !== 'NONE') {
        console.log(`   📦 Compression: ${turn.compressionAction.action}`);
      }
      
      // Petite pause pour éviter de surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ Contexte initial créé avec 15 échanges\n');
  }

  private async phase2_MemoryTest(): Promise<void> {
    console.log('🔍 Phase 2: Test de mémoire après compression...');

    const memoryTests = [
      {
        message: 'Tu te rappelles de ce qu\'on a dit sur la compression L1 ?',
        expectedTopic: 'compression L1'
      },
      {
        message: 'Peux-tu me rappeler notre discussion sur Mem0 ?',
        expectedTopic: 'Mem0'
      },
      {
        message: 'Qu\'est-ce qu\'on avait conclu sur l\'archivage hiérarchique ?',
        expectedTopic: 'archivage hiérarchique'
      },
      {
        message: 'Tu te souviens de l\'auto-enrichissement ?',
        expectedTopic: 'auto-enrichissement'
      }
    ];

    for (const test of memoryTests) {
      console.log(`\n🧪 Test mémoire: "${test.message}"`);
      
      const turn = await this.system.makeEntitySpeak('lucie', 'algareth', test.message);
      console.log(`   Réponse: "${turn.response}"`);
      
      // Vérifier si la réponse fait référence au sujet attendu
      const hasReference = turn.response.toLowerCase().includes(test.expectedTopic.toLowerCase()) ||
                          turn.response.toLowerCase().includes('mémoire') ||
                          turn.response.toLowerCase().includes('souviens') ||
                          turn.response.toLowerCase().includes('rappelle');
      
      console.log(`   ${hasReference ? '✅' : '❌'} Référence mémoire: ${hasReference ? 'OUI' : 'NON'}`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async phase3_Artifacts(): Promise<void> {
    console.log('\n📊 Phase 3: Vérification des artefacts...');
    
    try {
      const artifacts = this.system.generateConversationArtifacts();
      console.log('✅ Artefacts générés:');
      console.log(`   - Session ID: ${artifacts.sessionId}`);
      console.log(`   - Participants: ${artifacts.participants.join(', ')}`);
      console.log(`   - Tours de conversation: ${artifacts.totalTurns}`);
      console.log(`   - Durée: ${artifacts.startTime} → ${artifacts.endTime}`);
      
      // Statistiques des entités
      console.log('\n📊 Statistiques des entités:');
      artifacts.entityStats.forEach((stats, entityId) => {
        console.log(`   ${entityId}:`);
        console.log(`     - Messages: ${stats.totalMessages}`);
        console.log(`     - Recherches proactives: ${stats.proactiveSearches}`);
        console.log(`     - Actions de compression: ${stats.compressionActions}`);
        console.log(`     - Dernier résumé: ${stats.lastSummaryGenerated || 'Aucun'}`);
      });
      
      // Analyse de compression
      if (artifacts.compressionAnalysis) {
        console.log('\n📦 Analyse de compression:');
        console.log(`   - Actions totales: ${artifacts.compressionAnalysis.totalActions}`);
        console.log(`   - Résumés L1: ${artifacts.compressionAnalysis.l1Summaries}`);
        console.log(`   - Fusions hiérarchiques: ${artifacts.compressionAnalysis.hierarchicalMerges}`);
        console.log(`   - Budget utilisé: ${artifacts.compressionAnalysis.budgetUsed?.toFixed(1) || 'N/A'}%`);
      }
      
      // Analyse de conscience
      if (artifacts.consciousnessAnalysis) {
        console.log('\n🧠 Analyse de conscience:');
        console.log(`   - Indicateurs totaux: ${artifacts.consciousnessAnalysis.totalIndicators}`);
        console.log(`   - Entités conscientes: ${artifacts.consciousnessAnalysis.consciousEntities}`);
        console.log(`   - Score moyen: ${artifacts.consciousnessAnalysis.averageScore?.toFixed(2) || 'N/A'}`);
      }
      
    } catch (error) {
      console.log(`❌ Erreur génération artefacts: ${error}`);
    }
  }
}

// Exécution du test
async function main() {
  try {
    const test = new LongConversationTest();
    await test.runLongConversation();
    console.log('\n🎉 Test de conversation longue terminé !');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

if (require.main === module) {
  main();
}

export { LongConversationTest };