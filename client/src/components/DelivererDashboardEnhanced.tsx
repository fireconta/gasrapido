import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MapPin, Navigation, Clock, DollarSign, CheckCircle, AlertCircle,
  TrendingUp, Users, Package, Zap, Phone, MessageCircle
} from 'lucide-react';
import { DiscountApplier } from './DiscountApplier';

interface DeliveryOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  neighborhood: string;
  total: number;
  paymentMethod: string;
  status: string;
  discount?: number;
}

interface DelivererDashboardEnhancedProps {
  orders: DeliveryOrder[];
  delivererStats: {
    totalDeliveries: number;
    totalEarnings: number;
    averageRating: number;
    onlineStatus: boolean;
  };
  onApplyDiscount?: (orderId: number, discount: number) => void;
  onStartDelivery?: (orderId: number) => void;
  onCompleteDelivery?: (orderId: number) => void;
}

/**
 * Dashboard melhorado para entregadores
 * Inclui: mapa, estatísticas, gerenciamento de desconto, contato com cliente
 */
export const DelivererDashboardEnhanced: React.FC<DelivererDashboardEnhancedProps> = ({
  orders,
  delivererStats,
  onApplyDiscount,
  onStartDelivery,
  onCompleteDelivery,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar pedidos
  const filteredOrders = orders.filter((order) => {
    const matchStatus = filterStatus === 'todos' || order.status === filterStatus;
    const matchSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aguardando_entregador':
        return 'bg-blue-100 text-blue-700';
      case 'saiu_entrega':
        return 'bg-purple-100 text-purple-700';
      case 'entregue':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas do Entregador */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Entregas Hoje</p>
                <p className="text-2xl font-bold">{delivererStats.totalDeliveries}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ganhos</p>
                <p className="text-2xl font-bold">R$ {delivererStats.totalEarnings.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avaliação</p>
                <p className="text-2xl font-bold">{delivererStats.averageRating.toFixed(1)} ⭐</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={delivererStats.onlineStatus ? 'bg-green-500' : 'bg-red-500'}>
                  {delivererStats.onlineStatus ? '🟢 Online' : '🔴 Offline'}
                </Badge>
              </div>
              <Zap className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Buscar Pedido</Label>
              <Input
                placeholder="Nome, endereço ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['todos', 'aguardando_entregador', 'saiu_entrega', 'entregue'].map((status) => (
                <Button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {status === 'todos'
                    ? 'Todos'
                    : status === 'aguardando_entregador'
                      ? 'Aguardando'
                      : status === 'saiu_entrega'
                        ? 'Em Entrega'
                        : 'Entregues'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pedidos */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card
              key={order.id}
              className={`cursor-pointer transition-all ${
                selectedOrder?.id === order.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{order.customerName}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {order.deliveryAddress}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status === 'aguardando_entregador'
                        ? 'Aguardando'
                        : order.status === 'saiu_entrega'
                          ? 'Em Entrega'
                          : 'Entregue'}
                    </Badge>
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Telefone</p>
                      <p className="font-semibold">{order.customerPhone}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-semibold text-green-600">R$ {order.total.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Ações */}
                  {selectedOrder?.id === order.id && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      {/* Contato */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${order.customerPhone}`);
                          }}
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Ligar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/55${order.customerPhone.replace(/\D/g, '')}`);
                          }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </Button>
                      </div>

                      {/* Desconto */}
                      {order.status === 'saiu_entrega' && (
                        <DiscountApplier
                          subtotal={order.total}
                          currentDiscount={order.discount || 0}
                          paymentMethod={order.paymentMethod}
                          onApplyDiscount={(discount) => {
                            onApplyDiscount?.(order.id, discount);
                          }}
                        />
                      )}

                      {/* Ações de Status */}
                      <div className="flex gap-2">
                        {order.status === 'aguardando_entregador' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartDelivery?.(order.id);
                            }}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-1 text-xs"
                            size="sm"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Iniciar Entrega
                          </Button>
                        )}
                        {order.status === 'saiu_entrega' && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCompleteDelivery?.(order.id);
                            }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1 text-xs"
                            size="sm"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Marcar Entregue
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
