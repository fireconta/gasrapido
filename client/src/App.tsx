import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import { NotificationProvider } from "./contexts/NotificationContext";

// Public pages
import Home from "./pages/Home";
import Tracking from "./pages/Tracking";
import PaymentMethodPage from "./pages/PaymentMethodPage";
import GasReplenishmentPage from "./pages/GasReplenishmentPage";
import Carrinho from "./pages/Carrinho";
import Checkout from "./pages/Checkout";
import Rastrear from "./pages/Rastrear";
import Promocoes from "./pages/Promocoes";

// Admin pages
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Pedidos from "./pages/Pedidos";
import PedidoDetail from "./pages/PedidoDetail";
import Produtos from "./pages/Produtos";
import Estoque from "./pages/Estoque";
import Entregadores from "./pages/Entregadores";
import Clientes from "./pages/Clientes";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import WhatsApp from "./pages/WhatsApp";
import ContagemGas from "./pages/ContagemGas";
import NotasFiado from "./pages/NotasFiado";
import GasCountingPage from "./pages/GasCountingPage";
import TruckDeliveryPage from "./pages/TruckDeliveryPage";
import BackupControl from "./pages/admin/BackupControl";
import AuditDashboard from "./pages/AuditDashboard";
import TrackingMap from "./pages/admin/TrackingMap";
import AdminChat from "./pages/admin/Chat";
import Beneficios from "./pages/Beneficios";
import ValeGas from "./pages/ValeGas";
import PromocoesGerenciar from "./pages/PromocoesGerenciar";
import AdminPerfil from "./pages/AdminPerfil";
// Deliverer panel
import DelivererPanel from "./pages/DelivererPanel";
import DelivererLogin from "./pages/DelivererLogin";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      {/* ─── Public routes ─────────────────────────────────────────────── */}
      <Route path={"/"} component={Home} />
      <Route path={"/pagamento"} component={PaymentMethodPage} />
      <Route path={"/reposicao-gas"} component={GasReplenishmentPage} />
      <Route path={"/404"} component={NotFound} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/rastrear" component={Tracking} />
      <Route path="/promocoes" component={Promocoes} />

      {/* ─── Deliverer panel ───────────────────────────────────────────── */}
      <Route path="/entregador/login" component={DelivererLogin} />
      <Route path="/entregador" component={DelivererPanel} />

      {/* ─── Admin routes ──────────────────────────────────────────── */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pedidos" component={Pedidos} />
      <Route path="/pedidos/:id" component={PedidoDetail} />
      <Route path="/produtos" component={Produtos} />
      <Route path="/estoque" component={Estoque} />
      <Route path="/entregadores" component={Entregadores} />
      <Route path="/clientes" component={Clientes} />
      <Route path="/relatorios" component={Relatorios} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route path="/whatsapp" component={WhatsApp} />
      <Route path="/contagem-gas" component={ContagemGas} />
      <Route path="/contagem-gas-automatica" component={GasCountingPage} />
      <Route path="/entrega-caminhao" component={TruckDeliveryPage} />
      <Route path="/notas-fiado" component={NotasFiado} />
      {/* Aliases para compatibilidade */}
      <Route path="/admin/dashboard" component={Dashboard} />
      <Route path="/admin/pedidos" component={Pedidos} />
      <Route path="/admin/produtos" component={Produtos} />
      <Route path="/admin/estoque" component={Estoque} />
      <Route path="/admin/entregadores" component={Entregadores} />
      <Route path="/admin/clientes" component={Clientes} />
      <Route path="/admin/relatorios" component={Relatorios} />
      <Route path="/admin/configuracoes" component={Configuracoes} />
      <Route path="/admin/whatsapp" component={WhatsApp} />
      <Route path="/admin/contagem-gas" component={ContagemGas} />
      <Route path="/admin/entrega-caminhao" component={TruckDeliveryPage} />
      <Route path="/admin/notas-fiado" component={NotasFiado} />
      <Route path="/backups" component={BackupControl} />
      <Route path="/admin/backups" component={BackupControl} />
      <Route path="/auditoria" component={AuditDashboard} />
      <Route path="/admin/auditoria" component={AuditDashboard} />
      <Route path="/rastreamento" component={TrackingMap} />
      <Route path="/admin/rastreamento" component={TrackingMap} />
      <Route path="/chat" component={AdminChat} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/beneficios" component={Beneficios} />
      <Route path="/admin/beneficios" component={Beneficios} />
      <Route path="/vale-gas" component={ValeGas} />
      <Route path="/admin/vale-gas" component={ValeGas} />
      <Route path="/campanhas" component={PromocoesGerenciar} />
      <Route path="/admin/campanhas" component={PromocoesGerenciar} />
      <Route path="/perfil" component={AdminPerfil} />
      <Route path="/admin/perfil" component={AdminPerfil} />
      {/* ─── Fallbackk ──────────────────────────────────────────────────── */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CartProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </NotificationProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
