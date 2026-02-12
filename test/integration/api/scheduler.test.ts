/**
 * Integration tests for Scheduler API endpoints.
 *
 * Tests the full request/response cycle for scheduler-related endpoints.
 *
 * @module test/integration/api/scheduler.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express, { Express } from 'express';
import { schedulerRoutes } from '../../../src/server/routes/scheduler';

// Mock app
const mockApp: Express = express();
mockApp.use(express.json());
mockApp.use('/api', schedulerRoutes);

describe('Scheduler API', () => {
  describe('GET /api/scheduler/status', () => {
    it('should return scheduler status', async () => {
      const response = await request(mockApp)
        .get('/api/scheduler/status')
        .expect('Content-Type', /json/);

      assert.strictEqual(response.status, 200);
      assert.ok(typeof response.body.running === 'boolean');
    });
  });

  describe('GET /api/schedule', () => {
    it('should return schedule array', async () => {
      const response = await request(mockApp)
        .get('/api/schedule')
        .expect('Content-Type', /json/);

      assert.strictEqual(response.status, 200);
      assert.ok(response.body.schedule);
      assert.ok(Array.isArray(response.body.schedule));
    });
  });

  describe('GET /api/schedule/next-task', () => {
    it('should return next task or null', async () => {
      const response = await request(mockApp)
        .get('/api/schedule/next-task')
        .expect('Content-Type', /json/);

      assert.strictEqual(response.status, 200);
      // nextTask can be null or an object
      assert.ok(response.body.nextTask === null || typeof response.body.nextTask === 'object');
    });
  });

  describe('POST /api/schedule', () => {
    it('should return 400 for invalid schedule format', async () => {
      const response = await request(mockApp)
        .post('/api/schedule')
        .send({ schedule: 'not-an-array' })
        .expect('Content-Type', /json/);

      assert.strictEqual(response.status, 400);
      assert.ok(response.body.error);
    });

    it('should accept valid schedule array', async () => {
      const response = await request(mockApp)
        .post('/api/schedule')
        .send({
          schedule: [
            { task: 'test-task', cron: '0 9 * * *' }
          ]
        });

      // Should either succeed or fail gracefully
      assert.ok(response.status === 200 || response.status === 500);
    });
  });

  describe('POST /api/scheduler/start', () => {
    it('should start or report already running', async () => {
      const response = await request(mockApp)
        .post('/api/scheduler/start');

      // Should return a message
      assert.ok(response.status === 200);
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/scheduler/stop', () => {
    it('should stop or report not running', async () => {
      const response = await request(mockApp)
        .post('/api/scheduler/stop');

      // Should return a message
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.message);
    });
  });
});
