import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { PORT, SETTINGS_FILE, SCHEDULE_FILE, FRONTEND_DIST_DIR, SERVER_PUBLIC_DIR } from './config';
import { initializeRuntimeStorage } from '../config/runtimePaths';
import type { ScheduleItem, ServerToClientEvents, ClientToServerEvents } from '../../shared/types';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import tasksRoutes from './routes/tasks';
import schedulerRoutes from './routes/scheduler';
import settingsRoutes from './routes/settings';
import logsRoutes from './routes/logs';
import failuresRoutes from './routes/failures';
import infoGatheringRoutes from './routes/infoGathering';

// Port search limit - maximum number of ports to try
const MAX_PORT_ATTEMPTS = 100;
const ioRegistry = new Set<Server<ClientToServerEvents, ServerToClientEvents>>();
let processHandlersRegistered = false;

export interface CreateGhostServerOptions {
  port?: number;
}

export interface GhostServer {
  app: Express;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  httpServer: http.Server;
  start: (preferredPort?: number) => Promise<number>;
  stop: () => Promise<void>;
  getPort: () => number | null;
}

// Type guard for Node.js ErrnoException
function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

function registerGlobalProcessHandlers(): void {
  if (processHandlersRegistered) {
    return;
  }

  process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    for (const io of ioRegistry) {
      try {
        io.emit('log', `[SYSTEM CRASH] Uncaught Exception: ${err.message}`);
      } catch {
        // ignore emit errors during crash handling
      }
    }
  });

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('UNHANDLED REJECTION:', reason);
    for (const io of ioRegistry) {
      try {
        io.emit('log', `[SYSTEM CRASH] Unhandled Rejection: ${reason}`);
      } catch {
        // ignore emit errors during crash handling
      }
    }
  });

  processHandlersRegistered = true;
}

function resolveFrontendAssetsDir(): string | null {
  const frontendDistIndex = path.join(FRONTEND_DIST_DIR, 'index.html');
  if (fs.existsSync(frontendDistIndex)) {
    return FRONTEND_DIST_DIR;
  }

  const serverPublicIndex = path.join(SERVER_PUBLIC_DIR, 'index.html');
  if (fs.existsSync(serverPublicIndex)) {
    return SERVER_PUBLIC_DIR;
  }

  return null;
}

export function createGhostServer(options: CreateGhostServerOptions = {}): GhostServer {
  initializeRuntimeStorage();

  const app: Express = express();
  const server = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
  let scheduleWatchDebounce: NodeJS.Timeout | null = null;
  let runningPort: number | null = null;
  ioRegistry.add(io);
  registerGlobalProcessHandlers();

  // Share io instance with controllers
  app.set('io', io);

  // Serve frontend assets from a single source to avoid stale mixed bundles.
  const frontendAssetsDir = resolveFrontendAssetsDir();
  if (frontendAssetsDir) {
    app.use(express.static(frontendAssetsDir));
    // Serve index.html for SPA routing (using middleware instead of app.get for Express 5.x compatibility)
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Don't intercept API routes or socket.io transport requests
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      // Send index.html for non-API routes that don't match static files
      if (!req.path.includes('.')) {
        res.sendFile(path.join(frontendAssetsDir, 'index.html'));
      } else {
        next();
      }
    });
  }

  app.use(express.json({ limit: '2mb' }));

  // Health check endpoint for dev runner and monitoring
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Initialize settings file if it doesn't exist
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
      geolocation: { latitude: -23.55052, longitude: -46.633308 },
      headless: false,
      browserChannel: 'chrome'
    }, null, 2));
  }

  /**
   * Emit the latest schedule to connected clients.
   * This keeps UI schedule state in sync when external processes mutate schedule.json.
   */
  async function emitScheduleUpdate(retryCount = 0): Promise<void> {
    try {
      const data = await fs.promises.readFile(SCHEDULE_FILE, 'utf8');
      const parsed: unknown = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new Error('Schedule file does not contain an array');
      }
      io.emit('schedule-updated', { schedule: parsed as ScheduleItem[] });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        io.emit('schedule-updated', { schedule: [] as ScheduleItem[] });
        return;
      }

      if (retryCount < 1) {
        setTimeout(() => {
          void emitScheduleUpdate(retryCount + 1);
        }, 100);
        return;
      }

      console.error('Failed to emit schedule update:', error);
    }
  }

  /**
   * Watch schedule.json and broadcast updates over Socket.io.
   */
  function watchScheduleFile(): void {
    fs.watchFile(SCHEDULE_FILE, { interval: 500 }, (current, previous) => {
      if (current.mtimeMs === previous.mtimeMs) {
        return;
      }

      if (scheduleWatchDebounce) {
        clearTimeout(scheduleWatchDebounce);
      }

      scheduleWatchDebounce = setTimeout(() => {
        void emitScheduleUpdate();
        scheduleWatchDebounce = null;
      }, 100);
    });
  }

  function unwatchScheduleFile(): void {
    if (scheduleWatchDebounce) {
      clearTimeout(scheduleWatchDebounce);
      scheduleWatchDebounce = null;
    }
    fs.unwatchFile(SCHEDULE_FILE);
  }

  // --- API Routes ---
  app.use('/api', tasksRoutes);
  app.use('/api', schedulerRoutes);
  app.use('/api', settingsRoutes);
  app.use('/api', logsRoutes);
  app.use('/api', failuresRoutes);
  app.use('/api', infoGatheringRoutes);

  // --- Error Handling ---
  // 404 handler for unmatched API routes
  app.use('/api', notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  function tryListen(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const onError = (err: Error) => {
        server.removeListener('listening', onListening);
        reject(err);
      };
      const onListening = () => {
        server.removeListener('error', onError);
        const address = server.address();
        if (address && typeof address === 'object') {
          resolve(address.port);
          return;
        }
        resolve(port);
      };

      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port);
    });
  }

  // Start server with error-based port detection (avoids TOCTOU race condition)
  async function start(preferredPort?: number): Promise<number> {
    if (runningPort !== null) {
      return runningPort;
    }

    const initialPort = preferredPort ?? options.port ?? PORT;

    if (initialPort === 0) {
      runningPort = await tryListen(0);
      watchScheduleFile();
      console.log(`Server running on http://localhost:${runningPort}`);
      return runningPort;
    }

    let desiredPort = initialPort;
    const maxPort = desiredPort + MAX_PORT_ATTEMPTS;

    while (desiredPort <= maxPort) {
      try {
        runningPort = await tryListen(desiredPort);
        watchScheduleFile();
        console.log(`Server running on http://localhost:${runningPort}`);
        return runningPort;
      } catch (err) {
        if (isErrnoException(err) && err.code === 'EADDRINUSE') {
          console.log(`Port ${desiredPort} is in use, trying next port...`);
          desiredPort++;
        } else {
          console.error('Failed to start server:', err);
          throw err;
        }
      }
    }

    throw new Error(`No available ports found between ${initialPort} and ${maxPort}`);
  }

  async function stop(): Promise<void> {
    if (runningPort === null) {
      ioRegistry.delete(io);
      io.removeAllListeners();
      return;
    }

    unwatchScheduleFile();
    ioRegistry.delete(io);

    await new Promise<void>((resolve, reject) => {
      io.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      try {
        server.close((error) => {
          if (error && (!isErrnoException(error) || error.code !== 'ERR_SERVER_NOT_RUNNING')) {
            reject(error);
            return;
          }
          resolve();
        });
      } catch (error) {
        if (isErrnoException(error) && error.code === 'ERR_SERVER_NOT_RUNNING') {
          resolve();
          return;
        }
        reject(error);
      }
    });

    runningPort = null;
  }

  return {
    app,
    io,
    httpServer: server,
    start,
    stop,
    getPort: () => runningPort,
  };
}

if (require.main === module) {
  const ghostServer = createGhostServer();
  void ghostServer.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
