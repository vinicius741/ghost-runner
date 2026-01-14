/**
 * Example integration test file
 *
 * Integration tests test how multiple parts of your application work together.
 * These tests typically make HTTP requests to your API.
 *
 * Place integration tests for specific routes or features in this directory.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createTestApp } from '../fixtures/server.js';

describe('Example Integration Tests', () => {
  let app;
  let server;

  before(async () => {
    const testApp = createTestApp();
    app = testApp.app;
    // Note: We don't start the server for supertest
    // supertest can bind to an arbitrary port
    server = testApp.server;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // Example: Testing a task endpoint
  //
  // describe('GET /api/tasks', () => {
  //   it('should return a list of available tasks', async () => {
  //     const response = await request(app)
  //       .get('/api/tasks')
  //       .set('Accept', 'application/json');
  //
  //     assert.strictEqual(response.status, 200);
  //     assert.ok(response.headers['content-type'].includes('application/json'));
  //     assert.ok(Array.isArray(response.body));
  //   });
  // });

  // Example: Testing a settings endpoint
  //
  // describe('GET /api/settings', () => {
  //   it('should return current settings', async () => {
  //     const response = await request(app)
  //       .get('/api/settings')
  //       .set('Accept', 'application/json');
  //
  //     assert.strictEqual(response.status, 200);
  //     assert.ok(response.body.geolocation);
  //     assert.ok(typeof response.body.geolocation.latitude === 'number');
  //   });
  // });

  // Example: Testing POST request
  //
  // describe('POST /api/settings', () => {
  //   it('should update settings', async () => {
  //     const newSettings = {
  //       geolocation: {
  //         latitude: 40.7128,
  //         longitude: -74.0060,
  //       }
  //     };
  //
  //     const response = await request(app)
  //       .post('/api/settings')
  //       .send(newSettings)
  //       .set('Accept', 'application/json');
  //
  //     assert.strictEqual(response.status, 200);
  //     assert.strictEqual(response.body.geolocation.latitude, 40.7128);
  //   });
  // });

  it('placeholder - add your integration tests here', () => {
    assert.strictEqual(true, true);
  });
});
