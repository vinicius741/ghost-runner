import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ROOT_DIR } from '../config';
import { Server } from 'socket.io';
import { shouldUseCompiledEntry } from '../../config/runtimePaths';

class SchedulerService {
  private schedulerProcess: ChildProcess | null = null;

  isRunning(): boolean {
    return !!this.schedulerProcess;
  }

  start(io: Server): boolean {
    if (this.schedulerProcess) return false;

    const compiledScheduler = path.join(ROOT_DIR, 'dist', 'src', 'core', 'scheduler.js');
    const sourceScheduler = path.join(ROOT_DIR, 'src', 'core', 'scheduler.ts');
    const tsxBin = path.join(ROOT_DIR, 'node_modules', '.bin', 'tsx');

    const command = shouldUseCompiledEntry(compiledScheduler)
      ? process.execPath
      : (fs.existsSync(sourceScheduler) && fs.existsSync(tsxBin) ? tsxBin : 'npm');

    const args = command === process.execPath
      ? [compiledScheduler]
      : (command === tsxBin ? [sourceScheduler] : ['run', 'schedule']);

    this.schedulerProcess = spawn(command, args, {
      cwd: ROOT_DIR,
      shell: command === 'npm',
      env: command === process.execPath && process.versions.electron
        ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
        : process.env,
    });

    let started = false;
    this.schedulerProcess.once('spawn', () => {
      started = true;
      io.emit('scheduler-status', { running: true });
    });

    this.schedulerProcess.stdout?.on('data', (data: Buffer) => {
      io.emit('log', `[Scheduler] ${data.toString()}`);
    });

    this.schedulerProcess.stderr?.on('data', (data: Buffer) => {
      io.emit('log', `[Scheduler ERROR] ${data.toString()}`);
    });

    this.schedulerProcess.on('close', (code: number | null) => {
      io.emit('log', `[Scheduler] process exited with code ${code}`);
      this.schedulerProcess = null;
      io.emit('scheduler-status', { running: false });
    });

    this.schedulerProcess.on('error', (error: Error) => {
      io.emit('log', `[Scheduler ERROR] Failed to spawn scheduler: ${error.message}`);
      if (!started) {
        this.schedulerProcess = null;
        io.emit('scheduler-status', { running: false });
      }
    });

    return true;
  }

  stop(io: Server): boolean {
    if (this.schedulerProcess) {
      this.schedulerProcess.kill();
      this.schedulerProcess = null;
      io.emit('log', '[Scheduler] Stopped.');
      io.emit('scheduler-status', { running: false });
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
