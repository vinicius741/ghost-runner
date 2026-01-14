/**
 * Test server fixture
 *
 * Creates a test server instance for integration testing.
 * The server is closed after each test.
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import express from 'express';
import tasksRoutes from '../../src/server/routes/tasks.js';
import schedulerRoutes from '../../src/server/routes/scheduler.js';
import settingsRoutes from '../../src/server/routes/settings.js';
import logsRoutes from '../../src/server/routes/logs.js';

export function createTestApp() {
  const app = express();

  // Middleware
  app.use(express.json());

  // Create a minimal HTTP server for testing
  const server = createServer(app);
  const io = new SocketIOServer(server);

  // Share io instance with controllers
  app.set('io', io);

  // Routes
  app.use('/api', tasksRoutes);
  app.use('/api', schedulerRoutes);
  app.use('/api', settingsRoutes);
  app.use('/api', logsRoutes);

  // Error handling
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });

  return { app, server, io };
}
