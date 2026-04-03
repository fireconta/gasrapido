import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, X, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface DeliveryLocation {
  address: string;
  lat: number;
  lng: number;
  neighborhood?: string;
  city?: string;
}

interface DeliveryMapProps {
  onLocationSelect?: (location: DeliveryLocation) => void;
  initialLocation?: DeliveryLocation;
  showSearch?: boolean;
  height?: string;
}

export const DeliveryMap: React.FC<DeliveryMapProps> = ({
  onLocationSelect,
  initialLocation,
  showSearch = true,
  height = 'h-96',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<DeliveryLocation | null>(
    initialLocation || null
  );

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const defaultLocation = initialLocation || {
      address: 'Quirinópolis, GO',
      lat: -18.5,
      lng: -50.4,
    };

    const map = new google.maps.Map(mapRef.current, {
      zoom: 15,
      center: { lat: defaultLocation.lat, lng: defaultLocation.lng },
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: true,
    });

    mapInstanceRef.current = map;
    geocoderRef.current = new google.maps.Geocoder();
    placesServiceRef.current = new google.maps.places.PlacesService(map);

    // Adicionar marcador inicial
    if (initialLocation) {
      addMarker(initialLocation.lat, initialLocation.lng, initialLocation.address);
    }

    // Listener para clique no mapa
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        geocodeLocation(lat, lng);
      }
    });
  }, []);

  // Adicionar marcador no mapa
  const addMarker = (lat: number, lng: number, title: string) => {
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      title,
      animation: google.maps.Animation.DROP,
    });

    markerRef.current = marker;

    // Centralizar mapa no marcador
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(16);
    }
  };

  // Geocodificar coordenadas para endereço
  const geocodeLocation = async (lat: number, lng: number) => {
    if (!geocoderRef.current) return;

    setIsLoading(true);
    try {
      const result = await new Promise<google.maps.GeocoderResult[]>(
        (resolve, reject) => {
          geocoderRef.current!.geocode(
            { location: { lat, lng } },
            (results, status) => {
              if (status === google.maps.GeocoderStatus.OK && results) {
                resolve(results);
              } else {
                reject(new Error('Geocoding failed'));
              }
            }
          );
        }
      );

      if (result.length > 0) {
        const address = result[0].formatted_address;
        const components = result[0].address_components;

        let neighborhood = '';
        let city = '';

        components.forEach((component) => {
          if (component.types.includes('administrative_area_level_2')) {
            city = component.long_name;
          }
          if (component.types.includes('administrative_area_level_3')) {
            neighborhood = component.long_name;
          }
        });

        const location: DeliveryLocation = {
          address,
          lat,
          lng,
          neighborhood,
          city,
        };

        setCurrentLocation(location);
        addMarker(lat, lng, address);
        onLocationSelect?.(location);
        toast.success('Localização atualizada!');
      }
    } catch (error) {
      console.error('Erro ao geocodificar:', error);
      toast.error('Erro ao obter endereço');
    } finally {
      setIsLoading(false);
    }
  };

  // Pesquisar endereço
  const handleSearch = async (query: string) => {
    if (!query.trim() || !placesServiceRef.current) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const service = new google.maps.places.AutocompleteService();
      const result = await service.getPlacePredictions({
        input: query,
        componentRestrictions: { country: 'br' },
      });

      setSuggestions(result.predictions || []);
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Selecionar sugestão
  const handleSelectSuggestion = async (placeId: string, description: string) => {
    setSearchInput(description);
    setSuggestions([]);
    setIsLoading(true);

    try {
      const service = new google.maps.places.PlacesService(mapInstanceRef.current!);
      const result = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        service.getDetails(
          {
            placeId,
            fields: ['formatted_address', 'geometry', 'address_components'],
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              resolve(place);
            } else {
              reject(new Error('Place details failed'));
            }
          }
        );
      });

      if (result.geometry?.location) {
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();
        const address = result.formatted_address || description;

        let neighborhood = '';
        let city = '';

        result.address_components?.forEach((component) => {
          if (component.types.includes('administrative_area_level_2')) {
            city = component.long_name;
          }
          if (component.types.includes('administrative_area_level_3')) {
            neighborhood = component.long_name;
          }
        });

        const location: DeliveryLocation = {
          address,
          lat,
          lng,
          neighborhood,
          city,
        };

        setCurrentLocation(location);
        addMarker(lat, lng, address);
        onLocationSelect?.(location);
        toast.success('Endereço encontrado!');
      }
    } catch (error) {
      console.error('Erro ao obter detalhes do local:', error);
      toast.error('Erro ao obter detalhes do endereço');
    } finally {
      setIsLoading(false);
    }
  };

  // Obter localização atual do usuário
  const handleGetCurrentLocation = () => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        geocodeLocation(latitude, longitude);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        toast.error('Erro ao obter sua localização');
        setIsLoading(false);
      }
    );
  };

  return (
    <div className="space-y-3">
      {/* Barra de Pesquisa */}
      {showSearch && (
        <div className="space-y-2">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Pesquisar endereço..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                handleSearch(e.target.value);
              }}
              className="pl-9 pr-9"
            />
            {isLoading && (
              <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
            )}
            {searchInput && !isLoading && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSuggestions([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sugestões */}
          {suggestions.length > 0 && (
            <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg max-h-64 overflow-y-auto">
              <div className="divide-y">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    onClick={() =>
                      handleSelectSuggestion(suggestion.place_id, suggestion.description)
                    }
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors text-sm"
                  >
                    <div className="font-medium text-foreground">{suggestion.main_text}</div>
                    <div className="text-xs text-muted-foreground">{suggestion.secondary_text}</div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Botão de Localização Atual */}
          <Button
            onClick={handleGetCurrentLocation}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="w-full gap-2"
          >
            <Navigation className="w-4 h-4" />
            {isLoading ? 'Localizando...' : 'Minha Localização'}
          </Button>
        </div>
      )}

      {/* Mapa */}
      <div
        ref={mapRef}
        className={`${height} rounded-xl border border-border shadow-sm bg-muted`}
      />

      {/* Informações do Local */}
      {currentLocation && (
        <Card className="p-3 bg-muted/50 border-primary/30">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground break-words">
                  {currentLocation.address}
                </p>
                {currentLocation.neighborhood && (
                  <p className="text-xs text-muted-foreground">
                    {currentLocation.neighborhood}
                    {currentLocation.city && `, ${currentLocation.city}`}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
