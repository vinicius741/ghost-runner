/**
 * Coordinate Inputs Component for Settings Manager
 *
 * Form inputs for latitude and longitude coordinates.
 * Extracted from SettingsManager.tsx for reusability.
 *
 * Related: Development Execution Plan Task 2.3.7
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { GeolocationSettings } from '@/types';

export interface CoordinateInputsProps {
  /** Current geolocation coordinates */
  geolocation: GeolocationSettings;
  /** Callback when coordinate is updated */
  onUpdate: (field: keyof GeolocationSettings, value: string | number) => void;
  /** Additional CSS class for the container */
  className?: string;
}

/**
 * Coordinate input form fields for latitude and longitude.
 * Includes validation and number-specific input handling.
 *
 * @example
 * <CoordinateInputs
 *   geolocation={{ latitude: -23.55052, longitude: -46.633308 }}
 *   onUpdate={(field, value) => updateGeo(field, value)}
 * />
 */
export function CoordinateInputs({
  geolocation,
  onUpdate,
  className = '',
}: CoordinateInputsProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {/* Latitude input */}
      <div className="space-y-1.5">
        <Label
          htmlFor="latitude"
          className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1"
        >
          Latitude
        </Label>
        <Input
          id="latitude"
          type="number"
          step="any"
          value={geolocation.latitude}
          onChange={(e) => onUpdate('latitude', e.target.value)}
          className="h-10 bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all font-mono text-sm"
          placeholder="-23.55052"
          aria-label="Latitude coordinate"
        />
      </div>

      {/* Longitude input */}
      <div className="space-y-1.5">
        <Label
          htmlFor="longitude"
          className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1"
        >
          Longitude
        </Label>
        <Input
          id="longitude"
          type="number"
          step="any"
          value={geolocation.longitude}
          onChange={(e) => onUpdate('longitude', e.target.value)}
          className="h-10 bg-slate-900 border-slate-800 text-slate-200 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all font-mono text-sm"
          placeholder="-46.633308"
          aria-label="Longitude coordinate"
        />
      </div>
    </div>
  );
}
