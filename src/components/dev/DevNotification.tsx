'use client';

import { useState, useEffect } from 'react';

export interface DevNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number; // en ms, 0 = permanent
}

interface DevNotificationProps {
  notifications: DevNotification[];
  onRemove: (id: string) => void;
  className?: string;
}

export function DevNotification({ notifications, onRemove, className = '' }: DevNotificationProps) {
  // Auto-remove notifications after their duration
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          onRemove(notification.id);
        }, notification.duration);
        
        return () => clearTimeout(timer);
      }
    });
  }, [notifications, onRemove]);

  if (notifications.length === 0) return null;

  const getTypeStyles = (type: DevNotification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 border-green-400/50 text-green-300';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300';
      case 'error':
        return 'bg-red-500/20 border-red-400/50 text-red-300';
      default:
        return 'bg-blue-500/20 border-blue-400/50 text-blue-300';
    }
  };

  const getTypeIcon = (type: DevNotification['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 max-w-sm ${className}`}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-3 rounded-lg border backdrop-blur-sm ${getTypeStyles(notification.type)} animate-in slide-in-from-right-5 duration-300`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <span className="text-sm">{getTypeIcon(notification.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{notification.title}</div>
                <div className="text-xs opacity-80 mt-1">{notification.message}</div>
                <div className="text-xs opacity-60 mt-1">
                  {notification.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="ml-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Hook pour gérer les notifications
export function useDevNotifications() {
  const [notifications, setNotifications] = useState<DevNotification[]>([]);

  const addNotification = (notification: Omit<DevNotification, 'id' | 'timestamp'>) => {
    const newNotification: DevNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      duration: notification.duration ?? 5000 // 5 secondes par défaut
    };

    setNotifications(prev => [...prev, newNotification]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  };
}