import { useState } from "react";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, Search, Package, CheckCircle, Truck, Clock, MapPin, Phone } from "lucide-react";
import { maskPhone } from "@/lib/masks";

const STATUS_STEPS = [
  { key: "novo", label: "Pedido Recebido", icon: Package, desc: "Seu pedido foi recebido" },
  { key: "em_preparo", label: "Em Preparação", icon: Clock, desc: "Estamos preparando seu pedido" },
  { key: "aguardando_entregador", label: "Aguardando Entregador", icon: Clock, desc: "Aguardando entregador disponível" },
  { key: "saiu_entrega", label: "Saiu para Entrega", icon: Truck, desc: "Seu pedido está a caminho!" },
  { key: "entregue", label: "Entregue", icon: CheckCircle, desc: "Pedido entregue com sucesso!" },
];

function formatCurrency(v: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

function getStepIndex(status: string) {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

export default function Rastrear() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialOrder = params.get("pedido") ?? "";
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [searchValue, setSearchValue] = useState(initialOrder);

  const { data: order, isLoading, error } = trpc.orders.trackByNumber.useQuery(
    { orderNumber },
    { enabled: !!orderNumber, refetchInterval: 15000 }
  );

  const { data: settingsRaw } = trpc.settings.getAll.useQuery();
  const settings = settingsRaw ?? {};
  const storeName = settings.storeName ?? "Gás Rápido";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOrderNumber(searchValue.trim());
  }

  const currentStepIndex = order ? getStepIndex(order.status) : -1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-lg text-foreground">{storeName}</span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
              Início
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-orange-500" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">Rastrear Pedido</h1>
          <p className="text-muted-foreground text-sm">Digite o número do pedido para acompanhar</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <Input
            placeholder="Número do pedido (ex: 0001)"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="rounded-xl text-center font-mono text-lg h-12"
          />
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-6 rounded-xl">
            <Search className="w-4 h-4" />
          </Button>
        </form>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Buscando pedido...</p>
          </div>
        )}

        {/* Error / Not found */}
        {!isLoading && orderNumber && !order && (
          <div className="text-center py-12 bg-card rounded-2xl border border-border">
            <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-semibold text-foreground mb-1">Pedido não encontrado</p>
            <p className="text-muted-foreground text-sm">Verifique o número e tente novamente</p>
          </div>
        )}

        {/* Order Found */}
        {order && !isLoading && (
          <div className="space-y-4">
            {/* Order Header */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Pedido</p>
                  <p className="text-2xl font-black text-orange-600">#{order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(order.total)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="truncate">{order.customerPhone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{order.deliveryAddress}</span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <h2 className="font-bold text-foreground mb-5">Status do Pedido</h2>
              {order.status === "cancelado" ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Package className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="font-bold text-red-600">Pedido Cancelado</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            isCurrent
                              ? "bg-orange-500 shadow-lg shadow-orange-200 ring-4 ring-orange-100"
                              : isCompleted
                              ? "bg-green-500"
                              : "bg-muted"
                          }`}>
                            <Icon className={`w-4 h-4 ${isCompleted ? "text-white" : "text-muted-foreground"}`} />
                          </div>
                          {index < STATUS_STEPS.length - 1 && (
                            <div className={`w-0.5 h-8 mt-1 ${isCompleted ? "bg-green-400" : "bg-border"}`} />
                          )}
                        </div>
                        <div className="pb-6 flex-1">
                          <p className={`font-semibold text-sm ${isCurrent ? "text-orange-600" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                            {step.label}
                          </p>
                          {isCurrent && (
                            <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <h2 className="font-bold text-foreground mb-3">Itens do Pedido</h2>
                <div className="space-y-2">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.quantity}x {item.productName}</span>
                      <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-orange-600">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Esta página atualiza automaticamente a cada 15 segundos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
