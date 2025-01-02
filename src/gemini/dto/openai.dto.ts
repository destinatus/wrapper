import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsNumber, IsOptional, ValidateNested, IsNotEmpty, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class Message {
  @ApiProperty({ description: 'Role of the message sender', enum: ['system', 'user', 'assistant'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['system', 'user', 'assistant'])
  role: string;

  @ApiProperty({ 
    description: 'Content of the message',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'object' } }
    ]
  })
  @IsNotEmpty()
  content: string | Array<{ type: string; text?: string; content?: string }>;
}

export class StreamOptions {
  @ApiProperty({ description: 'Whether to include usage information', required: false })
  @IsBoolean()
  @IsOptional()
  include_usage?: boolean;
}

export class ChatCompletionRequest {
  @ApiProperty({ description: 'Model to use for chat completion', enum: ['gemini-pro', 'gemini-pro-vision'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['gemini-pro', 'gemini-pro-vision'], { message: 'Invalid model. Supported models are: gemini-pro, gemini-pro-vision' })
  model: string;

  @ApiProperty({ type: [Message], description: 'Array of messages for the conversation' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Message)
  messages: Message[];

  @ApiProperty({ required: false, description: 'Sampling temperature between 0 and 1' })
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiProperty({ required: false, description: 'Maximum number of tokens to generate' })
  @IsNumber()
  @IsOptional()
  max_tokens?: number;

  @ApiProperty({ required: false, description: 'Whether to stream the response' })
  @IsBoolean()
  @IsOptional()
  stream?: boolean;

  @ApiProperty({ required: false, type: StreamOptions, description: 'Options for stream mode' })
  @IsOptional()
  @ValidateNested()
  @Type(() => StreamOptions)
  stream_options?: StreamOptions;
}

export class CompletionRequest {
  @ApiProperty({ description: 'Model to use for completion', enum: ['gemini-pro', 'gemini-pro-vision'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['gemini-pro', 'gemini-pro-vision'], { message: 'Invalid model. Supported models are: gemini-pro, gemini-pro-vision' })
  model: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  max_tokens?: number;
}

export class EmbeddingRequest {
  @ApiProperty({ description: 'Model to use for embeddings', enum: ['text-embedding-004'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['text-embedding-004'], { message: 'Invalid model. Only text-embedding-004 is supported for embeddings.' })
  model: string;

  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  @IsString({ each: true })
  @IsNotEmpty()
  input: string | string[];
}

export class ModelList {
  @ApiProperty()
  object: string;

  @ApiProperty({ type: [Object] })
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}
