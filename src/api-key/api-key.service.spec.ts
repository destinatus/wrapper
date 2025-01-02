import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyService } from './api-key.service';
import { NotFoundException } from '@nestjs/common';

describe('ApiKeyService', () => {
  let service: ApiKeyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeyService],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateApiKey', () => {
    it('should generate a valid API key', () => {
      const apiKey = service.generateApiKey();
      expect(apiKey.key).toHaveLength(32);
      expect(apiKey.expiresAt).toBeInstanceOf(Date);
      expect(apiKey.isBlocked).toBe(false);
      expect(apiKey.usageCount).toBe(0);
    });
  });

  describe('getAllKeys', () => {
    it('should return all API keys', async () => {
      const key1 = service.generateApiKey();
      const key2 = service.generateApiKey();
      
      const keys = await service.getAllKeys();
      expect(keys).toHaveLength(2);
      expect(keys).toContainEqual(key1);
      expect(keys).toContainEqual(key2);
    });
  });

  describe('blockKey', () => {
    it('should block an existing API key', async () => {
      const apiKey = service.generateApiKey();
      const blockedKey = await service.blockKey(apiKey.key);
      
      expect(blockedKey.isBlocked).toBe(true);
    });

    it('should throw NotFoundException for non-existent key', async () => {
      await expect(service.blockKey('invalid-key'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('unblockKey', () => {
    it('should unblock a blocked API key', async () => {
      const apiKey = service.generateApiKey();
      await service.blockKey(apiKey.key);
      const unblockedKey = await service.unblockKey(apiKey.key);
      
      expect(unblockedKey.isBlocked).toBe(false);
    });

    it('should throw NotFoundException for non-existent key', async () => {
      await expect(service.unblockKey('invalid-key'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('updateExpiration', () => {
    it('should update expiration date', async () => {
      const apiKey = service.generateApiKey();
      const newDate = new Date('2030-01-01');
      const updatedKey = await service.updateExpiration(apiKey.key, newDate);
      
      expect(updatedKey.expiresAt).toEqual(newDate);
    });

    it('should throw NotFoundException for non-existent key', async () => {
      const newDate = new Date();
      await expect(service.updateExpiration('invalid-key', newDate))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage count', async () => {
      const apiKey = service.generateApiKey();
      await service.incrementUsage(apiKey.key);
      const keys = await service.getAllKeys();
      const updatedKey = keys.find(k => k.key === apiKey.key);
      
      expect(updatedKey?.usageCount).toBe(1);
      expect(updatedKey?.lastUsed).toBeInstanceOf(Date);
    });

    it('should not throw for non-existent key', async () => {
      await expect(service.incrementUsage('invalid-key'))
        .resolves
        .not.toThrow();
    });
  });
});
