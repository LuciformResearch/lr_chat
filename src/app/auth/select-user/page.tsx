/**
 * Page de sélection d'utilisateur après authentification AuthUser
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedPost, authenticatedDelete } from '@/lib/utils/authenticatedFetch';

interface User {
  id: string;
  name: string;
  persona: string;
  theme: string;
}

export default function SelectUserPage() {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const { selectUser, loading, error, availableUsers, getCurrentAuthUser } = useAuth();
  const router = useRouter();

  // Vérifier l'authentification
  const authUser = getCurrentAuthUser();
  
  // Si pas d'utilisateur authentifié, afficher l'écran de connexion
  if (!authUser) {
    return (
      <div className="min-h-screen theme-gradient-bg flex items-center justify-center p-4">
        <div className="theme-overlay-light backdrop-blur-lg rounded-2xl theme-shadow p-8 max-w-md w-full text-center">
          <h1 className="text-3xl font-bold theme-text-primary mb-6">
            👥 Sélection d'Identité
          </h1>
          <p className="theme-text-secondary mb-6">
            Authentification requise pour gérer vos identités
          </p>
          <div className="space-y-4">
            <a
              href="/auth/login"
              className="w-full theme-gradient-primary hover:opacity-90 theme-text-primary py-3 rounded-lg theme-shadow font-medium transition-colors inline-block"
            >
              🔐 Se connecter
            </a>
            <a
              href="/auth/register"
              className="w-full theme-gradient-secondary hover:opacity-90 theme-text-primary py-3 rounded-lg theme-shadow font-medium transition-colors inline-block"
            >
              📝 S'inscrire
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedUserId) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un utilisateur' });
      return;
    }

    const result = await selectUser(selectedUserId);
    
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const getUserIcon = (persona: string) => {
    switch (persona) {
      case 'algareth': return '🔮';
      case 'assistant': return '🤖';
      default: return '👤';
    }
  };

  const getUserDescription = (persona: string) => {
    switch (persona) {
      case 'algareth': return 'Assistant intelligent avec personnalité';
      case 'assistant': return 'Assistant classique et professionnel';
      default: return 'Utilisateur personnalisé';
    }
  };

  const handleCreateIdentity = async () => {
    const name = prompt('Nom de la nouvelle identité:');
    if (!name) return;

    // Seul algareth est implémenté pour l'instant
    const persona = 'algareth';

    try {
      const response = await authenticatedPost('/api/auth/users', {
        name,
        persona,
        displayName: name
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Identité créée avec succès !' });
        // Recharger la page pour voir la nouvelle identité
        window.location.reload();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Erreur lors de la création' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    }
  };

  const handleDeleteIdentity = async (userId: string, userName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'identité "${userName}" ?`)) {
      return;
    }

    try {
      const response = await authenticatedDelete(`/api/auth/users?userId=${userId}`);

      if (response.ok) {
        setMessage({ type: 'success', text: 'Identité supprimée avec succès !' });
        // Recharger la page pour voir les changements
        window.location.reload();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Erreur lors de la suppression' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion' });
    }
  };

  if (!availableUsers || availableUsers.length === 0) {
    return (
      <div className="min-h-screen theme-gradient-bg flex items-center justify-center">
        <div className="theme-overlay-light backdrop-blur-sm rounded-lg theme-shadow p-8 w-full max-w-md text-center">
          <h1 className="text-3xl font-bold theme-text-primary mb-6">👤 Aucune Identité</h1>
          <p className="theme-text-secondary mb-6">
            Vous n'avez pas encore d'identité configurée. Créez-en une pour commencer à utiliser le site.
          </p>
          <div className="space-y-4">
            <button
              onClick={handleCreateIdentity}
              className="w-full theme-gradient-primary hover:opacity-90 theme-text-primary py-3 rounded-lg theme-shadow font-medium transition-colors"
            >
              ➕ Créer votre première identité
            </button>
            <a
              href="/auth/login"
              className="w-full theme-gradient-primary hover:opacity-90 theme-text-primary py-3 rounded-lg theme-shadow font-medium transition-colors inline-block"
            >
              ← Retour à la connexion
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-gradient-bg flex items-center justify-center">
      <div className="theme-overlay-light backdrop-blur-sm rounded-lg theme-shadow p-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold theme-text-primary mb-6 text-center">
          👥 Sélectionnez votre Persona
        </h1>

        <p className="theme-text-secondary text-center mb-8">
          Choisissez avec quel persona vous voulez interagir aujourd'hui
        </p>

        {message && (
          <div className={`mb-6 p-4 rounded-lg theme-shadow ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/50 text-green-200'
              : 'bg-red-500/20 border border-red-500/50 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="mb-6 text-center">
          <button
            type="button"
            onClick={handleCreateIdentity}
            className="theme-gradient-primary hover:opacity-90 theme-text-primary px-4 py-2 rounded-lg theme-shadow font-medium transition-colors"
          >
            ➕ Créer une nouvelle identité
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            {availableUsers.map((user: User) => (
              <label
                key={user.id}
                className={`cursor-pointer p-4 rounded-lg theme-shadow border-2 transition-all ${
                  selectedUserId === user.id
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/20 theme-overlay-dark hover:border-white/40 hover:theme-overlay-light'
                }`}
              >
                <input
                  type="radio"
                  name="user"
                  value={user.id}
                  checked={selectedUserId === user.id}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">
                    {getUserIcon(user.persona)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold theme-text-primary">
                      {user.name}
                    </h3>
                    <p className="theme-text-secondary text-sm">
                      {getUserDescription(user.persona)}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs theme-text-secondary">Thème:</span>
                      <span className="text-xs theme-text-primary theme-overlay-medium px-2 py-1 rounded">
                        {user.theme}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedUserId === user.id && (
                      <div className="theme-text-secondary">
                        ✓
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteIdentity(user.id, user.name);
                      }}
                      className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                      title="Supprimer cette identité"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !selectedUserId}
            className="w-full theme-gradient-primary hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed theme-text-primary px-6 py-3 rounded-lg theme-shadow font-medium transition-colors"
          >
            {loading ? '⏳ Sélection...' : '🚀 Continuer avec ce Persona'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="theme-text-secondary">
            <Link href="/auth/login" className="theme-text-secondary hover:theme-text-secondary">
              ← Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}