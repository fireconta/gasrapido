import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Search, Users, Phone, Mail, MapPin, ShoppingBag, Edit, Download, Star, TrendingUp, Crown, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { maskPhone, maskCpf, cpfInputProps } from "@/lib/masks";

function formatCurrency(v: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

type CustomerForm = {
  name: string;
  cpf: string;
  phone: string;       // telefone e WhatsApp são o mesmo número
  email: string;
  address: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  notes: string;
};

const emptyForm: CustomerForm = {
  name: "", cpf: "", phone: "", email: "",
  address: "", addressNumber: "", neighborhood: "", city: "Quirinópolis", notes: "",
};

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: customers, isLoading } = trpc.customers.list.useQuery({ search });
  const { data: customerDetail } = trpc.customers.getById.useQuery(
    { id: selectedCustomer! },
    { enabled: !!selectedCustomer }
  );
  const { data: customerOrders } = trpc.customers.getHistory.useQuery(
    { customerId: selectedCustomer! },
    { enabled: !!selectedCustomer }
  );
  const { data: exportData } = trpc.customers.exportCsv.useQuery();

  function handleExportCSV() {
    if (!exportData || exportData.length === 0) { toast.error("Nenhum cliente para exportar"); return; }
    const headers = ["ID", "Nome", "CPF", "Telefone/WhatsApp", "E-mail", "Endereço", "Número", "Bairro", "Cidade", "Observações", "Total Pedidos", "Total Gasto (R$)", "Cadastrado em"];
    const rows = exportData.map((c) => [
      c.id,
      c.name,
      (c as any).cpf ?? "",
      c.phone,
      c.email,
      c.address,
      (c as any).addressNumber ?? "",
      c.neighborhood,
      c.city,
      c.notes,
      (c as any).totalOrders ?? 0,
      Number((c as any).totalSpent ?? 0).toFixed(2).replace(".", ","),
      new Date(c.createdAt).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `clientes_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`${exportData.length} clientes exportados com sucesso!`);
  }

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente cadastrado!");
      utils.customers.list.invalidate();
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado!");
      utils.customers.list.invalidate();
      utils.customers.getById.invalidate({ id: editId! });
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  function openEdit(c: any) {
    setForm({
      name: c.name,
      cpf: c.cpf ?? "",
      // telefone e whatsapp são o mesmo: prioriza phone, depois whatsapp
      phone: c.phone ?? c.whatsapp ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      addressNumber: (c as any).addressNumber ?? "",
      neighborhood: c.neighborhood ?? "",
      city: c.city ?? "Quirinópolis",
      notes: c.notes ?? "",
    });
    setEditId(c.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    // Salva o mesmo número em phone e whatsapp para compatibilidade
    const payload = {
      ...form,
      whatsapp: form.phone,
    };
    if (editId) updateMutation.mutate({ id: editId, ...payload });
    else createMutation.mutate(payload);
  }

  return (
    <AdminLayout title="Clientes">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou CPF..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="bg-primary hover:bg-primary/90 text-white gap-2">
              <Plus className="w-4 h-4" /> Novo Cliente
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {!isLoading && customers && customers.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border kpi-gradient-blue p-5 transition-all duration-200 hover:-translate-y-1" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Total</p>
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-[28px] font-extrabold text-foreground leading-none">{customers.length}</p>
              <p className="text-xs text-muted-foreground mt-1.5">clientes cadastrados</p>
            </div>
            <div className="rounded-2xl border kpi-gradient-green p-5 transition-all duration-200 hover:-translate-y-1" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Receita</p>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-xl font-extrabold text-emerald-700 leading-none">{formatCurrency(customers.reduce((a, c) => a + Number(c.totalSpent), 0))}</p>
              <p className="text-xs text-muted-foreground mt-1.5">total em vendas</p>
            </div>
            <div className="rounded-2xl border kpi-gradient-orange p-5 transition-all duration-200 hover:-translate-y-1" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Top Cliente</p>
                <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
              <p className="text-sm font-bold text-foreground truncate leading-none">{[...customers].sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent))[0]?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1.5">{formatCurrency([...customers].sort((a, b) => Number(b.totalSpent) - Number(a.totalSpent))[0]?.totalSpent ?? 0)}</p>
            </div>
          </div>
        )}

        {/* Customers List */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : customers?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customers?.map((c, idx) => {
              const colors = [
                "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500",
                "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-red-500",
              ];
              const avatarColor = colors[c.name.charCodeAt(0) % colors.length];
              return (
                <Card key={c.id} className="shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer overflow-hidden" onClick={() => setSelectedCustomer(c.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-11 h-11 rounded-xl ${avatarColor} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <span className="text-white font-bold text-base">{c.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm truncate">{c.name}</p>
                          {Number(c.totalOrders) >= 5 && <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" fill="currentColor" />}
                        </div>
                        {c.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {maskPhone(c.phone)}
                          </p>
                        )}
                        {(c as any).cpf && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="font-medium">CPF:</span> {(c as any).cpf}
                          </p>
                        )}
                        {c.neighborhood && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {c.neighborhood}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-green-600">{formatCurrency(c.totalSpent)}</p>
                        <p className="text-xs text-muted-foreground">{c.totalOrders} pedidos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(o) => !o && setSelectedCustomer(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {customerDetail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">{customerDetail.name.charAt(0).toUpperCase()}</span>
                  </div>
                  {customerDetail.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total Gasto</p>
                    <p className="font-bold text-green-600">{formatCurrency(customerDetail.totalSpent)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total de Pedidos</p>
                    <p className="font-bold">{customerDetail.totalOrders}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Telefone e WhatsApp unificados */}
                  {(customerDetail as any).cpf && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="w-4 h-4 text-muted-foreground text-center font-bold text-xs">CPF</span>
                      <span className="font-mono">{(customerDetail as any).cpf}</span>
                    </div>
                  )}
                  {customerDetail.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{maskPhone(customerDetail.phone)}</span>
                      <a
                        href={`https://wa.me/55${customerDetail.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    </div>
                  )}
                  {customerDetail.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{customerDetail.email}</span>
                    </div>
                  )}
                  {customerDetail.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {customerDetail.address}
                        {(customerDetail as any).addressNumber ? `, nº ${(customerDetail as any).addressNumber}` : ""}
                        {customerDetail.neighborhood ? ` - ${customerDetail.neighborhood}` : ""}
                        {customerDetail.city ? `, ${customerDetail.city}` : ""}
                      </span>
                    </div>
                  )}
                  {customerDetail.notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                      {customerDetail.notes}
                    </div>
                  )}
                </div>

                {/* Order History */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5" /> Histórico de Pedidos
                  </p>
                  {(customerOrders?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">Nenhum pedido encontrado</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {customerOrders?.slice(0, 10).map((o) => (
                        <div key={o.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                          <div>
                            <span className="font-medium text-primary">#{o.orderNumber}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              o.status === "entregue" ? "bg-green-100 text-green-700" :
                              o.status === "cancelado" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                            }`}>{o.status}</span>
                            <span className="font-semibold text-green-600">{formatCurrency(o.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => openEdit(customerDetail)} className="gap-2">
                  <Edit className="w-4 h-4" /> Editar
                </Button>
                <Button variant="outline" onClick={() => setSelectedCustomer(null)}>Fechar</Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-medium">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nome completo" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">CPF</Label>
              <Input
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: maskCpf(e.target.value) }))}
                className="mt-1"
                {...cpfInputProps}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Telefone / WhatsApp</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
                placeholder="(64) 99999-9999"
                className="mt-1"
                type="tel"
                inputMode="tel"
                maxLength={15}
              />
              <p className="text-xs text-muted-foreground mt-1">Usado para contato e WhatsApp</p>
            </div>
            <div>
              <Label className="text-xs font-medium">Email</Label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" className="mt-1" />
            </div>
            {/* Endereço com número separado */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs font-medium">Endereço (Rua/Av.)</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Rua das Flores" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Número</Label>
                <Input value={form.addressNumber} onChange={(e) => setForm((f) => ({ ...f, addressNumber: e.target.value }))} placeholder="123" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Bairro</Label>
                <Input value={form.neighborhood} onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))} placeholder="Bairro" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Quirinópolis" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Observações sobre o cliente..." className="mt-1 resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
