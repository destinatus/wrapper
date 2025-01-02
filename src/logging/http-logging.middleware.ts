import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FileLogger } from './file-logger.service';

@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  private readonly logger = new FileLogger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '';

    // Log request details
    if (originalUrl === '/v1/chat/completions' && method === 'POST') {
      const requestLogData = {
        type: 'request',
        method,
        url: originalUrl,
        body: request.body,
        headers: {
          'user-agent': userAgent,
          'content-type': request.get('content-type'),
        }
      };
      this.logger.log(requestLogData, 'HTTP Request');
    }

    // Capture the original response.json method
    const originalJson = response.json;
    const self = this;  // Store reference to middleware instance
    
    response.json = function (body) {
      // Log response details including the body
      const { statusCode } = response;
      const contentLength = response.get('content-length');

      const logData = {
        type: 'response',
        method,
        url: originalUrl,
        statusCode,
        contentLength: contentLength || (response.getHeader('content-type') === 'text/event-stream' ? 'streaming' : 'no content length'),
        userAgent,
        ip,
        responseBody: body
      };

      if (statusCode >= 400) {
        self.logger.error({ ...logData, requestBody: request.body }, 'HTTP Response Error');
      } else {
        self.logger.log(logData, 'HTTP Response');
      }

      // Call the original json method with response context
      return originalJson.call(response, body);
    };

    next();
  }
}
