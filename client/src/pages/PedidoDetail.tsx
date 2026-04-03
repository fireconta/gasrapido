import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, Package, MapPin, Phone, User, DollarSign,
  Truck, Clock, CheckCircle, RefreshCw, Send, Edit2, Save, X
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "novo", label: "Pedido Recebido" },
  { value: "em_preparo", label: "Em Preparação" },
  { value: "aguardando_entregador", label: "Aguardando Entregador" },
  { value: "saiu_entrega", label: "Saiu para Entrega" },
  { value: "entregue", label: "Entregue" },
  { value: "cancelado", label: "Cancelado" },
];

const STATUS_COLORS: Record<string, string> = {
  novo: "bg-blue-100 text-blue-700",
  em_preparo: "bg-yellow-100 text-yellow-700",
  aguardando_entregador: "bg-orange-100 text-orange-700",
  saiu_entrega: "bg-purple-100 text-purple-700",
  entregue: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

function formatCurrency(v: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
}

export default function PedidoDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const orderId = parseInt(params.id ?? "0");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDeliverer, setSelectedDeliverer] = useState("");

  // Edição de total
  const [editingTotal, setEditingTotal] = useState(false);
  const [newTotal, setNewTotal] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [totalNotes, setTotalNotes] = useState("");

  const utils = trpc.useUtils();
  const { data: order, refetch } = trpc.orders.getById.useQuery({ id: orderId }, { enabled: !!orderId });
  const { data: deliverers } = trpc.deliverers.list.useQuery({ onlineOnly: false });
  const updateStatusMutation = trpc.orders.updateStatus.useMutation();
  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast.success("Pedido atualizado com sucesso!");
      setEditingTotal(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  async function handleUpdateStatus() {
    if (!selectedStatus) {
      toast.error("Selecione um status");
      return;
    }
    try {
      const extra: any = {};
      if (selectedDeliverer) {
        const d = deliverers?.find((x) => x.id === parseInt(selectedDeliverer));
        if (d) { extra.delivererId = d.id; extra.delivererName = d.name; }
      }
      await updateStatusMutation.mutateAsync({ id: orderId, status: selectedStatus, ...extra });
      toast.success("Status atualizado!");
      setSelectedStatus("");
      refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao atualizar status");
    }
  }

  function startEditTotal() {
    if (!order) return;
    setNewTotal(String(Number(order.total).toFixed(2)));
    setNewDiscount(order.discount ? String(Number(order.discount).toFixed(2)) : "0");
    setTotalNotes("");
    setEditingTotal(true);
  }

  function handleSaveTotal() {
    const total = parseFloat(newTotal);
    if (isNaN(total) || total < 0) {
      toast.error("Valor total inválido");
      return;
    }
    updateOrderMutation.mutate({
      id: orderId,
      total: newTotal,
      discount: newDiscount || "0",
      notes: totalNotes || undefined,
    });
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const subtotal = order.items
    ? order.items.reduce((s: number, i: any) => s + Number(i.subtotal), 0)
    : Number(order.total);

  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/pedidos")} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Pedido #{order.orderNumber}
            </h1>
            <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
          </div>
          <Badge className={`ml-auto ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>
            {STATUS_OPTIONS.find((s) => s.value === order.status)?.label ?? order.status}
          </Badge>
        </div>

        <div className="grid gap-4">
          {/* Customer Info */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-orange-500" />
              Cliente
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Nome</p>
                <p className="font-medium text-foreground">{order.customerName ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Telefone</p>
                <p className="font-medium text-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {order.customerPhone ?? "—"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Endereço de Entrega</p>
                <p className="font-medium text-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {order.deliveryAddress}{order.neighborhood ? `, ${order.neighborhood}` : ""}
                </p>
              </div>
              {order.notes && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Observações</p>
                  <p className="font-medium text-amber-700 bg-amber-50 rounded-lg p-2 text-xs mt-1">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  Itens do Pedido
                </h2>
                {!editingTotal ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditTotal}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar Total
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingTotal(false)} className="h-8 text-xs gap-1">
                      <X className="w-3.5 h-3.5" />
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveTotal}
                      disabled={updateOrderMutation.isPending}
                      className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {updateOrderMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {order.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity}x {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <p className="font-bold text-foreground">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}

                {/* Subtotal */}
                {order.discount && Number(order.discount) > 0 && (
                  <div className="flex justify-between items-center pt-1 text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                )}
                {order.discount && Number(order.discount) > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>Desconto</span>
                    <span>- {formatCurrency(order.discount)}</span>
                  </div>
                )}

                {/* Total editável */}
                {editingTotal ? (
                  <div className="pt-3 border-t border-border space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium text-foreground">Novo Total (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={newTotal}
                          onChange={(e) => setNewTotal(e.target.value)}
                          className="mt-1 h-9 text-sm font-bold text-orange-600"
                          autoFocus
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-foreground">Desconto (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={newDiscount}
                          onChange={(e) => setNewDiscount(e.target.value)}
                          className="mt-1 h-9 text-sm text-green-600"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-foreground">Motivo da alteração</Label>
                      <Input
                        value={totalNotes}
                        onChange={(e) => setTotalNotes(e.target.value)}
                        placeholder="Ex: Desconto especial, erro de cálculo..."
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center pt-2 font-bold border-t border-border">
                    <span className="text-foreground">Total</span>
                    <span className="text-orange-600 text-lg">{formatCurrency(order.total)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-500" />
              Pagamento
            </h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Forma</p>
                <p className="font-medium text-foreground capitalize">{order.paymentMethod ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Confirmado</p>
                <p className={`font-medium ${order.paymentConfirmed ? "text-green-600" : "text-muted-foreground"}`}>
                  {order.paymentConfirmed ? "Sim" : "Não"}
                </p>
              </div>
              {order.delivererName && (
                <div>
                  <p className="text-muted-foreground text-xs">Entregador</p>
                  <p className="font-medium text-foreground">{order.delivererName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Update Status */}
          {order.status !== "entregue" && order.status !== "cancelado" && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-orange-500" />
                Atualizar Status
              </h2>
              <div className="flex gap-3">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="rounded-xl flex-1">
                    <SelectValue placeholder="Selecione o novo status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={!selectedStatus || updateStatusMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                >
                  <Send className="w-4 h-4" />
                  Atualizar
                </Button>
              </div>
              {(selectedStatus === "saiu_entrega" || selectedStatus === "aguardando_entregador") && (
                <div className="mt-3">
                  <Select value={selectedDeliverer} onValueChange={setSelectedDeliverer}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Atribuir entregador (opcional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(deliverers ?? []).map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name} {d.isOnline ? "🟢" : "⚫"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
