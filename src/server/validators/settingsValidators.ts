/**
 * Zod validation schemas for settings-related API endpoints.
 *
 * @module server/validators/settingsValidators
 */

import { z } from 'zod';
import { DEFAULT_LOCATION } from '../../../shared/types';

/**
 * Geolocation coordinates schema.
 */
export const geolocationSchema = z.object({
  latitude: z
    .number()
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90'),
  longitude: z
    .number()
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180'),
});

/**
 * Settings schema for the application.
 */
export const settingsSchema = z.object({
  geolocation: geolocationSchema,
  headless: z.boolean().optional(),
  profileDir: z.string().max(500).optional(),
  browserChannel: z.string().max(100).optional(),
  executablePath: z.string().max(1000).optional(),
}).passthrough(); // Allow additional fields for future extensibility

/**
 * Request body schema for PUT /api/settings
 */
export const saveSettingsSchema = z.object({
  settings: settingsSchema,
});

/**
 * Validates that geolocation is not using default values.
 * Useful for warning users they should set their actual location.
 */
export function isDefaultGeolocation(latitude: number, longitude: number): boolean {
  return (
    latitude === DEFAULT_LOCATION.latitude &&
    longitude === DEFAULT_LOCATION.longitude
  );
}

/**
 * Type exports for inferred types
 */
export type SettingsInput = z.infer<typeof settingsSchema>;
export type SaveSettingsInput = z.infer<typeof saveSettingsSchema>;
