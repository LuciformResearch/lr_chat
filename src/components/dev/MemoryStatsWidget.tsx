'use client';

import { useState, useEffect } from 'react';
import { mcpServer } from '@/mcp';

interface MemoryStatsWidgetProps {
  user: string;
  className?: string;
}

export function MemoryStatsWidget({ user, className = '' }: MemoryStatsWidgetProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await mcpServer.executeTool({
        tool: 'get_hierarchical_memory_stats',
        arguments: {}
      });

      if (result.result.success) {
        setStats(result.result.data.stats);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000); // Refresh toutes les 5 secondes
    return () => clearInterval(interval);
  }, [user]);

  if (!stats) {
    return (
      <div className={`text-xs text-gray-400 ${className}`}>
        {loading ? 'Chargement...' : 'Stats non disponibles'}
      </div>
    );
  }

  const budgetPercentage = Math.round((stats.budget.currentCharacters / stats.budget.maxCharacters) * 100);
  const budgetColor = budgetPercentage > 80 ? 'text-red-400' : budgetPercentage > 60 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className={`flex items-center space-x-4 text-xs ${className}`}>
      {/* Messages bruts */}
      <div className="flex items-center space-x-1">
        <span className="text-blue-300">📝</span>
        <span className="text-white">{stats.rawMessages}</span>
      </div>

      {/* Résumés L1 */}
      <div className="flex items-center space-x-1">
        <span className="text-purple-300">🧠</span>
        <span className="text-white">{stats.l1Count}L1</span>
      </div>

      {/* Budget */}
      <div className="flex items-center space-x-1">
        <span className={budgetColor}>💰</span>
        <span className={budgetColor}>{budgetPercentage}%</span>
      </div>

      {/* Ratio résumés */}
      <div className="flex items-center space-x-1">
        <span className="text-orange-300">📊</span>
        <span className="text-white">{Math.round(stats.budget.summaryRatio * 100)}%</span>
      </div>

      {/* Dernière mise à jour */}
      {lastUpdate && (
        <div className="text-gray-400">
          {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}