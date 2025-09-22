/**
 * Page d'enregistrement avec confirmation email
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationName: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    // Validation côté client
    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères' });
      setIsLoading(false);
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setMessage({ type: 'error', text: 'Le prénom et le nom sont obligatoires' });
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationName: formData.organizationName || undefined
      });
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: 'Inscription réussie ! Vérifiez votre email pour confirmer votre compte.' 
        });
        
        // Vider le formulaire
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          firstName: '',
          lastName: '',
          organizationName: ''
        });
        
        // Rediriger vers la page de confirmation
        setTimeout(() => {
          router.push('/auth/verify-email-sent');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Une erreur est survenue lors de l\'inscription' });
    } finally {
      setIsLoading(false);
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
              🚀 Créer un compte
            </h2>
          </div>

          <p className="theme-text-secondary text-center mb-8">
          Rejoignez Luciform Research et découvrez votre assistant IA personnel
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block theme-text-primary font-medium mb-2">
                Prénom *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-4 py-2 theme-overlay-light border border-white/20 rounded-lg theme-shadow theme-text-primary placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="UserName"
                required
              />
            </div>
            <div>
              <label className="block theme-text-primary font-medium mb-2">
                Nom *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-4 py-2 theme-overlay-light border border-white/20 rounded-lg theme-shadow theme-text-primary placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Defraiteur"
                required
              />
            </div>
          </div>

          <div>
            <label className="block theme-text-primary font-medium mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 theme-overlay-light border border-white/20 rounded-lg theme-shadow theme-text-primary placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="user@mail.com"
              required
            />
          </div>

          <div>
            <label className="block theme-text-primary font-medium mb-2">
              Organisation (optionnel)
            </label>
            <input
              type="text"
              value={formData.organizationName}
              onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
              className="w-full px-4 py-2 theme-overlay-light border border-white/20 rounded-lg theme-shadow theme-text-primary placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Luciform Research"
            />
            <p className="theme-text-secondary text-xs mt-1">
              Laissez vide pour rejoindre l'organisation par défaut
            </p>
          </div>

          <div>
            <label className="block theme-text-primary font-medium mb-2">
              Mot de passe *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-2 theme-overlay-light border border-white/20 rounded-lg theme-shadow theme-text-primary placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              required
              minLength={8}
            />
            <p className="theme-text-secondary text-xs mt-1">
              Minimum 8 caractères
            </p>
          </div>

          <div>
            <label className="block theme-text-primary font-medium mb-2">
              Confirmer le mot de passe *
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-4 py-2 theme-overlay-light border border-white/20 rounded-lg theme-shadow theme-text-primary placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full theme-gradient-primary hover:opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed theme-text-primary px-6 py-3 rounded-lg theme-shadow font-medium transition-colors"
          >
            {isLoading ? '⏳ Création du compte...' : '🚀 Créer mon compte'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="theme-text-secondary">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="theme-text-secondary hover:theme-text-secondary">
              Se connecter
            </Link>
          </p>
          <p className="theme-text-secondary text-xs">
            En créant un compte, vous acceptez nos conditions d'utilisation
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