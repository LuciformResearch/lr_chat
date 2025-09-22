'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { authenticatedGet, authenticatedPost } from '@/lib/utils/authenticatedFetch';
import Link from 'next/link';

interface ApiKeyStatus {
  present: boolean;
  preview: string;
}

export default function DemoSettingsPage() {
  const router = useRouter();
  const { user, getCurrentAuthUser } = useAuth();
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [chatMode, setChatMode] = useState<'algareth' | 'neutral'>('algareth');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus>({ present: false, preview: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Récupérer le token d'authentification
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setMessage({ type: 'error', text: 'Token d\'authentification manquant. Veuillez vous reconnecter.' });
        return;
      }
      
      // Charger la clé API Gemini depuis la base de données
      const response = await authenticatedGet('/api/api-keys?provider=gemini');
      
      if (response.ok) {
        const data = await response.json();
        if (data.gemini) {
          setGeminiApiKey(data.gemini);
          setApiKeyStatus({
            present: true,
            preview: data.gemini.substring(0, 10) + '...' + data.gemini.slice(-4)
          });
        }
      } else if (response.status === 401) {
        setMessage({ type: 'error', text: 'Session expirée. Veuillez vous reconnecter.' });
      }

      // Charger le mode de chat depuis localStorage (temporaire)
      const savedMode = localStorage.getItem('lr_tchatagent_chat_mode');
      if (savedMode && (savedMode === 'algareth' || savedMode === 'neutral')) {
        setChatMode(savedMode as 'algareth' | 'neutral');
      }

    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des paramètres' });
    } finally {
      setIsLoading(false);
    }
  };

  const testApiKey = async () => {
    if (!geminiApiKey.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer une clé API Gemini' });
      return;
    }

    setIsTesting(true);
    setMessage(null);

    try {
      // Test simple avec l'API Gemini
      const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Test de connexion - répondez simplement "OK"'
            }]
          }]
        })
      });

      if (testResponse.ok) {
        setMessage({ type: 'success', text: '✅ Clé API Gemini valide !' });
      } else {
        const errorData = await testResponse.json();
        setMessage({ type: 'error', text: `❌ Clé API invalide: ${errorData.error?.message || 'Erreur inconnue'}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Erreur lors du test de la clé API' });
    } finally {
      setIsTesting(false);
    }
  };

  const saveSettings = async () => {
    if (!geminiApiKey.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer une clé API Gemini' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // Récupérer le token d'authentification
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setMessage({ type: 'error', text: 'Token d\'authentification manquant. Veuillez vous reconnecter.' });
        return;
      }

      // Sauvegarder la clé API Gemini en base de données
      const response = await authenticatedPost('/api/api-keys', {
        provider: 'gemini',
        apiKey: geminiApiKey.trim()
      });

      if (response.ok) {
        // Sauvegarder le mode de chat en localStorage (temporaire)
        localStorage.setItem('lr_tchatagent_chat_mode', chatMode);
        
        setMessage({ type: 'success', text: '✅ Clé configurée ! Retour au dashboard...' });
        
        // Mettre à jour le statut
        setApiKeyStatus({
          present: true,
          preview: geminiApiKey.substring(0, 10) + '...' + geminiApiKey.slice(-4)
        });

        // Retour intelligent au dashboard après 2 secondes
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        const errorData = await response.json();
        if (response.status === 401) {
          setMessage({ type: 'error', text: 'Session expirée. Veuillez vous reconnecter.' });
        } else {
          setMessage({ type: 'error', text: `❌ Erreur lors de la sauvegarde: ${errorData.error}` });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Erreur lors de la sauvegarde des paramètres' });
    } finally {
      setIsSaving(false);
    }
  };

  const clearSettings = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer vos paramètres ?')) {
      setGeminiApiKey('');
      setChatMode('algareth');
      setApiKeyStatus({ present: false, preview: '' });
      localStorage.removeItem('lr_tchatagent_chat_mode');
      setMessage({ type: 'info', text: 'Paramètres effacés' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen theme-gradient-bg flex items-center justify-center">
        <div className="theme-text-primary text-xl">⏳ Chargement des paramètres...</div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen theme-gradient-bg relative">
        {/* Image de fond floue */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/woman_in_black_background.png" 
            alt="Background" 
            className="w-full h-full object-cover opacity-5 blur-sm"
          />
        </div>
        
        {/* Bannière */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10 w-4/5 max-w-4xl">
          <img 
            src="/banner.jpeg" 
            alt="LR Hub Banner" 
            className="w-full h-24 object-cover rounded-lg theme-shadow opacity-90"
          />
        </div>
        
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg theme-shadow p-6 mb-8 theme-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-2">
                  <img 
                    src="/pentagram_icon_transparent.png" 
                    alt="LR Hub" 
                    className="w-8 h-8 mr-2 opacity-90"
                  />
                  <h1 className="text-3xl font-bold theme-text-primary lr-hub-brand">
                    LR Hub™
                  </h1>
                </div>
                <h2 className="text-xl theme-text-secondary mb-2">
                  ⚙️ Paramètres du Chat
                </h2>
                <p className="theme-text-secondary">
                  Configuration simplifiée pour {getCurrentAuthUser()?.email || user?.display_name || 'Utilisateur'}
                </p>
              </div>
              <Link 
                href="/dashboard"
                className="theme-gradient-primary hover:opacity-90 theme-text-primary px-4 py-2 rounded-lg theme-shadow font-medium transition-colors"
              >
                🏠 Retour au Dashboard
              </Link>
            </div>
          </div>

          {/* Configuration principale */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg theme-shadow p-6 mb-8">
            {/* Message de statut */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg theme-shadow ${
                message.type === 'success' 
                  ? 'bg-green-500/20 border border-green-500/50 text-green-200'
                  : message.type === 'error'
                  ? 'bg-red-500/20 border border-red-500/50 text-red-200'
                  : 'bg-blue-500/20 border border-blue-500/50 theme-text-secondary'
              }`}>
                {message.text}
              </div>
            )}

            {/* Clé API Gemini */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold theme-text-primary mb-4">🔑 Clé API Gemini</h2>
              <div className="space-y-4">
                <div>
                  <label className="block theme-text-primary font-medium mb-2">
                    Clé API Google Gemini
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Entrez votre clé API Gemini ..."
                      className="flex-1 px-4 py-3 theme-overlay-light border border-white/20 rounded-lg theme-shadow theme-text-primary placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={testApiKey}
                      disabled={isTesting || !geminiApiKey.trim()}
                      className="theme-gradient-secondary hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed theme-text-primary px-4 py-3 rounded-lg theme-shadow font-medium transition-colors"
                    >
                      {isTesting ? '⏳' : '🧪'}
                    </button>
                  </div>
                  <p className="theme-text-secondary text-sm mt-2">
                    💡 Obtenez votre clé gratuite sur{' '}
                    <a 
                      href="https://makersuite.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="theme-text-secondary hover:theme-text-secondary underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>

                {/* Statut de la clé */}
                {apiKeyStatus.present && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg theme-shadow">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✅</span>
                      <span className="text-green-200">
                        Clé configurée: {apiKeyStatus.preview}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mode de Chat */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold theme-text-primary mb-4">🎭 Mode de Chat</h2>
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-lg theme-shadow border-2 cursor-pointer transition-all ${
                    chatMode === 'algareth'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 theme-overlay-dark hover:border-white/40'
                  }`}
                  onClick={() => setChatMode('algareth')}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">⛧</span>
                    <div>
                      <h3 className="theme-text-primary font-medium">Algareth</h3>
                      <p className="theme-text-secondary text-sm">
                        Mode principal avec personnalité et intelligence avancée
                      </p>
                    </div>
                    {chatMode === 'algareth' && (
                      <div className="ml-auto w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 theme-text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg theme-shadow border-2 cursor-pointer transition-all ${
                    chatMode === 'neutral'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 theme-overlay-dark hover:border-white/40'
                  }`}
                  onClick={() => setChatMode('neutral')}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">😊</span>
                    <div>
                      <h3 className="theme-text-primary font-medium">Neutre</h3>
                      <p className="theme-text-secondary text-sm">
                        Mode neutre et professionnel pour les conversations formelles
                      </p>
                    </div>
                    {chatMode === 'neutral' && (
                      <div className="ml-auto w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 theme-text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={saveSettings}
                disabled={isSaving || !geminiApiKey.trim()}
                className="theme-gradient-primary hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed theme-text-primary px-6 py-3 rounded-lg theme-shadow font-medium transition-colors"
              >
                {isSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
              </button>
              
              <button
                onClick={clearSettings}
                className="theme-gradient-secondary hover:opacity-90 theme-text-primary px-6 py-3 rounded-lg theme-shadow font-medium transition-colors"
              >
                🗑️ Effacer
              </button>
            </div>
          </div>

          {/* Guide rapide */}
          <div className="theme-overlay-dark backdrop-blur-sm rounded-lg theme-shadow p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4">📖 Guide Rapide</h3>
            <div className="space-y-3 theme-text-secondary">
              <div>
                <strong className="theme-text-primary">1. Obtenir une clé Gemini :</strong>
                <p>Visitez Google AI Studio, créez un compte gratuit et générez votre clé API.</p>
              </div>
              <div>
                <strong className="theme-text-primary">2. Tester votre clé :</strong>
                <p>Utilisez le bouton 🧪 pour vérifier que votre clé fonctionne correctement.</p>
              </div>
              <div>
                <strong className="theme-text-primary">3. Choisir votre mode :</strong>
                <p>Algareth pour une expérience riche, Neutre pour des conversations formelles.</p>
              </div>
              <div>
                <strong className="theme-text-primary">4. Commencer à chatter :</strong>
                <p>Retournez au dashboard et lancez le Chat V2 !</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}