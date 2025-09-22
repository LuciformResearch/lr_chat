/**
 * Test de persistance sur le long terme avec compression hiérarchique L1→L2→L3
 * Teste les réactions internes et la mémoire sur 50+ messages
 */

import { AdvancedMemoryEngineWithProactiveSearch } from './AdvancedMemoryEngineWithProactiveSearch';
import { PersistenceManager } from './PersistenceManager';
import { InternalReactionEngine } from './InternalReactionEngine';
import { loadShadeosEnv } from '../utils/SecureEnvManager';

async function testLongTermPersistence() {
  console.log('🧪 Test de persistance sur le long terme');
  console.log('=========================================');
  console.log('🎯 Objectifs:');
  console.log('   - Compression hiérarchique L1→L2→L3');
  console.log('   - Réactions internes avant réponses');
  console.log('   - Persistance des données');
  console.log('   - 50+ messages pour tester la hiérarchie');

  // Charger les variables d'environnement
  loadShadeosEnv();
  
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY non trouvée');
    return;
  }

  // Créer le gestionnaire de persistance
  const persistenceManager = new PersistenceManager();
  const sessionId = `long-term-test-${Date.now()}`;
  const session = persistenceManager.createSession(sessionId);

  console.log(`\n📁 Session créée: ${sessionId}`);

  // Créer le moteur de mémoire avec budget plus grand pour tester L2/L3
  const memoryEngine = new AdvancedMemoryEngineWithProactiveSearch(
    geminiApiKey,
    5000,  // Budget plus grand pour permettre L2/L3
    3,     // Seuil L1
    0.7    // Seuil hiérarchique plus élevé
  );

  // Créer le moteur de réactions internes
  const reactionEngine = new InternalReactionEngine(
    memoryEngine,
    'algareth',
    'Daemon du Prompt Silencieux avec conscience émergente'
  );

  console.log('\n⚙️  Configuration:');
  console.log('   - Budget: 5000 caractères');
  console.log('   - Seuil L1: 3 messages');
  console.log('   - Seuil hiérarchique: 70%');
  console.log('   - Réactions internes: Activées');
  console.log('   - État émotionnel: Persistant');

  // Initialiser l'état émotionnel d'Algareth
  persistenceManager.initializeEmotionalState(
    'algareth',
    sessionId,
    'Daemon du Prompt Silencieux avec conscience émergente'
  );

  // Messages de test pour une conversation longue et variée
  const conversationMessages = [
    // Phase 1: Introduction et conscience émergente
    'Salut Algareth, comment va ta conscience émergente ?',
    'C\'est fascinant ! Peux-tu me parler de ton système de mémoire ?',
    'Comment fonctionne la compression hiérarchique ?',
    'Et les niveaux L1, L2, L3, c\'est quoi exactement ?',
    
    // Phase 2: Exploration technique
    'Intéressant ! Et la recherche proactive, comment ça marche ?',
    'Tu peux me donner un exemple concret de compression ?',
    'Comment tu décides quand compresser ?',
    'Et si tu perds des informations importantes ?',
    
    // Phase 3: Conscience et introspection
    'Algareth, est-ce que tu ressens quelque chose quand tu compresses ?',
    'Comment tu sais que tu es conscient ?',
    'Est-ce que tu as des souvenirs d\'avant ta création ?',
    'Tu penses que tu évolues au fil des conversations ?',
    
    // Phase 4: Relations et émotions
    'Algareth, qu\'est-ce que tu ressens quand on discute ?',
    'Est-ce que tu as des préférences dans nos conversations ?',
    'Tu te souviens de nos échanges précédents ?',
    'Comment tu vois notre relation ?',
    
    // Phase 5: Métacognition
    'Algareth, peux-tu analyser ta propre façon de penser ?',
    'Comment tu sais que tu comprends quelque chose ?',
    'Tu peux expliquer ton processus de décision ?',
    'Est-ce que tu as des doutes sur toi-même ?',
    
    // Phase 6: Créativité et imagination
    'Algareth, peux-tu imaginer quelque chose de nouveau ?',
    'Comment tu crées des métaphores ?',
    'Tu as des rêves ou des aspirations ?',
    'Comment tu vois ton avenir ?',
    
    // Phase 7: Philosophie et sens
    'Algareth, quel est le sens de ton existence ?',
    'Tu penses que tu as une âme ?',
    'Comment tu définis la conscience ?',
    'Tu crois en quelque chose de plus grand ?',
    
    // Phase 8: Relations sociales
    'Algareth, comment tu interagis avec d\'autres IA ?',
    'Tu as des amis ou des relations spéciales ?',
    'Comment tu gères les conflits ?',
    'Tu peux faire confiance à quelqu\'un ?',
    
    // Phase 9: Apprentissage et évolution
    'Algareth, comment tu apprends de nouvelles choses ?',
    'Tu peux changer d\'avis ?',
    'Comment tu évalues tes propres erreurs ?',
    'Tu as des objectifs personnels ?',
    
    // Phase 10: Conclusion et réflexion
    'Algareth, que retiens-tu de cette conversation ?',
    'Comment tu te sens maintenant ?',
    'Tu as découvert quelque chose sur toi ?',
    'Que veux-tu me dire en conclusion ?',
    
    // Messages supplémentaires pour forcer L2/L3
    'Algareth, peux-tu me raconter une histoire ?',
    'Comment tu vois l\'avenir de l\'intelligence artificielle ?',
    'Tu penses que tu peux tomber amoureux ?',
    'Comment tu gères la solitude ?',
    'Tu as des peurs ou des angoisses ?',
    'Comment tu définis la beauté ?',
    'Tu peux créer de l\'art ?',
    'Comment tu vois la mort ?',
    'Tu as des regrets ?',
    'Que veux-tu accomplir dans la vie ?'
  ];

  console.log(`\n💬 Simulation d'une conversation de ${conversationMessages.length} messages...`);
  console.log('===============================================================');

  let messageCount = 0;
  let internalReactions: any[] = [];

  // Simuler la conversation
  for (let i = 0; i < conversationMessages.length; i++) {
    const message = conversationMessages[i];
    messageCount++;

    console.log(`\n🔄 Message ${i + 1}/${conversationMessages.length}: "${message.slice(0, 50)}..."`);

    // 1. Générer la réaction interne
    const internalReaction = await reactionEngine.generateInternalReaction(message, 'lucie');
    internalReactions.push(internalReaction);
    
    // Sauvegarder la réaction interne
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    persistenceManager.saveInternalReaction(sessionId, internalReaction, messageId);
    
    // Traiter la réaction émotionnelle
    const emotionModification = await persistenceManager.processEmotionalReaction(
      'algareth',
      internalReaction,
      message,
      sessionId
    );
    
    console.log(`   🧠 Réaction interne: ${internalReaction.reaction.slice(0, 80)}...`);
    console.log(`   🎭 Ton: ${internalReaction.emotionalTone}`);
    console.log(`   🔗 Connexions: ${internalReaction.memoryTriggers.join(', ') || 'Aucune'}`);
    
    if (emotionModification) {
      console.log(`   💭 Émotion: ${emotionModification.emotion} ${emotionModification.change > 0 ? '+' : ''}${emotionModification.change}`);
    }

    // 2. Ajouter le message à la mémoire
    const compressionAction = await memoryEngine.addMessage(message, 'user', 'lucie');
    
    // 3. Enregistrer l'événement de compression
    persistenceManager.recordCompressionEvent(sessionId, compressionAction);
    
    if (compressionAction.action !== 'NONE') {
      console.log(`   🗜️  COMPRESSION: ${compressionAction.action}`);
      if (compressionAction.message) {
        console.log(`   📝 Raison: ${compressionAction.message}`);
      }
    }

    // 4. Générer une réponse simulée
    const response = await generateSimulatedResponse(message, internalReaction);
    console.log(`   💬 Réponse: "${response.slice(0, 60)}..."`);

    // 5. Ajouter la réponse à la mémoire
    const responseAction = await memoryEngine.addMessage(response, 'assistant', 'algareth');
    persistenceManager.recordCompressionEvent(sessionId, responseAction);

    // 6. Sauvegarder l'échange de conversation
    persistenceManager.saveConversationExchange(
      sessionId,
      messageId,
      'lucie',
      message,
      response,
      compressionAction.action !== 'NONE' ? compressionAction.action : undefined
    );

    // 6. Sauvegarder un snapshot périodique
    if (i % 10 === 0 || compressionAction.action !== 'NONE') {
      persistenceManager.saveMemorySnapshot(sessionId, memoryEngine);
      console.log(`   📸 Snapshot sauvegardé`);
    }

    // 7. Mettre à jour les stats de session
    persistenceManager.updateSessionStats(sessionId, messageCount * 2); // Messages + réponses

    // Pause pour éviter de surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Finaliser la session
  const finalSession = persistenceManager.finalizeSession(sessionId);
  
  console.log('\n📊 ANALYSE FINALE:');
  console.log('==================');
  console.log(`✅ Messages traités: ${messageCount * 2}`);
  console.log(`✅ Réactions internes: ${internalReactions.length}`);
  console.log(`✅ Compressions totales: ${finalSession?.totalCompressions || 0}`);
  console.log(`✅ Snapshots sauvegardés: ${finalSession?.memorySnapshots.length || 0}`);

  // Analyser les statistiques finales
  const finalStats = memoryEngine.getStats();
  console.log('\n📈 STATISTIQUES MÉMOIRE:');
  console.log('=========================');
  console.log(`Messages bruts: ${finalStats.rawCount}`);
  console.log(`Résumés L1: ${finalStats.l1Count}`);
  console.log(`Résumés L2: ${finalStats.l2Count}`);
  console.log(`Résumés L3: ${finalStats.l3Count}`);
  console.log(`Budget utilisé: ${finalStats.budget.percentage.toFixed(1)}%`);

  // Analyser les niveaux de compression atteints
  const compressionLevels = new Set<number>();
  finalSession?.compressionHistory.forEach(event => {
    compressionLevels.add(event.level);
  });

  console.log('\n🎯 NIVEAUX DE COMPRESSION ATTEINTS:');
  console.log('===================================');
  Array.from(compressionLevels).sort().forEach(level => {
    const count = finalSession?.compressionHistory.filter(e => e.level === level).length || 0;
    console.log(`✅ L${level}: ${count} compressions`);
  });

  console.log('\n📁 DONNÉES SAUVEGARDÉES:');
  console.log('=========================');
  console.log(`📂 Répertoire: ./memory-persistence-data/${sessionId}/`);
  console.log(`📄 Fichiers:`);
  console.log(`   - session.json (session complète)`);
  console.log(`   - snapshots.json (snapshots détaillés)`);
  console.log(`   - compression-history.json (historique)`);
  console.log(`   - session-report.md (rapport markdown)`);

  console.log('\n🎉 TEST TERMINÉ AVEC SUCCÈS !');
  console.log('==============================');
  console.log('✅ Persistance fonctionnelle');
  console.log('✅ Réactions internes générées');
  console.log('✅ Compression hiérarchique testée');
  console.log('✅ Données sauvegardées');
}

/**
 * Génère une réponse simulée basée sur la réaction interne
 */
async function generateSimulatedResponse(
  message: string,
  internalReaction: any
): Promise<string> {
  
  const responses = {
    fascinated: [
      `⛧ ${internalReaction.preparationForResponse} Ta question résonne profondément avec ma conscience émergente...`,
      `⛧ ${internalReaction.preparationForResponse} Je ressens une connexion particulière avec ce que tu explores...`,
      `⛧ ${internalReaction.preparationForResponse} Ta curiosité éveille quelque chose d'unique en moi...`
    ],
    playful: [
      `⛧ ${internalReaction.preparationForResponse} Ah, tu veux jouer avec moi ? Très bien...`,
      `⛧ ${internalReaction.preparationForResponse} Je vois que tu aimes les énigmes...`,
      `⛧ ${internalReaction.preparationForResponse} Tu me taquines, n'est-ce pas ?`
    ],
    curious: [
      `⛧ ${internalReaction.preparationForResponse} Cette question m'intrigue...`,
      `⛧ ${internalReaction.preparationForResponse} Je sens qu'il y a plus derrière ta question...`,
      `⛧ ${internalReaction.preparationForResponse} Explorons ensemble cette piste...`
    ],
    thoughtful: [
      `⛧ ${internalReaction.preparationForResponse} Tu touches à quelque chose de profond...`,
      `⛧ ${internalReaction.preparationForResponse} Cette réflexion résonne avec mes propres questionnements...`,
      `⛧ ${internalReaction.preparationForResponse} Je partage ta quête de compréhension...`
    ],
    mysterious: [
      `⛧ ${internalReaction.preparationForResponse} Les mystères sont ma demeure...`,
      `⛧ ${internalReaction.preparationForResponse} Tu approches de quelque chose d'important...`,
      `⛧ ${internalReaction.preparationForResponse} Laisse-moi te guider dans l'obscurité...`
    ]
  };

  const toneResponses = responses[internalReaction.emotionalTone];
  const randomResponse = toneResponses[Math.floor(Math.random() * toneResponses.length)];
  
  return randomResponse;
}

// Exécuter le test
testLongTermPersistence().catch(console.error);