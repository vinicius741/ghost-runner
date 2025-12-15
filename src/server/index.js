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
    // Helper to read tasks from a directory
    const getTasksFromDir = (dirName) => {
        const dirPath = path.join(TASKS_DIR, dirName);
        if (fs.existsSync(dirPath)) {
            return fs.readdirSync(dirPath)
                .filter(f => f.endsWith('.js'))
                .map(f => f.replace('.js', ''));
        }
        return [];
    };

    try {
        const publicTasks = getTasksFromDir('public');
        const privateTasks = getTasksFromDir('private');

        // Also check root for backward compatibility (optional, but good to have)
        const rootTasks = fs.readdirSync(TASKS_DIR)
            .filter(f => f.endsWith('.js'))
            .map(f => f.replace('.js', ''));

        // distinct tasks
        const allTasks = [...new Set([...publicTasks, ...privateTasks, ...rootTasks])];
        res.json({ tasks: allTasks });
    } catch (err) {
        console.error('Error reading tasks:', err);
        res.status(500).json({ error: 'Failed to read tasks directory.' });
    }
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
    try {
        const { taskName, type } = req.body;

        const args = ['run', 'record'];

        // If name and type provided, pass them as arguments
        if (taskName && type) {
            args.push('--');
            args.push(`--name=${taskName}`);
            args.push(`--type=${type}`);
        }

        const child = spawn('npm', args, {
            cwd: path.resolve(__dirname, '../../'),
            shell: true
        });

        child.stdout.on('data', (data) => {
            io.emit('log', `[Recorder] ${data.toString()}`);
        });

        child.stderr.on('data', (data) => {
            io.emit('log', `[Recorder ERROR] ${data.toString()}`);
        });

        child.on('error', (err) => {
            console.error('Spawn error:', err);
            io.emit('log', `[Recorder SYSTEM ERROR] Failed to spawn process: ${err.message}`);
        });

        child.on('close', (code) => {
            if (code !== 0) {
                io.emit('log', `[Recorder] Process exited with code ${code}`);
            }
        });

        res.json({ message: 'Recorder started.' });
    } catch (error) {
        console.error('Error in /api/record:', error);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
});

// Scheduler Control
let schedulerProcess = null;

app.get('/api/scheduler/status', (req, res) => {
    res.json({ running: !!schedulerProcess });
});

app.post('/api/scheduler/start', (req, res) => {
    if (schedulerProcess) {
        return res.json({ message: 'Scheduler is already running.' });
    }

    schedulerProcess = spawn('npm', ['run', 'schedule'], {
        cwd: path.resolve(__dirname, '../../'),
        shell: true
    });

    io.emit('scheduler-status', true);

    schedulerProcess.stdout.on('data', (data) => {
        io.emit('log', `[Scheduler] ${data.toString()}`);
    });

    schedulerProcess.stderr.on('data', (data) => {
        io.emit('log', `[Scheduler ERROR] ${data.toString()}`);
    });

    schedulerProcess.on('close', (code) => {
        io.emit('log', `[Scheduler] process exited with code ${code}`);
        schedulerProcess = null;
        io.emit('scheduler-status', false);
    });

    res.json({ message: 'Scheduler started.' });
});

app.post('/api/scheduler/stop', (req, res) => {
    if (schedulerProcess) {
        schedulerProcess.kill();
        schedulerProcess = null;
        io.emit('log', '[Scheduler] Stopped manually.');
        io.emit('scheduler-status', false);
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

// --- Schedule Management ---
const SCHEDULE_FILE = path.resolve(__dirname, '../../schedule.json');

// Get Schedule
app.get('/api/schedule', (req, res) => {
    if (fs.existsSync(SCHEDULE_FILE)) {
        fs.readFile(SCHEDULE_FILE, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to read schedule file.' });
            }
            try {
                const schedule = JSON.parse(data);
                res.json({ schedule });
            } catch (e) {
                res.status(500).json({ error: 'Invalid JSON in schedule file.' });
            }
        });
    } else {
        res.json({ schedule: [] });
    }
});

// Save Schedule
app.post('/api/schedule', (req, res) => {
    const { schedule } = req.body;
    if (!Array.isArray(schedule)) {
        return res.status(400).json({ error: 'Invalid schedule format. Expected an array.' });
    }

    fs.writeFile(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to save schedule.' });
        }
        res.json({ message: 'Schedule updated successfully.' });
        // Notify clients about the update if needed
        io.emit('log', '[System] Schedule updated via UI.');
    });
});



// --- Global Error Handlers ---
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    // Try to emit to socket if possible, though process might be unstable
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
