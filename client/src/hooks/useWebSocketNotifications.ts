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

const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY = 2000;

/**
 * Hook para conectar ao WebSocket e receber notificações em tempo real.
 * Silencia erros após MAX_RECONNECT_ATTEMPTS tentativas para evitar
 * spam no console quando o ambiente não suporta WebSocket.
 */
export function useWebSocketNotifications() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);

  const { addNotification } = useNotification() as any;
  const { user } = useAuth();

  // Obter URL do WebSocket
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }, []);

  // Manipular mensagem do WebSocket (declarado antes de connect)
  const handleWebSocketMessage = useCallback(
    (message: WebSocketNotification) => {
      if (message.type === 'notification' && message.notification) {
        const notif = message.notification;
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
      }
    },
    [addNotification]
  );

  // Conectar ao WebSocket
  const connect = useCallback(() => {
    // Não tentar se já passou do limite de tentativas
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const url = getWebSocketUrl();
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        if (user) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel: `user:${user.id}`,
            userId: user.id,
            userRole: user.role,
          }));
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel: 'broadcast',
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketNotification = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (e) {
          // Silenciar erros de parse
        }
      };

      ws.onerror = () => {
        // Silenciar erros de conexão para não poluir o console
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Tentar reconectar com backoff exponencial até o limite
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
        // Após MAX_RECONNECT_ATTEMPTS, para silenciosamente
      };

      wsRef.current = ws;
    } catch (e) {
      // Silenciar erros de conexão
    }
  }, [user, getWebSocketUrl, handleWebSocketMessage]);

  // Enviar mensagem
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
    // Silenciar falhas quando WebSocket não está disponível
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
    reconnectAttempts: reconnectAttemptsRef.current,
    send,
    disconnect,
    reconnect: connect,
  };
}
