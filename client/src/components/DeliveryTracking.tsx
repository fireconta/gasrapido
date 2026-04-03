import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TrackingStep {
  status: string;
  label: string;
  timestamp?: Date;
  icon: any;
  color: string;
}

interface DeliveryTrackingProps {
  orderId: number;
  currentStatus: string;
  estimatedTime?: number; // em minutos
  distance?: number; // em km
  onStatusUpdate?: (status: string) => void;
}

/**
 * Componente de rastreamento de entrega em tempo real
 */
export const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({
  orderId,
  currentStatus,
  estimatedTime = 15,
  distance = 2.5,
  onStatusUpdate,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, []);

  const trackingSteps: TrackingStep[] = [
    {
      status: 'novo',
      label: 'Pedido Recebido',
      icon: CheckCircle2,
      color: 'text-green-600',
    },
    {
      status: 'em_preparo',
      label: 'Em Preparo',
      icon: Clock,
      color: 'text-blue-600',
    },
    {
      status: 'aguardando_entregador',
      label: 'Aguardando Entregador',
      icon: AlertCircle,
      color: 'text-orange-600',
    },
    {
      status: 'saiu_entrega',
      label: 'Saiu para Entrega',
      icon: Navigation,
      color: 'text-purple-600',
    },
    {
      status: 'entregue',
      label: 'Entregue',
      icon: MapPin,
      color: 'text-green-600',
    },
  ];

  const currentStepIndex = trackingSteps.findIndex((step) => step.status === currentStatus);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Rastreamento da Entrega</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline */}
        <div className="space-y-3">
          {trackingSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.status} className="flex gap-3">
                {/* Icon */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  {index < trackingSteps.length - 1 && (
                    <div
                      className={`w-0.5 h-8 my-1 ${isCompleted ? 'bg-green-200' : 'bg-gray-200'}`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">Agora</Badge>
                    )}
                  </div>
                  {step.timestamp && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.timestamp.toLocaleTimeString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info */}
        {currentStatus === 'saiu_entrega' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Distância</span>
              <span className="font-semibold">{distance} km</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tempo Estimado</span>
              <span className="font-semibold">{estimatedTime} minutos</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tempo Decorrido</span>
              <span className="font-semibold">{elapsedTime} minutos</span>
            </div>
          </div>
        )}

        {/* Action */}
        {currentStatus === 'saiu_entrega' && (
          <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2" size="sm">
            <MapPin className="w-4 h-4" />
            Ver Localização do Entregador
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
