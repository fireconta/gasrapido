import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { MapView } from "@/components/Map";
import AdminLayout from "@/components/AdminLayout";
import {
  RefreshCw, MapPin, Wifi, WifiOff, Navigation,
  Users, Clock, Zap, Route,
} from "lucide-react";
import { toast } from "sonner";

interface DelivererInfo {
  id: number;
  name: string;
  phone: string | null;
  isOnline: boolean;
  isActive: boolean;
  lastSeen: Date | null;
  vehicle: string | null;
  location: {
    lat: number;
    lng: number;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    updatedAt: Date;
  } | null;
}

const DELIVERER_COLORS = [
  "#e53e3e", "#3182ce", "#38a169", "#d69e2e", "#805ad5",
  "#dd6b20", "#319795", "#e53e3e", "#2b6cb0", "#276749",
];

export default function TrackingMap() {
  const [selectedDeliverer, setSelectedDeliverer] = useState<number | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const historyPolylineRef = useRef<google.maps.Polyline | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: deliverers = [], refetch } = trpc.tracking.getActiveDeliverers.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const { data: settings } = trpc.settings.getAll.useQuery();
  const googleMapsApiKey = (settings as any)?.googleMapsApiKey as string | undefined;

  const { data: stats } = trpc.tracking.getTrackingStats.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const { data: history } = trpc.tracking.getLocationHistory.useQuery(
    { delivererId: selectedDeliverer! },
    { enabled: !!selectedDeliverer, refetchInterval: 15000 }
  );

  const toggleOnlineMutation = trpc.deliverers.setOnline.useMutation({
    onMutate: ({ delivererId }) => setTogglingId(delivererId),
    onSuccess: (_, { delivererId, isOnline }) => {
      toast.success(`Entregador marcado como ${isOnline ? "online" : "offline"}`);
      utils.tracking.getActiveDeliverers.invalidate();
      utils.tracking.getTrackingStats.invalidate();
      setTogglingId(null);
    },
    onError: (e) => { toast.error(e.message); setTogglingId(null); },
  });

  // Atualizar marcadores no mapa quando os dados mudam
  useEffect(() => {
    if (!mapInstance) return;
    updateMarkers();
  }, [deliverers, mapInstance]);

  // Mostrar histórico de rota (corrigido: history vem DESC, precisamos ASC para polyline)
  useEffect(() => {
    if (!mapInstance) return;
    if (historyPolylineRef.current) {
      historyPolylineRef.current.setMap(null);
      historyPolylineRef.current = null;
    }
    if (history && history.length > 1 && selectedDeliverer) {
      // Inverter para ordem cronológica (mais antigo → mais recente)
      const path = [...history].reverse().map((p) => ({ lat: p.lat, lng: p.lng }));
      const idx = deliverers.findIndex((d: DelivererInfo) => d.id === selectedDeliverer);
      const color = DELIVERER_COLORS[idx >= 0 ? idx % DELIVERER_COLORS.length : 0];
      historyPolylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: mapInstance,
      });
    }
  }, [history, mapInstance, selectedDeliverer]);

  function updateMarkers() {
    if (!mapInstance) return;
    const currentIds = new Set(deliverers.map((d: DelivererInfo) => d.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.setMap(null); markersRef.current.delete(id); }
    });
    deliverers.forEach((d: DelivererInfo, index: number) => {
      if (!d.location) return;
      const color = DELIVERER_COLORS[index % DELIVERER_COLORS.length];
      const position = { lat: d.location.lat, lng: d.location.lng };
      const svgIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
            <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter>
            <circle cx="22" cy="22" r="20" fill="${d.isOnline ? color : '#9ca3af'}" stroke="white" stroke-width="3" filter="url(#shadow)"/>
            <text x="22" y="29" text-anchor="middle" fill="white" font-size="18" font-family="Arial">🚴</text>
            <polygon points="22,42 15,30 29,30" fill="${d.isOnline ? color : '#9ca3af'}"/>
            ${d.isOnline ? `<circle cx="36" cy="8" r="7" fill="#22c55e" stroke="white" stroke-width="2.5"/>` : ''}
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(44, 56),
        anchor: new google.maps.Point(22, 56),
      };
      if (markersRef.current.has(d.id)) {
        const marker = markersRef.current.get(d.id)!;
        marker.setPosition(position);
        marker.setIcon(svgIcon);
      } else {
        const marker = new google.maps.Marker({
          position, map: mapInstance, title: d.name, icon: svgIcon,
          animation: google.maps.Animation.DROP,
        });
        marker.addListener("click", () => {
          if (infoWindowRef.current) infoWindowRef.current.close();
          const lastUpdate = d.location?.updatedAt
            ? new Date(d.location.updatedAt).toLocaleTimeString("pt-BR") : "—";
          const speed = d.location?.speed != null ? `${(d.location.speed * 3.6).toFixed(1)} km/h` : "—";
          infoWindowRef.current = new google.maps.InfoWindow({
            content: `
              <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 6px 2px;">
                <div style="font-weight: 800; font-size: 15px; color: ${color}; margin-bottom: 8px; display:flex; align-items:center; gap:6px;">
                  🚴 ${d.name}
                </div>
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                  <span style="width:8px;height:8px;border-radius:50%;background:${d.isOnline ? '#22c55e' : '#9ca3af'};display:inline-block;"></span>
                  <span style="font-size:12px;color:#555;">${d.isOnline ? 'Online' : 'Offline'}${d.vehicle ? ` • ${d.vehicle}` : ''}</span>
                </div>
                ${d.phone ? `<div style="font-size:12px;color:#555;margin-bottom:4px;">📞 ${d.phone}</div>` : ''}
                <div style="font-size:11px;color:#888;margin-bottom:2px;">⏱ Atualizado: ${lastUpdate}</div>
                <div style="font-size:11px;color:#888;">🏎 Velocidade: ${speed}</div>
              </div>
            `,
          });
          infoWindowRef.current.open(mapInstance, marker);
          setSelectedDeliverer(d.id);
        });
        markersRef.current.set(d.id, marker);
      }
    });
  }

  function handleMapReady(map: google.maps.Map) {
    setMapInstance(map);
    map.setCenter({ lat: -18.4444, lng: -50.4497 });
    map.setZoom(13);
  }

  function focusDeliverer(d: DelivererInfo) {
    if (!mapInstance || !d.location) return;
    mapInstance.panTo({ lat: d.location.lat, lng: d.location.lng });
    mapInstance.setZoom(16);
    setSelectedDeliverer(d.id);
    const marker = markersRef.current.get(d.id);
    if (marker) google.maps.event.trigger(marker, "click");
  }

  function formatLastSeen(date: Date | null) {
    if (!date) return "Nunca";
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return "Agora";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`;
    return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  const onlineCount = deliverers.filter((d: DelivererInfo) => d.isOnline).length;
  const withLocation = deliverers.filter((d: DelivererInfo) => d.location).length;

  return (
    <AdminLayout title="Rastreamento GPS">
      <div className="space-y-5">

        {/* ─── Stats ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Online", value: onlineCount, icon: <Wifi className="w-5 h-5" />, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
            { label: "Offline", value: (deliverers.length - onlineCount), icon: <WifiOff className="w-5 h-5" />, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200" },
            { label: "Com GPS", value: withLocation, icon: <MapPin className="w-5 h-5" />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
            { label: "Total", value: deliverers.length, icon: <Users className="w-5 h-5" />, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
          ].map((s, i) => (
            <Card key={i} className={`border ${s.border}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0 ${s.color}`}>
                  {s.icon}
                </div>
                <div>
                  <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── Mapa + Lista ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Mapa */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border border-border/60">
              <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/40 bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Mapa em Tempo Real
                  <span className="flex items-center gap-1 text-xs text-green-600 font-normal">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Atualiza a cada 10s
                  </span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-8 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div style={{ height: "520px", width: "100%" }}>
                  <MapView
                    onMapReady={handleMapReady}
                    apiKey={googleMapsApiKey || undefined}
                    initialCenter={{ lat: -18.4547, lng: -50.4431 }}
                    initialZoom={14}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de entregadores */}
          <div className="lg:col-span-1">
            <Card className="border border-border/60 h-full">
              <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Entregadores
                  <Badge variant="secondary" className="text-xs ml-auto">{deliverers.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50 max-h-[480px] overflow-y-auto">
                  {deliverers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">Nenhum entregador</p>
                      <p className="text-xs mt-1">Cadastre entregadores na aba Entregadores</p>
                    </div>
                  ) : (
                    deliverers.map((d: DelivererInfo, index: number) => {
                      const color = DELIVERER_COLORS[index % DELIVERER_COLORS.length];
                      const isSelected = selectedDeliverer === d.id;
                      const isToggling = togglingId === d.id;
                      return (
                        <div
                          key={d.id}
                          className={`p-3 transition-colors ${isSelected ? "bg-muted/40" : "hover:bg-muted/20"}`}
                          style={isSelected ? { borderLeft: `3px solid ${color}` } : { borderLeft: "3px solid transparent" }}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Avatar */}
                            <button
                              onClick={() => focusDeliverer(d)}
                              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5 transition-transform hover:scale-110"
                              style={{ backgroundColor: d.isOnline ? color : "#9ca3af" }}
                            >
                              {d.name.charAt(0).toUpperCase()}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <button
                                  onClick={() => focusDeliverer(d)}
                                  className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors text-left"
                                >
                                  {d.name}
                                </button>
                                {/* Toggle online/offline */}
                                <Switch
                                  checked={d.isOnline}
                                  disabled={isToggling}
                                  onCheckedChange={(checked) =>
                                    toggleOnlineMutation.mutate({ delivererId: d.id, isOnline: checked })
                                  }
                                  className="scale-75 flex-shrink-0"
                                />
                              </div>

                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${d.isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                                <span className={`text-[11px] font-medium ${d.isOnline ? "text-green-600" : "text-muted-foreground"}`}>
                                  {d.isOnline ? "Online" : "Offline"}
                                </span>
                                {d.vehicle && (
                                  <span className="text-[11px] text-muted-foreground">• {d.vehicle}</span>
                                )}
                              </div>

                              {d.location ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <Navigation className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  <span className="text-[11px] text-muted-foreground">
                                    {formatLastSeen(d.location.updatedAt)}
                                  </span>
                                  {d.location.speed != null && d.location.speed > 0.5 && (
                                    <span className="text-[11px] text-blue-500 font-medium">
                                      • {(d.location.speed * 3.6).toFixed(0)} km/h
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-[11px] text-muted-foreground">Sem localização</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Rota selecionada */}
                          {isSelected && history && history.length > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-1.5">
                              <Route className="w-3 h-3 flex-shrink-0" style={{ color }} />
                              <span>{history.length} pontos de rota (2h)</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── Legenda ────────────────────────────────────────────────────────── */}
        <Card className="border border-border/40">
          <CardContent className="py-3 px-5">
            <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Ponto verde = Online com GPS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span>Cinza = Offline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-blue-400 rounded" />
                <span>Linha = Rota das últimas 2h (clique no entregador)</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Zap className="w-3 h-3 text-green-500" />
                <span>Toggle = ligar/desligar status online do entregador</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Atualização automática: 10s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
