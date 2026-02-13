#!/usr/bin/env node

const { rmSync, existsSync, writeFileSync, readdirSync, statSync } = require('fs');
const { execSync } = require('child_process');
const { resolve } = require('path');

const ROOT_DIR = resolve(__dirname, '..');
const FRONTEND_DIST = resolve(ROOT_DIR, 'frontend/dist');

// Step 1: Clean frontend dist (with --clean flag)
if (process.argv.includes('--clean')) {
  rmSync(FRONTEND_DIST, { recursive: true, force: true });
  console.log('✓ Cleaned frontend/dist');
}

// Step 2: Build frontend
console.log('Building frontend...');
execSync('cd frontend && npm run build', { stdio: 'inherit', cwd: ROOT_DIR });

// Step 3: Verify output exists
if (!existsSync(FRONTEND_DIST)) {
  console.error('✗ frontend/dist not found after build!');
  process.exit(1);
}

const files = readdirSync(FRONTEND_DIST, { recursive: true });
if (files.length === 0) {
  console.error('✗ frontend/dist is empty!');
  process.exit(1);
}

// Step 4: Create build manifest
const manifest = {
  buildTime: new Date().toISOString(),
  fileCount: files.length,
  totalSize: files.reduce((acc, f) => {
    try {
      return acc + statSync(resolve(FRONTEND_DIST, f)).size;
    } catch {
      return acc;
    }
  }, 0)
};

writeFileSync(
  resolve(FRONTEND_DIST, '.build-manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log(`✓ Frontend built successfully (${files.length} files)`);
console.log(`✓ Build manifest created at ${manifest.buildTime}`);
