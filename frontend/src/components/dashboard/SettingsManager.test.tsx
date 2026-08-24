/**
 * Tests for SettingsManager component.
 *
 * The HTTP layer is mocked at the apiClient module level so these tests
 * exercise component behavior without coupling to axios adapter internals.
 *
 * @module components/dashboard/SettingsManager.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsManager } from './SettingsManager';
import { apiClient } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  setApiLogCallback: vi.fn(),
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

describe('SettingsManager', () => {
  const defaultProps = {
    onSettingsSaved: vi.fn(),
    onLog: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGet.mockResolvedValue({
      data: {
        settings: {
          geolocation: { latitude: -23.55052, longitude: -46.633308 },
          headless: false,
        }
      }
    } as any);
    mockPost.mockResolvedValue({ data: { message: 'Settings updated successfully.' } } as any);
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
      expect(mockGet).toHaveBeenCalledWith('/api/settings');
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
    render(<SettingsManager {...defaultProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });

    // Find and click save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/settings', expect.objectContaining({
        settings: expect.any(Object),
      }));
    });
    await waitFor(() => {
      expect(defaultProps.onSettingsSaved).toHaveBeenCalled();
    });
  });

  it('should display headless toggle', async () => {
    render(<SettingsManager {...defaultProps} />);

    // Wait for settings to load
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/settings');
    });

    // The headless toggle button has aria-label="Toggle headless mode"
    const headlessToggle = screen.getByRole('button', { name: /toggle headless/i });
    expect(headlessToggle).toBeInTheDocument();
  });

  it('should not call onSettingsSaved when save fails', async () => {
    mockPost.mockResolvedValue({ data: { error: 'Failed to save settings' } } as any);

    render(<SettingsManager {...defaultProps} />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
    // Give onSettingsSaved a chance to fire before asserting it did not
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(defaultProps.onSettingsSaved).not.toHaveBeenCalled();
  });
});
