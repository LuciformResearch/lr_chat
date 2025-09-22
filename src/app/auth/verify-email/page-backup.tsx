/**
 * Page de vérification d'email avec token
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Token de vérification manquant');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (result.success) {
          setStatus('success');
          setMessage('Votre email a été vérifié avec succès !');
          
          // Rediriger vers la connexion après 3 secondes
          setTimeout(() => {
            router.push('/auth/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.message || 'Erreur lors de la vérification');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Erreur de connexion. Veuillez réessayer.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="text-6xl mb-6 animate-spin">⏳</div>
            <h1 className="text-3xl font-bold text-white mb-6">
              Vérification en cours...
            </h1>
            <p className="text-blue-300">
              Nous vérifions votre email, veuillez patienter.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h1 className="text-3xl font-bold text-white mb-6">
              Email vérifié !
            </h1>
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6 mb-6">
              <p className="text-green-200">
                {message}
              </p>
            </div>
            <p className="text-blue-300 mb-6">
              Vous allez être redirigé vers la page de connexion...
            </p>
            <Link 
              href="/auth/login"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔐 Se connecter maintenant
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-3xl font-bold text-white mb-6">
              Erreur de vérification
            </h1>
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 mb-6">
              <p className="text-red-200">
                {message}
              </p>
            </div>
            <div className="space-y-3">
              <Link 
                href="/auth/login"
                className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                🔐 Se connecter
              </Link>
              <Link 
                href="/auth/register"
                className="block w-full bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                ← Retour à l'inscription
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}