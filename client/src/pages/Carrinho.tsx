import { Link, useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Flame, Trash2, Plus, Minus, ShoppingCart, ArrowLeft, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const GAS_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663417842136/FXNtVyiy3Qq3vkgsKnoz3h/gas13kg_2aa716ce.webp";

export default function Carrinho() {
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const { data: settingsRaw } = trpc.settings.getAll.useQuery();
  const [, navigate] = useLocation();

  const settings = settingsRaw ?? {};
  const storeName = settings.storeName ?? "Gás Rápido";
  const deliveryFee = parseFloat(settings.deliveryFee ?? "5");
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Voltar
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
        <h1 className="text-2xl font-black text-foreground mb-6 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-orange-500" />
          Meu Carrinho
          {items.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({items.reduce((a, i) => a + i.quantity, 0)} {items.reduce((a, i) => a + i.quantity, 0) === 1 ? "item" : "itens"})
            </span>
          )}
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-xl font-bold text-foreground mb-2">Carrinho vazio</h2>
            <p className="text-muted-foreground mb-6">Adicione produtos para continuar</p>
            <Link href="/">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                <ArrowLeft className="w-4 h-4" />
                Ver Produtos
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Items */}
            <div className="lg:col-span-2 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img
                      src={item.imageUrl || GAS_IMG}
                      alt={item.name}
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
                    <p className="text-orange-600 font-bold text-sm mt-0.5">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold text-sm">{formatCurrency(item.price * item.quantity)}</p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-400 hover:text-red-600 mt-1 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl border border-border p-5 sticky top-24">
                <h2 className="font-bold text-foreground mb-4">Resumo do Pedido</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa de entrega</span>
                    <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : "Grátis"}</span>
                  </div>
                  <div className="border-t border-border my-3" />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-orange-600">{formatCurrency(total)}</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700">
                  💳 Pagamento realizado na entrega: Dinheiro, Pix, Cartão ou Fiado
                </div>
                <Button
                  className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2"
                  onClick={() => navigate("/checkout")}
                >
                  Finalizar Pedido
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Link href="/">
                  <Button variant="ghost" className="w-full mt-2 text-muted-foreground text-sm">
                    Continuar comprando
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
