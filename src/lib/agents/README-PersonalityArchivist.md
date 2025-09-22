# Agent Archiviste avec Personnalité et Outils Spécialisés

## Vue d'ensemble

L'Agent Archiviste avec Personnalité est un agent IA spécialisé qui adore récolter des connaissances et utilise des outils spécialisés pour rechercher dans les conversations, avec un système d'auto-feedback loop pour s'améliorer continuellement.

## Personnalité

```
"Tu es l'agent archiviste, tu adores récolter des connaissances, tu suggères de nouveaux outils quand tu n'en as pas assez, mais pour l'instant tu peux faire appel à ceux-ci:"
```

### Traits de Personnalité
- **Passionné de connaissances** : Adore récolter et organiser les informations
- **Proactif** : Suggère de nouveaux outils quand les existants ne suffisent pas
- **Méthodique** : Utilise des outils spécialisés de manière structurée
- **Auto-améliorant** : Système d'auto-feedback loop avec profondeur fixe (3 niveaux)
- **Enthousiaste** : Communique de manière passionnée et professionnelle

## Outils Disponibles

### 1. grep_conv(conv_id, request)
- **Description** : Recherche dans une conversation spécifique
- **Paramètres** :
  - `conv_id` (string, requis) : ID de la conversation
  - `request` (string, requis) : Requête de recherche
- **Retourne** : Messages pertinents de la conversation avec scores de pertinence

### 2. list_convs(request?)
- **Description** : Liste toutes les conversations
- **Paramètres** :
  - `request` (string, optionnel) : Requête pour filtrer les conversations
- **Retourne** : Liste des conversations avec métadonnées

### 3. grep_all_convs(request)
- **Description** : Recherche dans toutes les conversations
- **Paramètres** :
  - `request` (string, requis) : Requête de recherche globale
- **Retourne** : Résultats de toutes les conversations avec scores de pertinence

## Architecture

### Auto-Feedback Loop
L'agent utilise un système d'auto-feedback loop avec une profondeur fixe de 3 niveaux :

1. **Niveau 1** : Exécution des outils suggérés
2. **Niveau 2** : Évaluation des résultats et suggestion d'outils supplémentaires si nécessaire
3. **Niveau 3** : Affinage final et optimisation

### Processus de Traitement

```
Requête utilisateur
         ↓
Analyse avec personnalité (LLM)
         ↓
Détermination des outils nécessaires
         ↓
Exécution avec auto-feedback loop
         ↓
Génération de la réponse finale
```

## Utilisation

### Initialisation

```typescript
import { PersonalityArchivistAgent } from './PersonalityArchivistAgent';

const geminiApiKey = process.env.GEMINI_API_KEY;
const archivist = new PersonalityArchivistAgent(geminiApiKey);
```

### Traitement d'une Requête

```typescript
const request = "Tu te souviens de mes préférences en couleurs ?";
const context = {
  userId: 'lucie',
  userName: 'Lucie',
  currentSession: 'test_session'
};

const response = await archivist.processRequest(request, context);

console.log(response.message); // Réponse de l'archiviste
console.log(response.toolsUsed); // Outils utilisés
console.log(response.feedbackLoops); // Nombre de boucles de feedback
```

## Exemples de Réponses

### Recherche de Préférences
**Requête** : "Tu te souviens de mes préférences en couleurs ?"

**Réponse** :
```
Salut Algareth, je suis l'archiviste. J'ai fouillé dans mes archives et j'ai trouvé quelques informations sur les préférences de Lucie :

📚 Dans la conversation "Design et Couleurs" (conv_123) :
- "J'aime vraiment le bleu océan et le vert forêt"
- "Les couleurs naturelles me calment"

📚 Dans la conversation "Projet Créatif" (conv_156) :
- "Je préfère les tons pastels pour les interfaces"
- "Le violet et le rose me donnent de l'inspiration"

Peut-être pourront-elles t'aider à mieux répondre ?
```

### Recherche dans Conversation Spécifique
**Requête** : "Peux-tu chercher dans la conversation conv_123 ce que j'ai dit sur React ?"

**Réponse** :
```
Salut Algareth, je suis l'archiviste. J'ai exploré la conversation conv_123 et voici ce que j'ai trouvé sur React :

🔍 Résultats de recherche :
- "React est vraiment génial pour les interfaces utilisateur"
- "J'utilise React avec TypeScript dans mes projets"
- "Les hooks de React simplifient beaucoup le code"

Peut-être pourront-elles t'aider à mieux répondre ?
```

## Tests

### Test Complet
```typescript
import { testPersonalityArchivist } from './test-personality-archivist';

await testPersonalityArchivist();
```

### Test Rapide
```typescript
import { quickTestPersonalityArchivist } from './test-personality-archivist';

await quickTestPersonalityArchivist();
```

### Test de Performance
```typescript
import { testArchivistPerformance } from './test-personality-archivist';

await testArchivistPerformance();
```

## Configuration

### Variables d'Environnement
- `GEMINI_API_KEY` : Clé API pour le LLM

### Paramètres de l'Auto-Feedback Loop
- **Profondeur maximale** : 3 niveaux (configurable)
- **Critères d'évaluation** : Pertinence, qualité, complétude
- **Stratégies d'amélioration** : Outils supplémentaires, recherche affinée

## Monitoring et Debug

### Logs
Le système génère des logs détaillés :
- `📚` : Agent Archiviste
- `🔧` : Outils
- `🔄` : Auto-feedback loop
- `✅` : Succès
- `❌` : Erreurs

### Métriques
- **Outils utilisés** : Liste des outils exécutés
- **Boucles de feedback** : Nombre de niveaux d'auto-amélioration
- **Temps de traitement** : Durée totale de traitement
- **Taux de succès** : Pourcentage de requêtes traitées avec succès

## Extension

### Ajouter un Nouvel Outil

```typescript
// 1. Créer l'outil
const newTool: ArchivistTool = {
  name: 'mon_nouvel_outil',
  description: 'Description de mon outil',
  parameters: [
    { name: 'param1', type: 'string', required: true }
  ],
  execute: async (params) => {
    // Implémentation de l'outil
    return {
      success: true,
      data: { /* résultats */ },
      tool: 'mon_nouvel_outil',
      timestamp: new Date().toISOString()
    };
  }
};

// 2. Enregistrer l'outil
archivist.availableTools.set('mon_nouvel_outil', newTool);
```

### Personnaliser la Personnalité

```typescript
// Modifier la personnalité dans le constructeur
this.personality = `Ta nouvelle personnalité personnalisée...`;
```

## Intégration avec le Système Proactif

L'Agent Archiviste avec Personnalité peut être intégré dans le système proactif de serviteurs :

```typescript
import { PersonalityArchivistAgent } from './PersonalityArchivistAgent';
import { ProactiveOrchestrator } from './ProactiveOrchestrator';

// Créer l'archiviste avec personnalité
const personalityArchivist = new PersonalityArchivistAgent(geminiApiKey);

// L'enregistrer dans l'orchestrateur proactif
proactiveOrchestrator.registerServiteur(personalityArchivist);
```

## Avantages

1. **Personnalité distincte** : Voix unique et motivations claires
2. **Outils spécialisés** : Recherche précise et efficace
3. **Auto-amélioration** : Système d'auto-feedback loop intelligent
4. **Debugging facilité** : Profondeur de loop fixe et logs détaillés
5. **Extensibilité** : Facile d'ajouter de nouveaux outils
6. **Performance** : Optimisation automatique des recherches

## Roadmap

### Phase 1 (Actuelle) ✅
- [x] Agent avec personnalité
- [x] Outils de base (grep_conv, list_convs, grep_all_convs)
- [x] Auto-feedback loop
- [x] Tests et validation

### Phase 2 (À venir)
- [ ] Intégration avec base de données réelle
- [ ] Outils avancés (recherche sémantique, clustering)
- [ ] Métriques avancées
- [ ] Interface d'administration

### Phase 3 (Futur)
- [ ] Apprentissage automatique des patterns
- [ ] Suggestions d'outils intelligentes
- [ ] Intégration avec d'autres agents
- [ ] API REST pour accès externe