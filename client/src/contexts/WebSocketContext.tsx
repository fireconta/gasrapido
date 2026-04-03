import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  send: (message: WebSocketMessage) => void;
  subscribe: (messageType: string, callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [listeners, setListeners] = useState<
    Map<string, Set<(data: any) => void>>
  >(new Map());

  const { isConnected, isConnecting, send: wsSend } = useWebSocket({
    onMessage: (message) => {
      const callbacks = listeners.get(message.type);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(message.data);
          } catch (error) {
            console.error(`Erro ao executar callback para ${message.type}:`, error);
          }
        });
      }
    },
  });

  const send = (message: WebSocketMessage) => {
    wsSend(message);
  };

  const subscribe = (messageType: string, callback: (data: any) => void) => {
    setListeners((prev) => {
      const newListeners = new Map(prev);
      const callbacks = newListeners.get(messageType) || new Set();
      callbacks.add(callback);
      newListeners.set(messageType, callbacks);
      return newListeners;
    });

    // Retornar função de unsubscribe
    return () => {
      setListeners((prev) => {
        const newListeners = new Map(prev);
        const callbacks = newListeners.get(messageType);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            newListeners.delete(messageType);
          } else {
            newListeners.set(messageType, callbacks);
          }
        }
        return newListeners;
      });
    };
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, isConnecting, send, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext deve ser usado dentro de WebSocketProvider');
  }
  return context;
};
