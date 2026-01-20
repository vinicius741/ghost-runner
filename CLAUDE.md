# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run ui` - Start development environment (runs both backend server and frontend dev server with hot reload). Backend on :3333, frontend on :5173 with Vite proxy.
- `cd frontend && npm run dev` - Start frontend dev server only (requires backend running separately)
- `cd frontend && npm run build` - Build frontend for production
- `npm run lint` - Run frontend linting

### Production
- `npm run ui:prod` - Build frontend and start production server on :3333 (serves both API and built frontend)
- `npm run deploy:frontend` - Build frontend and copy to backend static files

### CLI / Automation
- `npm run setup-login` - Launch browser for manual Google/login setup (saves session to `user_data/`)
- `npm run verify-login` - Verify session persistence
- `npm run bot -- --task=task_name` - Run a specific task via CLI
- `npm run record -- --name=mytask --type=private` - Launch Playwright Codegen recorder
- `npm run schedule` - Run scheduler headless (reads from `schedule.json`)

### Frontend Development
The frontend is a React + TypeScript app built with Vite:
- `cd frontend && npm install` - Install frontend dependencies
- `cd frontend && npm run dev` - Start Vite dev server (:5173)
- `cd frontend && npm run build` - TypeScript check + build
- `cd frontend && npm run preview` - Preview production build locally

## Architecture Overview

Ghost Runner is a **hybrid CLI tool and Web UI** for stealthy browser automation using Playwright with anti-detection plugins.

### Core Architecture

**Backend (Node.js, TypeScript):**
- `src/core/index.ts` - Main task runner (CLI entry point). Accepts `--task=` argument, loads browser with stealth config, executes tasks from `tasks/` directory. Now wraps Page with monitored wrapper for structured error tracking.
- `src/core/scheduler.ts` - Cron scheduler supporting both recurring (cron expressions) and one-time tasks. Auto-removes executed one-time tasks from `schedule.json`. Includes macOS `caffeinate` integration to prevent system sleep when tasks are scheduled. Uses `tsx` for runtime TypeScript execution.
- `src/core/errors.ts` - Structured error types for task failure tracking: `TaskError`, `ElementNotFoundError`, `NavigationFailureError`, `TaskTimeoutError`.
- `src/core/pageWrapper.ts` - Monitored Playwright Page wrapper that intercepts common failure points (waitForSelector, goto, waitForNavigation) and throws structured errors.
- `src/core/taskReporter.ts` - Task execution status reporting via stdout markers: `[TASK_STATUS:STARTED]`, `[TASK_STATUS:COMPLETED]`, `[TASK_STATUS:FAILED]`.
- `src/core/record-new-task.ts` - Playwright Codegen launcher with stealth configuration for recording tasks.
- `src/config/browserConfig.ts` - Stealth browser configuration using `playwright-extra` + `puppeteer-extra-plugin-stealth`. Launches persistent context with `user_data/` directory for session persistence.
- `src/server/index.ts` - Express server with Socket.io for Web UI and real-time logs.
- `src/server/routes/` + `src/server/controllers/` - API endpoints for tasks, scheduler, settings, logs, and failures.
- `src/server/config.ts` - Backend configuration constants including `FAILURES_FILE`.

**Frontend (React + TypeScript):**
- Built with Vite, Tailwind CSS, and shadcn/ui components (Radix UI primitives)
- `frontend/src/components/dashboard/` - Main dashboard components (TaskList, ScheduleBuilder, TaskCalendar, SettingsManager, LogsConsole, NextTaskTimer, WarningsPanel)
- `frontend/src/lib/dashboardLayout.ts` - Dashboard layout system with localStorage persistence and versioned migrations
- Uses Socket.io client for real-time log streaming and task status updates
- Calendar view powered by `react-big-calendar`
- Drag-and-drop dashboard layout using `@dnd-kit/core` and `@dnd-kit/sortable`

**Task System:**
- Tasks are JavaScript modules in `tasks/public/` (shared) or `tasks/private/` (git-ignored)
- Each task exports a `run(page)` async function that receives a Playwright Page object
- Use `npm run record` to generate task code, then paste into task files using the template in `tasks/public/template.js`

**Configuration Files:**
- `schedule.json` - Scheduler configuration (managed via Web UI, supports cron and executeAt)
- `settings.json` - Global settings (geolocation, etc.)
- `failures.json` - Task failure tracking (auto-created, managed via Web UI)
- `user_data/` - Persistent browser profile (cookies, localStorage). **DO NOT delete** if maintaining sessions.

### Key Architectural Patterns

1. **Persistent Sessions:** Browser uses `launchPersistentContext` with `user_data/` directory. Manual login via `setup-login` script saves authentication state.

2. **Stealth Configuration:** Browser launched through `playwright-extra` with stealth plugin applied. Configuration includes geolocation from `settings.json` and permissions granted via `context.grantPermissions()`.

3. **Scheduler Task Execution:** Scheduler spawns child processes (`tsx src/core/index.ts --task=xxx`) to isolate task execution. Each task runs independently with error handling to prevent cascading failures. Task names are validated for security.

4. **Real-time Communication:** Web UI uses Socket.io to stream logs and status updates. Server stores `io` instance in `app.set('io', io)` for controller access. Events include: `task-started`, `task-completed`, `task-failed`, `failure-recorded`, `failures-cleared`, `failure-dismissed`.

5. **Task Failure Tracking:**
   - Page is wrapped with `createMonitoredPage()` which intercepts common failure points
   - Structured errors (`ElementNotFoundError`, `NavigationFailureError`, `TaskTimeoutError`) are thrown with context
   - Task status is reported via stdout markers: `[TASK_STATUS:STARTED|COMPLETED|FAILED]`
   - Failures are persisted to `failures.json` with deduplication (same error within 24h increments count)
   - Frontend WarningsPanel displays failures with color-coded error types and occurrence counts

6. **Development Runner:** `dev-runner.ts` spawns the backend server with color-coded console output. The server serves both API endpoints and the built frontend (from `frontend/dist`). Handles graceful shutdown with proper process group management.

7. **Type Safety:** The codebase is fully TypeScript with zero `any` types (except 4 unavoidable Playwright internal cases). Error handling uses `unknown` with type guards. Type definitions are centralized in `frontend/src/types.ts` and backend controllers.

## Important Implementation Details

- **Module System:** Backend uses TypeScript compiled at runtime with `tsx`, Frontend uses ES modules (`import`/`export`)
- **Task Loading:** Tasks are loaded dynamically using dynamic `import()` with path construction to support both `tasks/public/` and `tasks/private/` directories
- **Geolocation:** Browser geolocation defaults to São Paulo coordinates but can be configured via Web UI settings
- **Sleep Prevention:** On macOS, `caffeinate -i` is started when tasks are scheduled and stopped when no tasks remain
- **One-Time Task Cleanup:** After execution, one-time tasks are filtered out of `schedule.json` by matching both task name and executeAt timestamp
- **Error Handling:** Global `uncaughtException` and `unhandledRejection` handlers emit crash notifications via Socket.io. All controllers use `error: unknown` with type guards instead of `any`.
- **Dashboard Layout:** Stored in localStorage with versioning (current version 3). Migration system handles layout changes. Supports drag-and-drop between left and right columns using `@dnd-kit`.
- **API Endpoints:**
  - `GET /api/health` - Health check
  - `GET /api/failures` - Retrieve all failure records
  - `DELETE /api/failures` - Clear all failures
  - `POST /api/failures/:id/dismiss` - Dismiss specific failure
- **Failure Record Structure:** `{ id, taskName, errorType, context, timestamp, count, lastSeen, dismissed }`
