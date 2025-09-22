# 🤝 Guide de Contribution - LR Hub™

Merci de votre intérêt pour contribuer à LR Hub™ ! Ce guide vous aidera à démarrer.

## 🚀 Démarrage Rapide

### 1. Fork et Clone
```bash
# Fork le projet sur GitLab, puis clonez votre fork
git clone https://gitlab.com/votre-username/lr_chat.git
cd lr_chat
```

### 2. Setup de l'environnement
```bash
# Utiliser le script de setup automatique
./setup.sh

# Ou setup manuel
npm install
cp .env.example .env
# Configurez vos variables d'environnement
```

### 3. Base de données
```bash
# Option A: Docker (recommandé)
cp docker-compose.example.yml docker-compose.yml
# Modifiez le mot de passe dans docker-compose.yml
docker-compose up -d postgres

# Option B: PostgreSQL local
# Suivez les instructions dans README.md
```

### 4. Développement
```bash
npm run dev
```

## 📋 Types de Contributions

### 🐛 Corrections de Bugs
- Ouvrez une issue décrivant le bug
- Créez une branche `fix/description-du-bug`
- Testez votre correction
- Soumettez une Merge Request

### ✨ Nouvelles Fonctionnalités
- Ouvrez une issue pour discuter de la fonctionnalité
- Créez une branche `feature/nom-de-la-fonctionnalite`
- Implémentez avec des tests
- Documentez les changements
- Soumettez une Merge Request

### 📚 Documentation
- Améliorations du README
- Documentation du code
- Guides d'utilisation
- Exemples et tutoriels

### 🎨 Améliorations UI/UX
- Design responsive
- Accessibilité
- Animations et transitions
- Thèmes et personnalisation

## 🏗️ Architecture du Code

### Structure des dossiers
```
src/
├── app/                 # Pages Next.js (App Router)
├── components/          # Composants React réutilisables
├── lib/                 # Logique métier
│   ├── agents/         # Agents IA
│   ├── auth/           # Authentification
│   ├── db/             # Base de données
│   ├── memory/         # Système de mémoire
│   └── utils/          # Utilitaires
└── mcp/                # Model Context Protocol
```

### Conventions de code
- **TypeScript** : Utilisez TypeScript strict
- **ESLint** : Respectez les règles ESLint
- **Prettier** : Formatage automatique
- **Composants** : Fonctionnels avec hooks
- **API** : Routes Next.js dans `app/api/`

## 🧪 Tests

### Tests unitaires
```bash
npm test
```

### Tests d'intégration
```bash
npm run test:integration
```

### Tests E2E
```bash
npm run test:e2e
```

## 📝 Standards de Code

### Commits
Utilisez le format conventionnel :
```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: documentation
style: formatage
refactor: refactoring
test: tests
chore: maintenance
```

### Branches
- `main` : Branche principale (production)
- `develop` : Branche de développement
- `feature/*` : Nouvelles fonctionnalités
- `fix/*` : Corrections de bugs
- `docs/*` : Documentation

### Merge Requests
- Titre descriptif
- Description détaillée
- Tests passants
- Documentation mise à jour
- Screenshots si UI

## 🔍 Code Review

### Critères d'acceptation
- ✅ Code fonctionnel et testé
- ✅ Respect des conventions
- ✅ Documentation à jour
- ✅ Pas de régression
- ✅ Performance acceptable

### Processus
1. **Auto-review** : Vérifiez votre code avant de soumettre
2. **Tests** : Assurez-vous que tous les tests passent
3. **Documentation** : Mettez à jour la doc si nécessaire
4. **Soumission** : Créez la Merge Request
5. **Review** : Attendez les commentaires
6. **Modifications** : Appliquez les suggestions
7. **Merge** : Une fois approuvé, mergez

## 🐛 Signaler des Bugs

### Template d'issue
```markdown
## 🐛 Description du Bug
Description claire du problème.

## 🔄 Étapes pour Reproduire
1. Aller à '...'
2. Cliquer sur '...'
3. Voir l'erreur

## 🎯 Comportement Attendu
Description du comportement attendu.

## 📱 Environnement
- OS: [ex: Ubuntu 22.04]
- Navigateur: [ex: Chrome 120]
- Version: [ex: v1.2.3]

## 📸 Screenshots
Si applicable, ajoutez des captures d'écran.

## 📋 Informations Supplémentaires
Toute autre information pertinente.
```

## 💡 Proposer des Fonctionnalités

### Template de feature request
```markdown
## ✨ Fonctionnalité Demandée
Description claire de la fonctionnalité.

## 🎯 Problème Résolu
Quel problème cette fonctionnalité résout-elle ?

## 💭 Solution Proposée
Description de votre solution.

## 🔄 Alternatives Considérées
Autres solutions que vous avez envisagées.

## 📋 Informations Supplémentaires
Contexte supplémentaire, mockups, etc.
```

## 🏷️ Labels et Milestones

### Labels disponibles
- `bug` : Problème à corriger
- `enhancement` : Amélioration
- `documentation` : Documentation
- `good first issue` : Bon pour débuter
- `help wanted` : Aide recherchée
- `priority:high` : Priorité élevée
- `priority:medium` : Priorité moyenne
- `priority:low` : Priorité faible

## 📞 Support

### Questions et Discussions
- 💬 **Issues** : Pour les bugs et fonctionnalités
- 💭 **Discussions** : Pour les questions générales
- 📧 **Email** : luciedefraiteur@gmail.com

### Ressources
- 📚 **README.md** : Documentation principale
- 🦊 **GitLab** : [luciformresearch/lr_chat](https://gitlab.com/luciformresearch/lr_chat)
- 🌐 **Site** : [luciformresearch.com](https://luciformresearch.com)

## 📝 Licence et Attribution

Ce projet est sous **licence MIT avec clause d'attribution renforcée**.

### Pour les contributeurs :
- Vos contributions deviennent partie intégrante du projet
- Vous acceptez que votre code soit sous la même licence
- L'attribution sera maintenue dans les commits et l'historique

### Pour les utilisateurs :
- Vous pouvez utiliser le code comme référence/inspiration
- Attribution obligatoire : "Basé sur LR Hub™ par Lucie Defraiteur"
- Lien vers le projet original requis

Voir [LICENSE](LICENSE) pour plus de détails.

## 🎉 Reconnaissance

Tous les contributeurs sont listés dans le fichier `CONTRIBUTORS.md`.

Merci de contribuer à LR Hub™ ! 🦊✨