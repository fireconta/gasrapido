import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { usePollingNotifications } from "@/hooks/usePollingNotifications";
import { useAdvancedNotifications } from "@/hooks/useAdvancedNotifications";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Tag,
  BarChart3, Settings, LogOut, Menu, X, Flame, Bell,
  Warehouse, Truck, MessageCircle, ChevronRight,
  FlameKindling, FileText, Store, Shield, Database, MapPin, MessageSquare,
  Search, CheckCheck, Trash2, ChevronDown, ChevronUp,
  Gift, Ticket, Percent, UserCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/gas-rapido-logo_36bc8fd2.png";
const ICON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/gas-rapido-icon_35041320.png";

const NAV_ITEMS = [
  { path: "/dashboard",        label: "Dashboard",       icon: LayoutDashboard, group: "principal" },
  { path: "/pedidos",          label: "Pedidos",          icon: ShoppingCart,    group: "principal" },
  { path: "/produtos",         label: "Produtos",         icon: Package,         group: "catalogo" },
  { path: "/estoque",          label: "Estoque",          icon: Warehouse,       group: "catalogo" },
  { path: "/entregadores",     label: "Entregadores",     icon: Truck,           group: "equipe" },
  { path: "/rastreamento",     label: "Rastreamento GPS", icon: MapPin,          group: "equipe" },
  { path: "/chat",             label: "Chat",             icon: MessageSquare,   group: "equipe" },
  { path: "/clientes",         label: "Clientes",         icon: Users,           group: "equipe" },
  { path: "/promocoes",        label: "Cupons",            icon: Tag,             group: "marketing" },
  { path: "/campanhas",         label: "Promoções",         icon: Percent,         group: "marketing" },
  { path: "/relatorios",       label: "Relatórios",       icon: BarChart3,       group: "marketing" },
  { path: "/whatsapp",         label: "WhatsApp API",     icon: MessageCircle,   group: "integracao" },
  { path: "/contagem-gas",     label: "Contagem de Gás",  icon: FlameKindling,   group: "operacoes" },
  { path: "/entrega-caminhao", label: "Entrega Caminhão", icon: Truck,           group: "operacoes" },
  { path: "/notas-fiado",      label: "Notas de Fiado",   icon: FileText,        group: "operacoes" },
  { path: "/beneficios",       label: "Benefícios",       icon: Gift,            group: "operacoes" },
  { path: "/vale-gas",         label: "Vale Gás",         icon: Ticket,          group: "operacoes" },
  { path: "/configuracoes",    label: "Configurações",    icon: Settings,        group: "sistema" },
  { path: "/auditoria",        label: "Auditoria",        icon: Shield,          group: "sistema" },
  { path: "/backups",          label: "Backups",          icon: Database,        group: "sistema" },
];

const GROUP_LABELS: Record<string, string> = {
  principal:  "Principal",
  catalogo:   "Catálogo",
  equipe:     "Equipe",
  marketing:  "Marketing",
  integracao: "Integrações",
  operacoes:  "Operações",
  sistema:    "Sistema",
};

// ─── Notification Panel ───────────────────────────────────────────────────────
function NotificationPanel({ onClose }: { onClose: () => void }) {
  const {
    notifications, unreadCount,
    markAsRead, markAllAsRead, deleteNotification, clearAll,
  } = useAdvancedNotifications({ enableSound: false });
  const [filter, setFilter] = useState<"todos" | "nao_lidas">("todos");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const filtered = notifications.filter((n) =>
    filter === "todos" ? true : !n.read
  );

  function formatTime(date: Date) {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 60000);
    if (diff < 1) return "agora";
    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return new Date(date).toLocaleDateString("pt-BR");
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl border border-border z-50 overflow-hidden animate-scale-in"
      style={{ boxShadow: "0 4px 24px oklch(0.13 0.018 240 / 0.12), 0 1px 4px oklch(0.13 0.018 240 / 0.08)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Notificações</span>
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
              title="Limpar todas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 px-3 py-2.5 border-b border-border/60 bg-muted/20">
        {(["todos", "nao_lidas"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === f
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {f === "todos" ? "Todas" : `Não lidas${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Bell className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground">
              {filter === "nao_lidas" ? "Nenhuma não lida" : "Nenhuma notificação"}
            </p>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/30 cursor-pointer ${!n.read ? "bg-primary/3" : ""}`}
              onClick={() => markAsRead(n.id)}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${!n.read ? "bg-primary/12" : "bg-muted"}`}>
                <Bell className={`w-3.5 h-3.5 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-semibold leading-tight ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                    {n.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">{formatTime(n.timestamp)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground/40 hover:text-destructive flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Global Search ────────────────────────────────────────────────────────────
function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const QUICK_LINKS = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Pedidos", path: "/pedidos", icon: ShoppingCart },
    { label: "Produtos", path: "/produtos", icon: Package },
    { label: "Clientes", path: "/clientes", icon: Users },
    { label: "Estoque", path: "/estoque", icon: Warehouse },
    { label: "Relatórios", path: "/relatorios", icon: BarChart3 },
    { label: "Configurações", path: "/configuracoes", icon: Settings },
  ];

  const filtered = query
    ? QUICK_LINKS.filter((l) => l.label.toLowerCase().includes(query.toLowerCase()))
    : QUICK_LINKS;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleSelect(path: string) {
    navigate(path);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted transition-colors text-muted-foreground text-xs border border-border/50"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:block">Buscar...</span>
        <kbd className="hidden sm:block text-[10px] bg-background border border-border rounded px-1 py-0.5 font-mono text-muted-foreground">⌘K</kbd>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-sm bg-card rounded-xl border border-border overflow-hidden animate-scale-in"
            style={{ boxShadow: "0 8px 40px oklch(0.13 0.018 240 / 0.16)" }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar página..."
                className="border-0 shadow-none p-0 h-auto text-sm focus-visible:ring-0 bg-transparent"
              />
              <kbd className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 font-mono text-muted-foreground flex-shrink-0">ESC</kbd>
            </div>
            <div className="py-1.5 max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum resultado</p>
              ) : (
                filtered.map(({ label, path, icon: Icon }) => (
                  <button
                    key={path}
                    onClick={() => handleSelect(path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── AdminLayout ──────────────────────────────────────────────────────────────
export default function AdminLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [location] = useLocation();
  const [, navigate] = useLocation();
  const { adminUser, isAuthenticated, isLoading, logout, isLoggingOut } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  usePollingNotifications({ enabled: isAuthenticated, userType: "admin" });

  const { data: pendingOrders } = trpc.orders.list.useQuery(
    { status: "novo" },
    { enabled: isAuthenticated, refetchInterval: 30_000 }
  );
  const pendingCount = pendingOrders?.length ?? 0;

  const { data: chatUnread } = trpc.chat.adminTotalUnread.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchInterval: 5_000 }
  );
  const chatUnreadCount = chatUnread?.count ?? 0;

  const { unreadCount: advancedUnread } = useAdvancedNotifications({ enableSound: false });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/admin/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  function toggleGroup(group: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-brand">
            <Flame className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-xs text-muted-foreground">Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const groups = Array.from(new Set(NAV_ITEMS.map((i) => i.group)));
  const totalNotifBadge = (advancedUnread > 0 ? advancedUnread : 0) + (pendingCount > 0 ? pendingCount : 0);

  const adminName = (adminUser as any)?.name ?? "Administrador";
  const adminInitial = adminName.charAt(0).toUpperCase();
  const adminEmail = adminUser?.email ?? "";

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-brand">
            <img src={ICON_URL} alt="Gás Rápido" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight tracking-tight">Gás Rápido</p>
            <p className="text-white/40 text-[10px] font-medium tracking-wide uppercase">Painel Admin</p>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-white/[0.07] flex-shrink-0" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          const isCollapsed = collapsedGroups.has(group);
          return (
            <div key={group} className="mb-1">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-2 py-1.5 mb-0.5 group rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest group-hover:text-white/45 transition-colors">
                  {GROUP_LABELS[group]}
                </p>
                {isCollapsed
                  ? <ChevronDown className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
                  : <ChevronUp className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
                }
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5 mb-2">
                  {items.map(({ path, label, icon: Icon }) => {
                    const isActive = location === path || (path === "/dashboard" && location === "/");
                    return (
                      <Link key={path} href={path}>
                        <button
                          onClick={() => setSidebarOpen(false)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
                            isActive
                              ? "bg-primary/90 text-white"
                              : "text-white/50 hover:bg-white/[0.06] hover:text-white/85"
                          }`}
                          style={isActive ? { boxShadow: "0 2px 8px oklch(0.535 0.225 25 / 0.35)" } : {}}
                        >
                          <Icon className={`w-[15px] h-[15px] flex-shrink-0 transition-colors ${isActive ? "text-white" : "text-white/30 group-hover:text-white/65"}`} />
                          <span className="flex-1 text-left">{label}</span>
                          {label === "Pedidos" && pendingCount > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${isActive ? "bg-white/20 text-white" : "bg-primary text-white"}`}>
                              {pendingCount > 9 ? "9+" : pendingCount}
                            </span>
                          )}
                          {label === "Chat" && chatUnreadCount > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${isActive ? "bg-white/20 text-white" : "bg-emerald-500 text-white"}`}>
                              {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                            </span>
                          )}
                          {label === "WhatsApp API" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 leading-none">API</span>
                          )}
                        </button>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 pb-3 flex-shrink-0">
        <div className="mx-0 h-px bg-white/[0.07] mb-3" />
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/[0.05] mb-1">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-brand">
            <span className="text-white text-xs font-bold">{adminInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-tight">{adminName}</p>
            <p className="text-white/30 text-[10px] truncate mt-0.5">{adminEmail}</p>
          </div>
        </div>
        <Link
          href="/admin/perfil"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/50 hover:bg-white/[0.06] hover:text-white transition-all duration-150 mb-0.5"
        >
          <UserCircle className="w-[15px] h-[15px]" />
          <span>Meu Perfil</span>
        </Link>
        <button
          onClick={logout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/35 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
        >
          <LogOut className="w-[15px] h-[15px]" />
          <span>{isLoggingOut ? "Saindo..." : "Sair"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col bg-sidebar flex-shrink-0" style={{ boxShadow: "1px 0 0 oklch(0.21 0.012 240)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-56 bg-sidebar flex flex-col animate-slide-in-right" style={{ boxShadow: "4px 0 24px oklch(0.13 0.018 240 / 0.3)" }}>
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3.5 right-3.5 text-white/40 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-13 bg-card border-b border-border flex items-center px-4 gap-3 flex-shrink-0" style={{ boxShadow: "0 1px 0 oklch(0.905 0.005 240)" }}>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={LOGO_URL} alt="Gás Rápido" className="h-5 w-auto hidden sm:block flex-shrink-0 opacity-70" />
            {title && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground/40 hidden sm:block flex-shrink-0" />
                <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Global Search */}
            <GlobalSearch />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="w-8 h-8 rounded-lg hover:bg-muted transition-colors relative flex items-center justify-center"
                title="Notificações"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
                {totalNotifBadge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {totalNotifBadge > 9 ? "9+" : totalNotifBadge}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
            </div>

            {/* Ver loja */}
            <Link href="/">
              <button className="w-8 h-8 rounded-lg hover:bg-muted transition-colors flex items-center justify-center" title="Ver loja">
                <Store className="w-4 h-4 text-muted-foreground" />
              </button>
            </Link>

            {/* Divider */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* User avatar */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-brand flex-shrink-0">
                <span className="text-white text-[11px] font-bold">{adminInitial}</span>
              </div>
              <span className="text-sm font-medium text-foreground hidden md:block">{adminName}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
