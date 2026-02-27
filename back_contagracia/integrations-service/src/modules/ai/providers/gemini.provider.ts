import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, ChatOptions, ChatResponse } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AIProvider {
  private readonly logger = new Logger(GeminiProvider.name);

  async chat(apiKey: string, model: string, options: ChatOptions): Promise<ChatResponse> {
    const startTime = Date.now();

    const genAI = new GoogleGenerativeAI(apiKey);
    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: options.systemPrompt,
    });

    const history = (options.history || []).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = genModel.startChat({ history });

    const fullPrompt = options.context
      ? `CONTEXTO:\n${options.context}\n\nPREGUNTA:\n${options.prompt}`
      : options.prompt;

    const result = await chat.sendMessage(fullPrompt);
    const content = result.response.text();

    const tokensUsed = Math.ceil((fullPrompt.length + content.length) / 4);

    this.logger.log(`Gemini [${model}] responded in ${Date.now() - startTime}ms`);

    return {
      content,
      provider: 'gemini',
      model,
      tokensUsed,
      responseTimeMs: Date.now() - startTime,
    };
  }
}
