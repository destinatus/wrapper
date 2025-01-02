import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { GeminiService } from './gemini.service';
import {
  ChatCompletionRequest,
  CompletionRequest,
  EmbeddingRequest,
} from './dto/openai.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('OpenAI Compatible API')
@Controller()
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Get('v1/models')
  @ApiOperation({ summary: 'List available models' })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of available models',
  })
  @HttpCode(HttpStatus.OK)
  async listModels() {
    return this.geminiService.listModels();
  }

  @Post('v1/chat/completions')
  @ApiOperation({ summary: 'Create a chat completion' })
  @ApiResponse({
    status: 201,
    description: 'Returns the chat completion response',
  })
  @HttpCode(HttpStatus.CREATED)
  async createChatCompletion(
    @Body() request: ChatCompletionRequest,
    @Res() res: Response,
  ) {
    if (request.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const response = await this.geminiService.createChatCompletion(request);
      const content = response.choices[0].message.content;

      // Send the initial response
      const chunk = {
        id: response.id,
        object: 'chat.completion.chunk',
        created: response.created,
        model: response.model,
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              content: content,
            },
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      // Send the final chunk
      const finalChunk = {
        id: response.id,
        object: 'chat.completion.chunk',
        created: response.created,
        model: response.model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
          },
        ],
      };
      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      return this.geminiService.createChatCompletion(request);
    }
  }

  @Post('v1/completions')
  @ApiOperation({ summary: 'Create a completion' })
  @ApiResponse({ status: 201, description: 'Returns the completion response' })
  @HttpCode(HttpStatus.CREATED)
  async createCompletion(@Body() request: CompletionRequest) {
    return this.geminiService.createCompletion(request);
  }

  @Post('v1/embeddings')
  @ApiOperation({ summary: 'Create embeddings' })
  @ApiResponse({ status: 201, description: 'Returns the embedding vectors' })
  @HttpCode(HttpStatus.CREATED)
  async createEmbedding(@Body() request: EmbeddingRequest) {
    return this.geminiService.createEmbedding(request);
  }
}
