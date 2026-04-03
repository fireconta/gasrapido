import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { maskPhone } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Truck, Plus, Edit2, Phone, Mail, Car,
  Wifi, WifiOff, Clock, Search, MoreVertical,
  TrendingUp, Package, DollarSign, UserCheck,
  UserX, Eye, ChevronRight, Star, AlertCircle,
  CheckCircle2, XCircle, RefreshCw, History,
  User, Shield, Activity, ShoppingBag, MessageCircle,
  MapPin, CreditCard, Banknote, Hash, ExternalLink
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AdminLayout from "@/components/AdminLayout";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function formatRelativeTime(d: Date | string | null | undefined) {
  if (!d) return "Nunca";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora mesmo";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-blue-100 text-blue-700" },
  em_preparo: { label: "Em preparo", color: "bg-yellow-100 text-yellow-700" },
  aguardando_entregador: { label: "Aguardando", color: "bg-orange-100 text-orange-700" },
  saiu_entrega: { label: "Em rota", color: "bg-purple-100 text-purple-700" },
  entregue: { label: "Entregue", color: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type DelivererForm = {
  name: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  vehicle: string;
};

const emptyForm: DelivererForm = {
  name: "", phone: "", email: "", username: "", password: "", vehicle: ""
};

// ─── Avatar Component ─────────────────────────────────────────────────────────

function DelivererAvatar({ name, isOnline, size = "md" }: { name: string; isOnline: boolean; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const sizeClass = size === "sm" ? "w-9 h-9 text-xs" : size === "lg" ? "w-16 h-16 text-xl" : "w-12 h-12 text-sm";
  const dotSize = size === "sm" ? "w-2.5 h-2.5" : size === "lg" ? "w-4 h-4" : "w-3 h-3";

  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center font-bold text-white shadow-sm`}>
        {initials}
      </div>
      <span className={`absolute bottom-0 right-0 ${dotSize} rounded-full border-2 border-background ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Entregadores() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ativos");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedDeliverer, setSelectedDeliverer] = useState<any | null>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [reactivateId, setReactivateId] = useState<number | null>(null);
  const [form, setForm] = useState<DelivererForm>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedOrdersDeliverer, setSelectedOrdersDeliverer] = useState<any | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: allDeliverers = [], isLoading, refetch } = trpc.deliverers.list.useQuery({
    onlineOnly: false,
    includeInactive: true,
  });

  const { data: history = [] } = trpc.deliverers.history.useQuery(
    { delivererId: selectedDeliverer?.id ?? 0 },
    { enabled: !!selectedDeliverer }
  );

  const { data: activeOrders = [], isLoading: loadingOrders, refetch: refetchOrders } = trpc.deliverers.activeOrders.useQuery(
    { delivererId: selectedOrdersDeliverer?.id ?? 0 },
    { enabled: !!selectedOrdersDeliverer, refetchInterval: 30000 }
  );

  // Mutations
  const createMutation = trpc.deliverers.create.useMutation({
    onSuccess: () => {
      toast.success("Entregador cadastrado com sucesso!");
      utils.deliverers.list.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(e.message ?? "Erro ao cadastrar entregador"),
  });

  const updateMutation = trpc.deliverers.update.useMutation({
    onSuccess: () => {
      toast.success("Entregador atualizado!");
      utils.deliverers.list.invalidate();
      resetForm();
    },
    onError: (e) => toast.error(e.message ?? "Erro ao atualizar entregador"),
  });

  const deactivateMutation = trpc.deliverers.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Entregador desativado.");
      utils.deliverers.list.invalidate();
      setDeactivateId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const reactivateMutation = trpc.deliverers.reactivate.useMutation({
    onSuccess: () => {
      toast.success("Entregador reativado!");
      utils.deliverers.list.invalidate();
      setReactivateId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Filtered lists
  const activeDeliverers = allDeliverers.filter(d => d.isActive);
  const inactiveDeliverers = allDeliverers.filter(d => !d.isActive);
  const onlineDeliverers = activeDeliverers.filter(d => d.isOnline);

  const filteredActive = activeDeliverers.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone ?? "").includes(search) || (d.email ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredInactive = inactiveDeliverers.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.phone ?? "").includes(search) || (d.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalRevenue = activeDeliverers.reduce((sum, d) => sum + Number(d.totalRevenue ?? 0), 0);
  const totalDeliveries = activeDeliverers.reduce((sum, d) => sum + Number(d.totalDeliveries ?? 0), 0);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setShowPassword(false);
  }

  function openEdit(d: any) {
    setForm({ name: d.name, phone: d.phone ?? "", email: d.email ?? "", username: d.username ?? "", password: "", vehicle: d.vehicle ?? "" });
    setEditingId(d.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) {
      toast.error("Preencha nome e usuário de login");
      return;
    }
    if (!editingId && (!form.password || form.password.length < 6)) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (editingId) {
      const data: any = { id: editingId, name: form.name, phone: form.phone || undefined, email: form.email || undefined, username: form.username || undefined, vehicle: form.vehicle || undefined };
      if (form.password) data.password = form.password;
      updateMutation.mutate(data);
    } else {
      createMutation.mutate({ name: form.name, phone: form.phone || undefined, email: form.email || undefined, username: form.username, password: form.password, vehicle: form.vehicle || undefined });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout title="Entregadores">
      <div className="space-y-6">

        {/* ─── Stats Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border kpi-gradient-blue p-5 transition-all duration-200 hover:-translate-y-1" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Total</p>
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-[28px] font-extrabold text-foreground leading-none">{activeDeliverers.length}</p>
            <p className="text-xs text-muted-foreground mt-1.5">entregadores ativos</p>
          </div>

          <div className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 ${onlineDeliverers.length > 0 ? "kpi-gradient-green border-emerald-200" : "kpi-gradient-blue"}`} style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Online</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${onlineDeliverers.length > 0 ? "bg-emerald-100" : "bg-blue-100"}`}>
                <Activity className={`w-4 h-4 ${onlineDeliverers.length > 0 ? "text-emerald-600" : "text-blue-600"}`} />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <p className={`text-[28px] font-extrabold leading-none ${onlineDeliverers.length > 0 ? "text-emerald-700" : "text-foreground"}`}>{onlineDeliverers.length}</p>
              {onlineDeliverers.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mb-1.5" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">disponíveis agora</p>
          </div>

          <div className="rounded-2xl border kpi-gradient-orange p-5 transition-all duration-200 hover:-translate-y-1" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Entregas</p>
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                <Package className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <p className="text-[28px] font-extrabold text-foreground leading-none">{totalDeliveries}</p>
            <p className="text-xs text-muted-foreground mt-1.5">total realizadas</p>
          </div>

          <div className="rounded-2xl border kpi-gradient-green p-5 transition-all duration-200 hover:-translate-y-1" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Receita</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-[28px] font-extrabold text-emerald-700 leading-none">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1.5">total movimentado</p>
          </div>
        </div>

        {/* ─── Header Actions ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </Button>
            <Button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-primary hover:bg-primary/90 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Entregador
            </Button>
          </div>
        </div>

        {/* ─── Tabs ─────────────────────────────────────────────────────── */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="ativos" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Ativos
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 ml-0.5">{activeDeliverers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inativos" className="gap-2">
              <UserX className="w-4 h-4" />
              Inativos
              {inactiveDeliverers.length > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 ml-0.5">{inactiveDeliverers.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ─── Ativos ─────────────────────────────────────────────────── */}
          <TabsContent value="ativos" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filteredActive.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <Truck className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">Nenhum entregador encontrado</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {search ? "Tente outro termo de busca" : "Cadastre seu primeiro entregador"}
                    </p>
                  </div>
                  {!search && (
                    <Button
                      onClick={() => { resetForm(); setShowForm(true); }}
                      className="mt-2 gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Cadastrar Entregador
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredActive.map((d) => (
                  <DelivererCard
                    key={d.id}
                    deliverer={d}
                    onEdit={() => openEdit(d)}
                    onViewHistory={() => setSelectedDeliverer(d)}
                    onViewOrders={() => setSelectedOrdersDeliverer(d)}
                    onDeactivate={() => setDeactivateId(d.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Inativos ───────────────────────────────────────────────── */}
          <TabsContent value="inativos" className="mt-4">
            {filteredInactive.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 gap-2">
                  <CheckCircle2 className="w-10 h-10 text-green-500/40" />
                  <p className="text-muted-foreground text-sm">Nenhum entregador inativo</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredInactive.map((d) => (
                  <DelivererCard
                    key={d.id}
                    deliverer={d}
                    inactive
                    onEdit={() => openEdit(d)}
                    onViewHistory={() => setSelectedDeliverer(d)}
                    onViewOrders={() => setSelectedOrdersDeliverer(d)}
                    onReactivate={() => setReactivateId(d.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Form Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
              {editingId ? "Editar Entregador" : "Novo Entregador"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize os dados do entregador. Deixe a senha em branco para mantê-la."
                : "Preencha os dados para cadastrar um novo entregador."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Avatar preview */}
            {form.name && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <DelivererAvatar name={form.name} isOnline={false} />
                <div>
                  <p className="font-semibold text-sm">{form.name}</p>
                  <p className="text-xs text-muted-foreground">{form.vehicle || "Veículo não informado"}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-sm font-medium mb-1.5 block">
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  Nome Completo *
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: João da Silva"
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  <Phone className="w-3.5 h-3.5 inline mr-1" />
                  Telefone / WhatsApp *
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                  placeholder="(64) 99999-9999"
                  type="tel"
                  inputMode="tel"
                  maxLength={15}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  <Car className="w-3.5 h-3.5 inline mr-1" />
                  Veículo
                </Label>
                <Input
                  value={form.vehicle}
                  onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                  placeholder="Moto, Carro..."
                />
              </div>

              <div className="col-span-2">
                <Label className="text-sm font-medium mb-1.5 block">
                  <Mail className="w-3.5 h-3.5 inline mr-1" />
                  Email
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-sm font-medium mb-1.5 block">
                  <Shield className="w-3.5 h-3.5 inline mr-1" />
                  Usuário de Login *
                </Label>
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                  placeholder="Ex: joao.silva"
                />
                <p className="text-xs text-muted-foreground mt-1">Usado para acessar o painel do entregador</p>
              </div>

              <div className="col-span-2">
                <Label className="text-sm font-medium mb-1.5 block">
                  <Shield className="w-3.5 h-3.5 inline mr-1" />
                  Senha {editingId ? "(deixe em branco para manter)" : "*"}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingId ? "Nova senha (opcional)" : "Mínimo 6 caracteres"}
                    className="pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                {!editingId && form.password && form.password.length < 6 && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Mínimo 6 caracteres
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white gap-2"
                disabled={isPending}
              >
                {isPending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> {editingId ? "Salvar Alterações" : "Cadastrar"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── History Dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!selectedDeliverer} onOpenChange={(o) => { if (!o) setSelectedDeliverer(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedDeliverer && (
                <DelivererAvatar name={selectedDeliverer.name} isOnline={selectedDeliverer.isOnline} />
              )}
              <div>
                <p className="font-bold">{selectedDeliverer?.name}</p>
                <p className="text-sm font-normal text-muted-foreground">{selectedDeliverer?.vehicle || "Veículo não informado"}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Stats do entregador */}
          {selectedDeliverer && (
            <div className="grid grid-cols-3 gap-3 py-2">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-foreground">{selectedDeliverer.totalDeliveries ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total entregas</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-green-700">{selectedDeliverer.completedOrders ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Concluídas</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-blue-700">{formatCurrency(selectedDeliverer.totalRevenue ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Receita total</p>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <p className="font-semibold text-sm">Histórico de Entregas</p>
            <Badge variant="secondary" className="text-xs">{history.length}</Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {history.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Nenhuma entrega registrada</p>
              </div>
            ) : (
              history.map((o: any) => {
                const statusInfo = STATUS_LABELS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <div key={o.id} className="flex items-center justify-between p-3 bg-muted/40 hover:bg-muted/70 rounded-xl text-sm transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-foreground">#{o.orderNumber}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{o.customerName} · {o.deliveryAddress}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(o.createdAt)}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="font-bold text-green-600">{formatCurrency(o.total)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Deactivate Confirm ───────────────────────────────────────────── */}
      <AlertDialog open={!!deactivateId} onOpenChange={(o) => !o && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Desativar entregador?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O entregador será desativado e não poderá mais fazer login. Você pode reativá-lo a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deactivateId && deactivateMutation.mutate({ id: deactivateId })}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Active Orders Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!selectedOrdersDeliverer} onOpenChange={(o) => { if (!o) setSelectedOrdersDeliverer(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedOrdersDeliverer && (
                <DelivererAvatar name={selectedOrdersDeliverer.name} isOnline={selectedOrdersDeliverer.isOnline} />
              )}
              <div>
                <p className="font-bold">{selectedOrdersDeliverer?.name}</p>
                <p className="text-sm font-normal text-muted-foreground">Pedidos a entregar</p>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto" onClick={() => refetchOrders()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
            {loadingOrders ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Nenhum pedido pendente</p>
                  <p className="text-sm text-muted-foreground mt-1">Este entregador não tem entregas ativas no momento</p>
                </div>
              </div>
            ) : (
              activeOrders.map((order: any) => {
                const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
                const whatsappUrl = order.customerPhone
                  ? `https://wa.me/55${order.customerPhone.replace(/\D/g, "")}?text=Ol%C3%A1%20${encodeURIComponent(order.customerName ?? "")}%2C%20estou%20a%20caminho%20com%20seu%20pedido%20%23${order.orderNumber}!`
                  : null;
                const paymentLabels: Record<string, { label: string; icon: React.ReactNode }> = {
                  dinheiro: { label: "Dinheiro", icon: <Banknote className="w-3.5 h-3.5" /> },
                  pix: { label: "PIX", icon: <CreditCard className="w-3.5 h-3.5" /> },
                  debito: { label: "Débito", icon: <CreditCard className="w-3.5 h-3.5" /> },
                  credito: { label: "Crédito", icon: <CreditCard className="w-3.5 h-3.5" /> },
                  fiado: { label: "Fiado", icon: <Hash className="w-3.5 h-3.5" /> },
                };
                const payment = paymentLabels[order.paymentMethod] ?? { label: order.paymentMethod, icon: null };

                return (
                  <div key={order.id} className="border border-border/60 rounded-xl overflow-hidden shadow-sm">
                    {/* Header do pedido */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">#{order.orderNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600 text-sm">
                          {formatCurrency(order.total)}
                        </span>
                        {whatsappUrl && (
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="h-7 px-2.5 bg-green-500 hover:bg-green-600 text-white gap-1.5 text-xs font-semibold">
                              <MessageCircle className="w-3.5 h-3.5" />
                              WhatsApp
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Dados do cliente e entrega */}
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-foreground">{order.customerName ?? "Cliente"}</span>
                          {order.customerPhone && (
                            <span className="text-muted-foreground ml-2">{order.customerPhone}</span>
                          )}
                        </div>
                      </div>

                      {order.deliveryAddress && (
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {order.deliveryAddress}
                            {order.neighborhood && ` — ${order.neighborhood}`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="flex items-center gap-1 text-muted-foreground">
                          {payment.icon}
                          Pagamento: <strong className="text-foreground">{payment.label}</strong>
                          {order.paymentConfirmed && (
                            <span className="ml-1 text-xs text-green-600 font-semibold">✔ Confirmado</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Itens do pedido */}
                    {order.items && order.items.length > 0 && (
                      <div className="px-4 pb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Itens ({order.items.length})
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          {order.items.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-2.5">
                                {item.productImageUrl ? (
                                  <img
                                    src={item.productImageUrl}
                                    alt={item.productName}
                                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-border/60"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-muted-foreground/50" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-foreground leading-tight">{item.productName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(item.unitPrice)} × {item.quantity}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="text-sm font-bold text-foreground">
                                  {formatCurrency(item.subtotal)}
                                </span>
                                <div className="text-xs text-primary font-bold">
                                  {item.quantity}x
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {activeOrders.length > 0 && (
            <div className="pt-3 border-t border-border/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {activeOrders.length} pedido{activeOrders.length !== 1 ? "s" : ""} pendente{activeOrders.length !== 1 ? "s" : ""}
                </span>
                <span className="font-bold text-green-600">
                  Total: {formatCurrency(activeOrders.reduce((sum: number, o: any) => sum + Number(o.total), 0))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Reactivate Confirm ────────────────────────────────────────────────────── */}
      <AlertDialog open={!!reactivateId} onOpenChange={(o) => !o && setReactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Reativar entregador?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O entregador poderá fazer login novamente e receber pedidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-500 hover:bg-green-600"
              onClick={() => reactivateId && reactivateMutation.mutate({ id: reactivateId })}
            >
              Reativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

// ─── Deliverer Card Component ─────────────────────────────────────────────────

function DelivererCard({
  deliverer: d,
  inactive = false,
  onEdit,
  onViewHistory,
  onViewOrders,
  onDeactivate,
  onReactivate,
}: {
  deliverer: any;
  inactive?: boolean;
  onEdit: () => void;
  onViewHistory: () => void;
  onViewOrders: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
}) {
  return (
    <div className={`rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-md ${
      inactive
        ? "opacity-60 border-border bg-card"
        : d.isOnline
        ? "border-emerald-200 bg-gradient-to-r from-emerald-50/60 to-card"
        : "border-border bg-card"
    }`} style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.05)" }}>
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <DelivererAvatar name={d.name} isOnline={d.isOnline && !inactive} size="md" />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <p className="font-bold text-foreground truncate">{d.name}</p>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                inactive
                  ? "bg-gray-100 text-gray-500"
                  : d.isOnline
                  ? "status-online"
                  : "status-offline"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  inactive ? "bg-gray-400" : d.isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                }`} />
                {inactive ? "Inativo" : d.isOnline ? "Online" : "Offline"}
              </span>
              {d.activeOrders > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  {d.activeOrders} em rota
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {d.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {d.phone}
                </span>
              )}
              {d.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {d.email}
                </span>
              )}
              {d.vehicle && (
                <span className="flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  {d.vehicle}
                </span>
              )}
              <span className={`flex items-center gap-1 ${d.isOnline && !inactive ? "text-emerald-600 font-medium" : ""}`}>
                <Clock className="w-3 h-3" />
                {d.isOnline && !inactive ? "Online agora" : `Visto ${formatRelativeTime(d.lastSeen)}`}
              </span>
            </div>
          </div>

          {/* Stats (desktop) */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <div className="text-center rounded-xl px-4 py-2.5 kpi-gradient-blue border">
              <p className="text-xl font-black text-foreground">{d.totalDeliveries ?? 0}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Entregas</p>
            </div>
            <div className="text-center rounded-xl px-4 py-2.5 kpi-gradient-green border">
              <p className="text-lg font-black text-emerald-700">{formatCurrency(d.totalRevenue ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground font-medium">Receita</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewOrders}
              className="text-xs gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 hidden sm:flex"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Pedidos
              {d.activeOrders > 0 && (
                <span className="w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center font-black">
                  {d.activeOrders}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewHistory}
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground hidden sm:flex"
            >
              <History className="w-3.5 h-3.5" />
              Histórico
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onViewOrders} className="gap-2 text-orange-600 focus:text-orange-600">
                  <ShoppingBag className="w-4 h-4" />
                  Ver pedidos ativos
                  {d.activeOrders > 0 && (
                    <Badge className="ml-auto bg-orange-100 text-orange-700 text-xs px-1.5 py-0 h-4">{d.activeOrders}</Badge>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onViewHistory} className="gap-2">
                  <History className="w-4 h-4" />
                  Ver histórico
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit} className="gap-2">
                  <Edit2 className="w-4 h-4" />
                  Editar dados
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {inactive ? (
                  <DropdownMenuItem onClick={onReactivate} className="gap-2 text-green-600 focus:text-green-600">
                    <UserCheck className="w-4 h-4" />
                    Reativar entregador
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onDeactivate} className="gap-2 text-red-500 focus:text-red-500">
                    <UserX className="w-4 h-4" />
                    Desativar entregador
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile stats */}
        <div className="flex lg:hidden gap-4 mt-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="w-3.5 h-3.5" />
            <span><strong className="text-foreground">{d.totalDeliveries ?? 0}</strong> entregas</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            <span><strong className="text-green-600">{formatCurrency(d.totalRevenue ?? 0)}</strong></span>
          </div>
          {d.activeOrders > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-orange-600">
              <Truck className="w-3.5 h-3.5" />
              <span><strong>{d.activeOrders}</strong> em rota</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

