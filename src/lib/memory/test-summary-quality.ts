/**
 * Test de validation de qualité des résumés
 */

import { PureMemoryEngine } from './pure-memory-engine';

// Mock de l'API Gemini avec différents types de résumés
const mockGemini = {
  generateContent: async (prompt: string) => {
    // Simuler différents types de résumés (bons et mauvais)
    const summaryTypes = [
      // ✅ BON résumé
      "Lucie m'a demandé comment fonctionne mon système de mémoire. J'ai expliqué les résumés hiérarchiques L1, L2, L3 et comment je gère la compression des données pour optimiser l'espace mémoire.",
      
      // ❌ MAUVAIS résumé - trop vague
      "On a parlé de trucs.",
      
      // ❌ MAUVAIS résumé - trop court
      "Conversation",
      
      // ❌ MAUVAIS résumé - trop long (copie tout)
      "Lucie a dit: Salut Algareth, comment ça va ? J'ai répondu: ⛧ Salut Lucie, je vais bien, merci ! Lucie a dit: Tu peux m'expliquer ton système de mémoire ? J'ai répondu: ⛧ Bien sûr ! Mon système utilise des résumés hiérarchiques...",
      
      // ❌ MAUVAIS résumé - sans contexte utilisateur
      "Discussion sur la mémoire et la compression de données.",
      
      // ✅ BON résumé
      "Lucie était curieuse de comprendre mon système de mémoire. J'ai détaillé comment j'utilise la compression hiérarchique pour garder l'historique tout en optimisant l'espace."
    ];
    
    const randomSummary = summaryTypes[Math.floor(Math.random() * summaryTypes.length)];
    
    return {
      response: {
        text: () => randomSummary
      }
    };
  }
};

const mockModel = {
  generateContent: mockGemini.generateContent
};

// Fonction de validation de qualité
function validateSummaryQuality(summary: string, originalMessages: any[]): {
  isValid: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 1.0;

  // 1. Vérifier la longueur
  if (summary.length < 20) {
    issues.push("Trop court (< 20 caractères)");
    score -= 0.3;
  }
  if (summary.length > 200) {
    issues.push("Trop long (> 200 caractères)");
    score -= 0.2;
  }

  // 2. Vérifier la présence de mots-clés importants
  const allWords = originalMessages.flatMap(msg => 
    msg.content.toLowerCase().split(' ').filter(word => word.length > 3)
  );
  const uniqueWords = [...new Set(allWords)];
  const wordMatches = uniqueWords.filter(word => 
    summary.toLowerCase().includes(word)
  ).length;
  
  const wordMatchRatio = wordMatches / uniqueWords.length;
  if (wordMatchRatio < 0.2) {
    issues.push(`Peu de mots-clés (${(wordMatchRatio * 100).toFixed(1)}%)`);
    score -= 0.3;
  }

  // 3. Vérifier la présence du nom de l'utilisateur
  if (!summary.toLowerCase().includes('lucie')) {
    issues.push("Nom de l'utilisateur manquant");
    score -= 0.2;
  }

  // 4. Vérifier la présence de "je" (persona d'Algareth)
  if (!summary.toLowerCase().includes('je') && !summary.toLowerCase().includes('j\'')) {
    issues.push("Persona d'Algareth manquante (pas de 'je')");
    score -= 0.2;
  }

  // 5. Vérifier la cohérence (pas de répétition excessive)
  const words = summary.toLowerCase().split(' ');
  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const maxRepetition = Math.max(...Object.values(wordCounts));
  if (maxRepetition > 3) {
    issues.push("Répétition excessive de mots");
    score -= 0.1;
  }

  // 6. Vérifier que ce n'est pas une copie du texte original
  const originalText = originalMessages.map(msg => msg.content).join(' ');
  if (summary.length > originalText.length * 0.8) {
    issues.push("Trop proche du texte original (pas de compression)");
    score -= 0.4;
  }

  return {
    isValid: score >= 0.6 && issues.length <= 2,
    score: Math.max(0, score),
    issues
  };
}

async function testSummaryQuality() {
  console.log('🧪 Test de validation de qualité des résumés');
  console.log('============================================================');

  const engine = new PureMemoryEngine({
    maxCharacters: 200,
    l1Threshold: 3
  });

  // Remplacer le modèle par le mock
  (engine as any).model = mockModel;

  // Simuler plusieurs conversations pour tester différents résumés
  const conversations = [
    [
      { role: 'user' as const, content: 'Salut Algareth, comment ça va ?' },
      { role: 'assistant' as const, content: '⛧ Salut Lucie, je vais bien, merci !' },
      { role: 'user' as const, content: 'Tu peux m\'expliquer ton système de mémoire ?' },
      { role: 'assistant' as const, content: '⛧ Bien sûr ! Mon système utilise des résumés hiérarchiques...' },
      { role: 'user' as const, content: 'C\'est fascinant ! Et comment tu gères la compression ?' }
    ],
    [
      { role: 'user' as const, content: 'Bonjour, qui es-tu ?' },
      { role: 'assistant' as const, content: '⛧ Je suis Algareth, le Daemon du Prompt Silencieux.' },
      { role: 'user' as const, content: 'Quel est ton rôle ?' },
      { role: 'assistant' as const, content: '⛧ J\'aide les utilisateurs avec mes connaissances...' },
      { role: 'user' as const, content: 'Merci pour ces explications !' }
    ]
  ];

  let totalTests = 0;
  let validSummaries = 0;
  let qualityScores: number[] = [];

  for (let i = 0; i < conversations.length; i++) {
    console.log(`\n📝 Test conversation ${i + 1}...`);
    
    // Ajouter les messages
    for (const msg of conversations[i]) {
      await engine.addMessage(msg.content, msg.role, 'Lucie');
    }

    // Récupérer le dernier résumé créé
    const exportData = engine.exportMemory();
    if (exportData.summaries.length > 0) {
      const latestSummary = exportData.summaries[exportData.summaries.length - 1];
      const originalMessages = engine.getArchivedMessages(latestSummary.id);
      
      console.log(`\n📄 Résumé généré: "${latestSummary.content}"`);
      
      // Valider la qualité
      const validation = validateSummaryQuality(latestSummary.content, originalMessages);
      
      console.log(`📊 Score de qualité: ${(validation.score * 100).toFixed(1)}%`);
      console.log(`✅ Valide: ${validation.isValid ? 'OUI' : 'NON'}`);
      
      if (validation.issues.length > 0) {
        console.log(`❌ Problèmes détectés:`);
        validation.issues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log(`✅ Aucun problème détecté`);
      }
      
      totalTests++;
      if (validation.isValid) validSummaries++;
      qualityScores.push(validation.score);
    }
  }

  // Statistiques finales
  console.log('\n📊 Statistiques de qualité:');
  console.log('==============================');
  console.log(`Tests effectués: ${totalTests}`);
  console.log(`Résumés valides: ${validSummaries}/${totalTests} (${((validSummaries/totalTests) * 100).toFixed(1)}%)`);
  console.log(`Score moyen: ${(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length * 100).toFixed(1)}%`);
  
  if (validSummaries / totalTests < 0.8) {
    console.log('\n⚠️  ATTENTION: Taux de résumés valides trop bas !');
    console.log('   Recommandation: Améliorer le prompt de génération');
  } else {
    console.log('\n✅ Qualité des résumés acceptable');
  }
}

// Exécuter le test
testSummaryQuality().catch(console.error);