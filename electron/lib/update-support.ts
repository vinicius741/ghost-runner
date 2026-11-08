import { spawnSync } from 'node:child_process';
import type { UpdateState } from '../../shared/types/desktop';

/**
 * macOS (Squirrel.Mac) only installs an update whose signature satisfies the running app's
 * designated requirement. Ad-hoc signatures pin a single build's hash, so they can never be
 * updated in place; any certificate-based identity (Developer ID or the project's self-signed
 * certificate) pins the certificate instead, which every later build signed with it satisfies.
 */
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
      if (/^Signature=adhoc$/m.test(signature) || !/^Authority=\S/m.test(signature)) return 'unsigned-mac';
    } catch {
      return 'unsigned-mac';
    }
  }
  return undefined;
}
