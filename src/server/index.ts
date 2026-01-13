import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { PORT, SETTINGS_FILE } from './config';

import tasksRoutes from './routes/tasks';
import schedulerRoutes from './routes/scheduler';
import settingsRoutes from './routes/settings';
import logsRoutes from './routes/logs';

const app: Express = express();
const server = http.createServer(app);
const io = new Server(server);

// Share io instance with controllers
app.set('io', io);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve built frontend (for production/single-server mode)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // Serve index.html for SPA routing
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
        // Don't intercept API routes
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

app.use(express.json());

// Initialize settings file if it doesn't exist
if (!fs.existsSync(SETTINGS_FILE)) {
    console.log('Initializing settings file...');
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
        geolocation: { latitude: -23.55052, longitude: -46.633308 }
    }, null, 2));
}

// --- API Routes ---
app.use('/api', tasksRoutes);
app.use('/api', schedulerRoutes);
app.use('/api', settingsRoutes);
app.use('/api', logsRoutes);

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
