import { Test, TestingModule } from '@nestjs/testing';
import { GeminiController } from './gemini.controller';
import { GeminiService } from './gemini.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { GenerateResponseDto } from './dto/generate-response.dto';

describe('GeminiController', () => {
  let controller: GeminiController;
  let geminiService: GeminiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeminiController],
      providers: [
        {
          provide: GeminiService,
          useValue: {
            generateResponse: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GeminiController>(GeminiController);
    geminiService = module.get<GeminiService>(GeminiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /gemini', () => {
    it('should return response for valid prompt (positive case 1)', async () => {
      const mockResponse = 'Mocked response';
      const dto = new GenerateResponseDto();
      dto.prompt = 'What is the capital of France?';
      (geminiService.generateResponse as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.generateResponse(dto);
      expect(result).toBe(mockResponse);
      expect(geminiService.generateResponse).toHaveBeenCalledWith(dto.prompt);
    });

    it('should return response for another valid prompt (positive case 2)', async () => {
      const mockResponse = 'Another mocked response';
      const dto = new GenerateResponseDto();
      dto.prompt = 'Explain quantum computing in simple terms';
      (geminiService.generateResponse as jest.Mock).mockResolvedValue(mockResponse);

      const result = await controller.generateResponse(dto);
      expect(result).toBe(mockResponse);
      expect(geminiService.generateResponse).toHaveBeenCalledWith(dto.prompt);
    });

    it('should throw error for invalid prompt length (negative case 1)', async () => {
      const dto = new GenerateResponseDto();
      dto.prompt = 'a'.repeat(10001); // Exceeds max length
      (geminiService.generateResponse as jest.Mock).mockRejectedValue(new Error('Prompt length exceeds maximum limit'));

      await expect(controller.generateResponse(dto)).rejects.toThrow(BadRequestException);
      expect(geminiService.generateResponse).toHaveBeenCalledWith(dto.prompt);
    });

    it('should throw error for empty prompt (negative case 2)', async () => {
      const dto = new GenerateResponseDto();
      dto.prompt = '';
      (geminiService.generateResponse as jest.Mock).mockRejectedValue(new Error('Prompt cannot be empty'));

      await expect(controller.generateResponse(dto)).rejects.toThrow(BadRequestException);
      expect(geminiService.generateResponse).toHaveBeenCalledWith(dto.prompt);
    });

    it('should handle missing prompt', async () => {
      const dto = new GenerateResponseDto();
      (geminiService.generateResponse as jest.Mock).mockRejectedValue(new Error('Prompt is required'));

      await expect(controller.generateResponse(dto)).rejects.toThrow(BadRequestException);
    });

    it('should handle unauthorized access', async () => {
      const dto = new GenerateResponseDto();
      dto.prompt = 'Test prompt';
      (geminiService.generateResponse as jest.Mock).mockRejectedValue(new UnauthorizedException());

      await expect(controller.generateResponse(dto)).rejects.toThrow(UnauthorizedException);
      expect(geminiService.generateResponse).toHaveBeenCalledWith(dto.prompt);
    });

    // Test Swagger documentation
    it('should have proper Swagger documentation', () => {
      const metadata = Reflect.getMetadata('swagger/apiResponse', controller.generateResponse);
      expect(metadata).toBeDefined();
      expect(metadata['200']).toEqual(
        expect.objectContaining({
          description: 'Successful response',
          type: String
        })
      );
      expect(metadata['400']).toEqual(
        expect.objectContaining({
          description: 'Bad request - Invalid prompt'
        })
      );
      expect(metadata['401']).toEqual(
        expect.objectContaining({
          description: 'Unauthorized'
        })
      );
    });
  });
});
