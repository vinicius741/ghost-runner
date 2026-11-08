const { test } = require('node:test');
const assert = require('node:assert/strict');
require('tsx/cjs');
const { getUpdateDisabledReason } = require('../../electron/lib/update-support.ts');
const { createUpdateController } = require('../../electron/lib/update-controller.ts');
const { EventEmitter } = require('node:events');

test('only supported packaged builds enable updates', () => {
  const unexpected = () => assert.fail('must not inspect macOS signing here');
  assert.equal(getUpdateDisabledReason(false, 'darwin', undefined, unexpected), 'development');
  assert.equal(getUpdateDisabledReason(true, 'linux', undefined, unexpected), 'appimage-required');
  assert.equal(getUpdateDisabledReason(true, 'linux', '/tmp/app.AppImage', unexpected), undefined);
  assert.equal(getUpdateDisabledReason(true, 'win32', undefined, unexpected), undefined);
});

test('macOS requires a Developer ID identity and fails closed when signing cannot be read', () => {
  for (const signature of ['', 'Signature=adhoc\nTeamIdentifier=not set',
    'Authority=Apple Development: Example\nTeamIdentifier=ABC123',
    'Authority=Developer ID Application: Example\nTeamIdentifier=not set']) {
    assert.equal(getUpdateDisabledReason(true, 'darwin', undefined, () => signature), 'unsigned-mac');
  }
  assert.equal(getUpdateDisabledReason(true, 'darwin', undefined, () => { throw new Error('codesign failed'); }), 'unsigned-mac');
  assert.equal(getUpdateDisabledReason(true, 'darwin', undefined,
    () => 'Authority=Developer ID Application: Example (ABC123)\nTeamIdentifier=ABC123\n'), undefined);
});

test('manual macOS builds report the reason and never contact the update feed', async () => {
  const updater = new EventEmitter();
  updater.checkForUpdates = () => assert.fail('must not check');
  updater.quitAndInstall = () => assert.fail('must not install');
  const controller = createUpdateController(updater, '1.1.1', false, () => {}, async () => {}, 'unsigned-mac');
  assert.deepEqual(await controller.check(), {
    currentVersion: '1.1.1', status: 'disabled', disabledReason: 'unsigned-mac',
  });
  await controller.install();
});
