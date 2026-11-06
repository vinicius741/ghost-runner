import { useEffect, useState } from 'react';
import type { UpdateState } from '@shared/types';
import { Button } from '../ui/button';

export function UpdateButton() {
  const desktop = window.ghostRunnerDesktop;
  const [state, setState] = useState<UpdateState>();
  const [error, setError] = useState<string>();

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
  const busy = (!state && !error) || Boolean(state && ['checking', 'available', 'downloading'].includes(state.status));
  const disabled = state?.status === 'disabled';
  const label = state?.status === 'downloaded' ? `Restart to update to ${state.version}`
    : state?.status === 'downloading' ? `Downloading update ${state.percent ?? 0}%`
    : state?.status === 'available' ? `Downloading ${state.version}`
    : state?.status === 'checking' ? 'Checking for updates…'
    : disabled ? 'Updates unavailable' : 'Check for updates';

  async function handleClick() {
    if (!desktop) return;
    setError(undefined);
    try {
      if (state?.status === 'downloaded') await desktop.installUpdate();
      else setState(await desktop.checkForUpdates());
    } catch {
      setError('Could not update. Please try again.');
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 max-w-72">
      <Button variant="outline" size="sm" disabled={busy || disabled} onClick={() => void handleClick()}>
        {label}
      </Button>
      <span role="status" className="text-xs text-muted-foreground text-right">
        {error ?? state?.message ?? (disabled ? 'Use an installed desktop build. Linux requires AppImage.' : state && `Version ${state.currentVersion}`)}
      </span>
    </div>
  );
}
