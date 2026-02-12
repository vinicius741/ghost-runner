# Ghost Runner

A stealthy browser automation tool built with Playwright and anti-detection plugins, featuring a modern React dashboard for managing tasks, schedules, and settings.

## Features

### Core Capabilities
- **Stealth Mode**: Persistent Chromium browser context with `playwright-extra` and `puppeteer-extra-plugin-stealth` to evade bot detection
- **Session Persistence**: Automatic cookie and session storage in `user_data/` directory
- **Geolocation Control**: Configurable browser geolocation via Web UI

### Task Management
- **Record & Replay**: Use Playwright Codegen to record tasks, then replay them headlessly
- **Public/Private Tasks**: Store shared tasks in `tasks/public/` or private tasks in `tasks/private/` (git-ignored)
- **Failure Tracking**: Automatic detection of element not found, navigation failures, and timeouts with deduplication

### Scheduling
- **Cron Jobs**: Schedule recurring tasks with preset or custom cron expressions
- **One-Time Tasks**: Execute tasks at a specific date/time (auto-removed after execution)
- **Calendar View**: Visualize all scheduled tasks with `react-big-calendar`
- **Sleep Prevention**: macOS `caffeinate` integration prevents system sleep during scheduled tasks

### Dashboard
- **Real-Time Logs**: Live execution log streaming via Socket.io
- **Drag-and-Drop Layout**: Customize dashboard panel arrangement (persisted in localStorage)
- **Dark/Light Themes**: Toggle between themes with system preference detection
- **Warnings Panel**: Track task failures with color-coded error types and occurrence counts
- **Info Gathering**: Dashboard for viewing data collected by info-gathering tasks

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Node.js, TypeScript, Express, Socket.io, tsx (runtime TS) |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, Radix UI |
| Automation | Playwright, playwright-extra, puppeteer-extra-plugin-stealth |
| Scheduling | node-cron, cron-parser |
| State | React Query, localStorage (dashboard layout) |

## Prerequisites

- **Node.js** v18+ (v20+ recommended)
- **npm** or compatible package manager
- **macOS or Linux** (Windows may work but is untested)

## Installation

```bash
git clone https://github.com/vinicius741/ghost-runner.git
cd ghost-runner
npm install
```

## Quick Start

### 1. First-Time Login Setup

To maintain persistent sessions (e.g., staying logged into Google):

```bash
npm run setup-login
```

A browser window opens. Log in to your desired services, then browse briefly to ensure session data is saved to `user_data/`.

Verify the session:

```bash
npm run verify-login
```

### 2. Start the Web UI

```bash
npm run ui
```

This starts:
- Backend server on `http://localhost:3333`
- Frontend dev server on `http://localhost:5173` (with API proxy)

Open `http://localhost:3333` in your browser.

### 3. Create Your First Task

1. Click **Record New Task** in the dashboard
2. Enter a task name and select public/private
3. Perform your browser actions in the Codegen window
4. Copy the generated code to the created task file
5. Run the task from the dashboard

## Commands Reference

### Development

| Command | Description |
|---------|-------------|
| `npm run ui` | Start dev environment (backend + frontend with hot reload) |
| `npm run ui:prod` | Build frontend and start production server |
| `cd frontend && npm run dev` | Start frontend dev server only |
| `cd frontend && npm run build` | Build frontend for production |

### CLI / Automation

| Command | Description |
|---------|-------------|
| `npm run bot -- --task=name` | Run a specific task via CLI |
| `npm run record -- --name=mytask --type=private` | Launch Playwright Codegen recorder |
| `npm run schedule` | Run scheduler headless |
| `npm run setup-login` | Launch browser for manual login setup |
| `npm run verify-login` | Verify session persistence |

### Testing

| Command | Description |
|---------|-------------|
| `npm test` | Run backend tests |
| `cd frontend && npm run test` | Run frontend unit tests (Vitest) |
| `cd frontend && npm run test:ui` | Run frontend tests with UI |
| `cd frontend && npm run test:coverage` | Run tests with coverage |

## Project Structure

```
ghost-runner/
├── src/                          # Backend source
│   ├── core/                     # Task runner, scheduler, recorder
│   │   ├── index.ts              # CLI entry point
│   │   ├── scheduler.ts          # Cron scheduler
│   │   ├── record-new-task.ts    # Codegen launcher
│   │   ├── errors.ts             # Structured error types
│   │   ├── pageWrapper.ts        # Monitored Playwright Page
│   │   └── taskReporter.ts       # Status reporting
│   ├── server/                   # Express + Socket.io server
│   │   ├── index.ts              # Server entry point
│   │   ├── controllers/          # API controllers
│   │   ├── routes/               # Route definitions
│   │   ├── services/             # Business logic
│   │   └── repositories/         # Data persistence
│   ├── config/                   # Browser configuration
│   └── utils/                    # Utility functions
├── frontend/                     # React frontend
│   └── src/
│       ├── components/           # React components
│       │   ├── dashboard/        # Dashboard widgets
│       │   └── ui/               # shadcn/ui primitives
│       ├── hooks/                # Custom React hooks
│       ├── lib/                  # Utilities
│       ├── themes/               # Theme configuration
│       └── types.ts              # TypeScript types
├── tasks/                        # Automation scripts
│   ├── public/                   # Shared tasks (tracked)
│   └── private/                  # Private tasks (git-ignored)
├── user_data/                    # Browser profile (DO NOT DELETE)
├── schedule.json                 # Scheduler configuration
├── settings.json                 # Global settings
├── failures.json                 # Task failure records
└── info-gathering.json           # Cached info-gathering data
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/tasks` | List available tasks |
| POST | `/api/tasks/run` | Execute a task |
| POST | `/api/record` | Start task recording |
| GET/PUT | `/api/schedule` | Read/write schedule |
| GET/PUT | `/api/settings` | Read/write settings |
| GET/DELETE | `/api/failures` | List/clear failures |
| POST | `/api/failures/:id/dismiss` | Dismiss a failure |
| GET/DELETE | `/api/info-gathering` | List/clear gathered data |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `task-started` | Server → Client | Task execution began |
| `task-completed` | Server → Client | Task finished successfully |
| `task-failed` | Server → Client | Task execution failed |
| `log` | Server → Client | Log line from task/scheduler |
| `scheduler-status` | Server → Client | Scheduler running status |
| `failure-recorded` | Server → Client | New failure recorded |
| `info-data-updated` | Server → Client | Info-gathering data updated |

## Task Template

Tasks are JavaScript modules that export a `run(page)` function:

```javascript
// tasks/public/my-task.js
export async function run(page) {
  await page.goto('https://example.com');
  await page.waitForSelector('#content');
  // Your automation logic here
}
```

## Documentation

- **[Architecture Review](documentation/Architecture%20Review.md)** - Detailed architecture diagrams and component interactions

## License

ISC
