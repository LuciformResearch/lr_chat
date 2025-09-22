/**
 * Test automatisé de la mémoire hiérarchique avec navigateur headless
 * Vérifie que les résumés L1 sont créés correctement et que la persistance fonctionne
 */

import puppeteer from 'puppeteer';
import { LocalStorage } from '@/lib/storage/LocalStorage';
import { SummaryManager } from '@/lib/summarization/SummaryManager';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export class HierarchicalMemoryTester {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialise le navigateur headless
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initialisation du navigateur headless...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    
    this.page = await this.browser.newPage();
    
    // Intercepter les requêtes réseau pour debug
    await this.page.setRequestInterception(true);
    this.page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        console.log(`🌐 API Request: ${request.method()} ${request.url()}`);
      }
      request.continue();
    });
    
    console.log('✅ Navigateur initialisé');
  }

  /**
   * Navigue vers la page de chat
   */
  async navigateToChat(): Promise<TestResult> {
    try {
      console.log('🧭 Navigation vers la page de chat...');
      
      await this.page!.goto(`${this.baseUrl}/chat`, { 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });
      
      // Attendre que la page soit chargée
      await this.page!.waitForSelector('input[type="text"]', { timeout: 5000 });
      
      console.log('✅ Page de chat chargée');
      return { success: true, message: 'Navigation réussie' };
    } catch (error) {
      return { success: false, message: `Erreur navigation: ${error}` };
    }
  }

  /**
   * Se connecte avec un nom d'utilisateur
   */
  async loginAsUser(username: string): Promise<TestResult> {
    try {
      console.log(`👤 Connexion en tant que ${username}...`);
      
      // Remplir le champ nom d'utilisateur
      await this.page!.type('input[type="text"]', username);
      
      // Cliquer sur le bouton de connexion
      await this.page!.click('button[type="submit"]');
      
      // Attendre que l'interface de chat apparaisse
      await this.page!.waitForSelector('.theme-gradient-bg', { timeout: 5000 });
      
      console.log(`✅ Connecté en tant que ${username}`);
      return { success: true, message: `Connexion réussie pour ${username}` };
    } catch (error) {
      return { success: false, message: `Erreur connexion: ${error}` };
    }
  }

  /**
   * Envoie un message à Algareth
   */
  async sendMessage(message: string): Promise<TestResult> {
    try {
      console.log(`💬 Envoi du message: "${message}"`);
      
      // Trouver le champ de saisie
      const inputSelector = 'input[placeholder*="message"], input[placeholder*="Message"]';
      await this.page!.waitForSelector(inputSelector, { timeout: 5000 });
      
      // Saisir le message
      await this.page!.type(inputSelector, message);
      
      // Envoyer le message
      await this.page!.click('button[type="submit"]');
      
      // Attendre la réponse d'Algareth
      await this.page!.waitForFunction(
        () => {
          const messages = document.querySelectorAll('[class*="message"], .space-y-4 > div');
          return messages.length >= 2; // Au moins 2 messages (user + assistant)
        },
        { timeout: 15000 }
      );
      
      console.log('✅ Message envoyé et réponse reçue');
      return { success: true, message: 'Message envoyé avec succès' };
    } catch (error) {
      return { success: false, message: `Erreur envoi message: ${error}` };
    }
  }

  /**
   * Vérifie les statistiques de mémoire hiérarchique
   */
  async checkMemoryStats(): Promise<TestResult> {
    try {
      console.log('📊 Vérification des statistiques de mémoire...');
      
      // Attendre que les stats soient visibles
      await this.page!.waitForSelector('[class*="hierarchical"], [class*="memory"]', { timeout: 5000 });
      
      // Prendre une capture d'écran pour debug
      await this.page!.screenshot({ 
        path: '/tmp/memory-stats-debug.png',
        fullPage: false 
      });
      
      // Essayer de récupérer les stats depuis le localStorage
      const localStorageData = await this.page!.evaluate(() => {
        return {
          hierarchicalMemory: localStorage.getItem('hierarchical_memory'),
          userSummaries: localStorage.getItem('lr_tchatagent_user_summaries'),
          conversations: localStorage.getItem('lr_tchatagent_conversations')
        };
      });
      
      console.log('📋 Données localStorage récupérées:', localStorageData);
      
      return { 
        success: true, 
        message: 'Statistiques vérifiées',
        details: localStorageData
      };
    } catch (error) {
      return { success: false, message: `Erreur vérification stats: ${error}` };
    }
  }

  /**
   * Test complet de la mémoire hiérarchique
   */
  async runFullTest(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    try {
      // Initialisation
      await this.initialize();
      results.push({ success: true, message: 'Navigateur initialisé' });
      
      // Navigation
      const navResult = await this.navigateToChat();
      results.push(navResult);
      if (!navResult.success) return results;
      
      // Connexion
      const loginResult = await this.loginAsUser('Lucie');
      results.push(loginResult);
      if (!loginResult.success) return results;
      
      // Conversation avec Algareth pour déclencher les résumés L1
      const conversationMessages = [
        "Salut Algareth, j'espère que tu vas bien aujourd'hui ?",
        "Peux-tu m'expliquer comment fonctionne ton système de mémoire hiérarchique ?",
        "C'est fascinant ! Et comment décides-tu quand créer un résumé L1 ?",
        "Et que se passe-t-il quand tu atteins la limite de ton budget mémoire ?",
        "Merci pour ces explications détaillées, Algareth. Tu es vraiment impressionnant !",
        "Une dernière question : peux-tu me raconter une de tes expériences les plus intéressantes ?",
        "C'est captivant ! Tu as une personnalité vraiment unique, Algareth.",
        "J'aimerais en savoir plus sur tes capacités de compression de données.",
        "Et comment gères-tu la continuité conversationnelle sur de longues sessions ?",
        "Parfait ! Merci pour cette conversation enrichissante, Algareth."
      ];
      
      console.log('🗣️ Début de la conversation avec Algareth...');
      
      for (let i = 0; i < conversationMessages.length; i++) {
        const message = conversationMessages[i];
        console.log(`\n📝 Message ${i + 1}/10`);
        
        const sendResult = await this.sendMessage(message);
        results.push(sendResult);
        
        if (!sendResult.success) {
          console.error(`❌ Échec envoi message ${i + 1}`);
          break;
        }
        
        // Attendre un peu entre les messages
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Vérifier les stats après chaque 5 messages (seuil L1)
        if ((i + 1) % 5 === 0) {
          console.log(`\n🧠 Vérification après ${i + 1} messages (seuil L1)...`);
          const statsResult = await this.checkMemoryStats();
          results.push(statsResult);
        }
      }
      
      // Vérification finale
      console.log('\n📊 Vérification finale des statistiques...');
      const finalStatsResult = await this.checkMemoryStats();
      results.push(finalStatsResult);
      
      // Vérifier la persistance des données
      console.log('\n💾 Vérification de la persistance...');
      const persistenceResult = await this.verifyPersistence();
      results.push(persistenceResult);
      
    } catch (error) {
      results.push({ success: false, message: `Erreur test complet: ${error}` });
    } finally {
      await this.cleanup();
    }
    
    return results;
  }

  /**
   * Vérifie la persistance des données
   */
  async verifyPersistence(): Promise<TestResult> {
    try {
      console.log('💾 Vérification de la persistance des données...');
      
      // Récupérer les données depuis le localStorage
      const localStorageData = await this.page!.evaluate(() => {
        const data: any = {};
        
        // Vérifier les conversations
        const conversations = localStorage.getItem('lr_tchatagent_conversations');
        if (conversations) {
          data.conversations = JSON.parse(conversations);
        }
        
        // Vérifier les résumés
        const summaries = localStorage.getItem('lr_tchatagent_user_summaries');
        if (summaries) {
          data.summaries = JSON.parse(summaries);
        }
        
        // Vérifier la mémoire hiérarchique (si stockée)
        const hierarchicalMemory = localStorage.getItem('hierarchical_memory');
        if (hierarchicalMemory) {
          data.hierarchicalMemory = JSON.parse(hierarchicalMemory);
        }
        
        return data;
      });
      
      console.log('📋 Données de persistance récupérées:', localStorageData);
      
      // Vérifier qu'on a des conversations
      const hasConversations = localStorageData.conversations && 
        localStorageData.conversations.length > 0;
      
      // Vérifier qu'on a des résumés (au moins 2 résumés L1 attendus)
      const hasSummaries = localStorageData.summaries && 
        localStorageData.summaries.length >= 2;
      
      const success = hasConversations && hasSummaries;
      
      return {
        success,
        message: success ? 
          `Persistance vérifiée: ${localStorageData.conversations?.length || 0} conversations, ${localStorageData.summaries?.length || 0} résumés` :
          'Persistance incomplète',
        details: {
          conversations: localStorageData.conversations?.length || 0,
          summaries: localStorageData.summaries?.length || 0,
          hasConversations,
          hasSummaries
        }
      };
      
    } catch (error) {
      return { success: false, message: `Erreur vérification persistance: ${error}` };
    }
  }

  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Nettoyage terminé');
  }

  /**
   * Génère un rapport de test
   */
  generateReport(results: TestResult[]): string {
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    const successRate = Math.round((successful / total) * 100);
    
    let report = `# Rapport de Test - Mémoire Hiérarchique\n\n`;
    report += `**Résumé:** ${successful}/${total} tests réussis (${successRate}%)\n\n`;
    
    report += `## Détails des Tests\n\n`;
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      report += `${index + 1}. ${status} ${result.message}\n`;
      
      if (result.details) {
        report += `   - Détails: ${JSON.stringify(result.details, null, 2)}\n`;
      }
    });
    
    report += `\n## Conclusion\n\n`;
    
    if (successRate >= 80) {
      report += `🎉 **Excellent !** Le système de mémoire hiérarchique fonctionne correctement.\n`;
    } else if (successRate >= 60) {
      report += `⚠️ **Partiellement fonctionnel.** Quelques améliorations nécessaires.\n`;
    } else {
      report += `❌ **Problèmes détectés.** Révision du système recommandée.\n`;
    }
    
    return report;
  }
}

/**
 * Fonction principale de test
 */
export async function runHierarchicalMemoryTest(): Promise<void> {
  console.log('🧪 Démarrage du test automatisé de la mémoire hiérarchique');
  console.log('=' .repeat(60));
  
  const tester = new HierarchicalMemoryTester();
  
  try {
    const results = await tester.runFullTest();
    
    console.log('\n📊 Résultats du test:');
    console.log('=' .repeat(40));
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.message}`);
    });
    
    const report = tester.generateReport(results);
    console.log('\n📋 Rapport complet:');
    console.log(report);
    
    // Sauvegarder le rapport
    const fs = require('fs');
    const reportPath = '/tmp/hierarchical-memory-test-report.md';
    fs.writeFileSync(reportPath, report);
    console.log(`\n💾 Rapport sauvegardé: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  runHierarchicalMemoryTest().catch(console.error);
}