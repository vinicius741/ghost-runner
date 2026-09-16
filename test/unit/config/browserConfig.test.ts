/**
 * Unit tests for browserConfig profile-lock remediation helpers.
 *
 * Covers detection of "profile already in use" launch errors, stale Chromium
 * lock file cleanup (including broken symlinks), and targeted termination of
 * leftover browser processes bound to the app's --user-data-dir.
 *
 * @module test/unit/config/browserConfig.test
 */

import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  isProfileInUseError,
  removeStaleLockFiles,
  terminateStaleBrowserProcesses,
} from '../../../src/config/browserConfig';

const spawned: ChildProcess[] = [];

/** Spawns a live node process whose command line advertises the given user-data-dir. */
function spawnFakeBrowserProcess(userDataDir: string): ChildProcess {
  const child = spawn(
    process.execPath,
    // The `--` separator keeps the marker out of node's own option parsing so
    // the child stays alive — exactly how Chrome carries --user-data-dir.
    ['-e', 'setInterval(() => {}, 1000);', '--', `--user-data-dir=${userDataDir}`],
    { stdio: 'ignore' }
  );
  spawned.push(child);
  return child;
}

function isAlive(pid: number | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

after(() => {
  for (const child of spawned) {
    if (isAlive(child.pid)) {
      child.kill('SIGKILL');
    }
  }
});

describe('isProfileInUseError', () => {
  it('matches the macOS "Opening in existing browser session" launch error', () => {
    const error = new Error(
      'browserType.launchPersistentContext: Opening in existing browser session. ' +
        'This usually means that the profile is already in use by another instance of Chromium.'
    );
    assert.equal(isProfileInUseError(error), true);
  });

  it('matches Linux "user data directory is already in use" variants', () => {
    assert.equal(isProfileInUseError(new Error('The user data directory is already in use')), true);
    assert.equal(isProfileInUseError(new Error('The profile appears to be in use by process 123')), true);
    assert.equal(isProfileInUseError(new Error('ProcessSingleton lock held')), true);
  });

  it('does not match unrelated launch errors', () => {
    assert.equal(isProfileInUseError(new Error('Target page, context or browser has been closed')), false);
    assert.equal(isProfileInUseError(new Error('net::ERR_CONNECTION_REFUSED at https://example.com')), false);
    assert.equal(isProfileInUseError(new Error('locator.waitFor: Timeout 30000ms exceeded')), false);
  });
});

describe('removeStaleLockFiles', () => {
  it('removes regular and broken-symlink lock files, keeps profile data', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghostrunner-base-'));
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghostrunner-profile-'));

    try {
      fs.writeFileSync(path.join(profileDir, 'lockfile'), 'stale');
      fs.writeFileSync(path.join(profileDir, 'Preferences'), '{}');
      // Stale singleton locks after a crash are broken symlinks — existsSync misses them.
      fs.symlinkSync('/nonexistent/host-pid', path.join(profileDir, 'SingletonLock'));
      fs.symlinkSync('/nonexistent/socket', path.join(profileDir, 'SingletonSocket'));
      fs.symlinkSync('/nonexistent/cookie', path.join(baseDir, 'SingletonLock'));

      removeStaleLockFiles(profileDir, baseDir);

      for (const name of ['lockfile', 'SingletonLock', 'SingletonSocket']) {
        assert.equal(fs.existsSync(path.join(profileDir, name)), false, `${name} should be removed`);
      }
      assert.equal(fs.existsSync(path.join(baseDir, 'SingletonLock')), false);
      assert.equal(fs.existsSync(path.join(profileDir, 'Preferences')), true, 'profile data must survive');
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
  });

  it('is a no-op when no lock files exist', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghostrunner-base-'));
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghostrunner-profile-'));

    try {
      assert.doesNotThrow(() => removeStaleLockFiles(profileDir, baseDir));
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
  });
});

describe('terminateStaleBrowserProcesses', () => {
  it('returns 0 when no process holds the profile', async () => {
    const untouchedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghostrunner-free-'));
    try {
      const terminated = await terminateStaleBrowserProcesses(untouchedDir);
      assert.equal(terminated, 0);
    } finally {
      fs.rmSync(untouchedDir, { recursive: true, force: true });
    }
  });

  it('terminates processes bound to the profile and leaves others alone', async () => {
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghostrunner-held-'));
    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghostrunner-other-'));

    try {
      const stale = spawnFakeBrowserProcess(profileDir);
      const bystander = spawnFakeBrowserProcess(otherDir);
      // Give both processes a moment to appear in the process table.
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.equal(isAlive(stale.pid), true);
      assert.equal(isAlive(bystander.pid), true);

      const terminated = await terminateStaleBrowserProcesses(profileDir);

      assert.equal(terminated, 1);
      assert.equal(isAlive(stale.pid), false, 'stale profile process should be terminated');
      assert.equal(isAlive(bystander.pid), true, 'process bound to another profile must not be touched');
    } finally {
      fs.rmSync(profileDir, { recursive: true, force: true });
      fs.rmSync(otherDir, { recursive: true, force: true });
    }
  });
});
