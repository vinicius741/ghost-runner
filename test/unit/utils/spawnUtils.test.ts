/**
 * Unit tests for spawnUtils utilities.
 *
 * Tests ASAR path resolution for child process spawning.
 *
 * @module test/unit/utils/spawnUtils.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { resolveSpawnCwd } from '../../../src/server/utils/spawnUtils';

describe('spawnUtils', () => {
  describe('resolveSpawnCwd', () => {
    describe('development paths (non-ASAR)', () => {
      it('should return unchanged path for regular directories', () => {
        const testPath = '/Users/user/project';
        assert.strictEqual(resolveSpawnCwd(testPath), testPath);
      });

      it('should return unchanged path for nested directories', () => {
        const testPath = '/Users/user/project/subdirectory/nested';
        assert.strictEqual(resolveSpawnCwd(testPath), testPath);
      });

      it('should return unchanged path for paths with dots in directory names', () => {
        const testPath = '/Users/user/my.project/directory';
        assert.strictEqual(resolveSpawnCwd(testPath), testPath);
      });

      it('should return unchanged path for relative paths', () => {
        const testPath = './project/directory';
        assert.strictEqual(resolveSpawnCwd(testPath), testPath);
      });

      it('should return unchanged path for paths ending with regular files', () => {
        const testPath = '/Users/user/project/dist/index.js';
        assert.strictEqual(resolveSpawnCwd(testPath), testPath);
      });
    });

    describe('Electron ASAR paths', () => {
      it('should return parent directory for .asar paths', () => {
        const asarPath = '/Users/user/app.app/Contents/Resources/app.asar';
        const result = resolveSpawnCwd(asarPath);
        assert.strictEqual(result, '/Users/user/app.app/Contents/Resources');
      });

      it('should handle .asar paths with nested directories', () => {
        const asarPath = '/opt/electron/resources/app.asar';
        const result = resolveSpawnCwd(asarPath);
        assert.strictEqual(result, '/opt/electron/resources');
      });

      it('should handle ASAR paths with version numbers', () => {
        const asarPath = '/app/dist-electron/app-1.0.0.asar';
        const result = resolveSpawnCwd(asarPath);
        assert.strictEqual(result, '/app/dist-electron');
      });

      // Windows paths with backslashes behave differently on Unix
      // The path.dirname function on Unix doesn't recognize backslash as separator
      it('should handle Windows-style ASAR paths (forward slashes)', () => {
        const asarPath = 'C:/Users/user/app/resources/app.asar';
        const result = resolveSpawnCwd(asarPath);
        // path.dirname on Unix treats 'C:/Users/user/app/resources/app.asar' as a file
        // and returns the parent
        assert.strictEqual(result, 'C:/Users/user/app/resources');
      });
    });

    describe('edge cases', () => {
      it('should return empty string unchanged (no .asar suffix)', () => {
        // Empty string doesn't end with .asar, so it's returned as-is
        const result = resolveSpawnCwd('');
        assert.strictEqual(result, '');
      });

      it('should handle root path', () => {
        // On Unix systems, root path doesn't end with .asar
        const result = resolveSpawnCwd('/');
        assert.strictEqual(result, '/');
      });

      it('should handle path that is just .asar', () => {
        // This is an edge case that shouldn't happen in practice
        const result = resolveSpawnCwd('app.asar');
        assert.strictEqual(result, '.');
      });

      it('should not modify paths that end with .asar but are not .asar files', () => {
        // A directory named "something.asar" would be rare but possible
        const testPath = '/path/to/my.asar/subdirectory';
        assert.strictEqual(resolveSpawnCwd(testPath), testPath);
      });

      it('should be case-sensitive for .asar extension', () => {
        // .ASAR should not be treated as ASAR archive
        const asarUpperPath = '/path/to/app.ASAR';
        assert.strictEqual(resolveSpawnCwd(asarUpperPath), asarUpperPath);
      });

      it('should handle paths with .asar in the middle', () => {
        const testPath = '/path/to/app.asar.backup/file';
        assert.strictEqual(resolveSpawnCwd(testPath), testPath);
      });
    });

    describe('real-world scenarios', () => {
      it('should resolve macOS Electron app path', () => {
        const testPath = '/Applications/Ghost Runner.app/Contents/Resources/app.asar';
        const result = resolveSpawnCwd(testPath);
        assert.strictEqual(result, '/Applications/Ghost Runner.app/Contents/Resources');
      });

      it('should resolve Linux Electron app path', () => {
        const testPath = '/opt/ghost-runner/resources/app.asar';
        const result = resolveSpawnCwd(testPath);
        assert.strictEqual(result, '/opt/ghost-runner/resources');
      });

      it('should preserve development mode paths unchanged', () => {
        const devPath = '/Users/ilia/Documents/ghost-runner';
        assert.strictEqual(resolveSpawnCwd(devPath), devPath);
      });
    });
  });
});
