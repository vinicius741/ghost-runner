import { spawn, ChildProcess } from 'child_process';
import { ROOT_DIR } from '../config';
import { Server } from 'socket.io';

class SchedulerService {
  private schedulerProcess: ChildProcess | null = null;

  isRunning(): boolean {
    return !!this.schedulerProcess;
  }

  start(io: Server): boolean {
    if (this.schedulerProcess) return false;

    this.schedulerProcess = spawn('npm', ['run', 'schedule'], {
      cwd: ROOT_DIR,
      shell: true
    });

    io.emit('scheduler-status', true);

    this.schedulerProcess.stdout?.on('data', (data: Buffer) => {
      io.emit('log', `[Scheduler] ${data.toString()}`);
    });

    this.schedulerProcess.stderr?.on('data', (data: Buffer) => {
      io.emit('log', `[Scheduler ERROR] ${data.toString()}`);
    });

    this.schedulerProcess.on('close', (code: number | null) => {
      io.emit('log', `[Scheduler] process exited with code ${code}`);
      this.schedulerProcess = null;
      io.emit('scheduler-status', false);
    });

    return true;
  }

  stop(io: Server): boolean {
    if (this.schedulerProcess) {
      this.schedulerProcess.kill();
      this.schedulerProcess = null;
      io.emit('log', '[Scheduler] Stopped.');
      io.emit('scheduler-status', false);
      return true;
    }
    return false;
  }

  restart(io: Server): void {
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
export default new SchedulerService();
