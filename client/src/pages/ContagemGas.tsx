import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Flame, Package, ShoppingCart, RefreshCw, Save,
  CheckCircle2, AlertTriangle, BarChart3,
  Calendar, Edit3, Info, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

export default function ContagemGas() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [editMode, setEditMode] = useState(false);
  const [manualEmpty, setManualEmpty] = useState<Record<number, number>>({});

  const utils = trpc.useUtils();

  const { data: stats, isLoading, refetch } = trpc.gasCount.autoStats.useQuery(
    { date: selectedDate },
    { refetchInterval: 60000 }
  );

  const saveMutation = trpc.gasCount.save.useMutation({
    onSuccess: () => {
      toast.success("Contagem de vazios salva com sucesso!");
      utils.gasCount.autoStats.invalidate();
      setEditMode(false);
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSaveEmpty() {
    if (!stats) return;
    const items = stats.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      fullQty: item.fullQty,
      emptyQty: manualEmpty[item.productId] ?? item.emptyQty,
      soldQty: item.soldQty,
      returnedQty: 0,
    }));
    saveMutation.mutate({ date: selectedDate, items, createdBy: "admin" });
  }

  function startEdit() {
    if (!stats) return;
    const map: Record<number, number> = {};
    stats.items.forEach((i) => { map[i.productId] = i.emptyQty; });
    setManualEmpty(map);
    setEditMode(true);
  }

  const isToday = selectedDate === today;

  return (
    <AdminLayout title="Contagem de Gás">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Flame className="w-6 h-6 text-primary" />
              Contagem de Gás
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Dados automáticos do estoque e vendas
              {isToday && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Ao vivo
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setEditMode(false); }}
                className="pl-9 w-44 h-9 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-9">
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-white">Total</Badge>
                  </div>
                  <p className="text-3xl font-black text-orange-600">{stats.totals.totalStock}</p>
                  <p className="text-xs text-orange-700/70 font-medium mt-1">Botijões no estoque</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-white">Cheios</Badge>
                  </div>
                  <p className="text-3xl font-black text-green-600">{stats.totals.totalFull}</p>
                  <p className="text-xs text-green-700/70 font-medium mt-1">Prontos para entrega</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-500 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <Badge variant="outline" className="text-xs border-slate-200 text-slate-700 bg-white">Vazios</Badge>
                  </div>
                  <p className="text-3xl font-black text-slate-600">{stats.totals.totalEmpty}</p>
                  <p className="text-xs text-slate-700/70 font-medium mt-1">Aguardando reposição</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-white">
                      {isToday ? "Hoje" : formatDate(selectedDate)}
                    </Badge>
                  </div>
                  <p className="text-3xl font-black text-blue-600">{stats.totals.totalSold}</p>
                  <p className="text-xs text-blue-700/70 font-medium mt-1">
                    Vendidos · {formatCurrency(stats.totals.revenue)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabela por Produto */}
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-primary" />
                  Detalhamento por Produto
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                    <Zap className="w-3 h-3 text-green-500" />
                    Cheios e vendidos são automáticos
                  </div>
                  {!editMode ? (
                    <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5 h-8 text-xs">
                      <Edit3 className="w-3.5 h-3.5" />
                      Informar Vazios
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditMode(false)} className="h-8 text-xs">Cancelar</Button>
                      <Button size="sm" onClick={handleSaveEmpty} disabled={saveMutation.isPending} className="h-8 text-xs bg-primary text-white gap-1.5">
                        <Save className="w-3.5 h-3.5" />
                        {saveMutation.isPending ? "Salvando..." : "Salvar Vazios"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Produto</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">
                          Estoque Total <span className="text-green-600 font-normal">(auto)</span>
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">
                          Cheios <span className="text-green-600 font-normal">(auto)</span>
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">
                          Vazios {editMode && <span className="text-orange-500 font-normal">(editar)</span>}
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">
                          Vendidos Hoje <span className="text-blue-600 font-normal">(auto)</span>
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.items.map((item, i) => {
                        const emptyVal = editMode ? (manualEmpty[item.productId] ?? item.emptyQty) : item.emptyQty;
                        const isLow = item.stockQty <= 10;
                        const isCritical = item.stockQty <= 3;
                        return (
                          <tr key={item.productId} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Flame className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground text-sm">{item.productName}</p>
                                  <p className="text-xs text-muted-foreground">R$ {Number(item.price).toFixed(2)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="text-lg font-black text-foreground">{item.stockQty}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="text-lg font-bold text-green-600">{item.fullQty}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {editMode ? (
                                <Input
                                  type="number"
                                  min={0}
                                  value={manualEmpty[item.productId] ?? 0}
                                  onChange={(e) => setManualEmpty((m) => ({ ...m, [item.productId]: parseInt(e.target.value) || 0 }))}
                                  className="w-20 h-8 text-center text-sm mx-auto"
                                />
                              ) : (
                                <span className="text-lg font-bold text-slate-500">{emptyVal}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`text-lg font-bold ${item.soldQty > 0 ? "text-blue-600" : "text-muted-foreground"}`}>
                                {item.soldQty}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {isCritical ? (
                                <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Crítico</Badge>
                              ) : isLow ? (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">Baixo</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Normal</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/40 border-t-2 border-border">
                        <td className="px-5 py-3 font-bold text-sm text-foreground">TOTAL GERAL</td>
                        <td className="px-4 py-3 text-center font-black text-lg text-foreground">{stats.totals.totalStock}</td>
                        <td className="px-4 py-3 text-center font-black text-lg text-green-600">{stats.totals.totalFull}</td>
                        <td className="px-4 py-3 text-center font-black text-lg text-slate-500">{stats.totals.totalEmpty}</td>
                        <td className="px-4 py-3 text-center font-black text-lg text-blue-600">{stats.totals.totalSold}</td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">{formatCurrency(stats.totals.revenue)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Vendas 7 dias */}
            {stats.salesHistory.length > 0 && (
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Vendas de Gás — Últimos 7 dias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[...stats.salesHistory].reverse()} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="date" tickFormatter={(v) => formatDate(v)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(value: any, name: string) =>
                          name === "totalSold" ? [`${value} botijões`, "Vendidos"] : [formatCurrency(Number(value)), "Receita"]
                        }
                        labelFormatter={(label) => formatDate(label)}
                        contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                      />
                      <Bar dataKey="totalSold" radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {stats.salesHistory.map((entry, index) => (
                          <Cell key={index} fill={entry.date === selectedDate ? "oklch(0.55 0.2 30)" : "oklch(0.75 0.15 30)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Info */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">Como funciona a contagem automática?</p>
                <ul className="space-y-0.5 text-blue-600 text-xs">
                  <li>• <strong>Estoque Total e Cheios</strong>: calculados automaticamente a partir do banco de dados de produtos.</li>
                  <li>• <strong>Vendidos Hoje</strong>: soma de todos os itens de gás em pedidos não cancelados do dia selecionado.</li>
                  <li>• <strong>Vazios</strong>: informados manualmente clicando em "Informar Vazios" (botijões retornados pelos clientes).</li>
                  <li>• Os dados são atualizados automaticamente a cada 1 minuto.</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Flame className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum dado disponível para esta data.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
