import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface NotificationWidgetProps {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  onClose?: () => void;
}

/**
 * Widget flutuante de notificação
 * Aparece no canto inferior direito da tela
 */
export const NotificationWidget: React.FC<NotificationWidgetProps> = ({
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const typeConfig = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      title: 'text-green-900',
      message: 'text-green-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />,
      title: 'text-red-900',
      message: 'text-red-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
      title: 'text-yellow-900',
      message: 'text-yellow-700',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Info className="w-5 h-5 text-blue-600" />,
      title: 'text-blue-900',
      message: 'text-blue-700',
    },
  };

  const config = typeConfig[type];

  return (
    <div className={`fixed bottom-4 right-4 max-w-sm animate-in slide-in-from-right-full duration-300 z-50`}>
      <div
        className={`${config.bg} ${config.border} border rounded-lg shadow-lg p-4 flex gap-3`}
      >
        <div className="flex-shrink-0">{config.icon}</div>
        <div className="flex-1">
          <h3 className={`font-semibold ${config.title}`}>{title}</h3>
          <p className={`text-sm ${config.message}`}>{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose?.();
          }}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

/**
 * Container para múltiplas notificações
 */
interface NotificationContainerProps {
  notifications: Array<NotificationWidgetProps & { id: string }>;
  onRemove?: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove,
}) => {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50 pointer-events-none">
      {notifications.map((notif) => (
        <div key={notif.id} className="pointer-events-auto">
          <NotificationWidget
            {...notif}
            onClose={() => onRemove?.(notif.id)}
          />
        </div>
      ))}
    </div>
  );
};
