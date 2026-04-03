import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DollarSign,
  CreditCard,
  Banknote,
  QrCode,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface PaymentOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "dinheiro",
    name: "Dinheiro",
    icon: <DollarSign className="w-6 h-6" />,
    description: "Pagamento em dinheiro na entrega",
    color: "text-green-600",
  },
  {
    id: "pix",
    name: "PIX",
    icon: <QrCode className="w-6 h-6" />,
    description: "Transferência instantânea via PIX",
    color: "text-blue-600",
  },
  {
    id: "debito",
    name: "Débito",
    icon: <CreditCard className="w-6 h-6" />,
    description: "Cartão de débito",
    color: "text-purple-600",
  },
  {
    id: "credito",
    name: "Crédito",
    icon: <CreditCard className="w-6 h-6" />,
    description: "Cartão de crédito",
    color: "text-orange-600",
  },
  {
    id: "fiado",
    name: "Fiado",
    icon: <Banknote className="w-6 h-6" />,
    description: "Pagamento posterior",
    color: "text-red-600",
  },
];

export default function PaymentMethodPage() {
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const applyDiscountMutation = trpc.paymentDiscount.applyDiscount.useMutation();

  const handleApplyDiscount = async () => {
    if (!orderId) {
      toast.error("Selecione um pedido");
      return;
    }

    if (!selectedMethod) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }

    if (discountAmount < 0) {
      toast.error("Desconto não pode ser negativo");
      return;
    }

    setIsProcessing(true);
    try {
      await applyDiscountMutation.mutateAsync({
        orderId,
        paymentMethod: selectedMethod as any,
        discountAmount,
        discountReason: discountReason || undefined,
      });

      toast.success(`Desconto de R$ ${discountAmount.toFixed(2)} aplicado com sucesso!`);
      setDiscountAmount(0);
      setDiscountReason("");
      setSelectedMethod(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao aplicar desconto");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Seleção de Forma de Pagamento
          </h1>
          <p className="text-muted-foreground">
            Escolha a forma de pagamento e aplique desconto se necessário
          </p>
        </div>

        {/* Informações do Pedido */}
        <Card className="p-6 mb-8 border-border/60">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Informações do Pedido
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                ID do Pedido
              </Label>
              <Input
                type="number"
                placeholder="Digite o ID do pedido"
                value={orderId || ""}
                onChange={(e) => setOrderId(parseInt(e.target.value) || null)}
                className="border-border/60"
              />
            </div>
          </div>
        </Card>

        {/* Formas de Pagamento */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Formas de Pagamento Disponíveis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAYMENT_OPTIONS.map((option) => (
              <Card
                key={option.id}
                className={`p-4 cursor-pointer transition-all border-2 ${
                  selectedMethod === option.id
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-primary/50"
                }`}
                onClick={() => setSelectedMethod(option.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`${option.color}`}>{option.icon}</div>
                  {selectedMethod === option.id && (
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  )}
                </div>
                <h3 className="font-semibold text-foreground mb-1">{option.name}</h3>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Aplicar Desconto */}
        {selectedMethod && (
          <Card className="p-6 mb-8 border-border/60 bg-muted/30">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Aplicar Desconto (Opcional)
                </h3>
                <p className="text-sm text-muted-foreground">
                  Você pode aplicar um desconto em reais nesta transação
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="discount" className="text-sm text-muted-foreground mb-2 block">
                  Desconto em Reais (R$)
                </Label>
                <Input
                  id="discount"
                  type="number"
                  placeholder="0.00"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  className="border-border/60"
                />
              </div>
              <div>
                <Label
                  htmlFor="reason"
                  className="text-sm text-muted-foreground mb-2 block"
                >
                  Motivo do Desconto (Opcional)
                </Label>
                <Input
                  id="reason"
                  type="text"
                  placeholder="Ex: Promoção, Cliente VIP, etc."
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="border-border/60"
                />
              </div>
            </div>

            {discountAmount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-700">
                  <strong>Desconto a aplicar:</strong> R$ {discountAmount.toFixed(2)}
                </p>
              </div>
            )}

            <Button
              onClick={handleApplyDiscount}
              disabled={isProcessing || discountAmount <= 0}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-10 rounded-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aplicando desconto...
                </>
              ) : (
                "Aplicar Desconto"
              )}
            </Button>
          </Card>
        )}

        {/* Resumo */}
        <Card className="p-6 border-border/60">
          <h3 className="font-semibold text-foreground mb-4">Resumo</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Forma de Pagamento:</span>
              <span className="font-medium text-foreground">
                {selectedMethod
                  ? PAYMENT_OPTIONS.find((o) => o.id === selectedMethod)?.name
                  : "Não selecionada"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desconto:</span>
              <span className="font-medium text-foreground">
                R$ {discountAmount.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-border/60 pt-2 mt-2 flex justify-between">
              <span className="text-muted-foreground font-medium">Status:</span>
              <span className="font-medium text-green-600">Pronto para processar</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
