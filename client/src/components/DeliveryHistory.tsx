import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Phone,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, formatTime } from '@/lib/formatters';
import { maskPhone } from '@/lib/masks';

interface DeliveryHistoryItem {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  neighborhood?: string;
  completedAt?: string;
  canceledAt?: string;
  total: number;
  paymentMethod: string;
  status: 'entregue' | 'cancelado';
  notes?: string;
  deliveryTime?: number; // em minutos
}

interface DeliveryHistoryProps {
  items: DeliveryHistoryItem[];
  isLoading?: boolean;
  onExport?: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: '💵 Dinheiro',
  pix: '📱 Pix',
  debito: '💳 Débito',
  credito: '💳 Crédito',
  fiado: '📝 Fiado',
};

export const DeliveryHistory: React.FC<DeliveryHistoryProps> = ({
  items,
  isLoading = false,
  onExport,
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-2xl border border-border">
        <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="font-semibold text-foreground">Nenhuma entrega no histórico</p>
        <p className="text-muted-foreground text-sm mt-1">Suas entregas aparecerão aqui</p>
      </div>
    );
  }

  const totalDeliveries = items.filter((i) => i.status === 'entregue').length;
  const totalCanceled = items.filter((i) => i.status === 'cancelado').length;
  const totalEarnings = items
    .filter((i) => i.status === 'entregue')
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Entregues</p>
            <p className="text-2xl font-bold text-green-600">{totalDeliveries}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Canceladas</p>
            <p className="text-2xl font-bold text-red-600">{totalCanceled}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Ganhos</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEarnings)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Botão de Exportação */}
      {onExport && (
        <Button
          onClick={onExport}
          variant="outline"
          size="sm"
          className="w-full gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar Histórico
        </Button>
      )}

      {/* Lista de Entregas */}
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id} className="shadow-sm">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm text-primary">#{item.orderNumber}</span>
                    <Badge
                      variant={item.status === 'entregue' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {item.status === 'entregue' ? 'Entregue' : 'Cancelada'}
                    </Badge>
                  </div>
                  <p className="font-semibold text-foreground text-sm">{item.customerName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-lg text-green-600">{formatCurrency(item.total)}</p>
                  <p className="text-xs text-muted-foreground">{PAYMENT_LABELS[item.paymentMethod]}</p>
                </div>
              </div>

              {/* Endereço */}
              <div className="bg-muted/50 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground break-words">
                      {item.deliveryAddress}
                    </p>
                    {item.neighborhood && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.neighborhood}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Phone className="w-4 h-4" />
                <a href={`tel:${item.customerPhone}`} className="text-primary hover:underline">
                  {maskPhone(item.customerPhone)}
                </a>
              </div>

              {/* Data/Hora */}
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 mb-2">
                {item.status === 'entregue' && item.completedAt && (
                  <span>
                    {formatDate(item.completedAt)} às {formatTime(item.completedAt)}
                  </span>
                )}
                {item.status === 'cancelado' && item.canceledAt && (
                  <span>
                    Cancelada em {formatDate(item.canceledAt)} às {formatTime(item.canceledAt)}
                  </span>
                )}
                {item.deliveryTime && item.status === 'entregue' && (
                  <span className="ml-auto">
                    ⏱️ {Math.floor(item.deliveryTime / 60)}h {item.deliveryTime % 60}m
                  </span>
                )}
              </div>

              {/* Expandir/Recolher */}
              {item.notes && (
                <button
                  onClick={() =>
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }
                  className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-2 border-t border-border"
                >
                  <span>Observações</span>
                  {expandedId === item.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Observações */}
              {expandedId === item.id && item.notes && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">Observações</p>
                  <p className="text-xs text-yellow-800">{item.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
