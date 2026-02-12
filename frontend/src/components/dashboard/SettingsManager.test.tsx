/**
 * Tests for SettingsManager component.
 *
 * @module components/dashboard/SettingsManager.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsManager } from './SettingsManager';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SettingsManager', () => {
  const defaultProps = {
    onSettingsSaved: vi.fn(),
    onLog: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Mock successful settings fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        settings: {
          geolocation: { latitude: -23.55052, longitude: -46.633308 },
          headless: false,
        }
      })
    });
  });

  it('should render settings form', async () => {
    render(<SettingsManager {...defaultProps} />);

    // Should show geolocation inputs
    expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/longitude/i)).toBeInTheDocument();
  });

  it('should load existing settings on mount', async () => {
    render(<SettingsManager {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings');
    });
  });

  it('should update latitude value on input change', async () => {
    render(<SettingsManager {...defaultProps} />);

    const latitudeInput = screen.getByLabelText(/latitude/i);
    fireEvent.change(latitudeInput, { target: { value: '-30.0' } });

    expect(latitudeInput).toHaveValue(-30);
  });

  it('should update longitude value on input change', async () => {
    render(<SettingsManager {...defaultProps} />);

    const longitudeInput = screen.getByLabelText(/longitude/i);
    fireEvent.change(longitudeInput, { target: { value: '-50.0' } });

    expect(longitudeInput).toHaveValue(-50);
  });

  it('should call onSettingsSaved after successful save', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ settings: {} })
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Settings updated successfully.' })
    });

    render(<SettingsManager {...defaultProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Find and click save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(defaultProps.onSettingsSaved).toHaveBeenCalled();
    });
  });

  it('should display headless toggle', async () => {
    render(<SettingsManager {...defaultProps} />);

    // Wait for settings to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/settings');
    });

    // The headless toggle button has aria-label="Toggle headless mode"
    const headlessToggle = screen.getByRole('button', { name: /toggle headless/i });
    expect(headlessToggle).toBeInTheDocument();
  });

  it('should call onLog with error when save fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ settings: {} })
    }).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to save settings' })
    });

    render(<SettingsManager {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(defaultProps.onLog).toHaveBeenCalledWith(
        expect.stringContaining('Failed'),
        'error'
      );
    });
  });
});
