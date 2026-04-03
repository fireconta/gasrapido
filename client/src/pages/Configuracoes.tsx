import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { maskPhone, maskCep } from "@/lib/masks";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Settings, Save, Store, Phone, MapPin, Clock, Truck, Wifi, WifiOff, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface SettingsForm {
  storeName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  openingHours: string;
  deliveryFee: string;
  minOrderValue: string;
  deliveryRadius: string;
  adminEmail: string;
  lowStockThreshold: string;
  timezone: string;
}

const DEFAULT_SETTINGS: SettingsForm = {
  storeName: "Gás Rápido",
  phone: "(64) 3651-1874",
  whatsapp: "(64) 98456-5616",
  address: "Av. José Quintiliano Leão, 346 B",
  city: "Quirinópolis",
  state: "GO",
  zipCode: "",
  openingHours: "Seg-Sáb: 07:00 - 19:00 | Dom: 08:00 - 12:00",
  deliveryFee: "5.00",
  minOrderValue: "0.00",
  deliveryRadius: "10",
  adminEmail: "admin@gasrapido.com",
  lowStockThreshold: "10",
  timezone: "America/Sao_Paulo",
};

export default function Configuracoes() {
  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [isDirty, setIsDirty] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { data: settings, isLoading } = trpc.settings.getAll.useQuery();
  const saveMutation = trpc.settings.saveAll.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      setIsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load settings from server
  useEffect(() => {
    if (settings) {
      setForm((prev) => ({
        ...prev,
        storeName: settings.storeName ?? prev.storeName,
        phone: settings.phone ?? prev.phone,
        whatsapp: settings.whatsapp ?? prev.whatsapp,
        address: settings.address ?? prev.address,
        city: settings.city ?? prev.city,
        state: settings.state ?? prev.state,
        zipCode: settings.zipCode ?? prev.zipCode,
        openingHours: settings.openingHours ?? prev.openingHours,
        deliveryFee: settings.deliveryFee ?? prev.deliveryFee,
        minOrderValue: settings.minOrderValue ?? prev.minOrderValue,
        deliveryRadius: settings.deliveryRadius ?? prev.deliveryRadius,
        adminEmail: settings.adminEmail ?? prev.adminEmail,
        lowStockThreshold: settings.lowStockThreshold ?? prev.lowStockThreshold,
        timezone: settings.timezone ?? prev.timezone,
      }));
    }
  }, [settings]);

  function handleChange(field: keyof SettingsForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  }

  function handleSave() {
    saveMutation.mutate({
      storeName: form.storeName,
      phone: form.phone,
      whatsapp: form.whatsapp,
      address: form.address,
      city: form.city,
      state: form.state,
      zipCode: form.zipCode,
      openingHours: form.openingHours,
      deliveryFee: form.deliveryFee,
      minOrderValue: form.minOrderValue,
      deliveryRadius: form.deliveryRadius,
      adminEmail: form.adminEmail,
      lowStockThreshold: form.lowStockThreshold,
      timezone: form.timezone,
    });
  }

  return (
    <AdminLayout title="Configurações">
      <div className="space-y-5 max-w-3xl">
        {/* Connection Status */}
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border ${
          isOnline
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"
        }`}>
          <div className={`w-2 h-2 rounded-full ${ isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500" }`} />
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isOnline ? "Sistema online — dados sincronizados automaticamente" : "Sistema offline — dados serão sincronizados quando a conexão for restaurada"}
        </div>

        {/* Store Info */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-50/80 to-card border-b border-blue-100/60">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <Store className="w-3.5 h-3.5 text-blue-600" />
              </div>
              Informações do Depósito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Nome do Depósito</Label>
                    <Input
                      className="mt-1"
                      value={form.storeName}
                      onChange={(e) => handleChange("storeName", e.target.value)}
                      placeholder="Gás Rápido"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Email do Administrador</Label>
                    <Input
                      className="mt-1"
                      type="email"
                      value={form.adminEmail}
                      onChange={(e) => handleChange("adminEmail", e.target.value)}
                      placeholder="admin@gasrapido.com"
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-green-50/80 to-card border-b border-green-100/60">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                <Phone className="w-3.5 h-3.5 text-green-600" />
              </div>
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Telefone</Label>
                <Input
                  className="mt-1"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", maskPhone(e.target.value))}
                  placeholder="(64) 3651-1874"
                  type="tel"
                  inputMode="tel"
                  maxLength={15}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">WhatsApp</Label>
                <Input
                  className="mt-1"
                  value={form.whatsapp}
                  onChange={(e) => handleChange("whatsapp", maskPhone(e.target.value))}
                  placeholder="(64) 98456-5616"
                  type="tel"
                  inputMode="tel"
                  maxLength={15}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-orange-50/80 to-card border-b border-orange-100/60">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
              </div>
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Endereço</Label>
              <Input
                className="mt-1"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Av. José Quintiliano Leão, 346 B"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs font-medium text-muted-foreground">Cidade</Label>
                <Input
                  className="mt-1"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Quirinópolis"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Estado</Label>
                <Input
                  className="mt-1"
                  value={form.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="GO"
                  maxLength={2}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">CEP</Label>
                <Input
                  className="mt-1"
                  value={form.zipCode}
                  onChange={(e) => handleChange("zipCode", maskCep(e.target.value))}
                  placeholder="75900-000"
                  inputMode="numeric"
                  maxLength={9}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hours */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-purple-50/80 to-card border-b border-purple-100/60">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
              </div>
              Horário de Funcionamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.openingHours}
              onChange={(e) => handleChange("openingHours", e.target.value)}
              placeholder="Seg-Sáb: 07:00 - 19:00 | Dom: 08:00 - 12:00"
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1.5">Use | para separar dias diferentes</p>
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-red-50/80 to-card border-b border-red-100/60">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                <Truck className="w-3.5 h-3.5 text-red-600" />
              </div>
              Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Taxa de Entrega (R$)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.deliveryFee}
                  onChange={(e) => handleChange("deliveryFee", e.target.value)}
                  placeholder="5.00"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Pedido Mínimo (R$)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minOrderValue}
                  onChange={(e) => handleChange("minOrderValue", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Raio de Entrega (km)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min="1"
                  value={form.deliveryRadius}
                  onChange={(e) => handleChange("deliveryRadius", e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timezone */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-sky-50/80 to-card border-b border-sky-100/60">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-sky-600" />
              </div>
              Fuso Horário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Fuso Horário do Sistema</Label>
              <select
                className="mt-1 w-full max-w-xs border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
              >
                <option value="America/Sao_Paulo">Brasília (UTC-3) — padrão</option>
                <option value="America/Manaus">Manaus (UTC-4)</option>
                <option value="America/Belem">Belém / Fortaleza (UTC-3)</option>
                <option value="America/Recife">Recife (UTC-3)</option>
                <option value="America/Fortaleza">Fortaleza (UTC-3)</option>
                <option value="America/Cuiaba">Cuiabá (UTC-4)</option>
                <option value="America/Porto_Velho">Porto Velho (UTC-4)</option>
                <option value="America/Boa_Vista">Boa Vista (UTC-4)</option>
                <option value="America/Rio_Branco">Rio Branco (UTC-5)</option>
                <option value="America/Noronha">Fernando de Noronha (UTC-2)</option>
                <option value="UTC">UTC (Coordenado Universal)</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1.5">
                Define o fuso horário para exibição de datas, relatórios, backups automáticos e notificações. O padrão é Brasília (UTC-3).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-slate-50/80 to-card border-b border-slate-200/60">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <Settings className="w-3.5 h-3.5 text-slate-600" />
              </div>
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Alerta de Estoque Baixo (unidades)</Label>
              <Input
                className="mt-1 max-w-[200px]"
                type="number"
                min="1"
                value={form.lowStockThreshold}
                onChange={(e) => handleChange("lowStockThreshold", e.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Você receberá notificações quando o estoque de um produto ficar abaixo deste valor.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pb-6">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !isDirty}
            className="bg-primary hover:bg-primary/90 text-white gap-2 px-8"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
