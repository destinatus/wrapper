import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();
    
    return next.handle().pipe(
      catchError(error => {
        const logData = {
          url: request.url,
          method: request.method,
          params: request.params,
          query: request.query,
          body: request.body,
          headers: request.headers,
          statusCode: error.status || error.statusCode || 'undefined',
          error: {
            name: error.name,
            message: error.message,
            response: error.response?.data,
            stack: error.stack
          },
          duration: `${Date.now() - startTime}ms`,
          timestamp: new Date().toISOString(),
        };

        // Always log errors, not just 4xx and 5xx
        this.logger.error(
          `Request Error Details: ${JSON.stringify(logData, null, 2)}`,
          error.stack,
          'ErrorLoggingInterceptor'
        );

        // If the error doesn't have a status, it's likely an unhandled error
        if (!error.status && !error.statusCode) {
          this.logger.error(
            'Unhandled error detected - likely HTTP undefined error',
            error.stack,
            'ErrorLoggingInterceptor'
          );
          // Convert unhandled errors to proper HTTP exceptions
          error = new HttpException(
            {
              error: {
                message: error.message || 'An unexpected error occurred',
                type: 'internal_error',
                code: HttpStatus.INTERNAL_SERVER_ERROR
              }
            },
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
