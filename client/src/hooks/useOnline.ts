import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UseOnlineOptions {
  showNotification?: boolean;
  checkInterval?: number; // em ms
}

/**
 * Hook para detectar status de conexão online/offline
 */
export function useOnline(options?: UseOnlineOptions) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const showNotification = options?.showNotification ?? true;
  const checkInterval = options?.checkInterval ?? 5000;

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline && showNotification) {
        toast.success('Conexão restaurada!');
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      if (showNotification) {
        toast.error('Sem conexão com a internet');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar conexão periodicamente
    const interval = setInterval(() => {
      fetch(new Request('https://www.google.com', { method: 'HEAD', mode: 'no-cors' }))
        .then(() => {
          if (!isOnline) {
            handleOnline();
          }
        })
        .catch(() => {
          if (isOnline) {
            handleOffline();
          }
        });
    }, checkInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline, wasOffline, showNotification, checkInterval]);

  return { isOnline, wasOffline };
}

/**
 * Hook para sincronizar dados quando voltar online
 */
export function useOfflineSync<T>(
  key: string,
  syncFn: (data: T) => Promise<void>
) {
  const { isOnline } = useOnline();
  const [pendingData, setPendingData] = useState<T | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sincronizar quando voltar online
  useEffect(() => {
    if (isOnline && pendingData) {
      sync();
    }
  }, [isOnline]);

  const sync = useCallback(async () => {
    if (!pendingData) return;

    setIsSyncing(true);
    try {
      await syncFn(pendingData);
      setPendingData(null);
      toast.success('Dados sincronizados!');
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar dados');
    } finally {
      setIsSyncing(false);
    }
  }, [pendingData, syncFn]);

  const addPendingData = useCallback((data: T) => {
    setPendingData(data);
    if (isOnline) {
      sync();
    } else {
      toast.info('Dados serão sincronizados quando voltar online');
    }
  }, [isOnline, sync]);

  return { pendingData, isSyncing, addPendingData, sync };
}
