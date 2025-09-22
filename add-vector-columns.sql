-- Migration pour ajouter les colonnes d'embeddings vectoriels
-- À exécuter après add-archivist-tables.sql

-- Vérifier que l'extension vector est disponible
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'Extension vector non trouvée. Exécutez d''abord: CREATE EXTENSION IF NOT EXISTS vector;';
    END IF;
END $$;

-- Ajouter les colonnes d'embeddings aux tables existantes
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE archivist_memories ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Créer les index pour la recherche vectorielle
-- Utilisation de ivfflat pour de bonnes performances avec des datasets moyens
CREATE INDEX IF NOT EXISTS idx_messages_embedding_cosine 
ON messages USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_archivist_memories_embedding_cosine 
ON archivist_memories USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Index pour la similarité euclidienne (alternative)
CREATE INDEX IF NOT EXISTS idx_messages_embedding_l2 
ON messages USING ivfflat (embedding vector_l2_ops) 
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_archivist_memories_embedding_l2 
ON archivist_memories USING ivfflat (embedding vector_l2_ops) 
WITH (lists = 100);

-- Fonction utilitaire pour la recherche sémantique
CREATE OR REPLACE FUNCTION semantic_search_messages(
    query_embedding vector(384),
    user_id_filter text DEFAULT NULL,
    similarity_threshold float DEFAULT 0.7,
    max_results integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    session_id uuid,
    role message_role,
    content text,
    similarity float,
    created_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.session_id,
        m.role,
        m.content,
        1 - (m.embedding <=> query_embedding) as similarity,
        m.created_at
    FROM messages m
    JOIN sessions s ON m.session_id = s.id
    WHERE 
        m.embedding IS NOT NULL
        AND (user_id_filter IS NULL OR s.user_id = user_id_filter)
        AND (1 - (m.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Fonction utilitaire pour la recherche sémantique dans les mémoires archiviste
CREATE OR REPLACE FUNCTION semantic_search_archivist_memories(
    query_embedding vector(384),
    user_id_filter text,
    similarity_threshold float DEFAULT 0.7,
    max_results integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    session_id text,
    user_id text,
    summary text,
    similarity float,
    timestamp timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.id,
        am.session_id,
        am.user_id,
        am.summary,
        1 - (am.embedding <=> query_embedding) as similarity,
        am.timestamp
    FROM archivist_memories am
    WHERE 
        am.embedding IS NOT NULL
        AND am.user_id = user_id_filter
        AND (1 - (am.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY am.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les embeddings (utile pour la migration)
CREATE OR REPLACE FUNCTION update_message_embedding(
    message_id uuid,
    new_embedding vector(384)
)
RETURNS void AS $$
BEGIN
    UPDATE messages 
    SET embedding = new_embedding 
    WHERE id = message_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_archivist_memory_embedding(
    memory_id uuid,
    new_embedding vector(384)
)
RETURNS void AS $$
BEGIN
    UPDATE archivist_memories 
    SET embedding = new_embedding 
    WHERE id = memory_id;
END;
$$ LANGUAGE plpgsql;

-- Vérifier que tout fonctionne
SELECT 'Colonnes vectorielles ajoutées avec succès !' as status;
SELECT COUNT(*) as messages_with_embeddings FROM messages WHERE embedding IS NOT NULL;
SELECT COUNT(*) as archivist_memories_with_embeddings FROM archivist_memories WHERE embedding IS NOT NULL;