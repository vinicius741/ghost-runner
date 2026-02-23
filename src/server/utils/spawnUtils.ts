/**
 * Spawn utility functions for child process management.
 *
 * @module server/utils/spawnUtils
 */

import path from 'path';

/**
 * Determines the correct working directory for spawning child processes.
 *
 * When running in Electron's packaged mode, code is bundled in ASAR archives
 * which are read-only and cannot be used as `cwd` for spawned processes.
 * This function detects ASAR paths and returns the parent directory instead.
 *
 * @param cwd - The candidate working directory path
 * @returns The resolved working directory suitable for spawning processes
 *
 * @example
 * ```typescript
 * // Development mode
 * resolveSpawnCwd('/Users/user/project') // returns '/Users/user/project'
 *
 * // Electron packaged mode
 * resolveSpawnCwd('/Users/user/app.app/Contents/Resources/app.asar')
 * // returns '/Users/user/app.app/Contents/Resources'
 * ```
 */
export function resolveSpawnCwd(cwd: string): string {
  return cwd.endsWith('.asar') ? path.dirname(cwd) : cwd;
}
