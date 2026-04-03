import { useState, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, ImageIcon, Link, X, Archive, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

const CATEGORIES = [
  { value: "gas", label: "Gás" },
  { value: "agua", label: "Água" },
  { value: "carvao", label: "Carvão" },
  { value: "acessorio", label: "Acessório" },
  { value: "vale_gas", label: "Vale Gás" },
  { value: "outros", label: "Outros" },
];

const CATEGORY_LABELS: Record<string, string> = {
  gas: "Gás",
  agua: "Água",
  carvao: "Carvão",
  acessorio: "Acessório",
  vale_gas: "Vale Gás",
  outros: "Outros",
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  costPrice: string;
  imageUrl: string;
  category: string;
  unit: string;
  stockQty: number;
  fullStockQty: number;
  emptyStockQty: number;
  minStock: number;
  isVisible: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  costPrice: "",
  imageUrl: "",
  category: "gas",
  unit: "unidade",
  stockQty: 0,
  fullStockQty: 0,
  emptyStockQty: 0,
  minStock: 5,
  isVisible: true,
};

export default function Produtos() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");
  const fileInputId = useRef(`file-upload-${Math.random().toString(36).slice(2)}`);

  const utils = trpc.useUtils();
  // Admin usa listAll para ver todos os produtos (incluindo ocultos da loja)
  const { data: products, isLoading } = trpc.products.listAll.useQuery({ search });

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Produto criado com sucesso!");
      utils.products.listAll.invalidate();
      utils.products.list.invalidate();
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Produto atualizado!");
      utils.products.listAll.invalidate();
      utils.products.list.invalidate();
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleVisibilityMutation = trpc.products.toggleVisibility.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isVisible ? "Produto visível na loja!" : "Produto oculto da loja.");
      utils.products.listAll.invalidate();
      utils.products.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto removido!");
      utils.products.listAll.invalidate();
      utils.products.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadMutation = trpc.upload.productImage.useMutation({
    onSuccess: (data) => {
      setForm((f) => ({ ...f, imageUrl: data.url }));
      toast.success("Imagem enviada!");
    },
    onError: (e) => toast.error("Erro ao enviar imagem: " + e.message),
    onSettled: () => setUploading(false),
  });

  function openEdit(p: any) {
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      costPrice: p.costPrice ?? "",
      imageUrl: p.imageUrl ?? "",
      category: p.category ?? "gas",
      unit: p.unit ?? "unidade",
      stockQty: p.stockQty,
      fullStockQty: (p as any).fullStockQty ?? p.stockQty,
      emptyStockQty: (p as any).emptyStockQty ?? 0,
      minStock: p.minStock,
      isVisible: (p as any).isVisible ?? true,
    });
    setEditId(p.id);
    setShowForm(true);
    setShowUrlInput(false);
    setUrlInputValue("");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result || !result.includes(",")) {
        toast.error("Erro ao ler o arquivo de imagem.");
        setUploading(false);
        return;
      }
      const base64 = result.split(",")[1];
      uploadMutation.mutate({ base64, filename: file.name, mimeType: file.type });
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo. Tente novamente.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleUrlSubmit() {
    const url = urlInputValue.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast.error("URL inválida. Use http:// ou https://");
      return;
    }
    setForm((f) => ({ ...f, imageUrl: url }));
    setShowUrlInput(false);
    setUrlInputValue("");
    toast.success("URL de imagem definida!");
  }

  function handleSubmit() {
    if (!form.name || !form.price) {
      toast.error("Nome e preço são obrigatórios");
      return;
    }
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isLowStock = (p: any) => p.stockQty <= p.minStock;
  const activeProducts = products?.filter((p) => p.isActive) ?? [];
  const visibleCount = activeProducts.filter((p) => (p as any).isVisible !== false).length;
  const hiddenCount = activeProducts.filter((p) => (p as any).isVisible === false).length;

  return (
    <AdminLayout title="Produtos">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}
            className="bg-primary hover:bg-primary/90 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </Button>
        </div>

        {/* Stock Summary */}
        {!isLoading && products && products.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border kpi-gradient-blue p-5 transition-all duration-200 hover:-translate-y-1" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Produtos</p>
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-[28px] font-extrabold text-foreground leading-none">{activeProducts.length}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-green-600 flex items-center gap-0.5"><Eye className="w-3 h-3" /> {visibleCount} visíveis</span>
                {hiddenCount > 0 && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><EyeOff className="w-3 h-3" /> {hiddenCount} ocultos</span>}
              </div>
            </div>
            <div className="rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 bg-gradient-to-br from-red-50/70 to-card border-red-100" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Estoque Baixo</p>
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
              </div>
              <p className="text-[28px] font-extrabold text-foreground leading-none">{products.filter(p => isLowStock(p) && p.isActive).length}</p>
              <p className="text-xs text-muted-foreground mt-1.5">precisam reposição</p>
            </div>
            <div className="rounded-2xl border kpi-gradient-green p-5 transition-all duration-200 hover:-translate-y-1" style={{ boxShadow: "0 1px 3px oklch(0.13 0.018 240 / 0.07), 0 4px 16px oklch(0.13 0.018 240 / 0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Total Estoque</p>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Archive className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-[28px] font-extrabold text-foreground leading-none">{products.reduce((a, p) => a + (p.stockQty ?? 0), 0)}</p>
              <p className="text-xs text-muted-foreground mt-1.5">unidades em estoque</p>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-52 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : products?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Package className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
              <Button
                variant="outline"
                onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}
              >
                Adicionar primeiro produto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products?.map((p) => {
              const isHidden = (p as any).isVisible === false;
              return (
                <Card key={p.id} className={`overflow-hidden shadow-sm hover:shadow-md transition-all duration-150 group ${!p.isActive ? "opacity-60" : ""} ${isHidden ? "ring-1 ring-amber-300/60" : ""}`}>
                  {/* Product Image */}
                  <div className="h-36 bg-gradient-to-br from-muted/40 to-muted/70 relative overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className={`w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300 ${isHidden ? "opacity-60" : ""}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground/20" />
                      </div>
                    )}
                    {isLowStock(p) && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-red-500 text-white text-[10px] gap-1 px-2 py-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Estoque baixo
                        </Badge>
                      </div>
                    )}
                    {/* Badge de visibilidade */}
                    {isHidden && (
                      <div className="absolute top-2 left-2 mt-0">
                        <Badge className="bg-amber-500 text-white text-[10px] gap-1 px-2 py-0.5">
                          <EyeOff className="w-2.5 h-2.5" />
                          Oculto da loja
                        </Badge>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                        className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Editar produto"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                        className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center hover:bg-red-50 text-red-500 transition-colors"
                        title="Remover produto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {!p.isActive && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-medium bg-black/60 px-2 py-1 rounded-full">Inativo</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[p.category] ?? p.category}</p>
                      </div>
                      <p className="text-primary font-bold text-sm flex-shrink-0">
                        {formatCurrency(parseFloat(p.price))}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        isLowStock(p) ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}>
                        {p.stockQty} {p.unit}
                      </span>
                      {/* Toggle de visibilidade na loja */}
                      <div className="flex items-center gap-1.5" title={isHidden ? "Clique para mostrar na loja" : "Clique para ocultar da loja"}>
                        {isHidden ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5 text-green-500" />}
                        <Switch
                          checked={!isHidden}
                          onCheckedChange={(checked) =>
                            toggleVisibilityMutation.mutate({ id: p.id, isVisible: checked })
                          }
                          disabled={toggleVisibilityMutation.isPending}
                          className="scale-75 origin-right"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditId(null); setForm(emptyForm); setShowUrlInput(false); setUrlInputValue(""); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Image Upload */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Imagem do Produto</Label>
              <label
                htmlFor={fileInputId.current}
                className="h-32 border-2 border-dashed border-border rounded-xl flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors relative overflow-hidden block"
              >
                {form.imageUrl ? (
                  <>
                    <img src={form.imageUrl} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setForm((f) => ({ ...f, imageUrl: "" })); }}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground pointer-events-none">
                    {uploading ? (
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 opacity-30" />
                        <span className="text-xs">Clique para enviar imagem</span>
                        <span className="text-[10px] text-muted-foreground/60">JPG, PNG, WEBP • Máx 5MB</span>
                      </>
                    )}
                  </div>
                )}
              </label>
              <input
                id={fileInputId.current}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={handleImageChange}
                disabled={uploading}
              />
              <div className="mt-2">
                {!showUrlInput ? (
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(true)}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <Link className="w-3 h-3" />
                    Ou cole uma URL de imagem
                  </button>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={urlInputValue}
                      onChange={(e) => setUrlInputValue(e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="text-xs h-8 flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={handleUrlSubmit} className="h-8 px-3 text-xs">OK</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setShowUrlInput(false); setUrlInputValue(""); }} className="h-8 px-2">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-medium">Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Botijão P-13"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Preço de Venda *</Label>
                <Input
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Preço de Custo</Label>
                <Input
                  value={form.costPrice}
                  onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Categoria</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium">Unidade</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="unidade"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Estoque Atual</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stockQty}
                  onChange={(e) => setForm((f) => ({ ...f, stockQty: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Estoque Mínimo</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minStock}
                  onChange={(e) => setForm((f) => ({ ...f, minStock: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>
              {form.category === "gas" && (
                <>
                  <div>
                    <Label className="text-xs font-medium text-green-700">Botijões Cheios</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.fullStockQty}
                      onChange={(e) => setForm((f) => ({ ...f, fullStockQty: parseInt(e.target.value) || 0 }))}
                      className="mt-1 border-green-200 focus:border-green-400"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-amber-700">Botijões Vazios</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.emptyStockQty}
                      onChange={(e) => setForm((f) => ({ ...f, emptyStockQty: parseInt(e.target.value) || 0 }))}
                      className="mt-1 border-amber-200 focus:border-amber-400"
                    />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <Label className="text-xs font-medium">Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descrição do produto..."
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>
              {/* Toggle de visibilidade na loja */}
              <div className="col-span-2 flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  {form.isVisible ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-amber-500" />}
                  <div>
                    <p className="text-sm font-medium">Visível na loja dos clientes</p>
                    <p className="text-xs text-muted-foreground">
                      {form.isVisible ? "Produto aparece na página de compra" : "Produto oculto da página de compra"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.isVisible}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, isVisible: checked }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || uploading}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá desativar o produto. Ele não aparecerá mais nas listagens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
