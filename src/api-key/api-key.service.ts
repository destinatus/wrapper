import { Injectable, NotFoundException } from '@nestjs/common';

export interface ApiKey {
  key: string;
  expiresAt: Date;
  isBlocked: boolean;
  usageCount: number;
  lastUsed?: Date;
}

@Injectable()
export class ApiKeyService {
  private apiKeys: Map<string, ApiKey> = new Map();

  async getAllKeys(): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values());
  }

  async blockKey(key: string): Promise<ApiKey> {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }
    apiKey.isBlocked = true;
    return apiKey;
  }

  async unblockKey(key: string): Promise<ApiKey> {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }
    apiKey.isBlocked = false;
    return apiKey;
  }

  async updateExpiration(key: string, newExpirationDate: Date): Promise<ApiKey> {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }
    apiKey.expiresAt = newExpirationDate;
    return apiKey;
  }

  async incrementUsage(key: string): Promise<void> {
    const apiKey = this.apiKeys.get(key);
    if (apiKey) {
      apiKey.usageCount++;
      apiKey.lastUsed = new Date();
    }
  }

  generateApiKey(): ApiKey {
    const key = this.generateRandomKey();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expires in 30 days
    
    const apiKey: ApiKey = {
      key,
      expiresAt,
      isBlocked: false,
      usageCount: 0
    };
    
    this.apiKeys.set(key, apiKey);
    return {
      key: apiKey.key,
      expiresAt: apiKey.expiresAt,
      isBlocked: apiKey.isBlocked,
      usageCount: apiKey.usageCount,
      lastUsed: undefined
    };
  }

  private generateRandomKey(): string {
    const length = 32;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
