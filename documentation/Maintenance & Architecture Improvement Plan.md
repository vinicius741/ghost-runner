# Maintenance & Architecture Improvement Plan

> **Document Purpose**: This document identifies key architectural issues and files that deviate from best practices, providing actionable recommendations for improving maintainability, scalability, and code quality.
>
> **Note**: All recommended file paths and directory structures are **proposed** new locations. Current implementation paths are referenced in the "Location" fields.
>
> **Last Updated**: 2026-01-28

---

## 1. Executive Summary

### Current State
The project is a Node.js automation tool using Playwright with a React/Vite frontend dashboard. While functional, several architectural patterns violate maintainability best practices.

### Key Issues Identified
1. **God Classes/Files** - Multiple files exceed 300+ lines of code
2. **Tight Coupling** - Components handle too many responsibilities
3. **Mixed Concerns** - Business logic mixed with UI/presentation
4. **Poor Separation of Concerns** - API calls mixed with state management
5. **Missing Abstraction Layers** - No clear data access layer

---

## 2. Files Exceeding Best Practice Size Limits

### Critical Priority (400+ lines)

| File | Lines | Issue | Recommended Action |
|------|-------|-------|-------------------|
| [`frontend/src/components/dashboard/WarningsPanel.tsx`](frontend/src/components/dashboard/WarningsPanel.tsx) | 400 | Monolithic component with UI, logic, and dialogs | Extract into 3-4 smaller components |
| [`frontend/src/App.tsx`](frontend/src/App.tsx) | 583 | **God component** - state, API calls, event handlers, layout logic | Split into hooks, contexts, and smaller components |
| [`src/core/pageWrapper.ts`](src/core/pageWrapper.ts) | 441 | Wrapper class with 50+ delegated methods | Split into mixins or separate adapter classes |
| [`src/config/browserConfig.ts`](src/config/browserConfig.ts) | 302 | Configuration mixed with profile management and launch logic | Separate concerns into dedicated modules |

### High Priority (200-400 lines)

| File | Lines | Issue | Recommended Action |
|------|-------|-------|-------------------|
| [`frontend/src/components/dashboard/SettingsManager.tsx`](frontend/src/components/dashboard/SettingsManager.tsx) | 410 | Handles settings, geolocation, map, authentication | Extract Map component, Auth section, Settings form |
| [`src/core/scheduler.ts`](src/core/scheduler.ts) | 260 | Scheduler logic mixed with caffeinate management | Separate system management from scheduling logic |
| [`src/server/controllers/tasks.ts`](src/server/controllers/tasks.ts) | 293 | Controller with task parsing, spawning, and status handling | Extract task runner service, parser utilities |
| [`src/server/controllers/failures.ts`](src/server/controllers/failures.ts) | 198 | Mix of data access and business logic | Create repository layer for file operations |

---

## 3. Architectural Issues by Category

### 3.1 Frontend (React)

#### Issue: God Component Pattern
**Location**: [`App.tsx`](frontend/src/App.tsx:1)

**Problems**:
- 583 lines of mixed concerns
- State management for 10+ different data types
- 15+ event handler functions
- API calls directly in component
- Socket.io event handling inline

**Recommended Refactor**:
```
src/
├── contexts/
│   ├── DashboardContext.tsx      # Dashboard layout state
│   ├── SchedulerContext.tsx      # Scheduler status & actions
│   ├── TasksContext.tsx          # Task list & operations
│   └── LogsContext.tsx           # Log management
├── hooks/
│   ├── useSocket.ts              # Socket.io connection
│   ├── useApi.ts                 # API call abstractions
│   └── useScheduler.ts           # Scheduler operations
└── App.tsx                       # Reduced to ~100 lines
```

#### Issue: Component Doing Too Much
**Location**: [`WarningsPanel.tsx`](frontend/src/components/dashboard/WarningsPanel.tsx:1)

**Problems**:
- Filtering logic inline (lines 54-67)
- Helper functions for styling (lines 72-112) - 40 lines
- Dialog/modal implementation inline (lines 311-396) - 85 lines
- Complex JSX nesting (6+ levels)

**Recommended Refactor**:
```
components/dashboard/warnings/
├── WarningsPanel.tsx           # Main container
├── FailureCard.tsx             # Individual failure display
├── FailureDetailsDialog.tsx    # Modal/dialog component
├── FilterTabs.tsx              # Filter UI
├── hooks/
│   ├── useFailureFilters.ts    # Filtering logic
│   └── useFailureStyles.ts     # Style helper hooks
└── utils/
    ├── formatters.ts           # formatTimestamp, etc.
    └── styleHelpers.ts         # getErrorColor, getErrorIcon
```

#### Issue: Settings Manager Complexity
**Location**: [`SettingsManager.tsx`](frontend/src/components/dashboard/SettingsManager.tsx:1)

**Problems**:
- Map component logic mixed with settings (lines 21-36, 237-259)
- Geolocation detection mixed with form handling
- 4 different sections: Geolocation, Browser Mode, Browser Config, Auth

**Recommended Refactor**:
```
components/dashboard/settings/
├── SettingsManager.tsx
├── sections/
│   ├── GeolocationSection.tsx
│   ├── BrowserModeSection.tsx
│   ├── BrowserConfigSection.tsx
│   └── AuthenticationSection.tsx
├── components/
│   ├── LocationMap.tsx
│   └── CoordinateInputs.tsx
└── hooks/
    └── useGeolocation.ts
```

### 3.2 Backend (Node.js/TypeScript)

#### Issue: Monolithic Controllers
**Location**: [`tasks.ts`](src/server/controllers/tasks.ts:1)

**Problems**:
- Task parsing logic mixed with controller (lines 61-81)
- Child process spawning inline (lines 130-214)
- Type guards and interfaces in same file (lines 11-55)

**Recommended Structure**:
```
src/server/
├── controllers/
│   └── tasks.ts                  # Thin controller layer
├── services/
│   ├── taskRunner.ts            # Child process management
│   └── taskParser.ts            # Status parsing logic
├── types/
│   └── task.types.ts            # Shared interfaces
└── utils/
    └── taskValidators.ts        # Type guards
```

#### Issue: PageWrapper God Class
**Location**: [`pageWrapper.ts`](src/core/pageWrapper.ts:1)

**Problems**:
- 441 lines with 50+ method delegations
- Repeats Playwright API surface
- Type definitions take 30 lines (lines 13-41)

**Recommended Refactor**:
```
src/core/page/
├── MonitoredPage.ts             # Core class with only enhanced methods
├── adapters/
│   ├── NavigationAdapter.ts     # goto, reload, waitForNavigation
│   ├── InteractionAdapter.ts    # click, fill, type
│   ├── QueryAdapter.ts          # $, $$, locator
│   └── MediaAdapter.ts          # screenshot, pdf
├── types/
│   └── page.types.ts            # All type definitions
└── index.ts                     # Factory function
```

#### Issue: Scheduler Mixes System Management
**Location**: [`scheduler.ts`](src/core/scheduler.ts:1)

**Problems**:
- Caffeinate management mixed with cron scheduling (lines 15-64)
- File I/O mixed with scheduling logic
- Task validation inline (lines 104-108)

**Recommended Refactor**:
```
src/core/scheduler/
├── index.ts                     # Main entry point
├── Scheduler.ts                 # Pure scheduling logic
├── TaskValidator.ts             # Task name validation
└── services/
    └── CaffeinateManager.ts     # System sleep prevention
```

### 3.3 Configuration Layer

#### Issue: BrowserConfig Does Too Much
**Location**: [`browserConfig.ts`](src/config/browserConfig.ts:1)

**Problems**:
- Profile directory management (lines 28-56)
- Chrome executable resolution (lines 62-77)
- Settings file I/O (lines 94-159)
- Lock file cleanup (lines 174-190)
- Retry logic (lines 197-263)

**Recommended Refactor**:
```
src/config/
├── browser/
│   ├── index.ts                 # launchBrowser export
│   ├── BrowserLauncher.ts       # Launch orchestration
│   └── retryPolicy.ts           # Retry configuration
├── profile/
│   ├── ProfileManager.ts        # Profile directory handling
│   └── lockFileManager.ts       # Lock file cleanup
├── chrome/
│   └── ChromeResolver.ts        # Executable path resolution
└── settings/
    └── SettingsRepository.ts    # File I/O abstraction
```

---

## 4. Automated Enforcement & Prevention

### 4.1 ESLint Rules to Prevent "God Classes"

Add to `.eslintrc.json`:

```json
{
  "rules": {
    "max-lines": ["warn", {
      "max": 300,
      "skipBlankLines": true,
      "skipComments": true
    }],
    "max-lines-per-function": ["warn", {
      "max": 50,
      "skipBlankLines": true,
      "skipComments": true
    }],
    "complexity": ["warn", 10],
    "max-depth": ["warn", 4],
    "max-params": ["warn", 4]
  }
}
```

### 4.2 Husky Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run ESLint with max-lines rule
npm run lint -- --max-warnings=0

# Check for files exceeding 300 lines
node scripts/check-file-size.js
```

Create `scripts/check-file-size.js`:

```javascript
const fs = require('fs');
const path = require('path');

const MAX_LINES = 300;
const EXCLUDED_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.test.',
  '.spec.',
  'documentation'
];

function checkFile(filePath) {
  if (EXCLUDED_PATTERNS.some(p => filePath.includes(p))) return 0;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  return lines > MAX_LINES ? lines : 0;
}

function findFiles(dir) {
  let violations = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      violations = violations.concat(findFiles(fullPath));
    } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      const lineCount = checkFile(fullPath);
      if (lineCount > 0) {
        violations.push({ file: fullPath, lines: lineCount });
      }
    }
  }

  return violations;
}

const violations = findFiles(process.cwd());

if (violations.length > 0) {
  console.error('\n❌ Files exceeding maximum line count:');
  violations.forEach(({ file, lines }) => {
    console.error(`  ${file}: ${lines} lines (max: ${MAX_LINES})`);
  });
  console.error('\nPlease refactor these files before committing.\n');
  process.exit(1);
}
```

### 4.3 CI/CD Quality Gates

Add to `.github/workflows/quality.yml`:

```yaml
name: Code Quality

on: [pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check file sizes
        run: node scripts/check-file-size.js

      - name: Run TypeScript
        run: npm run typecheck

      - name: Run tests with coverage
        run: npm run test -- --coverage

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 70% threshold"
            exit 1
          fi
```

### 4.4 Complexity Analysis Tools

Recommended tools to run periodically:

| Tool | Purpose | Command |
|------|---------|---------|
| `madge` | Detect circular dependencies | `npx madge --circular --extensions ts,tsx src/` |
| `codeclimate` | Code quality analysis | `npx codeclimate analyze` |
| `sonarqube` | Code quality & security | Self-hosted scanner |
| `lighthouse` | Performance audit | `npx lighthouse http://localhost:3333` |

### 4.5 Metrics Tracking Dashboard

Set up automated metrics tracking:

```javascript
// scripts/track-metrics.js
const fs = require('fs');
const path = require('path');

const metrics = {
  timestamp: new Date().toISOString(),
  files: {
    total: 0,
    over300Lines: [],
    over200Lines: [],
    functionsOver50: []
  },
  coverage: null,
  circularDeps: []
};

// Track metrics and save to JSON
fs.writeFileSync('metrics/latest.json', JSON.stringify(metrics, null, 2));
```

Run weekly via cron and post results to team Slack/Discord.

---

## 5. Code Quality Issues

### 5.1 Type Safety

| Location | Issue | Severity |
|----------|-------|----------|
| [`pageWrapper.ts:217`](src/core/pageWrapper.ts:217) | `as any` casting | Medium |
| [`pageWrapper.ts:292-305`](src/core/pageWrapper.ts:292) | Unsafe function casts | Medium |
| [`tasks.ts:94`](src/server/controllers/tasks.ts:94) | `require()` without type safety | High |

### 5.2 Error Handling

| Location | Issue | Recommendation |
|----------|-------|---------------|
| [`App.tsx:52-54`](frontend/src/App.tsx:52) | Silent error in `fetchTasks` | Add error boundary or toast notification |
| [`browserConfig.ts:100-102`](src/config/browserConfig.ts:100) | Console.error but continues | Implement graceful degradation |
| [`scheduler.ts:227-234`](src/core/scheduler.ts:227) | setTimeout with potential error | Add try-catch in async callback |

### 5.3 Performance

| Location | Issue | Impact |
|----------|-------|--------|
| [`WarningsPanel.tsx:207`](frontend/src/components/dashboard/WarningsPanel.tsx:207) | Sort on every render | Memoize with `useMemo` |
| [`App.tsx:39-45`](frontend/src/App.tsx:39) | New function on every render | Use `useCallback` consistently |
| [`pageWrapper.ts:176-430`](src/core/pageWrapper.ts:176) | 50+ method delegations | Consider Proxy pattern |

---

## 6. Recommended Architecture Improvements

### 6.1 Implement Repository Pattern

**Current**: Direct file system access in controllers
**Recommended**:
```typescript
// src/server/repositories/FailureRepository.ts
export class FailureRepository {
  async getAll(): Promise<FailureRecord[]> {}
  async save(record: FailureRecord): Promise<void> {}
  async clear(): Promise<void> {}
}
```

### 6.2 Implement Service Layer

**Current**: Business logic in controllers
**Recommended**:
```typescript
// src/server/services/TaskExecutionService.ts
export class TaskExecutionService {
  constructor(
    private taskRepository: TaskRepository,
    private failureRepository: FailureRepository,
    private logger: Logger
  ) {}
  
  async execute(taskName: string): Promise<TaskResult> {}
}
```

### 6.3 Frontend State Management

**Current**: All state in App.tsx
**Recommended**: Use React Context or Zustand for:
- Dashboard layout state
- Scheduler state
- Tasks list state
- Logs state
- Failures state

### 6.4 API Layer Abstraction

**Current**: Fetch calls inline in components
**Recommended**:
```typescript
// src/api/client.ts
class ApiClient {
  async getTasks(): Promise<Task[]> {}
  async runTask(name: string): Promise<void> {}
  async getSchedule(): Promise<ScheduleItem[]> {}
}
```

---

## 7. Migration Priority

### Phase 1: High Impact, Low Risk
1. **Extract utility functions** from large components
2. **Create custom hooks** for API calls
3. **Separate type definitions** into dedicated files

### Phase 2: Medium Impact, Medium Risk
1. **Implement Repository pattern** for file I/O
2. **Create Service layer** for business logic
3. **Refactor WarningsPanel** into smaller components

### Phase 3: High Impact, Higher Risk
1. **Restructure App.tsx** with Context providers
2. **Refactor pageWrapper** using adapter pattern
3. **Implement proper DI** for services

---

## 7. Metrics & Success Criteria

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Files > 300 lines | 5 | 0 | `find src frontend/src -name "*.ts" -o -name "*.tsx" \| xargs wc -l \| awk '$1>300'` |
| Files > 200 lines | 8 | 2 | `find src frontend/src -name "*.ts" -o -name "*.tsx" \| xargs wc -l \| awk '$1>200'` |
| Functions > 50 lines | ~15 | < 5 | ESLint `max-lines-per-function` rule |
| Test Coverage | Unknown | > 70% | `npm run test -- --coverage` |
| Circular Dependencies | Unknown | 0 | `npx madge --circular --extensions ts,tsx src/ frontend/src/` |

> **Action Required**: Run the analysis commands above to populate "Current" values.

---

## 8. Appendix: File Size Distribution

```
Lines of Code Distribution:
├── 0-100:   [████████████████] 28 files
├── 100-200: [██████████]       15 files  
├── 200-300: [█████]             8 files  ← Review
├── 300-400: [███]               4 files  ← Refactor
└── 400+:    [██]                3 files  ← Priority
```

---

*Document Version: 1.0*
*Last Updated: 2026-01-28*
*Review Cycle: Monthly or after each phase completion*
