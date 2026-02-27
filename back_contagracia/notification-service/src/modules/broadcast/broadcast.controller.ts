import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { Audit, Public } from '@contagracia/shared-modules';
import { BroadcastService } from './broadcast.service.js';
import { SendBroadcastDto } from './dto/index.js';
import { CompanyNotificationsService } from '../company-notifications/company-notifications.service.js';
import { CreateNotificationDto } from '../company-notifications/dto/create-notification.dto.js';

@ApiTags('broadcast')
@Controller('notifications')
export class BroadcastController {
  constructor(
    private readonly broadcastService: BroadcastService,
    private readonly companyNotificationsService: CompanyNotificationsService,
  ) {}

  /**
   * Permission: PUBLIC (service-to-service)
   * Crea una notificación individual para una empresa
   * Usado por tax-service para enviar recordatorios
   */
  @Public()
  @Post()
  @ApiOperation({ summary: 'Crear notificación para empresa (interno)' })
  @ApiBody({ type: CreateNotificationDto })
  async createNotification(@Body() dto: CreateNotificationDto) {
    return this.companyNotificationsService.create(dto);
  }

  @Audit('notification.broadcast', 'notification')
  @Post('broadcast')
  @ApiOperation({ summary: 'Enviar broadcast notification a empresas' })
  async sendBroadcast(@Body() dto: SendBroadcastDto) {
    return this.broadcastService.sendBroadcast(dto);
  }

  @Get('broadcasts')
  @ApiOperation({ summary: 'Listar historial de broadcasts enviados' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.broadcastService.findAll(page, limit);
  }
}
