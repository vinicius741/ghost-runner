# Repository Guidelines

## Project Structure & Module Organization
- `src/core/` runs headless tasks (`index.ts`, scheduler, recorder) while `src/utils/` and `src/config/` centralize reusable Playwright helpers; add new automation primitives here rather than inside tasks.
- `src/config/runtimePaths.ts` handles path resolution for both development and Electron packaged modes. It exports `APP_ROOT`, `DATA_ROOT`, `TASKS_DIR`, `USER_DATA_DIR`, and file paths used throughout the codebase.
- `src/server/` hosts the Express + Socket.io backend (`controllers/`, `routes/`, `public/` assets) that powers live logs and scheduler APIs; keep HTTP handlers thin and push work into services under `src/core/`.
- `electron/` contains the Electron main process (`main.ts`) and preload script (`preload.ts`) for desktop app packaging.
- `shared/types/` contains centralized TypeScript types shared between frontend and backend to prevent type drift.
- `frontend/` contains the Vite/React UI with shadcn/Tailwind components; app-level utilities live under `frontend/src/lib/` and dashboard widgets under `frontend/src/components/`.
- Automation scripts sit in `tasks/public/` (shared) and `tasks/private/` (local, gitignored); related fixtures go in the same folder for discoverability. Persistent browser data is under `user_data/`; JSON state (`schedule.json`, `settings.json`, `failures.json`) belongs at repo root.
- Tests reside in `test/**/*.test.js` using Node's built-in test runner.

## Build, Test, and Development Commands

### Development Mode
- `npm run ui` launches dev-runner (backend + hot-reloading frontend proxy) for local UI work.
- `npm run bot -- --task=my_task` executes a task via Playwright using the monitored page wrapper.
- `npm run record -- --name=my_task --type=public` captures new flows; use `--type=private` for sensitive work.
- `npm run schedule` starts the cron scheduler headless; `npm run ui:prod` builds the frontend then serves Express + static assets.
- Frontend-only builds use `npm run build:frontend`; setup scripts `npm run setup-login` / `npm run verify-login` maintain the persistent Chromium profile.

### Electron Desktop Mode
- `npm run electron:dev` builds frontend, server, and Electron main process, then launches the desktop app.
- `npm run electron:start` starts the Electron app (requires prior build).
- `npm run electron:dist` creates a distributable macOS .dmg/.zip in `release/`.
- Build order: `build:frontend` → `build:server` → `build:electron` → `electron:start`.

### Build Outputs
- `dist/` - Compiled backend TypeScript
- `dist-electron/` - Compiled Electron main process
- `frontend/dist/` - Production React build
- `release/` - Electron distributable packages

## Runtime Environment

### Development vs Packaged Paths
The `runtimePaths.ts` module resolves paths differently based on runtime mode:

**Development Mode:**
- `APP_ROOT` = current working directory
- `DATA_ROOT` = same as `APP_ROOT`
- All files read/write to project root

**Electron Packaged Mode:**
- `GHOST_RUNNER_APP_ROOT` = app bundle directory (set by Electron)
- `GHOST_RUNNER_DATA_DIR` = `~/Library/Application Support/ghost-runner/` (macOS)
- User-modifiable files stored in data directory
- Bundled files copied to data directory on first run via `initializeRuntimeStorage()`

When adding new file-based features, use exports from `runtimePaths.ts` rather than hardcoded paths.

## Coding Style & Naming Conventions
- TypeScript everywhere (CommonJS modules). Use 2-space indentation, single quotes, and named exports when possible; keep `TaskMetadata` colocated with modules in `src/core/`.
- Task files should follow `snake_case.js` to match CLI flags, and module folders should use kebab-case (e.g., `server/controllers/task-failures/`).
- Run `tsx` entrypoints directly instead of compiling; include top-of-file JSDoc where behavior warrants clarification.
- Shared types go in `shared/types/` with re-exports from `index.ts`. Import via `import type { Foo } from '@shared/types'` (frontend) or relative path (backend).

## Testing Guidelines
- Prefer Node's test runner via `npm test`; watch mode is `npm run test:watch`. Coverage is enforced with `npm run test:coverage` (c8, reporters: text/html/lcov); keep new features at or above the touched file's existing branch coverage.
- Name specs `<feature>.test.js` and mirror the folder layout (`test/server/tasks-controller.test.js`). Stub external HTTP via supertest and avoid touching `user_data/` in tests.

## Commit & Pull Request Guidelines
- Follow the conventional-commit verbs seen in history (`feat:`, `refactor:`, `docs:`). Scope optional but encouraged (e.g., `feat(server): add failure dedupe`).
- Each PR should describe behavior changes, list affected commands, reference issue IDs, and include UI screenshots or terminal output when touching dashboard or CLI surfaces.
- Require green `npm test` (and `npm run test:coverage` when logic-heavy) before requesting review; mention any manual flows executed (login setup, scheduler dry-runs).

## Security & Configuration Tips
- Never commit secrets or `user_data/`; populate `.env` locally and document required keys inside `documentation/` instead of code comments.
- When editing `schedule.json`, `settings.json`, or `failures.json`, validate via the UI afterward to ensure the parser accepts the schema.
- Electron security settings: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`. External URLs open in system browser, not Electron window.
