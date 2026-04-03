import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertTriangle, Package, TrendingUp, TrendingDown, ArrowUpDown,
  Plus, Download, Flame, CheckCircle2, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

const MOVEMENT_ICONS: Record<string, any> = {
  entrada: TrendingUp,
  saida: TrendingDown,
  ajuste: ArrowUpDown,
};

const MOVEMENT_COLORS: Record<string, string> = {
  entrada: "text-green-600 bg-green-50",
  saida: "text-red-600 bg-red-50",
  ajuste: "text-blue-600 bg-blue-50",
};

export default function Estoque() {
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustForm, setAdjustForm] = useState({ type: "entrada" as "entrada" | "ajuste", quantity: 0, reason: "" });
  // Ajuste de gás (cheios + vazios)
  const [gasAdjustProduct, setGasAdjustProduct] = useState<any>(null);
  const [gasForm, setGasForm] = useState({ fullQty: 0, emptyQty: 0, reason: "" });

  const utils = trpc.useUtils();
  const { data: overview, isLoading } = trpc.stock.overview.useQuery();
  const { data: movements } = trpc.stock.movements.useQuery({ limit: 30 });
  const { data: exportData } = trpc.stock.exportCsv.useQuery();

  function handleExportCSV() {
    if (!exportData || exportData.length === 0) { toast.error("Nenhuma movimentação para exportar"); return; }
    const headers = ["ID", "Produto", "Tipo", "Quantidade", "Qtd. Anterior", "Qtd. Nova", "Motivo", "Data"];
    const rows = exportData.map((m) => [
      m.id, m.productName,
      m.type === "entrada" ? "Entrada" : m.type === "saida" ? "Saída" : "Ajuste",
      m.quantity, m.previousQty, m.newQty, m.reason,
      new Date(m.createdAt).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `estoque_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Movimentações exportadas com sucesso!");
  }

  const adjustMutation = trpc.stock.adjust.useMutation({
    onSuccess: () => {
      toast.success("Estoque atualizado com sucesso!");
      utils.stock.overview.invalidate();
      utils.stock.movements.invalidate();
      utils.products.listAll.invalidate();
      setAdjustProduct(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const gasAdjustMutation = trpc.stock.adjustGas.useMutation({
    onSuccess: () => {
      toast.success("Estoque de gás atualizado!");
      utils.stock.overview.invalidate();
      utils.stock.movements.invalidate();
      utils.products.listAll.invalidate();
      utils.gasCount.autoStats.invalidate();
      setGasAdjustProduct(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleAdjust() {
    if (!adjustProduct || adjustForm.quantity <= 0) {
      toast.error("Informe uma quantidade válida");
      return;
    }
    adjustMutation.mutate({ productId: adjustProduct.id, ...adjustForm });
  }

  function handleGasAdjust() {
    if (!gasAdjustProduct) return;
    gasAdjustMutation.mutate({
      productId: gasAdjustProduct.id,
      fullQty: gasForm.fullQty,
      emptyQty: gasForm.emptyQty,
      reason: gasForm.reason || undefined,
    });
  }

  function openGasAdjust(p: any) {
    setGasAdjustProduct(p);
    setGasForm({
      fullQty: p.fullStockQty ?? p.stockQty ?? 0,
      emptyQty: p.emptyStockQty ?? 0,
      reason: "",
    });
  }

  const lowStockProducts = overview?.lowStock ?? [];
  const allProducts = overview?.allProducts ?? [];
  const gasProducts = allProducts.filter((p) => p.category === "gas" && p.isActive);
  const otherProducts = allProducts.filter((p) => p.category !== "gas" && p.isActive);

  // Totais de gás
  const totalFull = gasProducts.reduce((s, p) => s + (p.fullStockQty ?? p.stockQty ?? 0), 0);
  const totalEmpty = gasProducts.reduce((s, p) => s + (p.emptyStockQty ?? 0), 0);

  return (
    <AdminLayout title="Controle de Estoque">
      <div className="space-y-6">

        {/* ─── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border kpi-gradient-blue p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-md" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Total de Produtos</p>
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-[28px] font-extrabold text-foreground leading-none">{isLoading ? "..." : allProducts.length}</p>
            <p className="text-xs text-muted-foreground mt-1.5">produtos cadastrados</p>
          </div>

          <div className="rounded-2xl border kpi-gradient-green p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-md" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Botijões Cheios</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-[28px] font-extrabold text-emerald-700 leading-none">{isLoading ? "..." : totalFull}</p>
            <p className="text-xs text-muted-foreground mt-1.5">prontos para entrega</p>
          </div>

          <div className="rounded-2xl border kpi-gradient-violet p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-md" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Botijões Vazios</p>
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <Circle className="w-4 h-4 text-violet-600" />
              </div>
            </div>
            <p className="text-[28px] font-extrabold text-violet-700 leading-none">{isLoading ? "..." : totalEmpty}</p>
            <p className="text-xs text-muted-foreground mt-1.5">aguardando reposição</p>
          </div>

          <div className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-md ${lowStockProducts.length > 0 ? "kpi-gradient-red border-red-300" : "kpi-gradient-green"}`} style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Estoque Baixo</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${lowStockProducts.length > 0 ? "bg-red-100 animate-pulse" : "bg-emerald-100"}`}>
                <AlertTriangle className={`w-4 h-4 ${lowStockProducts.length > 0 ? "text-red-600" : "text-emerald-600"}`} />
              </div>
            </div>
            <p className={`text-[28px] font-extrabold leading-none ${lowStockProducts.length > 0 ? "text-red-700" : "text-emerald-700"}`}>{isLoading ? "..." : lowStockProducts.length}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{lowStockProducts.length > 0 ? "requerem atenção" : "tudo em ordem"}</p>
          </div>
        </div>

        {/* ─── Low Stock Alert ─────────────────────────────────────────────────── */}
        {lowStockProducts.length > 0 && (
          <Card className="border-red-200 bg-red-50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alerta de Estoque Baixo ({lowStockProducts.length} produto{lowStockProducts.length > 1 ? "s" : ""})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-red-100">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-red-600">{p.stockQty} / mín. {p.minStock}</p>
                    </div>
                    <Button
                      size="sm" variant="outline"
                      className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (p.category === "gas") openGasAdjust(p);
                        else { setAdjustProduct(p); setAdjustForm({ type: "entrada", quantity: 0, reason: "" }); }
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Tabela de Gás (cheios + vazios) ─────────────────────────────────── */}
        {gasProducts.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                Estoque de Gás — Cheios e Vazios
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Produto</th>
                      <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Cheios
                        </span>
                      </th>
                      <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center justify-center gap-1">
                          <Circle className="w-3.5 h-3.5 text-violet-500" /> Vazios
                        </span>
                      </th>
                      <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Total Físico</th>
                      <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Mínimo</th>
                      <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gasProducts.map((p) => {
                      const fullQty = p.fullStockQty ?? p.stockQty ?? 0;
                      const emptyQty = p.emptyStockQty ?? 0;
                      const totalPhysical = fullQty + emptyQty;
                      const isLow = fullQty <= p.minStock;
                      const isEmpty = fullQty === 0;
                      return (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isEmpty ? "bg-red-100" : isLow ? "bg-orange-100" : "bg-emerald-100"}`}>
                                <Flame className={`w-4 h-4 ${isEmpty ? "text-red-600" : isLow ? "text-orange-600" : "text-emerald-600"}`} />
                              </div>
                              <div>
                                <span className="font-medium text-sm">{p.name}</span>
                                <p className="text-xs text-muted-foreground">{formatCurrency(p.price)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-lg font-bold ${isEmpty ? "text-red-600" : isLow ? "text-orange-600" : "text-emerald-700"}`}>{fullQty}</span>
                              <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${isEmpty ? "bg-red-500" : isLow ? "bg-orange-400" : "bg-emerald-500"}`}
                                  style={{ width: `${p.minStock > 0 ? Math.min(100, Math.round((fullQty / (p.minStock * 3)) * 100)) : 100}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-lg font-bold text-violet-600">{emptyQty}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-sm font-semibold text-foreground">{totalPhysical}</span>
                          </td>
                          <td className="py-3 px-3 text-center text-muted-foreground text-sm">{p.minStock}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${isEmpty ? "stock-empty" : isLow ? "stock-low" : "stock-ok"}`}>
                              {isEmpty ? "Zerado" : isLow ? "Baixo" : "OK"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              size="sm" variant="outline"
                              className={`h-7 text-xs ${isLow || isEmpty ? "border-orange-200 text-orange-700 hover:bg-orange-50" : ""}`}
                              onClick={() => openGasAdjust(p)}
                            >
                              Ajustar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 border-t-2 border-border">
                      <td className="py-2 px-3 text-xs font-bold text-muted-foreground">TOTAL GÁS</td>
                      <td className="py-2 px-3 text-center font-black text-emerald-700">{totalFull}</td>
                      <td className="py-2 px-3 text-center font-black text-violet-600">{totalEmpty}</td>
                      <td className="py-2 px-3 text-center font-black text-foreground">{totalFull + totalEmpty}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Tabela de Outros Produtos ─────────────────────────────────────── */}
        {otherProducts.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Outros Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Produto</th>
                      <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Categoria</th>
                      <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Estoque</th>
                      <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Mínimo</th>
                      <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherProducts.map((p) => {
                      const isLow = p.stockQty <= p.minStock;
                      const isEmpty = p.stockQty === 0;
                      const pct = p.minStock > 0 ? Math.min(100, Math.round((p.stockQty / (p.minStock * 3)) * 100)) : 100;
                      return (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isEmpty ? "bg-red-100" : isLow ? "bg-orange-100" : "bg-emerald-100"}`}>
                                <Package className={`w-4 h-4 ${isEmpty ? "text-red-600" : isLow ? "text-orange-600" : "text-emerald-600"}`} />
                              </div>
                              <span className="font-medium text-sm">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground capitalize">{p.category}</span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-sm font-bold ${isEmpty ? "text-red-600" : isLow ? "text-orange-600" : "text-foreground"}`}>{p.stockQty}</span>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${isEmpty ? "bg-red-500" : isLow ? "bg-orange-400" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center text-muted-foreground text-sm">{p.minStock}</td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${isEmpty ? "stock-empty" : isLow ? "stock-low" : "stock-ok"}`}>
                              {isEmpty ? "Zerado" : isLow ? "Baixo" : "OK"}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <Button
                              size="sm" variant="outline"
                              className={`h-7 text-xs ${isLow || isEmpty ? "border-orange-200 text-orange-700 hover:bg-orange-50" : ""}`}
                              onClick={() => { setAdjustProduct(p); setAdjustForm({ type: "entrada", quantity: 0, reason: "" }); }}
                            >
                              Ajustar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Recent Movements ─────────────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Últimas Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {!movements || movements.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Nenhuma movimentação registrada</p>
            ) : (
              <div className="space-y-2">
                {movements.map((m) => {
                  const Icon = MOVEMENT_ICONS[m.type];
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${MOVEMENT_COLORS[m.type]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.productName}</p>
                        <p className="text-xs text-muted-foreground">{m.reason}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${m.type === "entrada" ? "text-green-600" : m.type === "saida" ? "text-red-600" : "text-blue-600"}`}>
                          {m.type === "entrada" ? "+" : m.type === "saida" ? "-" : "→"}{m.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.previousQty} → {m.newQty}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Modal: Ajuste de Gás (cheios + vazios) ──────────────────────────── */}
      <Dialog open={!!gasAdjustProduct} onOpenChange={(o) => !o && setGasAdjustProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              Ajustar Estoque de Gás — {gasAdjustProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-xl p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Cheios atuais</p>
                <p className="text-2xl font-black text-emerald-600">{gasAdjustProduct?.fullStockQty ?? gasAdjustProduct?.stockQty ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Vazios atuais</p>
                <p className="text-2xl font-black text-violet-600">{gasAdjustProduct?.emptyStockQty ?? 0}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Botijões Cheios (nova quantidade)
              </Label>
              <Input
                type="number" min={0}
                value={gasForm.fullQty}
                onChange={(e) => setGasForm((f) => ({ ...f, fullQty: parseInt(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Circle className="w-3.5 h-3.5 text-violet-500" /> Botijões Vazios (nova quantidade)
              </Label>
              <Input
                type="number" min={0}
                value={gasForm.emptyQty}
                onChange={(e) => setGasForm((f) => ({ ...f, emptyQty: parseInt(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5 text-center text-sm">
              <span className="text-muted-foreground">Total físico: </span>
              <span className="font-bold">{gasForm.fullQty + gasForm.emptyQty} botijões</span>
            </div>
            <div>
              <Label className="text-xs font-medium">Motivo (opcional)</Label>
              <Input
                value={gasForm.reason}
                onChange={(e) => setGasForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ex: Chegada de caminhão, contagem manual..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGasAdjustProduct(null)}>Cancelar</Button>
            <Button
              onClick={handleGasAdjust}
              disabled={gasAdjustMutation.isPending}
              className="bg-primary text-white"
            >
              {gasAdjustMutation.isPending ? "Salvando..." : "Salvar Estoque"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Ajuste de Outros Produtos ────────────────────────────────── */}
      <Dialog open={!!adjustProduct} onOpenChange={(o) => !o && setAdjustProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar Estoque — {adjustProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Estoque atual</p>
              <p className="text-3xl font-bold">{adjustProduct?.stockQty}</p>
              <p className="text-xs text-muted-foreground">{adjustProduct?.unit}</p>
            </div>
            <div>
              <Label className="text-xs font-medium">Tipo de Movimentação</Label>
              <select
                value={adjustForm.type}
                onChange={(e) => setAdjustForm((f) => ({ ...f, type: e.target.value as any }))}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="entrada">Entrada (adicionar)</option>
                <option value="ajuste">Ajuste (definir quantidade)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-medium">
                {adjustForm.type === "entrada" ? "Quantidade a adicionar" : "Nova quantidade total"}
              </Label>
              <Input
                type="number" min={0}
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Motivo</Label>
              <Input
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Ex: Compra, ajuste de inventário..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustProduct(null)}>Cancelar</Button>
            <Button onClick={handleAdjust} disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
