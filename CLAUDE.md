# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack Summary

| Layer | Technologies |
|-------|-------------|
| Backend | Node.js, TypeScript (tsx runtime), Express 5, Socket.io |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui (Radix UI) |
| Desktop | Electron 33, electron-builder |
| Automation | Playwright 1.57, playwright-extra, puppeteer-extra-plugin-stealth |
| Scheduling | node-cron, cron-parser |
| State | Socket.io (real-time), localStorage (dashboard layout) |
| Testing | Node.js built-in test runner (backend), Vitest + Testing Library (frontend) |

## Common Commands

### Development
```bash
npm run ui                 # Start dev environment (backend :3333 + frontend :5173)
npm run ui:prod            # Build frontend and start production server
cd frontend && npm run dev # Frontend dev server only (requires backend running)
cd frontend && npm run build # Build frontend for production
```

### Electron Desktop App
```bash
npm run electron:dev       # Build all and launch Electron desktop app (development)
npm run electron:start     # Start Electron app (requires build first)
npm run electron:dist      # Build distributable Electron app (.dmg/.zip for macOS)
```

### CLI / Automation
```bash
npm run setup-login        # Launch browser for manual login setup (saves to user_data/)
npm run verify-login       # Verify session persistence
npm run bot -- --task=name # Run a specific task via CLI
npm run record -- --name=mytask --type=private # Launch Playwright Codegen recorder
npm run schedule           # Run scheduler headless (reads from schedule.json)
```

### Testing
```bash
npm test                   # Backend tests (Node.js built-in runner)
npm run test:watch         # Backend tests in watch mode
npm run test:coverage      # Backend tests with coverage (c8)

cd frontend && npm run test        # Frontend unit tests (Vitest)
cd frontend && npm run test:ui     # Frontend tests with UI
cd frontend && npm run test:run    # Frontend tests single run
cd frontend && npm run test:coverage # Frontend tests with coverage
```

### Linting
```bash
npm run lint               # Run frontend linting
```

## Architecture Overview

Ghost Runner is a **hybrid CLI tool, Web UI, and Desktop App** for stealthy browser automation. The system supports two runtime modes:

### Development Mode
Three main layers running as separate processes:

1. **Core runtime** - Task execution + scheduler (child processes)
2. **Server** - Express + Socket.io (orchestration layer)
3. **Frontend** - React dashboard (UI layer)

```
┌─────────────────┐     REST/Socket.io     ┌─────────────────┐
│  Frontend       │ ◄─────────────────────► │  Server         │
│  (React + Vite) │                        │  (Express)      │
└─────────────────┘                        └────────┬────────┘
                                                    │ spawn
                                           ┌────────▼────────┐
                                           │  Task Runner    │
                                           │  (child_process)│
                                           └────────┬────────┘
                                                    │
                                           ┌────────▼────────┐
                                           │  Playwright     │
                                           │  (Core runtime) │
                                           └─────────────────┘
```

### Desktop Mode (Electron Shell)
The Electron app bundles server and frontend into a native desktop application:

```
┌────────────────────────────────────────────────────────────┐
│                    Electron Main Process                   │
│  (electron/main.ts)                                        │
│                                                            │
│  ┌──────────────────┐        ┌──────────────────────────┐ │
│  │ Backend Server   │        │ BrowserWindow            │ │
│  │ (dist/src/server)│◄──────►│ (loads frontend/dist)    │ │
│  └────────┬─────────┘        └──────────────────────────┘ │
│           │ spawn                                          │
│  ┌────────▼─────────┐                                      │
│  │ Task Runner      │                                      │
│  │ (child_process)  │                                      │
│  └────────┬─────────┘                                      │
│           │                                                │
│  ┌────────▼─────────┐                                      │
│  │ Playwright       │                                      │
│  └──────────────────┘                                      │
└────────────────────────────────────────────────────────────┘
```

### Core Runtime (`src/core/`)

| File | Purpose |
|------|---------|
| `index.ts` | CLI entry point. Parses `--task=`, launches browser, executes task module |
| `scheduler.ts` | Cron scheduler for recurring/one-time tasks. Spawns `tsx src/core/index.ts` |
| `record-new-task.ts` | Playwright Codegen launcher with stealth config |
| `errors.ts` | Structured error types: `TaskError`, `ElementNotFoundError`, `NavigationFailureError`, `TaskTimeoutError` |
| `pageWrapper.ts` | Monitored Playwright Page wrapper. Intercepts `goto`, `waitForSelector`, etc. to throw structured errors |
| `taskReporter.ts` | Emits status markers to stdout: `[TASK_STATUS:STARTED|COMPLETED|FAILED|COMPLETED_WITH_DATA]` |

### Server Layer (`src/server/`)

| Directory/File | Purpose |
|----------------|---------|
| `index.ts` | Express + Socket.io server. Exports `createGhostServer()` for Electron integration |
| `controllers/` | Request handlers for tasks, scheduler, settings, failures, logs, info-gathering |
| `routes/` | Express route definitions |
| `services/` | Business logic: `TaskRunner` (child process spawning), `TaskExecutionService` (orchestration), `SchedulerService` |
| `repositories/` | File-based data persistence: `TaskRepository`, `FailureRepository` |
| `utils/` | `taskParser` (stdout marker parsing), `taskValidators` (security validation) |
| `config.ts` | Backend constants including `FAILURES_FILE` |

### Electron Layer (`electron/`)

| File | Purpose |
|------|---------|
| `main.ts` | Electron main process. Configures runtime env, starts backend server, creates BrowserWindow |
| `preload.ts` | Context bridge exposing `window.ghostRunnerDesktop.isElectron` to renderer |

### Configuration Layer (`src/config/`)

| File | Purpose |
|------|---------|
| `runtimePaths.ts` | Runtime path resolution for both development and packaged Electron modes |
| `browserConfig.ts` | Browser launch configuration, profile management, stealth setup |

### Shared Types (`shared/types/`)

Centralized TypeScript types shared between frontend and backend:

| File | Types |
|------|-------|
| `schedule.ts` | `ScheduleItem`, `NextTask`, `ScheduleUpdatePayload` |
| `task.ts` | `Task`, `TaskType`, `LogEntry`, `TaskStatus`, `TaskStartedPayload`, `TaskCompletedPayload`, `TaskFailedPayload` |
| `failure.ts` | `FailureRecord`, `FailureErrorType`, `FailureRecordedPayload` |
| `settings.ts` | `Settings`, `GeolocationSettings`, `DEFAULT_LOCATION` |
| `infoGathering.ts` | `InfoGatheringResult`, `InfoDataUpdatedPayload` |
| `socket.ts` | `ServerToClientEvents`, `ClientToServerEvents`, `InterServerEvents`, `SocketData` |
| `index.ts` | Re-exports all types |

### Frontend (`frontend/src/`)

| Directory | Purpose |
|-----------|---------|
| `components/dashboard/` | Dashboard widgets: TaskList, ScheduleBuilder, TaskCalendar, SettingsManager, LogsConsole, WarningsPanel, ThemeSwitcher |
| `components/ui/` | shadcn/ui primitives (Radix UI) |
| `hooks/` | Custom React hooks including Socket.io integration |
| `lib/` | Utilities including `dashboardLayout.ts` (localStorage persistence with versioned migrations) |
| `themes/` | Theme configuration for dark/light mode |
| `types.ts` | Centralized TypeScript type definitions |

## Key Architectural Patterns

### 1. Runtime Paths System
- `runtimePaths.ts` resolves paths for both development and Electron packaged modes
- Environment variables control runtime behavior:
  - `GHOST_RUNNER_APP_ROOT` - Application root directory (set by Electron)
  - `GHOST_RUNNER_DATA_DIR` - User data directory (Electron: `~/Library/Application Support/ghost-runner/`)
- `initializeRuntimeStorage()` creates directories and copies bundled files to runtime locations
- Bundled files (from app package) vs runtime files (user-modifiable) are separate

### 2. Electron Server Integration
- Server exports `createGhostServer(options)` returning `{ app, io, httpServer, start, stop, getPort }`
- Electron main process controls server lifecycle (start/stop on app launch/quit)
- Dynamic port assignment (port: 0) avoids conflicts
- Graceful shutdown via `before-quit` handler

### 3. Persistent Sessions
- Browser uses `launchPersistentContext` with `user_data/` directory
- Manual login via `setup-login` saves authentication state
- Profile directory management supports custom profiles via settings
- **Never delete `user_data/`** if maintaining sessions

### 4. Stealth Configuration
- Browser launched through `playwright-extra` with `puppeteer-extra-plugin-stealth`
- Geolocation configured from `settings.json`
- Permissions granted via `context.grantPermissions()`
- Custom Chrome executable path support

### 5. Scheduler Task Execution
- Scheduler spawns child processes: `tsx src/core/index.ts --task=xxx`
- Each task runs in isolation (error handling prevents cascading failures)
- Task names validated for security (path traversal prevention)
- One-time tasks auto-removed from `schedule.json` after execution

### 6. Real-time Communication
- Socket.io streams logs and status updates
- Server stores `io` instance: `app.set('io', io)` for controller access
- Events: `task-started`, `task-completed`, `task-failed`, `log`, `scheduler-status`, `failure-recorded`, `info-data-updated`

### 7. Task Failure Tracking
- Page wrapped with `createMonitoredPage()` intercepts common failure points
- Structured errors thrown with context (element selector, URL, timeout duration)
- Status reported via stdout markers
- Failures persisted to `failures.json` with deduplication (same error within 24h increments count)
- Frontend WarningsPanel displays failures with color-coded error types

### 8. Info-Gathering Tasks
- Tasks can return data with metadata (category, TTL, data type)
- `taskReporter` emits `COMPLETED_WITH_DATA` marker with JSON payload
- Server stores in `info-gathering.json` with TTL-based expiration
- Frontend InfoGathering component displays cached results

### 9. Dashboard Layout System
- Stored in localStorage with versioning (current version 3)
- Migration system handles layout schema changes
- Drag-and-drop via `@dnd-kit/core` and `@dnd-kit/sortable`
- Supports minimize/restore per card (MinimizedCardsSidebar)

### 10. Development Runner
- `dev-runner.ts` spawns backend server with color-coded console output
- Handles graceful shutdown with proper process group management
- Frontend dev server proxied through backend for API calls

## Configuration Files

| File | Purpose | Managed By |
|------|---------|------------|
| `schedule.json` | Scheduler configuration (cron + executeAt) | Web UI / CLI |
| `settings.json` | Global settings (geolocation, headless, profileDir) | Web UI |
| `failures.json` | Task failure tracking (auto-created) | Server |
| `info-gathering.json` | Cached info-gathering data | Server |
| `user_data/` | Persistent browser profile | Playwright |
| `tsconfig.electron.json` | TypeScript config for Electron main process | Build |

## Build Outputs

| Directory | Contents |
|-----------|----------|
| `dist/` | Compiled backend TypeScript |
| `dist-electron/` | Compiled Electron main process |
| `frontend/dist/` | Production React build |
| `release/` | Electron distributable (.dmg, .zip) |

## API Endpoints

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/api/health` | - | Health check |
| GET | `/api/tasks` | TaskController | List available tasks |
| POST | `/api/tasks/run` | TaskController | Execute a task |
| POST | `/api/record` | RecordController | Start task recording |
| GET/PUT | `/api/schedule` | ScheduleController | Read/write schedule |
| POST | `/api/scheduler/start` | SchedulerController | Start scheduler |
| POST | `/api/scheduler/stop` | SchedulerController | Stop scheduler |
| GET | `/api/scheduler/status` | SchedulerController | Scheduler status |
| GET/PUT | `/api/settings` | SettingsController | Read/write settings |
| GET/DELETE | `/api/failures` | FailureController | List/clear failures |
| POST | `/api/failures/:id/dismiss` | FailureController | Dismiss failure |
| GET/DELETE | `/api/info-gathering` | InfoGatheringController | List/clear gathered data |
| POST | `/api/setup-login` | SetupLoginController | Run login setup |

## Data Structures

### Failure Record
```typescript
interface FailureRecord {
  id: string;
  taskName: string;
  errorType: 'ElementNotFoundError' | 'NavigationFailureError' | 'TaskTimeoutError' | 'UnknownError';
  context: string;
  timestamp: string;
  count: number;
  lastSeen: string;
  dismissed: boolean;
}
```

### Schedule Entry
```typescript
interface ScheduleEntry {
  taskName: string;
  cron?: string;        // For recurring tasks
  executeAt?: string;   // ISO timestamp for one-time tasks
  enabled: boolean;
}
```

### Task Metadata (Info-Gathering)
```typescript
interface TaskMetadata {
  category: string;
  ttl: number;          // Time-to-live in seconds
  dataType: string;
}
```

## Task System

Tasks are JavaScript modules in `tasks/public/` or `tasks/private/`:

```javascript
// Basic task
export async function run(page) {
  await page.goto('https://example.com');
  await page.waitForSelector('#content');
}

// Info-gathering task (returns data)
export async function run(page) {
  await page.goto('https://example.com');
  const title = await page.title();
  return {
    data: { title },
    metadata: { category: 'general', ttl: 3600, dataType: 'object' }
  };
}
```

Use `npm run record` to generate task code via Playwright Codegen.

## Important Implementation Details

- **Module System**: Backend uses CommonJS with `tsx` for runtime TypeScript; Frontend uses ES modules
- **Task Loading**: Dynamic `import()` with path construction for `tasks/public/` and `tasks/private/`
- **Geolocation**: Defaults to São Paulo coordinates; configurable via Web UI
- **Sleep Prevention**: On macOS, `caffeinate -i` starts when tasks scheduled, stops when none remain
- **Error Handling**: Global `uncaughtException`/`unhandledRejection` handlers emit Socket.io crash notifications
- **Type Safety**: Zero `any` types (except 4 Playwright internal cases). Error handling uses `unknown` with type guards
- **Electron Security**: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`

## File References for Common Tasks

| Task | Key Files |
|------|-----------|
| Add new API endpoint | `src/server/routes/*.ts`, `src/server/controllers/*.ts` |
| Modify task execution | `src/core/index.ts`, `src/server/services/TaskExecutionService.ts` |
| Add dashboard widget | `frontend/src/components/dashboard/*.tsx`, `frontend/src/App.tsx` |
| Change scheduler logic | `src/core/scheduler.ts`, `src/server/services/scheduler.ts` |
| Add new error type | `src/core/errors.ts`, `src/core/pageWrapper.ts`, `src/server/utils/taskParser.ts` |
| Modify dashboard layout | `frontend/src/lib/dashboardLayout.ts`, `frontend/src/components/dashboard/DashboardGrid.tsx` |
| Modify Electron shell | `electron/main.ts`, `electron/preload.ts` |
| Change runtime paths | `src/config/runtimePaths.ts` |
| Add shared type | `shared/types/*.ts`, `shared/types/index.ts` |
