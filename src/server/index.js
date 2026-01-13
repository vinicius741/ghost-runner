require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const { PORT, SETTINGS_FILE } = require('./config');

const tasksRoutes = require('./routes/tasks');
const schedulerRoutes = require('./routes/scheduler');
const settingsRoutes = require('./routes/settings');
const logsRoutes = require('./routes/logs');

const app = express();
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
    app.get('*', (req, res) => {
        // Don't intercept API routes
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'Not found' });
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
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    try {
        if (io) io.emit('log', `[SYSTEM CRASH] Uncaught Exception: ${err.message}`);
    } catch (e) { /* ignore */ }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
    try {
        if (io) io.emit('log', `[SYSTEM CRASH] Unhandled Rejection: ${reason}`);
    } catch (e) { /* ignore */ }
});

// Port search limit - maximum number of ports to try
const MAX_PORT_ATTEMPTS = 100;

// Start server with error-based port detection (avoids TOCTOU race condition)
async function startServer() {
    let desiredPort = parseInt(PORT, 10);
    const maxPort = desiredPort + MAX_PORT_ATTEMPTS;

    function tryListen(port) {
        return new Promise((resolve, reject) => {
            function onError(err) {
                server.off('error', onError);
                server.off('listening', onListening);
                reject(err);
            }
            function onListening() {
                server.off('error', onError);
                server.off('listening', onListening);
                resolve(port);
            }
            server.once('error', onError);
            server.once('listening', onListening);
            server.listen(port);
        });
    }

    while (desiredPort <= maxPort) {
        try {
            const port = await tryListen(desiredPort);
            console.log(`Server running on http://localhost:${port}`);
            return;
        } catch (err) {
            if (err.code === 'EADDRINUSE') {
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
