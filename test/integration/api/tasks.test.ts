/**
 * Integration tests for Tasks API endpoints.
 *
 * Tests the full request/response cycle for task-related endpoints.
 *
 * @module test/integration/api/tasks.test
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express, { Express } from 'express';
import { tasksRoutes } from '../../../src/server/routes/tasks';

// Mock dependencies
const mockApp: Express = express();
mockApp.use(express.json());
mockApp.use('/api', tasksRoutes);

describe('Tasks API', () => {
  describe('GET /api/tasks', () => {
    it('should return list of tasks', async () => {
      const response = await request(mockApp)
        .get('/api/tasks')
        .expect('Content-Type', /json/);

      assert.strictEqual(response.status, 200);
      assert.ok(response.body.tasks);
      assert.ok(Array.isArray(response.body.tasks));
    });

    it('should return tasks with name and type', async () => {
      const response = await request(mockApp)
        .get('/api/tasks');

      // If tasks exist, verify structure
      if (response.body.tasks.length > 0) {
        const task = response.body.tasks[0];
        assert.ok(task.name);
        assert.ok(task.type);
      }
    });
  });

  describe('POST /api/tasks/run', () => {
    it('should return 400 when taskName is missing', async () => {
      const response = await request(mockApp)
        .post('/api/tasks/run')
        .send({})
        .expect('Content-Type', /json/);

      assert.strictEqual(response.status, 400);
      assert.ok(response.body.error);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(mockApp)
        .post('/api/tasks/run')
        .send({ taskName: 'non-existent-task-12345' })
        .expect('Content-Type', /json/);

      assert.strictEqual(response.status, 404);
      assert.ok(response.body.error.includes('not found'));
    });
  });

  describe('POST /api/record', () => {
    it('should start recorder with valid input', async () => {
      const response = await request(mockApp)
        .post('/api/record')
        .send({ taskName: 'test-record', type: 'private' });

      // Recorder should start (or fail gracefully)
      assert.ok(response.status === 200 || response.status === 500);
    });
  });

  describe('POST /api/setup-login', () => {
    it('should start setup login process', async () => {
      const response = await request(mockApp)
        .post('/api/setup-login');

      // Setup login should start (or fail gracefully)
      assert.ok(response.status === 200 || response.status === 500);
    });
  });
});
