/**
 * Location settings: coordinates, browser-based detection, and a map.
 */

import { Button } from '@/components/ui/button';
import { Loader2, LocateFixed } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import { LocationMap } from '../components/LocationMap';
import { CoordinateInputs } from '../components/CoordinateInputs';
import { SettingsSection } from '../components/SettingsSection';
import type { GeolocationSettings, Settings } from '@/types';

export interface GeolocationSectionProps {
  geolocation: GeolocationSettings;
  onGeolocationChange: (geo: GeolocationSettings) => void;
  onSaveSettings: (settings: Settings) => Promise<boolean>;
  onSettingsSaved?: () => void;
  onLog?: (message: string, type: 'normal' | 'error' | 'system') => void;
}

export function GeolocationSection({
  geolocation,
  onGeolocationChange,
  onSaveSettings,
  onSettingsSaved,
  onLog,
}: GeolocationSectionProps) {
  const { isDetecting, isSaving, updateGeo, detectLocation } = useGeolocation({
    onSave: onSaveSettings,
    onSaved: onSettingsSaved,
    // Push the detected coordinates into the parent state so the inputs and
    // map recenter immediately; the hook's internal state is not rendered.
    onDetected: onGeolocationChange,
    onLog,
  });

  const handleUpdateGeo = (field: keyof GeolocationSettings, value: string | number) => {
    updateGeo(field, value);
    onGeolocationChange({
      ...geolocation,
      [field]: typeof value === 'string' ? parseFloat(value) : value,
    });
  };

  const busy = isDetecting || isSaving;

  return (
    <SettingsSection
      title="Location"
      description="The geolocation reported to websites while tasks run. Click the map to move the pin."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <CoordinateInputs geolocation={geolocation} onUpdate={handleUpdateGeo} className="flex-1" />
        <Button variant="outline" onClick={detectLocation} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <LocateFixed />}
          {isDetecting ? 'Detecting…' : isSaving ? 'Saving…' : 'Use current location'}
        </Button>
      </div>
      <LocationMap
        geolocation={geolocation}
        onLocationChange={(lat, lng) => onGeolocationChange({ latitude: lat, longitude: lng })}
      />
    </SettingsSection>
  );
}
