/**
 * Playwright Page wrapper for automatic failure detection.
 * Wraps common Page methods to throw structured errors on failure.
 */

import type { Page } from 'playwright';
import {
  ElementNotFoundError,
  NavigationFailureError,
  isTaskError,
} from './errors';

/**
 * Options for creating a monitored page.
 */
export interface MonitoredPageOptions {
  /** Name of the task using this page (for error reporting) */
  taskName: string;
  /** Default timeout for selector waits (ms) */
  defaultSelectorTimeout?: number;
  /** Default timeout for navigation (ms) */
  defaultNavigationTimeout?: number;
}

/**
 * Internal state for the monitored page.
 */
interface MonitoredPageState {
  taskName: string;
  defaultSelectorTimeout: number;
  defaultNavigationTimeout: number;
}

/**
 * A wrapper around Playwright's Page that throws structured errors on failure.
 * Wraps methods that commonly fail due to website changes:
 * - waitForSelector: throws ElementNotFoundError on timeout
 * - goto: throws NavigationFailureError on failure
 * - waitForNavigation: throws NavigationFailureError on timeout
 */
export class MonitoredPage {
  private readonly page: Page;
  private readonly state: MonitoredPageState;

  constructor(page: Page, options: MonitoredPageOptions) {
    this.page = page;
    this.state = {
      taskName: options.taskName,
      defaultSelectorTimeout: options.defaultSelectorTimeout ?? 30000,
      defaultNavigationTimeout: options.defaultNavigationTimeout ?? 30000,
    };
  }

  /** Get the original Playwright Page instance (for advanced use cases) */
  getOriginalPage(): Page {
    return this.page;
  }

  /** Get the current page URL for error context */
  private async getCurrentUrl(): Promise<string> {
    try {
      return this.page.url();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Wait for a selector to appear in the DOM.
   * @throws ElementNotFoundError if selector not found within timeout
   */
  async waitForSelector(
    selector: string,
    options?: { timeout?: number }
  ): Promise<any> {
    const timeout = options?.timeout ?? this.state.defaultSelectorTimeout;

    try {
      return await this.page.waitForSelector(selector, options);
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        const pageUrl = await this.getCurrentUrl();
        throw new ElementNotFoundError(selector, timeout, this.state.taskName, pageUrl);
      }
      throw error;
    }
  }

  /**
   * Navigate to a URL.
   * @throws NavigationFailureError on network errors or bad responses
   */
  async goto(url: string, options?: any): Promise<any> {
    const timeout = options?.timeout ?? this.state.defaultNavigationTimeout;

    try {
      const response = await this.page.goto(url, options);

      // Check for bad HTTP status codes (4xx, 5xx)
      if (response && options?.waitUntil !== 'domcontentloaded') {
        const status = response.status();
        if (status >= 400) {
          throw new NavigationFailureError(
            url,
            this.state.taskName,
            `HTTP ${status} ${response.statusText()}`,
            status
          );
        }
      }

      return response;
    } catch (error) {
      // Don't wrap our own errors
      if (isTaskError(error)) throw error;

      if (error instanceof Error) {
        throw new NavigationFailureError(url, this.state.taskName, error.message);
      }
      throw new NavigationFailureError(url, this.state.taskName, String(error));
    }
  }

  /**
   * Wait for navigation to complete.
   * @throws NavigationFailureError on timeout
   */
  async waitForNavigation(options?: any): Promise<any> {
    const timeout = options?.timeout ?? this.state.defaultNavigationTimeout;

    try {
      return await this.page.waitForNavigation(options);
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        const pageUrl = await this.getCurrentUrl();
        throw new NavigationFailureError(
          pageUrl,
          this.state.taskName,
          `Navigation timed out after ${timeout}ms`
        );
      }
      throw error;
    }
  }

  // Forward all other Page methods directly via Proxy-like approach
  frames(): ReturnType<Page['frames']> {
    return this.page.frames();
  }

  frame(frameSelector: string | { name: string } | { url: string | RegExp }): ReturnType<Page['frame']> {
    return this.page.frame(frameSelector);
  }

  mainFrame(): ReturnType<Page['mainFrame']> {
    return this.page.mainFrame();
  }

  locator(selector: string): ReturnType<Page['locator']> {
    return this.page.locator(selector);
  }

  getByTestId(testId: string): ReturnType<Page['getByTestId']> {
    return this.page.getByTestId(testId);
  }

  getByText(text: string | RegExp, options?: { exact?: boolean }): ReturnType<Page['getByText']> {
    return this.page.getByText(text, options);
  }

  getByLabel(text: string | RegExp, options?: { exact?: boolean }): ReturnType<Page['getByLabel']> {
    return this.page.getByLabel(text, options);
  }

  getByPlaceholder(text: string | RegExp, options?: { exact?: boolean }): ReturnType<Page['getByPlaceholder']> {
    return this.page.getByPlaceholder(text, options);
  }

  getByAltText(text: string | RegExp, options?: { exact?: boolean }): ReturnType<Page['getByAltText']> {
    return this.page.getByAltText(text, options);
  }

  getByTitle(text: string | RegExp, options?: { exact?: boolean }): ReturnType<Page['getByTitle']> {
    return this.page.getByTitle(text, options);
  }

  getByRole(role: string, options?: any): ReturnType<Page['getByRole']> {
    return this.page.getByRole(role as any, options);
  }

  click(selector: string, options?: any): ReturnType<Page['click']> {
    return this.page.click(selector, options);
  }

  fill(selector: string, value: string, options?: any): ReturnType<Page['fill']> {
    return this.page.fill(selector, value, options);
  }

  type(selector: string, text: string, options?: any): ReturnType<Page['type']> {
    return this.page.type(selector, text, options);
  }

  press(selector: string, key: string, options?: any): ReturnType<Page['press']> {
    return this.page.press(selector, key, options);
  }

  selectOption(selector: string, value: any, options?: any): ReturnType<Page['selectOption']> {
    return this.page.selectOption(selector, value, options);
  }

  check(selector: string, options?: any): ReturnType<Page['check']> {
    return this.page.check(selector, options);
  }

  uncheck(selector: string, options?: any): ReturnType<Page['uncheck']> {
    return this.page.uncheck(selector, options);
  }

  hover(selector: string, options?: any): ReturnType<Page['hover']> {
    return this.page.hover(selector, options);
  }

  focus(selector: string, options?: any): ReturnType<Page['focus']> {
    return this.page.focus(selector, options);
  }

  tap(selector: string, options?: any): ReturnType<Page['tap']> {
    return this.page.tap(selector, options);
  }

  dragAndDrop(source: string, target: string, options?: any): ReturnType<Page['dragAndDrop']> {
    return this.page.dragAndDrop(source, target, options);
  }

  screenshot(options?: any): ReturnType<Page['screenshot']> {
    return this.page.screenshot(options);
  }

  pdf(options?: any): ReturnType<Page['pdf']> {
    return this.page.pdf(options);
  }

  url(): ReturnType<Page['url']> {
    return this.page.url();
  }

  title(): ReturnType<Page['title']> {
    return this.page.title();
  }

  content(): ReturnType<Page['content']> {
    return this.page.content();
  }

  setViewportSize(viewportSize: { width: number; height: number }): ReturnType<Page['setViewportSize']> {
    return this.page.setViewportSize(viewportSize);
  }

  viewportSize(): ReturnType<Page['viewportSize']> {
    return this.page.viewportSize();
  }

  evaluate<R, Arg>(pageFunction: (arg: Arg) => R, arg?: Arg): ReturnType<Page['evaluate']> {
    return this.page.evaluate(pageFunction as any, arg);
  }

  evaluateHandle<R, Arg>(pageFunction: (arg: Arg) => R, arg?: Arg): ReturnType<Page['evaluateHandle']> {
    return this.page.evaluateHandle(pageFunction as any, arg);
  }

  $eval<R>(selector: string, pageFunction: (element: any, arg?: any) => R, arg?: any): ReturnType<Page['$eval']> {
    return this.page.$eval(selector, pageFunction, arg);
  }

  $$eval<R>(selector: string, pageFunction: (elements: any[], arg?: any) => R, arg?: any): ReturnType<Page['$$eval']> {
    return this.page.$$eval(selector, pageFunction, arg);
  }

  addScriptTag(options: any): ReturnType<Page['addScriptTag']> {
    return this.page.addScriptTag(options);
  }

  addStyleTag(options: any): ReturnType<Page['addStyleTag']> {
    return this.page.addStyleTag(options);
  }

  addInitScript(script?: string | { path: string } | ((arg: unknown) => string | Promise<string>), arg?: unknown): ReturnType<Page['addInitScript']> {
    return this.page.addInitScript(script as any, arg);
  }

  get keyboard(): Page['keyboard'] {
    return this.page.keyboard;
  }

  get mouse(): Page['mouse'] {
    return this.page.mouse;
  }

  get touchscreen(): Page['touchscreen'] {
    return this.page.touchscreen;
  }

  on(event: any, listener: (...args: any[]) => void): any {
    return this.page.on(event, listener);
  }

  once(event: any, listener: (...args: any[]) => void): any {
    return this.page.once(event, listener);
  }

  off(event: any, listener: (...args: any[]) => void): any {
    return this.page.off(event, listener);
  }

  removeAllListeners(event?: any): any {
    return this.page.removeAllListeners(event);
  }

  close(options?: any): ReturnType<Page['close']> {
    return this.page.close(options);
  }

  isClosed(): ReturnType<Page['isClosed']> {
    return this.page.isClosed();
  }

  context(): ReturnType<Page['context']> {
    return this.page.context();
  }

  waitForFunction<R>(pageFunction: () => R | Promise<R>, options?: any): ReturnType<Page['waitForFunction']> {
    return this.page.waitForFunction(pageFunction as any, options);
  }

  waitForTimeout(timeout: number): ReturnType<Page['waitForTimeout']> {
    return this.page.waitForTimeout(timeout);
  }

  waitForLoadState(state?: 'load' | 'domcontentloaded' | 'networkidle', options?: { timeout?: number }): ReturnType<Page['waitForLoadState']> {
    return this.page.waitForLoadState(state, options);
  }

  waitForURL(url?: any, options?: any): ReturnType<Page['waitForURL']> {
    return this.page.waitForURL(url, options);
  }

  reload(options?: any): ReturnType<Page['reload']> {
    return this.page.reload(options);
  }

  goBack(options?: any): ReturnType<Page['goBack']> {
    return this.page.goBack(options);
  }

  goForward(options?: any): ReturnType<Page['goForward']> {
    return this.page.goForward(options);
  }

  setExtraHTTPHeaders(headers: Record<string, string>): ReturnType<Page['setExtraHTTPHeaders']> {
    return this.page.setExtraHTTPHeaders(headers);
  }

  setContent(html: string, options?: any): ReturnType<Page['setContent']> {
    return this.page.setContent(html, options);
  }

  bringToFront(): ReturnType<Page['bringToFront']> {
    return this.page.bringToFront();
  }

  emulateMedia(options?: any): ReturnType<Page['emulateMedia']> {
    return this.page.emulateMedia(options);
  }

  route(url: any, handler: any): any {
    return this.page.route(url, handler);
  }

  unroute(url: any, handler?: any): any {
    return this.page.unroute(url, handler);
  }

  setDefaultNavigationTimeout(timeout: number): void {
    this.page.setDefaultNavigationTimeout(timeout);
  }

  setDefaultTimeout(timeout: number): void {
    this.page.setDefaultTimeout(timeout);
  }

  $(selector: string): ReturnType<Page['$']> {
    return this.page.$(selector);
  }

  $$(selector: string): ReturnType<Page['$$']> {
    return this.page.$$(selector);
  }
}

/**
 * Creates a monitored page wrapper for automatic failure detection.
 * @param page - The Playwright Page instance to wrap
 * @param taskName - Name of the task using this page
 * @returns A MonitoredPage instance
 */
export function createMonitoredPage(page: Page, taskName: string): MonitoredPage {
  return new MonitoredPage(page, { taskName });
}
