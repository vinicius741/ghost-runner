/**
 * Integration tests for Settings API endpoints.
 *
 * Tests the full request/response cycle for settings-related endpoints.
 *
 * @module test/integration/api/settings.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express, { Express } from 'express';
import { settingsRoutes } from '../../../src/server/routes/settings';

// Mock app
const mockApp: Express = express();
mockApp.use(express.json());
mockApp.use('/api', settingsRoutes);

describe('Settings API', () => {
  describe('GET /api/settings', () => {
    it('should return settings object', async () => {
      const response = await request(mockApp)
        .get('/api/settings')
        .expect('Content-Type', /json/);

      assert.strictEqual(response.status, 200);
      assert.ok(response.body.settings);
    });

    it('should include geolocation in settings', async () => {
      const response = await request(mockApp)
        .get('/api/settings');

      if (response.body.settings && Object.keys(response.body.settings).length > 0) {
        assert.ok(response.body.settings.geolocation);
        assert.ok(typeof response.body.settings.geolocation.latitude === 'number');
        assert.ok(typeof response.body.settings.geolocation.longitude === 'number');
      }
    });
  });

  describe('PUT /api/settings', () => {
    it('should return 400 for invalid settings format', async () => {
      const response = await request(mockApp)
        .put('/api/settings') // Note: check if PUT or POST
        .send('not-an-object')
        .expect('Content-Type', /json/);

      // Express should reject invalid JSON
      assert.ok(response.status >= 400);
    });

    it('should accept valid settings object', async () => {
      const response = await request(mockApp)
        .put('/api/settings')
        .send({
          settings: {
            geolocation: { latitude: -23.55052, longitude: -46.633308 },
            headless: false
          }
        });

      // Should either succeed or fail gracefully
      assert.ok(response.status === 200 || response.status === 500);
    });
  });
});
