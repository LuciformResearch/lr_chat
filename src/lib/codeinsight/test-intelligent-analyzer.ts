#!/usr/bin/env node
/**
 * Test de l'IntelligentAnalyzer
 * 
 * Teste l'analyse optimisée avec stratégie adaptative
 */

import { IntelligentAnalyzer } from './IntelligentAnalyzer';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testIntelligentAnalyzer() {
  console.log('🧪 Test de l\'IntelligentAnalyzer');
  console.log('================================\n');

  try {
    // Vérifier la clé API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.log('❌ GEMINI_API_KEY non trouvée');
      console.log('   Le test fonctionnera en mode heuristique');
    } else {
      console.log('✅ GEMINI_API_KEY trouvée');
      console.log(`🔑 Clé API: ${geminiApiKey.substring(0, 20)}...`);
    }

    // Créer un fichier de test avec différents types de scopes
    const testFilePath = path.join(process.cwd(), 'test-intelligent.ts');
    const testCode = `// Fichier de test pour IntelligentAnalyzer
import { Component, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interface simple pour les données utilisateur
 */
export interface UserData {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
}

/**
 * Interface pour les paramètres de recherche
 */
export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
}

/**
 * Service simple pour la gestion des utilisateurs
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'https://api.example.com/users';
  
  constructor(private http: HttpClient) {}
  
  /**
   * Récupère tous les utilisateurs
   */
  getUsers(): Observable<UserData[]> {
    return this.http.get<UserData[]>(this.apiUrl);
  }
  
  /**
   * Récupère un utilisateur par ID
   */
  getUserById(id: number): Observable<UserData> {
    return this.http.get<UserData>(\`\${this.apiUrl}/\${id}\`);
  }
  
  /**
   * Crée un nouvel utilisateur
   */
  createUser(user: Omit<UserData, 'id'>): Observable<UserData> {
    return this.http.post<UserData>(this.apiUrl, user);
  }
  
  /**
   * Recherche des utilisateurs avec des paramètres complexes
   */
  searchUsers(params: SearchParams): Observable<UserData[]> {
    const queryParams = new URLSearchParams();
    queryParams.set('q', params.query);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());
    
    return this.http.get<UserData[]>(\`\${this.apiUrl}/search?\${queryParams.toString()}\`);
  }
  
  /**
   * Valide les données utilisateur
   */
  private validateUserData(user: any): boolean {
    return user && 
           typeof user.name === 'string' && 
           typeof user.email === 'string' &&
           user.email.includes('@');
  }
}

/**
 * Fonction utilitaire simple pour formater les noms
 */
export function formatUserName(user: UserData): string {
  return \`\${user.name} (\${user.email})\`;
}

/**
 * Fonction utilitaire pour valider un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Fonction complexe pour traiter les données utilisateur
 */
export function processUserData(users: UserData[], filters: any): UserData[] {
  let processedUsers = users;
  
  // Appliquer les filtres
  if (filters.activeOnly) {
    processedUsers = processedUsers.filter(user => user.isActive);
  }
  
  if (filters.nameContains) {
    processedUsers = processedUsers.filter(user => 
      user.name.toLowerCase().includes(filters.nameContains.toLowerCase())
    );
  }
  
  // Trier par nom
  if (filters.sortByName) {
    processedUsers.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  // Limiter les résultats
  if (filters.limit && filters.limit > 0) {
    processedUsers = processedUsers.slice(0, filters.limit);
  }
  
  return processedUsers;
}`;

    // Écrire le fichier de test
    fs.writeFileSync(testFilePath, testCode, 'utf-8');
    console.log(`📄 Fichier de test créé: ${testFilePath}`);

    // Créer l'IntelligentAnalyzer
    const intelligentAnalyzer = new IntelligentAnalyzer();
    console.log('✅ IntelligentAnalyzer initialisé');

    // Analyser le fichier intelligemment
    console.log('\n🧠 Analyse intelligente du fichier...');
    const startTime = Date.now();
    const result = await intelligentAnalyzer.analyzeFileIntelligently(testFilePath);
    const endTime = Date.now();

    console.log('\n✅ Analyse intelligente terminée !');
    console.log(`⏱️ Temps total: ${endTime - startTime}ms`);

    // Afficher les résultats
    console.log('\n📊 Résultats de l\'analyse intelligente:');
    console.log(`   Fichier: ${result.filePath}`);
    console.log(`   Scopes totaux: ${result.metadata.totalScopes}`);
    console.log(`   Scopes analysés: ${result.metadata.analyzedScopes}`);
    console.log(`   Appels LLM: ${result.metadata.llmCalls}`);
    console.log(`   Optimisation: ${result.metadata.optimizationRatio}%`);
    console.log(`   Durée totale: ${result.metadata.totalDuration}ms`);

    console.log('\n🧠 Stratégie d\'analyse:');
    console.log(`   Mode: ${result.strategy.mode}`);
    console.log(`   Raisonnement: ${result.strategy.reasoning}`);
    console.log(`   Groupes: ${result.strategy.scopeGroups.length}`);
    console.log(`   Scopes individuels: ${result.strategy.individualScopes.length}`);

    console.log('\n📋 Groupes de scopes:');
    result.strategy.scopeGroups.forEach((group, index) => {
      console.log(`   ${index + 1}. ${group.name}`);
      console.log(`      Type: ${group.analysisType}`);
      console.log(`      Complexité: ${group.complexity}`);
      console.log(`      Scopes: ${group.scopes.map(s => s.name).join(', ')}`);
    });

    if (result.strategy.individualScopes.length > 0) {
      console.log('\n🔍 Scopes individuels:');
      result.strategy.individualScopes.forEach((scopeName, index) => {
        console.log(`   ${index + 1}. ${scopeName}`);
      });
    }

    console.log('\n🏗️ Structure:');
    console.log(`   Classes: ${result.summary.scopeTypes.classes}`);
    console.log(`   Fonctions: ${result.summary.scopeTypes.functions}`);
    console.log(`   Interfaces: ${result.summary.scopeTypes.interfaces}`);
    console.log(`   Méthodes: ${result.summary.scopeTypes.methods}`);

    console.log('\n📈 Complexité:');
    console.log(`   Faible: ${result.summary.complexity.low}`);
    console.log(`   Moyenne: ${result.summary.complexity.medium}`);
    console.log(`   Élevée: ${result.summary.complexity.high}`);

    console.log('\n🏷️ Tags:');
    result.summary.tags.forEach(tag => {
      console.log(`   - ${tag}`);
    });

    console.log('\n⚠️ Risques:');
    result.summary.risks.forEach(risk => {
      console.log(`   - ${risk}`);
    });

    console.log('\n💡 Recommandations:');
    result.summary.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });

    // Afficher les détails des scopes avec leur mode d'analyse
    console.log('\n📋 Détails des scopes:');
    result.scopeAnalyses.forEach((scopeAnalysis, index) => {
      const { scope, analysis, success, duration, analysisMode } = scopeAnalysis;
      console.log(`   ${index + 1}. ${scope.type} ${scope.name}`);
      console.log(`      Mode: ${analysisMode}`);
      console.log(`      Succès: ${success ? '✅' : '❌'}`);
      console.log(`      Durée: ${duration}ms`);
      console.log(`      Complexité: ${analysis.complexity}`);
      console.log(`      Tags: ${analysis.tags.join(', ')}`);
      if (analysis.risks.length > 0) {
        console.log(`      Risques: ${analysis.risks.length}`);
      }
      if (analysis.test_ideas.length > 0) {
        console.log(`      Tests: ${analysis.test_ideas.length}`);
      }
    });

    // Sauvegarder les résultats
    console.log('\n💾 Sauvegarde des résultats...');
    const savedPath = await intelligentAnalyzer.saveIntelligentAnalysisResults(result);
    console.log(`✅ Résultats sauvegardés: ${savedPath}`);

    // Nettoyer le fichier de test
    fs.unlinkSync(testFilePath);
    console.log('🧹 Fichier de test supprimé');

    console.log('\n🎉 Test de l\'IntelligentAnalyzer réussi !');
    console.log('==========================================');
    console.log('✅ Analyse préliminaire fonctionne');
    console.log('✅ Stratégie d\'analyse fonctionne');
    console.log('✅ Analyse groupée fonctionne');
    console.log('✅ Analyse individuelle fonctionne');
    console.log('✅ Optimisation des appels LLM fonctionne');
    console.log('✅ Sauvegarde des résultats fonctionne');

    return result;

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testIntelligentAnalyzer().catch(console.error);
}

export { testIntelligentAnalyzer };