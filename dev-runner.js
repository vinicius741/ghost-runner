const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

// Colors for output
const colors = {
    server: '\x1b[36m', // Cyan
    frontend: '\x1b[32m', // Green
    reset: '\x1b[0m'
};

function startProcess(name, command, args, cwd, color) {
    const proc = spawn(command, args, {
        cwd: cwd || process.cwd(),
        shell: true,
        stdio: 'pipe',
        env: { ...process.env, FORCE_COLOR: 'true' }
    });

    proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.log(`${color}[${name}] ${line}${colors.reset}`);
            }
        });
    });

    proc.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                console.error(`${color}[${name}] ${line}${colors.reset}`);
            }
        });
    });

    proc.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.log(`${color}[${name}] process exited with code ${code}${colors.reset}`);
        }
    });

    return proc;
}

console.log('Starting development environment...');
const apiPort = process.env.PORT || 3333;
const frontendPort = 5173;
console.log(`Backend API will run on http://localhost:${apiPort}`);
console.log(`Frontend dev server will run on http://localhost:${frontendPort}`);

// Start Backend server
const server = startProcess('Server', 'node', ['src/server/index.js'], process.cwd(), colors.server);

// Start Frontend dev server
const frontend = startProcess('Frontend', 'npm', ['run', 'dev'], path.join(process.cwd(), 'frontend'), colors.frontend);

// Handle termination
const cleanup = () => {
    console.log('\nStopping services...');
    // Kill backend server
    try {
        process.kill(-server.pid);
    } catch(e) {
        try {
            server.kill();
        } catch(killError) {
            // Process already terminated, ignore
        }
    }
    // Kill frontend dev server
    try {
        process.kill(-frontend.pid);
    } catch(e) {
        try {
            frontend.kill();
        } catch(killError) {
            // Process already terminated, ignore
        }
    }
    process.exit();
};

// Handle early exits from child processes
const handleChildExit = (name, code) => {
    if (code !== 0 && code !== null) {
        console.error(`\n${colors[name.toLowerCase()]}[${name}] exited unexpectedly with code ${code}. Shutting down...${colors.reset}`);
        cleanup();
    }
};

server.on('close', (code) => handleChildExit('Server', code));
frontend.on('close', (code) => handleChildExit('Frontend', code));

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
