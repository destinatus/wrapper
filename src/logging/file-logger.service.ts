import { Logger, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as config from 'config';
import { format } from 'date-fns';
import { AppConfig } from './logging.config';

export class FileLogger extends Logger {
  private readonly logConfig: AppConfig['logging'];

  constructor(context?: string) {
    super(context);
    
    // Get log config or use defaults
    this.logConfig = config.get<AppConfig['logging']>('logging') || {
      errorLogPath: 'logs/error-%DATE%.log',
      combinedLogPath: 'logs/combined-%DATE%.log',
      level: 'info',
      datePattern: 'yyyy-MM-dd'
    };

    // Ensure logs directory exists
    this.ensureLogsDirectory();
  }

  private ensureLogsDirectory(): void {
    const logsDir = path.dirname(this.getLogPath(this.logConfig.errorLogPath));
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  private getLogPath(template: string): string {
    const date = new Date();
    const dateStr = format(date, this.logConfig.datePattern);
    return template.replace('%DATE%', dateStr);
  }

  private writeToFile(template: string, message: string): void {
    const filePath = this.getLogPath(template);
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    fs.appendFile(filePath, logEntry, (err) => {
      if (err) {
        console.error(`Failed to write to log file ${filePath}:`, err);
      }
    });
  }

  log(message: any, context?: string): void {
    super.log(message, context);
    if (typeof message === 'object') {
      message = JSON.stringify(message);
    }
    this.writeToFile(this.logConfig.combinedLogPath, `[INFO] ${context ? `[${context}] ` : ''}${message}`);
  }

  error(message: any, trace?: string, context?: string): void {
    super.error(message, trace, context);
    if (typeof message === 'object') {
      message = JSON.stringify(message);
    }
    const errorMessage = `[ERROR] ${context ? `[${context}] ` : ''}${message}${trace ? `\n${trace}` : ''}`;
    this.writeToFile(this.logConfig.errorLogPath, errorMessage);
  }

  warn(message: any, context?: string): void {
    super.warn(message, context);
    if (typeof message === 'object') {
      message = JSON.stringify(message);
    }
    this.writeToFile(this.logConfig.errorLogPath, `[WARN] ${context ? `[${context}] ` : ''}${message}`);
  }
}
