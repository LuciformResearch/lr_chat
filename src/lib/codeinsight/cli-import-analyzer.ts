#!/usr/bin/env node
/**
 * 🔍 CLI pour l'analyseur d'imports TypeScript
 * 
 * Script de ligne de commande pour analyser les imports d'un projet TypeScript
 * Inspiré de l'approche Python validée avec les patterns suivants :
 * - Détection automatique des modules locaux
 * - Cache intelligent pour les performances
 * - Rapports structurés (JSON + Markdown)
 * - Gestion d'erreurs robuste
 */

import * as fs from 'fs';
import * as path from 'path';
import { TypeScriptImportAnalyzer, analyzeProject } from './ImportAnalyzer';

interface CLIOptions {
  files?: string[];
  projectRoot?: string;
  maxDepth?: number;
  output?: string;
  markdown?: string;
  showModules?: boolean;
  debug?: boolean;
  patterns?: string[];
}

function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--max-depth':
        options.maxDepth = parseInt(args[++i]);
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--markdown':
        options.markdown = args[++i];
        break;
      case '--project-root':
        options.projectRoot = args[++i];
        break;
      case '--show-modules':
        options.showModules = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--patterns':
        options.patterns = args[++i].split(',');
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('--')) {
          if (!options.files) {
            options.files = [];
          }
          options.files.push(arg);
        }
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
🔍 TypeScript Import Analyzer CLI

Usage:
  npx ts-node cli-import-analyzer.ts [options] [files...]

Options:
  --max-depth <number>     Limite de profondeur pour l'analyse récursive (défaut: 10)
  --output <file>          Fichier de sortie JSON pour le rapport
  --markdown <file>        Fichier de sortie Markdown pour le rapport
  --project-root <path>    Racine du projet (défaut: répertoire courant)
  --show-modules           Afficher les modules détectés automatiquement
  --debug                  Mode debug avec informations détaillées
  --patterns <patterns>    Patterns de fichiers à analyser (défaut: "**/*.ts,**/*.tsx")
  --help                   Afficher cette aide

Exemples:
  # Analyser des fichiers spécifiques
  npx ts-node cli-import-analyzer.ts src/lib/utils.ts src/components/Button.tsx

  # Analyser tout le projet
  npx ts-node cli-import-analyzer.ts --patterns "**/*.ts,**/*.tsx"

  # Avec limite de profondeur et sortie
  npx ts-node cli-import-analyzer.ts --max-depth 5 --output report.json --markdown report.md

  # Mode debug avec affichage des modules
  npx ts-node cli-import-analyzer.ts --debug --show-modules src/
`);
}

async function main(): Promise<void> {
  const options = parseArguments();
  
  // Déterminer la racine du projet
  const projectRoot = options.projectRoot || process.cwd();
  
  console.log("🚀 Début de l'analyse d'imports TypeScript...");
  console.log(`   Project root: ${projectRoot}`);
  console.log(`   Max depth: ${options.maxDepth || 10}`);
  
  let report;
  
  try {
    if (options.files && options.files.length > 0) {
      // Analyser des fichiers spécifiques
      console.log(`   Fichiers à analyser: ${options.files.length}`);
      
      const analyzer = new TypeScriptImportAnalyzer(projectRoot);
      report = await analyzer.analyzeFiles(options.files, options.maxDepth);
      
      if (options.showModules) {
        console.log();
        analyzer.printDetectedModules();
      }
    } else {
      // Analyser tout le projet
      const patterns = options.patterns || ['**/*.ts', '**/*.tsx'];
      console.log(`   Patterns: ${patterns.join(', ')}`);
      
      report = await analyzeProject(projectRoot, patterns, options.maxDepth);
    }
    
    // Afficher les résultats
    const stats = report.statistics;
    console.log(`\n📊 Résultats de l'analyse:`);
    console.log(`  Fichiers analysés: ${stats.filesAnalyzed}`);
    console.log(`  Imports totaux: ${stats.totalImports}`);
    console.log(`  Imports locaux: ${stats.localImports}`);
    console.log(`  Imports externes: ${stats.externalImports}`);
    console.log(`  Imports standard: ${stats.standardImports}`);
    console.log(`  Cycles détectés: ${stats.cyclesDetected}`);
    console.log(`  Durée: ${stats.duration}ms`);
    
    // Sauvegarder le rapport JSON si demandé
    if (options.output) {
      const analyzer = new TypeScriptImportAnalyzer(projectRoot);
      analyzer.saveReport(report, options.output);
      console.log(`\n💾 Rapport JSON sauvegardé: ${options.output}`);
    }
    
    // Sauvegarder le rapport Markdown si demandé
    if (options.markdown) {
      const analyzer = new TypeScriptImportAnalyzer(projectRoot);
      const markdownContent = analyzer.generateMarkdownReport(report);
      fs.writeFileSync(options.markdown, markdownContent, 'utf-8');
      console.log(`📝 Rapport Markdown sauvegardé: ${options.markdown}`);
    } else {
      // Générer le rapport Markdown par défaut
      const analyzer = new TypeScriptImportAnalyzer(projectRoot);
      const markdownContent = analyzer.generateMarkdownReport(report);
      const defaultMarkdownPath = path.join(projectRoot, 'imports_analysis_report.md');
      fs.writeFileSync(defaultMarkdownPath, markdownContent, 'utf-8');
      console.log(`\n📝 Rapport Markdown généré: ${defaultMarkdownPath}`);
    }
    
    console.log(`\n✅ Analyse terminée!`);
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse:`, error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

export { main as runImportAnalysis };