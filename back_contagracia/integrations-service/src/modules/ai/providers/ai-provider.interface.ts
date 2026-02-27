export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  systemPrompt: string;
  prompt: string;
  context?: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed: number;
  responseTimeMs: number;
}

export interface AIProvider {
  chat(apiKey: string, model: string, options: ChatOptions): Promise<ChatResponse>;
}
