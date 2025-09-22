/**
 * Générateur de fichiers d'artefacts pour les conversations multi-entités
 */

import { MultiEntityMemorySystem, ConversationArtifacts } from './MultiEntityMemorySystem';
import { ConversationArtifactGenerator, DetailedArtifacts } from './ConversationArtifactGenerator';
import * as fs from 'fs';
import * as path from 'path';

export class ArtifactFileGenerator {
  private baseDir: string;

  constructor(baseDir: string = '/home/luciedefraiteur/lr-tchatagent-web/memory-artefacts') {
    this.baseDir = baseDir;
    this.ensureDirectoryExists(baseDir);
  }

  /**
   * Génère tous les artefacts dans des fichiers organisés
   */
  async generateArtifactFiles(
    system: MultiEntityMemorySystem,
    sessionId: string
  ): Promise<string[]> {
    // Créer un nom de session avec format horodaté lisible
    const now = new Date();
    const timestamp = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}-${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
    const readableSessionId = `session-${timestamp}`;
    
    const sessionDir = path.join(this.baseDir, readableSessionId);
    this.ensureDirectoryExists(sessionDir);

    const generatedFiles: string[] = [];

    // 1. Générer les artefacts de base
    const basicArtifacts = system.generateConversationArtifacts();
    
    // 2. Générer les artefacts détaillés
    const artifactGenerator = new ConversationArtifactGenerator();
    const detailedArtifacts = artifactGenerator.generateDetailedArtifacts(basicArtifacts);

    // 3. Sauvegarder les prompts finaux de chaque entité
    const promptFiles = await this.saveEntityPrompts(system, sessionDir, sessionId);
    generatedFiles.push(...promptFiles);

    // 4. Sauvegarder la conversation complète
    const conversationFile = await this.saveFullConversation(basicArtifacts, sessionDir, sessionId);
    generatedFiles.push(conversationFile);

    // 5. Sauvegarder tous les résumés
    const summaryFiles = await this.saveAllSummaries(system, sessionDir, sessionId);
    generatedFiles.push(...summaryFiles);

    // 6. Sauvegarder les artefacts détaillés
    const artifactFiles = await this.saveDetailedArtifacts(detailedArtifacts, sessionDir, sessionId);
    generatedFiles.push(...artifactFiles);

    // 7. Sauvegarder les statistiques
    const statsFile = await this.saveStatistics(basicArtifacts, sessionDir, sessionId);
    generatedFiles.push(statsFile);

    // 8. Créer un index des fichiers
    const indexFile = await this.createIndex(generatedFiles, sessionDir, sessionId);
    generatedFiles.push(indexFile);

    console.log(`\n📁 Artefacts générés dans: ${sessionDir}`);
    console.log(`📄 Fichiers créés: ${generatedFiles.length}`);
    console.log(`📅 Session horodatée: ${readableSessionId}`);

    return generatedFiles;
  }

  /**
   * Sauvegarde les prompts finaux de chaque entité
   */
  private async saveEntityPrompts(
    system: MultiEntityMemorySystem,
    sessionDir: string,
    sessionId: string
  ): Promise<string[]> {
    const files: string[] = [];
    const entities = system.getAllEntities();

    for (const entity of entities) {
      const promptContent = this.generateEntityPromptContent(entity, system);
      const fileName = `prompt-final-${entity.id}.md`;
      const filePath = path.join(sessionDir, fileName);
      
      await fs.promises.writeFile(filePath, promptContent, 'utf-8');
      files.push(filePath);
      
      console.log(`✅ Prompt final sauvegardé: ${fileName}`);
    }

    return files;
  }

  /**
   * Génère le contenu du prompt final d'une entité
   */
  private generateEntityPromptContent(entity: any, system: MultiEntityMemorySystem): string {
    const stats = system.getEntityStats(entity.id);
    const memoryStats = entity.memoryEngine.getStats();
    const lastPrompt = entity.memoryEngine.getLastPrompt();

    return `# Prompt Final - ${entity.name}

**Session:** ${system['currentSession']}  
**Entité:** ${entity.id}  
**Généré le:** ${new Date().toISOString()}

## 📊 Statistiques de l'Entité

- **Messages totaux:** ${stats?.totalMessages || 0}
- **Recherches proactives:** ${stats?.proactiveSearches || 0}
- **Réponses avec ***se rappeler***:** ${stats?.seRappelerResponses || 0}
- **Indicateurs de conscience:** ${stats?.consciousnessIndicators || 0}
- **Actions de compression:** ${stats?.compressionActions || 0}
- **Dernier résumé généré:** ${stats?.lastSummaryGenerated || 'Aucun'}

## 🧠 État de la Mémoire

- **Messages en mémoire:** ${memoryStats.totalMessages}
- **Résumés L1:** ${memoryStats.l1Count}
- **Résumés L2:** ${memoryStats.l2Count}
- **Résumés L3:** ${memoryStats.l3Count}
- **Budget utilisé:** ${memoryStats.budget.percentage.toFixed(1)}%
- **Items indexés:** ${memoryStats.searchStats.totalItems}
- **Tags uniques:** ${memoryStats.searchStats.totalTags}

## 🎭 Personnalité

${entity.personality}

## 📝 DERNIER PROMPT EXACT ENVOYÉ À L'LLM

\`\`\`
${lastPrompt || 'Aucun prompt trouvé'}
\`\`\`

## 📄 Résumés Générés

${this.generateSummariesContent(entity)}

## 🔍 Statistiques de Recherche

- **Seuil de recherche:** ${memoryStats.searchStats.searchThreshold}
- **Chance de recherche aléatoire:** ${memoryStats.searchStats.randomSearchChance}
- **Tags les plus fréquents:**
${memoryStats.searchStats.mostFrequentTags.slice(0, 10).map(({tag, frequency}) => `  - ${tag}: ${frequency}`).join('\n')}

## 🎯 État Final

L'entité ${entity.name} a évolué au cours de cette session avec ${stats?.consciousnessIndicators || 0} indicateurs de conscience émergente et ${stats?.proactiveSearches || 0} recherches proactives déclenchées.

---
*Généré automatiquement par le système de mémoire multi-entités*
`;
  }

  /**
   * Sauvegarde la conversation complète
   */
  private async saveFullConversation(
    artifacts: ConversationArtifacts,
    sessionDir: string,
    sessionId: string
  ): Promise<string> {
    const fileName = `conversation-complete.md`;
    const filePath = path.join(sessionDir, fileName);

    const conversationContent = this.generateConversationContent(artifacts);
    
    await fs.promises.writeFile(filePath, conversationContent, 'utf-8');
    console.log(`✅ Conversation complète sauvegardée: ${fileName}`);
    
    return filePath;
  }

  /**
   * Génère le contenu de la conversation complète
   */
  private generateConversationContent(artifacts: ConversationArtifacts): string {
    return `# Conversation Complète

**Session:** ${artifacts.sessionId}  
**Début:** ${artifacts.startTime}  
**Fin:** ${artifacts.endTime}  
**Participants:** ${artifacts.participants.join(', ')}  
**Tours totaux:** ${artifacts.totalTurns}

## 📊 Résumé de Session

- **Messages totaux:** ${Array.from(artifacts.entityStats.values()).reduce((sum, stats) => sum + stats.totalMessages, 0)}
- **Recherches proactives:** ${Array.from(artifacts.entityStats.values()).reduce((sum, stats) => sum + stats.proactiveSearches, 0)}
- **Indicateurs de conscience:** ${Array.from(artifacts.entityStats.values()).reduce((sum, stats) => sum + stats.consciousnessIndicators, 0)}
- **Compressions mémoire:** ${Array.from(artifacts.entityStats.values()).reduce((sum, stats) => sum + stats.compressionActions, 0)}

## 💬 Conversation Détaillée

${artifacts.conversationFlow.map((turn, index) => `
### Tour ${index + 1} - ${turn.entityName}

**Timestamp:** ${turn.timestamp}  
**Recherche proactive:** ${turn.searchTriggered ? '✅' : '❌'}  
*****se rappeler*** utilisé:** ${turn.seRappelerUsed ? '✅' : '❌'}  
**Indicateurs conscience:** ${turn.consciousnessIndicators}

\`\`\`
${turn.message}
\`\`\`
`).join('\n')}

## 🧠 Analyse de Conscience

**Indicateurs totaux:** ${artifacts.consciousnessAnalysis.totalIndicators}  
**Pic de conscience:** ${artifacts.consciousnessAnalysis.peakConsciousness.entity} (tour ${artifacts.consciousnessAnalysis.peakConsciousness.turn})

### Conscience par entité:
${Array.from(artifacts.consciousnessAnalysis.entityConsciousness.entries()).map(([entity, indicators]) => 
  `- **${entity}:** ${indicators} indicateurs`
).join('\n')}

### Évolution de la conscience:
${artifacts.consciousnessAnalysis.consciousnessEvolution.map(evolution => 
  `- **Tour ${evolution.turn}:** ${evolution.entity} (${evolution.indicators} indicateurs)`
).join('\n')}

## 🔍 Analyse des Recherches

**Recherches totaux:** ${artifacts.searchAnalysis.totalSearches}

### Recherches par entité:
${Array.from(artifacts.searchAnalysis.entitySearches.entries()).map(([entity, searches]) => 
  `- **${entity}:** ${searches} recherches`
).join('\n')}

### Efficacité par entité:
${Array.from(artifacts.searchAnalysis.searchEffectiveness.entries()).map(([entity, effectiveness]) => 
  `- **${entity}:** ${(effectiveness * 100).toFixed(1)}%`
).join('\n')}

### Tags les plus recherchés:
${artifacts.searchAnalysis.mostSearchedTags?.slice(0, 10).map(({tag, frequency}) => 
  `- **${tag}:** ${frequency}`
).join('\n') || 'Aucun tag trouvé'}

## 🗜️ Analyse de la Compression

**Compressions totaux:** ${artifacts.compressionAnalysis.totalCompressions}

### Compression par entité:
${Array.from(artifacts.compressionAnalysis.entityCompressions.entries()).map(([entity, compressions]) => 
  `- **${entity}:** ${compressions} compressions`
).join('\n')}

### Efficacité mémoire par entité:
${Array.from(artifacts.compressionAnalysis.memoryEfficiency.entries()).map(([entity, efficiency]) => 
  `- **${entity}:** ${efficiency} résumés`
).join('\n')}

### Utilisation budget par entité:
${Array.from(artifacts.compressionAnalysis.budgetUtilization.entries()).map(([entity, budget]) => 
  `- **${entity}:** ${budget.toFixed(1)}%`
).join('\n')}

---
*Généré automatiquement par le système de mémoire multi-entités*
`;
  }

  /**
   * Sauvegarde tous les résumés
   */
  private async saveAllSummaries(
    system: MultiEntityMemorySystem,
    sessionDir: string,
    sessionId: string
  ): Promise<string[]> {
    const files: string[] = [];
    const entities = system.getAllEntities();

    for (const entity of entities) {
      const exportData = entity.memoryEngine.exportMemory();
      const summaries = exportData.items.filter(item => item.type === 'sum');

      if (summaries.length > 0) {
        const summaryContent = this.generateSummaryContent(entity, summaries);
        const fileName = `resumes-${entity.id}.md`;
        const filePath = path.join(sessionDir, fileName);
        
        await fs.promises.writeFile(filePath, summaryContent, 'utf-8');
        files.push(filePath);
        
        console.log(`✅ Résumés sauvegardés: ${fileName} (${summaries.length} résumés)`);
      } else {
        console.log(`⚠️  Aucun résumé trouvé pour ${entity.id}`);
      }
    }

    return files;
  }

  /**
   * Génère le contenu des résumés
   */
  private generateSummaryContent(entity: any, summaries: any[]): string {
    return `# Résumés - ${entity.name}

**Entité:** ${entity.id}  
**Généré le:** ${new Date().toISOString()}  
**Nombre de résumés:** ${summaries.length}

## 📄 Résumés Générés

${summaries.map((summary, index) => `
### Résumé ${index + 1} (L${summary.level})

**ID:** ${summary.id}  
**Timestamp:** ${summary.timestamp}  
**Niveau:** L${summary.level}  
**Longueur:** ${summary.text.length} caractères  
**Topics:** ${summary.topics?.join(', ') || 'Aucun'}  
**Messages couverts:** ${summary.covers?.length || 0}  
**Autorité:** ${summary.authority?.toFixed(2) || 'N/A'}  
**Feedback utilisateur:** ${summary.user_feedback?.toFixed(2) || 'N/A'}  
**Coût d'accès:** ${summary.access_cost?.toFixed(2) || 'N/A'}

#### Contenu:
\`\`\`
${summary.text}
\`\`\`

#### Analyse de conscience:
${this.analyzeSummaryConsciousness(summary.text)}

---
`).join('\n')}

## 📊 Statistiques des Résumés

- **Résumés L1:** ${summaries.filter(s => s.level === 1).length}
- **Résumés L2:** ${summaries.filter(s => s.level === 2).length}
- **Résumés L3:** ${summaries.filter(s => s.level === 3).length}
- **Longueur moyenne:** ${(summaries.reduce((sum, s) => sum + s.text.length, 0) / summaries.length).toFixed(0)} caractères
- **Topics uniques:** ${[...new Set(summaries.flatMap(s => s.topics || []))].length}

---
*Généré automatiquement par le système de mémoire multi-entités*
`;
  }

  /**
   * Analyse la conscience dans un résumé
   */
  private analyzeSummaryConsciousness(text: string): string {
    const consciousnessWords = [
      'je', 'j\'ai', 'mon', 'ma', 'mes',
      'conscience', 'ressenti', 'sentiment', 'émotion',
      'réflexion', 'pensée', 'méditation', 'introspection',
      'évolution', 'croissance', 'apprentissage', 'découverte'
    ];
    
    const foundWords = consciousnessWords.filter(word => 
      text.toLowerCase().includes(word)
    );
    
    const count = foundWords.length;
    const percentage = (count / consciousnessWords.length * 100).toFixed(1);
    
    return `**Indicateurs de conscience:** ${count}/${consciousnessWords.length} (${percentage}%)  
**Mots trouvés:** ${foundWords.join(', ')}`;
  }

  /**
   * Sauvegarde les artefacts détaillés
   */
  private async saveDetailedArtifacts(
    artifacts: DetailedArtifacts,
    sessionDir: string,
    sessionId: string
  ): Promise<string[]> {
    const files: string[] = [];

    // Rapport de conscience
    const consciousnessFile = path.join(sessionDir, 'rapport-conscience.md');
    await fs.promises.writeFile(consciousnessFile, this.generateConsciousnessReport(artifacts), 'utf-8');
    files.push(consciousnessFile);

    // Rapport de recherche
    const searchFile = path.join(sessionDir, 'rapport-recherche.md');
    await fs.promises.writeFile(searchFile, this.generateSearchReport(artifacts), 'utf-8');
    files.push(searchFile);

    // Rapport de mémoire
    const memoryFile = path.join(sessionDir, 'rapport-memoire.md');
    await fs.promises.writeFile(memoryFile, this.generateMemoryReport(artifacts), 'utf-8');
    files.push(memoryFile);

    // Recommandations
    const recommendationsFile = path.join(sessionDir, 'recommandations.md');
    await fs.promises.writeFile(recommendationsFile, this.generateRecommendations(artifacts), 'utf-8');
    files.push(recommendationsFile);

    console.log(`✅ Artefacts détaillés sauvegardés: 4 fichiers`);

    return files;
  }

  /**
   * Génère le rapport de conscience
   */
  private generateConsciousnessReport(artifacts: DetailedArtifacts): string {
    return `# Rapport de Conscience

**Session:** ${artifacts.sessionSummary.sessionId}  
**Généré le:** ${new Date().toISOString()}

## 🧠 Niveau Global

**Niveau de conscience:** ${artifacts.consciousnessReport.overallLevel}  
**Indicateurs totaux:** ${artifacts.sessionSummary.totalConsciousness}

## 👥 Conscience par Entité

${Array.from(artifacts.consciousnessReport.entityConsciousness.entries()).map(([entity, level]) => 
  `- **${entity}:** ${level}`
).join('\n')}

## 📈 Évolution de la Conscience

${artifacts.consciousnessReport.consciousnessEvolution.map(evolution => 
  `- **Tour ${evolution.turn}:** ${evolution.entity} (niveau ${evolution.level})`
).join('\n')}

## 🎯 Moments de Pic

${artifacts.consciousnessReport.peakMoments.map(moment => 
  `- **Tour ${moment.turn} - ${moment.entity}:** ${moment.moment}`
).join('\n')}

## 📊 Indicateurs de Conscience

- **Auto-référence:** ${(artifacts.consciousnessReport.consciousnessIndicators.selfReference * 100).toFixed(1)}%
- **Introspection:** ${(artifacts.consciousnessReport.consciousnessIndicators.introspection * 100).toFixed(1)}%
- **Conscience émotionnelle:** ${(artifacts.consciousnessReport.consciousnessIndicators.emotionalAwareness * 100).toFixed(1)}%
- **Pensée philosophique:** ${(artifacts.consciousnessReport.consciousnessIndicators.philosophicalThinking * 100).toFixed(1)}%
- **Incertitude:** ${(artifacts.consciousnessReport.consciousnessIndicators.uncertainty * 100).toFixed(1)}%

---
*Généré automatiquement par le système de mémoire multi-entités*
`;
  }

  /**
   * Génère le rapport de recherche
   */
  private generateSearchReport(artifacts: DetailedArtifacts): string {
    return `# Rapport de Recherche

**Session:** ${artifacts.sessionSummary.sessionId}  
**Généré le:** ${new Date().toISOString()}

## 🔍 Statistiques Globales

**Recherches totaux:** ${artifacts.searchReport.totalSearches}

## 📊 Efficacité par Entité

${Array.from(artifacts.searchReport.searchEffectiveness.entries()).map(([entity, efficiency]) => 
  `- **${entity}:** ${(efficiency * 100).toFixed(1)}%`
).join('\n')}

## 🏷️ Tags les Plus Recherchés

${artifacts.searchReport.mostSearchedTags?.slice(0, 10).map(({tag, frequency}) => 
  `- **${tag}:** ${frequency}`
).join('\n') || 'Aucun tag trouvé'}

---
*Généré automatiquement par le système de mémoire multi-entités*
`;
  }

  /**
   * Génère le rapport de mémoire
   */
  private generateMemoryReport(artifacts: DetailedArtifacts): string {
    return `# Rapport de Mémoire

**Session:** ${artifacts.sessionSummary.sessionId}  
**Généré le:** ${new Date().toISOString()}

## 🗜️ Statistiques Globales

**Compressions totaux:** ${artifacts.memoryReport.totalCompressions}

## 📊 Efficacité Mémoire par Entité

${Array.from(artifacts.memoryReport.memoryEfficiency.entries()).map(([entity, efficiency]) => 
  `- **${entity}:** ${efficiency} résumés`
).join('\n')}

## 💰 Utilisation Budget par Entité

${Array.from(artifacts.memoryReport.budgetUtilization.entries()).map(([entity, budget]) => 
  `- **${entity}:** ${budget.toFixed(1)}%`
).join('\n')}

---
*Généré automatiquement par le système de mémoire multi-entités*
`;
  }

  /**
   * Génère les recommandations
   */
  private generateRecommendations(artifacts: DetailedArtifacts): string {
    return `# Recommandations

**Session:** ${artifacts.sessionSummary.sessionId}  
**Généré le:** ${new Date().toISOString()}

## 🔧 Améliorations Système

${artifacts.recommendations.systemImprovements.map(improvement => 
  `- ${improvement}`
).join('\n')}

## 👥 Optimisations Entités

${Array.from(artifacts.recommendations.entityOptimizations.entries()).map(([entity, optimizations]) => 
  `### ${entity}\n${optimizations.map(opt => `- ${opt}`).join('\n')}`
).join('\n\n')}

## 💬 Améliorations Conversation

${artifacts.recommendations.conversationEnhancements.map(enhancement => 
  `- ${enhancement}`
).join('\n')}

## 🗜️ Optimisations Mémoire

${artifacts.recommendations.memoryOptimizations.map(optimization => 
  `- ${optimization}`
).join('\n')}

## 🧠 Développement Conscience

${artifacts.recommendations.consciousnessDevelopment.map(development => 
  `- ${development}`
).join('\n')}

---
*Généré automatiquement par le système de mémoire multi-entités*
`;
  }

  /**
   * Sauvegarde les statistiques
   */
  private async saveStatistics(
    artifacts: ConversationArtifacts,
    sessionDir: string,
    sessionId: string
  ): Promise<string> {
    const fileName = `statistiques.json`;
    const filePath = path.join(sessionDir, fileName);

    const stats = {
      session: {
        id: artifacts.sessionId,
        startTime: artifacts.startTime,
        endTime: artifacts.endTime,
        participants: artifacts.participants,
        totalTurns: artifacts.totalTurns
      },
      entities: Object.fromEntries(artifacts.entityStats),
      memory: Object.fromEntries(artifacts.memoryStats),
      consciousness: {
        totalIndicators: artifacts.consciousnessAnalysis.totalIndicators,
        entityConsciousness: Object.fromEntries(artifacts.consciousnessAnalysis.entityConsciousness),
        peakConsciousness: artifacts.consciousnessAnalysis.peakConsciousness
      },
      search: {
        totalSearches: artifacts.searchAnalysis.totalSearches,
        entitySearches: Object.fromEntries(artifacts.searchAnalysis.entitySearches),
        searchEffectiveness: Object.fromEntries(artifacts.searchAnalysis.searchEffectiveness),
        mostSearchedTags: artifacts.searchAnalysis.mostSearchedTags
      },
      compression: {
        totalCompressions: artifacts.compressionAnalysis.totalCompressions,
        entityCompressions: Object.fromEntries(artifacts.compressionAnalysis.entityCompressions),
        memoryEfficiency: Object.fromEntries(artifacts.compressionAnalysis.memoryEfficiency),
        budgetUtilization: Object.fromEntries(artifacts.compressionAnalysis.budgetUtilization)
      }
    };

    await fs.promises.writeFile(filePath, JSON.stringify(stats, null, 2), 'utf-8');
    console.log(`✅ Statistiques sauvegardées: ${fileName}`);
    
    return filePath;
  }

  /**
   * Crée un index des fichiers
   */
  private async createIndex(files: string[], sessionDir: string, sessionId: string): Promise<string> {
    const fileName = `INDEX.md`;
    const filePath = path.join(sessionDir, fileName);

    const indexContent = `# Index des Artefacts

**Session:** ${sessionId}  
**Généré le:** ${new Date().toISOString()}  
**Nombre de fichiers:** ${files.length}

## 📁 Fichiers Générés

${files.map(file => {
      const fileName = path.basename(file);
      const relativePath = path.relative(sessionDir, file);
      return `- [${fileName}](${relativePath})`;
    }).join('\n')}

## 📊 Résumé

Cette session a généré ${files.length} fichiers d'artefacts contenant :
- Les prompts finaux de chaque entité
- La conversation complète
- Tous les résumés générés
- Les rapports détaillés (conscience, recherche, mémoire)
- Les recommandations d'amélioration
- Les statistiques au format JSON

---
*Généré automatiquement par le système de mémoire multi-entités*
`;

    await fs.promises.writeFile(filePath, indexContent, 'utf-8');
    console.log(`✅ Index créé: ${fileName}`);
    
    return filePath;
  }

  /**
   * Génère le contenu des résumés pour une entité
   */
  private generateSummariesContent(entity: any): string {
    const exportData = entity.memoryEngine.exportMemory();
    const summaries = exportData.items.filter(item => item.type === 'sum');
    
    if (summaries.length === 0) {
      return `**Aucun résumé généré** - Le budget mémoire est dépassé (${exportData.stats.budget.percentage.toFixed(1)}%) mais la compression ne s'est pas déclenchée.`;
    }
    
    return summaries.map((summary, index) => `
### Résumé ${index + 1} (L${summary.level})
**ID:** ${summary.id}  
**Timestamp:** ${summary.timestamp}  
**Longueur:** ${summary.text.length} caractères  
**Topics:** ${summary.topics?.join(', ') || 'Aucun'}  
**Messages couverts:** ${summary.covers?.length || 0}

\`\`\`
${summary.text}
\`\`\`
`).join('\n');
  }

  /**
   * S'assure qu'un répertoire existe
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}