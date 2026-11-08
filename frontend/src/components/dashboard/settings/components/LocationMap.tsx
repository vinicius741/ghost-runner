/**
 * Click-to-place location map. Standard OSM tiles are darkened with a CSS
 * filter so the map sits naturally in the UI; the marker uses the accent.
 */

import { useEffect } from 'react';
import { useMap, MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import type { GeolocationSettings } from '@/types';

export interface LocationMapProps {
  geolocation: GeolocationSettings;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
}

function MapEvents({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: false });
  }, [lat, lng, map]);
  return null;
}

export function LocationMap({ geolocation, onLocationChange, height = '220px' }: LocationMapProps) {
  return (
    <div className="overflow-hidden rounded-md border border-border" style={{ height }}>
      <MapContainer
        center={[geolocation.latitude, geolocation.longitude]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="noir-map-tiles"
        />
        <CircleMarker
          center={[geolocation.latitude, geolocation.longitude]}
          radius={7}
          pathOptions={{ color: '#0b0a09', weight: 2, fillColor: '#d68a4c', fillOpacity: 1 }}
        />
        <RecenterMap lat={geolocation.latitude} lng={geolocation.longitude} />
        <MapEvents onChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
