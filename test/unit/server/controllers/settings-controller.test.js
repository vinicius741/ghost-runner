/**
 * Unit tests for the settings controller save endpoint.
 *
 * Verifies that partial settings payloads (like the geolocation auto-save
 * triggered by "Use Current Location") are merged with the stored settings
 * file instead of replacing it wholesale.
 *
 * Keep this file CommonJS so `pnpm test` runs it with the current Node test runner.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const request = require('supertest');
const { mock } = require('node:test');
const { require: tsxRequire } = require('tsx/cjs/api');

const settingsRoutes = tsxRequire(path.resolve(process.cwd(), 'src/server/routes/settings.ts'), __filename).default;

function createApp() {
  const app = express();
  app.use(express.json());
  app.set('io', { emit: () => {} });
  app.use('/api', settingsRoutes);
  return app;
}

describe('POST /api/settings (merge behavior)', () => {
  let existsSyncMock;
  let readFileMock;
  let writeFileMock;
  let writtenPayload;

  const storedSettings = {
    geolocation: { latitude: -23.55052, longitude: -46.633308 },
    headless: true,
    browserChannel: 'chrome',
    profileDir: 'profiles/profile-2026-07-13T14-23-22',
  };

  beforeEach(() => {
    writtenPayload = null;
    existsSyncMock = mock.method(fs, 'existsSync', () => true);
    readFileMock = mock.method(fs.promises, 'readFile', async () => JSON.stringify(storedSettings));
    writeFileMock = mock.method(fs.promises, 'writeFile', async (file, data) => {
      writtenPayload = JSON.parse(data);
    });
  });

  afterEach(() => {
    existsSyncMock.mock.restore();
    readFileMock.mock.restore();
    writeFileMock.mock.restore();
  });

  it('preserves untouched fields when the client sends only geolocation', async () => {
    const response = await request(createApp())
      .post('/api/settings')
      .send({ settings: { geolocation: { latitude: -21.4324, longitude: -45.9341 } } });

    assert.strictEqual(response.status, 200);
    assert.ok(writeFileMock.mock.callCount() > 0, 'settings file should be written');
    assert.deepStrictEqual(writtenPayload.geolocation, { latitude: -21.4324, longitude: -45.9341 });
    assert.strictEqual(writtenPayload.headless, true);
    assert.strictEqual(writtenPayload.browserChannel, 'chrome');
    assert.strictEqual(writtenPayload.profileDir, 'profiles/profile-2026-07-13T14-23-22');
  });

  it('lets a full payload overwrite stored values', async () => {
    const response = await request(createApp())
      .post('/api/settings')
      .send({
        settings: {
          geolocation: { latitude: -10, longitude: -20 },
          headless: false,
          browserChannel: 'msedge',
          profileDir: 'profiles/other',
        },
      });

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(writtenPayload, {
      geolocation: { latitude: -10, longitude: -20 },
      headless: false,
      browserChannel: 'msedge',
      profileDir: 'profiles/other',
    });
  });

  it('rejects payloads without valid geolocation coordinates', async () => {
    const response = await request(createApp())
      .post('/api/settings')
      .send({ settings: { geolocation: { latitude: 999, longitude: 0 } } });

    assert.strictEqual(response.status, 400);
    assert.strictEqual(writeFileMock.mock.callCount(), 0, 'invalid payload must not be written');
  });

  it('overwrites a corrupted settings file instead of failing', async () => {
    readFileMock.mock.mockImplementation(async () => '{not valid json');

    const response = await request(createApp())
      .post('/api/settings')
      .send({ settings: { geolocation: { latitude: 1, longitude: 2 } } });

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(writtenPayload.geolocation, { latitude: 1, longitude: 2 });
  });
});
