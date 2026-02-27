import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, Audit } from '@contagracia/shared-modules';
import { AIService } from './ai.service';
import { AIConfigService } from './config/ai-config.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { UpdateAIConfigDto } from './dto/ai-config.dto';
import { AI_MODULES } from './domain-modules/domain-module.interface';

@ApiTags('AI Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly configService: AIConfigService,
  ) {}

  /** Para endpoints que requieren company (chat, sessions) */
  private extractIds(req: any): { companyId: string; userId: string } {
    const companyId = req.user.company_id;
    const userId = req.user.sub;
    if (!companyId) {
      throw new BadRequestException('Este endpoint requiere un usuario con empresa asociada.');
    }
    return { companyId, userId };
  }

  /** Para config: system_admin usa 'global', company_user usa su company_id */
  private extractConfigCompanyId(req: any): string {
    return req.user.company_id || 'global';
  }

  @Post('chat')
  @Audit('ai_chat.created', 'ai_chat')
  @ApiOperation({ summary: 'Enviar mensaje al asistente IA' })
  async chat(@Req() req: any, @Body() dto: ChatRequestDto) {
    const { companyId, userId } = this.extractIds(req);
    return this.aiService.chat(companyId, userId, dto);
  }

  @Get('config')
  @ApiOperation({ summary: 'Obtener configuración IA' })
  async getConfig(@Req() req: any) {
    const companyId = this.extractConfigCompanyId(req);
    return this.configService.getConfig(companyId);
  }

  @Patch('config')
  @Audit('ai_config.updated', 'ai_config')
  @ApiOperation({ summary: 'Actualizar configuración IA' })
  async updateConfig(@Req() req: any, @Body() dto: UpdateAIConfigDto) {
    const companyId = this.extractConfigCompanyId(req);
    return this.configService.updateConfig(companyId, dto);
  }

  @Get('modules')
  @ApiOperation({ summary: 'Listar módulos disponibles' })
  getModules() {
    return AI_MODULES;
  }

  @Post('test-connection')
  @Audit('ai_test.executed', 'ai_test')
  @ApiOperation({ summary: 'Probar conexión con proveedor IA' })
  async testConnection(@Body('provider') provider: string) {
    return this.aiService.testConnection(provider);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Listar sesiones de chat del usuario' })
  async getSessions(@Req() req: any) {
    const { companyId, userId } = this.extractIds(req);
    return this.aiService.getSessions(companyId, userId);
  }

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: 'Obtener mensajes de una sesión' })
  async getSessionMessages(@Req() req: any, @Param('id') sessionId: string) {
    const { companyId, userId } = this.extractIds(req);
    return this.aiService.getSessionMessages(companyId, userId, sessionId);
  }

  @Post('sessions')
  @Audit('ai_session.created', 'ai_session')
  @ApiOperation({ summary: 'Crear nueva sesión de chat' })
  async createSession(
    @Req() req: any,
    @Body('moduleId') moduleId?: string,
    @Body('title') title?: string,
  ) {
    const { companyId, userId } = this.extractIds(req);
    return this.aiService.createSession(companyId, userId, moduleId, title);
  }
}
