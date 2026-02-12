/**
 * Structured logging utility for the Ghost Runner backend.
 *
 * Provides leveled logging with timestamps and optional structured output.
 *
 * @module server/utils/logger
 */

/**
 * Log levels in order of severity.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Log entry structure.
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: unknown;
}

/**
 * Logger configuration options.
 */
interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Whether to include timestamps */
  timestamps: boolean;
  /** Whether to use JSON format (vs plain text) */
  json: boolean;
  /** Prefix for all log messages */
  prefix?: string;
}

/**
 * Default logger configuration.
 */
const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  timestamps: true,
  json: false,
};

/**
 * Logger class providing structured logging capabilities.
 */
class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Updates the logger configuration.
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Formats a log entry for output.
   */
  private format(level: string, message: string, data?: Record<string, unknown>): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.config.prefix ? `[${this.config.prefix}] ${message}` : message,
      ...data,
    };

    if (this.config.json) {
      return JSON.stringify(entry);
    }

    // Plain text format
    const parts: string[] = [];
    if (this.config.timestamps) {
      parts.push(`[${entry.timestamp}]`);
    }
    parts.push(`[${level}]`);
    parts.push(entry.message);

    if (data && Object.keys(data).length > 0) {
      parts.push(JSON.stringify(data));
    }

    return parts.join(' ');
  }

  /**
   * Logs a message at the specified level.
   */
  private log(level: LogLevel, levelName: string, message: string, data?: Record<string, unknown>): void {
    if (level < this.config.level) {
      return;
    }

    const formatted = this.format(levelName, message, data);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  /**
   * Logs a debug message.
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  /**
   * Logs an info message.
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  /**
   * Logs a warning message.
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  /**
   * Logs an error message.
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data);
  }

  /**
   * Creates a child logger with a prefix.
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
  }
}

/**
 * Default logger instance.
 *
 * @example
 * ```ts
 * import { logger } from './utils/logger';
 *
 * logger.info('Server started', { port: 3333 });
 * logger.warn('Deprecated API used', { endpoint: '/api/old' });
 * logger.error('Database connection failed', { error: err.message });
 * ```
 */
export const logger = new Logger();

/**
 * Creates a new logger with custom configuration.
 */
export function createLogger(config: Partial<LoggerConfig> = {}): Logger {
  return new Logger(config);
}
