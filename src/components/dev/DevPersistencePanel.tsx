/**
 * Panel de gestion de la persistance de développement
 */

'use client';

import { useState, useEffect } from 'react';
import { useDevPersistence } from '@/lib/dev/DevPersistence';

export function DevPersistencePanel() {
  const { hasSession, sessionInfo, saveSession, restoreSession, clearSession } = useDevPersistence();
  const [isVisible, setIsVisible] = useState(false);
  const [autoRestored, setAutoRestored] = useState(false);

  // Afficher le panel seulement en développement
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }
  }, []);

  // Restauration automatique au chargement si une session existe
  useEffect(() => {
    if (hasSession && !autoRestored && typeof window !== 'undefined') {
      const shouldAutoRestore = !sessionStorage.getItem('lr_tchatagent_encrypted_api_keys');
      if (shouldAutoRestore) {
        console.log('🔄 Restauration automatique de la session dev...');
        restoreSession().then(success => {
          if (success) {
            setAutoRestored(true);
            console.log('✅ Session dev restaurée automatiquement');
          }
        });
      }
    }
  }, [hasSession, autoRestored, restoreSession]);

  if (!isVisible) {
    return null;
  }

  const handleRestore = async () => {
    const success = await restoreSession();
    if (success) {
      alert('✅ Session restaurée ! Rechargement de la page...');
      // Recharger la page pour que les clés soient visibles dans settings
      window.location.reload();
    } else {
      alert('❌ Aucune session à restaurer.');
    }
  };

  const handleClear = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données de développement ?')) {
      clearSession();
      alert('🧹 Données de développement effacées !');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-white text-sm max-w-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-yellow-400">🔧 Dev Persistence</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white/60 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-blue-300">Session:</span>
          <span className={hasSession ? 'text-green-400' : 'text-red-400'}>
            {hasSession ? '✅ Sauvegardée' : '❌ Aucune'}
          </span>
        </div>
        
        {sessionInfo && (
          <div className="text-xs text-white/60">
            <div>Dernière sauvegarde: {new Date(sessionInfo.lastSaved).toLocaleString('fr-FR')}</div>
            <div>Clés API: {sessionInfo.hasKeys ? '✅ Présentes' : '❌ Aucune'}</div>
          </div>
        )}
        
        <div className="flex space-x-2">
          <button
            onClick={handleRestore}
            disabled={!hasSession}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-xs transition-colors"
          >
            🔄 Restaurer
          </button>
          
          <button
            onClick={handleClear}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors"
          >
            🧹 Effacer
          </button>
        </div>
        
        <div className="text-xs text-white/40">
          💡 Sauvegarde automatique des clés API en localStorage
        </div>
      </div>
    </div>
  );
}