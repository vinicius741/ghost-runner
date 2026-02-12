/**
 * Shared settings type definitions.
 *
 * These types are used across the backend (settings controller)
 * and frontend (settings manager).
 *
 * @module shared/types/settings
 */

/**
 * Geolocation coordinates.
 */
export interface GeolocationSettings {
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
}

/**
 * Application settings.
 */
export interface Settings {
  /** Geolocation configuration for browser context */
  geolocation: GeolocationSettings;
  /** Run browser in headless mode */
  headless?: boolean;
  /** Custom browser profile directory */
  profileDir?: string;
  /** Browser channel (e.g., 'chrome', 'msedge') */
  browserChannel?: string;
  /** Custom browser executable path */
  executablePath?: string;
}

/**
 * Default location (São Paulo, Brazil).
 * Used to detect if user hasn't customized their location.
 */
export const DEFAULT_LOCATION: GeolocationSettings = {
  latitude: -23.55052,
  longitude: -46.633308,
} as const;
