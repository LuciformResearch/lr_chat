-- =============================================================================
-- 🦊 LR Hub™ - Script d'initialisation de la base de données
-- =============================================================================
-- Ce script est exécuté automatiquement lors du premier démarrage de PostgreSQL
-- Il configure les extensions nécessaires et les permissions

-- Activer l'extension pgvector pour les embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Activer l'extension uuid-ossp pour la génération d'UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Créer un schéma pour les fonctions utilitaires
CREATE SCHEMA IF NOT EXISTS utils;

-- Fonction pour générer des UUIDs v4
CREATE OR REPLACE FUNCTION utils.generate_uuid() RETURNS uuid AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir la taille d'un vecteur
CREATE OR REPLACE FUNCTION utils.vector_size(vector) RETURNS integer AS $$
BEGIN
    RETURN array_length($1, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Créer un index pour les recherches vectorielles (sera utilisé par l'application)
-- Note: Les tables seront créées par l'application via Drizzle ORM

-- Configuration des permissions
GRANT USAGE ON SCHEMA public TO lucie;
GRANT USAGE ON SCHEMA utils TO lucie;
GRANT CREATE ON SCHEMA public TO lucie;
GRANT CREATE ON SCHEMA utils TO lucie;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '🦊 LR Hub™ - Base de données initialisée avec succès !';
    RAISE NOTICE '📊 Extensions activées : pgvector, uuid-ossp';
    RAISE NOTICE '🔧 Schémas créés : public, utils';
    RAISE NOTICE '👤 Utilisateur configuré : lucie';
    RAISE NOTICE '🚀 Prêt pour l''application LR Hub™ !';
END $$;