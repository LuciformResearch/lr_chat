'use client';

import { useState, useEffect } from 'react';
import { mcpServer } from '@/mcp';
import { SummaryPreview } from '@/components/dev/SummaryPreview';

interface MemoryStats {
  totalItems: number;
  rawMessages: number;
  summaries: number;
  l1Count: number;
  totalCharacters: number;
  budget: {
    maxCharacters: number;
    currentCharacters: number;
    summaryRatio: number;
  };
}

interface MemoryItem {
  id: string;
  type: 'raw' | 'summary';
  level?: number;
  content: string;
  characterCount: number;
  topics?: string[];
  covers?: string[];
  timestamp: string;
  metadata?: {
    originalMessageCount?: number;
    compressionRatio?: number;
    qualityScore?: number;
  };
}

export default function MemoryDebugPage() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<MemoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<'all' | 'raw' | 'summary'>('all');

  const loadData = async () => {
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
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const filteredItems = memoryItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'raw') return item.type === 'raw';
    if (filter === 'summary') return item.type === 'summary';
    return true;
  });

  const budgetPercentage = stats ? Math.round((stats.budget.currentCharacters / stats.budget.maxCharacters) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🧠 Debug Mémoire Hiérarchique</h1>
            <p className="text-gray-400">Visualisation en temps réel du système de mémoire d'Algareth</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded ${
                autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
              }`}
            >
              {autoRefresh ? '🔄 Auto ON' : '⏸️ Auto OFF'}
            </button>
            <button
              onClick={loadData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              🔄 Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Statistiques principales */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-600/20 p-4 rounded-lg border border-blue-500/30">
              <div className="text-blue-300 font-medium">Messages Bruts</div>
              <div className="text-3xl font-bold text-white">{stats.rawMessages}</div>
            </div>
            <div className="bg-purple-600/20 p-4 rounded-lg border border-purple-500/30">
              <div className="text-purple-300 font-medium">Résumés L1</div>
              <div className="text-3xl font-bold text-white">{stats.l1Count}</div>
            </div>
            <div className="bg-green-600/20 p-4 rounded-lg border border-green-500/30">
              <div className="text-green-300 font-medium">Total Items</div>
              <div className="text-3xl font-bold text-white">{stats.totalItems}</div>
            </div>
            <div className="bg-orange-600/20 p-4 rounded-lg border border-orange-500/30">
              <div className="text-orange-300 font-medium">Budget</div>
              <div className="text-3xl font-bold text-white">{budgetPercentage}%</div>
            </div>
          </div>
        )}

        {/* Budget détaillé */}
        {stats && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">💰 Budget Mémoire</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Utilisation</span>
                <span className="font-mono">
                  {stats.budget.currentCharacters.toLocaleString()} / {stats.budget.maxCharacters.toLocaleString()} chars
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full ${
                    budgetPercentage > 80 ? 'bg-red-500' : 
                    budgetPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Ratio Résumés</div>
                  <div className="text-white font-medium">
                    {Math.round(stats.budget.summaryRatio * 100)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Compression Moyenne</div>
                  <div className="text-white font-medium">
                    {memoryItems
                      .filter(item => item.type === 'summary')
                      .reduce((acc, item) => acc + (item.metadata?.compressionRatio || 0), 0) / 
                      Math.max(memoryItems.filter(item => item.type === 'summary').length, 1) * 100
                    }%
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Status</div>
                  <div className={`font-medium ${
                    budgetPercentage > 80 ? 'text-red-400' : 
                    budgetPercentage > 60 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {budgetPercentage > 80 ? '⚠️ Compression Active' : 
                     budgetPercentage > 60 ? '⚡ Approche Limite' : '✅ OK'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres et liste des items */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">🗂️ Items en Mémoire</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}
              >
                Tous ({memoryItems.length})
              </button>
              <button
                onClick={() => setFilter('raw')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}
              >
                Bruts ({stats?.rawMessages || 0})
              </button>
              <button
                onClick={() => setFilter('summary')}
                className={`px-3 py-1 rounded text-sm ${
                  filter === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}
              >
                Résumés ({stats?.summaries || 0})
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                {loading ? 'Chargement...' : 'Aucun item trouvé'}
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    item.type === 'raw' 
                      ? 'bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/20'
                      : 'bg-purple-600/10 border-purple-500/30 hover:bg-purple-600/20'
                  }`}
                  onClick={() => item.type === 'summary' && setSelectedSummary(item)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.type === 'raw' 
                            ? 'bg-blue-500/30 text-blue-300'
                            : `bg-purple-500/30 text-purple-300`
                        }`}>
                          {item.type === 'raw' ? 'RAW' : `L${item.level}`}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                        {item.metadata?.compressionRatio && (
                          <span className="text-green-400 text-sm">
                            {(item.metadata.compressionRatio * 100).toFixed(1)}% comp.
                          </span>
                        )}
                      </div>
                      <div className="text-gray-200 mb-2">
                        {item.content.length > 200 
                          ? `${item.content.substring(0, 200)}...`
                          : item.content
                        }
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>{item.characterCount} caractères</span>
                        {item.topics && item.topics.length > 0 && (
                          <span>Topics: {item.topics.join(', ')}</span>
                        )}
                        {item.covers && (
                          <span>{item.covers.length} messages couverts</span>
                        )}
                      </div>
                    </div>
                    {item.type === 'summary' && (
                      <button className="text-purple-400 hover:text-purple-300 ml-4">
                        👁️ Voir
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de preview du résumé */}
      {selectedSummary && (
        <SummaryPreview
          summary={selectedSummary}
          onClose={() => setSelectedSummary(null)}
        />
      )}
    </div>
  );
}