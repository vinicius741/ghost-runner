const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
require('tsx/cjs');
const { createUpdateController } = require('../../electron/lib/update-controller.ts');

function setup(enabled = true) {
  const updater = new EventEmitter();
  let checks = 0;
  let installed = 0;
  let prepared = false;
  updater.checkForUpdates = async () => { checks++; };
  updater.quitAndInstall = (silent, restart) => {
    assert.equal(prepared, true, 'backend must stop before installation');
    assert.equal(silent, false);
    assert.equal(restart, true);
    installed++;
  };
  const published = [];
  const controller = createUpdateController(updater, '1.0.0', enabled,
    (state) => published.push(state), async () => { prepared = true; });
  return { updater, controller, published, checks: () => checks, installed: () => installed };
}

test('downloads updates automatically and only installs after download and backend shutdown', async () => {
  const { updater, controller, published, checks, installed } = setup();
  assert.equal(updater.autoDownload, true);
  assert.equal(updater.autoInstallOnAppQuit, true);
  assert.equal(updater.allowPrerelease, false);
  await controller.install();
  assert.equal(installed(), 0);
  updater.emit('checking-for-update');
  assert.equal(controller.getState().status, 'checking');
  updater.emit('update-available', { version: '1.1.0' });
  await controller.check();
  assert.equal(checks(), 0);
  updater.emit('download-progress', { percent: 42.4 });
  assert.deepEqual(controller.getState(), {
    currentVersion: '1.0.0', status: 'downloading', version: '1.1.0', percent: 42,
  });
  updater.emit('update-downloaded', { version: '1.1.0' });
  await controller.check();
  await Promise.all([controller.install(), controller.install()]);
  assert.equal(checks(), 0);
  assert.equal(installed(), 1);
  assert.equal(published.at(-1).status, 'downloaded');
});

test('disabled builds never check or install', async () => {
  const { controller, checks, installed } = setup(false);
  await controller.check();
  await controller.install();
  assert.equal(controller.getState().status, 'disabled');
  assert.equal(checks(), 0);
  assert.equal(installed(), 0);
});

test('coalesces concurrent checks and reports no update', async () => {
  const { updater, controller } = setup();
  let finish;
  let checks = 0;
  updater.checkForUpdates = () => {
    checks++;
    updater.emit('checking-for-update');
    return new Promise((resolve) => { finish = resolve; });
  };
  const first = controller.check();
  await controller.check();
  assert.equal(checks, 1);
  updater.emit('update-not-available');
  finish();
  await first;
  assert.equal(controller.getState().status, 'idle');
  assert.match(controller.getState().message, /latest version/);
  const snapshot = controller.getState();
  snapshot.status = 'error';
  assert.equal(controller.getState().status, 'idle');
});

test('network and download errors reach the UI and allow retry', async () => {
  const { updater, controller } = setup();
  updater.checkForUpdates = async () => { throw new Error('Offline'); };
  assert.equal((await controller.check()).errorCode, 'network');
  updater.checkForUpdates = async () => { updater.emit('update-not-available'); };
  assert.equal((await controller.check()).status, 'idle');
  updater.emit('update-available', { version: '1.1.0' });
  updater.emit('error', new Error('Download failed'));
  assert.equal(controller.getState().status, 'error');
  assert.equal(controller.getState().errorCode, 'unknown');
  assert.equal((await controller.check()).status, 'idle');
});

test('reports a failed shutdown without installing', async () => {
  const updater = new EventEmitter();
  updater.quitAndInstall = () => assert.fail('must not install');
  const controller = createUpdateController(updater, '1.0.0', true, () => {}, async () => {
    throw new Error('Shutdown failed');
  });
  updater.emit('update-downloaded', { version: '1.1.0' });
  await controller.install();
  assert.equal(controller.getState().errorCode, 'unknown');
});

test('missing release metadata sends a safe error code without HTTP diagnostics', async () => {
  const { updater, controller, published } = setup();
  const error = Object.assign(new Error('Cannot find latest-mac.yml in the latest release artifacts: HttpError: 404\nHeaders: sensitive\n at /Applications/Ghost Runner.app'), {
    code: 'ERR_UPDATER_CHANNEL_FILE_NOT_FOUND',
  });
  updater.checkForUpdates = async () => { throw error; };
  assert.deepEqual(await controller.check(), {
    currentVersion: '1.0.0', status: 'error', errorCode: 'release-unavailable',
  });
  assert.equal(JSON.stringify(published).includes('sensitive'), false);
  updater.emit('error', new Error('Cannot find latest-linux.yml in the latest release artifacts'));
  assert.equal(controller.getState().errorCode, 'release-unavailable');
  updater.emit('error', Object.assign(new Error('net::ERR_NAME_NOT_RESOLVED'), { code: 'ENOTFOUND' }));
  assert.equal(controller.getState().errorCode, 'network');
});
