/**
 * Unit tests for MonitoredPage wrapper.
 *
 * Tests Playwright Page wrapper for automatic failure detection.
 *
 * @module test/unit/core/pageWrapper.test
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { MonitoredPage, createMonitoredPage } from '../../../src/core/pageWrapper';
import {
  ElementNotFoundError,
  NavigationFailureError,
  isTaskError,
} from '../../../src/core/errors';
import type { Page, Response, ElementHandle } from 'playwright';

/**
 * Creates a mock Playwright Page instance with overridable methods.
 */
function createMockPage(overrides: Partial<Page> = {}): Page {
  const defaultPage = {
    url: () => 'https://example.com/current',
    goto: async (): Promise<Response | null> => null,
    waitForSelector: async (): Promise<ElementHandle | null> => null,
    waitForNavigation: async (): Promise<Response | null> => null,
    click: async () => {},
    fill: async () => {},
    type: async () => {},
    press: async () => {},
    selectOption: async () => [] as string[],
    check: async () => {},
    uncheck: async () => {},
    hover: async () => {},
    focus: async () => {},
    tap: async () => {},
    dragAndDrop: async () => {},
    screenshot: async () => Buffer.from(''),
    pdf: async () => Buffer.from(''),
    title: async () => 'Test Page',
    content: async () => '<html></html>',
    setViewportSize: async () => {},
    viewportSize: () => ({ width: 1920, height: 1080 }),
    evaluate: async () => {},
    evaluateHandle: async () => ({}),
    $eval: async () => {},
    $$eval: async () => {},
    addScriptTag: async () => ({}),
    addStyleTag: async () => ({}),
    addInitScript: () => {},
    frames: () => [],
    frame: () => null,
    mainFrame: () => ({}),
    locator: () => ({}),
    getByTestId: () => ({}),
    getByText: () => ({}),
    getByLabel: () => ({}),
    getByPlaceholder: () => ({}),
    getByAltText: () => ({}),
    getByTitle: () => ({}),
    getByRole: () => ({}),
    $: async () => null,
    $$: async () => [],
    waitForFunction: async () => ({}),
    waitForTimeout: async () => {},
    waitForLoadState: async () => {},
    waitForURL: async () => {},
    reload: async (): Promise<Response | null> => null,
    goBack: async (): Promise<Response | null> => null,
    goForward: async (): Promise<Response | null> => null,
    setExtraHTTPHeaders: async () => {},
    setContent: async () => {},
    bringToFront: async () => {},
    emulateMedia: async () => {},
    route: async () => {},
    unroute: async () => {},
    setDefaultNavigationTimeout: () => {},
    setDefaultTimeout: () => {},
    on: () => ({}),
    once: () => ({}),
    off: () => ({}),
    removeAllListeners: () => ({}),
    close: async () => {},
    isClosed: () => false,
    context: () => ({}),
    keyboard: {} as Page['keyboard'],
    mouse: {} as Page['mouse'],
    touchscreen: {} as Page['touchscreen'],
  };

  return { ...defaultPage, ...overrides } as Page;
}

describe('MonitoredPage', () => {
  let mockPage: Page;
  let monitoredPage: MonitoredPage;

  beforeEach(() => {
    mockPage = createMockPage();
    monitoredPage = new MonitoredPage(mockPage, { taskName: 'test-task' });
  });

  describe('constructor', () => {
    it('should create instance with task name', () => {
      assert.ok(monitoredPage instanceof MonitoredPage);
    });

    it('should use default timeouts when not specified', () => {
      const mp = new MonitoredPage(mockPage, { taskName: 'test' });
      assert.ok(mp instanceof MonitoredPage);
    });

    it('should accept custom timeouts', () => {
      const mp = new MonitoredPage(mockPage, {
        taskName: 'test',
        defaultSelectorTimeout: 10000,
        defaultNavigationTimeout: 60000,
      });
      assert.ok(mp instanceof MonitoredPage);
    });
  });

  describe('createMonitoredPage factory', () => {
    it('should create monitored page instance', () => {
      const mp = createMonitoredPage(mockPage, 'my-task');
      assert.ok(mp instanceof MonitoredPage);
    });
  });

  describe('getOriginalPage', () => {
    it('should return the underlying Page instance', () => {
      const original = monitoredPage.getOriginalPage();
      assert.strictEqual(original, mockPage);
    });
  });

  describe('waitForSelector', () => {
    it('should call page.waitForSelector with selector', async () => {
      let calledWith: string | null = null;
      const page = createMockPage({
        waitForSelector: async (selector: string) => {
          calledWith = selector;
          return null;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await mp.waitForSelector('#my-element');
      assert.strictEqual(calledWith, '#my-element');
    });

    it('should pass timeout option to page.waitForSelector', async () => {
      let receivedOptions: Record<string, unknown> | null = null;
      const page = createMockPage({
        waitForSelector: async (_selector: string, options?: Record<string, unknown>) => {
          receivedOptions = options ?? {};
          return null;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await mp.waitForSelector('#my-element', { timeout: 5000 });
      assert.strictEqual(receivedOptions?.timeout, 5000);
    });

    it('should throw ElementNotFoundError on TimeoutError', async () => {
      const page = createMockPage({
        waitForSelector: async () => {
          const error = new Error('Timeout');
          error.name = 'TimeoutError';
          throw error;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test-task' });

      await assert.rejects(
        async () => mp.waitForSelector('#missing-element', { timeout: 5000 }),
        (error: unknown) => {
          assert.ok(error instanceof ElementNotFoundError);
          assert.strictEqual(error.selector, '#missing-element');
          assert.strictEqual(error.timeout, 5000);
          assert.strictEqual(error.taskName, 'test-task');
          return true;
        }
      );
    });

    it('should rethrow non-timeout errors', async () => {
      const otherError = new Error('Some other error');
      const page = createMockPage({
        waitForSelector: async () => {
          throw otherError;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await assert.rejects(
        async () => mp.waitForSelector('#element'),
        (error: unknown) => {
          assert.strictEqual(error, otherError);
          return true;
        }
      );
    });

    it('should include page URL in error context', async () => {
      const page = createMockPage({
        waitForSelector: async () => {
          const error = new Error('Timeout');
          error.name = 'TimeoutError';
          throw error;
        },
        url: () => 'https://example.com/specific-page',
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await assert.rejects(
        async () => mp.waitForSelector('#element'),
        (error: unknown) => {
          assert.ok(error instanceof ElementNotFoundError);
          assert.strictEqual(error.pageUrl, 'https://example.com/specific-page');
          return true;
        }
      );
    });
  });

  describe('goto', () => {
    it('should call page.goto with URL', async () => {
      let calledWith: string | null = null;
      const page = createMockPage({
        goto: async (url: string) => {
          calledWith = url;
          return null;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await mp.goto('https://example.com');
      assert.strictEqual(calledWith, 'https://example.com');
    });

    it('should throw NavigationFailureError for HTTP 4xx status', async () => {
      const page = createMockPage({
        goto: async () => ({
          status: () => 404,
          statusText: () => 'Not Found',
        }) as Response,
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await assert.rejects(
        async () => mp.goto('https://example.com/not-found'),
        (error: unknown) => {
          assert.ok(error instanceof NavigationFailureError);
          assert.strictEqual(error.url, 'https://example.com/not-found');
          assert.strictEqual(error.responseStatus, 404);
          assert.ok(error.message.includes('404'));
          return true;
        }
      );
    });

    it('should throw NavigationFailureError for HTTP 5xx status', async () => {
      const page = createMockPage({
        goto: async () => ({
          status: () => 500,
          statusText: () => 'Internal Server Error',
        }) as Response,
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await assert.rejects(
        async () => mp.goto('https://example.com/error'),
        (error: unknown) => {
          assert.ok(error instanceof NavigationFailureError);
          assert.strictEqual(error.responseStatus, 500);
          return true;
        }
      );
    });

    it('should not throw for HTTP 2xx status', async () => {
      const page = createMockPage({
        goto: async () => ({
          status: () => 200,
          statusText: () => 'OK',
        }) as Response,
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      const response = await mp.goto('https://example.com');
      assert.strictEqual(response?.status(), 200);
    });

    it('should not throw for HTTP 3xx status', async () => {
      const page = createMockPage({
        goto: async () => ({
          status: () => 302,
          statusText: () => 'Found',
        }) as Response,
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      const response = await mp.goto('https://example.com/redirect');
      assert.strictEqual(response?.status(), 302);
    });

    it('should throw NavigationFailureError on network error', async () => {
      const page = createMockPage({
        goto: async () => {
          throw new Error('net::ERR_CONNECTION_REFUSED');
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await assert.rejects(
        async () => mp.goto('https://example.com'),
        (error: unknown) => {
          assert.ok(error instanceof NavigationFailureError);
          assert.strictEqual(error.url, 'https://example.com');
          assert.ok(error.details?.includes('ERR_CONNECTION_REFUSED'));
          return true;
        }
      );
    });

    it('should not wrap TaskError types', async () => {
      const taskError = new NavigationFailureError('https://example.com', 'test-task', 'Custom error');
      const page = createMockPage({
        goto: async () => {
          throw taskError;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await assert.rejects(
        async () => mp.goto('https://example.com'),
        (error: unknown) => {
          assert.strictEqual(error, taskError);
          return true;
        }
      );
    });

    it('should skip status check when waitUntil is domcontentloaded', async () => {
      const page = createMockPage({
        goto: async () => ({
          status: () => 404,
          statusText: () => 'Not Found',
        }) as Response,
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      // Should not throw for 404 when waitUntil is domcontentloaded
      const response = await mp.goto('https://example.com', { waitUntil: 'domcontentloaded' });
      assert.strictEqual(response?.status(), 404);
    });
  });

  describe('waitForNavigation', () => {
    it('should call page.waitForNavigation', async () => {
      let called = false;
      const page = createMockPage({
        waitForNavigation: async () => {
          called = true;
          return null;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await mp.waitForNavigation();
      assert.strictEqual(called, true);
    });

    it('should throw NavigationFailureError on timeout', async () => {
      const page = createMockPage({
        waitForNavigation: async () => {
          const error = new Error('Timeout');
          error.name = 'TimeoutError';
          throw error;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await assert.rejects(
        async () => mp.waitForNavigation({ timeout: 30000 }),
        (error: unknown) => {
          assert.ok(error instanceof NavigationFailureError);
          assert.ok(error.details?.includes('timed out'));
          assert.ok(error.details?.includes('30000ms'));
          return true;
        }
      );
    });

    it('should rethrow non-timeout errors', async () => {
      const otherError = new Error('Navigation failed');
      const page = createMockPage({
        waitForNavigation: async () => {
          throw otherError;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await assert.rejects(
        async () => mp.waitForNavigation(),
        (error: unknown) => {
          assert.strictEqual(error, otherError);
          return true;
        }
      );
    });

    it('should include current URL in error', async () => {
      const page = createMockPage({
        waitForNavigation: async () => {
          const error = new Error('Timeout');
          error.name = 'TimeoutError';
          throw error;
        },
        url: () => 'https://example.com/before-nav',
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await assert.rejects(
        async () => mp.waitForNavigation(),
        (error: unknown) => {
          assert.ok(error instanceof NavigationFailureError);
          assert.strictEqual(error.url, 'https://example.com/before-nav');
          return true;
        }
      );
    });
  });

  describe('method forwarding', () => {
    it('should forward url() to page', () => {
      const result = monitoredPage.url();
      assert.strictEqual(result, 'https://example.com/current');
    });

    it('should forward title() to page', async () => {
      const result = await monitoredPage.title();
      assert.strictEqual(result, 'Test Page');
    });

    it('should forward click() to page', async () => {
      let clicked = false;
      const page = createMockPage({
        click: async () => {
          clicked = true;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await mp.click('#button');
      assert.strictEqual(clicked, true);
    });

    it('should forward fill() to page', async () => {
      let filledWith: { selector: string; value: string } | null = null;
      const page = createMockPage({
        fill: async (selector: string, value: string) => {
          filledWith = { selector, value };
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await mp.fill('#input', 'test value');
      assert.deepStrictEqual(filledWith, { selector: '#input', value: 'test value' });
    });

    it('should forward type() to page', async () => {
      let typed = false;
      const page = createMockPage({
        type: async () => {
          typed = true;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await mp.type('#input', 'typed text');
      assert.strictEqual(typed, true);
    });

    it('should forward press() to page', async () => {
      let pressedWith: string | null = null;
      const page = createMockPage({
        press: async (_selector: string, key: string) => {
          pressedWith = key;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await mp.press('#input', 'Enter');
      assert.strictEqual(pressedWith, 'Enter');
    });

    it('should forward locator() to page', () => {
      const page = createMockPage({
        locator: (selector: string) => ({ selector }),
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      const result = mp.locator('#element');
      assert.deepStrictEqual(result, { selector: '#element' });
    });

    it('should forward frames() to page', () => {
      const page = createMockPage({
        frames: () => ['frame1', 'frame2'],
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      const result = mp.frames();
      assert.deepStrictEqual(result, ['frame1', 'frame2']);
    });

    it('should forward evaluate() to page', async () => {
      let evaluated = false;
      const page = createMockPage({
        evaluate: async () => {
          evaluated = true;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await mp.evaluate(() => 42);
      assert.strictEqual(evaluated, true);
    });

    it('should forward close() to page', async () => {
      let closed = false;
      const page = createMockPage({
        close: async () => {
          closed = true;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      await mp.close();
      assert.strictEqual(closed, true);
    });

    it('should forward isClosed() to page', () => {
      const page = createMockPage({
        isClosed: () => true,
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      assert.strictEqual(mp.isClosed(), true);
    });

    it('should expose keyboard property', () => {
      assert.ok(monitoredPage.keyboard);
    });

    it('should expose mouse property', () => {
      assert.ok(monitoredPage.mouse);
    });
  });

  describe('error integration', () => {
    it('should produce errors that pass isTaskError check', async () => {
      const page = createMockPage({
        waitForSelector: async () => {
          const error = new Error('Timeout');
          error.name = 'TimeoutError';
          throw error;
        },
      });
      const mp = new MonitoredPage(page, { taskName: 'test' });

      try {
        await mp.waitForSelector('#element');
        assert.fail('Should have thrown');
      } catch (error) {
        assert.strictEqual(isTaskError(error), true);
      }
    });
  });
});
