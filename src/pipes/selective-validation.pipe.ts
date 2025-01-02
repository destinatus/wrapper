import { ValidationPipe } from '@nestjs/common';

export class SelectiveValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
  }

  async transform(value: any, metadata: any) {
    // Skip validation for chat/completions endpoint
    if (metadata?.metatype?.name === 'ChatCompletionRequest') {
      return value;
    }
    return super.transform(value, metadata);
  }
}
