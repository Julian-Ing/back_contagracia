import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ChatOptions, ChatResponse } from './ai-provider.interface';

@Injectable()
export class AnthropicProvider implements AIProvider {
  private readonly logger = new Logger(AnthropicProvider.name);

  async chat(apiKey: string, model: string, options: ChatOptions): Promise<ChatResponse> {
    const startTime = Date.now();

    const client = new Anthropic({ apiKey });

    const messages: Anthropic.MessageParam[] = [];

    if (options.history) {
      for (const msg of options.history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const userContent = options.context
      ? `CONTEXTO:\n${options.context}\n\nPREGUNTA:\n${options.prompt}`
      : options.prompt;

    messages.push({ role: 'user', content: userContent });

    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      system: options.systemPrompt,
      messages,
    });

    const content =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    const tokensUsed =
      (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    this.logger.log(`Anthropic [${model}] responded in ${Date.now() - startTime}ms (${tokensUsed} tokens)`);

    return {
      content,
      provider: 'anthropic',
      model,
      tokensUsed,
      responseTimeMs: Date.now() - startTime,
    };
  }
}
