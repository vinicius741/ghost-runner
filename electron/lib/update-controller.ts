import type { AppUpdater } from 'electron-updater';
import type { UpdateState } from '../../shared/types/desktop';

/** Keeps update downloads and UI state in sync, including background failures. */
export function createUpdateController(
  updater: Pick<AppUpdater, 'on' | 'checkForUpdates' | 'quitAndInstall' | 'autoDownload' | 'autoInstallOnAppQuit' | 'allowPrerelease'>,
  currentVersion: string,
  enabled: boolean,
  publish: (state: UpdateState) => void,
  prepareToInstall: () => Promise<void>,
) {
  let state: UpdateState = { currentVersion, status: enabled ? 'idle' : 'disabled' };
  let checking = false;
  let installing = false;
  const update = (next: Omit<UpdateState, 'currentVersion'>) => {
    state = { currentVersion, ...next };
    publish({ ...state });
  };
  const fail = (error: Error & { code?: string }) => {
    // Keep HTTP headers, local paths and stack traces in desktop logs only.
    console.error('[updater]', error);
    const errorCode = [
      'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND', 'ERR_UPDATER_LATEST_VERSION_NOT_FOUND',
      'ERR_UPDATER_NO_PUBLISHED_VERSIONS',
    ].includes(error.code ?? '') || /Cannot find latest[^\s]*\.yml/i.test(error.message)
      ? 'release-unavailable'
      : /ENOTFOUND|ECONN|ETIMEDOUT|ERR_(INTERNET_DISCONNECTED|NETWORK|CONNECTION|NAME_NOT_RESOLVED)|offline/i.test(`${error.code} ${error.message}`)
        ? 'network' : 'unknown';
    update({ status: 'error', errorCode });
  };

  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.allowPrerelease = false;
  updater.on('checking-for-update', () => update({ status: 'checking' }));
  updater.on('update-available', (info) => update({ status: 'available', version: info.version }));
  updater.on('update-not-available', () => update({ status: 'idle', message: 'You have the latest version.' }));
  updater.on('download-progress', (progress) => update({
    status: 'downloading', version: state.version, percent: Math.round(progress.percent),
  }));
  updater.on('update-downloaded', (info) => update({ status: 'downloaded', version: info.version }));
  updater.on('error', fail);

  return {
    getState: () => ({ ...state }),
    async check() {
      if (!enabled || checking || ['available', 'downloading', 'downloaded'].includes(state.status)) return { ...state };
      checking = true;
      try {
        await updater.checkForUpdates();
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      } finally {
        checking = false;
      }
      return { ...state };
    },
    async install() {
      if (!enabled || state.status !== 'downloaded' || installing) return;
      installing = true;
      try {
        await prepareToInstall();
        updater.quitAndInstall(false, true);
      } catch (error) {
        installing = false;
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
