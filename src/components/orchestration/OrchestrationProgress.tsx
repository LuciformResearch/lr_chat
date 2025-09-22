'use client';

import { useState, useEffect } from 'react';
import { LoadingState, OrchestrationPhase, createLoadingState, getPhaseConfig } from '@/types/orchestration';

interface OrchestrationProgressProps {
  isActive: boolean;
  currentPhase: OrchestrationPhase;
  progress: number;
  details?: string;
  currentMessage?: string;
  isRotating?: boolean;
  phaseDuration?: number;
  estimatedRemainingTime?: number;
  className?: string;
}

export function OrchestrationProgress({
  isActive,
  currentPhase,
  progress,
  details,
  currentMessage,
  isRotating = false,
  phaseDuration = 0,
  estimatedRemainingTime = 0,
  className = ''
}: OrchestrationProgressProps) {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  const currentState = createLoadingState(currentPhase, progress, details);
  const phaseConfig = getPhaseConfig(currentPhase);

  // Animation de la barre de progression
  useEffect(() => {
    if (!isActive) {
      setAnimationProgress(0);
      return;
    }

    const targetProgress = progress;
    const startProgress = animationProgress;
    const duration = 500; // Animation de 500ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      // Easing function pour une animation fluide
      const easeOutCubic = 1 - Math.pow(1 - progressRatio, 3);
      const currentProgress = startProgress + (targetProgress - startProgress) * easeOutCubic;
      
      setAnimationProgress(currentProgress);

      if (progressRatio < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [progress, isActive]);

  // Animation de pulsation pour l'icône
  useEffect(() => {
    if (!isActive) {
      setPulseAnimation(false);
      return;
    }

    setPulseAnimation(true);
    const timer = setTimeout(() => setPulseAnimation(false), 2000);
    return () => clearTimeout(timer);
  }, [currentPhase, isActive]);

  if (!isActive) {
    return null;
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      purple: {
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/30',
        text: 'text-purple-300',
        icon: 'text-purple-400',
        progress: 'bg-purple-500'
      },
      blue: {
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        text: 'text-blue-300',
        icon: 'text-blue-400',
        progress: 'bg-blue-500'
      },
      green: {
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        text: 'text-green-300',
        icon: 'text-green-400',
        progress: 'bg-green-500'
      },
      gray: {
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/30',
        text: 'text-gray-300',
        icon: 'text-gray-400',
        progress: 'bg-gray-500'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.purple;
  };

  const colors = getColorClasses(currentState.color);

  return (
    <div className={`orchestration-progress ${className}`}>
      <div className={`p-4 rounded-lg backdrop-blur-sm border ${colors.bg} ${colors.border}`}>
        {/* Header avec icône et phase */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="relative">
            <span className={`text-2xl ${colors.icon} ${pulseAnimation ? 'animate-pulse' : ''}`}>
              {currentState.icon}
            </span>
            {pulseAnimation && (
              <div className={`absolute -top-1 -right-1 w-3 h-3 ${colors.progress} rounded-full animate-ping`}></div>
            )}
          </div>
          
          <div className="flex-1">
            <div className={`text-sm font-medium ${colors.text}`}>
              {currentMessage || currentState.message}
            </div>
            {details && (
              <div className={`text-xs ${colors.text} opacity-80 mt-1`}>
                {details}
              </div>
            )}
            {isRotating && (
              <div className={`text-xs ${colors.text} opacity-60 mt-1 flex items-center gap-1`}>
                <span className="animate-pulse">🔄</span>
                <span>Messages dynamiques</span>
              </div>
            )}
          </div>

          <div className={`text-xs ${colors.text} opacity-70 flex flex-col items-end`}>
            <div>{Math.round(animationProgress)}%</div>
            {estimatedRemainingTime > 0 && (
              <div className="text-xs opacity-50">
                ~{Math.round(estimatedRemainingTime / 1000)}s
              </div>
            )}
          </div>
        </div>

        {/* Barre de progression */}
        <div className="relative">
          <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full ${colors.progress} transition-all duration-500 ease-out rounded-full`}
              style={{ width: `${animationProgress}%` }}
            />
          </div>
          
          {/* Indicateurs de phases */}
          <div className="flex justify-between mt-2">
            {['orchestrator', 'archivist', 'generating'].map((phase) => {
              const config = getPhaseConfig(phase as OrchestrationPhase);
              const isActive = currentPhase === phase;
              const isCompleted = ['orchestrator', 'archivist', 'generating'].indexOf(currentPhase) > 
                                 ['orchestrator', 'archivist', 'generating'].indexOf(phase);
              
              return (
                <div key={phase} className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mb-1 ${
                    isActive 
                      ? `${colors.progress}` 
                      : isCompleted 
                        ? 'bg-green-500' 
                        : 'bg-gray-600/50'
                  }`} />
                  <span className={`text-xs ${
                    isActive 
                      ? colors.text 
                      : isCompleted 
                        ? 'text-green-400' 
                        : 'text-gray-500'
                  }`}>
                    {config.icon}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Animation de fond mystique */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
          <div className={`absolute top-0 left-0 w-full h-full ${
            colors.bg.replace('/20', '/5')
          } animate-pulse`} />
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 ${
            colors.progress.replace('500', '400').replace('bg-', 'bg-') + '/10'
          } rounded-full animate-ping`} />
        </div>
      </div>
    </div>
  );
}

/**
 * Composant simplifié pour les phases rapides
 */
export function QuickOrchestrationProgress({
  phase,
  message,
  className = ''
}: {
  phase: OrchestrationPhase;
  message: string;
  className?: string;
}) {
  const config = getPhaseConfig(phase);
  const colors = getColorClasses(config.color);

  return (
    <div className={`quick-orchestration-progress ${className}`}>
      <div className={`flex items-center space-x-2 p-3 rounded-lg backdrop-blur-sm border ${colors.bg} ${colors.border}`}>
        <span className={`text-lg ${colors.icon} animate-pulse`}>
          {config.icon}
        </span>
        <div className={`text-sm ${colors.text}`}>
          {message}
        </div>
      </div>
    </div>
  );
}

function getColorClasses(color: string) {
  const colorMap = {
    purple: {
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/30',
      text: 'text-purple-300',
      icon: 'text-purple-400',
      progress: 'bg-purple-500'
    },
    blue: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-300',
      icon: 'text-blue-400',
      progress: 'bg-blue-500'
    },
    green: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
      text: 'text-green-300',
      icon: 'text-green-400',
      progress: 'bg-green-500'
    },
    gray: {
      bg: 'bg-gray-500/20',
      border: 'border-gray-500/30',
      text: 'text-gray-300',
      icon: 'text-gray-400',
      progress: 'bg-gray-500'
    }
  };
  return colorMap[color as keyof typeof colorMap] || colorMap.purple;
}