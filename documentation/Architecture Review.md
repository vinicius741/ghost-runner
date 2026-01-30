# Ghost Runner Bot - Architecture Review

This document explains how the project is structured and how the main pieces interact at runtime.

## 1) High-level Architecture

Ghost Runner has three main layers that run as separate processes:

1. **Core runtime (task runner + scheduler)**
   - Executes Playwright tasks and reports status via stdout markers.
   - Provides a headless scheduler process that spawns tasks on cron / one-time schedules.

2. **Server (Express + Socket.io)**
   - Provides REST APIs for tasks, scheduler, settings, failures, logs, and info-gathering data.
   - Spawns task processes and streams logs/status to the UI via Socket.io.

3. **Frontend (React + Vite)**
   - Dashboard UI for running tasks, scheduling, viewing logs, failures, and info-gathering results.
   - Uses REST APIs for CRUD and Socket.io for live updates.

Data persistence is file-based (JSON files in repo root) plus a persistent Playwright profile under `user_data/`.

```
UI (React)  <---REST/Socket.io--->  Server (Express)
   |                                      |
   |                                      | spawn
   |                                      v
   |                               Task Runner (npm run bot)
   |                                      |
   |                                      v
   |                               Core runtime (Playwright)
   |                                      |
   |                               stdout markers
   |                                      v
   +------------------------------  Server parses + persists
```

```mermaid
flowchart LR
  UI[Frontend (React + Vite)] <--> API[Express + Socket.io]
  API -->|spawn| TR[TaskRunner (child_process)]
  TR -->|npm run bot| CORE[Core runtime (Playwright)]
  CORE -->|stdout markers| API

  API <--> FS[(JSON files: settings/schedule/failures/info)]
  CORE <--> UD[(user_data profile)]
  API -->|spawn| SCH[Scheduler process]
  SCH -->|tsx src/core/scheduler.ts| CORE
```

## 2) Core Runtime (src/core)

### 2.1 Task execution entrypoint
- **File**: `src/core/index.ts`
- **Behavior**:
  - Parses `--task=` CLI arg.
  - Resolves task script from `tasks/public`, `tasks/private`, or legacy `tasks/` root.
  - Launches a persistent Playwright browser context via `launchBrowser()`.
  - Wraps the Playwright page using `createMonitoredPage()` for structured failure detection.
  - Executes the task module’s `run(page)` method.
  - Emits structured status markers to stdout via `taskReporter`.

### 2.2 Page wrapper + structured errors
- **File**: `src/core/pageWrapper.ts`, `src/core/errors.ts`
- **Behavior**:
  - Wraps common Playwright methods (`goto`, `waitForSelector`, etc.).
  - Converts timeouts and navigation failures into structured errors.
  - Structured errors are serialized by `taskReporter` and consumed by the server.

### 2.3 Task result reporting
- **File**: `src/core/taskReporter.ts`
- **Behavior**:
  - Writes status markers to stdout in the format: `[TASK_STATUS:STATUS]{json}`.
  - These markers are parsed by the server to detect `STARTED`, `COMPLETED`, `FAILED`, and `COMPLETED_WITH_DATA`.
  - Info-gathering tasks can return data and metadata (category, TTL, data type).

### 2.4 Scheduler
- **File**: `src/core/scheduler.ts`
- **Behavior**:
  - Reads `schedule.json` and schedules cron or one-time tasks.
  - Spawns `tsx src/core/index.ts --task=...` for each run.
  - Removes one-time tasks from `schedule.json` after execution.
  - Uses `caffeinate` on macOS to prevent sleep while tasks remain.

### 2.5 Task recording
- **File**: `src/core/record-new-task.ts`
- **Behavior**:
  - Creates a task file under `tasks/public/` or `tasks/private/`.
  - Launches Playwright codegen with the current profile directory.

## 3) Server Layer (src/server)

### 3.1 Express + Socket.io server
- **File**: `src/server/index.ts`
- **Behavior**:
  - Serves API routes under `/api`.
  - Serves frontend build output (if present).
  - Shares a Socket.io instance with controllers.
  - Initializes `settings.json` on first run.

### 3.2 Routing and controllers
- **Routes**: `src/server/routes/*`
- **Controllers**: `src/server/controllers/*`
- **Key endpoints**:
  - `/api/tasks` → list tasks
  - `/api/tasks/run` → run task
  - `/api/record` → start codegen
  - `/api/setup-login` → run setup-login flow
  - `/api/schedule` → read/write `schedule.json`
  - `/api/scheduler/*` → start/stop status
  - `/api/settings` → read/write `settings.json`
  - `/api/failures` → read/clear/dismiss failures
  - `/api/info-gathering` → read/clear stored data

### 3.3 Service layer
- **TaskRunner** (`src/server/services/TaskRunner.ts`)
  - Spawns child processes (`npm run bot`, `npm run record`, `npm run setup-login`).
  - Streams stdout/stderr and process lifecycle events.

- **TaskExecutionService** (`src/server/services/TaskExecutionService.ts`)
  - Orchestrates task execution, parses stdout markers, and records failures.
  - Emits Socket.io events for status updates, logs, and info-gathering data.

- **SchedulerService** (`src/server/services/scheduler.ts`)
  - Spawns `npm run schedule` and relays logs/status via Socket.io.

### 3.4 Repository layer (file-based persistence)
- **TaskRepository** (`src/server/repositories/TaskRepository.ts`)
  - Discovers tasks in `tasks/public` / `tasks/private` / `tasks/`.

- **FailureRepository** (`src/server/repositories/FailureRepository.ts`)
  - Reads/writes `failures.json`.
  - Deduplicates failures within 24 hours.

### 3.5 Parsing and validation
- **Task status parsing**: `src/server/utils/taskParser.ts`
  - Interprets stdout markers emitted by the core runtime.

- **Task name validation**: `src/server/utils/taskValidators.ts`
  - Ensures task names are safe and valid.

## 4) Frontend (frontend/)

### 4.1 Entry + data flow
- **File**: `frontend/src/App.tsx`
- **Behavior**:
  - Fetches tasks, schedule, settings, failures, and info-gathering data via REST.
  - Subscribes to Socket.io events for live logs, scheduler status, and task status updates.

### 4.2 UI layout
- **Dashboard widgets** are under `frontend/src/components/` and state helpers under `frontend/src/lib/`.
- Drag-and-drop layout is persisted locally (browser storage).

## 5) Persistent Data / State

These files are the “database” for the system:

- `settings.json` → global browser settings (geolocation, headless, profile path).
- `schedule.json` → cron and one-time task schedule.
- `failures.json` → deduplicated task failures.
- `info-gathering.json` → cached results from info-gathering tasks.
- `scheduler.log` → scheduler process logs.
- `user_data/` → persistent Chromium profile storage.

## 6) Key Runtime Flows

### 6.1 Run a task from the UI
1. UI calls `POST /api/tasks/run`.
2. Server calls `TaskExecutionService.execute()`.
3. TaskRunner spawns `npm run bot -- --task=...`.
4. Core runtime launches browser, runs task.
5. Task emits status markers via stdout.
6. Server parses markers, records failures / data.
7. Socket.io broadcasts log/status events to UI.

### 6.2 Scheduler flow
1. UI saves `schedule.json` via `POST /api/schedule`.
2. Server restarts scheduler process.
3. Scheduler reads schedule and spawns tasks on time.
4. Each spawned task emits stdout markers as usual.

### 6.3 Info-gathering tasks
1. Task returns data and sets metadata (`TaskMetadata`).
2. `taskReporter` emits `COMPLETED_WITH_DATA` marker with payload.
3. Server stores data in `info-gathering.json` with TTL.
4. UI displays cached results and refreshes when updated.

### 6.4 Failure tracking
1. Structured task errors are emitted by the core runtime.
2. Server records them in `failures.json` with dedupe.
3. UI displays failures with counts and last-seen timestamps.

## 7) Architectural Characteristics

- **Process isolation**: Tasks run as child processes; the server orchestrates but does not execute Playwright directly.
- **IPC via stdout**: Status is communicated via stdout markers rather than RPC or message queues.
- **File-based persistence**: JSON files act as a lightweight database.
- **Persistent browser profile**: Sessions are maintained in `user_data/`.
- **Stealth mode**: Headless mode uses `playwright-extra` with stealth plugin.

## 8) Practical Entry Points (for understanding)

If you want to trace behavior end-to-end, start here:

- Task runtime: `src/core/index.ts`
- Scheduler: `src/core/scheduler.ts`
- Server startup: `src/server/index.ts`
- Task execution orchestration: `src/server/services/TaskExecutionService.ts`
- UI bootstrapping: `frontend/src/App.tsx`

---

If you want a deeper explanation of any component, tell me which area is confusing and I can expand it with flow diagrams or walk through specific files.
