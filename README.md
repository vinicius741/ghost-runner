# Ghost Runner Bot

A stealthy Node.js automation tool using Playwright and `puppeteer-extra-plugin-stealth` designed to run on macOS with a persistent Google Chrome profile.

## Features

- **Stealth Mode**: Uses a persistent Chrome User Profile and stealth plugins to evade detection.
- **Modular Architecture**: "Record & Replay" system to easily add new automation tasks.
- **Advanced Scheduler**: Configurable Cron-based scheduler to run multiple tasks at specific times.
- **Local Execution**: Runs directly on your macOS machine using your installed Google Chrome.

## Prerequisites

- **macOS**: This tool is configured to use the local Google Chrome on macOS.
- **Node.js**: Ensure Node.js is installed (`node -v`).
- **Google Chrome**: Must be installed at `/Applications/Google Chrome.app`.

## Installation

1.  Clone the repository or navigate to the project folder.
2.  Install dependencies:

    ```bash
    npm install
    ```

## 🚀 First-Time Setup (Crucial)

To enable Google Login and persistent sessions, you must manually log in once.

1.  **Run the Login Setup Script:**

    ```bash
    npm run setup-login
    ```

2.  **Log In Manually:**
    *   A Chrome window will open.
    *   Navigate to Google or any other site you need to authenticate with.
    *   Log in with your credentials.
    *   **Do not close the browser immediately.** Browse for a minute to ensure cookies are saved.

3.  **Close the Browser:**
    *   Manually close the Chrome window.

4.  **Verify Session:**
    *   Run the verification script:
        ```bash
        npm run verify-login
        ```
    *   The browser should open and you should be already logged in (e.g., at `myaccount.google.com`).

## 🛠 Usage

### 1. Recording New Tasks

The easiest way to create a new automation is to record yourself.

1.  Run the recorder:
    ```bash
    npm run record
    ```
2.  A browser window (logged in as you) and a "Playwright Inspector" window will open.
3.  Perform the actions you want to automate.
4.  Copy the code generated in the Inspector window.
5.  Create a new file in the `tasks/` folder (e.g., `tasks/mytask.js`) using the `tasks/template.js` as a base.
6.  Paste your recorded steps into the `run` function.

### 2. Running a Single Task

To run a specific task immediately:

```bash
npm run bot -- --task=task_name
# Example: npm run bot -- --task=mytask (if file is tasks/mytask.js)
```

### 3. Scheduling Tasks

1.  Open `schedule.json`.
2.  Add your task and the desired Cron schedule:

    ```json
    [
      { "task": "mytask", "cron": "0 9 * * *" },     // Runs every day at 9:00 AM
      { "task": "check_price", "cron": "*/30 * * * *" } // Runs every 30 minutes
    ]
    ```
3.  Start the Scheduler:

    ```bash
    npm run schedule
    ```
    *Or use the `Run Bot` shortcut on your desktop (see below).*

## 📱 Desktop Shortcut (macOS)

A `run_bot.command` file is included. You can double-click this file from Finder to launch the scheduler without opening a terminal manually.


## 💻 Web UI

The project now includes a Web UI for easier management of tasks and schedules.

1.  **Start the UI Server:**
    ```bash
    npm run ui
    ```
2.  **Open in Browser:**
    Navigate to `http://localhost:3000`.

### UI Features

*   **Task Dashboard**: View all available tasks, run them manually, and see real-time execution logs.
*   **Recorder**: Launch the recording tool directly from the browser.
*   **Schedule Builder**: A visual interface to manage your `schedule.json`. Add, edit, or remove scheduled tasks without touching the JSON file manually.
*   **Live Logs**: Watch the bot's activity stream in real-time.

---


## Project Structure

*   `index.js`: Main entry point for running single tasks.
*   `scheduler.js`: Manages the execution of scheduled tasks.
*   `browserConfig.js`: Centralized browser launch configuration (Stealth settings).
*   `tasks/`: Directory containing all automation task modules.
*   `user_data/`: **(Do not delete)** Stores your persistent browser profile (cookies, login sessions).
*   `schedule.json`: Configuration for the scheduler.
