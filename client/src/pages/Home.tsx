import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flame, Truck, Clock, ShieldCheck, Phone, MessageCircle,
  Star, MapPin, Package, ShoppingCart, Zap,
  CheckCircle2, Menu, X, Droplets, ArrowRight, ChevronRight
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

function formatCurrency(v: number | string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/gas-rapido-logo_36bc8fd2.png";
const ICON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/gas-rapido-icon_35041320.png";
const MOTOGAS_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/motogas_91d84c67.png";
const FACHADA_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663440586062/arYUDk84fBUb5vUB52rDcp/loja-fachada_5bafd3e4.jpeg";

const CATEGORY_LABELS: Record<string, string> = {
  todos: "Todos",
  gas: "Gás GLP",
  agua: "Água",
  acessorio: "Acessórios",
};

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  // SEO: definir título e meta tags em runtime para garantir leitura correta por checkers
  useEffect(() => {
    document.title = "Gás Rápido Quirinópolis — Entrega em 30 min";
    // Atualizar meta description
    let desc = document.querySelector('meta[name="description"]');
    if (!desc) {
      desc = document.createElement('meta');
      (desc as HTMLMetaElement).name = 'description';
      document.head.appendChild(desc);
    }
    (desc as HTMLMetaElement).content = 'Gás Rápido em Quirinópolis GO. Entrega expressa de botijões P2, P13 e P45 em até 30 minutos. Ligue (64) 3651-1874 ou peça pelo WhatsApp.';
    // Atualizar meta keywords
    let kw = document.querySelector('meta[name="keywords"]');
    if (!kw) {
      kw = document.createElement('meta');
      (kw as HTMLMetaElement).name = 'keywords';
      document.head.appendChild(kw);
    }
    (kw as HTMLMetaElement).content = 'gás Quirinópolis, botijão de gás Quirinópolis, entrega de gás Quirinópolis, gás rápido, botijão P13, botijão P2, botijão P45, gás GLP Quirinópolis, depósito de gás Quirinópolis GO, entrega rápida gás';
  }, []);
  const { data: products, isLoading } = trpc.products.list.useQuery({});
  const { data: settingsRaw } = trpc.settings.getAll.useQuery();
  const { addItem, items } = useCart();
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const settings = settingsRaw ?? {};
  const storeName = settings.storeName ?? "Gás Rápido";
  const whatsapp = settings.whatsapp ?? "(64) 98456-5616";
  const phone = settings.phone ?? "(64) 3651-1874";
  const openingHours = settings.openingHours ?? "Seg-Sáb: 07:00–19:00";

  const cartCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const categories = ["todos", ...Array.from(new Set((products ?? []).map((p) => p.category)))];
  const filtered = selectedCategory === "todos"
    ? (products ?? []).filter((p) => p.isActive)
    : (products ?? []).filter((p) => p.category === selectedCategory && p.isActive);

  function handleAdd(product: any) {
    addItem({ id: product.id, name: product.name, price: parseFloat(product.price), imageUrl: product.imageUrl });
    toast.success(`${product.name} adicionado!`, { description: "Veja seu carrinho para finalizar." });
  }

  const whatsappUrl = `https://wa.me/55${whatsapp.replace(/\D/g, "")}?text=Ol%C3%A1%2C%20quero%20fazer%20um%20pedido!`;
  // Localização real do depósito em Quirinópolis
  // Gás Rápido - Água - Carvão - Gelo
  // Av. José Quintiliano Leão, 346 b - São Francisco, Quirinópolis - GO, 75860-000
  // Coordenadas: -18.454698, -50.4430969
  const mapsEmbedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d941.1!2d-50.4431345!3d-18.454595!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x949f0958cdd7a8fb%3A0x99cc998758a4388f!2sG%C3%A1s+R%C3%A1pido+-+%C3%81gua+-+Carv%C3%A3o+-+Gelo!5e0!3m2!1spt-BR!2sbr!4v1741788000000";
  const mapsDirectUrl = "https://maps.app.goo.gl/toQWwxtfGYXAe6Zw9";

  return (
    <div className="min-h-screen bg-background">

      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/98 backdrop-blur-md border-b border-border/60" style={{ boxShadow: "0 1px 12px oklch(0.12 0.015 240 / 0.08)" }}>
        <div className="container h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <img src={LOGO_URL} alt="Gás Rápido" className="h-10 w-auto group-hover:scale-105 transition-transform duration-200" />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <a href="#produtos">
              <Button variant="ghost" size="sm" className="text-sm font-medium text-muted-foreground hover:text-foreground">Produtos</Button>
            </a>
            <a href="#como-funciona">
              <Button variant="ghost" size="sm" className="text-sm font-medium text-muted-foreground hover:text-foreground">Como Funciona</Button>
            </a>
            <Link href="/rastrear">
              <Button variant="ghost" size="sm" className="text-sm font-medium text-muted-foreground hover:text-foreground">Rastrear Pedido</Button>
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <a href={`tel:${phone}`} className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="w-3.5 h-3.5" />
              {phone}
            </a>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hidden sm:block">
              <Button variant="outline" size="sm" className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-400 text-xs font-semibold h-8">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </Button>
            </a>
            <Link href="/carrinho">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1.5 relative shadow-brand h-9 px-4 font-semibold">
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Carrinho</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 text-foreground text-[10px] rounded-full flex items-center justify-center font-black shadow">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-white px-4 py-3 flex flex-col gap-1 animate-fade-up">
            <a href="#produtos" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm font-medium">Produtos</Button>
            </a>
            <a href="#como-funciona" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm font-medium">Como Funciona</Button>
            </a>
            <Link href="/rastrear" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm font-medium">Rastrear Pedido</Button>
            </Link>
            <div className="border-t border-border my-1" />
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm font-medium text-green-700 gap-2">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
            </a>
            <a href={`tel:${phone}`} onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-sm font-medium gap-2">
                <Phone className="w-4 h-4" /> {phone}
              </Button>
            </a>
          </div>
        )}
      </header>

      {/* ─── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-gradient-warm">
        {/* Fundo decorativo */}
        <div className="absolute inset-0 bg-dots opacity-20" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <div className="absolute top-12 right-12 w-80 h-80 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-yellow-300 blur-3xl" />
        </div>

        <div className="container relative z-10 py-20 md:py-28 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Conteúdo */}
            <div className="animate-fade-up">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 glass text-white text-xs font-bold px-4 py-2 rounded-full mb-8 border border-white/30">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Aberto agora · Entrega em até 30 min
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
                Gás na sua porta,{" "}
                <span className="text-gradient-warm">rápido</span>{" "}
                e seguro
              </h1>

              <p className="text-white/80 text-lg md:text-xl mb-8 leading-relaxed max-w-lg">
                Entrega expressa de botijões em <strong className="text-white">Quirinópolis, GO</strong>.
                P2, P13 e P45 com qualidade garantida.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 mb-10">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white gap-2.5 shadow-lg font-bold text-base h-13 px-7 rounded-xl">
                    <MessageCircle className="w-5 h-5" />
                    Pedir pelo WhatsApp
                  </Button>
                </a>
                <a href="#produtos">
                  <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/15 hover:text-white gap-2 font-bold text-base h-13 px-7 bg-white/10 rounded-xl backdrop-blur-sm">
                    Ver Produtos
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-5">
                {[
                  { icon: <ShieldCheck className="w-4 h-4" />, text: "Produto certificado" },
                  { icon: <Clock className="w-4 h-4" />, text: openingHours },
                  { icon: <MapPin className="w-4 h-4" />, text: "Quirinópolis, GO" },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-white/75 text-sm font-medium">
                    {b.icon}
                    <span>{b.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Imagem do motoboy */}
            <div className="hidden lg:flex items-center justify-center animate-fade-up delay-200">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-white/10 blur-2xl" />
                <img
                  src={MOTOGAS_URL}
                  alt="Entregador Gás Rápido"
                  className="relative w-full max-w-md rounded-3xl shadow-2xl border-4 border-white/20"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DIFERENCIAIS ───────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-b border-border/60">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Zap className="w-5 h-5" />, title: "Entrega Rápida", desc: "Em até 30 minutos", color: "text-orange-500", bg: "bg-orange-50" },
              { icon: <ShieldCheck className="w-5 h-5" />, title: "100% Seguro", desc: "Produto certificado", color: "text-blue-500", bg: "bg-blue-50" },
              { icon: <Truck className="w-5 h-5" />, title: "Frete Grátis", desc: "Acima de R$ 80", color: "text-green-500", bg: "bg-green-50" },
              { icon: <Star className="w-5 h-5" />, title: "Melhor Preço", desc: "Garantia de preço justo", color: "text-yellow-500", bg: "bg-yellow-50" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 hover:bg-muted/60 transition-colors">
                <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRODUTOS ───────────────────────────────────────────────────── */}
      <section id="produtos" className="py-16">
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Nosso Catálogo</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                Escolha seu botijão
              </h2>
              <p className="text-muted-foreground mt-2">Entregamos em toda Quirinópolis e região</p>
            </div>
            <Link href="/carrinho">
              <Button variant="outline" size="sm" className="gap-2 text-sm font-semibold h-10 px-4 rounded-xl">
                <ShoppingCart className="w-4 h-4" />
                Carrinho
                {cartCount > 0 && (
                  <Badge className="bg-primary text-white text-xs px-1.5 py-0 h-5 ml-0.5 rounded-full">{cartCount}</Badge>
                )}
              </Button>
            </Link>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === cat
                    ? "bg-primary text-white shadow-brand"
                    : "bg-white text-muted-foreground border border-border hover:border-primary/40 hover:text-primary"
                }`}
              >
                {cat === "gas" && <Flame className="w-3.5 h-3.5" />}
                {cat === "agua" && <Droplets className="w-3.5 h-3.5" />}
                {cat === "acessorio" && <Zap className="w-3.5 h-3.5" />}
                {cat === "todos" && <Package className="w-3.5 h-3.5" />}
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-muted animate-pulse h-72" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhum produto disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={handleAdd} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── COMO FUNCIONA ──────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Simples e Rápido</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Como funciona?</h2>
            <p className="text-muted-foreground mt-3 max-w-md mx-auto">Peça em 3 passos simples e receba em casa</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                step: "01", icon: <ShoppingCart className="w-7 h-7" />,
                title: "Escolha o produto",
                desc: "Selecione o botijão ideal para você no nosso catálogo online.",
                color: "text-primary", bg: "bg-primary/10"
              },
              {
                step: "02", icon: <MapPin className="w-7 h-7" />,
                title: "Informe o endereço",
                desc: "Digite seu endereço de entrega em Quirinópolis no checkout.",
                color: "text-blue-600", bg: "bg-blue-50"
              },
              {
                step: "03", icon: <Truck className="w-7 h-7" />,
                title: "Receba em casa",
                desc: "Nosso entregador leva até você em até 30 minutos.",
                color: "text-green-600", bg: "bg-green-50"
              },
            ].map((item, i) => (
              <div key={i} className="relative bg-white rounded-2xl p-7 border border-border/60 shadow-card">
                <div className="absolute -top-3.5 left-6 bg-primary text-white text-xs font-black px-3 py-1 rounded-full">
                  Passo {item.step}
                </div>
                <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center ${item.color} mb-5 mt-2`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LOCALIZAÇÃO ────────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Info */}
            <div>
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Nossa Localização</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-4">
                Atendemos em<br />
                <span className="text-gradient">Quirinópolis, GO</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Estamos localizados em Quirinópolis e atendemos toda a cidade e região.
                Entrega rápida e segura diretamente na sua porta.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: <MapPin className="w-5 h-5 text-primary" />, label: "Endereço", value: "Av. José Quintiliano Leão, 346 b - São Francisco" },
                  { icon: <Clock className="w-5 h-5 text-primary" />, label: "Horário", value: openingHours },
                  { icon: <Phone className="w-5 h-5 text-primary" />, label: "Telefone", value: phone },
                  { icon: <MessageCircle className="w-5 h-5 text-green-600" />, label: "WhatsApp", value: whatsapp },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-border/60">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                      <p className="font-semibold text-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a href={mapsDirectUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-brand font-semibold h-11 px-6 rounded-xl">
                  <MapPin className="w-4 h-4" />
                  Ver no Google Maps
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </div>

            {/* Foto da loja + Mapa */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl overflow-hidden border border-border/60 shadow-card">
                <img
                  src={FACHADA_URL}
                  alt="Fachada Gás Rápido — Quirinópolis, GO"
                  className="w-full h-56 object-cover"
                />
              </div>
              <div className="rounded-2xl overflow-hidden border border-border/60 shadow-card" style={{ height: "280px" }}>
                <iframe
                  src={mapsEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização Gás Rápido — Quirinópolis, GO"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ──────────────────────────────────────────────────── */}
      <section className="py-16 bg-brand-gradient-warm relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-15" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="container relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
            <Flame className="w-8 h-8 text-yellow-300" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Precisa de gás agora?
          </h2>
          <p className="text-white/80 mb-10 text-lg max-w-md mx-auto leading-relaxed">
            Fale conosco pelo WhatsApp e receba em até 30 minutos em Quirinópolis!
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white gap-2.5 font-bold h-13 px-8 shadow-lg rounded-xl text-base">
                <MessageCircle className="w-5 h-5" />
                Chamar no WhatsApp
              </Button>
            </a>
            <a href={`tel:${phone}`}>
              <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/15 hover:text-white gap-2.5 font-bold h-13 px-8 bg-white/10 rounded-xl backdrop-blur-sm text-base">
                <Phone className="w-5 h-5" />
                Ligar Agora
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="bg-dark-gradient text-white py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={LOGO_URL} alt="Gás Rápido" className="h-10 w-auto brightness-0 invert" />
              </div>
              <p className="text-sm text-white/50 leading-relaxed">
                Entrega expressa de gás em Quirinópolis e região. Qualidade e rapidez garantidas.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="font-bold text-xs mb-4 text-white/60 uppercase tracking-widest">Links Úteis</p>
              <div className="flex flex-col gap-2.5">
                {[
                  { href: "#produtos", label: "Produtos" },
                  { href: "/rastrear", label: "Rastrear Pedido" },
                  { href: "/carrinho", label: "Carrinho" },
                  { href: "/checkout", label: "Finalizar Pedido" },
                ].map((l, i) => (
                  <a key={i} href={l.href} className="text-sm text-white/50 hover:text-white transition-colors flex items-center gap-1.5 group">
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Contato */}
            <div>
              <p className="font-bold text-xs mb-4 text-white/60 uppercase tracking-widest">Contato</p>
              <div className="flex flex-col gap-3">
                <a href={`tel:${phone}`} className="flex items-center gap-3 text-sm text-white/50 hover:text-white transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  {phone}
                </a>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/50 hover:text-green-400 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </div>
                  {whatsapp}
                </a>
                <div className="flex items-center gap-3 text-sm text-white/50">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  {openingHours}
                </div>
                <a href={mapsDirectUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-white/50 hover:text-white transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  Quirinópolis, GO
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
            <span>© {new Date().getFullYear()} {storeName} — Todos os direitos reservados</span>
            <span>Quirinópolis, Goiás, Brasil</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── ProductCard ─────────────────────────────────────────────────────────────
function ProductCard({ product, onAdd }: { product: any; onAdd: (p: any) => void }) {
  const price = parseFloat(product.price);
  const oldPrice = product.oldPrice ? parseFloat(product.oldPrice) : null;
  const hasDiscount = oldPrice && oldPrice > price;
  const discount = hasDiscount ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  return (
    <div className="group bg-white rounded-2xl border border-border/60 overflow-hidden card-hover" style={{ boxShadow: "0 1px 4px oklch(0.12 0.015 240 / 0.06)" }}>
      {/* Imagem */}
      <div className="relative aspect-square bg-gradient-to-br from-muted/30 to-muted/60 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-5 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Flame className="w-14 h-14 text-muted-foreground/20" />
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-2.5 left-2.5 bg-primary text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-brand">
            -{discount}%
          </div>
        )}
        {product.stock !== undefined && product.stock <= 5 && product.stock > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
            Últimas!
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1.5 rounded-full">Indisponível</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-[10px] text-muted-foreground font-bold mb-1 uppercase tracking-widest">
          {product.category === "gas" ? "Gás GLP" : product.category === "agua" ? "Água" : "Acessório"}
        </p>
        <h3 className="font-bold text-sm text-foreground leading-tight mb-3 line-clamp-2">{product.name}</h3>

        <div className="flex items-end gap-2 mb-3">
          <span className="text-xl font-extrabold text-primary">{formatCurrency(price)}</span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through mb-0.5">{formatCurrency(oldPrice)}</span>
          )}
        </div>

        <Button
          size="sm"
          className="w-full bg-primary hover:bg-primary/90 text-white gap-1.5 text-xs font-bold h-9 rounded-xl shadow-brand"
          onClick={() => onAdd(product)}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? (
            "Indisponível"
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              Adicionar ao Carrinho
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
