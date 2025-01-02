import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as config from 'config';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new DailyRotateFile({
          filename: config.get('logging.errorLogPath') || 'logs/error-%DATE%.log',
          datePattern: config.get('logging.datePattern') || 'yyyy-MM-dd',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
          maxFiles: '30d',
        }),
        new DailyRotateFile({
          filename: config.get('logging.combinedLogPath') || 'logs/combined-%DATE%.log',
          datePattern: config.get('logging.datePattern') || 'yyyy-MM-dd',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
          maxFiles: '30d',
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggingModule {}
