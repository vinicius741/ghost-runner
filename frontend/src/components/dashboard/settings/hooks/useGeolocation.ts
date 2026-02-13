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

  const isElectronRuntime = (): boolean => {
    return navigator.userAgent.toLowerCase().includes('electron');
  };

  const detectApproximateLocation = async (): Promise<GeolocationSettings | null> => {
    try {
      const response = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { latitude?: unknown; longitude?: unknown };
      if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        return null;
      }

      return {
        latitude: data.latitude,
        longitude: data.longitude,
      };
    } catch {
      return null;
    }
  };

  /**
   * Get a user-friendly error message for geolocation errors.
   */
  const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please grant location access in System Preferences > Privacy & Security > Location Services.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable. Please check your network connection.';
      case error.TIMEOUT:
        return 'Location request timed out. This can happen in desktop apps. Try entering coordinates manually.';
      default:
        return error.message || 'Unknown location error';
    }
  };

  /**
   * Detect current location using browser geolocation API.
   * Automatically saves the detected location.
   * Uses a fallback strategy: tries high accuracy first, then low accuracy.
   */
  const detectLocation = useCallback(async (): Promise<void> => {
    if (!navigator.geolocation) {
      onLog?.('Geolocation is not supported by your browser', 'error');
      return;
    }

    setIsDetecting(true);

    const handleSuccess = async (position: GeolocationPosition) => {
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
    };

    const tryApproximateLocationFallback = async (
      error?: GeolocationPositionError
    ): Promise<boolean> => {
      if (!isElectronRuntime()) {
        return false;
      }

      const fallbackMessage =
        error?.code === error?.TIMEOUT
          ? 'Precise location timed out, trying approximate IP-based location...'
          : 'Browser location is unavailable, trying approximate IP-based location...';
      onLog?.(fallbackMessage, 'system');
      const approximate = await detectApproximateLocation();
      if (!approximate) {
        return false;
      }

      setGeolocation(approximate);
      setIsDetecting(false);
      onLog?.(
        'Using approximate location from IP. You can fine-tune coordinates manually if needed.',
        'system'
      );

      if (onSave) {
        setIsSaving(true);
        try {
          const success = await onSave({ geolocation: approximate });
          if (success) {
            onSaved?.();
          }
        } finally {
          setIsSaving(false);
        }
      }

      return true;
    };

    const handleError = (error: GeolocationPositionError, isFallback: boolean) => {
      console.error('Error getting location:', error);
      const errorMessage = getGeolocationErrorMessage(error);

      if (!isFallback && error.code === error.TIMEOUT) {
        // Try again with lower accuracy and longer timeout as fallback
        onLog?.('High accuracy location timed out, trying faster method...', 'system');
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (fallbackError) => {
            void (async () => {
              const usedApproximate = await tryApproximateLocationFallback(fallbackError);
              if (!usedApproximate) {
                onLog?.(getGeolocationErrorMessage(fallbackError), 'error');
                setIsDetecting(false);
              }
            })();
          },
          {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 60000, // Allow cached position up to 1 minute
          }
        );
      } else {
        void (async () => {
          const usedApproximate = await tryApproximateLocationFallback(error);
          if (!usedApproximate) {
            onLog?.(`Error getting location: ${errorMessage}`, 'error');
            setIsDetecting(false);
          }
        })();
      }
    };

    // First attempt with high accuracy
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (error) => handleError(error, false),
      {
        enableHighAccuracy: true,
        timeout: 15000,
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
