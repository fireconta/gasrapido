import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, Truck, Clock, Package } from "lucide-react";
import { MapView } from "@/components/Map";

const statusLabels: Record<string, string> = {
  novo: "Novo",
  em_preparo: "Em Preparo",
  aguardando_entregador: "Aguardando Entregador",
  saiu_entrega: "Saiu para Entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  novo: "bg-blue-100 text-blue-800",
  em_preparo: "bg-yellow-100 text-yellow-800",
  aguardando_entregador: "bg-orange-100 text-orange-800",
  saiu_entrega: "bg-purple-100 text-purple-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function Tracking() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);

  const trackingQuery = trpc.tracking.getPublicOrderTracking.useQuery(
    { orderNumber, phone: phone || undefined },
    { enabled: searched && !!orderNumber }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumber.trim()) {
      setSearched(true);
    }
  };

  const order = trackingQuery.data?.order;
  const delivererLocation = trackingQuery.data?.delivererLocation;
  const items = trackingQuery.data?.items || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Header */}
      <div className="bg-red-600 text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Rastreie seu Pedido</h1>
          <p className="text-red-100">Acompanhe sua entrega em tempo real</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Informe os dados do seu pedido</CardTitle>
            <CardDescription>Digite o número do pedido e seu telefone para rastrear</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Número do Pedido</label>
                  <Input
                    placeholder="Ex: GR20260318224250"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Telefone (opcional)</label>
                  <Input
                    placeholder="Ex: (64) 9 9999-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700"
                    disabled={trackingQuery.isLoading}
                  >
                    {trackingQuery.isLoading ? "Buscando..." : "Rastrear"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error State */}
        {trackingQuery.isError && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700 font-medium">
                ❌ {trackingQuery.error?.message || "Pedido não encontrado"}
              </p>
              <p className="text-red-600 text-sm mt-2">
                Verifique o número do pedido e tente novamente.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {order && (
          <div className="space-y-6">
            {/* Order Status */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Pedido #{order.orderNumber}</CardTitle>
                    <CardDescription>
                      Criado em {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[order.status] || "bg-gray-100"}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Cliente</p>
                    <p className="font-medium">{order.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Telefone</p>
                    <p className="font-medium">{order.customerPhone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Endereço de Entrega</p>
                    <p className="font-medium">{order.deliveryAddress}, {order.neighborhood}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-red-600">R$ {order.total.toFixed(2)}</p>
                  </div>
                  {order.delivererName && (
                    <div>
                      <p className="text-sm text-gray-600">Entregador</p>
                      <p className="font-medium">{order.delivererName}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Products */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Produtos do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                        </div>
                        <p className="font-medium">R$ {(parseFloat(String(item.subtotal)) || 0).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Map */}
            {delivererLocation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Localização do Entregador
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 rounded-lg overflow-hidden border">
                    <MapView
                      initialCenter={{ lat: delivererLocation.lat, lng: delivererLocation.lng }}
                      initialZoom={15}
                      onMapReady={(map) => {
                        if (!delivererLocation) return;
                        // Adicionar marcador do entregador
                        const marker = new google.maps.Marker({
                          position: {
                            lat: delivererLocation.lat,
                            lng: delivererLocation.lng,
                          },
                          map,
                          title: "Seu entregador",
                          icon: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png",
                        });

                        // Adicionar marcador do destino
                        const destinationMarker = new google.maps.Marker({
                          position: {
                            lat: delivererLocation.lat + 0.01, // Aproximado
                            lng: delivererLocation.lng + 0.01,
                          },
                          map,
                          title: "Seu destino",
                          icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                        });

                        // Centralizar no entregador
                        map.setCenter({
                          lat: delivererLocation.lat,
                          lng: delivererLocation.lng,
                        });
                        map.setZoom(15);
                      }}
                    />
                  </div>
                  {delivererLocation && delivererLocation.speed !== null && (
                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <p className="text-sm text-gray-600">Velocidade</p>
                      <p className="font-medium">{(delivererLocation.speed * 3.6).toFixed(1)} km/h</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Status do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { status: "novo", label: "Pedido Recebido", icon: "✓" },
                    { status: "em_preparo", label: "Em Preparo", icon: "⏳" },
                    { status: "aguardando_entregador", label: "Aguardando Entregador", icon: "⏳" },
                    { status: "saiu_entrega", label: "Saiu para Entrega", icon: "🚚" },
                    { status: "entregue", label: "Entregue", icon: "✓" },
                  ].map((step) => (
                    <div key={step.status} className="flex gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        ["novo", "em_preparo", "aguardando_entregador", "saiu_entrega", "entregue"].indexOf(step.status) <= 
                        ["novo", "em_preparo", "aguardando_entregador", "saiu_entrega", "entregue"].indexOf(order.status)
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}>
                        {step.icon}
                      </div>
                      <div>
                        <p className="font-medium">{step.label}</p>
                        {step.status === order.status && (
                          <p className="text-sm text-red-600 font-medium">Status atual</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!searched && (
          <Card className="text-center py-12">
            <CardContent>
              <Truck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg">Insira o número do seu pedido para começar</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
