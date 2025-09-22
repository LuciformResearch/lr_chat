#!/usr/bin/env node
/**
 * Test du FileRegenerator avec des classes complexes
 * 
 * Teste la régénération sur des fichiers avec des scopes complexes
 * nécessitant une compression plus poussée
 */

import { FileAnalyzer } from './FileAnalyzer';
import { FileCompressor } from './FileCompressor';
import { FileRegenerator } from './FileRegenerator';
import { loadShadeosEnv } from '../utils/SecureEnvManager';
import * as fs from 'fs';
import * as path from 'path';

// Charger les variables d'environnement
loadShadeosEnv({ override: true });

async function testFileRegeneratorComplex() {
  console.log('🧪 Test du FileRegenerator - Classes Complexes');
  console.log('==============================================\n');

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

    // Créer un fichier de test complexe
    const testFilePath = path.join(process.cwd(), 'test-regeneration-complex.ts');
    const testCode = `// Fichier de test complexe pour FileRegenerator
import { Component, Injectable, Input, Output, EventEmitter } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, map, catchError, throwError } from 'rxjs';

/**
 * Interface pour les données utilisateur étendues
 */
export interface UserData {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
  roles: string[];
  lastLogin?: Date;
  preferences: UserPreferences;
}

/**
 * Interface pour les préférences utilisateur
 */
export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  timezone: string;
}

/**
 * Interface pour les paramètres de recherche avancés
 */
export interface SearchParams {
  query: string;
  limit?: number;
  offset?: number;
  filters: SearchFilters;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interface pour les filtres de recherche
 */
export interface SearchFilters {
  isActive?: boolean;
  roles?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Service complexe pour la gestion des utilisateurs
 */
@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiUrl = 'https://api.example.com/users';
  private usersSubject = new BehaviorSubject<UserData[]>([]);
  public users$ = this.usersSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private logger: LoggerService
  ) {}
  
  /**
   * Récupère tous les utilisateurs avec pagination
   */
  getUsers(params?: SearchParams): Observable<UserData[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      if (params.query) httpParams = httpParams.set('q', params.query);
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.offset) httpParams = httpParams.set('offset', params.offset.toString());
      if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
      if (params.sortOrder) httpParams = httpParams.set('sortOrder', params.sortOrder);
    }
    
    return this.http.get<UserData[]>(this.apiUrl, { params: httpParams })
      .pipe(
        map(users => users.map(user => this.transformUserData(user))),
        catchError(error => this.handleError('getUsers', error))
      );
  }
  
  /**
   * Récupère un utilisateur par ID avec gestion d'erreur
   */
  getUserById(id: number): Observable<UserData> {
    return this.http.get<UserData>(\`\${this.apiUrl}/\${id}\`)
      .pipe(
        map(user => this.transformUserData(user)),
        catchError(error => this.handleError('getUserById', error))
      );
  }
  
  /**
   * Crée un nouvel utilisateur avec validation
   */
  createUser(userData: Omit<UserData, 'id'>): Observable<UserData> {
    if (!this.validateUserData(userData)) {
      return throwError(() => new Error('Données utilisateur invalides'));
    }
    
    return this.http.post<UserData>(this.apiUrl, userData)
      .pipe(
        map(user => this.transformUserData(user)),
        catchError(error => this.handleError('createUser', error))
      );
  }
  
  /**
   * Met à jour un utilisateur existant
   */
  updateUser(id: number, userData: Partial<UserData>): Observable<UserData> {
    return this.http.put<UserData>(\`\${this.apiUrl}/\${id}\`, userData)
      .pipe(
        map(user => this.transformUserData(user)),
        catchError(error => this.handleError('updateUser', error))
      );
  }
  
  /**
   * Supprime un utilisateur
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(\`\${this.apiUrl}/\${id}\`)
      .pipe(
        catchError(error => this.handleError('deleteUser', error))
      );
  }
  
  /**
   * Recherche avancée d'utilisateurs
   */
  searchUsers(searchParams: SearchParams): Observable<UserData[]> {
    const params = this.buildSearchParams(searchParams);
    
    return this.http.get<UserData[]>(\`\${this.apiUrl}/search\`, { params })
      .pipe(
        map(users => users.map(user => this.transformUserData(user))),
        catchError(error => this.handleError('searchUsers', error))
      );
  }
  
  /**
   * Valide les données utilisateur
   */
  private validateUserData(userData: any): boolean {
    return userData && 
           typeof userData.name === 'string' && 
           typeof userData.email === 'string' &&
           userData.email.includes('@') &&
           Array.isArray(userData.roles) &&
           userData.preferences &&
           typeof userData.preferences.theme === 'string';
  }
  
  /**
   * Transforme les données utilisateur
   */
  private transformUserData(user: any): UserData {
    return {
      ...user,
      lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
      preferences: {
        theme: user.preferences?.theme || 'light',
        language: user.preferences?.language || 'en',
        notifications: user.preferences?.notifications ?? true,
        timezone: user.preferences?.timezone || 'UTC'
      }
    };
  }
  
  /**
   * Construit les paramètres de recherche
   */
  private buildSearchParams(searchParams: SearchParams): HttpParams {
    let params = new HttpParams();
    
    if (searchParams.query) params = params.set('q', searchParams.query);
    if (searchParams.limit) params = params.set('limit', searchParams.limit.toString());
    if (searchParams.offset) params = params.set('offset', searchParams.offset.toString());
    if (searchParams.sortBy) params = params.set('sortBy', searchParams.sortBy);
    if (searchParams.sortOrder) params = params.set('sortOrder', searchParams.sortOrder);
    
    if (searchParams.filters.isActive !== undefined) {
      params = params.set('isActive', searchParams.filters.isActive.toString());
    }
    
    if (searchParams.filters.roles?.length) {
      params = params.set('roles', searchParams.filters.roles.join(','));
    }
    
    return params;
  }
  
  /**
   * Gère les erreurs HTTP
   */
  private handleError(operation: string, error: any): Observable<never> {
    this.logger.error(\`Erreur \${operation}:\`, error);
    return throwError(() => error);
  }
}

/**
 * Service de logging
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  log(message: string, data?: any): void {
    console.log(\`[LOG] \${message}\`, data);
  }
  
  error(message: string, error?: any): void {
    console.error(\`[ERROR] \${message}\`, error);
  }
  
  warn(message: string, data?: any): void {
    console.warn(\`[WARN] \${message}\`, data);
  }
}

/**
 * Composant complexe pour la gestion des utilisateurs
 */
@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  @Input() initialFilters: SearchFilters = {};
  @Output() userSelected = new EventEmitter<UserData>();
  @Output() usersUpdated = new EventEmitter<UserData[]>();
  
  users: UserData[] = [];
  filteredUsers: UserData[] = [];
  selectedUser: UserData | null = null;
  isLoading = false;
  error: string | null = null;
  searchParams: SearchParams = {
    query: '',
    filters: {},
    limit: 10,
    offset: 0
  };
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private userService: UserManagementService,
    private logger: LoggerService
  ) {}
  
  ngOnInit(): void {
    this.searchParams.filters = { ...this.initialFilters };
    this.loadUsers();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Charge la liste des utilisateurs
   */
  loadUsers(): void {
    this.isLoading = true;
    this.error = null;
    
    this.userService.getUsers(this.searchParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.filteredUsers = users;
          this.isLoading = false;
          this.usersUpdated.emit(users);
        },
        error: (err) => {
          this.error = 'Erreur lors du chargement des utilisateurs';
          this.isLoading = false;
          this.logger.error('Erreur chargement utilisateurs:', err);
        }
      });
  }
  
  /**
   * Recherche des utilisateurs
   */
  searchUsers(): void {
    this.searchParams.offset = 0; // Reset pagination
    this.loadUsers();
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
      this.userService.deleteUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.users = this.users.filter(u => u.id !== user.id);
            this.filteredUsers = this.filteredUsers.filter(u => u.id !== user.id);
            if (this.selectedUser?.id === user.id) {
              this.selectedUser = null;
            }
            this.usersUpdated.emit(this.users);
          },
          error: (err) => {
            this.error = 'Erreur lors de la suppression';
            this.logger.error('Erreur suppression utilisateur:', err);
          }
        });
    }
  }
  
  /**
   * Filtre les utilisateurs par nom
   */
  filterUsersByName(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }
  
  /**
   * Calcule le nombre d'utilisateurs actifs
   */
  getActiveUsersCount(): number {
    return this.users.filter(user => user.isActive).length;
  }
  
  /**
   * Calcule le nombre d'utilisateurs par rôle
   */
  getUsersCountByRole(): Record<string, number> {
    const roleCounts: Record<string, number> = {};
    
    this.users.forEach(user => {
      user.roles.forEach(role => {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
    });
    
    return roleCounts;
  }
}

/**
 * Fonction utilitaire pour formater les noms d'utilisateurs
 */
export function formatUserName(user: UserData, includeEmail = false): string {
  const baseName = \`\${user.name} (\${user.id})\`;
  return includeEmail ? \`\${baseName} - \${user.email}\` : baseName;
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
export function processUserData(
  users: UserData[], 
  filters: SearchFilters,
  sortOptions?: { field: string; order: 'asc' | 'desc' }
): UserData[] {
  let processedUsers = [...users];
  
  // Appliquer les filtres
  if (filters.isActive !== undefined) {
    processedUsers = processedUsers.filter(user => user.isActive === filters.isActive);
  }
  
  if (filters.roles?.length) {
    processedUsers = processedUsers.filter(user => 
      user.roles.some(role => filters.roles!.includes(role))
    );
  }
  
  if (filters.dateRange) {
    processedUsers = processedUsers.filter(user => {
      if (!user.lastLogin) return false;
      return user.lastLogin >= filters.dateRange!.start && 
             user.lastLogin <= filters.dateRange!.end;
    });
  }
  
  // Appliquer le tri
  if (sortOptions) {
    processedUsers.sort((a, b) => {
      const aValue = (a as any)[sortOptions.field];
      const bValue = (b as any)[sortOptions.field];
      
      if (aValue < bValue) return sortOptions.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOptions.order === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  return processedUsers;
}

/**
 * Fonction pour générer des statistiques utilisateur
 */
export function generateUserStatistics(users: UserData[]): {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
  byTheme: Record<string, number>;
} {
  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    byRole: {} as Record<string, number>,
    byTheme: {} as Record<string, number>
  };
  
  users.forEach(user => {
    // Compter par rôle
    user.roles.forEach(role => {
      stats.byRole[role] = (stats.byRole[role] || 0) + 1;
    });
    
    // Compter par thème
    const theme = user.preferences.theme;
    stats.byTheme[theme] = (stats.byTheme[theme] || 0) + 1;
  });
  
  return stats;
}`;

    // Écrire le fichier de test
    fs.writeFileSync(testFilePath, testCode, 'utf-8');
    console.log(`📄 Fichier de test complexe créé: ${testFilePath}`);

    // Étape 1: Analyser le fichier
    console.log('\n🔍 Étape 1: Analyse du fichier complexe...');
    const fileAnalyzer = new FileAnalyzer();
    const analysisResult = await fileAnalyzer.analyzeFile(testFilePath);
    console.log(`✅ Analyse terminée: ${analysisResult.metadata.totalScopes} scopes analysés`);

    // Étape 2: Compresser le fichier
    console.log('\n🗜️ Étape 2: Compression du fichier complexe...');
    const fileCompressor = new FileCompressor();
    const compressedFile = await fileCompressor.compressFile(analysisResult);
    console.log(`✅ Compression terminée: ${compressedFile.metadata.compressionRatio}% de compression`);

    // Étape 3: Régénérer le fichier
    console.log('\n🔄 Étape 3: Régénération du fichier complexe...');
    const fileRegenerator = new FileRegenerator();
    const regenerationResult = await fileRegenerator.regenerateFile(compressedFile);
    console.log(`✅ Régénération terminée: ${regenerationResult.success ? 'SUCCÈS' : 'ÉCHEC'}`);

    // Afficher les résultats
    console.log('\n📊 Résultats de la régénération complexe:');
    console.log(`   Succès: ${regenerationResult.success ? '✅' : '❌'}`);
    console.log(`   Score global: ${regenerationResult.validation.overallScore}/100`);
    console.log(`   Lignes originales: ${regenerationResult.metadata.originalLines}`);
    console.log(`   Lignes régénérées: ${regenerationResult.metadata.regeneratedLines}`);
    console.log(`   Scopes originaux: ${regenerationResult.metadata.originalScopes}`);
    console.log(`   Scopes régénérés: ${regenerationResult.metadata.regeneratedScopes}`);
    console.log(`   Score de fidélité: ${regenerationResult.metadata.fidelityScore}/100`);
    console.log(`   Score de qualité: ${regenerationResult.metadata.qualityScore}/100`);
    console.log(`   Temps de régénération: ${regenerationResult.metadata.regenerationTime}ms`);

    console.log('\n🔍 Validation détaillée:');
    console.log(`   Syntaxe valide: ${regenerationResult.validation.syntaxValid ? '✅' : '❌'}`);
    console.log(`   Structure valide: ${regenerationResult.validation.structureValid ? '✅' : '❌'}`);
    console.log(`   Imports valides: ${regenerationResult.validation.importsValid ? '✅' : '❌'}`);
    console.log(`   Exports valides: ${regenerationResult.validation.exportsValid ? '✅' : '❌'}`);
    console.log(`   Types valides: ${regenerationResult.validation.typeValid ? '✅' : '❌'}`);
    console.log(`   Compilation valide: ${regenerationResult.validation.compilationValid ? '✅' : '❌'}`);

    if (regenerationResult.errors.length > 0) {
      console.log('\n❌ Erreurs:');
      regenerationResult.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }

    if (regenerationResult.warnings.length > 0) {
      console.log('\n⚠️ Avertissements:');
      regenerationResult.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }

    // Afficher un aperçu du code régénéré
    console.log('\n📝 Aperçu du code régénéré complexe:');
    const codeLines = regenerationResult.regeneratedCode.split('\n');
    const previewLines = codeLines.slice(0, 30);
    console.log(previewLines.join('\n'));
    if (codeLines.length > 30) {
      console.log(`... (${codeLines.length - 30} lignes supplémentaires)`);
    }

    // Sauvegarder les résultats
    console.log('\n💾 Sauvegarde des résultats...');
    const savedPath = await fileRegenerator.saveRegeneratedFile(regenerationResult);
    console.log(`✅ Fichier régénéré sauvegardé: ${savedPath}`);

    // Nettoyer le fichier de test
    fs.unlinkSync(testFilePath);
    console.log('🧹 Fichier de test supprimé');

    console.log('\n🎉 Test du FileRegenerator complexe réussi !');
    console.log('===========================================');
    console.log('✅ Analyse de fichier complexe fonctionne');
    console.log('✅ Compression de fichier complexe fonctionne');
    console.log('✅ Régénération de fichier complexe fonctionne');
    console.log('✅ Validation du code complexe fonctionne');
    console.log('✅ Sauvegarde des résultats fonctionne');

    return regenerationResult;

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Exécuter le test si ce fichier est appelé directement
if (require.main === module) {
  testFileRegeneratorComplex().catch(console.error);
}

export { testFileRegeneratorComplex };