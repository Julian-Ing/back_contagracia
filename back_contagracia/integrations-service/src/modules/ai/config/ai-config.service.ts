import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateAIConfigDto } from '../dto/ai-config.dto';
import { buildSystemPrompt } from '../utils/prompt-builder.util';

@Injectable()
export class AIConfigService {
  private readonly logger = new Logger(AIConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(companyId: string) {
    let config = await this.prisma.aIConfiguration.findUnique({
      where: { company_id: companyId },
    });

    if (!config && companyId !== 'global') {
      // Heredar de config global si existe
      const globalConfig = await this.prisma.aIConfiguration.findUnique({
        where: { company_id: 'global' },
      });

      if (globalConfig) {
        const { id, company_id, created_at, updated_at, ...defaults } = globalConfig;
        this.logger.log(`Creating AI config for company ${companyId} based on global config`);
        config = await this.prisma.aIConfiguration.create({
          data: { company_id: companyId, ...defaults },
        });
      }
    }

    if (!config) {
      this.logger.log(`Creating default AI config for ${companyId}`);
      config = await this.prisma.aIConfiguration.create({
        data: { company_id: companyId },
      });
    }

    return config;
  }

  async updateConfig(companyId: string, dto: UpdateAIConfigDto) {
    return this.prisma.aIConfiguration.upsert({
      where: { company_id: companyId },
      create: { company_id: companyId, ...dto },
      update: dto,
    });
  }

  async getApiKey(providerCode: string): Promise<string> {
    const integration = await this.prisma.integration.findUnique({
      where: { code: providerCode },
      include: { keys: true },
    });

    if (!integration) {
      throw new NotFoundException(`Integration "${providerCode}" not found`);
    }

    const apiKeyRecord = integration.keys.find((k) => k.key_name === 'api_key');

    if (!apiKeyRecord?.key_value) {
      throw new NotFoundException(
        `API key not configured for "${providerCode}". Configure it in Admin → Integrations.`,
      );
    }

    return apiKeyRecord.key_value;
  }

  async getSystemPrompt(companyId: string): Promise<string> {
    const config = await this.getConfig(companyId);
    return buildSystemPrompt({
      assistant_name: config.assistant_name,
      assistant_role: config.assistant_role,
      tone: config.tone,
      detail_level: config.detail_level,
      use_emojis: config.use_emojis,
      proactive_suggestions: config.proactive_suggestions,
    });
  }
}
