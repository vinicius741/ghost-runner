import { afterEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DesktopBridge, UpdateState } from '@shared/types';
import { UpdateButton } from './UpdateButton';

afterEach(() => { delete window.ghostRunnerDesktop; });

function bridge(initial: UpdateState) {
  let listener: (state: UpdateState) => void = () => {};
  const unsubscribe = vi.fn();
  const desktop: DesktopBridge = {
    isElectron: true,
    getUpdateState: vi.fn().mockResolvedValue(initial),
    checkForUpdates: vi.fn().mockResolvedValue({ ...initial, message: 'You have the latest version.' }),
    installUpdate: vi.fn().mockResolvedValue(undefined),
    onUpdateState: (callback) => { listener = callback; return unsubscribe; },
  };
  window.ghostRunnerDesktop = desktop;
  return { desktop, unsubscribe, emit: (next: UpdateState) => act(() => listener(next)) };
}

it('hides desktop controls in the web dashboard', () => {
  render(<UpdateButton />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('checks on demand, displays download progress, and installs only on click', async () => {
  const { desktop, emit, unsubscribe } = bridge({ status: 'idle', currentVersion: '1.0.0' });
  const { unmount } = render(<UpdateButton />);
  const check = await screen.findByRole('button', { name: 'Check for updates' });
  await waitFor(() => expect(check).toBeEnabled());
  fireEvent.click(check);
  await screen.findByText('You have the latest version.');
  expect(desktop.checkForUpdates).toHaveBeenCalledOnce();
  emit({ status: 'downloading', currentVersion: '1.0.0', version: '1.1.0', percent: 63 });
  expect(screen.getByRole('button', { name: 'Downloading update 63%' })).toBeDisabled();
  emit({ status: 'downloaded', currentVersion: '1.0.0', version: '1.1.0' });
  expect(desktop.installUpdate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Restart to update to 1.1.0' }));
  await waitFor(() => expect(desktop.installUpdate).toHaveBeenCalledOnce());
  unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it('shows errors and lets users retry', async () => {
  const { desktop, emit } = bridge({ status: 'idle', currentVersion: '1.0.0' });
  vi.mocked(desktop.checkForUpdates).mockRejectedValueOnce(new Error('IPC failed'));
  render(<UpdateButton />);
  await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
  fireEvent.click(screen.getByRole('button'));
  await screen.findByText('Could not update. Please try again.');
  emit({ status: 'error', currentVersion: '1.0.0', message: 'Download failed' });
  expect(screen.getByRole('status')).toHaveTextContent('Download failed');
  fireEvent.click(screen.getByRole('button'));
  await screen.findByText('You have the latest version.');
});

it('disables unsupported desktop builds', async () => {
  bridge({ status: 'disabled', currentVersion: '1.0.0' });
  render(<UpdateButton />);
  expect(await screen.findByRole('button', { name: 'Updates unavailable' })).toBeDisabled();
});
