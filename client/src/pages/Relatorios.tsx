import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BarChart3, TrendingUp, Download, DollarSign, ShoppingCart,
  Package, Users, Gift, Ticket, CheckCircle2, XCircle, Clock,
  Star, Award, Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

type Period = "diario" | "semanal" | "mensal";
type ActiveTab = "vendas" | "beneficios";

function formatCurrency(v: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

const PERIOD_LABELS: Record<Period, string> = {
  diario: "Diário (hoje)",
  semanal: "Semanal (últimos 7 dias)",
  mensal: "Mensal (este mês)",
};

const VOUCHER_COLORS = {
  ativo: "#22c55e",
  usado: "#3b82f6",
  cancelado: "#ef4444",
  expirado: "#f59e0b",
};

export default function Relatorios() {
  const [period, setPeriod] = useState<Period>("semanal");
  const [activeTab, setActiveTab] = useState<ActiveTab>("vendas");

  // ─── Dados de Vendas ─────────────────────────────────────────────────────
  const { data: report, isLoading } = trpc.dashboard.salesReport.useQuery({ period });
  const { data: totalCustomers } = trpc.dashboard.totalCustomers.useQuery();

  const topProducts = useMemo(() => {
    if (!report?.orders) return [];
    return report.orders.slice(0, 10).map((o: any) => ({
      productName: o.customerName ?? "Cliente",
      totalQty: 1,
      totalRevenue: parseFloat(o.total),
    }));
  }, [report]);

  const chartData = useMemo(() => {
    if (!report?.orders) return [];
    const grouped: Record<string, { revenue: number; orders: number }> = {};
    for (const o of report.orders) {
      const d = new Date(o.createdAt);
      let key: string;
      if (period === "mensal") {
        key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      } else if (period === "semanal") {
        key = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
      } else {
        key = d.toLocaleTimeString("pt-BR", { hour: "2-digit" }) + "h";
      }
      if (!grouped[key]) grouped[key] = { revenue: 0, orders: 0 };
      grouped[key].revenue += parseFloat((o.total ?? "0").toString());
      grouped[key].orders += 1;
    }
    return Object.entries(grouped).map(([label, v]) => ({ label, revenue: v.revenue, orders: v.orders }));
  }, [report, period]);

  // ─── Dados de Benefícios ─────────────────────────────────────────────────
  const { data: benefitsStats, isLoading: loadingBenefits } = trpc.benefits.stats.useQuery();
  const { data: vouchersStats, isLoading: loadingVouchers } = trpc.gasVouchers.stats.useQuery();
  const { data: vouchersList } = trpc.gasVouchers.list.useQuery({ limit: 50 });
  const { data: benefitsList } = trpc.benefits.list.useQuery();

  // Gráfico de vales por dia (últimos 7 dias)
  const voucherChartData = useMemo(() => {
    if (!vouchersList) return [];
    const days: Record<string, { emitidos: number; usados: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      days[key] = { emitidos: 0, usados: 0 };
    }
    for (const v of vouchersList) {
      if (v.issuedAt) {
        const key = new Date(v.issuedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (days[key]) days[key].emitidos++;
      }
      if (v.usedAt) {
        const key = new Date(v.usedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (days[key]) days[key].usados++;
      }
    }
    return Object.entries(days).map(([label, v]) => ({ label, ...v }));
  }, [vouchersList]);

  // Dados para gráfico de pizza de status dos vales
  const voucherPieData = useMemo(() => {
    if (!vouchersStats) return [];
    return [
      { name: "Ativos", value: vouchersStats.active, color: VOUCHER_COLORS.ativo },
      { name: "Usados", value: vouchersStats.used, color: VOUCHER_COLORS.usado },
      { name: "Cancelados", value: vouchersStats.cancelled, color: VOUCHER_COLORS.cancelado },
      { name: "Expirados", value: vouchersStats.expired, color: VOUCHER_COLORS.expirado },
    ].filter(d => d.value > 0);
  }, [vouchersStats]);

  // Calcular impacto financeiro (P13 = R$120 em média)
  const P13_PRICE = 120;
  const totalVouchersIssued = vouchersStats?.total ?? 0;
  const totalVouchersUsed = vouchersStats?.used ?? 0;
  const impactoFinanceiro = totalVouchersUsed * P13_PRICE;
  const valorEmAberto = (vouchersStats?.active ?? 0) * P13_PRICE;

  function exportCSV() {
    if (!report?.orders || report.orders.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    const headers = ["Número", "Cliente", "Status", "Pagamento", "Total", "Data"];
    const rows = report.orders.map((o) => [
      o.orderNumber,
      o.customerName,
      o.status,
      o.paymentMethod,
      parseFloat((o.total ?? "0").toString()).toFixed(2),
      new Date(o.createdAt).toLocaleString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso!");
  }

  function exportBenefitsCSV() {
    if (!vouchersList || vouchersList.length === 0) {
      toast.error("Nenhum vale gás para exportar");
      return;
    }
    const headers = ["Código", "Cliente", "Produto", "Status", "Emitido em", "Usado em"];
    const rows = vouchersList.map((v) => [
      v.code,
      v.customerName ?? "",
      v.productName ?? "P13",
      v.status,
      v.issuedAt ? new Date(v.issuedAt).toLocaleString("pt-BR") : "",
      v.usedAt ? new Date(v.usedAt).toLocaleString("pt-BR") : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_beneficios_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório de benefícios exportado!");
  }

  const totalRevenue = report?.totalRevenue ?? 0;
  const totalOrders = report?.totalOrders ?? 0;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <AdminLayout title="Relatórios">
      <div className="space-y-6">

        {/* ─── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("vendas")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "vendas"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Vendas
          </button>
          <button
            onClick={() => setActiveTab("beneficios")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "beneficios"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Gift className="w-4 h-4" />
            Benefícios
            {(vouchersStats?.active ?? 0) > 0 && (
              <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {vouchersStats?.active}
              </span>
            )}
          </button>
        </div>

        {/* ─── ABA VENDAS ───────────────────────────────────────────────── */}
        {activeTab === "vendas" && (
          <>
            {/* Period Selector + Export */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {(["diario", "semanal", "mensal"] as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      period === p
                        ? "bg-primary text-white"
                        : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <Button onClick={exportCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" /> Exportar CSV
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">{PERIOD_LABELS[period]}</p>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Faturamento</p>
                      <p className="font-bold text-green-600 text-sm">{formatCurrency(totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                      <p className="font-bold">{totalOrders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ticket Médio</p>
                      <p className="font-bold text-sm">{formatCurrency(avgTicket)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Users className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Clientes</p>
                      <p className="font-bold">{totalCustomers ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Faturamento por Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted animate-pulse rounded-lg" />
                ) : chartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    Nenhum dado no período selecionado
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Orders Chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-500" />
                  Pedidos por Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-48 bg-muted animate-pulse rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        formatter={(value: number) => [value, "Pedidos"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  Pedidos Recentes (últimos 30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!topProducts || topProducts.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">Nenhuma venda registrada</p>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((p: any, i: number) => {
                      const maxRevenue = topProducts[0]?.totalRevenue ?? 1;
                      const pct = Math.round((p.totalRevenue / maxRevenue) * 100);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium truncate">{p.productName}</p>
                              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                <span className="text-xs text-muted-foreground">{p.totalQty} un.</span>
                                <span className="text-xs font-semibold text-green-600">{formatCurrency(p.totalRevenue)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ─── ABA BENEFÍCIOS ───────────────────────────────────────────── */}
        {activeTab === "beneficios" && (
          <>
            {/* Header com Export */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Relatório de Benefícios</h2>
                <p className="text-sm text-muted-foreground">Desempenho do programa Gás do Povo e vales gás</p>
              </div>
              <Button onClick={exportBenefitsCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" /> Exportar CSV
              </Button>
            </div>

            {/* Cards de Resumo — Vales Gás */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                      <Ticket className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Emitidos</p>
                      <p className="font-bold text-xl">{vouchersStats?.total ?? 0}</p>
                      <p className="text-[10px] text-green-600 font-medium">+{vouchersStats?.issuedToday ?? 0} hoje</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vales Usados</p>
                      <p className="font-bold text-xl">{vouchersStats?.used ?? 0}</p>
                      <p className="text-[10px] text-blue-600 font-medium">+{vouchersStats?.usedToday ?? 0} hoje</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Em Aberto</p>
                      <p className="font-bold text-xl">{vouchersStats?.active ?? 0}</p>
                      <p className="text-[10px] text-orange-600 font-medium">{formatCurrency(valorEmAberto)} em risco</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-l-4 border-l-red-400">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                      <XCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cancelados</p>
                      <p className="font-bold text-xl">{vouchersStats?.cancelled ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">{vouchersStats?.expired ?? 0} expirados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Impacto Financeiro — Gás do Povo */}
            <Card className="shadow-sm bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">Programa Gás do Povo</h3>
                      <Badge className="bg-orange-500 text-white text-[10px]">Vale P13</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Cada vale gás P13 concedido tem valor estimado de {formatCurrency(P13_PRICE)}.
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                        <p className="text-xs text-muted-foreground mb-1">Valor Concedido</p>
                        <p className="font-bold text-lg text-orange-600">{formatCurrency(totalVouchersIssued * P13_PRICE)}</p>
                        <p className="text-[10px] text-muted-foreground">{totalVouchersIssued} vales emitidos</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                        <p className="text-xs text-muted-foreground mb-1">Impacto Real</p>
                        <p className="font-bold text-lg text-red-600">{formatCurrency(impactoFinanceiro)}</p>
                        <p className="text-[10px] text-muted-foreground">{totalVouchersUsed} vales resgatados</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                        <p className="text-xs text-muted-foreground mb-1">Taxa de Uso</p>
                        <p className="font-bold text-lg text-blue-600">
                          {totalVouchersIssued > 0 ? Math.round((totalVouchersUsed / totalVouchersIssued) * 100) : 0}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">dos vales usados</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gráficos lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico de Vales por Dia */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Vales Emitidos vs Usados (últimos 7 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingVouchers ? (
                    <div className="h-48 bg-muted animate-pulse rounded-lg" />
                  ) : voucherChartData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      Nenhum vale no período
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={voucherChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        />
                        <Bar dataKey="emitidos" name="Emitidos" fill="#22c55e" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="usados" name="Usados" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico de Pizza — Status dos Vales */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-orange-500" />
                    Distribuição por Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingVouchers ? (
                    <div className="h-48 bg-muted animate-pulse rounded-lg" />
                  ) : voucherPieData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                      Nenhum vale cadastrado
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={voucherPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {voucherPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Breakdown por Benefício */}
            {benefitsStats?.benefitBreakdown && benefitsStats.benefitBreakdown.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-500" />
                    Desempenho por Benefício
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {benefitsStats.benefitBreakdown.map((b: any) => (
                      <div key={b.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          b.type === "gas_do_povo" ? "bg-orange-100" : "bg-purple-100"
                        }`}>
                          {b.type === "gas_do_povo" ? (
                            <Flame className="w-5 h-5 text-orange-600" />
                          ) : (
                            <Star className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{b.name}</p>
                            {b.isActive ? (
                              <Badge className="bg-green-100 text-green-700 text-[10px] border-0">Ativo</Badge>
                            ) : (
                              <Badge className="bg-muted text-muted-foreground text-[10px] border-0">Inativo</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{b.type}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-lg">{b.totalUses ?? 0}</p>
                          <p className="text-xs text-muted-foreground">usos totais</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabela de Vales Recentes */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-blue-500" />
                  Últimos Vales Gás Emitidos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!vouchersList || vouchersList.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Nenhum vale gás emitido ainda</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Código</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Cliente</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Produto</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Emitido em</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Usado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vouchersList.slice(0, 20).map((v: any) => (
                          <tr key={v.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{v.code}</code>
                            </td>
                            <td className="p-3 font-medium text-xs">{v.customerName ?? "—"}</td>
                            <td className="p-3 text-xs text-muted-foreground">{v.productName ?? "P13"}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${
                                v.status === "ativo" ? "bg-green-100 text-green-700" :
                                v.status === "usado" ? "bg-blue-100 text-blue-700" :
                                v.status === "cancelado" ? "bg-red-100 text-red-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {v.status === "ativo" && <CheckCircle2 className="w-3 h-3" />}
                                {v.status === "usado" && <CheckCircle2 className="w-3 h-3" />}
                                {v.status === "cancelado" && <XCircle className="w-3 h-3" />}
                                {v.status === "expirado" && <Clock className="w-3 h-3" />}
                                {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {v.issuedAt ? new Date(v.issuedAt).toLocaleDateString("pt-BR") : "—"}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {v.usedAt ? new Date(v.usedAt).toLocaleDateString("pt-BR") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
