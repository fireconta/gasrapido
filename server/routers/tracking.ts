import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { deliverers, delivererLocations } from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { makeRequest, type GeocodingResult, type DirectionsResult } from "../_core/map";

// ─── Middleware de autenticação do entregador via JWT ─────────────────────────
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "../_core/env";

const DELIVERER_JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret);

export async function verifyDelivererToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, DELIVERER_JWT_SECRET);
    if (payload.type !== "deliverer") throw new Error("Token inválido");
    return payload as { delivererId: number; type: string };
  } catch {
    throw new Error("Token inválido ou expirado");
  }
}

// ─── Router de Tracking ───────────────────────────────────────────────────────
export const trackingRouter = router({

  // Atualizar localização do entregador (chamado pelo app a cada 10s)
  updateLocation: publicProcedure
    .input(z.object({
      token: z.string(),
      lat: z.number(),
      lng: z.number(),
      accuracy: z.number().optional(),
      speed: z.number().optional(),
      heading: z.number().optional(),
      altitude: z.number().optional(),
      orderId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { delivererId } = await verifyDelivererToken(input.token);
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      // Inserir nova localização
      await db.insert(delivererLocations).values({
        delivererId,
        lat: String(input.lat),
        lng: String(input.lng),
        accuracy: input.accuracy != null ? String(input.accuracy) : null,
        speed: input.speed != null ? String(input.speed) : null,
        heading: input.heading != null ? String(input.heading) : null,
        altitude: input.altitude != null ? String(input.altitude) : null,
        orderId: input.orderId ?? null,
      });

      // Atualizar lastSeen do entregador
      await db.update(deliverers)
        .set({ lastSeen: new Date() })
        .where(eq(deliverers.id, delivererId));

      return { success: true };
    }),

  // Definir status online/offline do entregador
  setOnlineStatus: publicProcedure
    .input(z.object({
      token: z.string(),
      isOnline: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const { delivererId } = await verifyDelivererToken(input.token);
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      await db.update(deliverers)
        .set({
          isOnline: input.isOnline,
          lastSeen: new Date(),
        })
        .where(eq(deliverers.id, delivererId));

      return { success: true, isOnline: input.isOnline };
    }),

  // Obter todos os entregadores ativos com última localização (para o mapa admin)
  getActiveDeliverers: adminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      // Buscar todos os entregadores ativos
      const allDeliverers = await db
        .select()
        .from(deliverers)
        .where(eq(deliverers.isActive, true));

      // Para cada entregador, buscar a última localização
      const result = await Promise.all(
        allDeliverers.map(async (d) => {
          const [lastLocation] = await db
            .select()
            .from(delivererLocations)
            .where(eq(delivererLocations.delivererId, d.id))
            .orderBy(desc(delivererLocations.createdAt))
            .limit(1);

          return {
            id: d.id,
            name: d.name,
            phone: d.phone,
            isOnline: d.isOnline,
            isActive: d.isActive,
            lastSeen: d.lastSeen,
            vehicle: d.vehicle,
            location: lastLocation
              ? {
                  lat: parseFloat(String(lastLocation.lat)),
                  lng: parseFloat(String(lastLocation.lng)),
                  accuracy: lastLocation.accuracy ? parseFloat(String(lastLocation.accuracy)) : null,
                  speed: lastLocation.speed ? parseFloat(String(lastLocation.speed)) : null,
                  heading: lastLocation.heading ? parseFloat(String(lastLocation.heading)) : null,
                  updatedAt: lastLocation.createdAt,
                }
              : null,
          };
        })
      );

      return result;
    }),

  // Histórico de localização de um entregador específico (últimas 2h)
  getLocationHistory: adminProcedure
    .input(z.object({ delivererId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const locations = await db
        .select()
        .from(delivererLocations)
        .where(
          and(
            eq(delivererLocations.delivererId, input.delivererId),
            gte(delivererLocations.createdAt, twoHoursAgo)
          )
        )
        .orderBy(desc(delivererLocations.createdAt))
        .limit(500);

      return locations.map((l) => ({
        lat: parseFloat(String(l.lat)),
        lng: parseFloat(String(l.lng)),
        speed: l.speed ? parseFloat(String(l.speed)) : null,
        heading: l.heading ? parseFloat(String(l.heading)) : null,
        createdAt: l.createdAt,
      }));
    }),

  // Geocodificar endereço (para o app do entregador calcular rota)
  geocodeAddress: publicProcedure
    .input(z.object({
      token: z.string(),
      address: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Verificar token do entregador
      await verifyDelivererToken(input.token);

      try {
        const result = await makeRequest<GeocodingResult>("/maps/api/geocode/json", {
          address: `${input.address}, Quirinópolis, GO, Brasil`,
        });

        if (result.status !== "OK" || !result.results.length) {
          throw new Error("Endereço não encontrado");
        }

        const { location } = result.results[0].geometry;
        const formattedAddress = result.results[0].formatted_address;

        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress,
        };
      } catch (err: any) {
        throw new Error(err?.message ?? "Erro ao geocodificar endereço");
      }
    }),

  // Calcular rota entre entregador e cliente (para o app)
  getDeliveryRoute: publicProcedure
    .input(z.object({
      token: z.string(),
      originLat: z.number(),
      originLng: z.number(),
      destinationAddress: z.string(),
    }))
    .mutation(async ({ input }) => {
      await verifyDelivererToken(input.token);

      try {
        const result = await makeRequest<DirectionsResult>("/maps/api/directions/json", {
          origin: `${input.originLat},${input.originLng}`,
          destination: `${input.destinationAddress}, Quirinópolis, GO, Brasil`,
          mode: "driving",
          language: "pt-BR",
          region: "br",
        });

        if (result.status !== "OK" || !result.routes.length) {
          throw new Error("Rota não encontrada");
        }

        const route = result.routes[0];
        const leg = route.legs[0];

        // Decodificar polyline para array de coordenadas
        const polylinePoints = decodePolyline(route.overview_polyline.points);

        // Limpar HTML das instruções
        const steps = leg.steps.map((s) => ({
          instruction: s.html_instructions.replace(/<[^>]*>/g, ""),
          distance: s.distance.text,
          duration: s.duration.text,
          startLat: s.start_location.lat,
          startLng: s.start_location.lng,
          endLat: s.end_location.lat,
          endLng: s.end_location.lng,
        }));

        return {
          distanceText: leg.distance.text,
          distanceMeters: leg.distance.value,
          durationText: leg.duration.text,
          durationSeconds: leg.duration.value,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          polylinePoints,
          steps,
          summary: route.summary,
        };
      } catch (err: any) {
        throw new Error(err?.message ?? "Erro ao calcular rota");
      }
    }),

  // Rota otimizada para múltiplas entregas (nearest-neighbor + Google Maps Waypoints)
  getMultiDeliveryRoute: publicProcedure
    .input(z.object({
      token: z.string(),
      originLat: z.number(),
      originLng: z.number(),
      orders: z.array(z.object({
        id: z.number(),
        orderNumber: z.string(),
        customerName: z.string().optional(),
        address: z.string(),
        total: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      await verifyDelivererToken(input.token);

      if (input.orders.length === 0) throw new Error("Nenhum pedido selecionado");
      if (input.orders.length > 10) throw new Error("Máximo de 10 pedidos por rota");

      // 1. Geocodificar todos os endereços em paralelo
      const geocoded: Array<{ orderId: number; orderNumber: string; customerName: string; address: string; total: string; lat: number; lng: number; formattedAddress: string }> = [];

      for (const order of input.orders) {
        try {
          const result = await makeRequest<GeocodingResult>("/maps/api/geocode/json", {
            address: `${order.address}, Quirinópolis, GO, Brasil`,
          });
          if (result.status === "OK" && result.results.length > 0) {
            const { location } = result.results[0].geometry;
            geocoded.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName ?? "Cliente",
              address: order.address,
              total: order.total ?? "0",
              lat: location.lat,
              lng: location.lng,
              formattedAddress: result.results[0].formatted_address,
            });
          }
        } catch {
          // Pular endereços que não puderam ser geocodificados
        }
      }

      if (geocoded.length === 0) throw new Error("Nenhum endereço pôde ser geocodificado");

      // 2. Algoritmo Nearest-Neighbor: ordenar paradas do mais próximo ao mais distante
      const origin = { lat: input.originLat, lng: input.originLng };
      const optimized: typeof geocoded = [];
      const remaining = [...geocoded];

      let current = origin;
      while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const d = haversineDistance(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
          if (d < nearestDist) {
            nearestDist = d;
            nearestIdx = i;
          }
        }
        const nearest = remaining.splice(nearestIdx, 1)[0];
        optimized.push(nearest);
        current = { lat: nearest.lat, lng: nearest.lng };
      }

      // 3. Calcular rota completa com waypoints (origem → parada1 → parada2 → ... → última)
      const destination = optimized[optimized.length - 1];
      const waypoints = optimized.slice(0, -1);

      const waypointsParam = waypoints
        .map(w => `${w.lat},${w.lng}`)
        .join("|");

      const routeParams: Record<string, string> = {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode: "driving",
        language: "pt-BR",
        region: "br",
        optimize_waypoints: "false", // já otimizamos com nearest-neighbor
      };

      if (waypointsParam) {
        routeParams.waypoints = waypointsParam;
      }

      const result = await makeRequest<DirectionsResult>("/maps/api/directions/json", routeParams);

      if (result.status !== "OK" || !result.routes.length) {
        throw new Error("Não foi possível calcular a rota múltipla");
      }

      const route = result.routes[0];

      // 4. Decodificar polyline geral
      const polylinePoints = decodePolyline(route.overview_polyline.points);

      // 5. Montar dados de cada parada com info do leg correspondente
      const stops = optimized.map((stop, i) => {
        const leg = route.legs[i];
        return {
          stopNumber: i + 1,
          orderId: stop.orderId,
          orderNumber: stop.orderNumber,
          customerName: stop.customerName,
          address: stop.address,
          formattedAddress: stop.formattedAddress,
          total: stop.total,
          lat: stop.lat,
          lng: stop.lng,
          distanceText: leg?.distance?.text ?? "",
          distanceMeters: leg?.distance?.value ?? 0,
          durationText: leg?.duration?.text ?? "",
          durationSeconds: leg?.duration?.value ?? 0,
          // Instruções do trecho até esta parada
          steps: (leg?.steps ?? []).map(s => ({
            instruction: s.html_instructions.replace(/<[^>]*>/g, ""),
            distance: s.distance.text,
            duration: s.duration.text,
            startLat: s.start_location.lat,
            startLng: s.start_location.lng,
          })),
        };
      });

      // 6. Totais da rota
      const totalDistanceMeters = route.legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
      const totalDurationSeconds = route.legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0);

      return {
        stops,
        polylinePoints,
        totalDistanceText: formatDistance(totalDistanceMeters),
        totalDurationText: formatDuration(totalDurationSeconds),
        totalDistanceMeters,
        totalDurationSeconds,
        summary: route.summary,
        orderIds: optimized.map(s => s.orderId),
      };
    }),

  // Rastreamento público de pedido por número (sem autenticação)
  getPublicOrderTracking: publicProcedure
    .input(z.object({
      orderNumber: z.string(),
      phone: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      // Importar aqui para evitar circular dependency
      const { getOrderByNumber, getOrderItems } = await import("../db");
      const { orders: ordersTable } = await import("../../drizzle/schema");

      // Buscar pedido
      const order = await getOrderByNumber(input.orderNumber);
      if (!order) throw new Error("Pedido não encontrado");

      // Validar telefone se fornecido
      if (input.phone && order.customerPhone) {
        const clean = (s: string) => s.replace(/\D/g, "");
        if (clean(order.customerPhone) !== clean(input.phone)) {
          throw new Error("Telefone não corresponde");
        }
      }

      // Buscar itens do pedido
      const items = await getOrderItems(order.id);

      // Buscar localização do entregador se pedido está em entrega
      let delivererLocation: any = null;
      if (order.delivererId && (order.status === "saiu_entrega" || order.status === "aguardando_entregador")) {
        const [location] = await db
          .select()
          .from(delivererLocations)
          .where(eq(delivererLocations.delivererId, order.delivererId))
          .orderBy(desc(delivererLocations.createdAt))
          .limit(1);

        if (location) {
          delivererLocation = {
            lat: parseFloat(String(location.lat)),
            lng: parseFloat(String(location.lng)),
            speed: location.speed ? parseFloat(String(location.speed)) : null,
            heading: location.heading ? parseFloat(String(location.heading)) : null,
            updatedAt: location.createdAt,
          };
        }
      }

      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress,
          neighborhood: order.neighborhood,
          status: order.status,
          total: parseFloat(String(order.total)),
          delivererName: order.delivererName,
          createdAt: order.createdAt,
          deliveredAt: order.deliveredAt,
        },
        items,
        delivererLocation,
      };
    }),

  // Estatísticas de rastreamento para o admin
  getTrackingStats: adminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { online: 0, offline: 0, total: 0 };

      const [stats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          online: sql<number>`SUM(CASE WHEN isOnline = 1 THEN 1 ELSE 0 END)`,
        })
        .from(deliverers)
        .where(eq(deliverers.isActive, true));

      return {
        total: Number(stats?.total ?? 0),
        online: Number(stats?.online ?? 0),
        offline: Number(stats?.total ?? 0) - Number(stats?.online ?? 0),
      };
    }),
});

// ─── Decodificador de Polyline (algoritmo Google) ────────────────────────────
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

// ─── Fórmula de Haversine (distância entre dois pontos GPS em km) ─────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}
