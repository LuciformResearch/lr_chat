/**
 * Composant pour afficher les statistiques de mémoire
 */

'use client';

import { useState, useEffect } from 'react';
import { SummaryManager, SummaryStats } from '@/lib/summarization/SummaryManager';

interface MemoryStatsProps {
  userId?: string;
  showDetails?: boolean;
}

export function MemoryStats({ userId, showDetails = false }: MemoryStatsProps) {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      const summaryManager = new SummaryManager();
      const statsData = summaryManager.getSummaryStats();
      setStats(statsData);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 theme-shadow">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-theme-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="theme-text-secondary text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 theme-shadow">
        <p className="theme-text-muted text-sm">Aucune donnée de mémoire disponible</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 theme-shadow">
      <h3 className="text-lg font-semibold theme-text-primary mb-3 flex items-center">
        🧠 Statistiques de Mémoire
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold theme-text-primary">{stats.totalUsers}</div>
          <div className="text-sm theme-text-secondary">Utilisateurs</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold theme-text-primary">{stats.totalSummaries}</div>
          <div className="text-sm theme-text-secondary">Résumés</div>
        </div>
      </div>

      {showDetails && Object.keys(stats.users).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium theme-text-primary">Détail par utilisateur:</h4>
          {Object.entries(stats.users).map(([userId, userStats]) => (
            <div key={userId} className="flex justify-between items-center text-sm">
              <span className="theme-text-secondary">{userId}</span>
              <div className="flex items-center space-x-2">
                <span className="theme-text-muted">{userStats.count} résumé(s)</span>
                <span className="text-xs bg-theme-accent-primary/20 px-2 py-1 rounded">
                  {(userStats.averageCompressionRatio * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {userId && stats.users[userId] && (
        <div className="mt-4 pt-4 border-t border-white/20">
          <h4 className="text-sm font-medium theme-text-primary mb-2">
            Utilisateur actuel: {userId}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="theme-text-secondary">Résumés:</span>
              <span className="theme-text-primary ml-2">{stats.users[userId].count}</span>
            </div>
            <div>
              <span className="theme-text-secondary">Messages:</span>
              <span className="theme-text-primary ml-2">{stats.users[userId].totalMessages}</span>
            </div>
            <div>
              <span className="theme-text-secondary">Compression:</span>
              <span className="theme-text-primary ml-2">
                {(stats.users[userId].averageCompressionRatio * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="theme-text-secondary">Dernier:</span>
              <span className="theme-text-primary ml-2">
                {stats.users[userId].latest 
                  ? new Date(stats.users[userId].latest!).toLocaleDateString()
                  : 'Jamais'
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}