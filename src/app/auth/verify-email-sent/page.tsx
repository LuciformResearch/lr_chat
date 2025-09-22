/**
 * Page de confirmation - Email de vérification envoyé
 */

'use client';

import Link from 'next/link';

export default function VerifyEmailSentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-6">📧</div>
        
        <h1 className="text-3xl font-bold text-white mb-6">
          Email envoyé !
        </h1>

        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-green-200 mb-3">
            ✅ Vérifiez votre boîte email
          </h2>
          
          <p className="text-green-200 text-sm leading-relaxed">
            Nous avons envoyé un email de confirmation à l'adresse que vous avez fournie. 
            Cliquez sur le lien dans l'email pour activer votre compte.
          </p>
        </div>

        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-2">
            📋 Prochaines étapes :
          </h3>
          <ul className="text-blue-200 text-sm text-left space-y-1">
            <li>• Ouvrez votre boîte email</li>
            <li>• Cherchez l'email de Luciform Research</li>
            <li>• Cliquez sur "Confirmer mon compte"</li>
            <li>• Revenez ici pour vous connecter</li>
          </ul>
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

        <div className="mt-6 text-center">
          <p className="text-blue-300 text-xs">
            Pas reçu l'email ? Vérifiez vos spams ou{' '}
            <Link href="/auth/resend-verification" className="text-purple-400 hover:text-purple-300">
              renvoyer l'email
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}