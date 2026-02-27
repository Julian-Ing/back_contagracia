import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SendBroadcastDto } from './dto/index.js';
import { RealtimePublisherService } from '@contagracia/shared-modules';

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimePublisher: RealtimePublisherService,
  ) {}

  async sendBroadcast(dto: SendBroadcastDto) {
    // Determinar destinatarios
    let companyIds: string[];

    if (dto.send_to_all) {
      const companies = await this.prisma.company.findMany({
        where: { is_active: true },
        select: { id: true },
      });
      companyIds = companies.map((c) => c.id);
    } else if (dto.company_ids && dto.company_ids.length > 0) {
      companyIds = dto.company_ids;
    } else {
      throw new BadRequestException(
        'Debe enviar a todas las empresas o seleccionar al menos una',
      );
    }

    // Transacción: crear broadcast + N company notifications
    const broadcast = await this.prisma.$transaction(async (tx) => {
      const bc = await tx.broadcastNotification.create({
        data: {
          title: dto.title,
          message: dto.message,
          type: dto.type,
          action_url: dto.action_url,
          sent_to_all: dto.send_to_all ?? false,
          sent_count: companyIds.length,
        },
      });

      await tx.companyNotification.createMany({
        data: companyIds.map((companyId) => ({
          company_id: companyId,
          broadcast_id: bc.id,
          source: 'admin',
          type: dto.type,
          title: dto.title,
          message: dto.message,
          action_url: dto.action_url,
        })),
      });

      return bc;
    });

    this.logger.log(
      `Broadcast "${dto.title}" sent to ${companyIds.length} companies`,
    );

    // Notificar en tiempo real a cada compañía
    for (const cid of companyIds) {
      this.realtimePublisher.notifyNotificationCreated(cid, {
        id: broadcast.id,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        action_url: dto.action_url,
      }).catch((err) => this.logger.warn(`Error publicando evento para ${cid}: ${err.message}`));
    }

    return {
      success: true,
      sent_count: companyIds.length,
      broadcast_id: broadcast.id,
    };
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [broadcasts, total] = await Promise.all([
      this.prisma.broadcastNotification.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { notifications: true },
          },
        },
      }),
      this.prisma.broadcastNotification.count(),
    ]);

    return {
      data: broadcasts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
