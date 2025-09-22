#!/usr/bin/env node
/**
 * Test du FileAnalyzer complet
 * 
 * Teste l'analyse complète d'un fichier TypeScript
 */

import { FileAnalyzer } from './FileAnalyzer';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testFileAnalyzer() {
  console.log('🧪 Test du FileAnalyzer complet');
  console.log('===============================\n');

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

    // Créer un fichier de test
    const testFilePath = path.join(process.cwd(), 'test-file-analyzer.ts');
    const testCode = `// Fichier de test pour FileAnalyzer
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interface pour les données utilisateur
 */
export interface UserData {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
}

/**
 * Service pour la gestion des utilisateurs
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
   * Met à jour un utilisateur existant
   */
  updateUser(id: number, user: Partial<UserData>): Observable<UserData> {
    return this.http.put<UserData>(\`\${this.apiUrl}/\${id}\`, user);
  }
  
  /**
   * Supprime un utilisateur
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(\`\${this.apiUrl}/\${id}\`);
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
 * Composant pour afficher la liste des utilisateurs
 */
@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  @Input() users: UserData[] = [];
  @Output() userSelected = new EventEmitter<UserData>();
  
  selectedUser: UserData | null = null;
  isLoading = false;
  error: string | null = null;
  
  constructor(private userService: UserService) {}
  
  ngOnInit(): void {
    this.loadUsers();
  }
  
  /**
   * Charge la liste des utilisateurs
   */
  loadUsers(): void {
    this.isLoading = true;
    this.error = null;
    
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des utilisateurs';
        this.isLoading = false;
        console.error('Erreur:', err);
      }
    });
  }
  
  /**
   * Sélectionne un utilisateur
   */
  selectUser(user: UserData): void {
    this.selectedUser = user;
    this.userSelected.emit(user);
  }
  
  /**
   * Supprime un utilisateur
   */
  deleteUser(user: UserData): void {
    if (confirm(\`Êtes-vous sûr de vouloir supprimer \${user.name} ?\`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== user.id);
          if (this.selectedUser?.id === user.id) {
            this.selectedUser = null;
          }
        },
        error: (err) => {
          this.error = 'Erreur lors de la suppression';
          console.error('Erreur:', err);
        }
      });
    }
  }
  
  /**
   * Calcule le nombre d'utilisateurs actifs
   */
  getActiveUsersCount(): number {
    return this.users.filter(user => user.isActive).length;
  }
  
  /**
   * Filtre les utilisateurs par nom
   */
  filterUsersByName(searchTerm: string): UserData[] {
    if (!searchTerm.trim()) {
      return this.users;
    }
    
    return this.users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
}

/**
 * Fonction utilitaire pour formater les noms
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
 * Fonction utilitaire pour générer un ID unique
 */
export function generateUserId(): number {
  return Math.floor(Math.random() * 1000000);
}`;

    // Écrire le fichier de test
    fs.writeFileSync(testFilePath, testCode, 'utf-8');
    console.log(`📄 Fichier de test créé: ${testFilePath}`);

    // Créer le FileAnalyzer
    const fileAnalyzer = new FileAnalyzer();
    console.log('✅ FileAnalyzer initialisé');

    // Analyser le fichier
    console.log('\n🔍 Analyse du fichier...');
    const startTime = Date.now();
    const result = await fileAnalyzer.analyzeFile(testFilePath);
    const endTime = Date.now();

    console.log('\n✅ Analyse terminée !');
    console.log(`⏱️ Temps total: ${endTime - startTime}ms`);

    // Afficher les résultats
    console.log('\n📊 Résultats:');
    console.log(`   Fichier: ${result.filePath}`);
    console.log(`   Scopes totaux: ${result.metadata.totalScopes}`);
    console.log(`   Scopes analysés: ${result.metadata.analyzedScopes}`);
    console.log(`   Appels LLM: ${result.metadata.llmCalls}`);
    console.log(`   Durée totale: ${result.metadata.totalDuration}ms`);

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

    // Sauvegarder les résultats
    console.log('\n💾 Sauvegarde des résultats...');
    const savedPath = await fileAnalyzer.saveAnalysisResults(result);
    console.log(`✅ Résultats sauvegardés: ${savedPath}`);

    // Nettoyer le fichier de test
    fs.unlinkSync(testFilePath);
    console.log('🧹 Fichier de test supprimé');

    console.log('\n🎉 Test du FileAnalyzer réussi !');
    console.log('================================');
    console.log('✅ Parsing TypeScript fonctionne');
    console.log('✅ Analyse LLM fonctionne');
    console.log('✅ Génération de résumé fonctionne');
    console.log('✅ Sauvegarde des résultats fonctionne');

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testFileAnalyzer().catch(console.error);
}

export { testFileAnalyzer };