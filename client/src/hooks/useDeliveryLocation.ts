import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

interface Location {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface RouteInfo {
  distance: number;
  duration: number;
  polyline: string;
}

export function useDeliveryLocation() {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const distanceTraveledRef = useRef(0);

  // Obter localização atual uma vez
  const getCurrentLocation = useCallback(async () => {
    setIsLoading(true);
    return new Promise<Location>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setCurrentLocation(location);
          setIsLoading(false);
          resolve(location);
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          toast.error('Erro ao obter sua localização');
          setIsLoading(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  // Iniciar rastreamento contínuo
  const startTracking = useCallback(() => {
    if (watchIdRef.current !== null) return;

    setIsTracking(true);
    distanceTraveledRef.current = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        // Calcular distância percorrida
        if (currentLocation) {
          const distance = calculateDistance(
            currentLocation.lat,
            currentLocation.lng,
            newLocation.lat,
            newLocation.lng
          );
          distanceTraveledRef.current += distance;
        }

        setCurrentLocation(newLocation);
      },
      (error) => {
        console.error('Erro no rastreamento:', error);
        toast.error('Erro ao rastrear localização');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, [currentLocation]);

  // Parar rastreamento
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Calcular distância entre dois pontos (Haversine)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calcular rota entre dois pontos
  const calculateRoute = useCallback(
    async (
      origin: { lat: number; lng: number },
      destination: { lat: number; lng: number }
    ): Promise<RouteInfo | null> => {
      try {
        const directionsService = new google.maps.DirectionsService();
        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(
            {
              origin,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                resolve(result);
              } else {
                reject(new Error('Directions request failed'));
              }
            }
          );
        });

        if (result.routes.length > 0) {
          const route = result.routes[0];
          const leg = route.legs[0];

          return {
            distance: leg.distance?.value || 0, // em metros
            duration: leg.duration?.value || 0, // em segundos
            polyline: route.overview_polyline,
          };
        }

        return null;
      } catch (error) {
        console.error('Erro ao calcular rota:', error);
        toast.error('Erro ao calcular rota');
        return null;
      }
    },
    []
  );

  // Obter distância até destino
  const getDistanceToDestination = useCallback(
    (destination: { lat: number; lng: number }): number | null => {
      if (!currentLocation) return null;
      return calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        destination.lat,
        destination.lng
      );
    },
    [currentLocation]
  );

  // Obter distância total percorrida
  const getDistanceTraveled = useCallback(() => {
    return distanceTraveledRef.current;
  }, []);

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    currentLocation,
    isTracking,
    isLoading,
    getCurrentLocation,
    startTracking,
    stopTracking,
    calculateRoute,
    getDistanceToDestination,
    getDistanceTraveled,
    calculateDistance,
  };
}
