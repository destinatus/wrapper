import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService, ApiKey } from './api-key.service';
import { NotFoundException } from '@nestjs/common';

class MockApiKeyService implements Partial<ApiKeyService> {
  private mockKey: ApiKey = {
    key: 'test-key',
    expiresAt: new Date(),
    isBlocked: false,
    usageCount: 0,
    lastUsed: undefined
  };

  getAllKeys = jest.fn().mockResolvedValue([this.mockKey]);
  generateApiKey = jest.fn().mockResolvedValue(this.mockKey);
  blockKey = jest.fn().mockResolvedValue({ ...this.mockKey, isBlocked: true });
  unblockKey = jest.fn().mockResolvedValue({ ...this.mockKey, isBlocked: false });
  updateExpiration = jest.fn().mockImplementation((key: string, expiresAt: Date) => 
    Promise.resolve({ ...this.mockKey, expiresAt })
  );
}

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let service: ApiKeyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeyController],
      providers: [
        {
          provide: ApiKeyService,
          useClass: MockApiKeyService,
        },
      ],
    }).compile();

    controller = module.get<ApiKeyController>(ApiKeyController);
    service = module.get<ApiKeyService>(ApiKeyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api-key', () => {
    it('should return all API keys', async () => {
      const mockKeys: ApiKey[] = [{ key: 'test-key', expiresAt: new Date(), isBlocked: false, usageCount: 0, lastUsed: undefined }];
      jest.spyOn(service, 'getAllKeys').mockResolvedValue(mockKeys);

      const result = await controller.getAllKeys();
      expect(result).toEqual(mockKeys);
      expect(service.getAllKeys).toHaveBeenCalled();
    });
  });

  describe('POST /api-key/generate', () => {
    it('should generate a new API key', async () => {
      const mockKey: ApiKey = { key: 'new-key', expiresAt: new Date(), isBlocked: false, usageCount: 0, lastUsed: undefined };
      jest.spyOn(service, 'generateApiKey').mockResolvedValue(mockKey);

      const result = await controller.generateApiKey();
      expect(result).toEqual(mockKey);
      expect(service.generateApiKey).toHaveBeenCalled();
    });
  });

  describe('PATCH /api-key/:key/block', () => {
    it('should block an API key', async () => {
      const mockKey: ApiKey = { key: 'test-key', expiresAt: new Date(), isBlocked: true, usageCount: 0, lastUsed: undefined };
      jest.spyOn(service, 'blockKey').mockResolvedValue(mockKey);

      const result = await controller.blockKey('test-key');
      expect(result).toEqual(mockKey);
      expect(service.blockKey).toHaveBeenCalledWith('test-key');
    });

    it('should throw NotFoundException for non-existent key', async () => {
      jest.spyOn(service, 'blockKey').mockRejectedValue(new NotFoundException());
      
      await expect(controller.blockKey('invalid-key'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('PATCH /api-key/:key/unblock', () => {
    it('should unblock an API key', async () => {
      const mockKey: ApiKey = { key: 'test-key', expiresAt: new Date(), isBlocked: false, usageCount: 0, lastUsed: undefined };
      jest.spyOn(service, 'unblockKey').mockResolvedValue(mockKey);

      const result = await controller.unblockKey('test-key');
      expect(result).toEqual(mockKey);
      expect(service.unblockKey).toHaveBeenCalledWith('test-key');
    });

    it('should throw NotFoundException for non-existent key', async () => {
      jest.spyOn(service, 'unblockKey').mockRejectedValue(new NotFoundException());
      
      await expect(controller.unblockKey('invalid-key'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('PATCH /api-key/:key/expiration', () => {
    it('should update expiration date', async () => {
      const newDate = '2030-01-01';
      const mockKey: ApiKey = { key: 'test-key', expiresAt: new Date(newDate), isBlocked: false, usageCount: 0, lastUsed: undefined };
      jest.spyOn(service, 'updateExpiration').mockResolvedValue(mockKey);

      const result = await controller.updateExpiration('test-key', newDate);
      expect(result).toEqual(mockKey);
      expect(service.updateExpiration).toHaveBeenCalledWith('test-key', new Date(newDate));
    });

    it('should throw NotFoundException for non-existent key', async () => {
      jest.spyOn(service, 'updateExpiration').mockRejectedValue(new NotFoundException());
      
      await expect(controller.updateExpiration('invalid-key', '2030-01-01'))
        .rejects
        .toThrow(NotFoundException);
    });
  });
});
