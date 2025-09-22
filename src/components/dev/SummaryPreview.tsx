'use client';

import { useState } from 'react';

interface SummaryPreviewProps {
  summary: {
    id: string;
    content: string;
    level: number;
    characterCount: number;
    topics?: string[];
    covers?: string[];
    timestamp: string;
    metadata?: {
      originalMessageCount?: number;
      compressionRatio?: number;
      qualityScore?: number;
    };
  };
  onClose: () => void;
}

export function SummaryPreview({ summary, onClose }: SummaryPreviewProps) {
  const [showFullContent, setShowFullContent] = useState(false);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-purple-500/20 border-purple-400/50 text-purple-300';
      case 2: return 'bg-orange-500/20 border-orange-400/50 text-orange-300';
      case 3: return 'bg-red-500/20 border-red-400/50 text-red-300';
      default: return 'bg-gray-500/20 border-gray-400/50 text-gray-300';
    }
  };

  const getLevelIcon = (level: number) => {
    switch (level) {
      case 1: return '🧠';
      case 2: return '🔮';
      case 3: return '🌟';
      default: return '📝';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getLevelIcon(summary.level)}</span>
            <div>
              <h3 className="text-lg font-medium text-white">
                Résumé L{summary.level}
              </h3>
              <p className="text-sm text-gray-400">
                {summary.id} • {new Date(summary.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          
          {/* Métadonnées */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-500/20 p-3 rounded">
              <div className="text-blue-300 text-sm font-medium">Messages Originaux</div>
              <div className="text-white text-lg">
                {summary.metadata?.originalMessageCount || 'N/A'}
              </div>
            </div>
            <div className="bg-green-500/20 p-3 rounded">
              <div className="text-green-300 text-sm font-medium">Compression</div>
              <div className="text-white text-lg">
                {summary.metadata?.compressionRatio ? 
                  `${(summary.metadata.compressionRatio * 100).toFixed(1)}%` : 'N/A'}
              </div>
            </div>
            <div className="bg-purple-500/20 p-3 rounded">
              <div className="text-purple-300 text-sm font-medium">Qualité</div>
              <div className="text-white text-lg">
                {summary.metadata?.qualityScore ? 
                  `${(summary.metadata.qualityScore * 100).toFixed(0)}%` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Topics */}
          {summary.topics && summary.topics.length > 0 && (
            <div>
              <div className="text-gray-300 font-medium mb-2">🏷️ Topics</div>
              <div className="flex flex-wrap gap-2">
                {summary.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages couverts */}
          {summary.covers && summary.covers.length > 0 && (
            <div>
              <div className="text-gray-300 font-medium mb-2">📋 Messages Couverts</div>
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-gray-400 text-sm">
                  {summary.covers.length} messages résumés
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  IDs: {summary.covers.join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Contenu du résumé */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-300 font-medium">📝 Contenu du Résumé</div>
              <button
                onClick={() => setShowFullContent(!showFullContent)}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                {showFullContent ? 'Réduire' : 'Voir tout'}
              </button>
            </div>
            <div className={`bg-gray-800 p-4 rounded border-l-4 ${getLevelColor(summary.level)}`}>
              <div className={`text-gray-200 leading-relaxed ${
                !showFullContent && summary.content.length > 200 ? 'line-clamp-4' : ''
              }`}>
                {summary.content}
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {summary.characterCount} caractères
              </div>
            </div>
          </div>

          {/* Analyse du contenu */}
          <div>
            <div className="text-gray-300 font-medium mb-2">🔍 Analyse</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-gray-400 text-sm">Mentions "Lucie"</div>
                <div className="text-white">
                  {summary.content.toLowerCase().includes('lucie') ? '✅ Oui' : '❌ Non'}
                </div>
              </div>
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-gray-400 text-sm">Mentions "Algareth"</div>
                <div className="text-white">
                  {summary.content.toLowerCase().includes('algareth') ? '✅ Oui' : '❌ Non'}
                </div>
              </div>
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-gray-400 text-sm">Style Narratif</div>
                <div className="text-white">
                  {summary.content.includes('je') || summary.content.includes('j\'') ? '✅ Oui' : '❌ Non'}
                </div>
              </div>
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-gray-400 text-sm">Longueur Optimale</div>
                <div className="text-white">
                  {summary.characterCount >= 50 && summary.characterCount <= 200 ? '✅ Oui' : '⚠️ Non'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-400">
              Généré le {new Date(summary.timestamp).toLocaleString()}
            </div>
            <button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}