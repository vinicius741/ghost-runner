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
        env: { ...process.env, FORCE_COLOR: 'true' } // Force color output
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
const apiPort = process.env.PORT || 3000;
console.log(`Backend will run on http://localhost:${apiPort}`);
console.log('Frontend will run on http://localhost:5173 (with proxy to backend)');

// Start Backend
const server = startProcess('Server', 'node', ['src/server/index.js'], process.cwd(), colors.server);

// Start Frontend
const frontend = startProcess('Frontend', 'npm', ['run', 'dev'], path.join(process.cwd(), 'frontend'), colors.frontend);

// Handle termination
const cleanup = () => {
    console.log('\nStopping processes...');
    // We need to be careful with killing processes spawned with shell: true
    // On Unix, we can kill the process group? 
    // Or just rely on the fact that child processes usually die when parent dies in simple scripts,
    // but sometimes they orphan.
    
    // Attempt to kill. 
    // Since we used shell:true, proc.pid is the shell pid.
    // Use negative pid to kill process group if possible on unix.
    try {
        process.kill(-server.pid);
    } catch(e) {
        server.kill();
    }
    
    try {
        process.kill(-frontend.pid);
    } catch(e) {
        frontend.kill();
    }
    
    process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
