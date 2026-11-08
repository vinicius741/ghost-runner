/**
 * Tests for the GeolocationSection detect-location flow.
 *
 * Regression coverage: coordinates detected via "Use Current Location" must be
 * propagated through onGeolocationChange so the inputs and map update, instead
 * of being written to hook-internal state that nothing renders.
 *
 * @module components/dashboard/settings/sections/GeolocationSection.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeolocationSection } from './GeolocationSection';
import type { GeolocationSettings } from '@/types';

const DETECTED: GeolocationSettings = { latitude: -21.4324, longitude: -45.9341 };

function stubGeolocation() {
  const getCurrentPosition = vi.fn((success: PositionCallback) => {
    success({
      coords: { latitude: DETECTED.latitude, longitude: DETECTED.longitude },
    } as GeolocationPosition);
  });

  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });

  return getCurrentPosition;
}

describe('GeolocationSection', () => {
  const initialGeo: GeolocationSettings = { latitude: -23.55052, longitude: -46.633308 };

  const defaultProps = () => ({
    geolocation: { ...initialGeo },
    onGeolocationChange: vi.fn(),
    onSaveSettings: vi.fn().mockResolvedValue(true),
    onSettingsSaved: vi.fn(),
    onLog: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });
  });

  it('propagates detected coordinates to onGeolocationChange so the UI updates', async () => {
    stubGeolocation();
    const props = defaultProps();

    render(<GeolocationSection {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /use current location/i }));

    await waitFor(() => {
      expect(props.onGeolocationChange).toHaveBeenCalledWith(DETECTED);
    });
  });

  it('auto-saves the detected location and reports the save', async () => {
    stubGeolocation();
    const props = defaultProps();

    render(<GeolocationSection {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /use current location/i }));

    await waitFor(() => {
      expect(props.onSaveSettings).toHaveBeenCalledWith({ geolocation: DETECTED });
    });
    await waitFor(() => {
      expect(props.onSettingsSaved).toHaveBeenCalled();
    });
  });

  it('does not report a save when persisting fails', async () => {
    stubGeolocation();
    const props = defaultProps();
    props.onSaveSettings.mockResolvedValue(false);

    render(<GeolocationSection {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /use current location/i }));

    await waitFor(() => {
      expect(props.onSaveSettings).toHaveBeenCalled();
    });
    expect(props.onSettingsSaved).not.toHaveBeenCalled();
  });
});
