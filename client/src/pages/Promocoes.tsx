import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Tag, Percent, DollarSign, Trash2, ToggleLeft, ToggleRight, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type CouponForm = {
  code: string; description: string; type: "percentual" | "fixo";
  value: string; minOrderValue: string; maxUses: string;
  validFrom: string; validUntil: string;
};

const emptyForm: CouponForm = {
  code: "", description: "", type: "percentual", value: "",
  minOrderValue: "0", maxUses: "", validFrom: "", validUntil: "",
};

export default function Promocoes() {
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: coupons, isLoading } = trpc.coupons.list.useQuery();
  const { data: usageReport } = trpc.coupons.usageReport.useQuery();

  function exportCSV() {
    if (!usageReport || usageReport.length === 0) { toast.error("Nenhum dado para exportar"); return; }
    const headers = ["Código", "Descrição", "Tipo", "Valor", "Usos", "Máx. Usos", "Taxa de Uso (%)", "Status", "Válido Até"];
    const rows = usageReport.map((c) => [
      c.code, c.description,
      c.type === "percentual" ? "Percentual (%)" : "Fixo (R$)",
      c.type === "percentual" ? `${c.value}%` : `R$ ${c.value.toFixed(2)}`,
      c.usedCount, c.maxUses ?? "Ilimitado",
      c.usageRate !== null ? `${c.usageRate}%` : "N/A",
      c.isActive ? "Ativo" : "Inativo",
      c.validUntil ? new Date(c.validUntil).toLocaleDateString("pt-BR") : "Sem validade",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cupons_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso!");
  }

  const createMutation = trpc.coupons.create.useMutation({
    onSuccess: () => {
      toast.success("Cupom criado com sucesso!");
      utils.coupons.list.invalidate();
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.coupons.update.useMutation({
    onSuccess: () => {
      toast.success("Cupom atualizado!");
      utils.coupons.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.coupons.delete.useMutation({
    onSuccess: () => {
      toast.success("Cupom removido!");
      utils.coupons.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit() {
    if (!form.code || !form.value) { toast.error("Código e valor são obrigatórios"); return; }
    createMutation.mutate({
      ...form,
      maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
      validFrom: form.validFrom ? new Date(form.validFrom) : undefined,
      validUntil: form.validUntil ? new Date(form.validUntil) : undefined,
    });
  }

  function isExpired(coupon: any) {
    return coupon.validUntil && new Date(coupon.validUntil) < new Date();
  }

  function isExhausted(coupon: any) {
    return coupon.maxUses && coupon.usedCount >= coupon.maxUses;
  }

  const activeCoupons = coupons?.filter((c) => c.isActive && !isExpired(c) && !isExhausted(c)) ?? [];
  const inactiveCoupons = coupons?.filter((c) => !c.isActive || isExpired(c) || isExhausted(c)) ?? [];

  return (
    <AdminLayout title="Promoções e Cupons">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-3 gap-3 flex-1 max-w-sm">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-green-600">{activeCoupons.length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{coupons?.reduce((a, c) => a + c.usedCount, 0) ?? 0}</p>
              <p className="text-xs text-muted-foreground">Usos</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-muted-foreground">{inactiveCoupons.length}</p>
              <p className="text-xs text-muted-foreground">Inativos</p>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Button onClick={() => { setForm(emptyForm); setShowForm(true); }} className="bg-primary hover:bg-primary/90 text-white gap-2">
              <Plus className="w-4 h-4" /> Novo Cupom
            </Button>
          </div>
        </div>

        {/* Active Coupons */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" /> Cupons Ativos
          </h3>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
            </div>
          ) : activeCoupons.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                <Tag className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Nenhum cupom ativo</p>
                <Button variant="outline" size="sm" onClick={() => { setForm(emptyForm); setShowForm(true); }}>
                  Criar primeiro cupom
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeCoupons.map((c) => (
                <CouponCard key={c.id} coupon={c} onToggle={() => updateMutation.mutate({ id: c.id, isActive: !c.isActive })} onDelete={() => setDeleteId(c.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Inactive Coupons */}
        {inactiveCoupons.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Cupons Inativos / Expirados</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {inactiveCoupons.map((c) => (
                <CouponCard key={c.id} coupon={c} inactive onToggle={() => updateMutation.mutate({ id: c.id, isActive: !c.isActive })} onDelete={() => setDeleteId(c.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Coupon Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Cupom de Desconto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Código do Cupom *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: GASRAPIDO10"
                className="mt-1 uppercase"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descrição da promoção" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Tipo de Desconto</Label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="percentual">Percentual (%)</option>
                  <option value="fixo">Valor Fixo (R$)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium">Valor *</Label>
                <Input value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder={form.type === "percentual" ? "10" : "15.00"} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Valor Mínimo do Pedido</Label>
                <Input value={form.minOrderValue} onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))} placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Limite de Usos</Label>
                <Input type="number" value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} placeholder="Ilimitado" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Válido a partir de</Label>
                <Input type="date" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Válido até</Label>
                <Input type="date" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} className="mt-1" />
              </div>
            </div>

            {/* Preview */}
            {form.code && form.value && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Preview do cupom</p>
                <p className="font-bold text-primary text-lg">{form.code}</p>
                <p className="text-sm">
                  {form.type === "percentual" ? `${form.value}% de desconto` : `R$ ${form.value} de desconto`}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm); }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-white">
              {createMutation.isPending ? "Criando..." : "Criar Cupom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

function CouponCard({ coupon, inactive, onToggle, onDelete }: { coupon: any; inactive?: boolean; onToggle: () => void; onDelete: () => void }) {
  const isExpired = coupon.validUntil && new Date(coupon.validUntil) < new Date();
  const isExhausted = coupon.maxUses && coupon.usedCount >= coupon.maxUses;

  return (
    <Card className={`shadow-sm ${inactive ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${coupon.type === "percentual" ? "bg-blue-100" : "bg-green-100"}`}>
              {coupon.type === "percentual" ? <Percent className="w-4 h-4 text-blue-600" /> : <DollarSign className="w-4 h-4 text-green-600" />}
            </div>
            <div>
              <p className="font-bold text-sm">{coupon.code}</p>
              <p className="text-xs text-muted-foreground">{coupon.description}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onToggle} className="p-1 rounded hover:bg-muted transition-colors">
              {coupon.isActive && !isExpired ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
            </button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-primary">
            {coupon.type === "percentual" ? `${coupon.value}%` : formatCurrency(coupon.value)}
          </p>
          {parseFloat(coupon.minOrderValue) > 0 && (
            <p className="text-xs text-muted-foreground">Mín: {formatCurrency(coupon.minOrderValue)}</p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Usos: {coupon.usedCount}{coupon.maxUses ? `/${coupon.maxUses}` : ""}
            </p>
            {isExpired && <Badge variant="destructive" className="text-xs">Expirado</Badge>}
            {isExhausted && !isExpired && <Badge variant="secondary" className="text-xs">Esgotado</Badge>}
          </div>
          {coupon.validUntil && !isExpired && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Até {new Date(coupon.validUntil).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
