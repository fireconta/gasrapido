import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePollingNotifications } from "@/hooks/usePollingNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import {
  Truck, Package, CheckCircle, Clock, MapPin, Phone,
  User, LogOut, Flame, Eye, Play, Flag, DollarSign,
  Banknote, QrCode, CreditCard, FileText, RefreshCw,
  Navigation, Map, ExternalLink, MessageCircle, ChevronDown,
  ChevronUp, Star, TrendingUp, AlertCircle, X, Lock, EyeOff,
  CheckCircle2, Circle, ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { InstallPWABanner } from "@/components/InstallPWABanner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, BellOff } from "lucide-react";

const ICON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/gas-rapido-icon_35041320.png";

type PaymentMethod = "dinheiro" | "pix" | "debito" | "credito" | "fiado";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: any; color: string }[] = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote, color: "text-green-600" },
  { value: "pix", label: "Pix", icon: QrCode, color: "text-blue-600" },
  { value: "debito", label: "Débito", icon: CreditCard, color: "text-purple-600" },
  { value: "credito", label: "Crédito", icon: CreditCard, color: "text-orange-600" },
  { value: "fiado", label: "Fiado", icon: FileText, color: "text-red-600" },
];

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_preparo: "Em Preparo",
  aguardando_entregador: "Aguardando",
  saiu_entrega: "Em Entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  novo: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  em_preparo: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  aguardando_entregador: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  saiu_entrega: { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  entregue: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelado: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

const DEPOT_LOCATION = { lat: -18.454595, lng: -50.4431345 };
const QUIRINOPOLIS_CENTER = { lat: -18.4545, lng: -50.4430 };

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface DelivererSession {
  id: number;
  name: string;
  token: string;
}

export default function DelivererPanel() {
  const [session, setSession] = useState<DelivererSession | null>(() => {
    try {
      const s = localStorage.getItem("deliverer_session");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  if (!session) {
    return <DelivererLogin onLogin={(s) => {
      localStorage.setItem("deliverer_session", JSON.stringify(s));
      setSession(s);
    }} />;
  }

  return <DelivererDashboard session={session} onLogout={() => {
    localStorage.removeItem("deliverer_session");
    setSession(null);
  }} />;
}

// ─── Login ─────────────────────────────────────────────────────────────────────
function DelivererLogin({ onLogin }: { onLogin: (s: DelivererSession) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = trpc.deliverers.loginByUsername.useMutation();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuário e senha");
      return;
    }
    try {
      const result = await loginMutation.mutateAsync({ username, password });
      onLogin({ id: result.id, name: result.name, token: result.token ?? "" });
      toast.success(`Bem-vindo, ${result.name}! 🚀`);
    } catch (err: any) {
      toast.error(err.message ?? "Credenciais inválidas");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
      {/* Top decoration */}
      <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -top-10 right-0 w-56 h-56 rounded-full bg-red-500/10 blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="relative inline-flex mb-5">
            <img src={ICON_URL} alt="Gás Rápido" className="w-20 h-20 rounded-3xl shadow-2xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Painel do Entregador</h1>
          <p className="text-white/50 text-sm mt-2">Gás Rápido — Quirinópolis, GO</p>
        </div>

        {/* Card de login */}
        <div className="w-full max-w-sm">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-7 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label className="text-white/80 text-sm font-semibold mb-2 block flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Usuário
                </Label>
                <Input
                  placeholder="Digite seu usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-xl h-12 focus:border-orange-400 focus:ring-orange-400/20"
                />
              </div>
              <div>
                <Label className="text-white/80 text-sm font-semibold mb-2 block flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" /> Senha
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-xl h-12 pr-12 focus:border-orange-400 focus:ring-orange-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full font-bold h-12 rounded-xl text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Entrar <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Dica */}
          <div className="flex items-center gap-2 mt-6 justify-center text-white/40 text-xs">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Entrega expressa em Quirinópolis e região</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
function DelivererDashboard({ session, onLogout }: { session: DelivererSession; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"available" | "active" | "history" | "chat">("available");
  const [finishingOrder, setFinishingOrder] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [mapOrderId, setMapOrderId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  usePollingNotifications({ enabled: true, userType: 'deliverer', interval: 10000 });

  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications(session.id);

  const updateLocationMutation = trpc.tracking.updateLocation.useMutation();
  const setOnlineStatusMutation = trpc.tracking.setOnlineStatus.useMutation();

  // Enviar localização GPS a cada 10s quando online
  const sendLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateLocationMutation.mutate({
          token: session.token,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
          speed: pos.coords.speed ?? undefined,
          heading: pos.coords.heading ?? undefined,
        });
      },
      () => { /* silenciar erro de GPS */ },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );
  }, [session.token]);

  useEffect(() => {
    if (isOnline) {
      sendLocation();
      gpsIntervalRef.current = setInterval(sendLocation, 10000);
    } else {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
    }
    return () => { if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current); };
  }, [isOnline, sendLocation]);

  async function toggleOnline() {
    const next = !isOnline;
    try {
      await setOnlineStatusMutation.mutateAsync({ token: session.token, isOnline: next });
      setIsOnline(next);
      toast.success(next ? "Você está online! GPS ativado 📍" : "Você está offline. GPS desativado.");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  }

  const { data: availableOrders, refetch: refetchAvailable } = trpc.deliverers.availableOrders.useQuery(
    { delivererId: session.id },
    { refetchInterval: 20000 }
  );
  const { data: activeOrders, refetch: refetchActive } = trpc.deliverers.myActiveOrders.useQuery(
    { delivererId: session.id },
    { refetchInterval: 15000 }
  );
  const { data: historyOrders } = trpc.deliverers.myHistory.useQuery(
    { delivererId: session.id },
    { refetchInterval: 60000 }
  );

  const acceptOrder = trpc.deliverers.acceptOrder.useMutation();
  const startDelivery = trpc.deliverers.startDelivery.useMutation();
  const finishDelivery = trpc.deliverers.finishDelivery.useMutation();

  async function handleAccept(orderId: number) {
    try {
      await acceptOrder.mutateAsync({ orderId, delivererId: session.id });
      toast.success("Entrega aceita! Prepare-se 🚀");
      refetchAvailable();
      refetchActive();
      setActiveTab("active");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao aceitar entrega");
    }
  }

  async function handleStart(orderId: number) {
    try {
      await startDelivery.mutateAsync({ orderId, delivererId: session.id });
      toast.success("Boa entrega! 🛵");
      refetchActive();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao iniciar entrega");
    }
  }

  async function handleFinish() {
    if (!finishingOrder) return;
    try {
      await finishDelivery.mutateAsync({
        orderId: finishingOrder.id,
        delivererId: session.id,
        paymentMethod,
      });
      toast.success("Entrega finalizada! ✅");
      setFinishingOrder(null);
      setMapOrderId(null);
      refetchActive();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao finalizar entrega");
    }
  }

  const totalDelivered = historyOrders?.length ?? 0;
  const totalEarnings = historyOrders?.reduce((s: number, o: any) => s + parseFloat(String(o.total ?? 0)), 0) ?? 0;

  // ─── Chat state ────────────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const { data: chatMessages, refetch: refetchChat } = trpc.chat.delivererGetMessages.useQuery(
    { token: session.token, limit: 50 },
    { refetchInterval: 4000 }
  );
  const { data: chatUnread } = trpc.chat.delivererUnreadCount.useQuery(
    { token: session.token },
    { refetchInterval: 5000 }
  );
  const sendChatMsg = trpc.chat.delivererSend.useMutation({
    onSuccess: () => { setChatInput(""); refetchChat(); },
    onError: () => toast.error("Erro ao enviar mensagem"),
  });

  useEffect(() => {
    if (activeTab === "chat") {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [activeTab, chatMessages]);

  const tabs = [
    { key: "available", label: "Disponíveis", count: availableOrders?.length ?? 0, icon: Package },
    { key: "active", label: "Em Andamento", count: activeOrders?.length ?? 0, icon: Truck },
    { key: "history", label: "Histórico", count: historyOrders?.length ?? 0, icon: Clock },
    { key: "chat", label: "Chat", count: chatUnread?.count ?? 0, icon: MessageCircle },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={ICON_URL} alt="Gás Rápido" className="w-9 h-9 rounded-xl shadow-lg" />
            <div>
              <p className="font-bold text-sm text-white leading-none">{session.name}</p>
              <button
                onClick={toggleOnline}
                disabled={setOnlineStatusMutation.isPending}
                className={`flex items-center gap-1 mt-0.5 transition-all ${
                  isOnline ? "text-emerald-400" : "text-white/40 hover:text-white/70"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-white/30"
                }`} />
                <p className="text-xs font-semibold">
                  {setOnlineStatusMutation.isPending ? "..." : isOnline ? "Online · GPS ativo" : "Offline · Toque para ativar"}
                </p>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pushSupported && (
              <button
                onClick={pushSubscribed ? unsubscribePush : subscribePush}
                disabled={pushLoading}
                title={pushSubscribed ? "Desativar notificações push" : "Ativar notificações push"}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  pushSubscribed
                    ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                    : "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 animate-pulse"
                }`}
              >
                {pushLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : pushSubscribed ? (
                  <Bell className="w-3.5 h-3.5" />
                ) : (
                  <BellOff className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{pushSubscribed ? "Push ON" : "Ativar Push"}</span>
              </button>
            )}
            <InstallPWABanner delivererId={session.id} />
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-white/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Stats strip */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-none">Disponíveis</p>
              <p className="font-black text-gray-900 text-sm">{availableOrders?.length ?? 0}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-none">Em Andamento</p>
              <p className="font-black text-gray-900 text-sm">{activeOrders?.length ?? 0}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-none">Entregues hoje</p>
              <p className="font-black text-gray-900 text-sm">{totalDelivered}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-none">Total recebido</p>
              <p className="font-black text-gray-900 text-sm">{formatCurrency(totalEarnings)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1 mb-5 shadow-sm border border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? "text-white shadow-md"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              style={activeTab === tab.key ? { background: "linear-gradient(135deg, #f97316, #dc2626)" } : {}}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center ${
                  activeTab === tab.key ? "bg-white/30 text-white" : "bg-orange-100 text-orange-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Available Orders */}
        {activeTab === "available" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900 text-sm">Entregas Disponíveis</h2>
              <button onClick={() => refetchAvailable()} className="text-xs text-gray-400 hover:text-orange-500 flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
            </div>
            {!availableOrders || availableOrders.length === 0 ? (
              <EmptyState icon={Package} title="Nenhuma entrega disponível" subtitle="Novas entregas aparecerão aqui automaticamente" />
            ) : (
              availableOrders.map((order: any) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  showMap={mapOrderId === order.id}
                  onToggleMap={() => setMapOrderId(mapOrderId === order.id ? null : order.id)}
                  action={
                    <Button
                      size="sm"
                      className="text-white gap-1.5 font-bold rounded-xl h-9 px-4 shadow-md shadow-orange-500/20"
                      style={{ background: "linear-gradient(135deg, #f97316, #dc2626)" }}
                      onClick={() => handleAccept(order.id)}
                      disabled={acceptOrder.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Aceitar
                    </Button>
                  }
                />
              ))
            )}
          </div>
        )}

        {/* Active Orders */}
        {activeTab === "active" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-gray-900 text-sm">Minhas Entregas</h2>
              <button onClick={() => refetchActive()} className="text-xs text-gray-400 hover:text-orange-500 flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Atualizar
              </button>
            </div>
            {!activeOrders || activeOrders.length === 0 ? (
              <EmptyState icon={Truck} title="Nenhuma entrega ativa" subtitle="Aceite uma entrega disponível para começar" />
            ) : (
              activeOrders.map((order: any) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  showMap={mapOrderId === order.id}
                  onToggleMap={() => setMapOrderId(mapOrderId === order.id ? null : order.id)}
                  action={
                    order.status === "aguardando_entregador" ? (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-bold rounded-xl h-9 px-4"
                        onClick={() => handleStart(order.id)}
                        disabled={startDelivery.isPending}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Sair para Entrega
                      </Button>
                    ) : order.status === "saiu_entrega" ? (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold rounded-xl h-9 px-4"
                        onClick={() => setFinishingOrder(order)}
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Finalizar
                      </Button>
                    ) : null
                  }
                />
              ))
            )}
          </div>
        )}

        {/* History */}
        {activeTab === "history" && (
          <div className="space-y-3">
            <h2 className="font-bold text-gray-900 text-sm mb-1">Histórico de Entregas</h2>
            {!historyOrders || historyOrders.length === 0 ? (
              <EmptyState icon={Clock} title="Nenhuma entrega realizada" subtitle="Seu histórico de entregas aparecerá aqui" />
            ) : (
              historyOrders.map((order: any) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        )}

        {/* Chat */}
        {activeTab === "chat" && (
          <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: "60vh" }}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Chat com o Admin</p>
                <p className="text-xs text-gray-400">Mensagens em tempo real</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!chatMessages || chatMessages.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <MessageCircle className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-gray-400 mt-1">Envie uma mensagem para o admin</p>
                </div>
              ) : (
                chatMessages.messages.map((msg: any) => {
                  const isMe = msg.senderRole === "deliverer";
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                        isMe
                          ? "bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}>
                        <p className="leading-relaxed">{msg.message}</p>
                        <p className={`text-[10px] mt-1 ${
                          isMe ? "text-white/60" : "text-gray-400"
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && chatInput.trim()) {
                    e.preventDefault();
                    sendChatMsg.mutate({ token: session.token, message: chatInput.trim() });
                  }
                }}
                placeholder="Escreva uma mensagem..."
                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              <button
                onClick={() => {
                  if (chatInput.trim()) {
                    sendChatMsg.mutate({ token: session.token, message: chatInput.trim() });
                  }
                }}
                disabled={sendChatMsg.isPending || !chatInput.trim()}
                className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Finalizar Entrega */}
      {finishingOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Header do modal */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h2 className="font-bold text-gray-900">Confirmar Entrega</h2>
                </div>
                <button onClick={() => setFinishingOrder(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="ml-10">
                <p className="text-sm text-gray-500">Pedido <span className="font-bold text-gray-900">#{finishingOrder.orderNumber}</span></p>
                <p className="text-lg font-black text-emerald-600">{formatCurrency(finishingOrder.total)}</p>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Forma de pagamento recebida:</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                      paymentMethod === opt.value
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-100 hover:border-gray-200 bg-gray-50"
                    }`}
                  >
                    <opt.icon className={`w-4 h-4 ${paymentMethod === opt.value ? "text-orange-500" : opt.color}`} />
                    <span className={`text-xs font-semibold ${paymentMethod === opt.value ? "text-orange-700" : "text-gray-700"}`}>
                      {opt.label}
                    </span>
                    {paymentMethod === opt.value && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              {paymentMethod === "fiado" && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl mb-4 border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 font-medium">Lembre-se de registrar o fiado no sistema administrativo!</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setFinishingOrder(null)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 text-white font-bold h-11 rounded-xl shadow-md"
                  style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
                  onClick={handleFinish}
                  disabled={finishDelivery.isPending}
                >
                  {finishDelivery.isPending ? (
                    <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</span>
                  ) : (
                    <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Confirmar</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="text-center py-14 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-gray-300" />
      </div>
      <p className="font-bold text-gray-700">{title}</p>
      <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
    </div>
  );
}

// ─── OrderCard ─────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  action,
  showMap,
  onToggleMap,
}: {
  order: any;
  action?: React.ReactNode;
  showMap?: boolean;
  onToggleMap?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const routeRendered = useRef(false);

  const statusConfig = STATUS_CONFIG[order.status] ?? { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };

  const fullAddress = [
    order.deliveryAddress,
    order.neighborhood,
    "Quirinópolis",
    "Goiás",
    "Brasil",
  ].filter(Boolean).join(", ");

  // WhatsApp do cliente
  const whatsappUrl = order.customerPhone
    ? `https://wa.me/55${String(order.customerPhone).replace(/\D/g, "")}?text=Ol%C3%A1%20${encodeURIComponent(order.customerName)}%2C%20sou%20o%20entregador%20do%20G%C3%A1s%20R%C3%A1pido%21%20Estou%20a%20caminho%20com%20seu%20pedido%20%23${order.orderNumber}.`
    : null;

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (routeRendered.current) return;
    routeRendered.current = true;

    new google.maps.marker.AdvancedMarkerElement({
      map,
      position: DEPOT_LOCATION,
      title: "Gás Rápido — Depósito",
      content: (() => {
        const el = document.createElement("div");
        el.innerHTML = `<div style="background:linear-gradient(135deg,#f97316,#dc2626);color:white;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 3px 10px rgba(249,115,22,0.4)">🏪 Depósito</div>`;
        return el;
      })(),
    });

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: fullAddress }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const destination = results[0].geometry.location;

        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: destination,
          title: order.customerName,
          content: (() => {
            const el = document.createElement("div");
            el.innerHTML = `<div style="background:linear-gradient(135deg,#16a34a,#15803d);color:white;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 3px 10px rgba(22,163,74,0.4)">📍 ${order.customerName}</div>`;
            return el;
          })(),
        });

        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: { strokeColor: "#f97316", strokeWeight: 5, strokeOpacity: 0.9 },
        });

        directionsService.route(
          { origin: DEPOT_LOCATION, destination, travelMode: google.maps.TravelMode.DRIVING },
          (result, routeStatus) => {
            if (routeStatus === "OK" && result) {
              directionsRenderer.setDirections(result);
              const leg = result.routes[0]?.legs[0];
              if (leg) {
                toast.info(`🗺️ ${leg.distance?.text} · ${leg.duration?.text}`, { duration: 5000 });
              }
            } else {
              map.setCenter(destination);
              map.setZoom(15);
            }
          }
        );
      } else {
        map.setCenter(QUIRINOPOLIS_CENTER);
        map.setZoom(14);
        toast.warning("Endereço não encontrado. Verifique o endereço do pedido.");
      }
    });
  }, [fullAddress, order.customerName]);

  function openInGoogleMaps() {
    const encoded = encodeURIComponent(fullAddress);
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${DEPOT_LOCATION.lat},${DEPOT_LOCATION.lng}&destination=${encoded}&travelmode=driving`, "_blank");
  }

  const isCompleted = order.status === "entregue" || order.status === "cancelado";

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      isCompleted ? "border-gray-100 opacity-80" : "border-gray-200 hover:shadow-md"
    }`}>
      <div className="p-4">
        {/* Header do card */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-black text-orange-600 text-sm">#{order.orderNumber}</span>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                {STATUS_LABELS[order.status] ?? order.status}
              </div>
              {order.createdAt && (
                <span className="text-xs text-gray-400 ml-auto">{formatTime(order.createdAt)}</span>
              )}
            </div>

            {/* Cliente */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{order.customerName}</p>
              </div>
            </div>

            {/* Endereço */}
            <div className="flex items-start gap-2 ml-9">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 line-clamp-2">
                {order.deliveryAddress}{order.neighborhood ? `, ${order.neighborhood}` : ""} — Quirinópolis, GO
              </p>
            </div>
          </div>

          {/* Valor */}
          <div className="text-right flex-shrink-0">
            <p className="font-black text-emerald-600 text-base">{formatCurrency(order.total)}</p>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{order.paymentMethod}</p>
          </div>
        </div>

        {/* Botões de ação rápida */}
        <div className="flex items-center gap-2 mb-3">
          {/* WhatsApp do cliente */}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold transition-colors border border-emerald-200"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </a>
          )}

          {/* Telefone */}
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition-colors border border-blue-200"
            >
              <Phone className="w-3.5 h-3.5" />
              Ligar
            </a>
          )}

          {/* Navegar */}
          <button
            onClick={openInGoogleMaps}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-xs font-semibold transition-colors border border-violet-200"
          >
            <Navigation className="w-3.5 h-3.5" />
            Navegar
          </button>
        </div>

        {/* Barra inferior: itens + mapa + ação */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Ocultar itens" : "Ver itens"}
            </button>
            {onToggleMap && (
              <button
                onClick={onToggleMap}
                className={`text-xs flex items-center gap-1 transition-colors font-medium ${
                  showMap ? "text-orange-600" : "text-gray-400 hover:text-orange-500"
                }`}
              >
                <Map className="w-3 h-3" />
                {showMap ? "Fechar mapa" : "Ver rota"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {action}
          </div>
        </div>

        {/* Itens do pedido */}
        {expanded && order.items && order.items.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-orange-100 rounded-md flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-bold text-[10px]">{item.quantity}x</span>
                  </div>
                  <span className="text-gray-700 font-medium">{item.productName}</span>
                </div>
                <span className="text-gray-500 font-semibold">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
            {order.notes && (
              <div className="flex items-start gap-2 mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">{order.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mapa de Rota */}
      {showMap && (
        <div className="border-t border-gray-100">
          <div className="px-4 py-2.5 bg-gradient-to-r from-orange-50 to-red-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-orange-700 font-semibold">
              <Navigation className="w-3.5 h-3.5" />
              <span className="truncate">Depósito → {order.deliveryAddress}</span>
            </div>
            <button
              onClick={openInGoogleMaps}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold flex-shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir Maps
            </button>
          </div>
          <MapView
            initialCenter={QUIRINOPOLIS_CENTER}
            initialZoom={13}
            onMapReady={handleMapReady}
            className="w-full h-72"
          />
        </div>
      )}
    </div>
  );
}
