# Ghost Runner Bot

A stealthy Node.js automation tool using Playwright and `puppeteer-extra-plugin-stealth`, featuring a modern React-based Web UI for managing tasks, schedules, and settings.

## Features

- **Stealth Mode**: Uses a persistent browser context (Chromium) and stealth plugins to evade detection.
- **Web UI**: A full-featured React dashboard (built with `shadcn/ui`, Tailwind CSS) to manage the bot.
- **Task Management**: Record and replay tasks. Support for **Public** (shared) and **Private** (git-ignored) tasks.
- **Advanced Scheduler**:
    - **Cron Jobs**: Recurring tasks (e.g., "Every day at 9 AM").
    - **One-Time Tasks**: Schedule a specific date/time for execution. The system automatically executes and removes them from the schedule.
    - **Calendar View**: Visualize your schedule with `react-big-calendar`.
- **Real-Time Logs**: Watch execution logs live via the Web UI (powered by Socket.io).
- **Geolocation Control**: Configurable geolocation settings for browser contexts.
- **Cross-Platform**: Configured to run on macOS and Linux (uses bundled Playwright Chromium).

## Prerequisites

- **Node.js**: Ensure Node.js is installed (v16+ recommended).
- **Browser**: The tool uses Playwright's bundled Chromium, so manual Chrome installation is not strictly required, though it mimics a real Chrome environment.

## Installation

1.  Clone the repository.
2.  Install dependencies:

    ```bash
    npm install
    ```

    *Note: This will also install the necessary Playwright browsers.*

## 🚀 First-Time Setup (Crucial)

To enable persistent sessions (like staying logged into Google), you must manually log in once.

1.  **Run the Login Setup Script:**

    ```bash
    npm run setup-login
    ```

2.  **Log In Manually:**
    *   A browser window will open.
    *   Log in to your desired services (e.g., Google).
    *   Browse for a minute to ensure cookies/session data are saved to `user_data/`.

3.  **Verify Session:**
    ```bash
    npm run verify-login
    ```

## 💻 Web UI & Usage

The primary way to interact with the bot is through the Web UI.

### 1. Start the UI Server

This command builds the frontend (React) and starts the backend server:

```bash
npm run ui
```

Navigate to `http://localhost:3333` in your browser. (The server will automatically find an available port if 3333 is in use.)

### 2. UI Features

*   **Dashboard**: View and run tasks manually.
    *   **Public Tasks**: Stored in `tasks/public/`.
    *   **Private Tasks**: Stored in `tasks/private/`.
*   **Recorder**: Launch the "Record New Task" tool directly from the browser.
*   **Schedule Builder**:
    *   Add **Recurring Tasks** using Cron presets or custom expressions.
    *   Add **One-Time Tasks** by selecting a specific date and time.
    *   **Calendar**: View all upcoming scheduled executions.
*   **Settings**: Configure global settings like **Geolocation** (Latitude/Longitude) for the browser instance.
*   **Logs**: Real-time console output from the bot and scheduler.

## 🛠 Command Line Usage

While the UI is recommended, you can still use the CLI.

### Run a Task
```bash
npm run bot -- --task=task_name
```

### Record a Task
```bash
npm run record -- --name=mytask --type=private
```

### Run the Scheduler (Headless)
```bash
npm run schedule
```

## Project Structure

*   `frontend/`: React application (TypeScript, Vite, Tailwind, shadcn/ui).
*   `src/`: Backend source code.
    *   `core/`: Core logic (`scheduler.js`, `record-new-task.js`, `index.js`).
    *   `server/`: Express server and Socket.io handlers.
    *   `config/`: Configuration files (e.g., `browserConfig.js`).
    *   `utils/`: Helper scripts (`run-setup-login.js`).
*   `tasks/`: Directory containing automation scripts.
*   `user_data/`: Stores persistent browser profile (cookies, sessions). **Do not delete if you want to keep sessions.**
*   `schedule.json`: JSON configuration for the scheduler (managed via UI).
*   `settings.json`: JSON configuration for global settings (managed via UI).

## Development

If you are developing the frontend:

1.  Navigate to `frontend/`: `cd frontend`
2.  Install dependencies: `npm install`
3.  Run dev server: `npm run dev` (Note: Backend API calls require the backend server running on port 3333).
