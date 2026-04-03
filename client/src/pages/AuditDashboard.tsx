/**
 * Dashboard de Auditoria
 * Visualiza logs de segurança e atividades do sistema
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle, CheckCircle2, Download, Filter, BarChart3,
  Shield, Activity, Clock, Users, RefreshCw, Search, X, TrendingUp, Eye,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const ACTION_TYPES = [
  { value: "all", label: "Todas as ações" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "ORDER_CREATE", label: "Criar Pedido" },
  { value: "ORDER_UPDATE", label: "Atualizar Pedido" },
  { value: "ORDER_DELETE", label: "Cancelar Pedido" },
  { value: "PRODUCT_CREATE", label: "Criar Produto" },
  { value: "PRODUCT_UPDATE", label: "Atualizar Produto" },
  { value: "STOCK_UPDATE", label: "Atualizar Estoque" },
  { value: "FULL_GAS_PERMISSION", label: "Permissão Gás Cheio" },
  { value: "COUPON_CREATE", label: "Criar Cupom" },
  { value: "COUPON_APPLY", label: "Aplicar Cupom" },
];

const RESOURCE_TYPES = [
  { value: "all", label: "Todos os recursos" },
  { value: "order", label: "Pedido" },
  { value: "product", label: "Produto" },
  { value: "stock", label: "Estoque" },
  { value: "user", label: "Usuário" },
  { value: "coupon", label: "Cupom" },
  { value: "deliverer", label: "Entregador" },
  { value: "settings", label: "Configurações" },
];

export default function AuditDashboard() {
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    action: string;
    userId: number | undefined;
    resourceType: string;
    searchTerm: string;
  }>({
    action: "",
    userId: undefined,
    resourceType: "",
    searchTerm: "",
  });
  const [dateRange, setDateRange] = useState({
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");

  function applyDateRange() {
    setDateRange({
      startDate: startDateStr ? new Date(startDateStr + "T00:00:00") : undefined,
      endDate: endDateStr ? new Date(endDateStr + "T23:59:59") : undefined,
    });
    setPage(1);
  }

  function clearFilters() {
    setFilters({ action: "", userId: undefined, resourceType: "", searchTerm: "" });
    setDateRange({ startDate: undefined, endDate: undefined });
    setStartDateStr("");
    setEndDateStr("");
    setPage(1);
  }

  const hasActiveFilters = !!(
    filters.action || filters.resourceType || filters.searchTerm ||
    dateRange.startDate || dateRange.endDate
  );

  const { data: logsData, isLoading, refetch } = trpc.audit.list.useQuery({
    page,
    limit: 20,
    ...filters,
    ...dateRange,
  });

  const { data: stats } = trpc.audit.stats.useQuery();
  const { data: activityByHour } = trpc.audit.activityByHour.useQuery();

  const { refetch: refetchExport } = trpc.audit.exportCsv.useQuery(
    { startDate: dateRange.startDate, endDate: dateRange.endDate },
    { enabled: false }
  );

  const handleExport = async () => {
    const result = await refetchExport();
    const data = result.data;
    const blob = new Blob([data?.csv ?? ""], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data?.filename ?? "audit-logs.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    if (action.includes("LOGIN")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (action.includes("LOGOUT")) return "bg-slate-100 text-slate-700 border-slate-200";
    if (action.includes("CREATE")) return "bg-green-100 text-green-800 border-green-200";
    if (action.includes("DELETE") || action.includes("CANCEL")) return "bg-red-100 text-red-800 border-red-200";
    if (action.includes("UPDATE")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (action.includes("FULL_GAS")) return "bg-orange-100 text-orange-800 border-orange-200";
    if (action.includes("COUPON")) return "bg-purple-100 text-purple-800 border-purple-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <AdminLayout title="Auditoria">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Dashboard de Auditoria
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitore todas as atividades e operações sensíveis do sistema
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-9">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 h-9">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-white">24h</Badge>
                </div>
                <p className="text-3xl font-black text-blue-600">{stats.totalLast24h}</p>
                <p className="text-xs text-blue-700/70 font-medium mt-1">Atividades nas últimas 24h</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-white">Tipos</Badge>
                </div>
                <p className="text-3xl font-black text-green-600">{stats.actionBreakdown.length}</p>
                <p className="text-xs text-green-700/70 font-medium mt-1">Tipos de ação distintos</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-white">Total</Badge>
                </div>
                <p className="text-3xl font-black text-orange-600">{logsData?.pagination?.total ?? "—"}</p>
                <p className="text-xs text-orange-700/70 font-medium mt-1">Registros totais</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-white">Página</Badge>
                </div>
                <p className="text-3xl font-black text-purple-600">{page}</p>
                <p className="text-xs text-purple-700/70 font-medium mt-1">de {logsData?.pagination?.pages ?? 1} páginas</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráfico de Atividades */}
        {activityByHour && activityByHour.length > 0 && (
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Atividades por Hora (Últimas 24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={activityByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#ef4444" dot={false} strokeWidth={2} name="Atividades" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                Filtros
                {hasActiveFilters && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Ativos</Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1 text-muted-foreground">
                    <X className="w-3.5 h-3.5" /> Limpar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} className="h-8 text-xs">
                  {showFilters ? "Ocultar" : "Mostrar"} Filtros
                </Button>
              </div>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Tipo de Ação</label>
                  <Select
                    value={filters.action || "all"}
                    onValueChange={(v) => { setFilters({ ...filters, action: v === "all" ? "" : v }); setPage(1); }}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Tipo de Recurso</label>
                  <Select
                    value={filters.resourceType || "all"}
                    onValueChange={(v) => { setFilters({ ...filters, resourceType: v === "all" ? "" : v }); setPage(1); }}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Buscar por recurso</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Nome do recurso..."
                      value={filters.searchTerm}
                      onChange={(e) => { setFilters({ ...filters, searchTerm: e.target.value }); setPage(1); }}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">ID do Usuário</label>
                  <Input
                    type="number"
                    placeholder="Ex: 1"
                    value={filters.userId ?? ""}
                    onChange={(e) => { setFilters({ ...filters, userId: e.target.value ? parseInt(e.target.value) : undefined }); setPage(1); }}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-border/60">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Data Inicial</label>
                  <Input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="h-9 text-sm w-40"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Data Final</label>
                  <Input
                    type="date"
                    value={endDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className="h-9 text-sm w-40"
                  />
                </div>
                <Button size="sm" onClick={applyDateRange} className="h-9 gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Aplicar Período
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Tabela de Logs */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Logs de Auditoria
              {logsData && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({logsData.pagination.total} registros)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Carregando logs...</p>
              </div>
            ) : !logsData || logsData.logs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="font-semibold text-foreground mb-1">Nenhum log encontrado</p>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Tente remover os filtros aplicados"
                    : "Os logs aparecerão aqui conforme o sistema for usado"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Data/Hora</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Ação</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Usuário</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground">Recurso</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsData.logs.map((log: any, i: number) => (
                        <tr
                          key={log.id}
                          className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className="text-xs whitespace-nowrap">
                                {format(new Date(log.createdAt as Date), "dd/MM/yy HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`text-xs font-medium border ${getActionColor(log.action)}`}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Users className="w-3 h-3 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-xs">{log.userName || "Sistema"}</p>
                                {log.userRole && (
                                  <p className="text-[10px] text-muted-foreground capitalize">{log.userRole}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-foreground text-xs font-medium">{log.resourceName || "—"}</p>
                              {log.resourceType && (
                                <p className="text-[10px] text-muted-foreground capitalize">{log.resourceType}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {log.success ? (
                              <div className="inline-flex items-center gap-1 text-green-600 bg-green-50 rounded-full px-2 py-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="text-xs font-medium">OK</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-red-600 bg-red-50 rounded-full px-2 py-0.5">
                                <AlertCircle className="w-3 h-3" />
                                <span className="text-xs font-medium">Erro</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {logsData.pagination.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Página{" "}
                      <span className="font-semibold text-foreground">{logsData.pagination.page}</span>
                      {" "}de{" "}
                      <span className="font-semibold text-foreground">{logsData.pagination.pages}</span>
                      {" "}· {logsData.pagination.total} registros
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="h-8 text-xs"
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.min(logsData.pagination.pages, page + 1))}
                        disabled={page === logsData.pagination.pages}
                        className="h-8 text-xs"
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Breakdown de Ações */}
        {stats && stats.actionBreakdown.length > 0 && (
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Distribuição por Tipo de Ação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.actionBreakdown.slice(0, 8).map((item: any) => {
                  const max = stats.actionBreakdown[0]?.count ?? 1;
                  const pct = Math.round((item.count / max) * 100);
                  return (
                    <div key={item.action} className="flex items-center gap-3">
                      <div className="w-36 text-xs text-muted-foreground truncate">{item.action}</div>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-8 text-xs font-semibold text-foreground text-right">{item.count}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
