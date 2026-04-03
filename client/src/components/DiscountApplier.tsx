import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Check, X } from 'lucide-react';
import { maskCurrency } from '@/lib/masks';
import { toast } from 'sonner';

interface DiscountApplierProps {
  subtotal: number;
  currentDiscount: number;
  paymentMethod: string;
  onApplyDiscount: (discount: number) => void;
}

/**
 * Componente para aplicar desconto na forma de pagamento
 * Permite que o entregador aplique desconto em reais
 */
export const DiscountApplier: React.FC<DiscountApplierProps> = ({
  subtotal,
  currentDiscount,
  paymentMethod,
  onApplyDiscount,
}) => {
  const [discountAmount, setDiscountAmount] = useState(String(currentDiscount));
  const [isEditing, setIsEditing] = useState(false);

  const discountValue = parseFloat(discountAmount || '0');
  const maxDiscount = subtotal;
  const isValid = discountValue >= 0 && discountValue <= maxDiscount;

  const handleApply = () => {
    if (!isValid) {
      toast.error(`Desconto deve ser entre R$ 0,00 e R$ ${maxDiscount.toFixed(2)}`);
      return;
    }
    onApplyDiscount(discountValue);
    setIsEditing(false);
    toast.success(`Desconto de R$ ${discountValue.toFixed(2)} aplicado!`);
  };

  const handleCancel = () => {
    setDiscountAmount(String(currentDiscount));
    setIsEditing(false);
  };

  const discountPercentage = subtotal > 0 ? ((discountValue / subtotal) * 100).toFixed(1) : '0';

  return (
    <Card className="shadow-sm border-orange-200 bg-orange-50/50">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-600" />
            <h3 className="font-semibold text-sm text-foreground">Desconto na Forma de Pagamento</h3>
          </div>

          {/* Payment Method Info */}
          <div className="text-xs text-muted-foreground bg-white rounded-lg p-2">
            <p>
              <span className="font-medium">Forma de Pagamento:</span>{' '}
              {paymentMethod === 'dinheiro'
                ? '💵 Dinheiro'
                : paymentMethod === 'pix'
                  ? '📱 Pix'
                  : paymentMethod === 'debito'
                    ? '💳 Débito'
                    : paymentMethod === 'credito'
                      ? '💳 Crédito'
                      : '📝 Fiado'}
            </p>
          </div>

          {/* Current Discount Display */}
          {!isEditing && (
            <div className="bg-white rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Desconto Atual</span>
                <span className="text-lg font-bold text-orange-600">
                  R$ {discountValue.toFixed(2)}
                </span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Percentual</span>
                  <span className="font-medium">{discountPercentage}% de desconto</span>
                </div>
              )}
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                Editar Desconto
              </Button>
            </div>
          )}

          {/* Edit Mode */}
          {isEditing && (
            <div className="bg-white rounded-lg p-3 space-y-3">
              <div>
                <Label className="text-xs font-medium">Valor do Desconto (R$)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(maskCurrency(e.target.value))}
                  placeholder="0,00"
                  className="mt-1 text-sm font-semibold"
                  autoFocus
                />
              </div>

              {/* Validation Message */}
              {discountValue > maxDiscount && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ Desconto não pode ser maior que o subtotal (R$ {maxDiscount.toFixed(2)})
                </div>
              )}

              {discountValue > 0 && discountValue <= maxDiscount && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  ✓ Desconto de R$ {discountValue.toFixed(2)} ({discountPercentage}%)
                </div>
              )}

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map((preset) => (
                  <Button
                    key={preset}
                    onClick={() => {
                      const amount = Math.min((subtotal * preset) / 100, maxDiscount);
                      setDiscountAmount(amount.toFixed(2));
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {preset}%
                  </Button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={!isValid}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-1"
                  size="sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Aplicar
                </Button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-blue-50 rounded-lg p-2 border border-blue-200">
            <p>
              💡 <span className="font-medium">Dica:</span> Aplique desconto quando o cliente pagar em
              dinheiro ou pix para incentivar pagamento rápido.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
