import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(delivererId?: number) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Buscar chave pública VAPID do servidor
  const { data: vapidData } = trpc.pushNotifications.getVapidPublicKey.useQuery(undefined, {
    staleTime: Infinity,
  });
  const vapidPublicKey = vapidData?.publicKey ?? "";

  const subscribeMutation = trpc.pushNotifications.subscribe.useMutation();
  const unsubscribeMutation = trpc.pushNotifications.unsubscribe.useMutation();

  // Verificar suporte e registrar service worker
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      setSwRegistration(registration);

      // Verificar se já tem subscription ativa
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("[PWA] Erro ao registrar service worker:", error);
    }
  };

  const subscribe = useCallback(async () => {
    if (!swRegistration || !delivererId) {
      toast.error("Não foi possível ativar notificações. Tente novamente.");
      return;
    }
    if (!vapidPublicKey) {
      toast.error("Chave VAPID não disponível. Verifique as configurações do servidor.");
      return;
    }

    setIsLoading(true);
    try {
      // Solicitar permissão
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permissão para notificações negada. Ative nas configurações do navegador.");
        return;
      }

      // Cancelar subscription anterior se existir
      const existingSub = await swRegistration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      // Criar nova subscription
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      });

      const subscriptionJson = subscription.toJSON();
      const p256dh = subscriptionJson.keys?.p256dh;
      const auth = subscriptionJson.keys?.auth;

      if (!p256dh || !auth) {
        throw new Error("Chaves de subscription inválidas");
      }

      // Salvar no servidor
      await subscribeMutation.mutateAsync({
        delivererId,
        endpoint: subscription.endpoint,
        p256dhKey: p256dh,
        authKey: auth,
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      toast.success("✅ Notificações ativadas! Você receberá alertas de novos pedidos.");
    } catch (error: any) {
      console.error("[PWA] Erro ao ativar notificações:", error);
      toast.error("Erro ao ativar notificações: " + (error.message || "Tente novamente"));
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration, delivererId, vapidPublicKey, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    if (!swRegistration) return;

    setIsLoading(true);
    try {
      const subscription = await swRegistration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribeMutation.mutateAsync({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
        setIsSubscribed(false);
        toast.info("🔕 Notificações desativadas.");
      }
    } catch (error) {
      console.error("[PWA] Erro ao desativar notificações:", error);
    } finally {
      setIsLoading(false);
    }
  }, [swRegistration, unsubscribeMutation]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    vapidPublicKey,
  };
}
