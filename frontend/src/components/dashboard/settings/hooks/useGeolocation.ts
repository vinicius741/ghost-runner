/**
 * Geolocation Hook for Settings Manager
 *
 * Manages geolocation detection and state for the settings panel.
 * Extracted from SettingsManager.tsx for reusability.
 *
 * Related: Development Execution Plan Task 2.3.8
 */

import { useState, useCallback } from 'react';
import type { GeolocationSettings, Settings } from '@/types';
import { DEFAULT_LOCATION } from '@/types';

export interface UseGeolocationResult {
  /** Current geolocation settings */
  geolocation: GeolocationSettings;
  /** Whether currently detecting location */
  isDetecting: boolean;
  /** Whether currently saving location */
  isSaving: boolean;
  /** Update geolocation field */
  updateGeo: (field: keyof GeolocationSettings, value: string | number) => void;
  /** Set geolocation settings directly */
  setGeolocation: (geo: GeolocationSettings) => void;
  /** Detect current location using browser geolocation API */
  detectLocation: () => Promise<void>;
  /** Set detecting state */
  setIsDetecting: (detecting: boolean) => void;
  /** Set saving state */
  setIsSaving: (saving: boolean) => void;
}

export interface UseGeolocationOptions {
  /** Callback when settings need to be saved */
  onSave?: (settings: Settings) => Promise<boolean>;
  /** Callback when save completes successfully */
  onSaved?: () => void;
  /** Callback for logging */
  onLog?: (message: string, type: 'normal' | 'error' | 'system') => void;
}

/**
 * Hook for managing geolocation settings and detection.
 *
 * @param options - Configuration options
 * @returns Geolocation state and methods
 *
 * @example
 * const {
 *   geolocation,
 *   isDetecting,
 *   updateGeo,
 *   detectLocation
 * } = useGeolocation({
 *   onSave: saveSettings,
 *   onSaved: handleSettingsSaved,
 *   onLog: logMessage
 * });
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationResult {
  const { onSave, onSaved, onLog } = options;

  const [geolocation, setGeolocationState] = useState<GeolocationSettings>({ ...DEFAULT_LOCATION });
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Update a single geolocation field with validation.
   */
  const updateGeo = useCallback((field: keyof GeolocationSettings, value: string | number): void => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    setGeolocationState((prev) => ({
      ...prev,
      [field]: isNaN(numValue) ? 0 : numValue,
    }));
  }, []);

  /**
   * Set geolocation settings directly.
   */
  const setGeolocation = useCallback((geo: GeolocationSettings): void => {
    setGeolocationState(geo);
  }, []);

  /**
   * Detect current location using browser geolocation API.
   * Automatically saves the detected location.
   */
  const detectLocation = useCallback(async (): Promise<void> => {
    if (!navigator.geolocation) {
      onLog?.('Geolocation is not supported by your browser', 'error');
      return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newGeo: GeolocationSettings = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setGeolocation(newGeo);
        setIsDetecting(false);

        // Automatically save the detected location
        if (onSave) {
          setIsSaving(true);
          try {
            const success = await onSave({ geolocation: newGeo });
            if (success) {
              onSaved?.();
            }
          } finally {
            setIsSaving(false);
          }
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        const errorMessage = error.message || 'Unknown error';
        onLog?.(`Error getting location: ${errorMessage}`, 'error');
        setIsDetecting(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, [onSave, onSaved, onLog]);

  return {
    geolocation,
    isDetecting,
    isSaving,
    updateGeo,
    setGeolocation,
    detectLocation,
    setIsDetecting,
    setIsSaving,
  };
}
