'use client';

/**
 * Page de gestion de la mémoire et des résumés
 */

import { useState, useEffect } from 'react';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/language/LanguageSwitcher';
import { MemoryStats, UserSummaries } from '@/components/memory';
import { SummaryManager, SummaryStats } from '@/lib/summarization/SummaryManager';

export default function MemoryPage() {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const summaryManager = new SummaryManager();
      const statsData = summaryManager.getSummaryStats();
      setStats(statsData);
      
      // Sélectionner le premier utilisateur par défaut
      if (statsData.totalUsers > 0) {
        setSelectedUser(Object.keys(statsData.users)[0]);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllSummaries = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer tous les résumés ? Cette action est irréversible.')) {
      const summaryManager = new SummaryManager();
      summaryManager.clearAllSummaries();
      loadStats(); // Recharger les stats
    }
  };

  const handleClearUserSummaries = (userId: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer tous les résumés de ${userId} ?`)) {
      const summaryManager = new SummaryManager();
      summaryManager.deleteUserSummaries(userId);
      loadStats(); // Recharger les stats
    }
  };

  const handleExportSummaries = () => {
    const summaryManager = new SummaryManager();
    const exportData = summaryManager.exportSummaries();
    
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lr_tchatagent_summaries_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen theme-gradient-bg flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-theme-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="theme-text-secondary">Chargement de la mémoire...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-gradient-bg">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/pentagram_icon_transparent.png" 
                alt="Algareth" 
                className="w-8 h-8 opacity-90"
              />
              <div>
                <h1 className="text-xl font-bold theme-text-primary">🧠 Gestion de Mémoire</h1>
                <p className="theme-text-secondary text-sm">Résumés et conversations d'Algareth</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
            { id: 'users', label: 'Utilisateurs', icon: '👥' },
            { id: 'settings', label: 'Paramètres', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-theme-accent-primary text-white'
                  : 'theme-text-secondary hover:bg-white/10'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <MemoryStats showDetails={true} />
            
            {stats && stats.totalUsers > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 theme-shadow">
                <h3 className="text-lg font-semibold theme-text-primary mb-4">
                  📈 Aperçu des Utilisateurs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(stats.users).map(([userId, userStats]) => (
                    <div
                      key={userId}
                      className="bg-white/5 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => {
                        setSelectedUser(userId);
                        setActiveTab('users');
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium theme-text-primary">{userId}</h4>
                        <span className="text-xs bg-theme-accent-primary/20 px-2 py-1 rounded">
                          {userStats.count} résumé(s)
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="theme-text-muted">Messages:</span>
                          <span className="theme-text-primary">{userStats.totalMessages}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="theme-text-muted">Compression:</span>
                          <span className="theme-text-primary">
                            {(userStats.averageCompressionRatio * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="theme-text-muted">Dernier:</span>
                          <span className="theme-text-primary">
                            {userStats.latest 
                              ? new Date(userStats.latest).toLocaleDateString()
                              : 'Jamais'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {stats && stats.totalUsers > 0 ? (
              <>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 theme-shadow">
                  <h3 className="text-lg font-semibold theme-text-primary mb-4">
                    👥 Sélection d'Utilisateur
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(stats.users).map((userId) => (
                      <button
                        key={userId}
                        onClick={() => setSelectedUser(userId)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          selectedUser === userId
                            ? 'bg-theme-accent-primary text-white'
                            : 'bg-white/10 theme-text-secondary hover:bg-white/20'
                        }`}
                      >
                        {userId}
                        <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
                          {stats.users[userId].count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedUser && (
                  <UserSummaries userId={selectedUser} maxSummaries={10} />
                )}
              </>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 theme-shadow text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-semibold theme-text-primary mb-2">
                  Aucun utilisateur trouvé
                </h3>
                <p className="theme-text-secondary">
                  Commencez une conversation avec Algareth pour voir apparaître vos résumés ici.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 theme-shadow">
              <h3 className="text-lg font-semibold theme-text-primary mb-4">
                ⚙️ Gestion des Données
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <h4 className="font-medium theme-text-primary">Exporter les résumés</h4>
                    <p className="text-sm theme-text-muted">
                      Sauvegarder tous les résumés dans un fichier JSON
                    </p>
                  </div>
                  <button
                    onClick={handleExportSummaries}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    📥 Exporter
                  </button>
                </div>

                {selectedUser && (
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <h4 className="font-medium theme-text-primary">
                        Supprimer les résumés de {selectedUser}
                      </h4>
                      <p className="text-sm theme-text-muted">
                        Supprimer définitivement tous les résumés de cet utilisateur
                      </p>
                    </div>
                    <button
                      onClick={() => handleClearUserSummaries(selectedUser)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div>
                    <h4 className="font-medium theme-text-primary text-red-400">
                      Supprimer tous les résumés
                    </h4>
                    <p className="text-sm theme-text-muted">
                      ⚠️ Cette action supprimera définitivement tous les résumés de tous les utilisateurs
                    </p>
                  </div>
                  <button
                    onClick={handleClearAllSummaries}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    🗑️ Tout supprimer
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 theme-shadow">
              <h3 className="text-lg font-semibold theme-text-primary mb-4">
                ℹ️ Informations Système
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="theme-text-muted">Stockage:</span>
                  <span className="theme-text-primary ml-2">localStorage</span>
                </div>
                <div>
                  <span className="theme-text-muted">Format:</span>
                  <span className="theme-text-primary ml-2">JSON</span>
                </div>
                <div>
                  <span className="theme-text-muted">Compression:</span>
                  <span className="theme-text-primary ml-2">Automatique</span>
                </div>
                <div>
                  <span className="theme-text-muted">Version:</span>
                  <span className="theme-text-primary ml-2">1.0</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}