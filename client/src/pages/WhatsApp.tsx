/**
 * Página de Integração WhatsApp — Meta Cloud API
 * Configuração completa salva no banco de dados, sem intermediários.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  MessageSquare, Settings, History, Send, TestTube2,
  CheckCircle2, XCircle, Clock, RefreshCw, Info, BookOpen,
  Phone, Key, Building2, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function WhatsApp() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="p-2 bg-green-100 rounded-lg">
          <MessageSquare className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
          <p className="text-sm text-gray-500">
            Integração com WhatsApp Cloud API (Meta) — sem intermediários
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge />
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">
            <Settings className="h-4 w-4 mr-1.5" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1.5" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="guide">
            <BookOpen className="h-4 w-4 mr-1.5" />
            Guia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <ConfigTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>
        <TabsContent value="guide" className="mt-4">
          <GuideTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Badge de Status ──────────────────────────────────────────────────────────
function StatusBadge() {
  const { data } = trpc.whatsapp.getStatus.useQuery();
  if (!data) return null;
  if (data.isConfigured && data.isActive) {
    return <Badge className="bg-green-100 text-green-700 border-green-200">● Ativo</Badge>;
  }
  if (data.isConfigured && !data.isActive) {
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">● Configurado (inativo)</Badge>;
  }
  return <Badge className="bg-gray-100 text-gray-500 border-gray-200">● Não configurado</Badge>;
}

// ─── Aba de Configuração ──────────────────────────────────────────────────────
function ConfigTab() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.whatsapp.getConfig.useQuery();

  const [form, setForm] = useState({
    phoneNumberId: "",
    accessToken: "",
    businessAccountId: "",
    phoneNumber: "",
    isActive: false,
    notifyOnNewOrder: true,
    notifyOnConfirmed: true,
    notifyOnOutForDelivery: true,
    notifyOnDelivered: true,
    notifyOnCancelled: true,
    notifyOnCreditDue: true,
  });
  const [initialized, setInitialized] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualMsg, setManualMsg] = useState("");

  if (config && !initialized) {
    setForm({
      phoneNumberId: config.phoneNumberId ?? "",
      accessToken: "", // Não pré-preencher o token mascarado
      businessAccountId: config.businessAccountId ?? "",
      phoneNumber: config.phoneNumber ?? "",
      isActive: config.isActive ?? false,
      notifyOnNewOrder: config.notifyOnNewOrder ?? true,
      notifyOnConfirmed: config.notifyOnConfirmed ?? true,
      notifyOnOutForDelivery: config.notifyOnOutForDelivery ?? true,
      notifyOnDelivered: config.notifyOnDelivered ?? true,
      notifyOnCancelled: config.notifyOnCancelled ?? true,
      notifyOnCreditDue: config.notifyOnCreditDue ?? true,
    });
    setInitialized(true);
  }

  const saveMutation = trpc.whatsapp.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      utils.whatsapp.getConfig.invalidate();
      utils.whatsapp.getStatus.invalidate();
    },
    onError: (err) => toast.error(`Erro ao salvar: ${err.message}`),
  });

  const testMutation = trpc.whatsapp.testConnection.useMutation({
    onSuccess: (data) => toast.success(`Mensagem de teste enviada! ID: ${data.messageId}`),
    onError: (err) => toast.error(`Falha no teste: ${err.message}`),
  });

  const sendManualMutation = trpc.whatsapp.sendManual.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada com sucesso!");
      setManualPhone("");
      setManualMsg("");
    },
    onError: (err) => toast.error(`Erro ao enviar: ${err.message}`),
  });

  const handleSave = () => {
    saveMutation.mutate({
      ...form,
      templateNewOrder: config?.templateNewOrder ?? "Olá {nome}! 🛢️ Seu pedido #{numero} foi recebido. Total: R$ {total}.",
      templateConfirmed: config?.templateConfirmed ?? "Olá {nome}! ✅ Seu pedido #{numero} foi confirmado.",
      templateOutForDelivery: config?.templateOutForDelivery ?? "Olá {nome}! 🚴 Seu pedido #{numero} saiu para entrega com {entregador}.",
      templateDelivered: config?.templateDelivered ?? "Olá {nome}! 🎉 Seu pedido #{numero} foi entregue. Obrigado!",
      templateCancelled: config?.templateCancelled ?? "Olá {nome}! ❌ Seu pedido #{numero} foi cancelado.",
      templateCreditDue: config?.templateCreditDue ?? "Olá {nome}! 💰 Sua nota de fiado de R$ {valor} vence em {data}.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Credenciais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-5 w-5 text-green-600" />
            Credenciais Meta Cloud API
          </CardTitle>
          <CardDescription>
            Obtenha em developers.facebook.com → Seu App → WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
            <Input
              id="phoneNumberId"
              placeholder="Ex: 123456789012345"
              value={form.phoneNumberId}
              onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
            />
            <p className="text-xs text-gray-500">Em WhatsApp → Configuração da API</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accessToken">
              Access Token *
              {config?._hasToken && (
                <Badge variant="outline" className="ml-2 text-xs text-green-600 border-green-300">
                  Token salvo
                </Badge>
              )}
            </Label>
            <Input
              id="accessToken"
              type="password"
              placeholder={
                config?._hasToken
                  ? "Deixe em branco para manter o token atual"
                  : "Cole o token de acesso permanente aqui"
              }
              value={form.accessToken}
              onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              Token permanente: Configurações do sistema → Usuários do sistema
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessAccountId">
              <Building2 className="h-3 w-3 inline mr-1" />
              Business Account ID *
            </Label>
            <Input
              id="businessAccountId"
              placeholder="Ex: 987654321098765"
              value={form.businessAccountId}
              onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber">
              <Phone className="h-3 w-3 inline mr-1" />
              Número de Telefone Verificado *
            </Label>
            <Input
              id="phoneNumber"
              placeholder="Ex: (11) 99999-8888"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              Número verificado na Meta (não pode ser o do WhatsApp pessoal)
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
            <div>
              <p className="font-medium text-sm">Ativar WhatsApp</p>
              <p className="text-xs text-gray-500">Habilitar envio automático de mensagens</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
          </div>

          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
            Salvar Configuração
          </Button>
        </CardContent>
      </Card>

      {/* Notificações e Testes */}
      <div className="space-y-4">
        {/* Notificações */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notificações Automáticas</CardTitle>
            <CardDescription>Escolha quais eventos disparam mensagens ao cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "notifyOnNewOrder", label: "Novo pedido recebido" },
              { key: "notifyOnConfirmed", label: "Pedido confirmado" },
              { key: "notifyOnOutForDelivery", label: "Saiu para entrega" },
              { key: "notifyOnDelivered", label: "Pedido entregue" },
              { key: "notifyOnCancelled", label: "Pedido cancelado" },
              { key: "notifyOnCreditDue", label: "Fiado vencendo" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <Switch
                  checked={form[key as keyof typeof form] as boolean}
                  onCheckedChange={(v) => setForm({ ...form, [key]: v })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Teste de Conexão */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TestTube2 className="h-4 w-4 text-blue-600" />
              Testar Conexão
            </CardTitle>
            <CardDescription>Envie uma mensagem de teste para verificar a integração</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="(11) 99999-8888"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <Button
              variant="outline"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => testMutation.mutate({ toPhone: testPhone })}
              disabled={testMutation.isPending || !testPhone}
            >
              {testMutation.isPending
                ? <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                : <TestTube2 className="h-4 w-4 mr-2" />}
              Enviar Mensagem de Teste
            </Button>
          </CardContent>
        </Card>

        {/* Mensagem Manual */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-purple-600" />
              Enviar Mensagem Manual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Número do destinatário: (11) 99999-8888"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
            />
            <Textarea
              placeholder="Digite a mensagem..."
              rows={3}
              value={manualMsg}
              onChange={(e) => setManualMsg(e.target.value)}
            />
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={() =>
                sendManualMutation.mutate({ toPhone: manualPhone, message: manualMsg })
              }
              disabled={sendManualMutation.isPending || !manualPhone || !manualMsg}
            >
              {sendManualMutation.isPending
                ? <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                : <Send className="h-4 w-4 mr-2" />}
              Enviar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Aba de Templates ─────────────────────────────────────────────────────────
function TemplatesTab() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.whatsapp.getConfig.useQuery();
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  if (config && !initialized) {
    setTemplates({
      templateNewOrder: config.templateNewOrder ?? "",
      templateConfirmed: config.templateConfirmed ?? "",
      templateOutForDelivery: config.templateOutForDelivery ?? "",
      templateDelivered: config.templateDelivered ?? "",
      templateCancelled: config.templateCancelled ?? "",
      templateCreditDue: config.templateCreditDue ?? "",
    });
    setInitialized(true);
  }

  const saveMutation = trpc.whatsapp.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Templates salvos com sucesso!");
      utils.whatsapp.getConfig.invalidate();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const handleSave = () => {
    if (!config) return;
    saveMutation.mutate({
      phoneNumberId: config.phoneNumberId ?? "",
      accessToken: "", // Manter token atual (backend ignora string vazia)
      businessAccountId: config.businessAccountId ?? "",
      phoneNumber: config.phoneNumber ?? "",
      isActive: config.isActive ?? false,
      notifyOnNewOrder: config.notifyOnNewOrder ?? true,
      notifyOnConfirmed: config.notifyOnConfirmed ?? true,
      notifyOnOutForDelivery: config.notifyOnOutForDelivery ?? true,
      notifyOnDelivered: config.notifyOnDelivered ?? true,
      notifyOnCancelled: config.notifyOnCancelled ?? true,
      notifyOnCreditDue: config.notifyOnCreditDue ?? true,
      templateNewOrder: templates.templateNewOrder ?? "",
      templateConfirmed: templates.templateConfirmed ?? "",
      templateOutForDelivery: templates.templateOutForDelivery ?? "",
      templateDelivered: templates.templateDelivered ?? "",
      templateCancelled: templates.templateCancelled ?? "",
      templateCreditDue: templates.templateCreditDue ?? "",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const templateFields = [
    { key: "templateNewOrder", label: "Novo Pedido", emoji: "🛢️", vars: "{nome}, {numero}, {total}" },
    { key: "templateConfirmed", label: "Pedido Confirmado", emoji: "✅", vars: "{nome}, {numero}" },
    { key: "templateOutForDelivery", label: "Saiu para Entrega", emoji: "🚴", vars: "{nome}, {numero}, {entregador}" },
    { key: "templateDelivered", label: "Pedido Entregue", emoji: "🎉", vars: "{nome}, {numero}" },
    { key: "templateCancelled", label: "Pedido Cancelado", emoji: "❌", vars: "{nome}, {numero}" },
    { key: "templateCreditDue", label: "Fiado Vencendo", emoji: "💰", vars: "{nome}, {valor}, {data}" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Variáveis disponíveis nos templates</p>
          <p className="mt-1">
            Use <code className="bg-blue-100 px-1 rounded">{"{variavel}"}</code> para inserir dados
            dinâmicos. As variáveis disponíveis estão indicadas em cada template.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templateFields.map(({ key, label, emoji, vars }) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {emoji} {label}
              </CardTitle>
              <CardDescription className="text-xs">Variáveis: {vars}</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={4}
                value={templates?.[key] ?? ""}
                onChange={(e) =>
                  setTemplates((prev) => ({ ...(prev ?? {}), [key]: e.target.value }))
                }
                className="text-sm resize-none"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={handleSave}
        disabled={saveMutation.isPending || !config}
      >
        {saveMutation.isPending && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
        Salvar Templates
      </Button>
    </div>
  );
}

// ─── Aba de Histórico ─────────────────────────────────────────────────────────
function HistoryTab() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "sent" | "failed" | "pending">("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data: stats } = trpc.whatsapp.getStats.useQuery();
  const { data, isLoading, refetch } = trpc.whatsapp.getMessageLog.useQuery({
    limit,
    offset,
    status,
    search: search || undefined,
  });

  const statusIcon = (s: string) => {
    if (s === "sent") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === "failed") return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const statusLabel = (s: string) => {
    if (s === "sent") return "Enviado";
    if (s === "failed") return "Falhou";
    return "Pendente";
  };

  const eventLabel = (e: string) => {
    const map: Record<string, string> = {
      new_order: "Novo Pedido",
      confirmed: "Confirmado",
      out_for_delivery: "Saiu p/ Entrega",
      delivered: "Entregue",
      cancelled: "Cancelado",
      credit_due: "Fiado Vencendo",
      test: "Teste",
    };
    return map[e] ?? e;
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-gray-700" },
            { label: "Enviados", value: stats.sent, color: "text-green-600" },
            { label: "Falhas", value: stats.failed, color: "text-red-600" },
            { label: "Pendentes", value: stats.pending, color: "text-yellow-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center py-3">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Input
          placeholder="Buscar por número ou nome..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="flex-1"
        />
        <select
          className="border rounded-md px-3 py-2 text-sm bg-white"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setOffset(0);
          }}
        >
          <option value="all">Todos</option>
          <option value="sent">Enviados</option>
          <option value="failed">Falhas</option>
          <option value="pending">Pendentes</option>
        </select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : !data?.items.length ? (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhuma mensagem encontrada</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
                <th className="text-left p-3 font-medium text-gray-600">Destinatário</th>
                <th className="text-left p-3 font-medium text-gray-600">Evento</th>
                <th className="text-left p-3 font-medium text-gray-600">Mensagem</th>
                <th className="text-left p-3 font-medium text-gray-600">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map((msg) => (
                <tr key={msg.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {statusIcon(msg.status)}
                      <span className="text-xs">{statusLabel(msg.status)}</span>
                    </div>
                    {msg.errorMessage && (
                      <p
                        className="text-xs text-red-500 mt-1 max-w-[120px] truncate"
                        title={msg.errorMessage}
                      >
                        {msg.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{msg.toName ?? "—"}</p>
                    <p className="text-gray-500 text-xs">{msg.toPhone}</p>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {eventLabel(msg.eventType ?? "")}
                    </Badge>
                  </td>
                  <td className="p-3 max-w-[200px]">
                    <p className="truncate text-gray-700" title={msg.messageBody ?? ""}>
                      {msg.messageBody}
                    </p>
                  </td>
                  <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > limit && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{data.total} mensagens no total</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= data.total}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Aba de Guia ──────────────────────────────────────────────────────────────
function GuideTab() {
  const { data: guide } = trpc.whatsapp.getSetupGuide.useQuery();
  const [openStep, setOpenStep] = useState<number | null>(1);

  if (!guide) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm text-green-800">
          <p className="font-semibold">{guide.title}</p>
          <p className="mt-1">
            Integração direta com a API oficial da Meta — sem mensalidades, sem
            intermediários.
          </p>
        </div>
      </div>

      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">Número separado obrigatório</p>
          <p className="mt-1">
            O número usado na API <strong>não pode</strong> ser o mesmo do WhatsApp pessoal ou
            Business App. Use um chip/número dedicado para a loja.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {guide.steps.map((step) => (
          <div key={step.number} className="border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setOpenStep(openStep === step.number ? null : step.number)}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">
                  {step.number}
                </div>
                <div>
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
              {openStep === step.number ? (
                <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              )}
            </button>
            {openStep === step.number && (
              <div className="px-4 pb-4 border-t bg-gray-50">
                <ul className="mt-3 space-y-1.5">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 mt-0.5 shrink-0">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="font-medium text-sm text-gray-700">Observações importantes</p>
        {guide.notes.map((note, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded"
          >
            <span>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
