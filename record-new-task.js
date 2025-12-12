const { spawn } = require('child_process');
const path = require('path');

// Configuration matching browserConfig.js
const userDataDir = path.resolve(__dirname, 'user_data');

console.log('Starting Playwright Recorder...');
console.log(`Loading Profile from: ${userDataDir}`);
console.log('Note: This will open a browser window. Perform your actions, then copy the code from the inspector.');

// Arguments for Playwright Codegen
// We use --channel=chrome to ensure we use the same browser binary as the bot (local Chrome)
// to avoid profile version conflicts.
const args = [
  'playwright',
  'codegen',
  `--viewport-size=1920,1080`,
  `--user-data-dir=${userDataDir}`,
  '--channel=chrome' 
];

const child = spawn('npx', args, {
  stdio: 'inherit', // Pipe output to parent console
  shell: true       // execute through shell for npx compatibility
});

child.on('close', (code) => {
  console.log(`Recorder exited with code ${code}`);
});
