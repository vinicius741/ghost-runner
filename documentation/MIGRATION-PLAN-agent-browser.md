# Migration Plan: Playwright to agent-browser

## Overview

Migrate Ghost Runner from Playwright (with playwright-extra/stealth) to agent-browser for better AI/agent integration, specifically for dynamic data extraction and decision-making based on page structure.

**IMPORTANT:** `agent-browser` is a **CLI tool**, not a TypeScript library. This requires a different integration approach using child processes.

**Key Decision:** Starting from scratch - no backward compatibility with existing Playwright tasks needed.

## Architecture Decision: CLI Integration

Since agent-browser is a CLI tool, we have two integration options:

### Option A: CLI Wrapper (Recommended)
- Use `child_process.spawn()` to execute agent-browser commands
- Parse JSON output (`--json` flag) for programmatic control
- Tasks generate agent-browser command sequences

### Option B: Direct CLI Usage
- Tasks become shell scripts that call agent-browser
- Simpler but less flexible for dynamic decision-making

**This plan assumes Option A (CLI Wrapper)** for maximum flexibility while leveraging agent-browser's snapshot-based workflow.

---

## Phase 0: Git Preparation & Legacy Preservation

**IMPORTANT:** This phase must be completed FIRST before any code changes. Creating the legacy branch ensures you have a fallback if the migration encounters issues.

- [x] **Phase 0 Status**: Complete

### 0.1 Create Legacy Branch

- [x] **0.1 Status**: Complete

Before making any changes, create a legacy branch to preserve the current Playwright implementation:

```bash
# Create and push the legacy branch
git checkout -b legacy/playwright
git push -u origin legacy/playwright

# Return to main branch for migration work
git checkout main
```

This branch serves as:
- A permanent reference for the original Playwright implementation
- A fallback if issues arise during migration
- Historical documentation of the project's evolution

### 0.2 Archive Existing Tasks

- [x] **0.2 Status**: Complete

Move existing Playwright-based tasks to a legacy folder for reference:

```bash
# Create legacy folder structure
mkdir -p tasks/legacy/public
mkdir -p tasks/legacy/private

# Move existing tasks (if they exist)
# Note: These commands will fail if folders are empty or files don't exist - that's okay
git mv tasks/public/* tasks/legacy/public/ 2>/dev/null || true
git mv tasks/private/* tasks/legacy/private/ 2>/dev/null || true
```

**Gitignore consideration:**
- `tasks/legacy/private/` remains git-ignored (contains sensitive tasks)
- Only `tasks/legacy/public/` is tracked in Git

### 0.3 Verify Legacy Branch

- [x] **0.3 Status**: Complete

After creating the legacy branch, verify it exists:

```bash
# List all branches
git branch -a

# Confirm legacy branch has the current code
git log legacy/playwright --oneline -5
```

### 0.4 Ready to Proceed

- [x] **0.4 Status**: Complete

Once Phase 0 is complete:
- Your `legacy/playwright` branch is pushed to origin
- Your `main` branch is ready for migration changes
- You can safely proceed to Phase 1

**If you need to rollback at any point:**
```bash
git checkout legacy/playwright
git checkout -b hotfix/rollback-attempt
```

---

## Phase 1: Core Architecture Migration

- [ ] **Phase 1 Status**: Not Started

### 1.1 Create Browser CLI Wrapper

- [ ] **1.1 Status**: Pending

**New File:** `src/config/browserCli.ts`

```typescript
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import path from 'path';

interface SnapshotElement {
  ref: string;
  role: string;
  name?: string;
  text?: string;
}

interface Snapshot {
  elements: SnapshotElement[];
  url: string;
  title: string;
}

export class AgentBrowserCLI {
  private sessionPath: string;

  constructor(sessionName?: string) {
    const userDataDir = path.resolve(__dirname, '../../user_data');
    this.sessionPath = sessionName
      ? path.join(userDataDir, 'sessions', sessionName)
      : userDataDir;
  }

  /**
   * Execute agent-browser command and return output
   */
  private async exec(args: string[], json = true): Promise<any> {
    const command = 'agent-browser';
    const cmdArgs = json ? [...args, '--json'] : args;

    return new Promise((resolve, reject) => {
      const proc = spawn(command, cmdArgs);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`agent-browser exited with code ${code}: ${stderr}`));
        } else {
          resolve(json ? JSON.parse(stdout) : stdout);
        }
      });
    });
  }

  /**
   * Navigate to URL
   */
  async open(url: string, options: { headed?: boolean } = {}): Promise<void> {
    const args = options.headed ? ['open', url, '--headed'] : ['open', url];
    await this.exec(args, false);
  }

  /**
   * Get interactive snapshot with refs
   */
  async snapshot(options: { interactive?: boolean; depth?: number } = {}): Promise<Snapshot> {
    const args = ['snapshot'];
    if (options.interactive) args.push('-i');
    if (options.depth) args.push('-d', options.depth.toString());

    return await this.exec(args);
  }

  /**
   * Click element by ref
   */
  async click(ref: string): Promise<void> {
    await this.exec(['click', ref], false);
  }

  /**
   * Fill input by ref
   */
  async fill(ref: string, text: string): Promise<void> {
    await this.exec(['fill', ref, text], false);
  }

  /**
   * Get element text
   */
  async getText(ref: string): Promise<string> {
    return await this.exec(['get', 'text', ref]);
  }

  /**
   * Wait for condition
   */
  async wait(options: {
    text?: string;
    url?: string;
    timeout?: number;
  }): Promise<void> {
    const args = ['wait'];
    if (options.text) args.push('--text', options.text);
    if (options.url) args.push('--url', options.url);
    await this.exec(args, false);
  }

  /**
   * Set geolocation
   */
  async setGeolocation(latitude: number, longitude: number): Promise<void> {
    await this.exec(['set', 'geo', latitude.toString(), longitude.toString()], false);
  }

  /**
   * Save session state
   */
  async saveState(statePath: string): Promise<void> {
    await this.exec(['state', 'save', statePath], false);
  }

  /**
   * Load session state
   */
  async loadState(statePath: string): Promise<void> {
    await this.exec(['state', 'load', statePath], false);
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    await this.exec(['close'], false);
  }

  /**
   * Take screenshot
   */
  async screenshot(path?: string): Promise<Buffer> {
    const args = path ? ['screenshot', path] : ['screenshot'];
    return await this.exec(args);
  }
}
```

### 1.2 Update Task Runner

- [ ] **1.2 Status**: Pending

**File:** `src/core/index.ts`

**Changes:**
- Replace Page-based task interface with AgentBrowserCLI-based interface
- Update task loading to use new task format
- Update error handling for agent-browser

```typescript
import { AgentBrowserCLI } from '../config/browserCli';
import path from 'path';

// New task interface
interface TaskModule {
  run: (cli: AgentBrowserCLI) => Promise<void>;
}

async function main(): Promise<void> {
  // Parse --task argument
  const args = process.argv.slice(2);
  const taskArg = args.find(arg => arg.startsWith('--task='));
  if (!taskArg) {
    console.error('No task specified. Use --task=<task_name>');
    process.exit(1);
  }

  const taskName = taskArg.split('=')[1];

  // Load task module
  const taskPath = path.resolve(__dirname, `../../tasks/public/${taskName}.js`);
  const task: TaskModule = await import(taskPath);

  // Create CLI instance
  const cli = new AgentBrowserCLI(taskName);

  try {
    // Execute task with CLI instance
    await task.run(cli);
  } finally {
    // Ensure browser is closed
    await cli.close();
  }
}

main().catch(console.error);
```

### 1.3 Update Scheduler

- [ ] **1.3 Status**: Pending

**File:** `src/core/scheduler.ts`

**Changes:**
- Task execution command remains the same
- Task execution flow unchanged (spawn child processes)

---

## Phase 2: Task System Redesign

- [ ] **Phase 2 Status**: Not Started

### 2.1 New Task Template

- [ ] **2.1 Status**: Pending

**File:** `tasks/public/template.js`

Create new template for agent-browser tasks:

```javascript
/**
 * Ghost Runner Task Template (agent-browser)
 *
 * @param {import('../../src/config/browserCli').AgentBrowserCLI} cli - The CLI wrapper instance
 */
module.exports = {
  run: async (cli) => {
    // Example workflow:

    // 1. Navigate to page
    await cli.open('https://example.com');

    // 2. Get snapshot with interactive elements (returns JSON)
    const snapshot = await cli.snapshot({ interactive: true });

    console.log('Current page:', snapshot.title);
    console.log('Interactive elements:', snapshot.elements);

    // 3. Find element by role/name in snapshot
    const loginButton = snapshot.elements.find(
      el => el.role === 'button' && el.name === 'Login'
    );

    if (loginButton) {
      // 4. Click using the ref from snapshot
      await cli.click(loginButton.ref);

      // 5. Wait for navigation/result
      await cli.wait({ text: 'Welcome' });

      // 6. Re-snapshot to see new state
      const newSnapshot = await cli.snapshot({ interactive: true });
      console.log('After login:', newSnapshot.title);
    } else {
      console.log('Already logged in or button not found');
    }
  }
};
```

### 2.2 Create Helper Utilities

- [ ] **2.2 Status**: Pending

**File:** `src/utils/agentBrowserHelpers.ts`

```typescript
import { AgentBrowserCLI, Snapshot } from '../config/browserCli';

/**
 * Find element by role and name
 */
export function findByRole(
  snapshot: Snapshot,
  role: string,
  name?: string
): string | null {
  const element = snapshot.elements.find(
    el => el.role === role && (!name || el.name === name)
  );
  return element?.ref || null;
}

/**
 * Find element by text content
 */
export function findByText(snapshot: Snapshot, text: string): string | null {
  const element = snapshot.elements.find(
    el => el.text?.includes(text)
  );
  return element?.ref || null;
}

/**
 * Click element by role
 */
export async function clickByRole(
  cli: AgentBrowserCLI,
  role: string,
  name?: string
): Promise<boolean> {
  const snapshot = await cli.snapshot({ interactive: true });
  const ref = findByRole(snapshot, role, name);

  if (ref) {
    await cli.click(ref);
    return true;
  }
  return false;
}

/**
 * Extract all links from snapshot
 */
export function extractLinks(snapshot: Snapshot): Array<{text: string, ref: string}> {
  return snapshot.elements
    .filter(el => el.role === 'link')
    .map(el => ({
      text: el.name || el.text || '',
      ref: el.ref
    }));
}

/**
 * Wait for and click an element by text
 */
export async function clickByText(
  cli: AgentBrowserCLI,
  text: string,
  timeout = 5000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const snapshot = await cli.snapshot({ interactive: true });
    const ref = findByText(snapshot, text);

    if (ref) {
      await cli.click(ref);
      return true;
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * Fill form by field labels
 */
export async function fillForm(
  cli: AgentBrowserCLI,
  fields: Record<string, string>
): Promise<void> {
  const snapshot = await cli.snapshot({ interactive: true });

  for (const [label, value] of Object.entries(fields)) {
    // Find textbox by label
    const textbox = snapshot.elements.find(
      el => el.role === 'textbox' && el.name === label
    );

    if (textbox) {
      await cli.fill(textbox.ref, value);
    } else {
      console.warn(`Field not found: ${label}`);
    }
  }
}
```

---

## Phase 3: Dependencies & Configuration

- [ ] **Phase 3 Status**: Not Started

### 3.1 Package.json Updates

- [ ] **3.1 Status**: Pending

**Remove:**
- `playwright`
- `playwright-extra`
- `puppeteer-extra-plugin-stealth`

**Add:**
- `agent-browser` (install globally or as dev dependency)

```bash
# Install globally (recommended)
npm install -g agent-browser

# Or as project dependency
npm install --save-dev agent-browser
```

### 3.2 Update NPM Scripts

- [ ] **3.2 Status**: Pending

**File:** `package.json`

```json
{
  "scripts": {
    "bot": "tsx src/core/index.ts --task=",
    "schedule": "tsx src/core/scheduler.ts"
  }
}
```

---

## Phase 4: Session Management

- [ ] **Phase 4 Status**: Not Started

### 4.1 Save/Load Session State

- [ ] **4.1 Status**: Pending

**Update File:** `src/core/setup-login.ts`

```typescript
import { AgentBrowserCLI } from '../config/browserCli';
import path from 'path';

const STATE_FILE = path.resolve(__dirname, '../../user_data/auth.json');

async function main(): Promise<void> {
  const cli = new AgentBrowserCLI('setup');

  // Keep browser open for manual login
  await cli.open('https://example.com/login', { headed: true });

  console.log('Browser open. Log in manually, then press Ctrl+C to save session and exit.');

  process.on('SIGINT', async () => {
    try {
      await cli.saveState(STATE_FILE);
      console.log(`Session saved to ${STATE_FILE}`);
    } catch (err) {
      console.error('Failed to save session:', err);
    } finally {
      await cli.close();
      process.exit(0);
    }
  });
}

main().catch(console.error);
```

### 4.2 Load Saved Session in Tasks

- [ ] **4.2 Status**: Pending

```javascript
// In tasks that need authentication
module.exports = {
  run: async (cli) => {
    const path = require('path');
    const STATE_FILE = path.resolve(__dirname, '../../user_data/auth.json');

    // Load saved session
    await cli.loadState(STATE_FILE);

    // Navigate to authenticated page
    await cli.open('https://example.com/dashboard');

    // Continue with task...
  }
};
```

---

## Phase 5: Recording/Development Tools

- [ ] **Phase 5 Status**: Not Started

### 5.1 Update Task Recorder

- [ ] **5.1 Status**: Pending

**Option A:** Remove `src/core/record-new-task.ts` entirely and use agent-browser CLI directly

**Option B:** Create a helper script that launches agent-browser in interactive mode

```typescript
// src/core/record-new-task.ts
import { spawn } from 'child_process';

async function recordTask(): Promise<void> {
  // Launch agent-browser in interactive mode
  const proc = spawn('agent-browser', [], {
    stdio: 'inherit'
  });

  console.log('agent-browser launched. Use commands:');
  console.log('  open <url>           - Navigate to page');
  console.log('  snapshot -i          - Get interactive elements');
  console.log('  click @e1            - Click element by ref');
  console.log('  fill @e2 "text"      - Fill input');
  console.log('  state save path.json - Save session');
  console.log('  close                - Close browser');
}

recordTask();
```

---

## Phase 6: Web UI Integration

- [ ] **Phase 6 Status**: Not Started

### 6.1 Update Server Controllers

- [ ] **6.1 Status**: Pending

**Files to update:**
- `src/server/controllers/taskController.ts`
- `src/server/controllers/scheduleController.ts`

**Changes:**
- Task execution entry point unchanged
- Logs still stream via Socket.io
- Consider adding real-time snapshot viewing in UI

---

## Critical Files to Modify

| File Path | Action | Notes |
|-----------|--------|-------|
| `src/config/browserCli.ts` | **Create** | New CLI wrapper for agent-browser |
| `src/core/index.ts` | Rewrite | Pass AgentBrowserCLI to tasks |
| `src/core/scheduler.ts` | Minor update | Ensure correct command execution |
| `src/core/setup-login.ts` | Rewrite | Use agent-browser state commands |
| `src/core/record-new-task.ts` | Rewrite or remove | Simple wrapper or use CLI directly |
| `src/utils/agentBrowserHelpers.ts` | **Create** | Helper utilities for common patterns |
| `tasks/public/template.js` | Replace | New template with agent-browser examples |
| `package.json` | Update dependencies | Remove playwright-extra, add agent-browser |

---

## Verification Steps

### 1. Test Basic Browser Launch
```bash
npm run bot -- --task=test
```
Should launch browser using agent-browser.

### 2. Test Snapshot Workflow
Create a test task that:
- Navigates to a page
- Gets a snapshot (with JSON output)
- Logs the snapshot structure
- Extracts and logs specific elements

### 3. Test Session Persistence
```bash
npm run setup-login
```
Manually log in, close, then verify session persists using `state load`.

### 4. Test Scheduler
```bash
npm run schedule
```
Verify tasks execute at scheduled times.

### 5. Test Web UI
```bash
npm run ui
```
Verify task execution works through the web interface.

---

## Phase 7: Git Strategy & Commit Organization

- [ ] **Phase 7 Status**: Not Started

### 7.1 Migration Commit Strategy

- [ ] **7.1 Status**: Pending

**Note:** Phase 0 should already be completed before reaching this phase.

1. **Commit 1:** Install agent-browser, remove Playwright dependencies
2. **Commit 2:** Create CLI wrapper (`src/config/browserCli.ts`)
3. **Commit 3:** Migrate task runner (`src/core/index.ts`)
4. **Commit 4:** Create helper utilities (`src/utils/agentBrowserHelpers.ts`)
5. **Commit 5:** Update session management (`src/core/setup-login.ts`)
6. **Commit 6:** Create new task templates and examples
7. **Commit 7:** Update documentation (this file, CLAUDE.md, etc.)
8. **Commit 8:** Final testing and cleanup

---

## Phase 8: Documentation

- [ ] **Phase 8 Status**: Not Started

### 8.1 Create MIGRATION.md

- [ ] **8.1 Status**: Pending

**File:** `documentation/MIGRATION.md`

- Overview of why we migrated
- Key differences: CLI vs library
- Breaking changes
- How to convert old Playwright tasks to agent-browser
- Troubleshooting common issues

### 8.2 Update CLAUDE.md

- [ ] **8.2 Status**: Pending

- Remove Playwright-specific references
- Add agent-browser CLI patterns
- Update task template examples

---

## Example Task Patterns

### Pattern 1: Conditional Action Based on Page State

```javascript
module.exports = {
  run: async (cli) => {
    const { findByRole, clickByRole } = require('../../src/utils/agentBrowserHelpers');

    await cli.open('https://example.com');
    const snapshot = await cli.snapshot({ interactive: true });

    // Check if login button exists
    if (findByRole(snapshot, 'button', 'Login')) {
      console.log('Not logged in - logging in...');
      await clickByRole(cli, 'button', 'Login');

      // Fill and submit form
      await cli.fill('@e1', 'username');
      await cli.fill('@e2', 'password');
      await cli.click('@e3');
      await cli.wait({ text: 'Welcome' });
    } else {
      console.log('Already authenticated');
    }
  }
};
```

### Pattern 2: Data Extraction

```javascript
module.exports = {
  run: async (cli) => {
    const { extractLinks } = require('../../src/utils/agentBrowserHelpers');

    await cli.open('https://example.com/products');
    const snapshot = await cli.snapshot({ interactive: true });

    // Extract all links
    const links = extractLinks(snapshot);
    console.log('Found links:', links);

    // Get text from specific elements
    for (const link of links) {
      const text = await cli.getText(link.ref);
      console.log(`Link: ${text}`);
    }

    return links;
  }
};
```

### Pattern 3: Dynamic Navigation

```javascript
module.exports = {
  run: async (cli) => {
    const { findByRole } = require('../../src/utils/agentBrowserHelpers');

    await cli.open('https://example.com');
    let snapshot = await cli.snapshot({ interactive: true });

    // Follow different paths based on page content
    const dashboardRef = findByRole(snapshot, 'link', 'Dashboard');
    const setupRef = findByRole(snapshot, 'link', 'Setup');

    if (dashboardRef) {
      await cli.click(dashboardRef);
    } else if (setupRef) {
      await cli.click(setupRef);
    }

    // Re-snapshot after navigation
    snapshot = await cli.snapshot({ interactive: true });
    console.log('Current page:', snapshot.title);
  }
};
```

### Pattern 4: Form Submission

```javascript
module.exports = {
  run: async (cli) => {
    const { fillForm, findByRole } = require('../../src/utils/agentBrowserHelpers');

    await cli.open('https://example.com/contact');

    // Fill form using helper
    await fillForm(cli, {
      'Name': 'John Doe',
      'Email': 'john@example.com',
      'Message': 'Hello!'
    });

    // Submit form
    await clickByRole(cli, 'button', 'Submit');

    // Wait for confirmation
    await cli.wait({ text: 'Thank you' });
  }
};
```

---

## Migration Tasks Checklist

### Phase 0: Git Preparation (DO THIS FIRST)
- [x] Create `legacy/playwright` branch: `git checkout -b legacy/playwright`
- [x] Push legacy branch: `git push -u origin legacy/playwright`
- [x] Return to main: `git checkout main`
- [x] Verify legacy branch exists: `git branch -a`
- [x] Create `tasks/legacy/` folder structure
- [x] Move existing tasks to legacy (if any exist)

### Pre-Migration Setup
- [ ] Install agent-browser globally: `npm install -g agent-browser`
- [ ] Test agent-browser CLI: `agent-browser --version`

### Core Migration (Phase 1)
- [x] Create `src/config/browserCli.ts` CLI wrapper
- [x] Rewrite `src/core/index.ts` task runner
- [ ] Create `src/utils/agentBrowserHelpers.ts` utilities
- [ ] Update `src/core/scheduler.ts` (if needed)
- [ ] Rewrite `src/core/setup-login.ts`
- [ ] Decide on `src/core/record-new-task.ts` approach

### Task System (Phase 2)
- [ ] Create new `tasks/public/template.js`
- [ ] Create example tasks demonstrating all patterns
- [ ] Test example tasks manually

### Dependencies (Phase 3)
- [ ] Remove Playwright dependencies from package.json
- [ ] Add agent-browser dependency
- [ ] Update NPM scripts

### Session Management (Phase 4)
- [ ] Update session save/load implementation
- [ ] Test session persistence

### Recording Tools (Phase 5)
- [ ] Update or remove task recorder

### Web UI (Phase 6)
- [ ] Update server controllers
- [ ] Test Web UI integration

### Documentation (Phase 8)
- [ ] Create `documentation/MIGRATION.md`
- [ ] Update `CLAUDE.md`
- [ ] Update `README.md` if it exists

### Testing & Verification
- [ ] Test browser launch
- [ ] Test snapshot workflow
- [ ] Test session persistence (save/load)
- [ ] Test scheduler
- [ ] Test Web UI integration

### Post-Migration
- [ ] Tag v2.0.0
- [ ] Uninstall Playwright dependencies
- [ ] Clean up temporary files

---

## Rollback Plan

If migration fails:

1. Revert to `legacy/playwright` branch:
   ```bash
   git checkout legacy/playwright
   git checkout -b hotfix/rollback
   ```

2. Reinstall Playwright dependencies:
   ```bash
   npm install playwright playwright-extra puppeteer-extra-plugin-stealth
   ```

3. Verify functionality before proceeding

---

## Key Differences: Playwright vs agent-browser

| Aspect | Playwright (Library) | agent-browser (CLI) |
|--------|---------------------|---------------------|
| Integration | Direct API calls | child_process.spawn() |
| Output | JavaScript objects | JSON via --json flag |
| Session | `context.storageState()` | `state save/load` commands |
| Elements | Locators (CSS, XPath) | Refs from snapshot (@e1, @e2) |
| Best For | Complex automation | AI/agent integration |
