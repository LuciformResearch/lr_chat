-- Ajouter une table pour les clés API dans PostgreSQL
-- Plus simple que localStorage + chiffrement

-- Table pour stocker les clés API
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'gemini', 'openrouter', 'openai', etc.
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Une seule clé active par provider par utilisateur
    UNIQUE(user_id, provider, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Index pour les performances
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_provider ON api_keys(provider);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_api_keys_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour api_keys
CREATE TRIGGER update_api_keys_updated_at 
    BEFORE UPDATE ON api_keys 
    FOR EACH ROW 
    EXECUTE FUNCTION update_api_keys_updated_at_column();

-- Insérer la clé Gemini de Lucie depuis ~/.shadeos_env
INSERT INTO api_keys (user_id, provider, api_key, is_active) 
VALUES ('Lucie', 'gemini', 'TO_REPLACE', true)
ON CONFLICT (user_id, provider, is_active) 
DO UPDATE SET 
    api_key = EXCLUDED.api_key,
    updated_at = NOW();

-- Vérifier que tout fonctionne
SELECT 'Table api_keys créée avec succès !' as status;
SELECT COUNT(*) as api_keys_count FROM api_keys;
SELECT user_id, provider, LEFT(api_key, 10) || '...' as api_key_preview, is_active FROM api_keys;