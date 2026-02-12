import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { PORT, SETTINGS_FILE, SCHEDULE_FILE } from './config';
import type { ScheduleItem, ServerToClientEvents, ClientToServerEvents } from '../../shared/types';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import tasksRoutes from './routes/tasks';
import schedulerRoutes from './routes/scheduler';
import settingsRoutes from './routes/settings';
import logsRoutes from './routes/logs';
import failuresRoutes from './routes/failures';
import infoGatheringRoutes from './routes/infoGathering';

const app: Express = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);
let scheduleWatchDebounce: NodeJS.Timeout | null = null;

// Share io instance with controllers
app.set('io', io);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve built frontend (for production/single-server mode)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // Serve index.html for SPA routing (using middleware instead of app.get for Express 5.x compatibility)
    app.use((req: Request, res: Response, next: NextFunction) => {
        // Don't intercept API routes
        if (req.path.startsWith('/api')) {
            return next();
        }
        // Send index.html for non-API routes that don't match static files
        if (!req.path.includes('.')) {
            res.sendFile(path.join(frontendDist, 'index.html'));
        } else {
            next();
        }
    });
}

app.use(express.json());

// Health check endpoint for dev runner and monitoring
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

// Initialize settings file if it doesn't exist
if (!fs.existsSync(SETTINGS_FILE)) {
    console.log('Initializing settings file...');
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

    process.on('exit', () => {
        fs.unwatchFile(SCHEDULE_FILE);
    });
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

watchScheduleFile();

// --- Global Error Handlers ---
process.on('uncaughtException', (err: Error) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    try {
        if (io) io.emit('log', `[SYSTEM CRASH] Uncaught Exception: ${err.message}`);
    } catch (e) { /* ignore */ }
});

process.on('unhandledRejection', (reason: unknown) => {
    console.error('UNHANDLED REJECTION:', reason);
    try {
        if (io) io.emit('log', `[SYSTEM CRASH] Unhandled Rejection: ${reason}`);
    } catch (e) { /* ignore */ }
});

// Port search limit - maximum number of ports to try
const MAX_PORT_ATTEMPTS = 100;

// Type guard for Node.js ErrnoException
function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

// Start server with error-based port detection (avoids TOCTOU race condition)
async function startServer(): Promise<void> {
    let desiredPort = PORT;
    const maxPort = desiredPort + MAX_PORT_ATTEMPTS;

    function tryListen(port: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const onError = (err: Error) => reject(err);
            server.once('error', onError);
            server.once('listening', () => {
                server.removeListener('error', onError);
                resolve(port);
            });
            server.listen(port);
        });
    }

    while (desiredPort <= maxPort) {
        try {
            const port = await tryListen(desiredPort);
            console.log(`Server running on http://localhost:${port}`);
            return;
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

    throw new Error(`No available ports found between ${PORT} and ${maxPort}`);
}

startServer();
