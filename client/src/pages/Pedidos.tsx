import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { CustomerSelect } from "@/components/CustomerSelect";
import { maskPhone, maskCurrency, parseCurrency } from "@/lib/masks";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useWebSocketNotifications } from "@/hooks/useWebSocketNotifications";
import {
  Plus, Search, Eye, ChevronDown, ShoppingCart, Phone, MapPin,
  Clock, CheckCircle, Truck, X, DollarSign, Trash2, Download, Gift, Edit, AlertTriangle,
  History, Package, PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function formatCurrency(v: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

const STATUS_CONFIG: Record<string, { label: string; color: string; iconBg: string; iconColor: string; borderLeft: string; icon: any; next?: string }> = {
  novo:                   { label: "Novo",              color: "bg-blue-100 text-blue-700 border-blue-200",     iconBg: "bg-blue-50",    iconColor: "text-blue-500",   borderLeft: "border-l-blue-400",   icon: Clock,         next: "em_preparo" },
  em_preparo:             { label: "Em Preparo",        color: "bg-amber-100 text-amber-700 border-amber-200", iconBg: "bg-amber-50",   iconColor: "text-amber-500",  borderLeft: "border-l-amber-400",  icon: Clock,         next: "aguardando_entregador" },
  aguardando_entregador:  { label: "Aguard. Entregador",color: "bg-orange-100 text-orange-700 border-orange-200",iconBg: "bg-orange-50", iconColor: "text-orange-500", borderLeft: "border-l-orange-400", icon: Truck,         next: "saiu_entrega" },
  saiu_entrega:           { label: "Em Rota",           color: "bg-violet-100 text-violet-700 border-violet-200",iconBg: "bg-violet-50", iconColor: "text-violet-500", borderLeft: "border-l-violet-400", icon: Truck,         next: "entregue" },
  entregue:               { label: "Entregue",          color: "bg-emerald-100 text-emerald-700 border-emerald-200",iconBg: "bg-emerald-50",iconColor: "text-emerald-500",borderLeft: "border-l-emerald-400",icon: CheckCircle },
  cancelado:              { label: "Cancelado",         color: "bg-red-100 text-red-600 border-red-200",       iconBg: "bg-red-50",     iconColor: "text-red-500",    borderLeft: "border-l-red-400",    icon: X },
};

const STATUS_NEXT_LABEL: Record<string, string> = {
  novo: "Iniciar Preparo",
  em_preparo: "Enviar para Entregador",
  aguardando_entregador: "Confirmar Saída",
  saiu_entrega: "Marcar Entregue",
};

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "💵 Dinheiro",
  pix: "📱 Pix",
  debito: "💳 Débito",
  credito: "💳 Crédito",
  fiado: "📝 Fiado",
};

const STATUS_FILTERS = [
  { value: "todos", label: "Todos", dot: "" },
  { value: "novo", label: "Novos", dot: "bg-blue-500" },
  { value: "em_preparo", label: "Em Preparo", dot: "bg-yellow-500" },
  { value: "aguardando_entregador", label: "Aguard. Entregador", dot: "bg-orange-500" },
  { value: "saiu_entrega", label: "Em Entrega", dot: "bg-purple-500" },
  { value: "entregue", label: "Entregues", dot: "bg-green-500" },
  { value: "cancelado", label: "Cancelados", dot: "bg-red-500" },
];

type OrderItem = { productId?: number; productName: string; unitPrice: string; quantity: number; subtotal: string; };

export default function Pedidos() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);

  // New order form state
  const [newOrder, setNewOrder] = useState({
    customerName: "", customerPhone: "",
    street: "", number: "", complement: "",
    neighborhood: "",
    paymentMethod: "dinheiro" as any, discount: "0.00", notes: "",
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedBenefit, setSelectedBenefit] = useState<{ id: number; name: string; type: string; voucherProductName?: string | null } | null>(null);
  const [grantBenefit, setGrantBenefit] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number; discountAmount: number } | null>(null);
  const validateCouponMutation = trpc.discounts.validateCoupon.useMutation();

  // Função para preencher dados do cliente selecionado
  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    // Tratar "0" como sem número (dado legado do backup)
    const addrNum = customer.addressNumber && customer.addressNumber !== "0" ? customer.addressNumber : "";
    setNewOrder((n) => ({
      ...n,
      customerName: customer.name,
      customerPhone: customer.phone || "",
      street: customer.address || "",
      number: addrNum,
      complement: customer.complement || "",
      neighborhood: customer.neighborhood || "",
    }));
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setNewOrder((n) => ({
      ...n,
      customerName: "",
      customerPhone: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
    }));
  };

  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.orders.list.useQuery({ status: statusFilter, search });
  const { data: exportData } = trpc.orders.exportCsv.useQuery({ status: statusFilter, search });

  function handleExportCSV() {
    if (!exportData || exportData.length === 0) { toast.error("Nenhum pedido para exportar"); return; }
    const headers = ["Número", "Cliente", "Telefone", "Endereço", "Bairro", "Status", "Pagamento", "Entregador", "Total (R$)", "Data"];
    const rows = exportData.map((o) => [
      o.orderNumber, o.customerName, o.customerPhone,
      o.deliveryAddress, o.neighborhood, o.status, o.paymentMethod,
      o.delivererName, o.total.toFixed(2),
      new Date(o.createdAt).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pedidos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Pedidos exportados com sucesso!");
  }
  const { data: orderDetail } = trpc.orders.getById.useQuery(
    { id: selectedOrder! },
    { enabled: !!selectedOrder }
  );
  const { data: products } = trpc.products.list.useQuery({});

  const [selectedDeliverer, setSelectedDeliverer] = useState<{ id: number; name: string } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditItems, setShowEditItems] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [editOrderForm, setEditOrderForm] = useState({
    customerName: "", customerPhone: "", deliveryAddress: "",
    neighborhood: "", paymentMethod: "dinheiro", discount: "0.00", notes: "",
  });
  type EditableItem = { productId?: number; productName: string; unitPrice: number; quantity: number; };
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const { data: deliverersList } = trpc.deliverers.list.useQuery({ onlineOnly: false });
  const { data: customersList } = trpc.customers.list.useQuery(
    { search: customerSearch },
    { enabled: customerSearch.length >= 2 }
  );
  const { data: benefitsList } = trpc.benefits.list.useQuery({ isActive: true });
  const grantBenefitMutation = trpc.benefits.grantToCustomer.useMutation();

  // Auditoria do pedido
  const { data: auditLogData, isLoading: auditLoading } = trpc.orders.getAuditLog.useQuery(
    { orderId: selectedOrder! },
    { enabled: !!selectedOrder && showAuditLog }
  );

  // Mutation para atualizar itens do pedido
  const updateItemsMutation = trpc.orders.updateItems.useMutation({
    onSuccess: (data) => {
      toast.success(`Itens atualizados! Novo total: ${formatCurrency(data.newTotal)}`);
      utils.orders.list.invalidate();
      utils.orders.getById.invalidate({ id: selectedOrder! });
      setShowEditItems(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateOrderMutation = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast.success("Pedido atualizado!");
      utils.orders.list.invalidate();
      utils.orders.getById.invalidate({ id: selectedOrder! });
      setShowEditOrder(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteOrderMutation = trpc.orders.delete.useMutation({
    onSuccess: () => {
      toast.success("Pedido excluído!");
      utils.orders.list.invalidate();
      utils.dashboard.metrics.invalidate();
      setShowDeleteConfirm(false);
      setSelectedOrder(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function openEditOrder(order: typeof orderDetail) {
    if (!order) return;
    setEditOrderForm({
      customerName: order.customerName ?? "",
      customerPhone: order.customerPhone ?? "",
      deliveryAddress: order.deliveryAddress ?? "",
      neighborhood: order.neighborhood ?? "",
      paymentMethod: order.paymentMethod ?? "dinheiro",
      discount: order.discount ?? "0.00",
      notes: order.notes ?? "",
    });
    setShowEditOrder(true);
  }

  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.orders.list.invalidate();
      utils.orders.getById.invalidate({ id: selectedOrder! });
      utils.dashboard.metrics.invalidate();
      setSelectedDeliverer(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleAdvanceStatus(order: typeof orderDetail) {
    if (!order) return;
    const nextStatus = STATUS_CONFIG[order.status]?.next as any;
    if (!nextStatus) return;
    if (order.status === "em_preparo") {
      // Enviar para entregador - pode selecionar um entregador
      updateStatusMutation.mutate({
        id: order.id,
        status: nextStatus,
        delivererId: selectedDeliverer?.id,
        delivererName: selectedDeliverer?.name,
      });
    } else {
      updateStatusMutation.mutate({ id: order.id, status: nextStatus });
    }
  }

  // WebSocket para notificações em tempo real
  useWebSocketNotifications();

  const createOrderMutation = trpc.orders.create.useMutation({
    onSuccess: (order) => {
      toast.success("Pedido criado com sucesso!");
      utils.orders.list.invalidate();
      utils.dashboard.metrics.invalidate();
      setShowNewOrder(false);
      resetNewOrder();
      
      // Notificação será enviada via WebSocket pelo servidor
      console.log("Novo pedido criado:", order);
    },
    onError: (e) => toast.error(e.message),
  });

  function resetNewOrder() {
    setNewOrder({ customerName: "", customerPhone: "", street: "", number: "", complement: "", neighborhood: "", paymentMethod: "dinheiro", discount: "0.00", notes: "" });
    setOrderItems([]);
    setSelectedBenefit(null);
    setGrantBenefit(false);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCouponCode("");
    setAppliedCoupon(null);
  }

  function buildDeliveryAddress() {
    const parts = [newOrder.street];
    if (newOrder.number) parts.push(`nº ${newOrder.number}`);
    if (newOrder.complement) parts.push(newOrder.complement);
    return parts.filter(Boolean).join(", ");
  }

  function addItem(product: any) {
    const existing = orderItems.find((i) => i.productId === product.id);
    if (existing) {
      setOrderItems((items) => items.map((i) =>
        i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: String((i.quantity + 1) * parseFloat(i.unitPrice)) }
          : i
      ));
    } else {
      setOrderItems((items) => [...items, {
        productId: product.id, productName: product.name,
        unitPrice: product.price, quantity: 1, subtotal: product.price,
      }]);
    }
  }

  function removeItem(idx: number) {
    setOrderItems((items) => items.filter((_, i) => i !== idx));
  }

  const subtotal = orderItems.reduce((acc, i) => acc + parseFloat(i.subtotal), 0);
  const manualDiscount = parseCurrency(newOrder.discount);
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const discountValue = manualDiscount + couponDiscount;
  const total = subtotal - discountValue;

  function submitOrder() {
    if (!newOrder.customerName) { toast.error("Informe o nome do cliente"); return; }
    if (!newOrder.street) { toast.error("Informe o endereço"); return; }
    if (!newOrder.number) { toast.error("Informe o número do endereço"); return; }
    if (orderItems.length === 0) { toast.error("Adicione pelo menos um produto"); return; }
    createOrderMutation.mutate({
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      address: buildDeliveryAddress(),
      city: "Quirinópolis",
      neighborhood: newOrder.neighborhood,
      paymentMethod: newOrder.paymentMethod,
      discount: discountValue,
      notes: newOrder.notes,
      total: total,
      items: orderItems.map((item) => ({
        productId: item.productId ?? 0,
        productName: item.productName,
        quantity: item.quantity,
        price: parseFloat(item.unitPrice),
      })),
    }, {
      onSuccess: (order) => {
        // Conceder benefício ao cliente se selecionado
        if (grantBenefit && selectedBenefit && newOrder.customerName) {
          const customerId = selectedCustomer?.id;
          if (customerId) {
            grantBenefitMutation.mutate({
              customerId,
              customerName: newOrder.customerName,
              benefitId: selectedBenefit.id,
              orderId: order?.id,
              notes: `Concedido no pedido #${order?.orderNumber ?? ''}`,
            }, {
              onSuccess: () => toast.success(`Benefício "${selectedBenefit.name}" concedido ao cliente!`),
            });
          } else {
            toast.info(`Benefício não concedido: cliente não cadastrado no sistema.`);
          }
        }
      }
    });
  }

  return (
    <AdminLayout title="Pedidos">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar pedido ou cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button onClick={() => { resetNewOrder(); setShowNewOrder(true); }} className="bg-primary hover:bg-primary/90 text-white gap-2">
              <Plus className="w-4 h-4" /> Novo Pedido
            </Button>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {STATUS_FILTERS.map((f) => {
            const count = f.value === "todos" ? (orders?.length ?? 0) : (orders?.filter(o => o.status === f.value).length ?? 0);
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  statusFilter === f.value
                    ? "bg-primary text-white shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {f.dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.dot} ${statusFilter === f.value ? "bg-white" : ""}`} />}
                {f.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 ${
                    statusFilter === f.value ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : orders?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders?.map((order) => {
              const cfg = STATUS_CONFIG[order.status];
              const Icon = cfg?.icon;
              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border-l-4 border border-border bg-card cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-md ${cfg?.borderLeft ?? "border-l-gray-300"}`}
                  style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.06), 0 2px 8px oklch(0.13 0.018 240 / 0.04)" }}
                  onClick={() => setSelectedOrder(order.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Status Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg?.iconBg ?? "bg-muted"}`}>
                        {Icon && <Icon className={`w-4 h-4 ${cfg?.iconColor ?? "text-muted-foreground"}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-extrabold text-sm text-primary">#{order.orderNumber}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg?.color}`}>
                            {cfg?.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{PAYMENT_LABELS[order.paymentMethod]}</span>
                        </div>
                        <p className="text-sm font-semibold truncate text-foreground">{order.customerName}</p>
                        {order.deliveryAddress && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {order.deliveryAddress}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-extrabold text-emerald-600 text-sm">{formatCurrency(order.total)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {order.delivererName && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[80px]">{order.delivererName}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {orderDetail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Pedido #{orderDetail.orderNumber}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CONFIG[orderDetail.status]?.color}`}>
                    {STATUS_CONFIG[orderDetail.status]?.label}
                  </span>
                </DialogTitle>
                <DialogDescription className="sr-only">Detalhes do pedido #{orderDetail.orderNumber}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Customer Info */}
                <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</p>
                  <p className="font-medium">{orderDetail.customerName}</p>
                  {orderDetail.customerPhone && (
                    <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" /> {orderDetail.customerPhone}
                    </p>
                  )}
                  {orderDetail.deliveryAddress && (
                    <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" /> {orderDetail.deliveryAddress}
                      {orderDetail.neighborhood && ` — ${orderDetail.neighborhood}`}
                    </p>
                  )}
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Itens</p>
                  <div className="space-y-2">
                    {orderDetail.items?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="flex-1">{item.quantity}x {item.productName}</span>
                        <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-border pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span><span>{formatCurrency(orderDetail.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Taxa de entrega</span><span>{formatCurrency(orderDetail.deliveryFee)}</span>
                  </div>
                  {parseFloat(orderDetail.discount ?? "0") > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Desconto</span><span>-{formatCurrency(orderDetail.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                    <span>Total</span><span className="text-green-600">{formatCurrency(orderDetail.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pagamento</span>
                    <span>{PAYMENT_LABELS[orderDetail.paymentMethod]}</span>
                  </div>
                </div>

                {orderDetail.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-yellow-700 mb-1">Observações</p>
                    <p className="text-sm text-yellow-800">{orderDetail.notes}</p>
                  </div>
                )}
              </div>
              {/* Seleção de entregador quando em_preparo */}
              {orderDetail.status === "em_preparo" && deliverersList && deliverersList.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Atribuir Entregador (opcional)</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setSelectedDeliverer(null)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        !selectedDeliverer ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      Qualquer entregador
                    </button>
                    {deliverersList.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDeliverer({ id: d.id, name: d.name })}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                          selectedDeliverer?.id === d.id ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${d.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {/* Botões admin: editar, editar itens, histórico e excluir */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => openEditOrder(orderDetail)}
                >
                  <Edit className="w-3.5 h-3.5" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                  onClick={() => {
                    setEditableItems((orderDetail.items ?? []).map((i) => ({
                      productId: i.productId ?? undefined,
                      productName: i.productName,
                      unitPrice: parseFloat(String(i.unitPrice)),
                      quantity: i.quantity,
                    })));
                    setShowEditItems(true);
                  }}
                >
                  <Package className="w-3.5 h-3.5" /> Itens
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-gray-600 border-gray-200 hover:bg-gray-50"
                  onClick={() => setShowAuditLog(true)}
                >
                  <History className="w-3.5 h-3.5" /> Histórico
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </Button>
                {orderDetail.status !== "entregue" && orderDetail.status !== "cancelado" && (
                  <>
                    <Button
                      variant="outline"
                      className="text-orange-500 border-orange-200 hover:bg-orange-50"
                      onClick={() => updateStatusMutation.mutate({ id: orderDetail.id, status: "cancelado" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Cancelar pedido
                    </Button>
                    {STATUS_CONFIG[orderDetail.status]?.next && (
                      <Button
                        className="bg-primary hover:bg-primary/90 text-white flex-1"
                        onClick={() => handleAdvanceStatus(orderDetail)}
                        disabled={updateStatusMutation.isPending}
                      >
                        {STATUS_NEXT_LABEL[orderDetail.status]}
                      </Button>
                    )}
                  </>
                )}
              </DialogFooter>
            </>
          ) : (
            <div className="py-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Order Dialog */}
      <Dialog open={showNewOrder} onOpenChange={(o) => { if (!o) { setShowNewOrder(false); resetNewOrder(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Pedido</DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados para criar um novo pedido</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* Left: Customer + Payment */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Selecionar Cliente</Label>
                <CustomerSelect
                  customers={customersList ?? []}
                  onSelect={handleSelectCustomer}
                  onClear={handleClearCustomer}
                  selectedCustomer={selectedCustomer}
                  placeholder="Buscar cliente existente..."
                  onSearch={setCustomerSearch}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Nome do Cliente *</Label>
                <Input value={newOrder.customerName} onChange={(e) => setNewOrder((n) => ({ ...n, customerName: e.target.value }))} placeholder="Nome completo" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Telefone / WhatsApp</Label>
                <Input
                  value={newOrder.customerPhone}
                  onChange={(e) => setNewOrder((n) => ({ ...n, customerPhone: maskPhone(e.target.value) }))}
                  placeholder="(64) 99999-9999"
                  className="mt-1"
                  type="tel"
                  inputMode="tel"
                  maxLength={15}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs font-medium">Rua / Avenida *</Label>
                  <Input value={newOrder.street} onChange={(e) => setNewOrder((n) => ({ ...n, street: e.target.value }))} placeholder="Ex: Rua das Flores" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Número *</Label>
                  <Input
                    value={newOrder.number}
                    onChange={(e) => setNewOrder((n) => ({ ...n, number: e.target.value.replace(/\D/g, "") }))}
                    placeholder="123"
                    className="mt-1"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium">Complemento</Label>
                  <Input value={newOrder.complement} onChange={(e) => setNewOrder((n) => ({ ...n, complement: e.target.value }))} placeholder="Apto, bloco..." className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Bairro</Label>
                  <Input value={newOrder.neighborhood} onChange={(e) => setNewOrder((n) => ({ ...n, neighborhood: e.target.value }))} placeholder="Bairro" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Forma de Pagamento *</Label>
                <select value={newOrder.paymentMethod} onChange={(e) => setNewOrder((n) => ({ ...n, paymentMethod: e.target.value }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="pix">📱 Pix</option>
                  <option value="debito">💳 Débito</option>
                  <option value="credito">💳 Crédito</option>
                  <option value="fiado">📝 Fiado</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium">Desconto Manual (em reais)</Label>
                <Input value={newOrder.discount} onChange={(e) => setNewOrder((n) => ({ ...n, discount: maskCurrency(e.target.value) }))} placeholder="R$ 0,00" className="mt-1" inputMode="decimal" />
              </div>
              {/* Cupom de desconto */}
              <div>
                <Label className="text-xs font-medium">Cupom de Desconto</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (appliedCoupon) setAppliedCoupon(null); }}
                    placeholder="Ex: DESCONTO10"
                    className="flex-1 uppercase"
                    disabled={!!appliedCoupon}
                  />
                  {appliedCoupon ? (
                    <Button type="button" variant="outline" size="sm" className="text-red-500 border-red-300 hover:bg-red-50" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button" variant="outline" size="sm"
                      disabled={!couponCode.trim() || couponLoading}
                      onClick={async () => {
                        if (!couponCode.trim()) return;
                        setCouponLoading(true);
                        try {
                          const result = await validateCouponMutation.mutateAsync({ code: couponCode.trim(), orderTotal: subtotal });
                          if (result.valid && result.coupon) {
                            setAppliedCoupon({ code: result.coupon.code, discountType: result.coupon.discountType, discountValue: result.coupon.discountValue, discountAmount: result.discountAmount });
                            toast.success(`Cupom aplicado! Desconto de R$ ${result.discountAmount.toFixed(2)}`);
                          } else {
                            toast.error(result.message || "Cupom inválido");
                          }
                        } catch { toast.error("Erro ao validar cupom"); }
                        finally { setCouponLoading(false); }
                      }}
                    >
                      {couponLoading ? "..." : "Aplicar"}
                    </Button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    ✅ Cupom <strong>{appliedCoupon.code}</strong> aplicado — desconto de R$ {appliedCoupon.discountAmount.toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs font-medium">Observações</Label>
                <Textarea value={newOrder.notes} onChange={(e) => setNewOrder((n) => ({ ...n, notes: e.target.value }))} placeholder="Observações do pedido..." className="mt-1 resize-none" rows={2} />
              </div>

              {/* Benefícios */}
              <div className="border border-dashed border-primary/40 rounded-xl p-3 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4 text-primary" />
                  <Label className="text-xs font-semibold text-primary">Conceder Benefício</Label>
                </div>
                <select
                  value={selectedBenefit?.id ?? ""}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    const b = benefitsList?.find((b: any) => b.id === id) ?? null;
                    setSelectedBenefit(b ? { id: b.id, name: b.name, type: b.type, voucherProductName: b.voucherProductName } : null);
                    setGrantBenefit(!!b);
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Nenhum benefício</option>
                  {benefitsList?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {selectedBenefit && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {selectedBenefit.type === "gas_do_povo" && selectedBenefit.voucherProductName
                      ? `O cliente receberá um vale gás: ${selectedBenefit.voucherProductName}`
                      : `Benefício do tipo: ${selectedBenefit.type}`}
                  </p>
                )}
                {grantBenefit && !selectedCustomer && (
                  <p className="text-xs text-orange-600 mt-1">
                    Atenção: selecione um cliente cadastrado para conceder o benefício.
                  </p>
                )}
              </div>
            </div>

            {/* Right: Products */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Adicionar Produtos</Label>
                <div className="mt-1 border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {products?.filter((p) => p.isActive && p.stockQty > 0).map((p) => (
                    <button key={p.id} onClick={() => addItem(p)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(parseFloat(p.price))}</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart */}
              <div>
                <Label className="text-xs font-medium">Itens do Pedido</Label>
                <div className="mt-1 border border-border rounded-xl overflow-hidden min-h-[80px]">
                  {orderItems.length === 0 ? (
                    <div className="flex items-center justify-center h-16 text-muted-foreground text-xs">
                      Nenhum item adicionado
                    </div>
                  ) : (
                    orderItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-border/50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity}x {formatCurrency(parseFloat(item.unitPrice))}</p>
                        </div>
                        <p className="text-xs font-semibold">{formatCurrency(parseFloat(item.subtotal))}</p>
                        <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between text-xs text-red-600">
                    <span>Desconto</span><span>-{formatCurrency(discountValue)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1">
                  <span>Total</span><span className="text-green-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewOrder(false); resetNewOrder(); }}>Cancelar</Button>
            <Button onClick={submitOrder} disabled={createOrderMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
              {createOrderMutation.isPending ? "Criando..." : "Criar Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={showEditOrder} onOpenChange={(o) => !o && setShowEditOrder(false)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-4 h-4" /> Editar Pedido #{orderDetail?.orderNumber}
            </DialogTitle>
            <DialogDescription className="sr-only">Editar dados do pedido #{orderDetail?.orderNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-medium">Nome do Cliente</Label>
              <Input
                value={editOrderForm.customerName}
                onChange={(e) => setEditOrderForm((f) => ({ ...f, customerName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Telefone / WhatsApp</Label>
              <Input
                value={editOrderForm.customerPhone}
                onChange={(e) => setEditOrderForm((f) => ({ ...f, customerPhone: maskPhone(e.target.value) }))}
                className="mt-1"
                type="tel"
                maxLength={15}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Endereço de Entrega</Label>
              <Input
                value={editOrderForm.deliveryAddress}
                onChange={(e) => setEditOrderForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Bairro</Label>
              <Input
                value={editOrderForm.neighborhood}
                onChange={(e) => setEditOrderForm((f) => ({ ...f, neighborhood: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Forma de Pagamento</Label>
              <select
                value={editOrderForm.paymentMethod}
                onChange={(e) => setEditOrderForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="dinheiro">💵 Dinheiro</option>
                <option value="pix">📱 Pix</option>
                <option value="debito">💳 Débito</option>
                <option value="credito">💳 Crédito</option>
                <option value="fiado">📝 Fiado</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium">Desconto (R$)</Label>
              <Input
                value={editOrderForm.discount}
                onChange={(e) => setEditOrderForm((f) => ({ ...f, discount: maskCurrency(e.target.value) }))}
                className="mt-1"
                inputMode="decimal"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Observações</Label>
              <Textarea
                value={editOrderForm.notes}
                onChange={(e) => setEditOrderForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditOrder(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!selectedOrder) return;
                updateOrderMutation.mutate({
                  id: selectedOrder,
                  customerName: editOrderForm.customerName,
                  customerPhone: editOrderForm.customerPhone,
                  deliveryAddress: editOrderForm.deliveryAddress,
                  neighborhood: editOrderForm.neighborhood,
                  paymentMethod: editOrderForm.paymentMethod as any,
                  discount: editOrderForm.discount,
                  notes: editOrderForm.notes,
                });
              }}
              disabled={updateOrderMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {updateOrderMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Order Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(o) => !o && setShowDeleteConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Excluir Pedido
            </DialogTitle>
            <DialogDescription className="sr-only">Confirmar exclusão permanente do pedido</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir o pedido{" "}
              <strong className="text-foreground">#{orderDetail?.orderNumber}</strong>?
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => selectedOrder && deleteOrderMutation.mutate({ id: selectedOrder })}
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? "Excluindo..." : "Excluir Permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Items Dialog */}
      <Dialog open={showEditItems} onOpenChange={(o) => !o && setShowEditItems(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-4 h-4" /> Editar Itens — Pedido #{orderDetail?.orderNumber}
            </DialogTitle>
            <DialogDescription className="sr-only">Editar itens do pedido #{orderDetail?.orderNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Adicionar produto existente */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Adicionar Produto</p>
              <div className="border border-border rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                {products?.filter((p) => p.isActive).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const existing = editableItems.findIndex((i) => i.productId === p.id);
                      if (existing >= 0) {
                        setEditableItems((items) => items.map((item, idx) =>
                          idx === existing ? { ...item, quantity: item.quantity + 1 } : item
                        ));
                      } else {
                        setEditableItems((items) => [...items, {
                          productId: p.id,
                          productName: p.name,
                          unitPrice: parseFloat(p.price),
                          quantity: 1,
                        }]);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(parseFloat(p.price))}</p>
                    </div>
                    <PlusCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de itens editáveis */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Itens do Pedido</p>
              <div className="space-y-2">
                {editableItems.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                    Nenhum item. Adicione produtos acima.
                  </div>
                ) : (
                  editableItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} / un.</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditableItems((items) => items.map((i, k) =>
                            k === idx ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i
                          ))}
                          className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"
                        >-</button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => setEditableItems((items) => items.map((i, k) =>
                            k === idx ? { ...i, quantity: i.quantity + 1 } : i
                          ))}
                          className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted text-muted-foreground"
                        >+</button>
                      </div>
                      <p className="text-xs font-semibold w-20 text-right">{formatCurrency(item.unitPrice * item.quantity)}</p>
                      <button
                        onClick={() => setEditableItems((items) => items.filter((_, k) => k !== idx))}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Resumo do novo total */}
            {editableItems.length > 0 && (
              <div className="bg-muted/50 rounded-xl p-3">
                <div className="flex justify-between text-sm font-bold">
                  <span>Novo Total (estimado)</span>
                  <span className="text-green-600">
                    {formatCurrency(editableItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Desconto e taxa de entrega serão mantidos do pedido original.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItems(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!selectedOrder) return;
                updateItemsMutation.mutate({
                  orderId: selectedOrder,
                  items: editableItems,
                });
              }}
              disabled={updateItemsMutation.isPending || editableItems.length === 0}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {updateItemsMutation.isPending ? "Salvando..." : "Salvar Itens"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Dialog */}
      <Dialog open={showAuditLog} onOpenChange={(o) => !o && setShowAuditLog(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico de Alterações — Pedido #{orderDetail?.orderNumber}
            </DialogTitle>
            <DialogDescription className="sr-only">Histórico de alterações do pedido #{orderDetail?.orderNumber}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !auditLogData || auditLogData.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhuma alteração registrada para este pedido.
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogData.map((log) => (
                  <div key={log.id} className="border border-border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{log.action}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {log.userName && (
                      <p className="text-xs text-muted-foreground">Por: <strong>{log.userName}</strong></p>
                    )}
                    {log.changes && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">{log.changes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuditLog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
