/**
 * Latitude / longitude inputs.
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { GeolocationSettings } from '@/types';
import { cn } from '@/lib/utils';

export interface CoordinateInputsProps {
  geolocation: GeolocationSettings;
  onUpdate: (field: keyof GeolocationSettings, value: string | number) => void;
  className?: string;
}

export function CoordinateInputs({ geolocation, onUpdate, className }: CoordinateInputsProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <div className="space-y-1.5">
        <Label htmlFor="latitude">Latitude</Label>
        <Input
          id="latitude"
          type="number"
          step="any"
          value={geolocation.latitude}
          onChange={(e) => onUpdate('latitude', e.target.value)}
          className="font-mono text-xs tabular-nums"
          placeholder="-23.55052"
          aria-label="Latitude coordinate"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="longitude">Longitude</Label>
        <Input
          id="longitude"
          type="number"
          step="any"
          value={geolocation.longitude}
          onChange={(e) => onUpdate('longitude', e.target.value)}
          className="font-mono text-xs tabular-nums"
          placeholder="-46.633308"
          aria-label="Longitude coordinate"
        />
      </div>
    </div>
  );
}
