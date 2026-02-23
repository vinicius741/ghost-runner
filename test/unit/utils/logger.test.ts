/**
 * Unit tests for Logger utility.
 *
 * Tests structured logging with levels and formatting.
 *
 * @module test/unit/utils/logger.test
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { LogLevel, createLogger, logger } from '../../../src/server/utils/logger';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof mock.method>;
  let consoleErrorSpy: ReturnType<typeof mock.method>;
  let consoleWarnSpy: ReturnType<typeof mock.method>;

  beforeEach(() => {
    consoleLogSpy = mock.method(console, 'log', () => {});
    consoleErrorSpy = mock.method(console, 'error', () => {});
    consoleWarnSpy = mock.method(console, 'warn', () => {});
  });

  afterEach(() => {
    consoleLogSpy.mock.restore();
    consoleErrorSpy.mock.restore();
    consoleWarnSpy.mock.restore();
  });

  describe('LogLevel enum', () => {
    it('should have correct severity order', () => {
      assert.strictEqual(LogLevel.DEBUG, 0);
      assert.strictEqual(LogLevel.INFO, 1);
      assert.strictEqual(LogLevel.WARN, 2);
      assert.strictEqual(LogLevel.ERROR, 3);
      assert.strictEqual(LogLevel.NONE, 4);
    });
  });

  describe('createLogger factory', () => {
    it('should create logger with default config', () => {
      const log = createLogger();
      // Default level is INFO, so DEBUG should not log
      log.debug('test');
      assert.strictEqual(consoleLogSpy.mock.callCount(), 0);
    });

    it('should accept custom config', () => {
      const log = createLogger({ level: LogLevel.DEBUG });
      log.debug('test');
      assert.strictEqual(consoleLogSpy.mock.callCount(), 1);
    });

    it('should accept partial config', () => {
      const log = createLogger({ timestamps: false });
      log.info('test');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      assert.ok(!output.includes('[20')); // Should not have timestamp
    });
  });

  describe('log levels', () => {
    it('should log DEBUG messages at DEBUG level', () => {
      const log = createLogger({ level: LogLevel.DEBUG });
      log.debug('debug message');
      assert.strictEqual(consoleLogSpy.mock.callCount(), 1);
    });

    it('should not log DEBUG at INFO level', () => {
      const log = createLogger({ level: LogLevel.INFO });
      log.debug('debug message');
      assert.strictEqual(consoleLogSpy.mock.callCount(), 0);
    });

    it('should log INFO messages at INFO level', () => {
      const log = createLogger({ level: LogLevel.INFO });
      log.info('info message');
      assert.strictEqual(consoleLogSpy.mock.callCount(), 1);
    });

    it('should not log INFO at WARN level', () => {
      const log = createLogger({ level: LogLevel.WARN });
      log.info('info message');
      assert.strictEqual(consoleLogSpy.mock.callCount(), 0);
    });

    it('should log WARN messages at WARN level', () => {
      const log = createLogger({ level: LogLevel.WARN });
      log.warn('warn message');
      assert.strictEqual(consoleWarnSpy.mock.callCount(), 1);
    });

    it('should not log WARN at ERROR level', () => {
      const log = createLogger({ level: LogLevel.ERROR });
      log.warn('warn message');
      assert.strictEqual(consoleWarnSpy.mock.callCount(), 0);
    });

    it('should log ERROR messages at ERROR level', () => {
      const log = createLogger({ level: LogLevel.ERROR });
      log.error('error message');
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 1);
    });

    it('should not log anything at NONE level', () => {
      const log = createLogger({ level: LogLevel.NONE });
      log.debug('debug');
      log.info('info');
      log.warn('warn');
      log.error('error');
      assert.strictEqual(consoleLogSpy.mock.callCount(), 0);
      assert.strictEqual(consoleWarnSpy.mock.callCount(), 0);
      assert.strictEqual(consoleErrorSpy.mock.callCount(), 0);
    });
  });

  describe('formatting', () => {
    it('should include timestamp by default', () => {
      const log = createLogger({ level: LogLevel.INFO, timestamps: true });
      log.info('test message');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      // ISO timestamp format: YYYY-MM-DDTHH:MM:SS
      assert.ok(output.match(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/));
    });

    it('should exclude timestamp when disabled', () => {
      const log = createLogger({ level: LogLevel.INFO, timestamps: false });
      log.info('test message');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      assert.ok(!output.includes('[20'));
    });

    it('should include level in output', () => {
      const log = createLogger({ level: LogLevel.INFO, timestamps: false });
      log.info('test');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      assert.ok(output.includes('[INFO]'));
    });

    it('should include message in output', () => {
      const log = createLogger({ level: LogLevel.INFO });
      log.info('My test message');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      assert.ok(output.includes('My test message'));
    });

    it('should include prefix when set', () => {
      const log = createLogger({ level: LogLevel.INFO, prefix: 'MyModule' });
      log.info('test');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      assert.ok(output.includes('[MyModule]'));
    });
  });

  describe('JSON format', () => {
    it('should output JSON when json option is true', () => {
      const log = createLogger({ level: LogLevel.INFO, json: true });
      log.info('test message');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      const parsed = JSON.parse(output);
      assert.strictEqual(parsed.level, 'INFO');
      assert.strictEqual(parsed.message, 'test message');
    });

    it('should include timestamp in JSON output', () => {
      const log = createLogger({ level: LogLevel.INFO, json: true });
      log.info('test');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      const parsed = JSON.parse(output);
      assert.ok(parsed.timestamp);
    });

    it('should include prefix in JSON message', () => {
      const log = createLogger({ level: LogLevel.INFO, json: true, prefix: 'Module' });
      log.info('test');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      const parsed = JSON.parse(output);
      assert.strictEqual(parsed.message, '[Module] test');
    });

    it('should include additional data in JSON output', () => {
      const log = createLogger({ level: LogLevel.INFO, json: true });
      log.info('test', { key: 'value', count: 42 });
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      const parsed = JSON.parse(output);
      assert.strictEqual(parsed.key, 'value');
      assert.strictEqual(parsed.count, 42);
    });
  });

  describe('additional data', () => {
    it('should include data object in plain text output', () => {
      const log = createLogger({ level: LogLevel.INFO, timestamps: false });
      log.info('test', { port: 3000 });
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      assert.ok(output.includes('"port":3000'));
    });

    it('should handle empty data object', () => {
      const log = createLogger({ level: LogLevel.INFO, timestamps: false });
      log.info('test', {});
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      // Should not include empty JSON object
      assert.ok(!output.includes('{}'));
    });
  });

  describe('configure', () => {
    it('should update config after creation', () => {
      const log = createLogger({ level: LogLevel.INFO });
      log.debug('before'); // Should not log

      log.configure({ level: LogLevel.DEBUG });
      log.debug('after'); // Should log

      assert.strictEqual(consoleLogSpy.mock.callCount(), 1);
    });

    it('should merge with existing config', () => {
      const log = createLogger({ level: LogLevel.DEBUG, prefix: 'Original' });
      log.configure({ prefix: 'Updated' });

      log.info('test');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      assert.ok(output.includes('Updated'));
      assert.ok(!output.includes('Original'));
    });
  });

  describe('child logger', () => {
    it('should create child with combined prefix', () => {
      const parent = createLogger({ level: LogLevel.INFO, prefix: 'Parent' });
      const child = parent.child('Child');

      child.info('test');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      assert.ok(output.includes('[Parent:Child]'));
    });

    it('should create child with prefix when parent has no prefix', () => {
      const parent = createLogger({ level: LogLevel.INFO });
      const child = parent.child('Child');

      child.info('test');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      assert.ok(output.includes('[Child]'));
    });

    it('should inherit parent config', () => {
      const parent = createLogger({ level: LogLevel.WARN });
      const child = parent.child('Child');

      child.info('should not log'); // INFO < WARN
      child.warn('should log'); // WARN >= WARN

      assert.strictEqual(consoleLogSpy.mock.callCount(), 0);
      assert.strictEqual(consoleWarnSpy.mock.callCount(), 1);
    });

    it('should create nested children', () => {
      const parent = createLogger({ level: LogLevel.INFO, prefix: 'App' });
      const child = parent.child('Module');
      const grandchild = child.child('Function');

      grandchild.info('test');
      const output = consoleLogSpy.mock.calls[0].arguments[0];
      assert.ok(output.includes('[App:Module:Function]'));
    });
  });

  describe('default logger instance', () => {
    it('should export a default logger instance', () => {
      assert.ok(logger);
      assert.strictEqual(typeof logger.info, 'function');
      assert.strictEqual(typeof logger.debug, 'function');
      assert.strictEqual(typeof logger.warn, 'function');
      assert.strictEqual(typeof logger.error, 'function');
      assert.strictEqual(typeof logger.configure, 'function');
      assert.strictEqual(typeof logger.child, 'function');
    });
  });
});
