import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { RealtimePublisherService } from '@contagracia/shared-modules';

@Injectable()
export class CompanyNotificationsService {
  private readonly logger = new Logger(CompanyNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimePublisher: RealtimePublisherService,
  ) {}

  /**
   * Duración de las notificaciones en días
   * TODO: Hacer configurable por empresa (tenancy) cuando esté el perfil de configuración
   */
  private readonly NOTIFICATION_DURATION_DAYS = 7;

  /**
   * Calcula la fecha de corte para notificaciones activas
   */
  private getExpirationCutoff(): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.NOTIFICATION_DURATION_DAYS);
    return cutoff;
  }

  /**
   * Construye el where base con filtro de usuario (excluye notificaciones no dirigidas al usuario)
   */
  private buildUserFilter(companyId: string, userId?: string) {
    const cutoff = this.getExpirationCutoff();
    const where: any = {
      company_id: companyId,
      created_at: { gte: cutoff },
    };

    // Filtrar notificaciones que excluyen a este usuario
    if (userId) {
      where.OR = [
        { exclude_user_id: null },
        { exclude_user_id: { not: userId } },
      ];
    }

    return where;
  }

  /**
   * Crea una nueva notificación para una empresa
   */
  async create(dto: CreateNotificationDto) {
    try {
      const notification = await this.prisma.companyNotification.create({
        data: {
          company_id: dto.company_id,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          action_url: dto.action_url,
          exclude_user_id: dto.exclude_user_id || null,
          is_read: false,
        },
      });

      // Notificar en tiempo real (incluir exclude_user_id para filtrar en frontend)
      this.realtimePublisher.notifyNotificationCreated(dto.company_id, {
        id: notification.id,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        action_url: dto.action_url,
        exclude_user_id: dto.exclude_user_id || null,
      }).catch((err) => this.logger.warn(`Error publicando evento: ${err.message}`));

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async findByCompany(companyId: string, page = 1, limit = 20, userId?: string) {
    const skip = (page - 1) * limit;
    const whereClause = this.buildUserFilter(companyId, userId);

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.companyNotification.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.companyNotification.count({
        where: whereClause,
      }),
      this.prisma.companyNotification.count({
        where: { ...whereClause, is_read: false },
      }),
    ]);

    return {
      data: notifications,
      total,
      unread_count: unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(companyId: string, userId?: string) {
    const where = this.buildUserFilter(companyId, userId);
    where.is_read = false;

    const count = await this.prisma.companyNotification.count({ where });
    return { unread_count: count };
  }

  async markAsRead(id: string, companyId: string) {
    const result = await this.prisma.companyNotification.updateMany({
      where: { id, company_id: companyId },
      data: { is_read: true, read_at: new Date() },
    });

    if (result.count > 0) {
      this.realtimePublisher.notifyNotificationRead(companyId, id)
        .catch((err) => this.logger.warn(`Error publicando evento read: ${err.message}`));
    }

    return result;
  }

  async markAllAsRead(companyId: string, userId?: string) {
    const where = this.buildUserFilter(companyId, userId);
    where.is_read = false;

    const result = await this.prisma.companyNotification.updateMany({
      where,
      data: { is_read: true, read_at: new Date() },
    });

    if (result.count > 0) {
      this.realtimePublisher.notifyNotificationsAllRead(companyId)
        .catch((err) => this.logger.warn(`Error publicando evento allRead: ${err.message}`));
    }

    return result;
  }
}
