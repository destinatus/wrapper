import { ApiKeyValidationMiddleware } from './api-key-validation.middleware';

describe('ApiKeyValidationMiddleware', () => {
  it('should be defined', () => {
    expect(new ApiKeyValidationMiddleware()).toBeDefined();
  });
});
