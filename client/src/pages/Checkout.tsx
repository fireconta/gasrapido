import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Flame, ArrowLeft, CheckCircle, MapPin, Phone, User,
  CreditCard, Banknote, QrCode, FileText, Clock, Tag, X,
  Search, Loader2
} from "lucide-react";
import { maskPhone, maskCep } from "@/lib/masks";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

type PaymentMethod = "dinheiro" | "pix" | "debito" | "credito" | "fiado";

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: any; desc: string }[] = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote, desc: "Pague em espécie na entrega" },
  { value: "pix", label: "Pix", icon: QrCode, desc: "Chave Pix na entrega" },
  { value: "debito", label: "Cartão Débito", icon: CreditCard, desc: "Maquininha na entrega" },
  { value: "credito", label: "Cartão Crédito", icon: CreditCard, desc: "Maquininha na entrega" },
  { value: "fiado", label: "Fiado", icon: FileText, desc: "Pagamento posterior" },
];

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { data: settingsRaw } = trpc.settings.getAll.useQuery();
  const createOrder = trpc.orders.create.useMutation();
  const [, navigate] = useLocation();

  const settings = settingsRaw ?? {};
  const storeName = settings.storeName ?? "Gás Rápido";
  const deliveryFee = parseFloat(settings.deliveryFee ?? "5");

  // ─── Formulário ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    phone: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    cep: "",
    notes: "",
    paymentMethod: "dinheiro" as PaymentMethod,
    change: "",
  });

  // ─── Busca de clientes ───────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  const { data: customerResults = [], isFetching: searchingCustomers } = trpc.customers.search.useQuery(
    { search: customerSearch },
    { enabled: customerSearch.length >= 2 }
  );

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectCustomer(c: typeof customerResults[0]) {
    setSelectedCustomerId(c.id);
    setForm(f => ({
      ...f,
      name: c.name,
      phone: maskPhone((c.phone ?? c.whatsapp ?? "") as string),
      street: c.address ?? "",
      number: c.addressNumber ?? "",
      complement: c.complement ?? "",
      neighborhood: c.neighborhood ?? "",
    }));
    setCustomerSearch(c.name);
    setShowCustomerDropdown(false);
    toast.success(`Cliente ${c.name} selecionado!`);
  }

  function clearCustomer() {
    setSelectedCustomerId(null);
    setCustomerSearch("");
    setForm(f => ({ ...f, name: "", phone: "", street: "", number: "", complement: "", neighborhood: "" }));
  }

  // ─── Cupom / Desconto ────────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: string;
    value: number;
    discount: number;
    description: string;
  } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const validateCouponMutation = trpc.discounts.validateCoupon.useMutation();

   async function applyCoupon() {
    if (!couponInput.trim()) {
      toast.error("Digite um código de cupom");
      return;
    }
    setIsApplyingCoupon(true);
    try {
      const code = couponInput.toUpperCase().trim();
      const data = await validateCouponMutation.mutateAsync({ code, subtotal });
      if (data?.valid && data.coupon) {
        setAppliedCoupon({
          code: data.coupon.code,
          type: data.coupon.discountType,
          value: data.coupon.discountValue,
          discount: data.discountAmount,
          description: data.message,
        });
        setCouponCode(code);
        setCouponInput("");
        toast.success(`Cupom aplicado! ${data.message}`);
      } else {
        toast.error(data?.message ?? "Cupom inválido ou expirado");
      }
    } catch {
      toast.error("Erro ao validar cupom. Tente novamente.");
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  // Recalcular desconto quando subtotal muda
  useEffect(() => {
    if (appliedCoupon) {
      if (appliedCoupon.type === "percentual") {
        const newDiscount = Number(((subtotal * appliedCoupon.value) / 100).toFixed(2));
        setAppliedCoupon(prev => prev ? { ...prev, discount: newDiscount } : null);
      }
    }
  }, [subtotal]);

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponInput("");
    toast.info("Cupom removido");
  }

  // ─── Cálculo de totais ───────────────────────────────────────────────────
  const finalDiscount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, subtotal + deliveryFee - finalDiscount);

  // ─── Resultado do pedido ─────────────────────────────────────────────────
  const [orderResult, setOrderResult] = useState<{ orderNumber: string } | null>(null);

  if (items.length === 0 && !orderResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
          <Link href="/"><Button className="bg-orange-500 hover:bg-orange-600 text-white">Ver Produtos</Button></Link>
        </div>
      </div>
    );
  }

  if (orderResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground mb-4">Seu pedido foi recebido e está sendo preparado.</p>
          <div className="bg-card rounded-2xl border border-border p-6 mb-6 text-left">
            <div className="text-center mb-4">
              <p className="text-xs text-muted-foreground">Número do pedido</p>
              <p className="text-3xl font-black text-orange-600">#{orderResult.orderNumber}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-xl p-3">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>Guarde o número do pedido para acompanhar a entrega</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
              onClick={() => navigate(`/rastrear?pedido=${orderResult.orderNumber}`)}
            >
              Acompanhar Pedido
            </Button>
            <Link href="/">
              <Button variant="outline" className="w-full">Fazer Novo Pedido</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function buildFullAddress(): string {
    const parts = [form.street];
    if (form.number) parts.push(`nº ${form.number}`);
    if (form.complement) parts.push(form.complement);
    return parts.filter(Boolean).join(", ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Informe seu nome"); return; }
    if (!form.phone.trim()) { toast.error("Informe seu telefone"); return; }
    if (!form.street.trim()) { toast.error("Informe a rua/avenida"); return; }
    if (!form.number.trim()) { toast.error("Informe o número do endereço"); return; }

    const fullAddress = buildFullAddress();
    const notesExtra = [
      form.notes,
      form.paymentMethod === "dinheiro" && form.change ? `Troco para: ${form.change}` : "",
      appliedCoupon ? `Cupom: ${appliedCoupon.code}` : "",
    ].filter(Boolean).join(" | ");

    try {
      const result = await createOrder.mutateAsync({
        customerName: form.name,
        customerPhone: form.phone,
        address: fullAddress,
        city: "Quirinópolis",
        neighborhood: form.neighborhood,
        notes: notesExtra,
        paymentMethod: form.paymentMethod,
        total,
        discount: finalDiscount,
        items: items.map((item) => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });
      clearCart();
      setOrderResult({ orderNumber: result.orderNumber });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar pedido. Tente novamente.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/carrinho">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Carrinho
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-lg text-foreground">{storeName}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-foreground mb-6">Finalizar Pedido</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-5">

              {/* Busca de Cliente Cadastrado */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h2 className="font-bold text-foreground mb-1 flex items-center gap-2">
                  <Search className="w-4 h-4 text-orange-500" />
                  Cliente Cadastrado
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Se você já comprou antes, busque seu cadastro para preencher os dados automaticamente.
                </p>
                <div className="relative" ref={customerSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Buscar por nome ou telefone..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                        if (!e.target.value) clearCustomer();
                      }}
                      onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                      className="pl-9 pr-9 rounded-xl"
                    />
                    {(customerSearch || selectedCustomerId) && (
                      <button
                        type="button"
                        onClick={clearCustomer}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown de resultados */}
                  {showCustomerDropdown && customerSearch.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
                      {searchingCustomers ? (
                        <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Buscando...
                        </div>
                      ) : customerResults.length > 0 ? (
                        <div className="divide-y divide-border">
                          {customerResults.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className="w-full text-left px-4 py-3 hover:bg-muted transition-colors"
                            >
                              <div className="font-medium text-sm">{c.name}</div>
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                                {c.phone && <span>📱 {maskPhone(c.phone)}</span>}
                                {c.address && (
                                  <span>📍 {c.address}{c.addressNumber ? `, nº ${c.addressNumber}` : ""}{c.neighborhood ? ` — ${c.neighborhood}` : ""}</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          Nenhum cliente encontrado
                        </div>
                      )}
                    </div>
                  )}

                  {/* Badge de cliente selecionado */}
                  {selectedCustomerId && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="text-sm text-orange-700 font-medium">
                        Dados preenchidos automaticamente — você pode editar abaixo se necessário.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Info */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-500" />
                  Seus Dados
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Nome completo *</Label>
                    <Input
                      placeholder="Seu nome completo"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="rounded-xl"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-orange-500" />
                      Telefone / WhatsApp *
                    </Label>
                    <Input
                      placeholder="(64) 99999-9999"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                      className="rounded-xl"
                      type="tel"
                      inputMode="tel"
                      maxLength={15}
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  Endereço de Entrega
                </h2>
                <div className="space-y-4">
                  {/* Rua + Número */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label className="text-sm font-medium mb-1.5 block">Rua / Avenida *</Label>
                      <Input
                        placeholder="Ex: Rua das Flores"
                        value={form.street}
                        onChange={(e) => setForm({ ...form, street: e.target.value })}
                        className="rounded-xl"
                        autoComplete="address-line1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Número *</Label>
                      <Input
                        placeholder="Ex: 123"
                        value={form.number}
                        onChange={(e) => setForm({ ...form, number: e.target.value.replace(/\D/g, "") })}
                        className="rounded-xl"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="address-line2"
                      />
                    </div>
                  </div>

                  {/* Complemento + Bairro */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Complemento</Label>
                      <Input
                        placeholder="Apto, bloco, casa..."
                        value={form.complement}
                        onChange={(e) => setForm({ ...form, complement: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Bairro</Label>
                      <Input
                        placeholder="Nome do bairro"
                        value={form.neighborhood}
                        onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                        className="rounded-xl"
                        autoComplete="address-level3"
                      />
                    </div>
                  </div>

                  {/* CEP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">CEP</Label>
                      <Input
                        placeholder="75900-000"
                        value={form.cep}
                        onChange={(e) => setForm({ ...form, cep: maskCep(e.target.value) })}
                        className="rounded-xl"
                        inputMode="numeric"
                        maxLength={9}
                        autoComplete="postal-code"
                      />
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Observações</Label>
                    <Textarea
                      placeholder="Ponto de referência, portão, instruções especiais..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="rounded-xl resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Cupom / Desconto */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-500" />
                  Cupom de Desconto
                </h2>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-green-700">
                        Cupom aplicado: <span className="font-mono">{appliedCoupon.code}</span>
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {appliedCoupon.type === "percentual"
                          ? `${appliedCoupon.value}% de desconto — economia de ${formatCurrency(appliedCoupon.discount)}`
                          : `Desconto fixo de ${formatCurrency(appliedCoupon.discount)}`}
                      </p>
                      {appliedCoupon.description && (
                        <p className="text-xs text-green-500 mt-0.5">{appliedCoupon.description}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeCoupon}
                      className="text-green-600 hover:text-red-500 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o código do cupom"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="rounded-xl font-mono tracking-widest"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
                    />
                    <Button
                      type="button"
                      onClick={applyCoupon}
                      disabled={isApplyingCoupon}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 flex-shrink-0"
                    >
                      {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Cupons disponíveis: DESCONTO10, DESCONTO5, DESCONTO20, PRIMEIRACOMPRA, GAS10
                </p>
              </div>

              {/* Payment */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <h2 className="font-bold text-foreground mb-1 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-orange-500" />
                  Forma de Pagamento
                </h2>
                <p className="text-xs text-muted-foreground mb-4">Pagamento realizado na entrega</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMethod: opt.value })}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        form.paymentMethod === opt.value
                          ? "border-orange-500 bg-orange-50"
                          : "border-border hover:border-orange-200"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        form.paymentMethod === opt.value ? "bg-orange-500" : "bg-muted"
                      }`}>
                        <opt.icon className={`w-4 h-4 ${form.paymentMethod === opt.value ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {form.paymentMethod === "dinheiro" && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-1.5 block">Troco para quanto?</Label>
                    <Input
                      placeholder="Ex: R$ 100,00 (deixe em branco se não precisar)"
                      value={form.change}
                      onChange={(e) => setForm({ ...form, change: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl border border-border p-5 sticky top-24">
                <h2 className="font-bold text-foreground mb-4">Resumo do Pedido</h2>
                <div className="space-y-2 mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate flex-1 mr-2">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium flex-shrink-0">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Entrega</span>
                    <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : "Grátis"}</span>
                  </div>
                  {finalDiscount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        Desconto
                        {appliedCoupon && (
                          <span className="text-xs font-mono bg-green-100 px-1 rounded">
                            {appliedCoupon.code}
                          </span>
                        )}
                      </span>
                      <span>-{formatCurrency(finalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                    <span>Total</span>
                    <span className="text-orange-600">{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Preview do endereço */}
                {(form.street || form.number) && (
                  <div className="mt-3 p-2.5 bg-muted/60 rounded-xl">
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">Entrega em:</p>
                    <p className="text-xs text-foreground">
                      {buildFullAddress()}{form.neighborhood ? `, ${form.neighborhood}` : ""}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold"
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </span>
                  ) : "Confirmar Pedido"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
