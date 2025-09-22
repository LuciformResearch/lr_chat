'use client';

import { useState, useEffect } from 'react';
import { mcpServer } from '@/mcp';

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

interface EventLog {
  id: string;
  type: 'message_added' | 'l1_triggered' | 'l1_created' | 'budget_warning' | 'compression';
  timestamp: Date;
  data: any;
  message: string;
}

export function HierarchicalMemoryDashboard({ user, className = '' }: { user: string; className?: string }) {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  // Charger les données
  const loadData = async () => {
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
        
        // Trouver le dernier résumé
        const summaries = (result.result.data.memoryItems || [])
          .filter((item: MemoryItem) => item.type === 'summary')
          .sort((a: MemoryItem, b: MemoryItem) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        
        if (summaries.length > 0) {
          setLastSummary(summaries[0].content);
        }
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && isExpanded) {
      const interval = setInterval(loadData, 2000); // Refresh toutes les 2 secondes
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isExpanded, user]);

  // Charger au montage et quand l'utilisateur change
  useEffect(() => {
    loadData();
  }, [user]);

  // Simuler des événements (en attendant l'intégration réelle)
  useEffect(() => {
    if (stats && stats.l1Count > 0) {
      const newEvent: EventLog = {
        id: `event_${Date.now()}`,
        type: 'l1_created',
        timestamp: new Date(),
        data: { l1Count: stats.l1Count },
        message: `Résumé L1 créé (${stats.l1Count} total)`
      };
      
      setEventLogs(prev => [newEvent, ...prev.slice(0, 9)]); // Garder les 10 derniers
    }
  }, [stats?.l1Count]);

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
      {/* Header avec toggle */}
      <div 
        className="flex items-center space-x-2 cursor-pointer hover:bg-white/5 px-2 py-1 rounded"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-purple-300">🧠</span>
        <span className="text-gray-300">
          Dashboard Mémoire ({stats.totalItems} items)
        </span>
        <span className={budgetColor}>
          {budgetPercentage}%
        </span>
        <span className="text-gray-400">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div className="mt-2 p-4 bg-black/30 rounded-lg space-y-4 max-h-96 overflow-y-auto">
          
          {/* Statistiques principales */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/20 p-2 rounded">
              <div className="text-blue-300 font-medium">Messages Bruts</div>
              <div className="text-white text-lg">{stats.rawMessages}</div>
            </div>
            <div className="bg-purple-500/20 p-2 rounded">
              <div className="text-purple-300 font-medium">Résumés L1</div>
              <div className="text-white text-lg">{stats.l1Count}</div>
            </div>
            <div className="bg-green-500/20 p-2 rounded">
              <div className="text-green-300 font-medium">Total Items</div>
              <div className="text-white text-lg">{stats.totalItems}</div>
            </div>
            <div className="bg-orange-500/20 p-2 rounded">
              <div className="text-orange-300 font-medium">Ratio Résumés</div>
              <div className="text-white text-lg">{Math.round(stats.budget.summaryRatio * 100)}%</div>
            </div>
          </div>

          {/* Budget mémoire */}
          <div className="bg-gray-800/50 p-3 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300 font-medium">Budget Mémoire</span>
              <span className={budgetColor}>
                {stats.budget.currentCharacters}/{stats.budget.maxCharacters} chars
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${
                  budgetPercentage > 80 ? 'bg-red-500' : 
                  budgetPercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {budgetPercentage > 80 ? '⚠️ Compression active' : 
               budgetPercentage > 60 ? '⚡ Approche limite' : '✅ Budget OK'}
            </div>
          </div>

          {/* Dernier résumé généré */}
          {lastSummary && (
            <div className="bg-purple-800/30 p-3 rounded border border-purple-500/30">
              <div className="text-purple-300 font-medium mb-2">📝 Dernier Résumé L1</div>
              <div className="text-gray-200 text-xs leading-relaxed">
                {lastSummary}
              </div>
              <div className="text-xs text-purple-400 mt-2">
                {lastSummary.length} caractères
              </div>
            </div>
          )}

          {/* Log des événements */}
          <div className="bg-gray-800/50 p-3 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300 font-medium">📋 Événements Récents</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-xs px-2 py-1 rounded ${
                  autoRefresh ? 'bg-green-600/30 text-green-300' : 'bg-gray-600/30 text-gray-300'
                }`}
              >
                {autoRefresh ? 'Auto ON' : 'Auto OFF'}
              </button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {eventLogs.length === 0 ? (
                <div className="text-gray-400 text-xs">Aucun événement récent</div>
              ) : (
                eventLogs.map((event) => (
                  <div key={event.id} className="flex items-start space-x-2 text-xs">
                    <span className={`px-1 rounded text-xs ${
                      event.type === 'l1_created' ? 'bg-green-500/30 text-green-300' :
                      event.type === 'l1_triggered' ? 'bg-blue-500/30 text-blue-300' :
                      event.type === 'budget_warning' ? 'bg-yellow-500/30 text-yellow-300' :
                      'bg-gray-500/30 text-gray-300'
                    }`}>
                      {event.type === 'l1_created' ? '🧠' :
                       event.type === 'l1_triggered' ? '⚡' :
                       event.type === 'budget_warning' ? '⚠️' : '📝'}
                    </span>
                    <div className="flex-1">
                      <div className="text-gray-200">{event.message}</div>
                      <div className="text-gray-400">
                        {event.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Liste des items en mémoire */}
          <div className="bg-gray-800/50 p-3 rounded">
            <div className="text-gray-300 font-medium mb-2">🗂️ Items en Mémoire</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {memoryItems.slice(-10).reverse().map((item, index) => (
                <div key={item.id} className="flex items-start space-x-2 text-xs">
                  <span className={`px-1 rounded text-xs ${
                    item.type === 'raw' ? 'bg-blue-500/30 text-blue-300' : 
                    item.level === 1 ? 'bg-purple-500/30 text-purple-300' :
                    'bg-orange-500/30 text-orange-300'
                  }`}>
                    {item.type === 'raw' ? 'RAW' : `L${item.level}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-200 truncate">
                      {item.content.substring(0, 50)}...
                    </div>
                    <div className="text-gray-400">
                      {item.characterCount}c • {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={loadData}
              className="flex-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 px-3 py-2 rounded text-xs transition-colors"
            >
              🔄 Actualiser
            </button>
            <button
              onClick={() => setEventLogs([])}
              className="flex-1 bg-gray-600/30 hover:bg-gray-600/50 text-gray-300 px-3 py-2 rounded text-xs transition-colors"
            >
              🧹 Vider Logs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}