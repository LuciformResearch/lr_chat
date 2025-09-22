'use client';

/**
 * Page d'accueil pour Vercel - Redirection vers le dashboard
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers le dashboard après un court délai
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

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
          className="w-full h-32 object-cover rounded-lg theme-shadow opacity-90"
        />
      </div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/pentagram_icon_transparent.png" 
              alt="LR Hub" 
              className="w-12 h-12 mr-3 opacity-90"
            />
            <h1 className="text-4xl font-bold theme-text-primary lr-hub-brand">
              LR Hub™
            </h1>
          </div>
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="theme-text-secondary text-lg mb-6">
            Redirection vers le dashboard...
          </p>
          
          {/* Liens vers le CV et GitLab */}
          <div className="theme-overlay-light backdrop-blur-sm rounded-lg p-4 theme-shadow inline-block">
            <p className="theme-text-secondary text-sm mb-3">
              Découvrez mon parcours professionnel et mes projets
            </p>
            <div className="flex gap-3 justify-center">
              <Link 
                href="/cv" 
                className="theme-gradient-secondary hover:opacity-90 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
              >
                📄 Voir mon CV
              </Link>
              <Link 
                href="https://gitlab.com/luciformresearch" 
                target="_blank"
                rel="noopener noreferrer"
                className="theme-gradient-primary hover:opacity-90 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
              >
                🦊 GitLab
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}