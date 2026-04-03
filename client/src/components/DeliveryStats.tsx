import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp,
  Clock,
  MapPin,
  DollarSign,
  Zap,
  Target,
  Award,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface DeliveryStatsProps {
  totalDeliveries?: number;
  completedToday?: number;
  pendingDeliveries?: number;
  totalEarnings?: number;
  averageDeliveryTime?: number; // em minutos
  distanceTraveled?: number; // em km
  onlineTime?: number; // em minutos
  rating?: number; // 0-5
}

export const DeliveryStats: React.FC<DeliveryStatsProps> = ({
  totalDeliveries = 0,
  completedToday = 0,
  pendingDeliveries = 0,
  totalEarnings = 0,
  averageDeliveryTime = 0,
  distanceTraveled = 0,
  onlineTime = 0,
  rating = 0,
}) => {
  const stats = [
    {
      label: 'Entregas Hoje',
      value: completedToday,
      icon: Zap,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Pendentes',
      value: pendingDeliveries,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Ganhos Hoje',
      value: formatCurrency(totalEarnings),
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Tempo Médio',
      value: `${averageDeliveryTime}m`,
      icon: Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Distância',
      value: `${distanceTraveled.toFixed(1)}km`,
      icon: MapPin,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Tempo Online',
      value: `${Math.floor(onlineTime / 60)}h ${onlineTime % 60}m`,
      icon: TrendingUp,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-2 rounded-lg flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Rating */}
      {rating > 0 && (
        <Card className="shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium">Avaliação</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-lg font-bold text-foreground">{rating.toFixed(1)}</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-sm ${i < Math.round(rating) ? '⭐' : '☆'}`}
                      >
                        {i < Math.round(rating) ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 p-2 rounded-lg flex-shrink-0">
                <Award className="w-4 h-4 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
