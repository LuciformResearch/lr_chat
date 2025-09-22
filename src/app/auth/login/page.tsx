/**
 * Page de connexion
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const { signIn, loading, error } = useAuth();
  const router = useRouter();

  // Rediriger vers la configuration si la base de données n'est pas accessible
  if (error && error.includes('Base de données non accessible')) {
    router.push('/auth/setup');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const result = await signIn(formData);
    
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      
      // Si plusieurs utilisateurs disponibles, rediriger vers la sélection
      if (result.needsUserSelection) {
        setTimeout(() => {
          router.push('/auth/select-user');
        }, 1000);
      } else {
        // Un seul utilisateur, aller directement au dashboard
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

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
      
      {/* Bannière */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10 w-4/5 max-w-4xl">
        <img 
          src="/banner.jpeg" 
          alt="LR Hub Banner" 
          className="w-full h-24 object-cover rounded-lg theme-shadow opacity-90"
        />
      </div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="theme-overlay-light backdrop-blur-sm rounded-lg theme-shadow p-8 w-full max-w-md">
          <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/pentagram_icon_transparent.png" 
              alt="LR Hub" 
              className="w-8 h-8 mr-2 opacity-90"
            />
            <h1 className="text-3xl font-bold theme-text-primary lr-hub-brand">
              LR Hub™
            </h1>
          </div>
          <h2 className="text-xl theme-text-secondary">
            🔐 Connexion
          </h2>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg theme-shadow ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/50 text-green-200'
              : 'bg-red-500/20 border border-red-500/50 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block theme-text-primary font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 theme-overlay-light border border-white/20 rounded-lg theme-shadow theme-text-primary placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div>
            <label className="block theme-text-primary font-medium mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-2 theme-overlay-light border border-white/20 rounded-lg theme-shadow theme-text-primary placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full theme-gradient-primary hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed theme-text-primary px-6 py-3 rounded-lg theme-shadow font-medium transition-colors"
          >
            {loading ? '⏳ Connexion...' : '🚀 Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="theme-text-secondary">
            Pas de compte ?{' '}
            <Link href="/auth/register" className="theme-text-secondary hover:theme-text-secondary">
              S'inscrire
            </Link>
          </p>
          <p className="theme-text-secondary">
            <Link href="/auth/forgot-password" className="theme-text-secondary hover:theme-text-secondary">
              Mot de passe oublié ?
            </Link>
          </p>
          <div className="border-t border-white/20 pt-4 mt-4">
            <p className="theme-text-secondary text-sm mb-2">
              Découvrez mon parcours professionnel
            </p>
            <Link 
              href="/cv" 
              className="theme-gradient-secondary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block"
            >
              📄 Voir mon CV
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}