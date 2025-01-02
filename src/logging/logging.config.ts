export interface LoggingConfig {
  errorLogPath: string;
  combinedLogPath: string;
  level: string;
  datePattern: string;
}

export interface AppConfig {
  logging: LoggingConfig;
}
