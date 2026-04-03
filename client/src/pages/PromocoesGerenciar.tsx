/**
 * Página de Gerenciamento de Promoções (campanhas/descontos automáticos)
 * Separada de Cupons (códigos manuais)
 */
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus, Tag, Percent, DollarSign, Trash2, ToggleLeft, ToggleRight,
  Calendar, Star, Package, Users, Truck, Edit, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type PromotionForm = {
  name: string;
  description: string;
  discountType: "percentual" | "fixo" | "frete_gratis";
  discountValue: string;
  appliesTo: "todos" | "categoria" | "produto";
  appliesToCategory: string;
  minOrderValue: string;
  minQuantity: number;
  validFrom: string;
  validUntil: string;
  maxUses: string;
  isActive: boolean;
  isFeatured: boolean;
  notes: string;
};

const emptyForm: PromotionForm = {
  name: "",
  description: "",
  discountType: "percentual",
  discountValue: "",
  appliesTo: "todos",
  appliesToCategory: "",
  minOrderValue: "0",
  minQuantity: 1,
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: "",
  maxUses: "",
  isActive: true,
  isFeatured: false,
  notes: "",
};

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
}

function isPromotionActive(p: any) {
  if (!p.isActive) return false;
  const now = new Date();
  if (new Date(p.validFrom) > now) return false;
  if (p.validUntil && new Date(p.validUntil) < now) return false;
  if (p.maxUses && p.usedCount >= p.maxUses) return false;
  return true;
}

export default function PromocoesGerenciar() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: promotions, isLoading } = trpc.promotions.list.useQuery({ activeOnly: false });
  const { data: stats } = trpc.promotions.stats.useQuery();

  const createMutation = trpc.promotions.create.useMutation({
    onSuccess: () => {
      toast.success("Promoção criada com sucesso!");
      utils.promotions.list.invalidate();
      utils.promotions.stats.invalidate();
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.promotions.update.useMutation({
    onSuccess: () => {
      toast.success("Promoção atualizada!");
      utils.promotions.list.invalidate();
      utils.promotions.stats.invalidate();
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.promotions.delete.useMutation({
    onSuccess: () => {
      toast.success("Promoção removida!");
      utils.promotions.list.invalidate();
      utils.promotions.stats.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = trpc.promotions.toggleActive.useMutation({
    onSuccess: () => {
      utils.promotions.list.invalidate();
      utils.promotions.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function openEdit(p: any) {
    setForm({
      name: p.name,
      description: p.description ?? "",
      discountType: p.discountType,
      discountValue: p.discountValue,
      appliesTo: p.appliesTo ?? "todos",
      appliesToCategory: p.appliesToCategory ?? "",
      minOrderValue: p.minOrderValue ?? "0",
      minQuantity: p.minQuantity ?? 1,
      validFrom: p.validFrom ? new Date(p.validFrom).toISOString().slice(0, 10) : "",
      validUntil: p.validUntil ? new Date(p.validUntil).toISOString().slice(0, 10) : "",
      maxUses: p.maxUses ? String(p.maxUses) : "",
      isActive: p.isActive,
      isFeatured: p.isFeatured ?? false,
      notes: p.notes ?? "",
    });
    setEditId(p.id);
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name || !form.discountValue || !form.validFrom) {
      toast.error("Nome, desconto e data de início são obrigatórios");
      return;
    }
    const payload = {
      ...form,
      maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
      validUntil: form.validUntil || undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <AdminLayout title="Promoções">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Gerencie campanhas de desconto automático. Para códigos de cupom, acesse a página <strong>Cupons</strong>.
            </p>
          </div>
          <Button
            onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}
            className="bg-primary hover:bg-primary/90 text-white gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Promoção
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border p-4 bg-card">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-xl border p-4 bg-green-50 border-green-100">
              <p className="text-xs text-green-700 uppercase tracking-wide mb-1">Ativas</p>
              <p className="text-2xl font-bold text-green-700">{stats.active}</p>
            </div>
            <div className="rounded-xl border p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Inativas</p>
              <p className="text-2xl font-bold">{stats.inactive}</p>
            </div>
            <div className="rounded-xl border p-4 bg-blue-50 border-blue-100">
              <p className="text-xs text-blue-700 uppercase tracking-wide mb-1">Usos Totais</p>
              <p className="text-2xl font-bold text-blue-700">{stats.totalUsed}</p>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Promoções</strong> são descontos automáticos aplicados ao carrinho quando as condições são atendidas.
            <strong> Cupons</strong> são códigos que o cliente digita manualmente. Ambos são gerenciados separadamente.
          </span>
        </div>

        {/* Promotions List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !promotions?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Tag className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhuma promoção cadastrada</p>
              <Button
                variant="outline"
                onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}
              >
                Criar primeira promoção
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {promotions.map((p) => {
              const active = isPromotionActive(p);
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-4 bg-card flex flex-col sm:flex-row sm:items-center gap-3 ${!active ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      p.discountType === "frete_gratis" ? "bg-blue-100" :
                      p.discountType === "percentual" ? "bg-orange-100" : "bg-green-100"
                    }`}>
                      {p.discountType === "frete_gratis" ? (
                        <Truck className="w-5 h-5 text-blue-600" />
                      ) : p.discountType === "percentual" ? (
                        <Percent className="w-5 h-5 text-orange-600" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{p.name}</p>
                        {p.isFeatured && (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px] gap-1">
                            <Star className="w-2.5 h-2.5" /> Destaque
                          </Badge>
                        )}
                        <Badge className={active ? "bg-green-100 text-green-700 border-green-200" : "bg-muted text-muted-foreground"}>
                          {active ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.discountType === "frete_gratis" ? "Frete grátis" :
                         p.discountType === "percentual" ? `${p.discountValue}% de desconto` :
                         `R$ ${p.discountValue} de desconto`}
                        {" · "}
                        {formatDate(p.validFrom)} até {p.validUntil ? formatDate(p.validUntil) : "sem limite"}
                        {p.maxUses ? ` · ${p.usedCount}/${p.maxUses} usos` : ` · ${p.usedCount} usos`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate({ id: p.id, isActive: !p.isActive })}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      title={p.isActive ? "Desativar" : "Ativar"}
                    >
                      {p.isActive ? (
                        <ToggleRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Promoção" : "Nova Promoção"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Nome da Promoção *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Desconto de Verão"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descreva a promoção..."
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Tipo de Desconto *</Label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as any }))}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="percentual">Percentual (%)</option>
                  <option value="fixo">Valor Fixo (R$)</option>
                  <option value="frete_gratis">Frete Grátis</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium">
                  {form.discountType === "frete_gratis" ? "Valor (deixe 0)" : form.discountType === "percentual" ? "Percentual (%) *" : "Valor (R$) *"}
                </Label>
                <Input
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                  placeholder={form.discountType === "percentual" ? "10" : "5.00"}
                  className="mt-1"
                  disabled={form.discountType === "frete_gratis"}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Aplica-se a</Label>
                <select
                  value={form.appliesTo}
                  onChange={(e) => setForm((f) => ({ ...f, appliesTo: e.target.value as any }))}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="todos">Todos os produtos</option>
                  <option value="categoria">Categoria específica</option>
                </select>
              </div>
              {form.appliesTo === "categoria" && (
                <div>
                  <Label className="text-xs font-medium">Categoria</Label>
                  <select
                    value={form.appliesToCategory}
                    onChange={(e) => setForm((f) => ({ ...f, appliesToCategory: e.target.value }))}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Selecione...</option>
                    <option value="gas">Gás</option>
                    <option value="agua">Água</option>
                    <option value="carvao">Carvão</option>
                    <option value="acessorio">Acessório</option>
                    <option value="vale_gas">Vale Gás</option>
                  </select>
                </div>
              )}
              <div>
                <Label className="text-xs font-medium">Pedido Mínimo (R$)</Label>
                <Input
                  value={form.minOrderValue}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Qtd. Mínima de Itens</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.minQuantity}
                  onChange={(e) => setForm((f) => ({ ...f, minQuantity: parseInt(e.target.value) || 1 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Válida De *</Label>
                <Input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Válida Até</Label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Máx. de Usos</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxUses}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                  placeholder="Ilimitado"
                  className="mt-1"
                />
              </div>
              <div className="flex flex-col gap-2 justify-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Ativa</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Destaque</span>
                </label>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Observações Internas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notas internas sobre esta promoção..."
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover promoção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A promoção será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
