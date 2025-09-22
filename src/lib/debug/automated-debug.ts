/**
 * Script de debug automatisé avec navigateur headless
 * Utilise la page /debug pour récupérer toutes les informations
 */

import puppeteer from 'puppeteer';

interface DebugResults {
  success: boolean;
  timestamp: string;
  data: {
    conversations: number;
    summaries: number;
    users: number;
    logs: number;
    lastConversation: string | null;
    lastSummary: string | null;
    localStorageSize: number;
    users: string[];
    recentConversations: any[];
    recentSummaries: any[];
    recentLogs: any[];
  };
  errors: string[];
}

export class AutomatedDebugTool {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initialisation du debug tool automatisé...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 720 }
    });
    
    this.page = await this.browser.newPage();
    
    // Intercepter les erreurs de console
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Erreur console:', msg.text());
      }
    });
    
    console.log('✅ Debug tool initialisé');
  }

  async getDebugData(): Promise<DebugResults> {
    if (!this.page) {
      throw new Error('Debug tool non initialisé');
    }

    console.log('🔍 Récupération des données de debug...');
    
    try {
      // Naviguer vers la page de debug
      await this.page.goto(`${this.baseUrl}/debug`, { 
        waitUntil: 'networkidle2',
        timeout: 10000 
      });

      // Attendre que la page soit chargée
      await this.page.waitForSelector('#total-conversations', { timeout: 5000 });

      // Récupérer les statistiques principales
      const conversations = await this.page.$eval('#total-conversations', el => el.textContent);
      const summaries = await this.page.$eval('#total-summaries', el => el.textContent);
      const users = await this.page.$eval('#total-users', el => el.textContent);
      const logs = await this.page.$eval('#total-logs', el => el.textContent);
      const localStorageSize = await this.page.$eval('#localStorage-size', el => el.textContent);
      const lastConversation = await this.page.$eval('#last-conversation', el => el.textContent);
      const lastSummary = await this.page.$eval('#last-summary', el => el.textContent);

      // Récupérer la liste des utilisateurs
      const usersList = await this.page.$$eval('#users-list .bg-gray-700', elements => 
        elements.map(el => {
          const userEl = el.querySelector('.font-medium');
          const statsEl = el.querySelector('.text-sm');
          return {
            name: userEl?.textContent || '',
            stats: statsEl?.textContent || ''
          };
        })
      );

      // Récupérer les conversations récentes
      const recentConversations = await this.page.$$eval('#recent-conversations .bg-gray-700', elements =>
        elements.map(el => {
          const userEl = el.querySelector('.font-medium');
          const timeEl = el.querySelector('.text-sm.text-gray-400');
          const messageEl = el.querySelector('.text-blue-300');
          const responseEl = el.querySelector('.text-purple-300');
          
          return {
            user: userEl?.textContent || '',
            timestamp: timeEl?.textContent || '',
            message: messageEl?.textContent?.replace('👤 ', '') || '',
            response: responseEl?.textContent?.replace('🤖 ', '') || ''
          };
        })
      );

      // Récupérer les résumés récents
      const recentSummaries = await this.page.$$eval('#recent-summaries .bg-gray-700', elements =>
        elements.map(el => {
          const userEl = el.querySelector('.font-medium');
          const timeEl = el.querySelector('.text-sm.text-gray-400');
          const summaryEl = el.querySelector('.text-sm.text-gray-300');
          const metaEl = el.querySelector('.text-xs.text-gray-400');
          
          return {
            user: userEl?.textContent || '',
            timestamp: timeEl?.textContent || '',
            summary: summaryEl?.textContent || '',
            metadata: metaEl?.textContent || ''
          };
        })
      );

      // Récupérer les logs récents
      const recentLogs = await this.page.$$eval('#recent-logs .bg-gray-700', elements =>
        elements.map(el => {
          const levelEl = el.querySelector('.px-2.py-1.rounded');
          const messageEl = el.querySelector('.text-gray-300');
          const timeEl = el.querySelector('.text-xs.text-gray-400');
          
          return {
            level: levelEl?.textContent || '',
            message: messageEl?.textContent || '',
            timestamp: timeEl?.textContent || ''
          };
        })
      );

      // Récupérer les données JSON brutes
      const rawConversations = await this.page.$eval('#raw-conversations', el => el.textContent);
      const rawSummaries = await this.page.$eval('#raw-summaries', el => el.textContent);

      const results: DebugResults = {
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          conversations: parseInt(conversations || '0'),
          summaries: parseInt(summaries || '0'),
          users: parseInt(users || '0'),
          logs: parseInt(logs || '0'),
          lastConversation: lastConversation === 'Aucune' ? null : lastConversation,
          lastSummary: lastSummary === 'Aucun' ? null : lastSummary,
          localStorageSize: parseInt(localStorageSize?.replace(' caractères', '') || '0'),
          users: usersList.map(u => u.name),
          recentConversations,
          recentSummaries,
          recentLogs
        },
        errors: []
      };

      console.log('✅ Données récupérées avec succès');
      return results;

    } catch (error) {
      console.error('❌ Erreur récupération données:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        data: {
          conversations: 0,
          summaries: 0,
          users: 0,
          logs: 0,
          lastConversation: null,
          lastSummary: null,
          localStorageSize: 0,
          users: [],
          recentConversations: [],
          recentSummaries: [],
          recentLogs: []
        },
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  async testMemorySystem(): Promise<DebugResults> {
    console.log('🧪 Test du système de mémoire...');
    
    try {
      // 1. Vérifier l'état initial
      const initialData = await this.getDebugData();
      console.log('📊 État initial:', {
        conversations: initialData.data.conversations,
        summaries: initialData.data.summaries,
        users: initialData.data.users
      });

      // 2. Naviguer vers le chat pour simuler une conversation
      console.log('💬 Simulation d\'une conversation...');
      await this.page!.goto(`${this.baseUrl}/chat`, { waitUntil: 'networkidle2' });

      // Attendre que la page soit chargée
      await this.page!.waitForSelector('input[type="text"]', { timeout: 5000 });

      // Se connecter avec un nom d'utilisateur
      await this.page!.type('input[type="text"]', 'Lucie_Test');
      await this.page!.click('button[type="submit"]');

      // Attendre l'interface de chat
      await this.page!.waitForSelector('.theme-gradient-bg', { timeout: 5000 });

      // Envoyer un message
      const inputSelector = 'input[placeholder*="message"], input[placeholder*="Message"]';
      await this.page!.waitForSelector(inputSelector, { timeout: 5000 });
      await this.page!.type(inputSelector, 'Salut Algareth, comment ça va ?');
      await this.page!.click('button[type="submit"]');

      // Attendre la réponse
      await this.page!.waitForFunction(
        () => {
          const messages = document.querySelectorAll('[class*="message"], .space-y-4 > div');
          return messages.length >= 2;
        },
        { timeout: 15000 }
      );

      console.log('✅ Conversation simulée');

      // 3. Vérifier l'état après la conversation
      await this.page!.goto(`${this.baseUrl}/debug`, { waitUntil: 'networkidle2' });
      await this.page!.waitForSelector('#total-conversations', { timeout: 5000 });

      const finalData = await this.getDebugData();
      console.log('📊 État final:', {
        conversations: finalData.data.conversations,
        summaries: finalData.data.summaries,
        users: finalData.data.users
      });

      // 4. Analyser les résultats
      const conversationAdded = finalData.data.conversations > initialData.data.conversations;
      const newUser = finalData.data.users.length > initialData.data.users.length;

      console.log('🎯 Résultats du test:');
      console.log(`   - Conversation ajoutée: ${conversationAdded ? '✅' : '❌'}`);
      console.log(`   - Nouvel utilisateur: ${newUser ? '✅' : '❌'}`);
      console.log(`   - Conversations totales: ${finalData.data.conversations}`);
      console.log(`   - Utilisateurs: ${finalData.data.users.join(', ')}`);

      return finalData;

    } catch (error) {
      console.error('❌ Erreur test système:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        data: {
          conversations: 0,
          summaries: 0,
          users: 0,
          logs: 0,
          lastConversation: null,
          lastSummary: null,
          localStorageSize: 0,
          users: [],
          recentConversations: [],
          recentSummaries: [],
          recentLogs: []
        },
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  async generateReport(): Promise<string> {
    console.log('📋 Génération du rapport de debug...');
    
    const debugData = await this.getDebugData();
    
    let report = `# Rapport de Debug - LR_TchatAgent\n\n`;
    report += `**Généré le:** ${debugData.timestamp}\n\n`;
    
    report += `## 📊 Statistiques Générales\n\n`;
    report += `- **Conversations:** ${debugData.data.conversations}\n`;
    report += `- **Résumés:** ${debugData.data.summaries}\n`;
    report += `- **Utilisateurs:** ${debugData.data.users.length}\n`;
    report += `- **Logs:** ${debugData.data.logs}\n`;
    report += `- **Taille localStorage:** ${debugData.data.localStorageSize} caractères\n\n`;
    
    report += `## 👥 Utilisateurs\n\n`;
    if (debugData.data.users.length === 0) {
      report += `Aucun utilisateur trouvé.\n\n`;
    } else {
      debugData.data.users.forEach(user => {
        report += `- **${user}**\n`;
      });
      report += `\n`;
    }
    
    report += `## 💬 Conversations Récentes\n\n`;
    if (debugData.data.recentConversations.length === 0) {
      report += `Aucune conversation trouvée.\n\n`;
    } else {
      debugData.data.recentConversations.forEach((conv, index) => {
        report += `### ${index + 1}. ${conv.user}\n`;
        report += `**Timestamp:** ${conv.timestamp}\n`;
        report += `**Message:** ${conv.message}\n`;
        report += `**Réponse:** ${conv.response}\n\n`;
      });
    }
    
    report += `## 📝 Résumés Récents\n\n`;
    if (debugData.data.recentSummaries.length === 0) {
      report += `Aucun résumé trouvé.\n\n`;
    } else {
      debugData.data.recentSummaries.forEach((summary, index) => {
        report += `### ${index + 1}. ${summary.user}\n`;
        report += `**Timestamp:** ${summary.timestamp}\n`;
        report += `**Résumé:** ${summary.summary}\n`;
        report += `**Métadonnées:** ${summary.metadata}\n\n`;
      });
    }
    
    report += `## 📋 Logs Récents\n\n`;
    if (debugData.data.recentLogs.length === 0) {
      report += `Aucun log trouvé.\n\n`;
    } else {
      debugData.data.recentLogs.forEach((log, index) => {
        report += `### ${index + 1}. [${log.level}] ${log.timestamp}\n`;
        report += `${log.message}\n\n`;
      });
    }
    
    report += `## 🎯 Conclusion\n\n`;
    if (debugData.success) {
      report += `✅ **Le système fonctionne correctement**\n`;
      report += `- ${debugData.data.conversations} conversations sauvegardées\n`;
      report += `- ${debugData.data.summaries} résumés générés\n`;
      report += `- ${debugData.data.users.length} utilisateurs actifs\n`;
    } else {
      report += `❌ **Problèmes détectés**\n`;
      report += `- Erreurs: ${debugData.errors.join(', ')}\n`;
    }
    
    return report;
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Nettoyage terminé');
  }
}

// Fonction principale de test
export async function runAutomatedDebug(): Promise<void> {
  console.log('🧪 Démarrage du debug automatisé');
  console.log('=' .repeat(50));
  
  const debugTool = new AutomatedDebugTool();
  
  try {
    await debugTool.initialize();
    
    // Test 1: Récupération des données
    console.log('\n📊 Test 1: Récupération des données');
    const debugData = await debugTool.getDebugData();
    console.log('✅ Données récupérées:', debugData.success ? 'SUCCESS' : 'FAILED');
    
    // Test 2: Test du système de mémoire
    console.log('\n🧠 Test 2: Test du système de mémoire');
    const memoryTest = await debugTool.testMemorySystem();
    console.log('✅ Test mémoire:', memoryTest.success ? 'SUCCESS' : 'FAILED');
    
    // Test 3: Génération du rapport
    console.log('\n📋 Test 3: Génération du rapport');
    const report = await debugTool.generateReport();
    console.log('✅ Rapport généré');
    
    // Sauvegarder le rapport
    const fs = require('fs');
    const reportPath = '/tmp/lr-tchatagent-debug-report.md';
    fs.writeFileSync(reportPath, report);
    console.log(`💾 Rapport sauvegardé: ${reportPath}`);
    
    console.log('\n🎉 Debug automatisé terminé !');
    
  } catch (error) {
    console.error('❌ Erreur debug automatisé:', error);
  } finally {
    await debugTool.cleanup();
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  runAutomatedDebug().catch(console.error);
}