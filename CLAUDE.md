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

**Backend (Node.js, CommonJS):**
- `src/core/index.js` - Main task runner (CLI entry point). Accepts `--task=` argument, loads browser with stealth config, executes tasks from `tasks/` directory.
- `src/core/scheduler.js` - Cron scheduler supporting both recurring (cron expressions) and one-time tasks. Auto-removes executed one-time tasks from `schedule.json`. Includes macOS `caffeinate` integration to prevent system sleep when tasks are scheduled.
- `src/core/record-new-task.js` - Playwright Codegen launcher with stealth configuration for recording tasks.
- `src/config/browserConfig.js` - Stealth browser configuration using `playwright-extra` + `puppeteer-extra-plugin-stealth`. Launches persistent context with `user_data/` directory for session persistence.
- `src/server/index.js` - Express server with Socket.io for Web UI and real-time logs.
- `src/server/routes/` + `src/server/controllers/` - API endpoints for tasks, scheduler, settings, and logs.

**Frontend (React + TypeScript):**
- Built with Vite, Tailwind CSS, and shadcn/ui components (Radix UI primitives)
- `frontend/src/components/dashboard/` - Main dashboard components (TaskList, ScheduleBuilder, TaskCalendar, SettingsManager, LogsConsole, NextTaskTimer)
- Uses Socket.io client for real-time log streaming
- Calendar view powered by `react-big-calendar`

**Task System:**
- Tasks are JavaScript modules in `tasks/public/` (shared) or `tasks/private/` (git-ignored)
- Each task exports a `run(page)` async function that receives a Playwright Page object
- Use `npm run record` to generate task code, then paste into task files using the template in `tasks/public/template.js`

**Configuration Files:**
- `schedule.json` - Scheduler configuration (managed via Web UI, supports cron and executeAt)
- `settings.json` - Global settings (geolocation, etc.)
- `user_data/` - Persistent browser profile (cookies, localStorage). **DO NOT delete** if maintaining sessions.

### Key Architectural Patterns

1. **Persistent Sessions:** Browser uses `launchPersistentContext` with `user_data/` directory. Manual login via `setup-login` script saves authentication state.

2. **Stealth Configuration:** Browser launched through `playwright-extra` with stealth plugin applied. Configuration includes geolocation from `settings.json` and permissions granted via `context.grantPermissions()`.

3. **Scheduler Task Execution:** Scheduler spawns child processes (`node index.js --task=xxx`) to isolate task execution. Each task runs independently with error handling to prevent cascading failures.

4. **Real-time Communication:** Web UI uses Socket.io to stream logs and status updates. Server stores `io` instance in `app.set('io', io)` for controller access.

5. **Development Runner:** `dev-runner.js` spawns the backend server with color-coded console output. The server serves both API endpoints and the built frontend (from `frontend/dist`). Handles graceful shutdown.

## Important Implementation Details

- **Module System:** Backend uses CommonJS (`require`/`module.exports`), Frontend uses ES modules (`import`/`export`)
- **Task Loading:** Tasks are loaded dynamically using `require()` with path construction to support both `tasks/public/` and `tasks/private/` directories
- **Geolocation:** Browser geolocation defaults to São Paulo coordinates but can be configured via Web UI settings
- **Sleep Prevention:** On macOS, `caffeinate -i` is started when tasks are scheduled and stopped when no tasks remain
- **One-Time Task Cleanup:** After execution, one-time tasks are filtered out of `schedule.json` by matching both task name and executeAt timestamp
- **Error Handling:** Global `uncaughtException` and `unhandledRejection` handlers emit crash notifications via Socket.io
