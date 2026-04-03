import { useState, useRef, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Gift, Plus, Edit2, Trash2, Star, Tag, Truck,
  Package, Zap, Users, TrendingUp, CheckCircle2,
  XCircle, ToggleLeft, ToggleRight, Search, Award,
  ChevronDown, ChevronUp, Flame, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  desconto:     { label: "Desconto",      icon: <Tag className="w-4 h-4" />,      color: "text-blue-600",   bg: "bg-blue-50" },
  vale_gas:     { label: "Vale Gás",      icon: <Flame className="w-4 h-4" />,    color: "text-orange-600", bg: "bg-orange-50" },
  frete_gratis: { label: "Frete Grátis",  icon: <Truck className="w-4 h-4" />,    color: "text-green-600",  bg: "bg-green-50" },
  brinde:       { label: "Brinde",        icon: <Gift className="w-4 h-4" />,     color: "text-purple-600", bg: "bg-purple-50" },
  outro:        { label: "Outro",         icon: <Star className="w-4 h-4" />,     color: "text-gray-600",   bg: "bg-gray-50" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente:  { label: "Pendente",  color: "bg-yellow-100 text-yellow-700" },
  ativo:     { label: "Ativo",     color: "bg-green-100 text-green-700" },
  usado:     { label: "Usado",     color: "bg-gray-100 text-gray-600" },
  expirado:  { label: "Expirado",  color: "bg-red-100 text-red-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

const EMPTY_FORM = {
  name: "",
  description: "",
  type: "outro" as "desconto" | "vale_gas" | "frete_gratis" | "brinde" | "outro",
  discountType: "fixo" as const,
  discountValue: 0,
  voucherProductName: "",
  isActive: true,
  requiresMinOrder: 0,
  maxUsesPerCustomer: 1,
  notes: "",
};

const DISCOUNT_PRESETS = [5, 10, 15, 20, 30];

export default function Beneficios() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("beneficios");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [grantSearch, setGrantSearch] = useState("");
  const [grantStatusFilter, setGrantStatusFilter] = useState("todos");

  // ─── Concessão direta a cliente ─────────────────────────────────────────
  const [showGrant, setShowGrant] = useState(false);
  const [grantBenefitId, setGrantBenefitId] = useState<number | null>(null);
  const [grantBenefitName, setGrantBenefitName] = useState("");
  const [grantCustomerSearch, setGrantCustomerSearch] = useState("");
  const [grantCustomerId, setGrantCustomerId] = useState<number | null>(null);
  const [grantCustomerName, setGrantCustomerName] = useState("");
  const [showGrantDropdown, setShowGrantDropdown] = useState(false);
  const grantDropdownRef = useRef<HTMLDivElement>(null);

  const { data: grantCustomerResults = [], isFetching: searchingGrantCustomers } = trpc.customers.search.useQuery(
    { search: grantCustomerSearch },
    { enabled: grantCustomerSearch.length >= 2 }
  );

  const utils = trpc.useUtils();

  // Produtos ativos do banco para o select do vale gás
  const { data: productsList = [] } = trpc.products.list.useQuery({});

  useEffect(() => {
    if (productsList.length > 0 && form.type === "vale_gas" && !form.voucherProductName) {
      setForm(f => ({ ...f, voucherProductName: productsList[0].name }));
    }
  }, [productsList, form.type]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (grantDropdownRef.current && !grantDropdownRef.current.contains(e.target as Node)) {
        setShowGrantDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: benefitsList = [], isLoading } = trpc.benefits.list.useQuery({ search: search || undefined });
  const { data: stats } = trpc.benefits.stats.useQuery();
  const { data: grants = [] } = trpc.benefits.listCustomerBenefits.useQuery({
    search: grantSearch || undefined,
    status: grantStatusFilter !== "todos" ? grantStatusFilter : undefined,
    limit: 100,
  });

  const createMutation = trpc.benefits.create.useMutation({
    onSuccess: () => { toast.success("Benefício criado!"); utils.benefits.list.invalidate(); utils.benefits.stats.invalidate(); closeForm(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.benefits.update.useMutation({
    onSuccess: () => { toast.success("Benefício atualizado!"); utils.benefits.list.invalidate(); closeForm(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.benefits.delete.useMutation({
    onSuccess: () => { toast.success("Benefício removido!"); utils.benefits.list.invalidate(); utils.benefits.stats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const grantMutation = trpc.benefits.grantToCustomer.useMutation({
    onSuccess: () => {
      toast.success(`Benefício concedido a ${grantCustomerName}!`);
      utils.benefits.listCustomerBenefits.invalidate();
      utils.benefits.stats.invalidate();
      setShowGrant(false);
      setGrantCustomerSearch("");
      setGrantCustomerId(null);
      setGrantCustomerName("");
    },
    onError: (e) => toast.error(e.message),
  });

  function openCreate() {
    setForm({ ...EMPTY_FORM, voucherProductName: productsList[0]?.name ?? "" });
    setEditingId(null);
    setShowForm(true);
  }

  function openGrant(b: any) {
    setGrantBenefitId(b.id);
    setGrantBenefitName(b.name);
    setGrantCustomerSearch("");
    setGrantCustomerId(null);
    setGrantCustomerName("");
    setShowGrant(true);
  }

  function openEdit(b: any) {
    setForm({
      name: b.name,
      description: b.description ?? "",
      type: b.type,
      discountType: b.discountType ?? "fixo",
      discountValue: parseFloat(b.discountValue ?? "0"),
      voucherProductName: b.voucherProductName ?? "Botijão P13 (13kg)",
      isActive: b.isActive,
      requiresMinOrder: parseFloat(b.requiresMinOrder ?? "0"),
      maxUsesPerCustomer: b.maxUsesPerCustomer ?? 1,
      notes: b.notes ?? "",
    });
    setEditingId(b.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function submitForm() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleGrant() {
    if (!grantBenefitId) return;
    if (!grantCustomerId && !grantCustomerName.trim()) { toast.error("Selecione ou informe o cliente"); return; }
    grantMutation.mutate({
      benefitId: grantBenefitId,
      customerId: grantCustomerId ?? undefined,
      customerName: grantCustomerName,
    });
  }

  return (
    <AdminLayout title="Benefícios">
      <div className="space-y-5">

        {/* ─── Stats ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Benefícios Ativos", value: stats?.activeBenefits ?? 0, icon: <Gift className="w-5 h-5" />, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Total Concedidos", value: stats?.totalGranted ?? 0, icon: <Users className="w-5 h-5" />, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Ativos (clientes)", value: stats?.activeGrants ?? 0, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-green-600", bg: "bg-green-50" },
            { label: "Vale Gás Ativos", value: stats?.activeVouchers ?? 0, icon: <Flame className="w-5 h-5" />, color: "text-orange-600", bg: "bg-orange-50" },
          ].map((s, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0 ${s.color}`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── Tabs ──────────────────────────────────────────────────────── */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <TabsList className="h-9">
              <TabsTrigger value="beneficios" className="text-xs">Benefícios</TabsTrigger>
              <TabsTrigger value="concedidos" className="text-xs">Concedidos a Clientes</TabsTrigger>
            </TabsList>
            {tab === "beneficios" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar benefício..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-white gap-2 h-9 text-sm">
                  <Plus className="w-4 h-4" /> Novo Benefício
                </Button>
              </div>
            )}
            {tab === "concedidos" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar cliente..." className="pl-9 h-9 text-sm" value={grantSearch} onChange={(e) => setGrantSearch(e.target.value)} />
                </div>
                <select
                  value={grantStatusFilter}
                  onChange={(e) => setGrantStatusFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativos</option>
                  <option value="usado">Usados</option>
                  <option value="expirado">Expirados</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </div>
            )}
          </div>

          {/* ─── Tab: Benefícios ─────────────────────────────────────────── */}
          <TabsContent value="beneficios" className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : benefitsList.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">Nenhum benefício cadastrado</p>
                <Button onClick={openCreate} className="mt-4 bg-primary text-white gap-2">
                  <Plus className="w-4 h-4" /> Criar primeiro benefício
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {benefitsList.map((b) => {
                  const typeInfo = TYPE_LABELS[b.type] ?? TYPE_LABELS.outro;
                  return (
                    <Card key={b.id} className={`border-border/60 relative overflow-hidden ${!b.isActive ? "opacity-60" : ""}`}>
                      {/* Barra lateral colorida */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${b.type === "vale_gas" ? "bg-orange-400" : b.type === "desconto" ? "bg-blue-400" : b.type === "frete_gratis" ? "bg-green-400" : b.type === "brinde" ? "bg-purple-400" : "bg-gray-400"}`} />
                      <CardContent className="p-4 pl-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-9 h-9 rounded-xl ${typeInfo.bg} flex items-center justify-center flex-shrink-0 ${typeInfo.color}`}>
                              {typeInfo.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{b.name}</p>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                            </div>
                          </div>
                          <Badge variant={b.isActive ? "default" : "secondary"} className="text-[10px] flex-shrink-0">
                            {b.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>

                        {b.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{b.description}</p>
                        )}

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {b.type === "desconto" && (
                            <div className="bg-muted/40 rounded-lg p-2 text-center">
                              <p className="text-xs text-muted-foreground">Desconto</p>
                              <p className="text-sm font-bold text-blue-600">
                                {b.discountType === "percentual" ? `${b.discountValue}%` : formatCurrency(b.discountValue ?? 0)}
                              </p>
                            </div>
                          )}
                          {b.type === "vale_gas" && (
                            <div className="bg-orange-50 rounded-lg p-2 text-center col-span-2">
                              <p className="text-xs text-muted-foreground">Produto do Vale</p>
                              <p className="text-sm font-bold text-orange-600">{b.voucherProductName ?? "Botijão P13"}</p>
                            </div>
                          )}
                          <div className="bg-muted/40 rounded-lg p-2 text-center">
                            <p className="text-xs text-muted-foreground">Usos</p>
                            <p className="text-sm font-bold text-foreground">{b.totalUses}</p>
                          </div>
                          {parseFloat(b.requiresMinOrder ?? "0") > 0 && (
                            <div className="bg-muted/40 rounded-lg p-2 text-center">
                              <p className="text-xs text-muted-foreground">Mín. pedido</p>
                              <p className="text-sm font-bold text-foreground">{formatCurrency(b.requiresMinOrder ?? 0)}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-8 text-xs text-primary border-primary/30 hover:bg-primary/5"
                            onClick={() => openGrant(b)}>
                            <Users className="w-3.5 h-3.5" /> Conceder
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openEdit(b)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { if (confirm("Remover este benefício?")) deleteMutation.mutate({ id: b.id }); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── Tab: Concedidos ─────────────────────────────────────────── */}
          <TabsContent value="concedidos" className="mt-4">
            {grants.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">Nenhum benefício concedido ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Conceda benefícios ao criar ou editar um pedido</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Cliente</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Benefício</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Concedido em</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Usado em</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grants.map((g) => {
                        const statusInfo = STATUS_LABELS[g.status] ?? STATUS_LABELS.ativo;
                        return (
                          <tr key={g.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{g.customerName ?? "—"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-foreground">{g.benefitName ?? "—"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {g.grantedAt ? new Date(g.grantedAt).toLocaleDateString("pt-BR") : "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {g.usedAt ? new Date(g.usedAt).toLocaleDateString("pt-BR") : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      {/* ─── Modal: Conceder Benefício a Cliente ────────────────────────────── */}
      <Dialog open={showGrant} onOpenChange={(o) => { if (!o) { setShowGrant(false); setGrantCustomerSearch(""); setGrantCustomerId(null); setGrantCustomerName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Conceder Benefício
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/40 rounded-xl p-3 text-sm">
              <p className="text-xs text-muted-foreground">Benefício selecionado</p>
              <p className="font-bold text-foreground mt-0.5">{grantBenefitName}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1 mb-1">
                <Search className="w-3.5 h-3.5" /> Buscar Cliente Cadastrado
              </Label>
              <div className="relative" ref={grantDropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={grantCustomerSearch}
                    onChange={(e) => {
                      setGrantCustomerSearch(e.target.value);
                      setShowGrantDropdown(true);
                      if (!e.target.value) { setGrantCustomerId(null); setGrantCustomerName(""); }
                    }}
                    onFocus={() => grantCustomerSearch.length >= 2 && setShowGrantDropdown(true)}
                    className="pl-9 text-sm"
                  />
                </div>
                {showGrantDropdown && grantCustomerSearch.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {searchingGrantCustomers ? (
                      <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
                      </div>
                    ) : grantCustomerResults.length > 0 ? (
                      <div className="divide-y divide-border">
                        {grantCustomerResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setGrantCustomerId(c.id);
                              setGrantCustomerName(c.name);
                              setGrantCustomerSearch(c.name);
                              setShowGrantDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors"
                          >
                            <div className="font-medium text-sm">{c.name}</div>
                            {c.phone && <div className="text-xs text-muted-foreground">📱 {c.phone}</div>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground text-center">Nenhum cliente encontrado</div>
                    )}
                  </div>
                )}
              </div>
              {grantCustomerId && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cliente vinculado ao cadastro
                </div>
              )}
            </div>
            {!grantCustomerId && (
              <div>
                <Label className="text-xs font-medium mb-1 block">Ou informe o nome manualmente</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={grantCustomerName}
                  onChange={(e) => setGrantCustomerName(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrant(false)}>Cancelar</Button>
            <Button
              onClick={handleGrant}
              disabled={grantMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {grantMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Concedendo...</span>
              ) : "Conceder Benefício"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Criar/Editar Benefício ───────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Benefício" : "Novo Benefício"}</DialogTitle>
          </DialogHeader>          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Nome do Benefício *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Gás do Povo, Desconto Fidelidade..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o benefício..." className="mt-1 resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Tipo</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vale_gas">Vale Gás</SelectItem>
                    <SelectItem value="desconto">Desconto</SelectItem>
                    <SelectItem value="frete_gratis">Frete Grátis</SelectItem>
                    <SelectItem value="brinde">Brinde</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Status</Label>
                <Select value={form.isActive ? "ativo" : "inativo"} onValueChange={(v) => setForm(f => ({ ...f, isActive: v === "ativo" }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === "desconto" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium">Tipo de Desconto</Label>
                    <Select value={form.discountType} onValueChange={(v: any) => setForm(f => ({ ...f, discountType: v }))}>
                      <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                        <SelectItem value="percentual">Percentual (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Valor do Desconto</Label>
                    <Input type="number" min="0" value={form.discountValue} onChange={(e) => setForm(f => ({ ...f, discountValue: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                  </div>
                </div>
                {form.discountType === "percentual" && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Presets rápidos</Label>
                    <div className="flex gap-2">
                      {DISCOUNT_PRESETS.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, discountValue: p }))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            form.discountValue === p
                              ? "bg-blue-500 text-white border-blue-500"
                              : "border-border text-muted-foreground hover:border-blue-300"
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.type === "vale_gas" && (
              <div>
                <Label className="text-xs font-medium flex items-center gap-1 mb-1">
                  <Package className="w-3.5 h-3.5" /> Produto do Vale Gás
                </Label>
                <Select
                  value={form.voucherProductName}
                  onValueChange={(v) => setForm(f => ({ ...f, voucherProductName: v }))}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                  <SelectContent>
                    {productsList.length === 0 ? (
                      <SelectItem value="" disabled>Carregando produtos...</SelectItem>
                    ) : (
                      productsList.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name} — R$ {parseFloat(p.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Pedido Mínimo (R$)</Label>
                <Input type="number" min="0" value={form.requiresMinOrder} onChange={(e) => setForm(f => ({ ...f, requiresMinOrder: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Usos por Cliente</Label>
                <Input type="number" min="1" value={form.maxUsesPerCustomer} onChange={(e) => setForm(f => ({ ...f, maxUsesPerCustomer: parseInt(e.target.value) || 1 }))} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas internas..." className="mt-1 resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancelar</Button>
            <Button onClick={submitForm} disabled={isPending} className="bg-primary hover:bg-primary/90 text-white">
              {isPending ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Benefício"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
