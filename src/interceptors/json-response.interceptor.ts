import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class JsonResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const isStreamRequest = request.body?.stream === true;

    // Set headers for large responses
    response.setHeader('Transfer-Encoding', 'chunked');
    response.setHeader('Content-Type', 'application/json');

    // Skip JSON formatting for streaming requests
    if (isStreamRequest) {
      return next.handle();
    }

    return next.handle().pipe(
      map(data => {
        // Return data directly without stringification
        if (!data || typeof data !== 'object') {
          return data;
        }
        return data;
      }),
    );
  }
}
