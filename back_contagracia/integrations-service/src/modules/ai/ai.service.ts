import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { AIConfigService } from './config/ai-config.service';
import { AIProvider, ChatOptions, ChatResponse } from './providers/ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { DomainModule } from './domain-modules/domain-module.interface';
import { GeneralDomainModule } from './domain-modules/general.domain-module';
import { CrmDomainModule } from './domain-modules/crm.domain-module';
import { ChatRequestDto } from './dto/chat-request.dto';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly providers: Map<string, AIProvider>;
  private readonly domainModules: Map<string, DomainModule>;

  constructor(
    private readonly configService: AIConfigService,
    private readonly tenantContext: TenantContextService,
    private readonly geminiProvider: GeminiProvider,
    private readonly openaiProvider: OpenAIProvider,
    private readonly anthropicProvider: AnthropicProvider,
    private readonly generalModule: GeneralDomainModule,
    private readonly crmModule: CrmDomainModule,
  ) {
    this.providers = new Map<string, AIProvider>([
      ['gemini', this.geminiProvider],
      ['openai', this.openaiProvider],
      ['anthropic', this.anthropicProvider],
    ]);

    this.domainModules = new Map<string, DomainModule>([
      ['general', this.generalModule],
      ['crm', this.crmModule],
    ]);
  }

  async chat(companyId: string, userId: string, dto: ChatRequestDto) {
    const startTime = Date.now();

    // 1. Cargar config de la empresa
    const config = await this.configService.getConfig(companyId);
    const providerCode = config.active_provider;

    // 2. Obtener provider
    const provider = this.providers.get(providerCode);
    if (!provider) {
      throw new BadRequestException(`Provider "${providerCode}" not supported`);
    }

    // 3. Obtener API key
    const apiKey = await this.configService.getApiKey(providerCode);

    // 4. Obtener modelo
    const model = this.getModel(config, providerCode);

    // 5. Resolver módulo de dominio
    const moduleId = dto.moduleId || 'general';
    const domainModule = this.domainModules.get(moduleId) || this.domainModules.get('general')!;

    // 6. Obtener contexto del módulo
    const moduleContext = await domainModule.getContext(companyId, dto.prompt);

    // 7. Construir system prompt
    const systemPrompt = await this.configService.getSystemPrompt(companyId);

    // 8. Construir contexto completo
    let contextBlock = '';
    if (moduleContext.data) {
      contextBlock = `\n\nCONTEXTO DE DATOS (${moduleContext.description}):\n${JSON.stringify(moduleContext.data, null, 2)}`;
    }
    if (moduleContext.instructions.length > 0) {
      contextBlock += `\n\nINSTRUCCIONES DEL MÓDULO:\n${moduleContext.instructions.map((i) => `- ${i}`).join('\n')}`;
    }

    // 9. Cargar historial de la sesión
    const history = await this.getSessionHistory(companyId, dto.sessionId);

    // 10. Llamar al provider
    const chatOptions: ChatOptions = {
      systemPrompt: systemPrompt + contextBlock,
      prompt: dto.prompt,
      history,
    };

    let response: ChatResponse;
    try {
      response = await provider.chat(apiKey, model, chatOptions);
    } catch (error) {
      this.logger.error(`AI provider error (${providerCode}): ${error.message}`, error.stack);
      throw new BadRequestException(
        `Error al comunicarse con ${providerCode}. Verifica la API key y el modelo configurado.`,
      );
    }

    // 11. Guardar mensajes en tenant DB
    await this.saveMessages(companyId, userId, dto, response, moduleId);

    return {
      content: response.content,
      sessionId: dto.sessionId,
      metadata: {
        provider: response.provider,
        model: response.model,
        tokensUsed: response.tokensUsed,
        responseTimeMs: response.responseTimeMs,
        moduleId,
      },
    };
  }

  async testConnection(providerCode: string): Promise<{ success: boolean; message: string; responseTimeMs: number }> {
    const provider = this.providers.get(providerCode);
    if (!provider) {
      return { success: false, message: `Provider "${providerCode}" no soportado`, responseTimeMs: 0 };
    }

    try {
      const apiKey = await this.configService.getApiKey(providerCode);
      const startTime = Date.now();

      await provider.chat(apiKey, this.getDefaultModel(providerCode), {
        systemPrompt: 'Eres un asistente de prueba.',
        prompt: 'Responde solo "OK" para confirmar que la conexión funciona.',
        history: [],
      });

      return {
        success: true,
        message: `Conexión exitosa con ${providerCode}`,
        responseTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error.message}`,
        responseTimeMs: 0,
      };
    }
  }

  async getSessions(companyId: string, userId: string) {
    const tenant = await this.tenantContext.getTenantClient(companyId);
    if (!tenant) return [];

    return tenant.aIChatSession.findMany({
      where: { user_id: userId },
      orderBy: { last_message_at: 'desc' },
      take: 50,
    });
  }

  async getSessionMessages(companyId: string, userId: string, sessionId: string) {
    const tenant = await this.tenantContext.getTenantClient(companyId);
    if (!tenant) return [];

    // Verificar que la sesión pertenece al usuario
    const session = await tenant.aIChatSession.findFirst({
      where: { id: sessionId, user_id: userId },
    });
    if (!session) return [];

    return tenant.aIChatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
    });
  }

  async createSession(companyId: string, userId: string, moduleId?: string, title?: string) {
    const tenant = await this.tenantContext.getTenantClient(companyId);
    if (!tenant) throw new BadRequestException('No se pudo conectar al tenant');

    return tenant.aIChatSession.create({
      data: {
        user_id: userId,
        module_id: moduleId || 'general',
        title: title || 'Nueva conversación',
        last_message_at: new Date(),
      },
    });
  }

  private async getSessionHistory(companyId: string, sessionId: string) {
    const tenant = await this.tenantContext.getTenantClient(companyId);
    if (!tenant) return [];

    const messages = await tenant.aIChatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
      take: 20, // Últimos 20 mensajes para contexto
    });

    return messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }

  private async saveMessages(
    companyId: string,
    userId: string,
    dto: ChatRequestDto,
    response: ChatResponse,
    moduleId: string,
  ) {
    const tenant = await this.tenantContext.getTenantClient(companyId);
    if (!tenant) return;

    // Asegurar que la sesión existe
    const existingSession = await tenant.aIChatSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!existingSession) {
      await tenant.aIChatSession.create({
        data: {
          id: dto.sessionId,
          user_id: userId,
          module_id: moduleId,
          title: dto.prompt.substring(0, 80),
          last_message_at: new Date(),
        },
      });
    } else {
      await tenant.aIChatSession.update({
        where: { id: dto.sessionId },
        data: { last_message_at: new Date(), module_id: moduleId },
      });
    }

    // Guardar mensaje del usuario
    await tenant.aIChatMessage.create({
      data: {
        session_id: dto.sessionId,
        user_id: userId,
        role: 'user',
        content: dto.prompt,
        module_id: moduleId,
      },
    });

    // Guardar respuesta del asistente
    await tenant.aIChatMessage.create({
      data: {
        session_id: dto.sessionId,
        user_id: userId,
        role: 'assistant',
        content: response.content,
        module_id: moduleId,
        provider: response.provider,
        model: response.model,
        tokens_used: response.tokensUsed,
        response_time_ms: response.responseTimeMs,
      },
    });
  }

  private getModel(config: any, providerCode: string): string {
    switch (providerCode) {
      case 'gemini': return config.gemini_model;
      case 'openai': return config.openai_model;
      case 'anthropic': return config.anthropic_model;
      default: return 'gemini-2.5-flash';
    }
  }

  private getDefaultModel(providerCode: string): string {
    switch (providerCode) {
      case 'gemini': return 'gemini-2.5-flash';
      case 'openai': return 'gpt-4o';
      case 'anthropic': return 'claude-sonnet-4-5';
      default: return 'gemini-2.5-flash';
    }
  }
}
