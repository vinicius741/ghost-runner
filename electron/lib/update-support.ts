import { spawnSync } from 'node:child_process';
import type { UpdateState } from '../../shared/types/desktop';

/** Ad-hoc macOS builds must be replaced manually before signed updates can work. */
export function getUpdateDisabledReason(
  packaged: boolean,
  platform: string,
  appImage: string | undefined,
  readSignature = () => spawnSync('/usr/bin/codesign', ['-dv', '--verbose=2', process.execPath], {
    encoding: 'utf8', timeout: 5000,
  }).stderr ?? '',
): UpdateState['disabledReason'] {
  if (!packaged) return 'development';
  if (platform === 'linux' && !appImage) return 'appimage-required';
  if (platform === 'darwin') {
    try {
      const signature = readSignature();
      if (!/^Authority=Developer ID Application:/m.test(signature) ||
          !/^TeamIdentifier=(?!not set$)\S+$/m.test(signature)) return 'unsigned-mac';
    } catch {
      return 'unsigned-mac';
    }
  }
  return undefined;
}
