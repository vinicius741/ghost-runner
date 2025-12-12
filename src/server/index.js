const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const TASKS_DIR = path.resolve(__dirname, '../../tasks');
const LOG_FILE = path.resolve(__dirname, '../../scheduler.log');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- API Endpoints ---

// Get all tasks
app.get('/api/tasks', (req, res) => {
    fs.readdir(TASKS_DIR, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read tasks directory.' });
        }
        const tasks = files.filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
        res.json({ tasks });
    });
});

// Run a specific task
app.post('/api/run-task', (req, res) => {
    const { taskName } = req.body;
    if (!taskName) {
        return res.status(400).json({ error: 'Task name is required.' });
    }

    // Spawn the bot process
    const child = spawn('npm', ['run', 'bot', '--', `--task=${taskName}`], {
        cwd: path.resolve(__dirname, '../../'),
        shell: true
    });

    child.stdout.on('data', (data) => {
        io.emit('log', `[Task: ${taskName}] ${data.toString()}`);
    });

    child.stderr.on('data', (data) => {
        io.emit('log', `[Task: ${taskName} ERROR] ${data.toString()}`);
    });

    child.on('close', (code) => {
        io.emit('log', `[Task: ${taskName}] process exited with code ${code}`);
    });

    res.json({ message: `Task ${taskName} started.` });
});

// Record a new task
app.post('/api/record', (req, res) => {
    const child = spawn('npm', ['run', 'record'], {
        cwd: path.resolve(__dirname, '../../'),
        shell: true
    });

    child.stdout.on('data', (data) => {
        io.emit('log', `[Recorder] ${data.toString()}`);
    });

    child.stderr.on('data', (data) => {
        io.emit('log', `[Recorder ERROR] ${data.toString()}`);
    });

    res.json({ message: 'Recorder started.' });
});

// Scheduler Control
let schedulerProcess = null;

app.post('/api/scheduler/start', (req, res) => {
    if (schedulerProcess) {
        return res.json({ message: 'Scheduler is already running.' });
    }

    schedulerProcess = spawn('npm', ['run', 'schedule'], {
        cwd: path.resolve(__dirname, '../../'),
        shell: true
    });

    schedulerProcess.stdout.on('data', (data) => {
        io.emit('log', `[Scheduler] ${data.toString()}`);
    });

    schedulerProcess.stderr.on('data', (data) => {
        io.emit('log', `[Scheduler ERROR] ${data.toString()}`);
    });

    schedulerProcess.on('close', (code) => {
        io.emit('log', `[Scheduler] process exited with code ${code}`);
        schedulerProcess = null;
    });

    res.json({ message: 'Scheduler started.' });
});

app.post('/api/scheduler/stop', (req, res) => {
    if (schedulerProcess) {
        schedulerProcess.kill();
        schedulerProcess = null;
        io.emit('log', '[Scheduler] Stopped manually.');
        res.json({ message: 'Scheduler stopped.' });
    } else {
        res.json({ message: 'Scheduler is not running.' });
    }
});

// Get Logs
app.get('/api/logs', (req, res) => {
    if (fs.existsSync(LOG_FILE)) {
        fs.readFile(LOG_FILE, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to read log file.' });
            }
            res.json({ logs: data });
        });
    } else {
        res.json({ logs: 'No logs found.' });
    }
});


server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
