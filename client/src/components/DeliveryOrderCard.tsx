import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  DollarSign,
  Clock,
  ChevronDown,
  ChevronUp,
  Map,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeliveryMap } from '@/components/DeliveryMap';
import { maskPhone } from '@/lib/masks';
import { formatCurrency } from '@/lib/formatters';

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

interface DeliveryOrderCardProps {
  order: {
    id: number;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    neighborhood?: string;
    notes?: string;
    subtotal: string | number;
    deliveryFee: string | number;
    total: string | number;
    paymentMethod: string;
    items?: OrderItem[];
    status?: string;
  };
  onAccept?: () => void;
  onStart?: () => void;
  onFinish?: () => void;
  isLoading?: boolean;
  showMap?: boolean;
  actionLabel?: string;
  actionVariant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: '💵 Dinheiro',
  pix: '📱 Pix',
  debito: '💳 Débito',
  credito: '💳 Crédito',
  fiado: '📝 Fiado',
};

export const DeliveryOrderCard: React.FC<DeliveryOrderCardProps> = ({
  order,
  onAccept,
  onStart,
  onFinish,
  isLoading = false,
  showMap = false,
  actionLabel = 'Aceitar Entrega',
  actionVariant = 'default',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMapView, setShowMapView] = useState(false);

  const subtotal = typeof order.subtotal === 'string' ? parseFloat(order.subtotal) : order.subtotal;
  const deliveryFee =
    typeof order.deliveryFee === 'string' ? parseFloat(order.deliveryFee) : order.deliveryFee;
  const total = typeof order.total === 'string' ? parseFloat(order.total) : order.total;

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-sm text-primary">#{order.orderNumber}</span>
                {order.status && (
                  <Badge variant="outline" className="text-xs">
                    {order.status}
                  </Badge>
                )}
              </div>
              <p className="font-semibold text-foreground text-sm">{order.customerName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-lg text-green-600">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground">{PAYMENT_LABELS[order.paymentMethod]}</p>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-muted/50 rounded-lg p-3 mb-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground break-words">
                  {order.deliveryAddress}
                </p>
                {order.neighborhood && (
                  <p className="text-xs text-muted-foreground mt-0.5">{order.neighborhood}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Phone className="w-4 h-4" />
            <a href={`tel:${order.customerPhone}`} className="text-primary hover:underline">
              {maskPhone(order.customerPhone)}
            </a>
          </div>

          {/* Expandir/Recolher */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-2 border-t border-border"
          >
            <span>{isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Detalhes Expandidos */}
          {isExpanded && (
            <div className="pt-3 space-y-3 border-t border-border">
              {/* Itens */}
              {order.items && order.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Itens</p>
                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-foreground">
                        <span>
                          {item.quantity}x {item.productName}
                        </span>
                        <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valores */}
              <div className="space-y-1 text-xs border-t border-border pt-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxa de entrega</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Observações */}
              {order.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">Observações</p>
                  <p className="text-xs text-yellow-800">{order.notes}</p>
                </div>
              )}

              {/* Mapa */}
              {showMap && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowMapView(!showMapView)}
                    className="w-full flex items-center justify-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-2"
                  >
                    <Map className="w-4 h-4" />
                    {showMapView ? 'Ocultar mapa' : 'Ver no mapa'}
                  </button>

                  {showMapView && (
                    <DeliveryMap
                      initialLocation={{
                        address: order.deliveryAddress,
                        lat: -18.5,
                        lng: -50.4,
                        neighborhood: order.neighborhood,
                      }}
                      height="h-64"
                      showSearch={false}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            {onAccept && (
              <Button
                onClick={onAccept}
                disabled={isLoading}
                className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2"
                size="sm"
              >
                <CheckCircle className="w-4 h-4" />
                {actionLabel}
              </Button>
            )}
            {onStart && (
              <Button
                onClick={onStart}
                disabled={isLoading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white gap-2"
                size="sm"
              >
                <AlertCircle className="w-4 h-4" />
                Sair para Entrega
              </Button>
            )}
            {onFinish && (
              <Button
                onClick={onFinish}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                size="sm"
              >
                <CheckCircle className="w-4 h-4" />
                Finalizar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
