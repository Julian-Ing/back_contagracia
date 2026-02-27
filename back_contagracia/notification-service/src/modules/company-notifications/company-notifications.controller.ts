import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Audit, Public } from '@contagracia/shared-modules';
import { CompanyNotificationsService } from './company-notifications.service.js';
import { NotificationCleanupJob } from './jobs/notification-cleanup.job.js';

@ApiTags('company-notifications')
@Controller('notifications/company')
export class CompanyNotificationsController {
  constructor(
    private readonly companyNotificationsService: CompanyNotificationsService,
    private readonly cleanupJob: NotificationCleanupJob,
  ) {}

  @Get(':companyId')
  @ApiOperation({ summary: 'Listar notificaciones de una empresa' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'user_id', required: false, description: 'Filtra excluyendo notificaciones no dirigidas a este usuario' })
  async findByCompany(
    @Param('companyId') companyId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('user_id') userId?: string,
  ) {
    return this.companyNotificationsService.findByCompany(
      companyId,
      page,
      limit,
      userId,
    );
  }

  @Get(':companyId/unread-count')
  @ApiOperation({ summary: 'Obtener cantidad de notificaciones no leídas' })
  @ApiQuery({ name: 'user_id', required: false, description: 'Filtra excluyendo notificaciones no dirigidas a este usuario' })
  async getUnreadCount(
    @Param('companyId') companyId: string,
    @Query('user_id') userId?: string,
  ) {
    return this.companyNotificationsService.getUnreadCount(companyId, userId);
  }

  @Audit('notification.marked_read', 'notification')
  @Patch(':companyId/:id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  async markAsRead(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.companyNotificationsService.markAsRead(id, companyId);
  }

  @Audit('notification.marked_all_read', 'notification')
  @Patch(':companyId/read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  @ApiQuery({ name: 'user_id', required: false })
  async markAllAsRead(
    @Param('companyId') companyId: string,
    @Query('user_id') userId?: string,
  ) {
    return this.companyNotificationsService.markAllAsRead(companyId, userId);
  }

  /**
   * Endpoint interno para ejecutar limpieza manual de notificaciones expiradas
   * Útil para testing o mantenimiento
   */
  @Public()
  @Post('cleanup')
  @ApiOperation({ summary: 'Ejecutar limpieza de notificaciones expiradas (interno)' })
  async runCleanup() {
    return this.cleanupJob.executeManually();
  }
}
