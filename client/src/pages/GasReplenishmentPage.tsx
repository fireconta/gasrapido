import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  CheckCircle2,
} from "lucide-react";

interface ReplenishmentItem {
  productId: number;
  productName: string;
  emptySent: number;
  fullReceived: number;
  notes?: string;
}

export default function GasReplenishmentPage() {
  const { user } = useAuth();
  const [distributorName, setDistributorName] = useState("");
  const [truckPlate, setTruckPlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [items, setItems] = useState<ReplenishmentItem[]>([]);
  const [currentItem, setCurrentItem] = useState<ReplenishmentItem>({
    productId: 0,
    productName: "",
    emptySent: 0,
    fullReceived: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [replenishmentId, setReplenishmentId] = useState<number | null>(null);

  const createReplenishmentMutation = trpc.paymentDiscount.createReplenishment.useMutation();
  const addItemMutation = trpc.paymentDiscount.addReplenishmentItem.useMutation();
  const processReplenishmentMutation = trpc.paymentDiscount.processReplenishment.useMutation();
  const historyQuery = trpc.paymentDiscount.replenishmentHistory.useQuery();

  const handleAddItem = () => {
    if (!currentItem.productName) {
      toast.error("Digite o nome do produto");
      return;
    }

    if (currentItem.emptySent === 0 && currentItem.fullReceived === 0) {
      toast.error("Adicione pelo menos um botijão (vazio ou cheio)");
      return;
    }

    setItems([...items, { ...currentItem }]);
    setCurrentItem({
      productId: items.length + 1,
      productName: "",
      emptySent: 0,
      fullReceived: 0,
    });
    toast.success("Item adicionado");
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateReplenishment = async () => {
    if (!distributorName) {
      toast.error("Digite o nome da distribuidora");
      return;
    }

    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    setIsProcessing(true);
    try {
      const replenishment = await createReplenishmentMutation.mutateAsync({
        distributorName,
        truckPlate: truckPlate || undefined,
        driverName: driverName || undefined,
      });

      setReplenishmentId(replenishment.id);

      // Adicionar itens
      for (const item of items) {
        await addItemMutation.mutateAsync({
          replenishmentId: replenishment.id,
          productId: item.productId,
          productName: item.productName,
          emptySent: item.emptySent,
          fullReceived: item.fullReceived,
          notes: item.notes,
        });
      }

      toast.success("Reposição criada com sucesso!");
      
      // Limpar formulário
      setDistributorName("");
      setTruckPlate("");
      setDriverName("");
      setItems([]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar reposição");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessReplenishment = async () => {
    if (!replenishmentId) {
      toast.error("Nenhuma reposição em andamento");
      return;
    }

    setIsProcessing(true);
    try {
      await processReplenishmentMutation.mutateAsync({
        replenishmentId,
      });

      toast.success("Reposição processada e estoque atualizado!");
      setReplenishmentId(null);
      historyQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar reposição");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalEmpty = items.reduce((sum, item) => sum + item.emptySent, 0);
  const totalFull = items.reduce((sum, item) => sum + item.fullReceived, 0);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Reposição de Gás na Distribuidora
            </h1>
          </div>
          <p className="text-muted-foreground">
            Registre a entrega de botijões vazios e recebimento de cheios
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações da Distribuidora */}
            <Card className="p-6 border-border/60">
              <h2 className="text-lg font-semibold mb-4 text-foreground">
                Informações da Distribuidora
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="distributor" className="text-sm text-muted-foreground mb-2 block">
                    Nome da Distribuidora *
                  </Label>
                  <Input
                    id="distributor"
                    placeholder="Ex: Distribuidora XYZ"
                    value={distributorName}
                    onChange={(e) => setDistributorName(e.target.value)}
                    disabled={replenishmentId !== null}
                    className="border-border/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="plate" className="text-sm text-muted-foreground mb-2 block">
                      Placa do Caminhão
                    </Label>
                    <Input
                      id="plate"
                      placeholder="ABC-1234"
                      value={truckPlate}
                      onChange={(e) => setTruckPlate(e.target.value)}
                      disabled={replenishmentId !== null}
                      className="border-border/60"
                    />
                  </div>
                  <div>
                    <Label htmlFor="driver" className="text-sm text-muted-foreground mb-2 block">
                      Nome do Motorista
                    </Label>
                    <Input
                      id="driver"
                      placeholder="João Silva"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      disabled={replenishmentId !== null}
                      className="border-border/60"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Adicionar Itens */}
            <Card className="p-6 border-border/60">
              <h2 className="text-lg font-semibold mb-4 text-foreground">
                Adicionar Itens
              </h2>
              <div className="space-y-4 mb-4">
                <div>
                  <Label htmlFor="product" className="text-sm text-muted-foreground mb-2 block">
                    Nome do Produto *
                  </Label>
                  <Input
                    id="product"
                    placeholder="Ex: Botijão P13"
                    value={currentItem.productName}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, productName: e.target.value })
                    }
                    disabled={replenishmentId !== null}
                    className="border-border/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="empty" className="text-sm text-muted-foreground mb-2 block">
                      Botijões Vazios Enviados
                    </Label>
                    <Input
                      id="empty"
                      type="number"
                      placeholder="0"
                      value={currentItem.emptySent}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          emptySent: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                      disabled={replenishmentId !== null}
                      className="border-border/60"
                    />
                  </div>
                  <div>
                    <Label htmlFor="full" className="text-sm text-muted-foreground mb-2 block">
                      Botijões Cheios Recebidos
                    </Label>
                    <Input
                      id="full"
                      type="number"
                      placeholder="0"
                      value={currentItem.fullReceived}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          fullReceived: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                      disabled={replenishmentId !== null}
                      className="border-border/60"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-sm text-muted-foreground mb-2 block">
                    Observações
                  </Label>
                  <Input
                    id="notes"
                    placeholder="Adicione observações se necessário"
                    value={currentItem.notes || ""}
                    onChange={(e) =>
                      setCurrentItem({ ...currentItem, notes: e.target.value })
                    }
                    disabled={replenishmentId !== null}
                    className="border-border/60"
                  />
                </div>

                <Button
                  onClick={handleAddItem}
                  disabled={replenishmentId !== null}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-10 rounded-lg gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Item
                </Button>
              </div>
            </Card>

            {/* Lista de Itens */}
            {items.length > 0 && (
              <Card className="p-6 border-border/60">
                <h2 className="text-lg font-semibold mb-4 text-foreground">
                  Itens Adicionados ({items.length})
                </h2>
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/60"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.emptySent} vazios enviados • {item.fullReceived} cheios recebidos
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        disabled={replenishmentId !== null}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-3">
              <Button
                onClick={handleCreateReplenishment}
                disabled={isProcessing || replenishmentId !== null || items.length === 0}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold h-11 rounded-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Reposição
                  </>
                )}
              </Button>

              {replenishmentId && (
                <Button
                  onClick={handleProcessReplenishment}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold h-11 rounded-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Processar Reposição
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Resumo */}
          <div className="space-y-6">
            {/* Status Atual */}
            <Card className="p-6 border-border/60">
              <h3 className="font-semibold text-foreground mb-4">Status Atual</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {replenishmentId ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {replenishmentId
                      ? `Reposição #${replenishmentId} em andamento`
                      : "Aguardando criação"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Resumo de Itens */}
            <Card className="p-6 border-border/60 bg-muted/30">
              <h3 className="font-semibold text-foreground mb-4">Resumo</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total de Itens:</span>
                  <span className="font-semibold text-foreground">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vazios Enviados:</span>
                  <span className="font-semibold text-red-600">{totalEmpty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cheios Recebidos:</span>
                  <span className="font-semibold text-green-600">{totalFull}</span>
                </div>
                <div className="border-t border-border/60 pt-3 flex justify-between">
                  <span className="text-sm text-muted-foreground font-medium">Saldo:</span>
                  <span className="font-semibold text-foreground">
                    {totalFull - totalEmpty}
                  </span>
                </div>
              </div>
            </Card>

            {/* Histórico Recente */}
            {historyQuery.data && historyQuery.data.length > 0 && (
              <Card className="p-6 border-border/60">
                <h3 className="font-semibold text-foreground mb-4">Histórico Recente</h3>
                <div className="space-y-2">
                  {historyQuery.data.slice(0, 3).map((rep: any) => (
                    <div key={rep.id} className="text-xs p-2 bg-muted/50 rounded">
                      <p className="font-medium text-foreground">{rep.distributorName}</p>
                      <p className="text-muted-foreground">
                        {rep.status} • {new Date(rep.replenishmentDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
