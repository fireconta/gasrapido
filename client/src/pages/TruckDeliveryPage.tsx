import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import {
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Package,
} from "lucide-react";

export default function TruckDeliveryPage() {
  const [step, setStep] = useState<"list" | "create" | "process">("list");
  const [selectedDelivery, setSelectedDelivery] = useState<number | null>(null);

  // Criar nova entrega
  const [truckPlate, setTruckPlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState("");

  // Adicionar itens
  const [items, setItems] = useState<
    Array<{
      productId: number;
      productName: string;
      emptyReceived: number;
      fullDelivered: number;
      notes: string;
    }>
  >([]);
  const [currentItem, setCurrentItem] = useState({
    productId: 0,
    productName: "",
    emptyReceived: 0,
    fullDelivered: 0,
    notes: "",
  });

  // Queries
  const { data: products } = trpc.products.list.useQuery({});
  const { data: deliveryHistory } = trpc.truckDelivery.history.useQuery({
    limit: 50,
  });
  const { data: deliveryDetails } = trpc.truckDelivery.details.useQuery(
    { truckDeliveryId: selectedDelivery || 0 },
    { enabled: !!selectedDelivery && step === "process" }
  );

  // Mutations
  const createDelivery = trpc.truckDelivery.create.useMutation({
    onSuccess: (data) => {
      toast.success("Entrega criada com sucesso!");
      setSelectedDelivery(data.id);
      setStep("process");
      setTruckPlate("");
      setDriverName("");
      setNotes("");
      setItems([]);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const addItem = trpc.truckDelivery.addItem.useMutation({
    onSuccess: () => {
      toast.success("Item adicionado!");
      setCurrentItem({
        productId: 0,
        productName: "",
        emptyReceived: 0,
        fullDelivered: 0,
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const processDelivery = trpc.truckDelivery.process.useMutation({
    onSuccess: () => {
      toast.success("Entrega processada com sucesso! Estoque atualizado automaticamente.");
      setStep("list");
      setSelectedDelivery(null);
      setItems([]);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateDelivery = async () => {
    if (!truckPlate) {
      toast.error("Informe a placa do caminhão");
      return;
    }

    await createDelivery.mutateAsync({
      truckPlate,
      driverName: driverName || undefined,
      notes: notes || undefined,
    });
  };

  const handleAddItem = async () => {
    if (!currentItem.productId) {
      toast.error("Selecione um produto");
      return;
    }

    if (!selectedDelivery) {
      toast.error("Selecione uma entrega");
      return;
    }

    const product = products?.find((p) => p.id === currentItem.productId);
    if (!product) return;

    await addItem.mutateAsync({
      truckDeliveryId: selectedDelivery,
      productId: currentItem.productId,
      productName: product.name,
      emptyReceived: currentItem.emptyReceived,
      fullDelivered: currentItem.fullDelivered,
      notes: currentItem.notes || undefined,
    });
  };

  const handleProcessDelivery = async () => {
    if (!selectedDelivery) return;

    if (!deliveryDetails?.items || deliveryDetails.items.length === 0) {
      toast.error("Adicione itens à entrega antes de processar");
      return;
    }

    await processDelivery.mutateAsync({
      truckDeliveryId: selectedDelivery,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluido":
        return "text-green-600";
      case "em_transito":
        return "text-blue-600";
      case "chegou":
        return "text-yellow-600";
      case "processando":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      planejado: "Planejado",
      em_transito: "Em Trânsito",
      chegou: "Chegou",
      processando: "Processando",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  };

  return (
    <AdminLayout title="Entrega de Caminhão">
    <div className="p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border">
          <button
            onClick={() => setStep("list")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              step === "list"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Histórico
          </button>
          <button
            onClick={() => setStep("create")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              step === "create"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Nova Entrega
          </button>
        </div>

        {/* Lista de Entregas */}
        {step === "list" && (
          <div className="space-y-4">
            {deliveryHistory && deliveryHistory.length > 0 ? (
              deliveryHistory.map((delivery) => (
                <Card
                  key={delivery.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedDelivery(delivery.id);
                    setStep("process");
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Truck className="w-5 h-5 text-muted-foreground" />
                          <span className="font-bold text-lg">{delivery.truckPlate}</span>
                          <span className={`text-sm font-medium ${getStatusColor(delivery.status)}`}>
                            {getStatusLabel(delivery.status)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Motorista: {delivery.driverName || "Não informado"}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Vazios Recebidos:</span>
                            <p className="font-semibold">{delivery.totalEmptyReceived}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cheios Entregues:</span>
                            <p className="font-semibold">{delivery.totalFullDelivered}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(delivery.deliveryDate).toLocaleDateString("pt-BR")}
                        </p>
                        <ChevronRight className="w-5 h-5 mt-2 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhuma entrega registrada</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Criar Nova Entrega */}
        {step === "create" && (
          <Card>
            <CardHeader>
              <CardTitle>Criar Nova Entrega</CardTitle>
              <CardDescription>
                Preencha os dados do caminhão que chegará com botijões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="truckPlate">Placa do Caminhão *</Label>
                  <Input
                    id="truckPlate"
                    value={truckPlate}
                    onChange={(e) => setTruckPlate(e.target.value.toUpperCase())}
                    placeholder="ABC-1234"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="driverName">Nome do Motorista</Label>
                  <Input
                    id="driverName"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="João Silva"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione observações sobre a entrega..."
                  className="mt-2"
                />
              </div>

              <Button
                onClick={handleCreateDelivery}
                disabled={createDelivery.isPending}
                size="lg"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {createDelivery.isPending ? "Criando..." : "Criar Entrega"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Processar Entrega */}
        {step === "process" && deliveryDetails && (
          <div className="space-y-6">
            {/* Info da Entrega */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  {deliveryDetails.delivery.truckPlate}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`font-semibold ${getStatusColor(deliveryDetails.delivery.status)}`}>
                      {getStatusLabel(deliveryDetails.delivery.status)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Motorista</p>
                    <p className="font-semibold">
                      {deliveryDetails.delivery.driverName || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vazios Recebidos</p>
                    <p className="font-semibold text-lg">
                      {deliveryDetails.delivery.totalEmptyReceived}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cheios Entregues</p>
                    <p className="font-semibold text-lg">
                      {deliveryDetails.delivery.totalFullDelivered}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Itens da Entrega */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Itens da Entrega ({deliveryDetails.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deliveryDetails.items.length > 0 ? (
                  <div className="space-y-3">
                    {deliveryDetails.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 bg-muted rounded-lg border border-border/50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Vazios Recebidos:</span>
                            <p className="font-semibold text-lg">{item.emptyReceived}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cheios Entregues:</span>
                            <p className="font-semibold text-lg">{item.fullDelivered}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum item adicionado
                  </p>
                )}

                {deliveryDetails.delivery.status === "planejado" && (
                  <div className="mt-6 space-y-4">
                    <div className="border-t border-border pt-6">
                      <h3 className="font-semibold mb-4">Adicionar Item</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="product">Produto</Label>
                          <select
                            id="product"
                            value={currentItem.productId}
                            onChange={(e) => {
                              const productId = parseInt(e.target.value);
                              const product = products?.find((p) => p.id === productId);
                              setCurrentItem({
                                ...currentItem,
                                productId,
                                productName: product?.name || "",
                              });
                            }}
                            className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background"
                          >
                            <option value="">Selecione um produto...</option>
                            {products?.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="emptyReceived">Vazios Recebidos</Label>
                            <Input
                              id="emptyReceived"
                              type="number"
                              min="0"
                              value={currentItem.emptyReceived}
                              onChange={(e) =>
                                setCurrentItem({
                                  ...currentItem,
                                  emptyReceived: parseInt(e.target.value) || 0,
                                })
                              }
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="fullDelivered">Cheios Entregues</Label>
                            <Input
                              id="fullDelivered"
                              type="number"
                              min="0"
                              value={currentItem.fullDelivered}
                              onChange={(e) =>
                                setCurrentItem({
                                  ...currentItem,
                                  fullDelivered: parseInt(e.target.value) || 0,
                                })
                              }
                              className="mt-2"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="itemNotes">Observações</Label>
                          <Textarea
                            id="itemNotes"
                            value={currentItem.notes}
                            onChange={(e) =>
                              setCurrentItem({
                                ...currentItem,
                                notes: e.target.value,
                              })
                            }
                            placeholder="Observações sobre este item..."
                            className="mt-2"
                          />
                        </div>

                        <Button
                          onClick={handleAddItem}
                          disabled={addItem.isPending}
                          variant="outline"
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {addItem.isPending ? "Adicionando..." : "Adicionar Item"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ações */}
            {deliveryDetails.delivery.status === "planejado" && (
              <div className="flex gap-4">
                <Button
                  onClick={() => setStep("list")}
                  variant="outline"
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleProcessDelivery}
                  disabled={processDelivery.isPending}
                  className="flex-1"
                  size="lg"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {processDelivery.isPending
                    ? "Processando..."
                    : "Processar Entrega e Atualizar Estoque"}
                </Button>
              </div>
            )}

            {deliveryDetails.delivery.status === "concluido" && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Entrega Concluída</p>
                      <p className="text-sm text-green-700">
                        Estoque foi atualizado automaticamente
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
    </AdminLayout>
  );
}
