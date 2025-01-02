import { Controller, Post, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiKeyService, ApiKey } from './api-key.service';

@Controller('api-key')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  async getAllKeys(): Promise<ApiKey[]> {
    return this.apiKeyService.getAllKeys();
  }

  @Post('generate')
  async generateApiKey(): Promise<ApiKey> {
    return this.apiKeyService.generateApiKey();
  }

  @Patch(':key/block')
  async blockKey(@Param('key') key: string): Promise<ApiKey> {
    return this.apiKeyService.blockKey(key);
  }

  @Patch(':key/unblock')
  async unblockKey(@Param('key') key: string): Promise<ApiKey> {
    return this.apiKeyService.unblockKey(key);
  }

  @Patch(':key/expiration')
  async updateExpiration(
    @Param('key') key: string,
    @Body('expiresAt') expiresAt: string,
  ): Promise<ApiKey> {
    return this.apiKeyService.updateExpiration(key, new Date(expiresAt));
  }
}
