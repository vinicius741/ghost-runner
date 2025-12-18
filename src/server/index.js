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

app.use(express.static(path.join(__dirname, 'public')));
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

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
