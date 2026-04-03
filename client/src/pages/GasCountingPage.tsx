import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function GasCountingPage() {
  const [countDate, setCountDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [fullQty, setFullQty] = useState(0);
  const [emptyQty, setEmptyQty] = useState(0);
  const [soldQty, setSoldQty] = useState(0);
  const [returnedQty, setReturnedQty] = useState(0);
  const [notes, setNotes] = useState("");

  // Queries
  const { data: products } = trpc.products.list.useQuery({});
  const { data: dailyCount } = trpc.truckDelivery.getDailyCount.useQuery(
    { countDate },
    { enabled: !!countDate }
  );
  const { data: countHistory } = trpc.truckDelivery.countHistory.useQuery(
    { limit: 30 },
    { enabled: true }
  );
  const { data: stockStats } = trpc.truckDelivery.stockStatistics.useQuery();

  // Mutations
  const recordCount = trpc.truckDelivery.recordDailyCount.useMutation({
    onSuccess: () => {
      toast.success("Contagem registrada com sucesso!");
      setFullQty(0);
      setEmptyQty(0);
      setSoldQty(0);
      setReturnedQty(0);
      setNotes("");
      setSelectedProduct(null);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleRecordCount = async () => {
    if (!selectedProduct) {
      toast.error("Selecione um produto");
      return;
    }

    const product = products?.find((p) => p.id === selectedProduct);
    if (!product) return;

    await recordCount.mutateAsync({
      countDate,
      productId: selectedProduct,
      productName: product.name,
      fullQty,
      emptyQty,
      soldQty: soldQty || undefined,
      returnedQty: returnedQty || undefined,
      notes: notes || undefined,
    });
  };

  const totalQty = fullQty + emptyQty;

  return (
    <AdminLayout title="Contagem de Gás">
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Stats Cards */}
        {stockStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estoque Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stockStats.totalStock}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stockStats.activeProducts} produtos ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estoque Baixo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {stockStats.lowStockCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Produtos com estoque baixo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fora de Estoque
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stockStats.outOfStockCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sem estoque disponível</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Média por Produto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(stockStats.averageStock)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Botijões em média</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Contagem */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Contagem</CardTitle>
                <CardDescription>
                  Preencha os dados de contagem para o dia {countDate}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Data */}
                <div>
                  <Label htmlFor="countDate">Data da Contagem</Label>
                  <Input
                    id="countDate"
                    type="date"
                    value={countDate}
                    onChange={(e) => setCountDate(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* Produto */}
                <div>
                  <Label htmlFor="product">Produto</Label>
                  <select
                    id="product"
                    value={selectedProduct || ""}
                    onChange={(e) => setSelectedProduct(parseInt(e.target.value))}
                    className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background"
                  >
                    <option value="">Selecione um produto...</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Estoque: {p.stockQty})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contagem */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullQty">Botijões Cheios</Label>
                    <Input
                      id="fullQty"
                      type="number"
                      min="0"
                      value={fullQty}
                      onChange={(e) => setFullQty(parseInt(e.target.value) || 0)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emptyQty">Botijões Vazios</Label>
                    <Input
                      id="emptyQty"
                      type="number"
                      min="0"
                      value={emptyQty}
                      onChange={(e) => setEmptyQty(parseInt(e.target.value) || 0)}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total de Botijões</span>
                    <span className="text-2xl font-bold text-primary">{totalQty}</span>
                  </div>
                </div>

                {/* Vendas e Devoluções */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="soldQty">Vendidos no Dia</Label>
                    <Input
                      id="soldQty"
                      type="number"
                      min="0"
                      value={soldQty}
                      onChange={(e) => setSoldQty(parseInt(e.target.value) || 0)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="returnedQty">Devolvidos</Label>
                    <Input
                      id="returnedQty"
                      type="number"
                      min="0"
                      value={returnedQty}
                      onChange={(e) => setReturnedQty(parseInt(e.target.value) || 0)}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione observações sobre a contagem..."
                    className="mt-2"
                  />
                </div>

                {/* Botão */}
                <Button
                  onClick={handleRecordCount}
                  disabled={!selectedProduct || recordCount.isPending}
                  className="w-full"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {recordCount.isPending ? "Registrando..." : "Registrar Contagem"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Histórico */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Histórico Recente
                </CardTitle>
                <CardDescription>Últimas 10 contagens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {countHistory && countHistory.length > 0 ? (
                    countHistory.slice(0, 10).map((count) => (
                      <div
                        key={count.id}
                        className="p-3 bg-muted rounded-lg border border-border/50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-sm">{count.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(count.countDate).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Cheios:</span>
                            <p className="font-semibold">{count.fullQty}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Vazios:</span>
                            <p className="font-semibold">{count.emptyQty}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma contagem registrada</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
