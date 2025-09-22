-- Table pour stocker les images générées
CREATE TABLE IF NOT EXISTS generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    enhanced_prompt TEXT,
    image_data BYTEA, -- Image en base64 ou binaire
    image_url TEXT, -- URL temporaire si stockage externe
    mime_type TEXT DEFAULT 'image/png',
    size_bytes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index pour les performances
CREATE INDEX idx_generated_images_session_id ON generated_images(session_id);
CREATE INDEX idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX idx_generated_images_created_at ON generated_images(created_at);

-- Vérifier la table
SELECT 'Table generated_images créée avec succès !' as status;