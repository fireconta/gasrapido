import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Flame, Plus, Search, CheckCircle2, XCircle,
  Copy, Gift, TrendingUp, AlertCircle, Loader2,
  User, Phone, Package, Calendar, X, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskPhone } from "@/lib/masks";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ativo:     { label: "Ativo",     color: "bg-green-100 text-green-700 border-green-200",   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  usado:     { label: "Usado",     color: "bg-gray-100 text-gray-600 border-gray-200",      icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  expirado:  { label: "Expirado",  color: "bg-red-100 text-red-600 border-red-200",         icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200",         icon: <XCircle className="w-3.5 h-3.5" /> },
};

const EMPTY_FORM = {
  customerName: "",
  customerPhone: "",
  customerId: undefined as number | undefined,
  productId: undefined as number | undefined,
  productName: "",
  expiresInDays: 30,
  notes: "",
};

export default function ValeGas() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showIssue, setShowIssue] = useState(false);
  const [showUse, setShowUse] = useState(false);
  const [useCode, setUseCode] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [lastIssued, setLastIssued] = useState<{ code: string; customerName: string; productName: string } | null>(null);

  // ─── Busca de clientes no modal ──────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const { data: customerResults = [], isFetching: searchingCustomers } = trpc.customers.search.useQuery(
    { search: customerSearch },
    { enabled: customerSearch.length >= 2 }
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectCustomer(c: typeof customerResults[0]) {
    setForm(f => ({
      ...f,
      customerId: c.id,
      customerName: c.name,
      customerPhone: maskPhone((c.phone ?? c.whatsapp ?? "") as string),
    }));
    setCustomerSearch(c.name);
    setShowCustomerDropdown(false);
  }

  function clearCustomerSelection() {
    setForm(f => ({ ...f, customerId: undefined, customerName: "", customerPhone: "" }));
    setCustomerSearch("");
  }

  const utils = trpc.useUtils();

  // Produtos ativos
  const { data: productsList = [] } = trpc.products.list.useQuery({});

  useEffect(() => {
    if (productsList.length > 0 && !form.productId) {
      const first = productsList[0];
      setForm(f => ({ ...f, productId: first.id, productName: first.name }));
    }
  }, [productsList]);

  const { data: vouchers = [], isLoading } = trpc.gasVouchers.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "todos" ? statusFilter : undefined,
    limit: 200,
  });

  const { data: stats } = trpc.gasVouchers.stats.useQuery();

  const issueMutation = trpc.gasVouchers.issue.useMutation({
    onSuccess: (data) => {
      toast.success(`Vale Gás emitido! Código: ${data.code}`);
      setLastIssued({ code: data.code, customerName: form.customerName, productName: form.productName });
      utils.gasVouchers.list.invalidate();
      utils.gasVouchers.stats.invalidate();
      setForm({ ...EMPTY_FORM });
      setCustomerSearch("");
      setShowIssue(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const useMutation = trpc.gasVouchers.use.useMutation({
    onSuccess: () => {
      toast.success("Vale gás marcado como usado!");
      utils.gasVouchers.list.invalidate();
      utils.gasVouchers.stats.invalidate();
      setShowUse(false);
      setUseCode("");
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.gasVouchers.cancel.useMutation({
    onSuccess: () => {
      toast.success("Vale gás cancelado.");
      utils.gasVouchers.list.invalidate();
      utils.gasVouchers.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  }

  function handleIssue() {
    if (!form.customerName.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    if (!form.productName) { toast.error("Selecione um produto"); return; }
    issueMutation.mutate({
      customerId: form.customerId,
      customerName: form.customerName,
      customerPhone: form.customerPhone || undefined,
      productId: form.productId,
      productName: form.productName,
      expiresInDays: form.expiresInDays,
      notes: form.notes || undefined,
    });
  }

  // Estatísticas exibidas
  const statsCards = [
    { label: "Total Emitidos", value: stats?.total ?? 0, icon: <Gift className="w-5 h-5" />, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Ativos", value: stats?.active ?? 0, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-green-600", bg: "bg-green-50" },
    { label: "Usados", value: stats?.used ?? 0, icon: <TrendingUp className="w-5 h-5" />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Emitidos Hoje", value: stats?.issuedToday ?? 0, icon: <Flame className="w-5 h-5" />, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <AdminLayout title="Vale Gás">
      <div className="space-y-5">

        {/* ─── Stats ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((s, i) => (
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

        {/* ─── Último Vale Emitido ─────────────────────────────────────────── */}
        {lastIssued && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-orange-800">Último Vale Emitido</p>
                <p className="text-xs text-orange-700">{lastIssued.customerName} — {lastIssued.productName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-lg font-black text-orange-700 bg-white border border-orange-200 px-3 py-1.5 rounded-xl tracking-widest">
                {lastIssued.code}
              </code>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-100"
                onClick={() => copyCode(lastIssued.code)}>
                <Copy className="w-3.5 h-3.5" /> Copiar
              </Button>
              <Button variant="ghost" size="sm" className="h-9 text-orange-600" onClick={() => setLastIssued(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Toolbar ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar código ou cliente..."
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="usado">Usados</option>
              <option value="expirado">Expirados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUse(true)} className="gap-2 h-9 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Dar Baixa
            </Button>
            <Button onClick={() => setShowIssue(true)} className="bg-orange-500 hover:bg-orange-600 text-white gap-2 h-9 text-sm">
              <Plus className="w-4 h-4" /> Emitir Vale Gás
            </Button>
          </div>
        </div>

        {/* ─── Lista de Vouchers ───────────────────────────────────────────── */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
              <Flame className="w-8 h-8 text-orange-300" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhum vale gás encontrado</p>
            <Button onClick={() => setShowIssue(true)} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white gap-2">
              <Plus className="w-4 h-4" /> Emitir primeiro vale gás
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Código</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Produto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Emitido em</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Validade</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => {
                    const sc = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.ativo;
                    const isExpiringSoon = v.status === "ativo" && v.expiresAt &&
                      new Date(v.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
                    return (
                      <tr key={v.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="font-black text-sm tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded-lg">
                              {v.code}
                            </code>
                            <button onClick={() => copyCode(v.code)} className="text-muted-foreground hover:text-foreground transition-colors" title="Copiar código">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{v.customerName ?? "—"}</p>
                          {v.customerPhone && (
                            <p className="text-xs text-muted-foreground">{maskPhone(v.customerPhone)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-foreground">{v.productName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${sc.color}`}>
                            {sc.icon} {sc.label}
                          </span>
                          {isExpiringSoon && (
                            <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                              <AlertCircle className="w-3 h-3" /> Expira em breve
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(v.issuedAt ?? Date.now()).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("pt-BR") : "Sem validade"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {v.status === "ativo" && (
                              <>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                                  onClick={() => { if (confirm(`Marcar vale ${v.code} como usado?`)) useMutation.mutate({ code: v.code }); }}>
                                  <CheckCircle2 className="w-3 h-3" /> Usar
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                                  onClick={() => { if (confirm("Cancelar este vale gás?")) cancelMutation.mutate({ id: v.id }); }}>
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal: Emitir Vale Gás ─────────────────────────────────────────── */}
      <Dialog open={showIssue} onOpenChange={(o) => { if (!o) { setShowIssue(false); setCustomerSearch(""); setForm({ ...EMPTY_FORM }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" /> Emitir Vale Gás
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Busca de cliente cadastrado */}
            <div>
              <Label className="text-xs font-semibold flex items-center gap-1 mb-1">
                <User className="w-3.5 h-3.5 text-orange-500" />
                Buscar Cliente Cadastrado
              </Label>
              <div className="relative" ref={customerDropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome ou telefone..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                      if (!e.target.value) clearCustomerSelection();
                    }}
                    onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                    className="pl-9 pr-9 text-sm"
                  />
                  {(customerSearch || form.customerId) && (
                    <button
                      type="button"
                      onClick={clearCustomerSelection}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {showCustomerDropdown && customerSearch.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {searchingCustomers ? (
                      <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
                      </div>
                    ) : customerResults.length > 0 ? (
                      <div className="divide-y divide-border">
                        {customerResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors"
                          >
                            <div className="font-medium text-sm">{c.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {c.phone && <span>📱 {maskPhone(c.phone)}</span>}
                              {c.neighborhood && <span className="ml-2">📍 {c.neighborhood}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground text-center">Nenhum cliente encontrado</div>
                    )}
                  </div>
                )}
              </div>
              {form.customerId && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cliente vinculado ao cadastro
                </div>
              )}
            </div>

            {/* Nome manual (preenchido automaticamente ou digitado) */}
            <div>
              <Label className="text-xs font-medium flex items-center gap-1 mb-1">
                <User className="w-3.5 h-3.5" />
                Nome do Cliente *
              </Label>
              <Input
                value={form.customerName}
                onChange={(e) => setForm(f => ({ ...f, customerName: e.target.value }))}
                placeholder="Nome completo do cliente"
              />
            </div>

            {/* Telefone */}
            <div>
              <Label className="text-xs font-medium flex items-center gap-1 mb-1">
                <Phone className="w-3.5 h-3.5" />
                Telefone / WhatsApp
              </Label>
              <Input
                value={form.customerPhone}
                onChange={(e) => setForm(f => ({ ...f, customerPhone: maskPhone(e.target.value) }))}
                placeholder="(64) 99999-9999"
                maxLength={15}
              />
            </div>

            {/* Produto */}
            <div>
              <Label className="text-xs font-medium flex items-center gap-1 mb-1">
                <Package className="w-3.5 h-3.5" />
                Produto do Vale *
              </Label>
              <Select
                value={form.productId?.toString() ?? ""}
                onValueChange={(v) => {
                  const p = productsList.find(p => p.id.toString() === v);
                  if (p) setForm(f => ({ ...f, productId: p.id, productName: p.name }));
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={productsList.length === 0 ? "Carregando produtos..." : "Selecione um produto"} />
                </SelectTrigger>
                <SelectContent>
                  {productsList.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.name} — R$ {parseFloat(p.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Validade */}
            <div>
              <Label className="text-xs font-medium flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                Validade (dias)
              </Label>
              <div className="flex gap-2">
                {[7, 15, 30, 60, 90].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, expiresInDays: d }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      form.expiresInDays === d
                        ? "bg-orange-500 text-white border-orange-500"
                        : "border-border text-muted-foreground hover:border-orange-300"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Expira em: <strong>{new Date(Date.now() + form.expiresInDays * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}</strong>
              </p>
            </div>

            {/* Observações */}
            <div>
              <Label className="text-xs font-medium mb-1 block">Observações</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notas internas sobre este vale..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowIssue(false); setCustomerSearch(""); setForm({ ...EMPTY_FORM }); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleIssue}
              disabled={issueMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {issueMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Emitindo...</span>
              ) : "Emitir Vale Gás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Dar Baixa ─────────────────────────────────────────────── */}
      <Dialog open={showUse} onOpenChange={(o) => !o && setShowUse(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> Dar Baixa em Vale Gás
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-medium">Código do Vale Gás</Label>
            <Input
              value={useCode}
              onChange={(e) => setUseCode(e.target.value.toUpperCase())}
              placeholder="VG-XXXXXXXX"
              className="mt-1 font-mono text-lg tracking-widest text-center"
              maxLength={11}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Digite o código do vale para marcá-lo como usado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUse(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!useCode.trim()) { toast.error("Digite o código"); return; }
                useMutation.mutate({ code: useCode });
              }}
              disabled={useMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {useMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processando...</span>
              ) : "Confirmar Uso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
