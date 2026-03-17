/**
 * Integration tests for the task source API endpoint.
 *
 * Keep this file CommonJS so `npm test` runs it with the current Node test runner.
 */

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const express = require('express');
const request = require('supertest');
const { require: tsxRequire } = require('tsx/cjs/api');

const { tasksRoutes } = tsxRequire(path.resolve(process.cwd(), 'src/server/routes/tasks.ts'), __filename);
const { taskRepository } = tsxRequire(path.resolve(process.cwd(), 'src/server/repositories/TaskRepository.ts'), __filename);

const originalReadTask = taskRepository.readTask.bind(taskRepository);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', tasksRoutes);
  return app;
}

describe('GET /api/tasks/:taskName/source', () => {
  beforeEach(() => {
    taskRepository.readTask = originalReadTask;
  });

  after(() => {
    taskRepository.readTask = originalReadTask;
  });

  it('returns task source for writable tasks', async () => {
    taskRepository.readTask = async () => ({
      name: 'existing-task',
      type: 'public',
      content: 'module.exports = { run: async () => {} };',
      path: path.join(process.cwd(), 'tasks', 'public', 'existing-task.js'),
    });

    const response = await request(createApp())
      .get('/api/tasks/existing-task/source')
      .expect('Content-Type', /json/)
      .expect(200);

    assert.deepStrictEqual(response.body, {
      name: 'existing-task',
      type: 'public',
      content: 'module.exports = { run: async () => {} };',
      sourceOrigin: 'writable',
      saveType: 'public',
    });
  });

  it('maps root tasks to public saves and bundled source origin', async () => {
    taskRepository.readTask = async () => ({
      name: 'legacy-task',
      type: 'root',
      content: 'module.exports = { run: async () => {} };',
      path: path.join('/tmp', 'ghost-runner-bundled', 'tasks', 'legacy-task.js'),
    });

    const response = await request(createApp())
      .get('/api/tasks/legacy-task/source')
      .expect('Content-Type', /json/)
      .expect(200);

    assert.strictEqual(response.body.type, 'root');
    assert.strictEqual(response.body.sourceOrigin, 'bundled');
    assert.strictEqual(response.body.saveType, 'public');
  });

  it('returns 404 when the task does not exist', async () => {
    taskRepository.readTask = async () => undefined;

    const response = await request(createApp())
      .get('/api/tasks/missing-task/source')
      .expect('Content-Type', /json/)
      .expect(404);

    assert.match(response.body.error, /not found/i);
  });
});
