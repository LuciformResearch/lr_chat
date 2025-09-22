-- Migration pour ajouter les tables de l'archiviste
-- À exécuter après setup-database.sql

-- Table des mémoires de conversation de l'archiviste
CREATE TABLE archivist_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    summary TEXT NOT NULL,
    key_topics JSONB NOT NULL DEFAULT '[]',
    emotional_tone VARCHAR(50) NOT NULL,
    important_facts JSONB NOT NULL DEFAULT '[]',
    user_mood TEXT NOT NULL,
    algareth_performance TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des profils utilisateur de l'archiviste
CREATE TABLE archivist_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) UNIQUE NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    communication_style VARCHAR(100),
    interests JSONB DEFAULT '[]',
    relationship_level VARCHAR(50) DEFAULT 'nouvelle',
    trust_level INTEGER DEFAULT 0 CHECK (trust_level >= 0 AND trust_level <= 100),
    ongoing_topics JSONB DEFAULT '[]',
    user_goals JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_archivist_memories_user_id ON archivist_memories(user_id);
CREATE INDEX idx_archivist_memories_session_id ON archivist_memories(session_id);
CREATE INDEX idx_archivist_memories_timestamp ON archivist_memories(timestamp DESC);
CREATE INDEX idx_archivist_memories_emotional_tone ON archivist_memories(emotional_tone);
CREATE INDEX idx_archivist_profiles_user_id ON archivist_profiles(user_id);
CREATE INDEX idx_archivist_profiles_relationship_level ON archivist_profiles(relationship_level);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_archivist_memories_updated_at 
    BEFORE UPDATE ON archivist_memories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_archivist_profiles_updated_at 
    BEFORE UPDATE ON archivist_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insérer quelques données de test
INSERT INTO archivist_profiles (user_id, user_name, total_sessions, communication_style, relationship_level, trust_level) VALUES 
    ('test_user', 'Test User', 1, 'conversationnel', 'relation naissante', 20),
    ('demo_user', 'Demo User', 1, 'formel', 'nouvelle', 10);

INSERT INTO archivist_memories (session_id, user_id, summary, key_topics, emotional_tone, important_facts, user_mood, algareth_performance) VALUES 
    ('test_session_1', 'test_user', 'Conversation de test sur les préférences utilisateur', '["préférences", "test"]', 'positif', '["Utilisateur aime tester de nouvelles fonctionnalités"]', 'curieux et enthousiaste', 'bonne performance, réponses utiles'),
    ('demo_session_1', 'demo_user', 'Session de démonstration des capacités', '["démonstration", "capacités"]', 'neutre', '["Utilisateur découvre les fonctionnalités"]', 'neutre et observateur', 'performance standard');

-- Vérifier que tout fonctionne
SELECT 'Tables archiviste créées avec succès !' as status;
SELECT COUNT(*) as archivist_memories_count FROM archivist_memories;
SELECT COUNT(*) as archivist_profiles_count FROM archivist_profiles;