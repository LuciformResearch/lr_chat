/**
 * Page Dashboard - Interface principale après connexion
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { authenticatedGet } from '@/lib/utils/authenticatedFetch';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import Link from 'next/link';

function DashboardContent() {
  const { user, signOut, getCurrentAuthUser } = useAuth();
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  const handleSignOut = async () => {
    await signOut();
  };

  const checkGeminiKey = async () => {
    try {
      setIsCheckingKey(true);
      
      // Récupérer le token d'authentification
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setHasGeminiKey(false);
        return;
      }
      
      // Vérifier si la clé Gemini existe
      const response = await authenticatedGet('/api/api-keys?provider=gemini');
      
      if (response.ok) {
        const data = await response.json();
        setHasGeminiKey(!!data.gemini);
      } else {
        setHasGeminiKey(false);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la clé Gemini:', error);
      setHasGeminiKey(false);
    } finally {
      setIsCheckingKey(false);
    }
  };

  useEffect(() => {
    checkGeminiKey();
  }, []);

  return (
    <div className="min-h-screen theme-gradient-bg relative">
      {/* Image de fond floue */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/woman_in_black_background.png" 
          alt="Background" 
          className="w-full h-full object-cover opacity-10 blur-sm"
        />
      </div>
      
      {/* Header avec sélecteurs */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
      
      {/* Bannière principale */}
      <div className="relative z-10 pt-8 pb-4">
        <div className="container mx-auto px-4">
          <img 
            src="/banner.jpeg" 
            alt="LR Hub Banner" 
            className="w-full h-48 object-cover rounded-lg theme-shadow opacity-90"
          />
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Titre principal avec logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/pentagram_icon_transparent.png" 
              alt="LR Hub" 
              className="w-16 h-16 mr-4 opacity-90"
            />
            <h1 className="text-6xl font-bold theme-text-primary lr-hub-brand">
              LR Hub™
            </h1>
          </div>
          <p className="text-xl theme-text-secondary mb-4 max-w-2xl mx-auto">
            Plateforme d'intelligence artificielle avec Algareth
          </p>
          <p className="text-sm theme-text-muted">
            Bienvenue, {getCurrentAuthUser()?.email || user?.display_name || user?.name || 'Utilisateur'} !
          </p>
        </div>
        
        {/* Status et actions */}
        <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 mb-8 theme-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!isCheckingKey && (
                <div className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${
                    hasGeminiKey ? 'bg-green-500' : 'bg-orange-500'
                  }`}></span>
                  <span className="text-sm theme-text-muted">
                    {hasGeminiKey ? '✅ Chat prêt' : '⚠️ Configuration requise'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="theme-gradient-secondary hover:opacity-90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🚪 Déconnexion
            </button>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Demo Chat - Principal */}
          <div className={`backdrop-blur-sm rounded-lg p-6 border-2 theme-shadow ${
            hasGeminiKey 
              ? 'theme-overlay-light border-purple-500' 
              : 'bg-orange-500/10 border-orange-500'
          }`}>
            <h2 className="text-xl font-semibold theme-text-primary mb-4">
              ⛧ Demo Chat ⛧
            </h2>
            
            {isCheckingKey ? (
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <p className="theme-text-secondary">Vérification de votre configuration...</p>
              </div>
            ) : hasGeminiKey ? (
              <>
                <p className="theme-text-secondary mb-4">
                  Chat intelligent avec Algareth - Prêt à utiliser !
                </p>
                <Link 
                  href="/demo-chat"
                  className="theme-gradient-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block"
                >
                  🚀 Ouvrir Demo Chat
                </Link>
              </>
            ) : (
              <>
                <p className="theme-text-secondary mb-4">
                  Configurez votre clé API Gemini pour débloquer le chat intelligent
                </p>
                <div className="space-y-3">
                  <Link 
                    href="/settings"
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block w-full text-center"
                  >
                    ⚙️ Configurer ma clé Gemini
                  </Link>
                  <p className="text-xs text-gray-400 text-center">
                    💡 Gratuit et rapide - 2 minutes max
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Conversations */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 theme-shadow opacity-50">
            <h2 className="text-xl font-semibold theme-text-primary mb-4">
              💬 Conversations
            </h2>
            <p className="theme-text-secondary mb-4">
              Gérez vos conversations avec Algareth
            </p>
            <div className="theme-gradient-secondary text-white px-4 py-2 rounded-lg font-medium inline-block cursor-not-allowed">
              Nouvelle Conversation (Bientôt disponible)
            </div>
          </div>

          {/* Résumés */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 theme-shadow opacity-50">
            <h2 className="text-xl font-semibold theme-text-primary mb-4">
              📝 Résumés
            </h2>
            <p className="theme-text-secondary mb-4">
              Consultez vos résumés de conversations
            </p>
            <div className="theme-gradient-primary text-white px-4 py-2 rounded-lg font-medium inline-block cursor-not-allowed">
              Voir les Résumés (Bientôt disponible)
            </div>
          </div>

          {/* Paramètres */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 theme-shadow">
            <h2 className="text-xl font-semibold theme-text-primary mb-4">
              ⚙️ Paramètres
            </h2>
            <p className="theme-text-secondary mb-4">
              Configurez votre clé API Gemini et vos préférences
            </p>
            <Link 
              href="/settings"
              className="theme-gradient-secondary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block w-full text-center"
            >
              ⚙️ Ouvrir les Paramètres
            </Link>
          </div>

          {/* Gestion des Identités */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 theme-shadow">
            <h2 className="text-xl font-semibold theme-text-primary mb-4">
              👥 Mes Identités
            </h2>
            <p className="theme-text-secondary mb-4">
              Gérez vos identités utilisateur (Lucie, Alice, etc.)
            </p>
            <Link 
              href="/auth/select-user"
              className="theme-gradient-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block"
            >
              Gérer mes Identités
            </Link>
          </div>

          {/* CV Professionnel */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 theme-shadow">
            <h2 className="text-xl font-semibold theme-text-primary mb-4">
              📄 CV Professionnel
            </h2>
            <p className="theme-text-secondary mb-4">
              Découvrez mon parcours et mes compétences en IA générative
            </p>
            <Link 
              href="/cv"
              className="theme-gradient-secondary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block"
            >
              Voir mon CV
            </Link>
          </div>

          {/* Debug Mémoire */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-6 theme-shadow opacity-50">
            <h2 className="text-xl font-semibold theme-text-primary mb-4">
              🧠 Debug Mémoire
            </h2>
            <p className="theme-text-secondary mb-4">
              Visualisez le système de mémoire hiérarchique d'Algareth
            </p>
            <div className="theme-gradient-secondary text-white px-4 py-2 rounded-lg font-medium inline-block cursor-not-allowed">
              Ouvrir le Debug (Bientôt disponible)
            </div>
          </div>
        </div>

        {/* Section Fonctionnalités */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-semibold theme-text-primary mb-4">
            🎯 Fonctionnalités Principales
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
            <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-4 theme-shadow">
              <div className="text-2xl mb-2">🔧</div>
              <h4 className="font-semibold theme-text-primary mb-2">Outils MCP</h4>
              <p className="theme-text-secondary text-sm">
                Système d'outils modulaire pour étendre les capacités d'Algareth
              </p>
            </div>
            
            <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-4 theme-shadow">
              <div className="text-2xl mb-2">💬</div>
              <h4 className="font-semibold theme-text-primary mb-2">Chat Algareth</h4>
              <p className="theme-text-secondary text-sm">
                Interface de conversation intelligente avec personnalité mystique
              </p>
            </div>
            
            <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-4 theme-shadow">
              <div className="text-2xl mb-2">🧠</div>
              <h4 className="font-semibold theme-text-primary mb-2">Mémoire Hiérarchique</h4>
              <p className="theme-text-secondary text-sm">
                Système de mémoire avancé pour la persistance des conversations
              </p>
            </div>
            
            <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-4 theme-shadow">
              <div className="text-2xl mb-2">🎭</div>
              <h4 className="font-semibold theme-text-primary mb-2">Personnalités</h4>
              <p className="theme-text-secondary text-sm">
                Identités multiples avec configurations personnalisées
              </p>
            </div>
          </div>
        </div>

        {/* Statut de l'authentification */}
        <div className="mt-8 theme-overlay-dark backdrop-blur-sm rounded-lg p-6 theme-shadow">
          <h3 className="text-lg font-semibold theme-text-primary mb-4">
            🔐 Statut de l'Authentification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="theme-text-secondary">
                <strong>Email :</strong> {getCurrentAuthUser()?.email || 'N/A'}
              </p>
              <p className="theme-text-secondary">
                <strong>Identité :</strong> {user?.display_name || user?.name || 'N/A'}
              </p>
              <p className="theme-text-secondary">
                <strong>ID :</strong> {user?.id}
              </p>
            </div>
            <div>
              <p className="theme-text-secondary">
                <strong>Créé le :</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A'}
              </p>
              <p className="theme-text-secondary">
                <strong>Statut :</strong> <span className="theme-accent-primary">✅ Connecté</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}