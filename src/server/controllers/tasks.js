const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { TASKS_DIR, ROOT_DIR } = require('../config');
const { getTasksFromDir } = require('../utils/fileSystem');

exports.getTasks = (req, res) => {
    try {
        const publicTasks = getTasksFromDir('public');
        const privateTasks = getTasksFromDir('private');

        // Also check root for backward compatibility
        const rootPath = TASKS_DIR;
        let rootTasks = [];
        if (fs.existsSync(rootPath)) {
            rootTasks = fs.readdirSync(rootPath)
                .filter(f => f.endsWith('.js'))
                .map(f => ({
                    name: f.replace('.js', ''),
                    type: 'root'
                }));
        }

        const taskMap = new Map();

        // Root first (lowest priority)
        rootTasks.forEach(t => taskMap.set(t.name, t));
        // Private next
        privateTasks.forEach(t => taskMap.set(t.name, t));
        // Public last (highest priority)
        publicTasks.forEach(t => taskMap.set(t.name, t));

        res.json({ tasks: Array.from(taskMap.values()) });
    } catch (err) {
        console.error('Error reading tasks:', err);
        res.status(500).json({ error: 'Failed to read tasks directory.' });
    }
};

exports.runTask = (req, res) => {
    const io = req.app.get('io');
    const { taskName } = req.body;
    if (!taskName) {
        return res.status(400).json({ error: 'Task name is required.' });
    }

    const child = spawn('npm', ['run', 'bot', '--', `--task=${taskName}`], {
        cwd: ROOT_DIR,
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
};

exports.recordTask = (req, res) => {
    const io = req.app.get('io');
    try {
        const { taskName, type } = req.body;

        const args = ['run', 'record'];

        if (taskName && type) {
            args.push('--');
            args.push(`--name=${taskName}`);
            args.push(`--type=${type}`);
        }

        const child = spawn('npm', args, {
            cwd: ROOT_DIR,
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
};

exports.setupLogin = (req, res) => {
    const io = req.app.get('io');
    try {
        const child = spawn('npm', ['run', 'setup-login'], {
            cwd: ROOT_DIR,
            shell: true
        });

        child.stdout.on('data', (data) => {
            io.emit('log', `[Setup Login] ${data.toString()}`);
        });

        child.stderr.on('data', (data) => {
            io.emit('log', `[Setup Login ERROR] ${data.toString()}`);
        });

        child.on('error', (err) => {
            console.error('Spawn error:', err);
            io.emit('log', `[Setup Login SYSTEM ERROR] Failed to spawn process: ${err.message}`);
        });

        child.on('close', (code) => {
            io.emit('log', `[Setup Login] Process finished with code ${code}`);
        });

        res.json({ message: 'Setup login started. Browser should open soon.' });
    } catch (error) {
        console.error('Error in /api/setup-login:', error);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
};
