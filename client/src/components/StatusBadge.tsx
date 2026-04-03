import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  X,
  Zap,
  LucideIcon,
} from 'lucide-react';

export type OrderStatus =
  | 'novo'
  | 'em_preparo'
  | 'aguardando_entregador'
  | 'saiu_entrega'
  | 'entregue'
  | 'cancelado';

const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    color: string;
    icon: LucideIcon;
    bgColor: string;
  }
> = {
  novo: {
    label: 'Novo',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: Clock,
  },
  em_preparo: {
    label: 'Em Preparo',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: Zap,
  },
  aguardando_entregador: {
    label: 'Aguardando Entregador',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: AlertCircle,
  },
  saiu_entrega: {
    label: 'Saiu para Entrega',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: Truck,
  },
  entregue: {
    label: 'Entregue',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: CheckCircle,
  },
  cancelado: {
    label: 'Cancelado',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: X,
  },
};

interface StatusBadgeProps {
  status: OrderStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md',
}) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <Badge
      className={`
        ${config.bgColor} ${config.color} border-0
        ${sizeClasses[size]}
        flex items-center gap-1.5 w-fit
      `}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {config.label}
    </Badge>
  );
};
