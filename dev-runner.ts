import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Colors for output
const colors = {
    server: '\x1b[36m', // Cyan
    frontend: '\x1b[32m', // Green
    reset: '\x1b[0m'
};

type ColorKey = keyof typeof colors;

function startProcess(name: string, command: string, args: string[], cwd: string, color: string): ChildProcess {
    const proc = spawn(command, args, {
        cwd: cwd || process.cwd(),
        shell: true,
        stdio: 'pipe',
        env: { ...process.env, FORCE_COLOR: 'true' }
    });

    proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
            if (line.trim()) {
                console.log(`${color}[${name}] ${line}${colors.reset}`);
            }
        });
    });

    proc.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
            if (line.trim()) {
                console.error(`${color}[${name}] ${line}${colors.reset}`);
            }
        });
    });

    proc.on('close', (code: number | null) => {
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

// Start Backend only (serves both API and built frontend)
const server = startProcess('Server', 'npx', ['tsx', 'src/server/index.ts'], process.cwd(), colors.server);

// Start Frontend dev server after backend is ready (checked via health endpoint)
let frontend: ChildProcess | undefined;
const startFrontend = (): void => {
    frontend = startProcess('Frontend', 'npm', ['run', 'dev'], path.join(process.cwd(), 'frontend'), colors.frontend);
    // Attach exit handler after frontend starts
    frontend.on('close', (code: number | null) => handleChildExit('Frontend', code));
};

// Poll backend health endpoint before starting frontend
const maxRetries = 15;
const healthCheckInterval = 500; // 500ms between checks
let retryCount = 0;

const checkBackendHealth = async (): Promise<void> => {
    try {
        const response = await fetch(`http://localhost:${apiPort}/health`);
        if (response.ok) {
            startFrontend();
            return;
        }
    } catch {
        // Backend not ready yet
    }

    retryCount++;
    if (retryCount < maxRetries) {
        setTimeout(checkBackendHealth, healthCheckInterval);
    } else {
        console.warn(`${colors.reset}Backend health check failed after ${maxRetries} attempts. Starting frontend anyway...${colors.reset}`);
        startFrontend();
    }
};

// Start health check after a brief delay to let backend begin initialization
setTimeout(checkBackendHealth, 500);

// Handle termination
const cleanup = (): void => {
    console.log('\nStopping services...');
    // Kill backend server
    const killServer = () => {
        if (server.pid !== undefined) {
            try {
                process.kill(-server.pid);
            } catch {
                try {
                    server.kill();
                } catch {
                    // Process already terminated, ignore
                }
            }
        }
    };
    killServer();

    // Kill frontend dev server
    const killFrontend = () => {
        if (frontend?.pid !== undefined) {
            try {
                process.kill(-frontend.pid);
            } catch {
                try {
                    frontend.kill();
                } catch {
                    // Process already terminated, ignore
                }
            }
        }
    };
    killFrontend();

    process.exit();
};

// Handle early exits from child processes
const handleChildExit = (name: string, code: number | null): void => {
    if (code !== 0 && code !== null) {
        const colorName = name.toLowerCase() as ColorKey;
        console.error(`\n${colors[colorName]}[${name}] exited unexpectedly with code ${code}. Shutting down...${colors.reset}`);
        cleanup();
    }
};

server.on('close', (code: number | null) => handleChildExit('Server', code));

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
