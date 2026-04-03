import { useEffect, useRef } from 'react';
import { useNotifications } from './useNotifications';
import { trpc } from '@/lib/trpc';

interface PollingOptions {
  enabled?: boolean;
  interval?: number; // em ms
  userType?: 'admin' | 'deliverer';
}

export function usePollingNotifications(options: PollingOptions = {}) {
  const { enabled = true, interval = 5000, userType = 'admin' } = options;
  const { notify } = useNotifications();
  const lastNotificationIdRef = useRef<number>(0);

  const { data: orders } = trpc.orders.list.useQuery(
    { status: 'todos', search: '' },
    { enabled: enabled && userType === 'admin', refetchInterval: interval }
  );

  const { data: myDeliveries } = trpc.orders.list.useQuery(
    { status: 'todos', search: '' },
    { enabled: enabled && userType === 'deliverer', refetchInterval: interval }
  );

  // Monitorar novos pedidos para admin
  useEffect(() => {
    if (!enabled || userType !== 'admin' || !orders) return;

    const newOrders = orders.filter(
      (o: any) => o.id > lastNotificationIdRef.current && o.status === 'novo'
    );

    if (newOrders.length > 0) {
      newOrders.forEach((order: any) => {
        lastNotificationIdRef.current = Math.max(lastNotificationIdRef.current, order.id);
        notify({
          title: `🔔 Novo Pedido #${order.orderNumber}`,
          body: `${order.customerName} - ${order.deliveryAddress}`,
          type: 'new_order',
          sound: true,
          vibrate: true,
        });
      });
    }
  }, [orders, enabled, userType, notify]);

  // Monitorar novas entregas para entregador
  useEffect(() => {
    if (!enabled || userType !== 'deliverer' || !myDeliveries) return;

    const availableDeliveries = myDeliveries.filter(
      (d: any) => d.id > lastNotificationIdRef.current && d.status === 'aguardando_entregador'
    );

    if (availableDeliveries.length > 0) {
      availableDeliveries.forEach((delivery: any) => {
        lastNotificationIdRef.current = Math.max(lastNotificationIdRef.current, delivery.id);
        notify({
          title: `📦 Nova Entrega Disponível`,
          body: `${delivery.customerName} - ${delivery.deliveryAddress}`,
          type: 'new_delivery',
          sound: true,
          vibrate: true,
        });
      });
    }
  }, [myDeliveries, enabled, userType, notify]);

  return { orders, myDeliveries };
}
