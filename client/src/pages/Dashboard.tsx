import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import {
  DollarSign, ShoppingCart, Clock, TrendingUp, AlertTriangle,
  Users, ArrowRight, CheckCircle, Plus, RefreshCw,
  Flame, TrendingDown, Minus, Eye, Package, BarChart3,
  Zap, Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  novo:                   "bg-blue-50 text-blue-700 border border-blue-200",
  em_preparo:             "bg-amber-50 text-amber-700 border border-amber-200",
  aguardando_entregador:  "bg-orange-50 text-orange-700 border border-orange-200",
  saiu_entrega:           "bg-violet-50 text-violet-700 border border-violet-200",
  entregue:               "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelado:              "bg-red-50 text-red-600 border border-red-200",
};
const STATUS_LABELS: Record<string, string> = {
  novo:                   "Novo",
  em_preparo:             "Em Preparo",
  aguardando_entregador:  "Aguard. Entregador",
  saiu_entrega:           "Saiu p/ Entrega",
  entregue:               "Entregue",
  cancelado:              "Cancelado",
};
const STATUS_DOT: Record<string, string> = {
  novo:                   "bg-blue-500",
  em_preparo:             "bg-amber-500",
  aguardando_entregador:  "bg-orange-500",
  saiu_entrega:           "bg-violet-500",
  entregue:               "bg-emerald-500",
  cancelado:              "bg-red-500",
};
const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix:      "Pix",
  debito:   "Débito",
  credito:  "Crédito",
  fiado:    "Fiado",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function getTimeAgo(date: Date | string) {
  const now = new Date();
  const d = new Date(date);
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  return d.toLocaleDateString("pt-BR");
}
function getTrend(current: number, previous: number) {
  if (previous === 0) return { pct: 0, neutral: true, up: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), up: pct >= 0, neutral: pct === 0 };
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  title, value, icon: Icon, iconBg, iconColor, loading, alert, trend, subtitle, gradientClass,
}: {
  title: string; value: string; icon: any; iconBg: string; iconColor: string;
  loading?: boolean; alert?: boolean;
  trend?: { pct: number; up: boolean; neutral: boolean };
  subtitle?: string;
  gradientClass?: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-md ${
      alert ? "border-red-300 bg-red-50/40" : gradientClass ?? "bg-card border-border"
    }`} style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded-lg" />
          ) : (
            <p className="text-[28px] font-extrabold text-foreground leading-none tracking-tight">{value}</p>
          )}
          {subtitle && !loading && (
            <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
          )}
          {trend && !loading && (
            <div className={`inline-flex items-center gap-1 mt-2.5 text-[11px] font-semibold px-2 py-1 rounded-full ${
              trend.neutral ? "bg-muted text-muted-foreground" : trend.up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
            }`}>
              {trend.neutral ? <Minus className="w-3 h-3" /> : trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trend.neutral ? "Igual a ontem" : `${trend.pct}% vs ontem`}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0 shadow-sm ${alert ? "animate-pulse" : ""}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ href, icon: Icon, label, iconBg, badge }: {
  href: string; icon: any; label: string; iconBg: string; badge?: string;
}) {
  return (
    <Link href={href}>
      <div className="relative flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/3 transition-all duration-150 cursor-pointer group">
        {badge && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-brand">
            {badge}
          </span>
        )}
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs font-semibold text-foreground/75 text-center leading-tight group-hover:text-foreground transition-colors">{label}</span>
      </div>
    </Link>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const { data: metrics, isLoading, refetch, isFetching } = trpc.dashboard.metrics.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: totalCustomers } = trpc.dashboard.totalCustomers.useQuery();

  const salesChart = metrics?.salesChart ?? [];
  const todayTotal = metrics?.todaySalesTotal ?? 0;
  const yesterdayTotal = salesChart.length >= 2 ? salesChart[salesChart.length - 2]?.total ?? 0 : 0;
  const todayCount = metrics?.todayOrdersCount ?? 0;
  const yesterdayCount = salesChart.length >= 2 ? salesChart[salesChart.length - 2]?.count ?? 0 : 0;
  const weeklyTotal = salesChart.reduce((a: number, c: any) => a + c.total, 0);

  const salesTrend = getTrend(todayTotal, yesterdayTotal);
  const ordersTrend = getTrend(todayCount, yesterdayCount);

  const pendingCount = metrics?.pendingOrdersCount ?? 0;
  const lowStockCount = metrics?.lowStockCount ?? 0;

  const hourNow = new Date().getHours();
  const greeting = hourNow < 12 ? "Bom dia" : hourNow < 18 ? "Boa tarde" : "Boa noite";

  // Status summary from recent orders
  const statusSummary = [
    { status: "novo",        count: metrics?.recentOrders?.filter((o: any) => o.status === "novo").length ?? 0 },
    { status: "em_preparo",  count: metrics?.recentOrders?.filter((o: any) => o.status === "em_preparo").length ?? 0 },
    { status: "saiu_entrega",count: metrics?.recentOrders?.filter((o: any) => o.status === "saiu_entrega").length ?? 0 },
    { status: "entregue",    count: metrics?.recentOrders?.filter((o: any) => o.status === "entregue").length ?? 0 },
    { status: "cancelado",   count: metrics?.recentOrders?.filter((o: any) => o.status === "cancelado").length ?? 0 },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-5 animate-fade-in">

        {/* ─── Welcome Banner ─────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white">
          {/* Decorative */}
          <div className="absolute inset-0 bg-dots opacity-15 pointer-events-none" />
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/8 pointer-events-none" />
          <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full bg-yellow-400/20 flex items-center justify-center">
                  <Flame className="w-3 h-3 text-yellow-300" />
                </div>
                <p className="text-white/65 text-xs font-medium capitalize">
                  {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
              <h2 className="text-xl font-extrabold leading-tight tracking-tight">{greeting}, Patrick! 👋</h2>
              <p className="text-white/65 text-sm mt-1 leading-relaxed">
                {isLoading ? (
                  <span className="inline-block h-4 w-48 bg-white/15 rounded animate-pulse" />
                ) : (
                  <>
                    {pendingCount > 0
                      ? <span className="text-yellow-300 font-semibold">{pendingCount} pedido{pendingCount > 1 ? "s" : ""} aguardando ação</span>
                      : <span className="text-white/65">Nenhum pedido pendente agora</span>}
                    {lowStockCount > 0 && (
                      <span className="ml-2 text-red-300 font-medium">· {lowStockCount} produto{lowStockCount > 1 ? "s" : ""} com estoque baixo</span>
                    )}
                  </>
                )}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/12 hover:bg-white/20 transition-colors flex items-center justify-center"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 text-white ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Mini stats inline */}
          <div className="relative z-10 flex items-center gap-4 mt-4 pt-4 border-t border-white/12">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-white/50" />
              <span className="text-xs text-white/65">Hoje: <strong className="text-white">{formatCurrency(todayTotal)}</strong></span>
            </div>
            <div className="w-px h-3 bg-white/15" />
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-white/50" />
              <span className="text-xs text-white/65"><strong className="text-white">{todayCount}</strong> pedidos</span>
            </div>
            <div className="w-px h-3 bg-white/15" />
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-white/50" />
              <span className="text-xs text-white/65"><strong className="text-white">{metrics?.deliveredTodayCount ?? 0}</strong> entregues</span>
            </div>
          </div>
        </div>

        {/* ─── Quick Actions ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          <QuickAction
            href="/pedidos"
            icon={Plus}
            label="Novo Pedido"
            iconBg="bg-primary"
            badge={pendingCount > 0 ? String(pendingCount) : undefined}
          />
          <QuickAction
            href="/estoque"
            icon={AlertTriangle}
            label="Estoque"
            iconBg={lowStockCount > 0 ? "bg-red-500" : "bg-slate-500"}
            badge={lowStockCount > 0 ? String(lowStockCount) : undefined}
          />
          <QuickAction href="/clientes" icon={Users} label="Clientes" iconBg="bg-violet-500" />
          <QuickAction href="/relatorios" icon={BarChart3} label="Relatórios" iconBg="bg-indigo-500" />
        </div>

        {/* ─── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Vendas Hoje"
            value={isLoading ? "..." : formatCurrency(todayTotal)}
            icon={DollarSign}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
            loading={isLoading}
            trend={salesTrend}
            subtitle={`Semanal: ${formatCurrency(weeklyTotal)}`}
            gradientClass="kpi-gradient-green"
          />
          <KpiCard
            title="Pedidos Hoje"
            value={isLoading ? "..." : String(todayCount)}
            icon={ShoppingCart}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            loading={isLoading}
            trend={ordersTrend}
            subtitle={`${metrics?.deliveredTodayCount ?? 0} entregue${(metrics?.deliveredTodayCount ?? 0) !== 1 ? "s" : ""}`}
            gradientClass="kpi-gradient-blue"
          />
          <KpiCard
            title="Em Andamento"
            value={isLoading ? "..." : String(pendingCount)}
            icon={Clock}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            loading={isLoading}
            alert={pendingCount > 5}
            subtitle="Aguardando ação"
            gradientClass="kpi-gradient-orange"
          />
          <KpiCard
            title="Clientes"
            value={totalCustomers === undefined ? "..." : String(totalCustomers)}
            icon={Users}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            loading={totalCustomers === undefined}
            subtitle={`${metrics?.activeProductsCount ?? 0} produtos ativos`}
            gradientClass="kpi-gradient-violet"
          />
        </div>

        {/* ─── Charts Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales Chart */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.06), 0 4px 12px oklch(0.13 0.018 240 / 0.04)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Vendas — Últimos 7 dias</p>
                  <p className="text-xs text-muted-foreground">Receita total por dia</p>
                </div>
              </div>
              <div className="flex gap-1 bg-muted/60 p-1 rounded-lg">
                {(["area", "bar"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartType(t)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      chartType === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "area" ? "Área" : "Barras"}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5">
              {isLoading ? (
                <div className="h-52 bg-muted/50 animate-pulse rounded-xl" />
              ) : salesChart.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">Sem dados de vendas</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  {chartType === "area" ? (
                    <AreaChart data={salesChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="oklch(0.535 0.225 25)" stopOpacity={0.20} />
                          <stop offset="95%" stopColor="oklch(0.535 0.225 25)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 240)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "oklch(0.52 0.012 240)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.012 240)" }} tickFormatter={(v) => `R$${v}`} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number) => [formatCurrency(v), "Vendas"]}
                        contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid oklch(0.905 0.005 240)", boxShadow: "0 4px 16px oklch(0.13 0.018 240 / 0.10)", background: "white" }}
                      />
                      <Area type="monotone" dataKey="total" stroke="oklch(0.535 0.225 25)" strokeWidth={2.5} fill="url(#salesGrad)" dot={{ r: 3, fill: "oklch(0.535 0.225 25)", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                    </AreaChart>
                  ) : (
                    <BarChart data={salesChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.004 240)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "oklch(0.52 0.012 240)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.012 240)" }} tickFormatter={(v) => `R$${v}`} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number) => [formatCurrency(v), "Vendas"]}
                        contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid oklch(0.905 0.005 240)", boxShadow: "0 4px 16px oklch(0.13 0.018 240 / 0.10)", background: "white" }}
                      />
                      <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                        {salesChart.map((_: any, index: number) => (
                          <Cell
                            key={index}
                            fill={index === salesChart.length - 1 ? "oklch(0.535 0.225 25)" : "oklch(0.82 0.08 25)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Status Summary */}
          <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.06), 0 4px 12px oklch(0.13 0.018 240 / 0.04)" }}>
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Resumo por Status</p>
                <p className="text-xs text-muted-foreground">Pedidos recentes</p>
              </div>
            </div>
            <div className="p-3">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted/50 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {statusSummary.map(({ status, count }) => (
                    <Link key={status} href={`/pedidos?status=${status}`}>
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
                          <span className="text-sm font-medium text-foreground">{STATUS_LABELS[status]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>{count}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Recent Orders ──────────────────────────────────────────────── */}
        <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.06), 0 4px 12px oklch(0.13 0.018 240 / 0.04)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Pedidos Recentes</p>
                <p className="text-xs text-muted-foreground">Últimas movimentações</p>
              </div>
            </div>
            <Link href="/pedidos">
              <Button variant="ghost" size="sm" className="text-xs text-primary h-7 gap-1 hover:bg-primary/8">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !metrics?.recentOrders?.length ? (
            <div className="text-center py-14">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-6 h-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhum pedido registrado</p>
              <Link href="/pedidos">
                <Button size="sm" className="mt-3 gap-1.5 shadow-brand">
                  <Plus className="w-3.5 h-3.5" /> Criar primeiro pedido
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="text-left py-2.5 px-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Pedido</th>
                    <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                    <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Pgto</th>
                    <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Tempo</th>
                    <th className="text-right py-2.5 px-5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics?.recentOrders?.map((order: any) => (
                    <tr key={order.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-5">
                        <Link href={`/pedidos/${order.id}`}>
                          <span className="text-primary font-bold hover:underline cursor-pointer text-xs">
                            #{order.orderNumber}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-foreground truncate max-w-[130px]">{order.customerName}</p>
                        {order.neighborhood && (
                          <p className="text-[11px] text-muted-foreground truncate">{order.neighborhood}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{getTimeAgo(order.createdAt)}</span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <span className="text-sm font-bold text-foreground">{formatCurrency(parseFloat(order.total))}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Low Stock Alert ────────────────────────────────────────────── */}
        {lowStockCount > 0 && !isLoading && (
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-700">Alerta de Estoque Baixo</p>
                  <p className="text-xs text-red-500/80 mt-0.5">
                    {lowStockCount} produto{lowStockCount > 1 ? "s" : ""} abaixo do estoque mínimo
                  </p>
                </div>
              </div>
              <Link href="/estoque">
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-100 gap-1.5 text-xs bg-white">
                  <Eye className="w-3.5 h-3.5" /> Ver Estoque
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
