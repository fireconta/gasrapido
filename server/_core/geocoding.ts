/**
 * Geocoding Service
 * Converte endereços em coordenadas GPS usando a Google Maps Geocoding API
 * via proxy Manus (makeRequest).
 */

import { makeRequest, GeocodingResult } from "./map";

export interface GeocodedAddress {
  lat: number;
  lng: number;
  formattedAddress: string;
  googleMapsUrl: string;
  googleMapsDirectionsUrl: string;
}

/**
 * Geocodifica um endereço e retorna coordenadas + links do Google Maps.
 * Retorna null se o endereço não puder ser geocodificado.
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  neighborhood?: string
): Promise<GeocodedAddress | null> {
  try {
    // Montar endereço completo para melhor precisão
    const parts = [address];
    if (neighborhood) parts.push(neighborhood);
    if (city) parts.push(city);
    parts.push("Brasil");
    const fullAddress = parts.join(", ");

    const result = await makeRequest<GeocodingResult>("/maps/api/geocode/json", {
      address: fullAddress,
    });

    if (result.status !== "OK" || !result.results || result.results.length === 0) {
      console.warn(`[Geocoding] Endereço não encontrado: "${fullAddress}" — status: ${result.status}`);
      return null;
    }

    const location = result.results[0].geometry.location;
    const formattedAddress = result.results[0].formatted_address;
    const { lat, lng } = location;

    // Link direto para o Google Maps (abre no app ou browser)
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

    // Link de navegação GPS (abre rota no Google Maps)
    const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    return {
      lat,
      lng,
      formattedAddress,
      googleMapsUrl,
      googleMapsDirectionsUrl,
    };
  } catch (error) {
    console.error("[Geocoding] Erro ao geocodificar endereço:", error);
    return null;
  }
}

/**
 * Gera a URL de mapa estático (imagem PNG) para um endereço geocodificado.
 * Útil para enviar preview de localização via WhatsApp.
 */
export function buildStaticMapUrl(lat: number, lng: number, zoom = 16): string {
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "") ?? "";
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY ?? "";
  const center = `${lat},${lng}`;
  const marker = `color:red|${lat},${lng}`;
  const size = "600x300";
  return `${baseUrl}/v1/maps/proxy/maps/api/staticmap?center=${encodeURIComponent(center)}&zoom=${zoom}&size=${size}&markers=${encodeURIComponent(marker)}&maptype=roadmap&key=${apiKey}`;
}
