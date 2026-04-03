import { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

export type NotificationType =
  | 'novo_pedido'
  | 'pedido_aceito'
  | 'pedido_em_entrega'
  | 'pedido_entregue'
  | 'pedido_cancelado'
  | 'novo_entregador'
  | 'entregador_online'
  | 'entregador_offline'
  | 'pagamento_recebido'
  | 'erro_entrega'
  | 'aviso_estoque'
  | 'mensagem_admin';

export interface AdvancedNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
  read: boolean;
  sound?: string;
  icon?: string;
  action?: {
    label: string;
    url: string;
  };
}

interface NotificationConfig {
  enableSound?: boolean;
  enableVibration?: boolean;
  enableBrowserNotification?: boolean;
  enablePersistence?: boolean;
  soundVolume?: number;
}

/**
 * Hook avançado para gerenciar notificações
 * Suporta: áudio, vibração, notificações do navegador, persistência
 */
export function useAdvancedNotifications(config: NotificationConfig = {}) {
  const {
    enableSound = true,
    enableVibration = true,
    enableBrowserNotification = true,
    enablePersistence = true,
    soundVolume = 0.7,
  } = config;

  const [notifications, setNotifications] = useState<AdvancedNotification[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<Map<string, OscillatorNode>>(new Map());

  // Inicializar persistência
  useEffect(() => {
    if (enablePersistence) {
      const stored = localStorage.getItem('notifications');
      if (stored) {
        try {
          setNotifications(JSON.parse(stored));
        } catch (e) {
          console.error('Erro ao carregar notificações persistidas:', e);
        }
      }
    }
  }, [enablePersistence]);

  // Persistir notificações
  useEffect(() => {
    if (enablePersistence) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications, enablePersistence]);

  // Inicializar contexto de áudio
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
      } catch (e) {
        console.warn('Web Audio API não disponível:', e);
      }
    }
    return audioContextRef.current;
  }, []);

  // Reproduzir som de notificação
  const playNotificationSound = useCallback(
    (type: NotificationType) => {
      if (!enableSound) return;

      const audioContext = initAudioContext();
      if (!audioContext) return;

      try {
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Diferentes frequências para diferentes tipos
        const frequencies: Record<NotificationType, number> = {
          novo_pedido: 800,
          pedido_aceito: 600,
          pedido_em_entrega: 700,
          pedido_entregue: 900,
          pedido_cancelado: 400,
          novo_entregador: 650,
          entregador_online: 550,
          entregador_offline: 450,
          pagamento_recebido: 1000,
          erro_entrega: 300,
          aviso_estoque: 500,
          mensagem_admin: 750,
        };

        const frequency = frequencies[type] || 600;
        oscillator.frequency.setValueAtTime(frequency, now);
        gainNode.gain.setValueAtTime(soundVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        oscillator.start(now);
        oscillator.stop(now + 0.5);

        oscillatorsRef.current.set(type, oscillator);
      } catch (e) {
        console.warn('Erro ao reproduzir som:', e);
      }
    },
    [enableSound, soundVolume, initAudioContext]
  );

  // Vibrar dispositivo
  const vibrateDevice = useCallback((pattern: number | number[] = 200) => {
    if (!enableVibration) return;

    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, [enableVibration]);

  // Mostrar notificação do navegador
  const showBrowserNotification = useCallback(
    (notification: AdvancedNotification) => {
      if (!enableBrowserNotification) return;

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(notification.title, {
            body: notification.message,
            icon: notification.icon,
            tag: notification.id,
            requireInteraction: true,
          });
        } catch (e) {
          console.warn('Erro ao mostrar notificação do navegador:', e);
        }
      }
    },
    [enableBrowserNotification]
  );

  // Solicitar permissão para notificações
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (e) {
        console.warn('Erro ao solicitar permissão:', e);
        return false;
      }
    }
    return Notification.permission === 'granted';
  }, []);

  // Adicionar notificação
  const addNotification = useCallback(
    (notification: AdvancedNotification) => {
      setNotifications((prev) => [notification, ...prev]);

      // Reproduzir som
      playNotificationSound(notification.type);

      // Vibrar
      vibrateDevice([100, 50, 100]);

      // Mostrar notificação do navegador
      showBrowserNotification(notification);

      // Mostrar toast
      toast[notification.type.includes('erro') ? 'error' : 'success'](
        notification.title,
        { description: notification.message }
      );
    },
    [playNotificationSound, vibrateDevice, showBrowserNotification]
  );

  // Marcar como lida
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Deletar notificação
  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Limpar todas
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Obter notificações não lidas
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Cleanup
  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach((osc) => {
        try {
          osc.stop();
        } catch (e) {
          // Ignorar erro se já foi parado
        }
      });
      oscillatorsRef.current.clear();
    };
  }, []);

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    unreadCount,
    requestNotificationPermission,
    playNotificationSound,
    vibrateDevice,
  };
}
