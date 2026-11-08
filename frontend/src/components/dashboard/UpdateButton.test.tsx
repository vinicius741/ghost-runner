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
  await screen.findByText('Updates unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Update status details' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('Could not update. Please try again.');
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  emit({ status: 'error', currentVersion: '1.0.0', message: 'Download failed' });
  expect(screen.getByRole('status')).toHaveTextContent('Updates unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry update check' }));
  await screen.findByText('You have the latest version.');
});

it('disables unsupported desktop builds', async () => {
  bridge({ status: 'disabled', currentVersion: '1.0.0' });
  render(<UpdateButton />);
  expect(await screen.findByRole('button', { name: 'Updates unavailable' })).toBeDisabled();
});

it('explains manual macOS updates without offering a retry or hiding the installed version', async () => {
  const { desktop } = bridge({ status: 'disabled', currentVersion: '1.1.1', disabledReason: 'unsigned-mac' });
  render(<UpdateButton />);
  expect(await screen.findByRole('button', { name: 'Manual updates' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Version 1.1.1');
  fireEvent.click(screen.getByRole('button', { name: 'Update status details' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('signed with the Ghost Runner certificate');
  expect(desktop.checkForUpdates).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Retry update check' })).not.toBeInTheDocument();
});

it('keeps raw updater diagnostics out of the header and explains missing release files on demand', async () => {
  const diagnostics = 'Cannot find latest-mac.yml: HttpError: 404 Headers: ' + 'private diagnostics '.repeat(1000);
  const { emit } = bridge({ status: 'error', currentVersion: '1.0.0', errorCode: 'release-unavailable', message: diagnostics });
  render(<UpdateButton />);
  await screen.findByRole('button', { name: 'Retry update check' });
  expect(screen.getByRole('status')).toHaveTextContent(/^Updates unavailable$/);
  expect(document.body).not.toHaveTextContent('private diagnostics');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Update status details' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('does not include update files for this platform');
  expect(document.body).not.toHaveTextContent('HttpError');
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  emit({ status: 'idle', currentVersion: '1.0.0' });
  expect(screen.queryByRole('button', { name: 'Update status details' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Version 1.0.0');
});

it('blocks repeated checks while the desktop request is pending', async () => {
  const { desktop } = bridge({ status: 'idle', currentVersion: '1.0.0' });
  let finish!: (state: UpdateState) => void;
  vi.mocked(desktop.checkForUpdates).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  render(<UpdateButton />);
  const button = await screen.findByRole('button', { name: 'Check for updates' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button).toBeDisabled();
  expect(desktop.checkForUpdates).toHaveBeenCalledOnce();
  await act(async () => finish({ status: 'idle', currentVersion: '1.0.0' }));
  expect(button).toBeEnabled();
});
