/**
 * Page de configuration Supabase
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SetupPage() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const handleGoToSettings = () => {
    router.push('/settings');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          ⚙️ Configuration Supabase
        </h1>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/50 text-green-200'
              : 'bg-red-500/20 border border-red-500/50 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-white mb-2">
              ⚠️ Supabase Non Configuré
            </h2>
            <p className="text-orange-200">
              Pour utiliser l'authentification, vous devez d'abord configurer Supabase avec vos clés API.
            </p>
          </div>

          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              📋 Étapes de Configuration
            </h3>
            <ol className="text-blue-200 space-y-2 list-decimal list-inside">
              <li>Créez un projet sur <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">supabase.com</a></li>
              <li>Exécutez le script SQL dans l'éditeur SQL de Supabase</li>
              <li>Récupérez votre URL et clé API dans Settings → API</li>
              <li>Configurez les clés dans les paramètres de l'application</li>
            </ol>
          </div>

          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              🗄️ Script SQL à Exécuter
            </h3>
            <p className="text-green-200 mb-3">
              Copiez le contenu du fichier <code className="bg-black/20 px-2 py-1 rounded">supabase-schema.sql</code> et exécutez-le dans l'éditeur SQL de Supabase.
            </p>
            <button
              onClick={async () => {
                try {
                  // Lire le contenu du fichier SQL
                  const response = await fetch('/supabase-schema.sql');
                  const sqlContent = await response.text();
                  
                  // Copier dans le presse-papiers
                  await navigator.clipboard.writeText(sqlContent);
                  setMessage({ type: 'success', text: 'Script SQL copié ! Collez-le dans l\'éditeur SQL de Supabase.' });
                } catch (error) {
                  setMessage({ type: 'error', text: 'Erreur lors de la copie du script. Voir le fichier supabase-schema.sql dans le projet.' });
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📋 Copier le Script SQL
            </button>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleGoToSettings}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ⚙️ Configurer les Clés API
            </button>
            
            <Link
              href="/auth/login"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors text-center"
            >
              🔙 Retour au Login
            </Link>
          </div>

          <div className="text-center">
            <p className="text-blue-300 text-sm">
              Besoin d'aide ? Consultez la documentation dans les rapports techniques.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}