// Type definitions for libraries without types
import { Server } from 'socket.io';

declare module 'cron-parser' {
  export interface CronExpression {
    next(): CronDate;
    prev(): CronDate;
    hasNext(): boolean;
    hasPrev(): boolean;
    reset(): void;
  }

  export interface CronDate {
    toDate(): Date;
    getTime(): number;
    toString(): string;
    toUTC(): Date;
    isLast(): boolean;
    isFirst(): boolean;
  }

  export interface ParserOptions {
    currentDate?: Date | string;
    tz?: string;
  }

  export function parseExpression(expression: string, options?: ParserOptions): CronExpression;
}

// Extend Express Application to include socket.io instance
declare global {
  namespace Express {
    interface Application {
      get(name: 'io'): Server;
    }
  }
}
