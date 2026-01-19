import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Snapshot element returned by agent-browser
 */
export interface SnapshotElement {
  ref: string;
  role: string;
  name?: string;
  text?: string;
}

/**
 * Full snapshot structure returned by agent-browser
 */
export interface Snapshot {
  elements: SnapshotElement[];
  url: string;
  title: string;
}

/**
 * Default timeout for agent-browser commands (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Sanitize input to prevent command injection issues
 * Only allows alphanumeric, underscore, hyphen, @, and certain special chars
 */
function sanitizeRef(ref: string): string {
  // Refs should be like @e1, @e2, etc.
  if (!/^@[\w-]+$/.test(ref)) {
    throw new Error(`Invalid ref format: ${ref}`);
  }
  return ref;
}

/**
 * Sanitize text input to prevent issues
 */
function sanitizeText(text: string): string {
  // Allow most printable characters but escape quotes and backslashes
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Check if agent-browser is installed and accessible
 */
async function checkAgentBrowserInstalled(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('agent-browser', ['--version'], { stdio: 'pipe' });
    proc.on('error', (err) => {
      reject(new Error(
        'agent-browser is not installed or not accessible. ' +
        'Install it with: npm install -g agent-browser'
      ));
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(
          'agent-browser is not responding correctly. ' +
          'Install it with: npm install -g agent-browser'
        ));
      }
    });
  });
}

/**
 * CLI wrapper for agent-browser commands
 *
 * agent-browser is a CLI tool (not a TypeScript library), so we use
 * child_process.spawn() to execute commands and parse JSON output.
 */
export class AgentBrowserCLI {
  private sessionName: string;
  private browserOpen = false;
  private installationChecked = false;
  private sessionDir: string;

  constructor(sessionName?: string, sessionDir?: string) {
    this.sessionName = sessionName || 'default';
    // Use user_data directory for session persistence (consistent with Playwright setup)
    this.sessionDir = sessionDir || path.join(process.cwd(), 'user_data');
    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Ensure agent-browser is installed before first use
   */
  private async ensureInstalled(): Promise<void> {
    if (!this.installationChecked) {
      await checkAgentBrowserInstalled();
      this.installationChecked = true;
    }
  }

  /**
   * Get state file path for this session
   */
  getStatePath(): string {
    return path.join(this.sessionDir, `session-${this.sessionName}.json`);
  }

  /**
   * Execute agent-browser command and return output
   */
  private async exec(args: string[], json = true, timeout = DEFAULT_TIMEOUT): Promise<any> {
    await this.ensureInstalled();

    const command = 'agent-browser';
    const cmdArgs = this.sessionName ? ['--session', this.sessionName, ...args] : args;
    const finalArgs = json ? [...cmdArgs, '--json'] : cmdArgs;

    return new Promise((resolve, reject) => {
      const proc = spawn(command, finalArgs);
      let stdout = '';
      let stderr = '';
      // Use Buffers for proper UTF-8 handling
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      proc.stdout.on('data', (chunk: Buffer) => {
        stdoutChunks.push(chunk);
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk);
      });

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`agent-browser command timed out after ${timeout}ms`));
      }, timeout);

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle);
        stdout = Buffer.concat(stdoutChunks).toString('utf-8');
        stderr = Buffer.concat(stderrChunks).toString('utf-8');

        if (code !== 0) {
          reject(new Error(`agent-browser exited with code ${code}: ${stderr || stdout}`));
        } else {
          try {
            resolve(json ? JSON.parse(stdout) : stdout);
          } catch (e) {
            // If JSON parsing fails, return raw output
            resolve(stdout);
          }
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutHandle);
        reject(new Error(`Failed to spawn agent-browser: ${err.message}`));
      });
    });
  }

  /**
   * Navigate to URL
   * @param url - URL to navigate to
   * @param options - Options such as headed mode
   */
  async open(url: string, options: { headed?: boolean } = {}): Promise<void> {
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }

    const args = options.headed ? ['open', url, '--headed'] : ['open', url];
    await this.exec(args, false);
    this.browserOpen = true;
  }

  /**
   * Get interactive snapshot with refs
   * @param options - Snapshot options
   * @returns Snapshot with elements that have refs for interaction
   */
  async snapshot(options: { interactive?: boolean; depth?: number } = {}): Promise<Snapshot> {
    const args = ['snapshot'];
    if (options.interactive) args.push('-i');
    if (options.depth) args.push('-d', options.depth.toString());

    return await this.exec(args);
  }

  /**
   * Click element by ref
   * @param ref - Element reference (e.g., '@e1')
   */
  async click(ref: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    await this.exec(['click', sanitized], false);
  }

  /**
   * Double-click element by ref
   * @param ref - Element reference (e.g., '@e1')
   */
  async dblclick(ref: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    await this.exec(['dblclick', sanitized], false);
  }

  /**
   * Focus element by ref
   * @param ref - Element reference (e.g., '@e1')
   */
  async focus(ref: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    await this.exec(['focus', sanitized], false);
  }

  /**
   * Fill input by ref (clears and types)
   * @param ref - Element reference (e.g., '@e1')
   * @param text - Text to type
   */
  async fill(ref: string, text: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    const sanitizedText = sanitizeText(text);
    await this.exec(['fill', sanitized, sanitizedText], false);
  }

  /**
   * Type without clearing (for append operations)
   * @param ref - Element reference (e.g., '@e1')
   * @param text - Text to type
   */
  async type(ref: string, text: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    const sanitizedText = sanitizeText(text);
    await this.exec(['type', sanitized, sanitizedText], false);
  }

  /**
   * Get element text
   * @param ref - Element reference (e.g., '@e1')
   * @returns Text content of the element
   */
  async getText(ref: string): Promise<string> {
    const sanitized = sanitizeRef(ref);
    return await this.exec(['get', 'text', sanitized]);
  }

  /**
   * Get element HTML
   * @param ref - Element reference (e.g., '@e1')
   * @returns InnerHTML of the element
   */
  async getHtml(ref: string): Promise<string> {
    const sanitized = sanitizeRef(ref);
    return await this.exec(['get', 'html', sanitized]);
  }

  /**
   * Get element attribute
   * @param ref - Element reference (e.g., '@e1')
   * @param attr - Attribute name (e.g., 'href')
   * @returns Attribute value
   */
  async getAttribute(ref: string, attr: string): Promise<string> {
    const sanitized = sanitizeRef(ref);
    return await this.exec(['get', 'attr', sanitized, attr]);
  }

  /**
   * Get page title
   * @returns Current page title
   */
  async getTitle(): Promise<string> {
    return await this.exec(['get', 'title']);
  }

  /**
   * Get current URL
   * @returns Current page URL
   */
  async getUrl(): Promise<string> {
    return await this.exec(['get', 'url']);
  }

  /**
   * Wait for condition
   * @param options - Wait conditions
   */
  async wait(options: {
    text?: string;
    url?: string;
    timeout?: number;
    ref?: string;
    load?: 'networkidle';
  }): Promise<void> {
    const args = ['wait'];
    if (options.ref) {
      args.push(sanitizeRef(options.ref));
    }
    if (options.timeout) {
      args.push(options.timeout.toString());
    }
    if (options.text) {
      args.push('--text', sanitizeText(options.text));
    }
    if (options.url) {
      args.push('--url', options.url);
    }
    if (options.load) {
      args.push('--load', options.load);
    }

    await this.exec(args, false);
  }

  /**
   * Set geolocation
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   */
  async setGeolocation(latitude: number, longitude: number): Promise<void> {
    await this.exec(['set', 'geo', latitude.toString(), longitude.toString()], false);
  }

  /**
   * Set viewport size
   * @param width - Viewport width
   * @param height - Viewport height
   */
  async setViewport(width: number, height: number): Promise<void> {
    await this.exec(['set', 'viewport', width.toString(), height.toString()], false);
  }

  /**
   * Set device emulation
   * @param device - Device name (e.g., 'iPhone 14')
   */
  async setDevice(device: string): Promise<void> {
    await this.exec(['set', 'device', device], false);
  }

  /**
   * Save session state (cookies, localStorage)
   * Uses session directory for consistent state management
   */
  async saveState(statePath?: string): Promise<void> {
    const path = statePath || this.getStatePath();
    await this.exec(['state', 'save', path], false);
  }

  /**
   * Load session state (cookies, localStorage)
   * Uses session directory for consistent state management
   */
  async loadState(statePath?: string): Promise<void> {
    const path = statePath || this.getStatePath();
    if (!fs.existsSync(path)) {
      console.log(`No saved state found at ${path}, starting fresh session`);
      return;
    }
    await this.exec(['state', 'load', path], false);
  }

  /**
   * Navigate back
   */
  async back(): Promise<void> {
    await this.exec(['back'], false);
  }

  /**
   * Navigate forward
   */
  async forward(): Promise<void> {
    await this.exec(['forward'], false);
  }

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.exec(['reload'], false);
  }

  /**
   * Press key
   * @param key - Key to press (e.g., 'Enter', 'Escape', 'Control+a')
   */
  async press(key: string): Promise<void> {
    // agent-browser accepts key combinations as a single argument
    await this.exec(['press', key], false);
  }

  /**
   * Press multiple keys in sequence
   * @param keys - Array of keys to press in sequence
   */
  async pressKeys(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.press(key);
    }
  }

  /**
   * Hover over element
   * @param ref - Element reference (e.g., '@e1')
   */
  async hover(ref: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    await this.exec(['hover', sanitized], false);
  }

  /**
   * Check checkbox
   * @param ref - Element reference (e.g., '@e1')
   */
  async check(ref: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    await this.exec(['check', sanitized], false);
  }

  /**
   * Uncheck checkbox
   * @param ref - Element reference (e.g., '@e1')
   */
  async uncheck(ref: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    await this.exec(['uncheck', sanitized], false);
  }

  /**
   * Select dropdown option
   * @param ref - Element reference (e.g., '@e1')
   * @param value - Value to select
   */
  async select(ref: string, value: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    await this.exec(['select', sanitized, value], false);
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browserOpen) {
      try {
        await this.exec(['close'], false);
        this.browserOpen = false;
      } catch (error) {
        // Browser may already be closed
        this.browserOpen = false;
      }
    }
  }

  /**
   * Take screenshot
   * @param screenshotPath - Optional path to save screenshot
   * @returns If no path provided, returns Buffer with screenshot data
   */
  async screenshot(screenshotPath?: string): Promise<Buffer | null> {
    const args = screenshotPath ? ['screenshot', screenshotPath] : ['screenshot'];
    const result = await this.exec(args, false);

    // If path provided, agent-browser saves to file (no return value)
    if (screenshotPath) {
      return null;
    }

    // If no path, result is binary data (base64 encoded or raw)
    // agent-browser outputs binary to stdout, which we collect as Buffer
    if (Buffer.isBuffer(result)) {
      return result;
    }
    if (typeof result === 'string') {
      return Buffer.from(result, 'base64');
    }
    return result;
  }

  /**
   * Get all cookies
   */
  async getCookies(): Promise<any[]> {
    return await this.exec(['cookies']);
  }

  /**
   * Set cookie
   * @param name - Cookie name
   * @param value - Cookie value
   */
  async setCookie(name: string, value: string): Promise<void> {
    await this.exec(['cookies', 'set', name, value], false);
  }

  /**
   * Clear all cookies
   */
  async clearCookies(): Promise<void> {
    await this.exec(['cookies', 'clear'], false);
  }

  /**
   * Get localStorage value
   * @param key - Storage key (optional, returns all if not provided)
   */
  async getLocalStorage(key?: string): Promise<any> {
    const args = key ? ['storage', 'local', key] : ['storage', 'local'];
    return await this.exec(args);
  }

  /**
   * Set localStorage value
   * @param key - Storage key
   * @param value - Storage value
   */
  async setLocalStorage(key: string, value: string): Promise<void> {
    await this.exec(['storage', 'local', 'set', key, value], false);
  }

  /**
   * Clear localStorage
   */
  async clearLocalStorage(): Promise<void> {
    await this.exec(['storage', 'local', 'clear'], false);
  }

  /**
   * Scroll the page
   * @param direction - 'up' or 'down'
   * @param pixels - Number of pixels to scroll
   */
  async scroll(direction: 'up' | 'down', pixels: number): Promise<void> {
    await this.exec(['scroll', direction, pixels.toString()], false);
  }

  /**
   * Execute JavaScript in the page
   * @param script - JavaScript code to execute
   */
  async eval(script: string): Promise<any> {
    return await this.exec(['eval', script]);
  }

  /**
   * Find element using semantic locator (alternative to snapshot-based refs)
   * @param role - Element role (button, link, textbox, etc.)
   * @param name - Accessible name
   */
  async findByRole(role: string, name?: string): Promise<string | null> {
    const args = ['find', 'role', role];
    if (name) args.push('--name', name);
    const result = await this.exec(args, false);
    return result || null;
  }

  /**
   * Find element by text content
   * @param text - Text to search for
   */
  async findByText(text: string): Promise<string | null> {
    const result = await this.exec(['find', 'text', text], false);
    return result || null;
  }

  /**
   * Check if element is visible
   * @param ref - Element reference (e.g., '@e1')
   */
  async isVisible(ref: string): Promise<boolean> {
    const sanitized = sanitizeRef(ref);
    const result = await this.exec(['is', 'visible', sanitized]);
    return result === true || result === 'true';
  }

  /**
   * Check if element is enabled
   * @param ref - Element reference (e.g., '@e1')
   */
  async isEnabled(ref: string): Promise<boolean> {
    const sanitized = sanitizeRef(ref);
    const result = await this.exec(['is', 'enabled', sanitized]);
    return result === true || result === 'true';
  }

  /**
   * Check if checkbox is checked
   * @param ref - Element reference (e.g., '@e1')
   */
  async isChecked(ref: string): Promise<boolean> {
    const sanitized = sanitizeRef(ref);
    const result = await this.exec(['is', 'checked', sanitized]);
    return result === true || result === 'true';
  }

  /**
   * Scroll element into view
   * @param ref - Element reference (e.g., '@e1')
   */
  async scrollIntoView(ref: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    await this.exec(['scrollintoview', sanitized], false);
  }

  /**
   * Drag and drop
   * @param fromRef - Source element reference
   * @param toRef - Target element reference
   */
  async drag(fromRef: string, toRef: string): Promise<void> {
    const fromSanitized = sanitizeRef(fromRef);
    const toSanitized = sanitizeRef(toRef);
    await this.exec(['drag', fromSanitized, toSanitized], false);
  }

  /**
   * Upload file
   * @param ref - Element reference (e.g., '@e1')
   * @param filePath - Path to file to upload
   */
  async upload(ref: string, filePath: string): Promise<void> {
    const sanitized = sanitizeRef(ref);
    await this.exec(['upload', sanitized, filePath], false);
  }

  /**
   * Accept dialog
   * @param promptText - Optional text to enter in prompt
   */
  async acceptDialog(promptText?: string): Promise<void> {
    const args = ['dialog', 'accept'];
    if (promptText) args.push(promptText);
    await this.exec(args, false);
  }

  /**
   * Dismiss dialog
   */
  async dismissDialog(): Promise<void> {
    await this.exec(['dialog', 'dismiss'], false);
  }

  /**
   * Switch to iframe
   * @param selector - CSS selector for iframe
   */
  async switchToFrame(selector: string): Promise<void> {
    await this.exec(['frame', selector], false);
  }

  /**
   * Switch back to main frame
   */
  async switchToMainFrame(): Promise<void> {
    await this.exec(['frame', 'main'], false);
  }

  /**
   * Get console messages
   */
  async getConsoleMessages(): Promise<any[]> {
    return await this.exec(['console']);
  }

  /**
   * Get page errors
   */
  async getErrors(): Promise<any[]> {
    return await this.exec(['errors']);
  }
}
