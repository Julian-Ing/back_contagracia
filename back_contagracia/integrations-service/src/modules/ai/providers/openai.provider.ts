import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { AIProvider, ChatOptions, ChatResponse } from './ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);

  async chat(apiKey: string, model: string, options: ChatOptions): Promise<ChatResponse> {
    const startTime = Date.now();

    const client = new OpenAI({ apiKey });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: options.systemPrompt },
    ];

    if (options.history) {
      for (const msg of options.history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const userContent = options.context
      ? `CONTEXTO:\n${options.context}\n\nPREGUNTA:\n${options.prompt}`
      : options.prompt;

    messages.push({ role: 'user', content: userContent });

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    this.logger.log(`OpenAI [${model}] responded in ${Date.now() - startTime}ms (${tokensUsed} tokens)`);

    return {
      content,
      provider: 'openai',
      model,
      tokensUsed,
      responseTimeMs: Date.now() - startTime,
    };
  }
}
