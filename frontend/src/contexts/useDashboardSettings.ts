import { useState, useCallback, useEffect } from 'react';
import type { Settings } from '@shared/types';
import { DEFAULT_LOCATION } from '@shared/types';
import { apiClient } from '@/lib/apiClient';

/**
 * Hook to load global settings and derive the default-location warning.
 */
export function useDashboardSettings() {
  const [locationWarningDismissed, setLocationWarningDismissed] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/settings');
      if (res.data.settings && res.data.settings.geolocation) {
        setSettings(res.data.settings);
      }
    } catch {
      // apiClient response interceptor already handles UI and console logging
    }
  }, []);

  const dismissLocationWarning = useCallback(() => {
    setLocationWarningDismissed(true);
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const isUsingDefaultLocation = Boolean(
    settings?.geolocation &&
    settings.geolocation.latitude === DEFAULT_LOCATION.latitude &&
    settings.geolocation.longitude === DEFAULT_LOCATION.longitude
  );

  return {
    settings,
    showLocationWarning: isUsingDefaultLocation && !locationWarningDismissed,
    fetchSettings,
    dismissLocationWarning,
  };
}
