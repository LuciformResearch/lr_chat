'use client';

import { useClientOnly } from '@/lib/hooks/useClientOnly';

interface MemoryStatusProps {
  userMemory: {
    loaded: boolean;
    conversationCount: number;
    summaryCount: number;
    lastConversation: string | null;
    metaSummary: string | null;
  };
  hierarchicalMemory?: {
    enabled: boolean;
    stats: {
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
    } | null;
  };
  className?: string;
}

export function MemoryStatus({ userMemory, hierarchicalMemory, className = '' }: MemoryStatusProps) {
  const isClient = useClientOnly();

  if (!isClient) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
        <span className="text-xs text-gray-400">Chargement...</span>
      </div>
    );
  }

  if (!userMemory.loaded) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
        <span className="text-xs text-gray-400">Mémoire non chargée</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (userMemory.conversationCount === 0) return 'bg-blue-400';
    if (userMemory.conversationCount < 5) return 'bg-yellow-400';
    if (userMemory.conversationCount < 20) return 'bg-green-400';
    return 'bg-purple-400';
  };

  const getStatusText = () => {
    if (userMemory.conversationCount === 0) return 'Nouveau';
    if (userMemory.conversationCount < 5) return 'Apprentissage';
    if (userMemory.conversationCount < 20) return 'Expérimenté';
    return 'Expert';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
      <span className="text-xs text-gray-300">
        {getStatusText()} ({userMemory.conversationCount} conv.)
      </span>
      {userMemory.summaryCount > 0 && (
        <span className="text-xs text-blue-300">
          📝 {userMemory.summaryCount}
        </span>
      )}
      {hierarchicalMemory?.enabled && hierarchicalMemory.stats && (
        <div className="flex items-center space-x-1">
          <span className="text-xs text-purple-300">🧠</span>
          <span className="text-xs text-purple-300">
            {hierarchicalMemory.stats.l1Count}L1
          </span>
          <span className="text-xs text-gray-400">
            ({Math.round((hierarchicalMemory.stats.budget.currentCharacters / hierarchicalMemory.stats.budget.maxCharacters) * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
}