# 🦊 LR Hub™ - Intelligence Artificielle & Développement

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-0.7.0-green)](https://github.com/pgvector/pgvector)

Plateforme d'intelligence artificielle avancée avec agents conversationnels, mémoire hiérarchique et outils de développement. Créé par **Lucie Defraiteur**.

## 🌟 Fonctionnalités

- 🤖 **Agents IA Avancés** : Algareth et autres agents conversationnels
- 🧠 **Mémoire Hiérarchique** : Système de mémoire persistante et intelligente
- 💬 **Chat Interactif** : Interface de chat moderne avec streaming
- 🔐 **Authentification** : Système d'auth complet avec JWT
- 📊 **Dashboard** : Interface de gestion centralisée
- 🎨 **Thèmes Adaptatifs** : Mode sombre/clair automatique
- 🌍 **Multilingue** : Support français/anglais
- 📱 **Responsive** : Optimisé mobile et desktop

## 🚀 Installation Rapide

### 1. Cloner le projet
```bash
git clone https://gitlab.com/luciformresearch/lr_chat.git
cd lr_chat
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration de l'environnement
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

### 4. Setup de la base de données
Voir la section [Base de données](#-base-de-données) ci-dessous.

### 5. Lancer en développement
```bash
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

## 🗄️ Base de données

### Option 1 : PostgreSQL Local avec Docker (Recommandé)

#### 1. Créer un docker-compose.yml
```yaml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg15
    container_name: lr_chat_db
    environment:
      POSTGRES_DB: lr_chat_db
      POSTGRES_USER: lucie
      POSTGRES_PASSWORD: your_strong_password_here
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 2. Lancer la base de données
```bash
docker-compose up -d
```

#### 3. Configurer .env
```env
DATABASE_URL="postgresql://lucie:your_strong_password_here@localhost:5433/lr_chat_db"
```

### Option 2 : PostgreSQL Local (Installation manuelle)

#### 1. Installer PostgreSQL 15+
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS avec Homebrew
brew install postgresql@15
brew services start postgresql@15
```

#### 2. Installer pgvector
```bash
# Ubuntu/Debian
sudo apt install postgresql-15-pgvector

# macOS avec Homebrew
brew install pgvector
```

#### 3. Créer la base de données
```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base et l'utilisateur
CREATE DATABASE lr_chat_db;
CREATE USER lucie WITH PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE lr_chat_db TO lucie;
ALTER USER lucie CREATEDB;
\q
```

#### 4. Activer pgvector
```bash
psql -U lucie -d lr_chat_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Option 3 : Base de données Cloud (Neon, Supabase, etc.)

#### Avec Neon (Recommandé pour la production)
1. Créer un compte sur [neon.tech](https://neon.tech)
2. Créer une nouvelle base de données
3. Activer l'extension pgvector dans le dashboard
4. Copier l'URL de connexion dans `.env`

## ⚙️ Configuration

### Variables d'environnement obligatoires

```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5433/lr_chat_db"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
JWT_SECRET="your_jwt_secret_here"
ENCRYPTION_SECRET_KEY="your_encryption_key_here"

# Email (OAuth2 Google recommandé)
EMAIL_PROVIDER="oauth2"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REFRESH_TOKEN="your_google_refresh_token"
GOOGLE_EMAIL="your_email@gmail.com"

# IA (optionnel - pour les fonctionnalités avancées)
GEMINI_API_KEY="your_gemini_api_key"
```

### Variables optionnelles

```env
# OpenAI (alternative à Gemini)
OPENAI_API_KEY="your_openai_api_key"

# Ollama (pour IA locale)
OLLAMA_BASE_URL="http://localhost:11434"

# Debug
NODE_ENV="development"
DEBUG_SEMANTIC="1"
ARCHIVIST_VERBOSE="detailed"
```

## 🛠️ Scripts disponibles

```bash
# Développement
npm run dev              # Serveur de développement
npm run dev-logged       # Développement avec logs détaillés

# Build et production
npm run build           # Build de production
npm run start           # Serveur de production
npm run build:clean     # Build propre (supprime les caches)

# Maintenance
npm run clean           # Nettoyer les caches
npm run lint            # Linter ESLint
```

## 🏗️ Architecture

```
src/
├── app/                    # Pages Next.js App Router
│   ├── api/               # API Routes
│   ├── auth/              # Pages d'authentification
│   ├── chat/              # Interface de chat
│   ├── dashboard/         # Tableau de bord
│   └── cv/                # Page CV
├── components/            # Composants React
├── lib/                   # Logique métier
│   ├── agents/            # Agents IA
│   ├── auth/              # Authentification
│   ├── db/                # Base de données
│   ├── memory/            # Système de mémoire
│   └── utils/             # Utilitaires
└── mcp/                   # Model Context Protocol
```

## 🧠 Agents IA

- **Algareth** : Agent principal conversationnel
- **Archivist** : Agent de mémoire et résumés
- **Orchestrator** : Orchestrateur d'agents multiples

## 📊 Base de données

### Tables principales
- `users` : Utilisateurs et authentification
- `conversations` : Conversations et sessions
- `messages` : Messages avec embeddings
- `memory_artifacts` : Artefacts de mémoire
- `api_keys` : Clés API chiffrées

### Extensions utilisées
- `pgvector` : Embeddings vectoriels
- `uuid-ossp` : Génération d'UUIDs

## 🚀 Déploiement

### Vercel (Recommandé)

1. **Configurer les variables d'environnement** dans Vercel Dashboard
2. **Connecter le domaine** (optionnel)
3. **Déployer** :
```bash
vercel --prod --yes
```

### Docker

```bash
# Build de l'image
docker build -t lr-hub .

# Lancer avec docker-compose
docker-compose up -d
```

## 🔧 Développement

### Prérequis
- Node.js 18+
- PostgreSQL 15+
- pgvector extension

### Structure des commits
```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: documentation
style: formatage
refactor: refactoring
test: tests
chore: maintenance
```

## 📝 Licence

Ce projet est sous licence **Apache 2.0**.

- Autorisé: utilisation, modification, distribution et usage commercial, selon les termes de la licence.
- Conditions: conserver les avis de droit d’auteur et la licence; inclure un fichier `NOTICE` si présent; indiquer les modifications apportées.
- Garantie: le logiciel est fourni « tel quel », sans garantie d’aucune sorte.

Voir le fichier `LICENSE` (Apache 2.0) pour les conditions complètes.

## 👩‍💻 Auteur

**Lucie Defraiteur**
- 📧 Email : luciedefraiteur@gmail.com
- 🦊 GitLab : [@luciformresearch](https://gitlab.com/luciformresearch)
- 🌐 Site : [luciformresearch.com](https://luciformresearch.com)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Merge Request

## 📞 Support

Pour toute question ou problème :
- 🐛 **Bugs** : Ouvrir une issue sur GitLab
- 💡 **Suggestions** : Créer une discussion
- 📧 **Contact** : luciedefraiteur@gmail.com

---

<div align="center">
  <p>Fait avec ❤️ par <strong>Lucie Defraiteur</strong></p>
  <p>🦊 <a href="https://gitlab.com/luciformresearch">GitLab</a> | 🌐 <a href="https://luciformresearch.com">Site Web</a></p>
</div>
