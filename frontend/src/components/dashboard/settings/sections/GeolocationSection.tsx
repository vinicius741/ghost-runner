/**
 * Geolocation Section Component for Settings Manager
 *
 * Manages geolocation settings with map and coordinate inputs.
 * Extracted from SettingsManager.tsx for reusability.
 *
 * Related: Development Execution Plan Task 2.3.2
 */

import { Button } from '@/components/ui/button';
import { Navigation } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { LocationMap } from '../components/LocationMap';
import { CoordinateInputs } from '../components/CoordinateInputs';
import type { GeolocationSettings, Settings } from '@/types';

export interface GeolocationSectionProps {
  /** Current geolocation settings */
  geolocation: GeolocationSettings;
  /** Callback when geolocation is updated */
  onGeolocationChange: (geo: GeolocationSettings) => void;
  /** Callback to save settings */
  onSaveSettings: (settings: Settings) => Promise<boolean>;
  /** Callback when settings are saved */
  onSettingsSaved?: () => void;
  /** Callback for logging messages */
  onLog?: (message: string, type: 'normal' | 'error' | 'system') => void;
}

/**
 * Geolocation settings section with interactive map and coordinate inputs.
 *
 * @example
 * <GeolocationSection
 *   geolocation={settings.geolocation}
 *   onGeolocationChange={(geo) => setSettings({ ...settings, geolocation: geo })}
 *   onSaveSettings={saveSettings}
 *   onSettingsSaved={handleSaved}
 * />
 */
export function GeolocationSection({
  geolocation,
  onGeolocationChange,
  onSaveSettings,
  onSettingsSaved,
  onLog,
}: GeolocationSectionProps) {
  const {
    isDetecting,
    isSaving,
    updateGeo,
    detectLocation,
  } = useGeolocation({
    onSave: onSaveSettings,
    onSaved: onSettingsSaved,
    onLog,
  });

  // Initialize with prop geolocation
  const handleUpdateGeo = (field: keyof GeolocationSettings, value: string | number) => {
    updateGeo(field, value);
    onGeolocationChange({
      ...geolocation,
      [field]: typeof value === 'string' ? parseFloat(value) : value,
    });
  };

  const handleLocationChange = (lat: number, lng: number) => {
    onGeolocationChange({ latitude: lat, longitude: lng });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
      <CoordinateInputs
        geolocation={geolocation}
        onUpdate={handleUpdateGeo}
      />

      {/* Detect current location button */}
      <div className="flex justify-center pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={detectLocation}
          disabled={isDetecting || isSaving}
          className="h-9 px-4 bg-blue-500/5 text-blue-400 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40 hover:text-blue-300 transition-all duration-300 gap-2"
        >
          <Navigation className={`w-3.5 h-3.5 ${isDetecting || isSaving ? 'animate-pulse' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {isDetecting ? 'Detecting...' : isSaving ? 'Saving...' : 'Use Current Location'}
          </span>
        </Button>
      </div>

      {/* Interactive map */}
      <div className="mt-2">
        <LocationMap
          geolocation={geolocation}
          onLocationChange={handleLocationChange}
          height="200px"
        />
      </div>
    </div>
  );
}
