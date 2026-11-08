import { useEffect, useState } from 'react';
import type { UpdateState } from '@shared/types';
import { AlertCircle, Download, Info, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

const errorMessages = {
  'release-unavailable': 'The latest release does not include update files for this platform yet. Try again after the release has finished publishing.',
  network: 'Could not connect to the update service. Check your internet connection and try again.',
  unknown: 'Could not complete the update. Please try again later.',
};

const disabledMessages = {
  development: 'Automatic updates are available in supported packaged desktop builds.',
  'appimage-required': 'Install the AppImage build to use automatic updates on Linux.',
  'unsigned-mac': 'This macOS build is ad-hoc signed, so macOS will not let it update itself. Install a build signed with the Ghost Runner certificate once to enable automatic updates. Your tasks and settings stay in your app data folder.',
};

export function UpdateButton() {
  const desktop = window.ghostRunnerDesktop;
  const [state, setState] = useState<UpdateState>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!desktop) return;
    let active = true;
    let receivedEvent = false;
    const unsubscribe = desktop.onUpdateState((next) => {
      receivedEvent = true;
      if (active) { setState(next); setError(undefined); }
    });
    void desktop.getUpdateState().then((next) => {
      if (active && !receivedEvent) setState(next);
    }).catch(() => { if (active) setError('Could not read update status.'); });
    return () => { active = false; unsubscribe(); };
  }, [desktop]);

  if (!desktop) return null;
  const busy = pending || (!state && !error) || Boolean(state && ['checking', 'available', 'downloading'].includes(state.status));
  const disabled = state?.status === 'disabled';
  const failed = Boolean(error) || state?.status === 'error';
  const manual = disabled && state.disabledReason === 'unsigned-mac';
  const explanation = disabled ? disabledMessages[state.disabledReason ?? 'development']
    : error ?? errorMessages[state?.errorCode ?? 'unknown'];
  const status = failed ? 'Updates unavailable'
    : disabled ? `Version ${state.currentVersion}`
    : state?.status === 'idle' && state.message ? 'You have the latest version.'
    : state ? `Version ${state.currentVersion}` : 'Loading update status…';
  const label = state?.status === 'downloaded' ? `Restart to update to ${state.version}`
    : state?.status === 'downloading' ? `Downloading update ${state.percent ?? 0}%`
    : state?.status === 'available' ? `Downloading ${state.version}`
    : state?.status === 'checking' ? 'Checking for updates…'
    : manual ? 'Manual updates' : disabled ? 'Updates unavailable' : failed ? 'Retry update check' : 'Check for updates';
  const Icon = busy ? Loader2 : failed ? AlertCircle : state?.status === 'downloaded' ? Download : RefreshCw;

  async function handleClick() {
    if (!desktop || busy) return;
    setPending(true);
    setError(undefined);
    try {
      if (state?.status === 'downloaded') await desktop.installUpdate();
      else setState(await desktop.checkForUpdates());
    } catch {
      setError('Could not update. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Button className="w-full justify-start" variant="ghost" size="sm" disabled={busy || disabled} onClick={() => void handleClick()}>
        <Icon aria-hidden="true" className={busy ? 'animate-spin' : state?.status === 'downloaded' ? 'text-primary' : undefined} />
        <span className="truncate">{label}</span>
      </Button>
      <div className="flex h-5 min-w-0 items-center gap-1 px-2.5 text-xs text-faint">
        <span role="status" className="truncate">{status}</span>
        {(failed || disabled) && (
          <Dialog>
            <DialogTrigger asChild>
              <button className="shrink-0 rounded p-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60" aria-label="Update status details">
                <Info aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{manual ? 'Manual updates' : 'Updates unavailable'}</DialogTitle>
                <DialogDescription className="break-words">{explanation}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
