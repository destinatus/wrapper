import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
type AxiosError = any;
import {
  ChatCompletionRequest,
  CompletionRequest,
  EmbeddingRequest,
} from './dto/openai.dto';
import { FileLogger } from '../logging/file-logger.service';

interface MessageContent {
  type?: string;
  text?: string;
  content?: string;
}

interface GeminiContent {
  role: string;
  parts: Array<{ text: string }>;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    text?: string;
  }>;
}

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

interface GeminiBatchEmbeddingResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

@Injectable()
export class GeminiService {
  private readonly apiEndpoint =
    'https://generativelanguage.googleapis.com/v1/models';
  private readonly defaultModel: string = 'gemini-pro';
  private readonly supportedModels = ['gemini-pro', 'gemini-pro-vision'];
  private readonly chunkSize = 100; // Number of characters per chunk for streaming

  private readonly logger: FileLogger;

  constructor(private configService: ConfigService) {
    this.logger = new FileLogger('GeminiService');
  }

  async listModels() {
    return {
      object: 'list',
      data: [
        {
          id: 'gemini-pro',
          object: 'model',
          created: Date.now(),
          owned_by: 'google',
        },
        {
          id: 'gemini-pro-vision',
          object: 'model',
          created: Date.now(),
          owned_by: 'google',
        },
      ],
    };
  }

  private validateModel(model: string): string {
    if (!model || !this.supportedModels.includes(model)) {
      throw new HttpException(
        {
          error: {
            message: `Unsupported model: ${model}. Supported models are: ${this.supportedModels.join(', ')}`,
            type: 'invalid_request_error',
            code: HttpStatus.BAD_REQUEST,
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return model;
  }

  private sanitizeControlCharacters(text: string | any): any {
    if (typeof text === 'string') {
      return text
        .replace(
          /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
          '',
        )
        .replace(
          /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF]|[\uDC00-\uDFFF]/g,
          '',
        );
    } else if (Array.isArray(text)) {
      return text.map((item) => this.sanitizeControlCharacters(item));
    } else if (typeof text === 'object' && text !== null) {
      const sanitizedObj = {};
      for (const [key, value] of Object.entries(text)) {
        try {
          sanitizedObj[key] = this.sanitizeControlCharacters(value);
        } catch (error) {
          this.logger.warn(
            `Failed to sanitize value for key ${key}`,
            'sanitizeControlCharacters',
          );
          sanitizedObj[key] = null;
        }
      }
      return sanitizedObj;
    }
    return text;
  }

  private sanitizeResponse(response: any): any {
    try {
      const sanitized = this.sanitizeControlCharacters(response);
      JSON.parse(JSON.stringify(sanitized));
      return sanitized;
    } catch (error) {
      this.logger.warn(
        'Failed to sanitize response, falling back to basic sanitization',
        'sanitizeResponse',
      );
      if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: this.sanitizeControlCharacters(
                      response.candidates[0].content.parts[0].text,
                    ),
                  },
                ],
              },
            },
          ],
        };
      }
      return response;
    }
  }

  private calculateTokenUsage(messages: any[], generatedText: string) {
    return {
      prompt_tokens: Math.ceil(
        messages.reduce((acc, msg) => {
          if (Array.isArray(msg.content)) {
            return acc + JSON.stringify(msg.content).length;
          }
          return acc + msg.content.length;
        }, 0) / 4,
      ),
      completion_tokens: Math.ceil(generatedText.length / 4),
      total_tokens: Math.ceil(
        (messages.reduce((acc, msg) => {
          if (Array.isArray(msg.content)) {
            return acc + JSON.stringify(msg.content).length;
          }
          return acc + msg.content.length;
        }, 0) +
          generatedText.length) /
          4,
      ),
    };
  }

  async createChatCompletion(request: ChatCompletionRequest) {
    try {
      this.logger.log(
        'Starting chat completion request',
        'createChatCompletion',
      );
      const apiKey = this.configService.get<string>('gemini.apiKey');
      if (!apiKey) {
        this.logger.error(
          'Gemini API key not configured',
          null,
          'createChatCompletion',
        );
        throw new HttpException(
          'Gemini API key not configured',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> =
        request.messages
          .filter((msg) => msg.role !== 'system')
          .map((msg) => {
            let messageText: string;

            if (typeof msg.content === 'string') {
              messageText = msg.content;
            } else {
              messageText = msg.content
                .map((part) => part.text || part.content || '')
                .filter(Boolean)
                .join('\n');
            }

            if (!messageText.trim()) {
              messageText = '[Empty message]';
            }

            return {
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: this.sanitizeControlCharacters(messageText) }],
            };
          });

      const model = this.validateModel(request.model || this.defaultModel);

      const requestPayload = {
        contents: contents.map((content) => ({
          role: content.role === 'system' ? 'user' : content.role,
          parts: content.parts.map((part) => ({
            text: part.text,
          })),
        })),
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.max_tokens ?? 1024,
          topP: 0.8,
          topK: 40,
        },
      };

      this.logger.log(
        {
          message: 'Sending request to Gemini API',
          model,
          requestPayload,
        },
        'createChatCompletion',
      );

      let apiResponse;
      try {
        apiResponse = await axios.post<GeminiResponse>(
          `${this.apiEndpoint}/${model}:generateContent?key=${apiKey}`,
          requestPayload,
        );
      } catch (error) {
        if (error && typeof error === 'object' && 'isAxiosError' in error) {
          const axiosError = error as AxiosError;
          if (axiosError.response?.status === 400) {
            const retryPayload = {
              contents: contents.map((content: GeminiContent) => ({
                role: content.role === 'system' ? 'user' : content.role,
                parts: [{ text: content.parts[0].text }],
              })),
              generationConfig: {
                temperature: request.temperature ?? 0.7,
                maxOutputTokens: request.max_tokens ?? 1024,
                topP: 0.8,
                topK: 40,
              },
            };

            apiResponse = await axios.post<GeminiResponse>(
              `${this.apiEndpoint}/${model}:generateContent?key=${apiKey}`,
              retryPayload,
            );
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      const sanitizedResponse = this.sanitizeResponse(apiResponse.data);
      const generatedText =
        sanitizedResponse.candidates?.[0]?.content?.parts?.[0]?.text ||
        sanitizedResponse.candidates?.[0]?.text ||
        'No response generated';

      if (generatedText === 'No response generated') {
        this.logger.warn(
          'No text was generated in the response',
          'createChatCompletion',
        );
      }

      const timestamp = Date.now();
      const usage = this.calculateTokenUsage(request.messages, generatedText);

      return {
        id: `chatcmpl-${timestamp}`,
        object: 'chat.completion',
        created: timestamp,
        model: request.model || this.defaultModel,
        system_fingerprint: `fp_${timestamp}`,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: generatedText,
            },
            finish_reason: 'stop',
          },
        ],
        usage: request.stream_options?.include_usage ? usage : undefined,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCompletion(request: CompletionRequest) {
    try {
      this.logger.log('Starting completion request', 'createCompletion');
      const apiKey = this.configService.get<string>('gemini.apiKey');
      if (!apiKey) {
        this.logger.error(
          'Gemini API key not configured',
          null,
          'createCompletion',
        );
        throw new HttpException(
          'Gemini API key not configured',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const model = this.validateModel(request.model || this.defaultModel);

      const requestPayload = {
        contents: [
          {
            parts: [
              {
                text: this.sanitizeControlCharacters(request.prompt),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.max_tokens ?? 1024,
          topP: 0.8,
          topK: 40,
        },
      };

      const apiResponse = await axios.post<GeminiResponse>(
        `${this.apiEndpoint}/${model}:generateContent?key=${apiKey}`,
        requestPayload,
      );

      const sanitizedResponse = this.sanitizeResponse(apiResponse.data);
      let generatedText = 'No response generated';

      if (sanitizedResponse.candidates?.[0]) {
        const candidate = sanitizedResponse.candidates[0];

        if (candidate.content?.parts?.[0]?.text) {
          generatedText = candidate.content.parts[0].text;
        } else if (candidate.text) {
          generatedText = candidate.text;
        } else if (candidate.content?.text) {
          generatedText = candidate.content.text;
        } else {
          this.logger.warn(
            {
              message: 'Unexpected response structure',
              candidateStructure: JSON.stringify(candidate, null, 2),
            },
            'createCompletion',
          );
        }
      }

      return {
        id: `cmpl-${Date.now()}`,
        object: 'text_completion',
        created: Date.now(),
        model: request.model || this.defaultModel,
        choices: [
          {
            text: generatedText,
            index: 0,
            logprobs: null,
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: Math.ceil(request.prompt.length / 4),
          completion_tokens: Math.ceil(generatedText.length / 4),
          total_tokens: Math.ceil(
            (request.prompt.length + generatedText.length) / 4,
          ),
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createEmbedding(request: EmbeddingRequest) {
    try {
      this.logger.log('Starting embedding request', 'createEmbedding');
      const apiKey = this.configService.get<string>('gemini.apiKey');
      if (!apiKey) {
        this.logger.error(
          'Gemini API key not configured',
          null,
          'createEmbedding',
        );
        throw new HttpException(
          'Gemini API key not configured',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const inputs = Array.isArray(request.input)
        ? request.input
        : [request.input];

      const endpoint =
        inputs.length > 1
          ? `${this.apiEndpoint}/text-embedding-004:batchEmbedContents`
          : `${this.apiEndpoint}/text-embedding-004:embedContent`;

      const requestPayload =
        inputs.length > 1
          ? {
              requests: inputs.map((input) => ({
                content: {
                  parts: [
                    {
                      text: this.sanitizeControlCharacters(input),
                    },
                  ],
                },
              })),
            }
          : {
              content: {
                parts: [
                  {
                    text: this.sanitizeControlCharacters(inputs[0]),
                  },
                ],
              },
            };

      const apiResponse = await axios.post<
        GeminiEmbeddingResponse | GeminiBatchEmbeddingResponse
      >(`${endpoint}?key=${apiKey}`, requestPayload);

      const sanitizedResponse = this.sanitizeResponse(apiResponse.data);
      const embeddings =
        inputs.length > 1
          ? (sanitizedResponse as GeminiBatchEmbeddingResponse).embeddings
          : [(sanitizedResponse as GeminiEmbeddingResponse).embedding];

      return {
        object: 'list',
        data: embeddings.map((embedding, i) => ({
          object: 'embedding',
          embedding: embedding.values,
          index: i,
        })),
        model: 'text-embedding-004',
        usage: {
          prompt_tokens: Math.ceil(
            inputs.reduce((acc, text) => acc + text.length, 0) / 4,
          ),
          total_tokens: Math.ceil(
            inputs.reduce((acc, text) => acc + text.length, 0) / 4,
          ),
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: unknown) {
    if (error && typeof error === 'object' && 'isAxiosError' in error) {
      const axiosError = error as AxiosError;
      const status =
        axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      let errorMessage =
        axiosError.response?.data?.error?.message ||
        axiosError.message ||
        'Unknown error occurred';
      const requestData =
        typeof axiosError.config?.data === 'string'
          ? JSON.parse(axiosError.config.data)
          : axiosError.config?.data;

      const apiErrorDetails =
        axiosError.response?.data?.error?.details?.[0]?.description ||
        axiosError.response?.data?.error?.details?.[0]?.reason ||
        '';
      const fieldViolations =
        axiosError.response?.data?.error?.details?.[0]?.fieldViolations;

      if (apiErrorDetails) {
        errorMessage = `${errorMessage}\nDetails: ${apiErrorDetails}`;
      }

      if (fieldViolations?.length) {
        const violations = fieldViolations
          .map((v) => `${v.field}: ${v.description}`)
          .join('\n');
        errorMessage = `${errorMessage}\nField violations:\n${violations}`;
      }

      this.logger.error(
        {
          message: `Gemini API error: ${errorMessage}`,
          status,
          error: {
            response: axiosError.response?.data,
            request: {
              method: axiosError.config?.method,
              url: axiosError.config?.url,
              data: requestData,
            },
            stack: axiosError.stack,
          },
        },
        null,
        'GeminiService',
      );

      if (status === 400) {
        errorMessage = `${errorMessage}\nRequest payload: ${JSON.stringify(requestData, null, 2)}`;
      }
      throw new HttpException(
        {
          error: {
            message: `Gemini API error: ${errorMessage}`,
            type: 'gemini_error',
            code: status,
          },
        },
        status,
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    this.logger.error(
      {
        message: errorMessage,
        error:
          error instanceof Error
            ? {
                name: error.name,
                stack: error.stack,
              }
            : error,
      },
      null,
      'GeminiService',
    );

    throw new HttpException(
      {
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
          type: 'internal_error',
          code: HttpStatus.INTERNAL_SERVER_ERROR,
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
