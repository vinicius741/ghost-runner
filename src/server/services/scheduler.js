const { spawn } = require('child_process');
const path = require('path');
const { ROOT_DIR } = require('../config');

class SchedulerService {
    constructor() {
        this.schedulerProcess = null;
    }

    isRunning() {
        return !!this.schedulerProcess;
    }

    start(io) {
        if (this.schedulerProcess) return false;

        this.schedulerProcess = spawn('npm', ['run', 'schedule'], {
            cwd: ROOT_DIR,
            shell: true
        });

        io.emit('scheduler-status', true);

        this.schedulerProcess.stdout.on('data', (data) => {
            io.emit('log', `[Scheduler] ${data.toString()}`);
        });

        this.schedulerProcess.stderr.on('data', (data) => {
            io.emit('log', `[Scheduler ERROR] ${data.toString()}`);
        });

        this.schedulerProcess.on('close', (code) => {
            io.emit('log', `[Scheduler] process exited with code ${code}`);
            this.schedulerProcess = null;
            io.emit('scheduler-status', false);
        });

        return true;
    }

    stop(io) {
        if (this.schedulerProcess) {
            this.schedulerProcess.kill();
            this.schedulerProcess = null;
            io.emit('log', '[Scheduler] Stopped.');
            io.emit('scheduler-status', false);
            return true;
        }
        return false;
    }

    restart(io) {
        if (this.schedulerProcess) {
            io.emit('log', '[System] Restarting scheduler to apply changes...');
            this.stop(io);
            // Small delay to ensure process cleanup
            setTimeout(() => {
                this.start(io);
            }, 1000);
        } else {
            io.emit('log', '[System] Starting scheduler to apply changes...');
            this.start(io);
        }
    }
}

// Singleton instance
module.exports = new SchedulerService();
