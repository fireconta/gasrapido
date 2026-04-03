import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText, Plus, DollarSign, AlertTriangle, CheckCircle2,
  Clock, Search, Bell, Trash2, X, Phone, User,
  CreditCard, Banknote, QrCode, ChevronDown, ChevronUp,
  Calendar, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function daysUntil(dueDate: string | Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pendente: { label: "Pendente", color: "text-yellow-700", bg: "bg-yellow-100", icon: Clock },
  parcial: { label: "Parcial", color: "text-blue-700", bg: "bg-blue-100", icon: DollarSign },
  vencido: { label: "Vencido", color: "text-red-700", bg: "bg-red-100", icon: AlertTriangle },
  pago: { label: "Pago", color: "text-green-700", bg: "bg-green-100", icon: CheckCircle2 },
};

const PAYMENT_METHODS = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "Pix", icon: QrCode },
  { value: "debito", label: "Débito", icon: CreditCard },
  { value: "credito", label: "Crédito", icon: CreditCard },
];

export default function NotasFiado() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<any | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: notes, refetch } = trpc.creditNotes.list.useQuery({ status: statusFilter as any }) as any;
  const { data: summary, refetch: refetchSummary } = trpc.creditNotes.summary.useQuery() as any;
  const { data: noteDetail } = trpc.creditNotes.getById.useQuery(
    { id: showDetailModal?.id ?? "" },
    { enabled: !!showDetailModal }
  ) as any;

  const checkNotifyMutation = trpc.creditNotes.checkAndNotifyDue.useMutation({
    onSuccess: (data) => {
      if (data.notified > 0) {
        toast.success(`${data.notified} notificação(ões) enviada(s)!`);
      } else {
        toast.info("Nenhuma nota vencendo para notificar");
      }
    },
  });

  const deleteMutation = trpc.creditNotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Nota excluída");
      refetch();
      refetchSummary();
    },
  });

  const filteredNotes = (notes ?? []).filter((n: any) => {
    if (!search) return true;
    return (
      n.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (n.customerPhone ?? "").includes(search) ||
      (n.orderNumber ?? "").includes(search)
    );
  });

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-500" />
              Notas de Fiado
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Controle de vendas a prazo com notificações de vencimento
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkNotifyMutation.mutate()}
              disabled={checkNotifyMutation.isPending}
              className="gap-2 text-sm"
            >
              <Bell className="w-4 h-4" />
              Verificar Vencimentos
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold"
            >
              <Plus className="w-4 h-4" /> Nova Nota
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "A Receber",
              value: formatCurrency(summary?.totalPending ?? 0),
              sub: `${summary?.pendingCount ?? 0} nota(s)`,
              color: "text-yellow-600",
              bg: "bg-yellow-50",
              icon: <Clock className="w-5 h-5" />,
            },
            {
              label: "Vencidas",
              value: formatCurrency(summary?.totalOverdue ?? 0),
              sub: `${summary?.overdueCount ?? 0} nota(s)`,
              color: "text-red-600",
              bg: "bg-red-50",
              icon: <AlertTriangle className="w-5 h-5" />,
            },
            {
              label: "Recebido",
              value: formatCurrency(summary?.totalPaid ?? 0),
              sub: `${summary?.paidCount ?? 0} nota(s)`,
              color: "text-green-600",
              bg: "bg-green-50",
              icon: <CheckCircle2 className="w-5 h-5" />,
            },
            {
              label: "Total Geral",
              value: formatCurrency((summary?.totalPending ?? 0) + (summary?.totalOverdue ?? 0) + (summary?.totalPaid ?? 0)),
              sub: "Todas as notas",
              color: "text-blue-600",
              bg: "bg-blue-50",
              icon: <FileText className="w-5 h-5" />,
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} flex-shrink-0`}>
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-foreground text-base leading-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-[10px] text-muted-foreground/70">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, telefone ou pedido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="parcial">Parciais</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Notas */}
        <div className="space-y-3">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-semibold text-foreground">Nenhuma nota encontrada</p>
              <p className="text-muted-foreground text-sm mt-1">Crie uma nova nota de fiado</p>
            </div>
          ) : (
            filteredNotes.map((note: any) => {
              const cfg = STATUS_CONFIG[note.status] ?? STATUS_CONFIG.pendente;
              const StatusIcon = cfg.icon;
              const remaining = parseFloat(String(note.amount)) - parseFloat(String(note.paidAmount));
              const days = daysUntil(note.dueDate);
              const isExpanded = expandedId === note.id;

              return (
                <Card key={note.id} className={`overflow-hidden transition-all ${note.status === "vencido" ? "border-red-200" : ""}`}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : note.id)}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {note.customerName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-foreground">{note.customerName}</p>
                        <Badge className={`${cfg.bg} ${cfg.color} border-0 text-xs gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                        {note.status !== "pago" && days <= 3 && days >= 0 && (
                          <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                            Vence em {days === 0 ? "hoje" : `${days}d`}
                          </Badge>
                        )}
                        {note.status !== "pago" && days < 0 && (
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                            {Math.abs(days)}d atraso
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {note.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {note.customerPhone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Vence: {formatDate(note.dueDate)}
                        </span>
                        {note.orderNumber && <span>Pedido #{note.orderNumber}</span>}
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-foreground text-base">{formatCurrency(remaining)}</p>
                      <p className="text-xs text-muted-foreground">de {formatCurrency(note.amount)}</p>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>

                  {/* Expandido */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3 bg-muted/20">
                      {note.description && (
                        <p className="text-sm text-muted-foreground mb-3 italic">"{note.description}"</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {note.status !== "pago" && (
                          <Button
                            size="sm"
                            onClick={() => setShowPayModal(note)}
                            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Registrar Pagamento
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDetailModal(note)}
                          className="gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ver Histórico
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (note.customerPhone) {
                              const msg = encodeURIComponent(
                                `Olá ${note.customerName}! Passando para lembrar que você tem um fiado de ${formatCurrency(remaining)} com vencimento em ${formatDate(note.dueDate)}. Gás Rápido Quirinópolis.`
                              );
                              window.open(`https://wa.me/55${note.customerPhone.replace(/\D/g, "")}?text=${msg}`, "_blank");
                            }
                          }}
                          disabled={!note.customerPhone}
                          className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                        >
                          Cobrar via WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate({ id: note.id })}
                          className="gap-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Nova Nota */}
      <CreateNoteModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { refetch(); refetchSummary(); setShowCreateModal(false); }}
      />

      {/* Modal: Registrar Pagamento */}
      {showPayModal && (
        <PayModal
          note={showPayModal}
          onClose={() => setShowPayModal(null)}
          onSuccess={() => { refetch(); refetchSummary(); setShowPayModal(null); }}
        />
      )}

      {/* Modal: Histórico de Pagamentos */}
      {showDetailModal && noteDetail && (
        <Dialog open onOpenChange={() => setShowDetailModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Histórico — {noteDetail.customerName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor total:</span>
                <span className="font-bold">{formatCurrency(noteDetail.amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pago:</span>
                <span className="font-bold text-green-600">{formatCurrency((noteDetail as any)?.paidAmount || noteDetail.amount - noteDetail.remaining)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(noteDetail.remaining)}
                </span>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Pagamentos</p>
                {noteDetail.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pagamento registrado</p>
                ) : (
                  (noteDetail?.payments || []).map((p: any) => (
                    <div key={p?.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(p?.amount || 0)}</p>
                        <p className="text-xs text-muted-foreground">{p?.paymentMethod} · {formatDate(p?.createdAt)}</p>
                      </div>
                      {p?.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailModal(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}

// ─── Modal: Criar Nova Nota ───────────────────────────────────────────────────
function CreateNoteModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    amount: "",
    dueDays: "30",
    description: "",
    orderNumber: "",
  });

  const createMutation = trpc.creditNotes.create.useMutation({
    onSuccess: () => {
      toast.success("Nota de fiado criada!");
      onSuccess();
      setForm({ customerName: "", customerPhone: "", amount: "", dueDays: "30", description: "", orderNumber: "" });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim() || !form.amount) {
      toast.error("Preencha nome e valor");
      return;
    }
    createMutation.mutate({
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim() || "",
      amount: parseFloat(form.amount),
      dueDays: parseInt(form.dueDays) || 30,
      description: form.description.trim() || undefined,
      orderNumber: form.orderNumber.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />
            Nova Nota de Fiado
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome do Cliente *</Label>
            <Input
              placeholder="Nome completo"
              value={form.customerName}
              onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input
                placeholder="(64) 99999-9999"
                value={form.customerPhone}
                onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nº do Pedido</Label>
              <Input
                placeholder="Opcional"
                value={form.orderNumber}
                onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Vence em (dias) *</Label>
              <Select value={form.dueDays} onValueChange={(v) => setForm((f) => ({ ...f, dueDays: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição / Observação</Label>
            <Textarea
              placeholder="Ex: 1 botijão P13 + 1 galão de água..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 resize-none"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createMutation.isPending ? "Salvando..." : "Criar Nota"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal: Registrar Pagamento ───────────────────────────────────────────────
function PayModal({ note, onClose, onSuccess }: { note: any; onClose: () => void; onSuccess: () => void }) {
  const remaining = parseFloat(String(note.amount)) - parseFloat(String(note.paidAmount));
  const [amount, setAmount] = useState(String(remaining.toFixed(2)));
  const [method, setMethod] = useState<"dinheiro" | "pix" | "debito" | "credito">("dinheiro");
  const [notes, setNotes] = useState("");

  const payMutation = trpc.creditNotes.addPayment.useMutation({
    onSuccess: (data) => {
      toast.success(data.status === "pago" ? "Fiado quitado!" : `Pagamento registrado! Saldo: ${formatCurrency(data.remaining)}`);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Registrar Pagamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-3 text-sm">
            <p className="font-bold text-foreground">{note.customerName}</p>
            <p className="text-muted-foreground">Saldo devedor: <span className="font-bold text-red-600">{formatCurrency(remaining)}</span></p>
          </div>
          <div>
            <Label>Valor pago (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 text-lg font-bold"
            />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value as any)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                    method === m.value
                      ? "border-green-500 bg-green-50"
                      : "border-border hover:border-green-200"
                  }`}
                >
                  <m.icon className={`w-4 h-4 ${method === m.value ? "text-green-600" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-medium ${method === m.value ? "text-green-700" : "text-foreground"}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Observação</Label>
            <Input
              placeholder="Opcional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => payMutation.mutate({
              creditNoteId: note.id,
              amount: parseFloat(amount),
              method: method,
              paymentMethod: method,
              notes: notes || undefined,
            })}
            disabled={payMutation.isPending || !amount || parseFloat(amount) <= 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {payMutation.isPending ? "Registrando..." : "Confirmar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
