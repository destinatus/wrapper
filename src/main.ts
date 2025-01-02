import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SelectiveValidationPipe } from './pipes/selective-validation.pipe';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { JsonResponseInterceptor } from './interceptors/json-response.interceptor';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.enableCors();
  
  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  // Configure body parser with increased limits
  app.useBodyParser('json', { limit: '50mb' }); // Set higher limit for JSON payloads
  app.useBodyParser('urlencoded', { limit: '1gb', extended: true }); // Set higher limit for URL-encoded payloads
  app.useGlobalInterceptors(
    new ErrorLoggingInterceptor(),
    new JsonResponseInterceptor()
  );
  
  app.useGlobalPipes(new SelectiveValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3003);
}
bootstrap();
