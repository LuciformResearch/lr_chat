# Système Proactif de Serviteurs pour Algareth

## Vue d'ensemble

Le système proactif permet aux serviteurs d'Algareth (archiviste, générateur d'images, etc.) de "murmurer" proactivement des informations pertinentes pour enrichir ses réponses, sans interrompre le flux naturel de conversation.

## Architecture

```
Utilisateur pose une question
         ↓
LLM Analyseur de Pertinence (détermine quels serviteurs sont pertinents)
         ↓
Orchestrateur Proactif (coordonne les serviteurs)
         ↓
Serviteurs préparent leurs murmures
         ↓
Algareth reçoit une réponse enrichie
```

## Composants

### 1. PertinenceAnalyzer
- Analyse les questions utilisateur avec un LLM
- Détermine quels serviteurs sont pertinents (pertinence 0-1)
- Filtre les suggestions (seuil > 0.6)

### 2. ProactiveOrchestrator
- Coordonne les serviteurs
- Gère l'enregistrement des serviteurs
- Prépare les murmures formatés

### 3. Serviteurs (ServiteurAgent)
- **ProactiveArchivist** : Mémoire épisodique et analyse
- **ImageGenerator** : Génération d'images (à venir)
- **ResearchAssistant** : Recherche d'informations (à venir)
- **CodeAssistant** : Assistance technique (à venir)

### 4. AlgarethProactiveService
- Point d'entrée principal
- Intègre tout le système dans le pipeline de chat
- Génère les réponses enrichies

## Utilisation

### Initialisation

```typescript
import { AlgarethProactiveService } from './AlgarethProactiveService';
import { AgentManager } from './AgentManager';

// Configuration
const geminiApiKey = process.env.GEMINI_API_KEY;
const agentManager = new AgentManager({
  geminiApiKey,
  enableArchivist: true,
  enableLogging: true,
  maxConcurrentRequests: 5
});

await agentManager.initialize();

// Service proactif
const proactiveService = new AlgarethProactiveService(geminiApiKey, agentManager);
await proactiveService.initialize();
```

### Génération de réponse enrichie

```typescript
const context: AlgarethContext = {
  userId: 'user123',
  userName: 'Lucie',
  currentSession: 'session_456',
  userMessage: 'Tu te souviens de mes préférences ?',
  conversationHistory: [...],
  sessionStartTime: new Date().toISOString()
};

const result = await proactiveService.generateEnhancedAlgarethResponse(
  'Tu te souviens de mes préférences ?',
  context
);

console.log(result.enhancedPrompt);
```

## Exemples de Murmures

### Archiviste
```
Salut Algareth, je suis l'archiviste. J'ai récolté quelques informations sur la question de Lucie qui pourraient t'être utiles :

📚 Mémoires pertinentes :
1. Lucie a mentionné aimer le bleu océan et le vert forêt dans nos conversations précédentes
2. Elle préfère les couleurs naturelles et apaisantes

🤝 Relation : friend (confiance: 75%, confort: 80%)
😊 Patterns émotionnels : généralement positif, enthousiaste
💬 Style de communication : conversationnel

Peut-être pourront-elles t'aider à mieux répondre ?
```

## Tests

### Test complet
```typescript
import { testProactiveSystem } from './test-proactive-system';

await testProactiveSystem();
```

### Test rapide
```typescript
import { quickTestProactiveSystem } from './test-proactive-system';

await quickTestProactiveSystem();
```

## Configuration

### Variables d'environnement
- `GEMINI_API_KEY` : Clé API pour le LLM

### Seuils de pertinence
- **Pertinence > 0.7** : Très pertinent, serviteur nécessaire
- **Pertinence 0.4-0.7** : Modérément pertinent, serviteur utile
- **Pertinence < 0.4** : Peu pertinent, serviteur non nécessaire

### Seuil d'activation
- **Pertinence > 0.6** : Serviteur activé pour murmure

## Extension

### Ajouter un nouveau serviteur

1. Créer une classe qui étend `ServiteurAgent`
2. Implémenter `prepareMurmur()`
3. Enregistrer le serviteur dans l'orchestrateur

```typescript
class MonNouveauServiteur extends ServiteurAgent {
  constructor() {
    super('mon_serviteur', 'Description de mon serviteur');
  }

  async prepareMurmur(userMessage: string, context: AlgarethContext, suggestion: ServiteurSuggestion): Promise<ServiteurMurmur> {
    // Logique de préparation du murmure
    return {
      serviteur: 'mon_serviteur',
      message: 'Mon murmure...',
      informations: {...},
      urgence: 'moyenne',
      discret: true,
      timestamp: new Date().toISOString(),
      processingTime: 100
    };
  }
}

// Enregistrement
const monServiteur = new MonNouveauServiteur();
proactiveOrchestrator.registerServiteur(monServiteur);
```

## Monitoring

### Statistiques
```typescript
const stats = proactiveService.getStats();
console.log('Statistiques:', stats);
```

### Logs
Le système génère des logs détaillés :
- `🔍` : Analyse de pertinence
- `🎭` : Orchestrateur proactif
- `📚` : Archiviste
- `✅` : Succès
- `❌` : Erreurs

## Performance

### Temps de traitement typiques
- **Analyse de pertinence** : 200-500ms
- **Préparation murmure archiviste** : 300-800ms
- **Total** : 500-1300ms

### Optimisations
- Cache des analyses de pertinence
- Parallélisation des murmures
- Seuils de pertinence ajustables

## Dépannage

### Erreurs communes

1. **"Service proactif non initialisé"**
   - Vérifier que `initialize()` a été appelé

2. **"Clé API Gemini non trouvée"**
   - Vérifier la variable d'environnement `GEMINI_API_KEY`

3. **"Agent Archiviste non disponible"**
   - Vérifier que `enableArchivist: true` dans la config

4. **Murmures vides**
   - Vérifier les seuils de pertinence
   - Vérifier les données de l'archiviste

### Debug
```typescript
// Activer les logs détaillés
const agentManager = new AgentManager({
  geminiApiKey,
  enableArchivist: true,
  enableLogging: true, // ← Activer
  maxConcurrentRequests: 5
});

// Obtenir les murmures détaillés
const murmurs = await proactiveService.getDetailedMurmurs(userMessage, context);
console.log('Murmures:', murmurs);
```

## Roadmap

### Phase 1 (Actuelle) ✅
- [x] Analyseur de pertinence
- [x] Orchestrateur proactif
- [x] Archiviste proactif
- [x] Intégration pipeline

### Phase 2 (À venir)
- [ ] Générateur d'images proactif
- [ ] Assistant de recherche proactif
- [ ] Assistant de code proactif

### Phase 3 (Futur)
- [ ] Cache intelligent
- [ ] Apprentissage des préférences
- [ ] Métriques avancées
- [ ] Interface d'administration