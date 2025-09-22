'use client';

import { useState, useEffect } from 'react';
import { mcpServer } from '@/mcp';

interface HierarchicalMemoryDebugProps {
  user: string;
  className?: string;
}

export function HierarchicalMemoryDebug({ user, className = '' }: HierarchicalMemoryDebugProps) {
  const [stats, setStats] = useState<any>(null);
  const [memoryItems, setMemoryItems] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadMemoryStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await mcpServer.executeTool({
        tool: 'get_hierarchical_memory_stats',
        arguments: {}
      });

      if (result.result.success) {
        setStats(result.result.data.stats);
        setMemoryItems(result.result.data.memoryItems || []);
      }
    } catch (error) {
      console.error('Erreur chargement stats mémoire hiérarchique:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemoryStats();
  }, [user]);

  if (!stats) {
    return (
      <div className={`text-xs text-gray-400 ${className}`}>
        {loading ? 'Chargement...' : 'Mémoire hiérarchique non disponible'}
      </div>
    );
  }

  const budgetPercentage = Math.round((stats.budget.currentCharacters / stats.budget.maxCharacters) * 100);
  const budgetColor = budgetPercentage > 80 ? 'text-red-400' : budgetPercentage > 60 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className={`text-xs ${className}`}>
      <div 
        className="flex items-center space-x-2 cursor-pointer hover:bg-white/5 px-2 py-1 rounded"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-purple-300">🧠</span>
        <span className="text-gray-300">
          {stats.totalItems} items ({stats.l1Count}L1)
        </span>
        <span className={budgetColor}>
          {budgetPercentage}%
        </span>
        <span className="text-gray-400">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-2 p-3 bg-black/20 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Messages bruts:</span>
              <span className="text-white ml-1">{stats.rawMessages}</span>
            </div>
            <div>
              <span className="text-gray-400">Résumés:</span>
              <span className="text-white ml-1">{stats.summaries}</span>
            </div>
            <div>
              <span className="text-gray-400">L1:</span>
              <span className="text-white ml-1">{stats.l1Count}</span>
            </div>
            <div>
              <span className="text-gray-400">Ratio résumés:</span>
              <span className="text-white ml-1">{Math.round(stats.budget.summaryRatio * 100)}%</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-400">Budget mémoire</span>
              <span className={budgetColor}>
                {stats.budget.currentCharacters}/{stats.budget.maxCharacters} chars
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  budgetPercentage > 80 ? 'bg-red-500' : 
                  budgetPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {memoryItems.length > 0 && (
            <div className="border-t border-white/10 pt-2">
              <div className="text-gray-400 mb-2">Derniers items:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {memoryItems.slice(-5).map((item, index) => (
                  <div key={index} className="flex items-start space-x-2 text-xs">
                    <span className={`px-1 rounded text-xs ${
                      item.type === 'raw' ? 'bg-blue-500/30 text-blue-300' : 
                      item.level === 1 ? 'bg-purple-500/30 text-purple-300' :
                      'bg-orange-500/30 text-orange-300'
                    }`}>
                      {item.type === 'raw' ? 'RAW' : `L${item.level}`}
                    </span>
                    <span className="text-gray-300 flex-1 truncate">
                      {item.content.substring(0, 60)}...
                    </span>
                    <span className="text-gray-500">
                      {item.characterCount}c
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-white/10 pt-2">
            <button
              onClick={loadMemoryStats}
              className="text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 px-2 py-1 rounded transition-colors"
            >
              🔄 Actualiser
            </button>
          </div>
        </div>
      )}
    </div>
  );
}