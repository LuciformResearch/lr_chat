/**
 * Composant pour afficher les résumés d'un utilisateur
 */

'use client';

import { useState, useEffect } from 'react';
import { SummaryManager, UserSummary } from '@/lib/summarization/SummaryManager';

interface UserSummariesProps {
  userId: string;
  maxSummaries?: number;
}

export function UserSummaries({ userId, maxSummaries = 5 }: UserSummariesProps) {
  const [summaries, setSummaries] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<UserSummary | null>(null);

  useEffect(() => {
    loadSummaries();
  }, [userId]);

  const loadSummaries = async () => {
    try {
      const summaryManager = new SummaryManager();
      const userSummaries = summaryManager.getUserSummaries(userId);
      setSummaries(userSummaries.slice(0, maxSummaries));
    } catch (error) {
      console.error('Erreur chargement résumés:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 theme-shadow">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-theme-accent-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="theme-text-secondary text-sm">Chargement des résumés...</span>
        </div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 theme-shadow">
        <h3 className="text-lg font-semibold theme-text-primary mb-2">
          📝 Résumés de {userId}
        </h3>
        <p className="theme-text-muted text-sm">Aucun résumé disponible pour cet utilisateur</p>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 theme-shadow">
      <h3 className="text-lg font-semibold theme-text-primary mb-3 flex items-center">
        📝 Résumés de {userId}
        <span className="ml-2 text-sm bg-theme-accent-primary/20 px-2 py-1 rounded">
          {summaries.length}
        </span>
      </h3>
      
      <div className="space-y-3">
        {summaries.map((summary, index) => (
          <div
            key={summary.id}
            className="bg-white/5 rounded-lg p-3 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => setSelectedSummary(selectedSummary?.id === summary.id ? null : summary)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm theme-text-muted">#{index + 1}</span>
                <span className="text-xs theme-text-muted">
                  {new Date(summary.timestamp).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-blue-500/20 px-2 py-1 rounded">
                  {summary.metadata.messageCount} msg
                </span>
                <span className="text-xs bg-green-500/20 px-2 py-1 rounded">
                  {(summary.metadata.compressionRatio * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            
            <p className="theme-text-secondary text-sm line-clamp-2">
              {summary.summary}
            </p>
            
            {selectedSummary?.id === summary.id && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium theme-text-primary mb-1">Résumé complet:</h4>
                    <p className="theme-text-secondary text-sm whitespace-pre-wrap">
                      {summary.summary}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="theme-text-muted">Messages:</span>
                      <span className="theme-text-primary ml-1">{summary.metadata.messageCount}</span>
                    </div>
                    <div>
                      <span className="theme-text-muted">Longueur:</span>
                      <span className="theme-text-primary ml-1">{summary.metadata.summaryLength} chars</span>
                    </div>
                    <div>
                      <span className="theme-text-muted">Compression:</span>
                      <span className="theme-text-primary ml-1">
                        {(summary.metadata.compressionRatio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="theme-text-muted">Qualité:</span>
                      <span className="theme-text-primary ml-1">
                        {(summary.metadata.qualityScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {summaries.length > maxSummaries && (
        <div className="mt-3 pt-3 border-t border-white/20 text-center">
          <p className="theme-text-muted text-sm">
            ... et {summaries.length - maxSummaries} autres résumés
          </p>
        </div>
      )}
    </div>
  );
}