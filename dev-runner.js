const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

// Colors for output
const colors = {
    server: '\x1b[36m', // Cyan
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
console.log(`Server will run on http://localhost:${apiPort}`);

// Start Backend only (serves both API and built frontend)
const server = startProcess('Server', 'node', ['src/server/index.js'], process.cwd(), colors.server);

// Handle termination
const cleanup = () => {
    console.log('\nStopping server...');
    try {
        process.kill(-server.pid);
    } catch(e) {
        server.kill();
    }
    process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
