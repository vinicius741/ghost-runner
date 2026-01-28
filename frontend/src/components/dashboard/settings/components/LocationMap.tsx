/**
 * Location Map Component for Settings Manager
 *
 * Interactive map for selecting geolocation coordinates.
 * Extracted from SettingsManager.tsx for reusability.
 *
 * Related: Development Execution Plan Task 2.3.6
 */

import { useEffect } from 'react';
import { useMap, MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Globe } from 'lucide-react';
import L from 'leaflet';
import type { GeolocationSettings } from '@/types';

// Fix for default marker icon in leaflet
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export interface LocationMapProps {
  /** Current geolocation coordinates */
  geolocation: GeolocationSettings;
  /** Callback when location is changed */
  onLocationChange: (lat: number, lng: number) => void;
  /** Height of the map container */
  height?: string;
}

/**
 * Map events component that handles click events.
 */
function MapEvents({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Recenter map component that keeps the map centered on current coordinates.
 */
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

/**
 * Interactive map component for selecting coordinates.
 * Click anywhere on the map to update the location.
 *
 * @example
 * <LocationMap
 *   geolocation={{ latitude: -23.55052, longitude: -46.633308 }}
 *   onLocationChange={(lat, lng) => setGeolocation({ latitude: lat, longitude: lng })}
 * />
 */
export function LocationMap({
  geolocation,
  onLocationChange,
  height = '200px',
}: LocationMapProps) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group relative"
      style={{ height }}
    >
      {/* Background icon effect */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-300">
        <Globe className="w-12 h-12 text-blue-500" />
      </div>

      {/* Leaflet map */}
      <MapContainer
        center={[geolocation.latitude, geolocation.longitude]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[geolocation.latitude, geolocation.longitude]} />
        <RecenterMap
          lat={geolocation.latitude}
          lng={geolocation.longitude}
        />
        <MapEvents onChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
