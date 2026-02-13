import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getProfileDir } from '../config/browserConfig';
import { APP_ROOT, TASKS_DIR, initializeRuntimeStorage } from '../config/runtimePaths';

initializeRuntimeStorage();

// Parse args
const args = process.argv.slice(2);
const nameArg = args.find(a => a.startsWith('--name='));
const typeArg = args.find(a => a.startsWith('--type='));

if (nameArg && typeArg) {
  const taskName = nameArg.split('=')[1];
  const taskType = typeArg.split('=')[1]; // 'public' or 'private'

  if (!['public', 'private'].includes(taskType)) {
    console.error('Invalid type. Use public or private.');
    process.exit(1);
  }

  const targetDir = path.join(TASKS_DIR, taskType);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetFile = path.join(targetDir, `${taskName}.js`);

  if (fs.existsSync(targetFile)) {
    console.log(`Task ${taskName} already exists at ${targetFile}. Appending/Editing...`);
  } else {
    const templatePath = path.join(TASKS_DIR, 'public', 'template.js');
    let content = '';
    if (fs.existsSync(templatePath)) {
      content = fs.readFileSync(templatePath, 'utf8');
    } else {
      // Fallback template if file missing
      content = `module.exports = {\n  run: async (page) => {\n    // Paste code here\n  }\n};\n`;
    }
    fs.writeFileSync(targetFile, content);
    console.log(`Created new task file: ${targetFile}`);
  }
}

console.log('Starting Playwright Recorder...');
const profileDir = getProfileDir();
console.log(`Loading Profile from: ${profileDir}`);
console.log('Note: This will open a browser window. Perform your actions, then copy the code from the inspector.');

// Arguments for Playwright Codegen
// We use --channel=chrome to ensure we use the same browser binary as the bot (system Chrome)
// to avoid profile version conflicts.
const playwrightArgs: string[] = [
  'codegen',
  `--viewport-size=1920,1080`,
  `--user-data-dir=${profileDir}`,
  '--channel=chrome'
];

const playwrightCli = path.join(APP_ROOT, 'node_modules', 'playwright', 'cli.js');
const command = fs.existsSync(playwrightCli) ? process.execPath : 'npx';
const argsForCommand = command === process.execPath ? [playwrightCli, ...playwrightArgs] : ['playwright', ...playwrightArgs];

const child: ChildProcess = spawn(command, argsForCommand, {
  cwd: APP_ROOT,
  stdio: 'inherit', // Pipe output to parent console
  shell: command === 'npx', // execute through shell only for npx fallback
  env: command === process.execPath && process.versions.electron
    ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    : process.env,
});

child.on('close', (code: number | null) => {
  console.log(`Recorder exited with code ${code}`);
});
