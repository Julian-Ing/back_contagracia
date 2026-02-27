import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AIConfigService } from './config/ai-config.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeneralDomainModule } from './domain-modules/general.domain-module';
import { CrmDomainModule } from './domain-modules/crm.domain-module';

@Module({
  imports: [PrismaModule],
  controllers: [AIController],
  providers: [
    AIService,
    AIConfigService,
    GeminiProvider,
    OpenAIProvider,
    AnthropicProvider,
    GeneralDomainModule,
    CrmDomainModule,
  ],
})
export class AIModule {}
