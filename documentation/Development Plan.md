**Project Context for the Developer:**
> "Build a Node.js automation tool using Playwright with `playwright-extra` and `puppeteer-extra-plugin-stealth` to evade bot detection. The tool will run locally on macOS. It must use a persistent Chrome User Profile to handle Google Authentication (manual login, automated persistence). It requires a Cron Job for scheduling."

---

### Phase 1: Project Initialization & Environment Setup
**Goal:** Establish the codebase, install dependencies, and ensure the basic Playwright environment works on macOS.

* **Task 1.1:** Initialize a Node.js project and install core dependencies:
    * `playwright`
    * `playwright-extra`
    * `puppeteer-extra-plugin-stealth`
    * `node-cron`
    * `dotenv` (for configuration management).
* **Task 1.2:** Configure `.gitignore` to exclude `node_modules`, `.env`, and the local **browser profile folder** (userDataDir).

> **✅ Verification Method:**
> Run `npm install`. Ensure no errors occur. There should be a `package.json` file containing the specific libraries mentioned above.

---

### Phase 2: Stealth Browser Configuration (The "Core")
**Goal:** Create the browser instance that bypasses detection. It must use the **installed Google Chrome on macOS**, not the bundled Chromium.

* **Task 2.1:** Create a configuration module (`browserConfig.js`) that uses `playwright-extra` and applies the `StealthPlugin`.
* **Task 2.2:** Configure the launch options to point to the local macOS Chrome executable:
    * Path: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
    * Mode: `headless: false` (Visible window is safer for anti-bot).
* **Task 2.3:** Define a custom `userDataDir` path in the project root (e.g., `./user_data`). This is crucial for saving sessions.

> **✅ Verification Method:**
> The developer provides a script named `test-stealth.js`.
> 1. Run the script. It should open your actual Google Chrome app.
> 2. The script should navigate to `https://bot.sannysoft.com`.
> 3. **Result:** All tests on that page should pass (green), specifically "WebDriver" should be false.

---

### Phase 3: Authentication Strategy (Google Login)
**Goal:** Solve the "Log in with Google" requirement by using session persistence rather than automated typing.

* **Task 3.1:** Create a specific utility script named `run-setup-login.js`.
    * This script does nothing but launch the browser with the configured `userDataDir` and keeps it open for 5 minutes (or until closed manually).
* **Task 3.2:** Document the manual procedure: The user (you) runs this script once, logs into Google manually inside the window, and closes it.
* **Task 3.3:** Create a `verify-session.js` script that launches the browser and navigates to `https://myaccount.google.com/` to check if the session is still active.

> **✅ Verification Method:**
> 1. Run `node run-setup-login.js`.
> 2. Log in to your Google account manually. Close the browser.
> 3. Run `node verify-session.js`.
> 4. **Result:** The browser should open and **already be logged in** without asking for a password.

-----

### Phase 4: Modular "Record & Replay" Architecture

**Goal:** Create a system where you can easily "record" a session, save it as a new module, and instruct the bot to run that specific module later.

  * **Task 4.1: The Task Registry System**

      * Create a `/tasks` directory in the project.
      * Create a standard **Task Template** (`template.js`). This file should export a simple function like `async function run(page) { ... }`.
      * **Requirement:** The main bot runner must be updated to accept an argument (e.g., `npm run bot -- --task=buy_ticket`) so it knows which file from the `/tasks` folder to execute.

  * **Task 4.2: The "Observer" Script (Custom Recorder)**

      * The developer must create a script named `record-new-task.js`.
      * **Crucial:** This script must launch **Playwright Codegen**, but it must pass the following arguments to ensure it sees what the bot sees:
        1.  `--load-storage=state.json` (or point to the user data dir).
        2.  `--viewport-size=1920,1080` (to match the bot's screen).
      * **The Workflow:** When you run this script, a browser opens. You click around. Playwright generates code in a side window. You simply copy that code.

  * **Task 4.3: The Integration Logic**

      * The developer must document the workflow:
        1.  Run "Observer".
        2.  Perform actions manually.
        3.  Copy the generated code.
        4.  Duplicate `template.js`, rename it (e.g., `instagram_like.js`), and paste the code inside.
      * The main bot `index.js` must be dynamic: It loads the browser (Stealth Mode) -\> loads the specific task file requested -\> executes the steps -\> closes.

> **✅ Verification Method:**
>
> 1.  **Test Recording:** Run `npm run record`. The browser opens with a "Playwright Inspector" window next to it.
> 2.  **Action:** Go to https://www.google.com/search?q=Google.com and search for "Ferrari". Close the recorder.
> 3.  **Creation:** Create a file `tasks/search_test.js` using the template and paste the code generated in the Inspector.
> 4.  **Test Replay:** Run `npm run start --task=search_test`.
> 5.  **Result:** The bot opens, searches for "Ferrari" automatically, and finishes.

-----

### Revised Phase 5: Advanced Scheduler & Command Center

**Goal:** Since you now have *multiple* tasks, the Cron Job needs to know *what* to run and *when*.

  * **Task 5.1: The `schedule.json` Configuration**

      * Instead of hardcoding cron jobs in the code, create a `schedule.json` file.
      * Structure:
        ```json
        [
          { "task": "daily_login", "cron": "0 8 * * *" },
          { "task": "check_prices", "cron": "*/30 * * * *" }
        ]
        ```

  * **Task 5.2: Dynamic Scheduler Logic**

      * Update the `scheduler.js` to read this JSON file.
      * It should loop through the array and schedule a Cron Job for every entry found.

  * **Task 5.3: Error Handling per Task**

      * If "Task A" fails (site is down), it should not stop "Task B" from running later.
      * Implement `try/catch` blocks around the dynamic task execution.
      * Update logging to include the Task Name: `[09:00] Task 'daily_login' Failed`.

> **✅ Verification Method:**
>
> 1.  Create two simple tasks: `task_a.js` (logs "A") and `task_b.js` (logs "B").
> 2.  Edit `schedule.json` to run Task A every minute and Task B every 2 minutes.
> 3.  Run `node scheduler.js`.
> 4.  **Result:** Watch the console/logs for 3 minutes. You should see Task A execute 3 times and Task B execute 1 or 2 times effectively.

-----

### Summary for the Developer

You can copy and paste this summary to your developer to explain the change in scope:

> "I have updated the requirements for **Phase 4**. I do not want a hardcoded single-purpose bot.
>
> **New Requirement:** I need a 'Record & Replay' architecture.
>
> 1.  **Recording:** Provide an npm script that launches Playwright Codegen *with* my persistent profile loaded, so I can manually click through a workflow and generate the code.
> 2.  **Modularity:** I need a `/tasks` folder. I will paste the generated code into new files there.
> 3.  **Execution:** The main script needs to be able to run specific tasks by name (e.g., `node bot.js --task=my_new_task`).
> 4.  **Scheduling:** The scheduler should read a JSON file to know which tasks to run at what times."

-----

### Phase 6: Handover & Documentation
**Goal:** Ensure the code is maintainable and you know how to use it.

* **Task 6.1:** Write a `README.md` containing:
    * How to install (`npm install`).
    * **Crucial:** How to perform the "First Time Login" (Phase 3).
    * How to adjust the schedule.
* **Task 6.2:** Create a `run_bot.command` file (for macOS). This allows you to double-click an icon on your desktop to start the scheduler, rather than opening the terminal every time.

> **✅ Verification Method:**
> 1. Read the README. It should be clear.
> 2. Double-click the `run_bot.command` file.
> 3. **Result:** A terminal window opens and confirms the scheduler is running.