import { useEffect, useRef, useCallback, useState } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/_core/hooks/useAuth';

interface WebSocketNotification {
  type: string;
  notification?: any;
  data?: any;
  timestamp?: string;
  channel?: string;
}

/**
 * Hook para conectar ao WebSocket e receber notificações em tempo real
 */
export function useWebSocketNotifications() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const { addNotification } = useNotification() as any;
  const { user } = useAuth();

  // Obter URL do WebSocket
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }, []);

  // Conectar ao WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const url = getWebSocketUrl();
      console.log('[WebSocket] Conectando a:', url);

      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Conectado');
        setIsConnected(true);
        setReconnectAttempts(0);

        // Inscrever nos canais apropriados
        if (user) {
          const message = {
            type: 'subscribe',
            channel: `user:${user.id}`,
            userId: user.id,
            userRole: user.role,
          };
          ws.send(JSON.stringify(message));

          // Inscrever em canal de broadcast
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channel: 'broadcast',
            })
          );

          console.log(`[WebSocket] Inscrito em canais: user:${user.id}, broadcast`);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketNotification = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (e) {
          console.error('[WebSocket] Erro ao parsear mensagem:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Erro:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Desconectado');
        setIsConnected(false);
        attemptReconnect();
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('[WebSocket] Erro ao conectar:', e);
      attemptReconnect();
    }
  }, [user, getWebSocketUrl]);

  // Manipular mensagem do WebSocket
  const handleWebSocketMessage = useCallback(
    (message: WebSocketNotification) => {
      if (message.type === 'notification' && message.notification) {
        const notif = message.notification;

        // Adicionar notificação ao contexto
        addNotification({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          data: notif.data,
          timestamp: new Date(notif.timestamp),
          read: false,
          sound: notif.sound,
          icon: notif.icon,
        });

        console.log('[WebSocket] Notificação recebida:', notif.title);
      } else if (message.type === 'pong') {
        // Responder ao heartbeat
        console.log('[WebSocket] Pong recebido');
      }
    },
    [addNotification]
  );

  // Tentar reconectar
  const attemptReconnect = useCallback(() => {
    setReconnectAttempts((prev) => {
      const attempts = prev + 1;
      const delay = Math.min(1000 * Math.pow(2, attempts - 1), 30000); // Backoff exponencial

      console.log(`[WebSocket] Tentando reconectar em ${delay}ms (tentativa ${attempts})`);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);

      return attempts;
    });
  }, [connect]);

  // Enviar mensagem
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] WebSocket não está conectado');
    }
  }, []);

  // Desconectar
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Conectar ao montar
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    reconnectAttempts,
    send,
    disconnect,
    reconnect: connect,
  };
}
