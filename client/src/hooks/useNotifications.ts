import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export type NotificationType = 'new_order' | 'order_accepted' | 'order_delivered' | 'new_delivery' | 'delivery_completed' | 'alert' | 'success' | 'error';

interface NotificationOptions {
  title: string;
  body?: string;
  type?: NotificationType;
  sound?: boolean;
  vibrate?: boolean;
}

// Gerar sons usando Web Audio API
function generateNotificationSound(type: NotificationType): AudioBuffer | null {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const createTone = (frequency: number, duration: number, volume: number = 0.3) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.frequency.value = frequency;
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + duration);
    };

    const now = audioContext.currentTime;
    
    switch (type) {
      case 'new_order':
        // Som de novo pedido: dois bips altos
        createTone(800, 0.2, 0.4);
        createTone(1000, 0.2, 0.4);
        break;
      case 'order_accepted':
        // Som de aceitação: três bips crescentes
        createTone(600, 0.15, 0.3);
        createTone(800, 0.15, 0.3);
        createTone(1000, 0.15, 0.3);
        break;
      case 'new_delivery':
        // Som de nova entrega: bip duplo
        createTone(900, 0.25, 0.4);
        createTone(900, 0.25, 0.4);
        break;
      case 'delivery_completed':
        // Som de entrega completa: melodia ascendente
        createTone(523, 0.15, 0.3); // C
        createTone(659, 0.15, 0.3); // E
        createTone(784, 0.15, 0.3); // G
        break;
      case 'alert':
        // Som de alerta: bip contínuo
        createTone(1200, 0.3, 0.4);
        break;
      case 'success':
        // Som de sucesso: dois bips suaves
        createTone(700, 0.1, 0.3);
        createTone(900, 0.1, 0.3);
        break;
      case 'error':
        // Som de erro: bip baixo
        createTone(300, 0.3, 0.4);
        break;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao gerar som:', error);
    return null;
  }
}

export function useNotifications() {
  const permissionAsked = useRef(false);

  // Solicitar permissão de notificação na primeira vez
  useEffect(() => {
    if (typeof window === 'undefined' || permissionAsked.current) return;
    
    if ('Notification' in window && Notification.permission === 'default') {
      permissionAsked.current = true;
      // Mostrar banner pedindo permissão
      setTimeout(() => {
        toast.info('Ative notificações para receber alertas em tempo real', {
          action: {
            label: 'Ativar',
            onClick: () => {
              Notification.requestPermission();
            },
          },
          duration: 8000,
        });
      }, 1000);
    }
  }, []);

  const notify = useCallback((options: NotificationOptions) => {
    const { title, body, type = 'alert', sound = true, vibrate = true } = options;

    // Tocar som
    if (sound && type) {
      try {
        generateNotificationSound(type);
      } catch (error) {
        console.error('Erro ao tocar som:', error);
      }
    }

    // Vibração
    if (vibrate && navigator.vibrate) {
      const pattern = type === 'error' ? [100, 50, 100] : [200];
      navigator.vibrate(pattern);
    }

    // Notificação visual (sonner toast)
    const toastType = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
    toast[toastType](title, { description: body, duration: 5000 });

    // Notificação do navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: body || '',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: type, // Agrupa notificações do mesmo tipo
          requireInteraction: type === 'new_order' || type === 'new_delivery', // Mantém visível
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-fechar após 10 segundos se não for crítica
        if (type !== 'new_order' && type !== 'new_delivery') {
          setTimeout(() => notification.close(), 10000);
        }
      } catch (error) {
        console.error('Erro ao criar notificação:', error);
      }
    }
  }, []);

  return { notify };
}
