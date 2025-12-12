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

---

### Phase 4: Task Automation Logic
**Goal:** Implement the specific clicks and navigation on the target website.

* **Task 4.1:** Create the main worker script (e.g., `taskExecutor.js`).
* **Task 4.2:** Implement navigation to the target "Anti-Bot" website.
* **Task 4.3:** Implement "Human-like" interactions:
    * Add random delays between clicks (e.g., 2s - 5s).
    * Ensure the script handles page load timeouts gracefully.
* **Task 4.4:** Implement the specific button clicking logic required by the business rule.

> **✅ Verification Method:**
> Run `node taskExecutor.js`.
> 1. Watch the browser open.
> 2. It should navigate to the target site (already logged in via Google if required).
> 3. **Result:** It performs the required clicks without crashing or getting a "Bot Detected" block.

---

### Phase 5: Scheduling (Cron Job) & Logging
**Goal:** Automate the execution so it runs without manual intervention.

* **Task 5.1:** Create `scheduler.js` using `node-cron`.
* **Task 5.2:** Configure the Cron syntax (e.g., `0 9 * * *` for 9:00 AM daily) - allow this to be configurable via a `.env` file.
* **Task 5.3:** Implement basic logging. The system should append to a file named `activity.log` with timestamps:
    * `[2023-10-27 09:00:01] Job Started`
    * `[2023-10-27 09:00:15] Task Completed Successfully`
    * `[2023-10-27 09:00:15] Error: Selector not found`

> **✅ Verification Method:**
> 1. Edit the `.env` to run the cron job 1 minute from now.
> 2. Run `node scheduler.js`.
> 3. Wait 1 minute.
> 4. **Result:** The browser opens automatically, performs the task, closes, and a new line appears in `activity.log` confirming success.

---

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