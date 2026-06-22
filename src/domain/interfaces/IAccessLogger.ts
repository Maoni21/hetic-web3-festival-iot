export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface IAccessLogger {
  info(context: string, message: string, data?: Record<string, unknown>): void;
  warn(context: string, message: string, data?: Record<string, unknown>): void;
  error(context: string, message: string, data?: Record<string, unknown>): void;
  debug(context: string, message: string, data?: Record<string, unknown>): void;
}
