import { IAccessLogger } from '../../domain/interfaces/IAccessLogger.js';

export class ConsoleLogger implements IAccessLogger {
  info(context: string, message: string, data?: Record<string, unknown>): void {
    this.log('INFO', context, message, data);
  }

  warn(context: string, message: string, data?: Record<string, unknown>): void {
    this.log('WARN', context, message, data);
  }

  error(context: string, message: string, data?: Record<string, unknown>): void {
    this.log('ERROR', context, message, data);
  }

  debug(context: string, message: string, data?: Record<string, unknown>): void {
    this.log('DEBUG', context, message, data);
  }

  private log(
    level: string,
    context: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...(data !== undefined && { data }),
    };
    console.log(JSON.stringify(entry));
  }
}
