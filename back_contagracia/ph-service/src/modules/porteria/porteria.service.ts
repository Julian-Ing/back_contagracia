import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { BillingEmailService } from '../billing/email.service';
import { CreateAccessLogDto, CreatePackageDto, CreateMinutaEntryDto, UpdateMinutaEntryDto } from './dto';

@Injectable()
export class PorteriaService {
  private readonly logger = new Logger(PorteriaService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly emailService: BillingEmailService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServiceUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') || 'http://localhost:3015';
  }

  private async getModels(companyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return {
      db,
      accessLog: (db as any).phAccessLog,
      pkg: (db as any).phPackage,
      minuta: (db as any).phMinutaEntry,
    };
  }

  // ─── Access Logs ─────────────────────────────────────────────

  async findAllAccessLogs(
    companyId: string,
    query: {
      condominium_id?: string;
      visit_type?: string;
      date_from?: string;
      date_to?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const { accessLog } = await this.getModels(companyId);
    const where: any = {};

    if (query.condominium_id) where.condominium_id = query.condominium_id;
    if (query.visit_type) where.visit_type = query.visit_type;
    if (query.date_from || query.date_to) {
      where.entry_at = {};
      if (query.date_from) where.entry_at.gte = new Date(query.date_from);
      if (query.date_to) {
        const to = new Date(query.date_to);
        to.setHours(23, 59, 59, 999);
        where.entry_at.lte = to;
      }
    }

    const [data, total] = await Promise.all([
      accessLog.findMany({
        where,
        orderBy: { entry_at: 'desc' },
        include: {
          destination_unit: { select: { id: true, unit_number: true } },
        },
        skip: query.skip,
        take: query.take || 50,
      }),
      accessLog.count({ where }),
    ]);

    return { data, total };
  }

  async createAccessLog(companyId: string, dto: CreateAccessLogDto, userId: string) {
    const { accessLog } = await this.getModels(companyId);
    return accessLog.create({
      data: {
        condominium_id: dto.condominium_id,
        visit_type: dto.visit_type,
        visitor_name: dto.visitor_name,
        visitor_doc: dto.visitor_doc,
        visitor_company: dto.visitor_company,
        destination_unit_id: dto.destination_unit_id,
        purpose: dto.purpose,
        notes: dto.notes,
        created_by: userId,
      },
      include: {
        destination_unit: { select: { id: true, unit_number: true } },
      },
    });
  }

  async registerExit(companyId: string, id: string) {
    const { accessLog } = await this.getModels(companyId);
    const existing = await accessLog.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Registro de acceso no encontrado');

    return accessLog.update({
      where: { id },
      data: { exit_at: new Date() },
      include: {
        destination_unit: { select: { id: true, unit_number: true } },
      },
    });
  }

  async removeAccessLog(companyId: string, id: string) {
    const { accessLog } = await this.getModels(companyId);
    const existing = await accessLog.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Registro de acceso no encontrado');
    await accessLog.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Packages ────────────────────────────────────────────────

  async findAllPackages(
    companyId: string,
    query: {
      condominium_id?: string;
      unit_id?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const { pkg } = await this.getModels(companyId);
    const where: any = {};

    if (query.condominium_id) where.condominium_id = query.condominium_id;
    if (query.unit_id) where.unit_id = query.unit_id;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      pkg.findMany({
        where,
        orderBy: { received_at: 'desc' },
        include: {
          unit: { select: { id: true, unit_number: true } },
        },
        skip: query.skip,
        take: query.take || 50,
      }),
      pkg.count({ where }),
    ]);

    return { data, total };
  }

  async getPackageStats(companyId: string, condominiumId?: string) {
    const { pkg } = await this.getModels(companyId);
    const where: any = {};
    if (condominiumId) where.condominium_id = condominiumId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, notified, deliveredToday] = await Promise.all([
      pkg.count({ where: { ...where, status: 'pending' } }),
      pkg.count({ where: { ...where, status: 'notified' } }),
      pkg.count({
        where: { ...where, status: 'delivered', delivered_at: { gte: today } },
      }),
    ]);

    return { pending, notified, delivered_today: deliveredToday };
  }

  async createPackage(companyId: string, dto: CreatePackageDto, userId: string) {
    const { db, pkg } = await this.getModels(companyId);

    const created = await pkg.create({
      data: {
        condominium_id: dto.condominium_id,
        unit_id: dto.unit_id,
        tercero_id: dto.tercero_id,
        description: dto.description,
        carrier: dto.carrier,
        tracking_number: dto.tracking_number,
        notes: dto.notes,
        created_by: userId,
      },
      include: {
        unit: { select: { id: true, unit_number: true } },
      },
    });

    // Notificar al residente si hay tercero_id con email
    if (dto.tercero_id) {
      this.notifyPackageArrival(companyId, created, db).catch(() => {});
    }

    return created;
  }

  async deliverPackage(companyId: string, id: string) {
    const { pkg } = await this.getModels(companyId);
    const existing = await pkg.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Paquete no encontrado');

    return pkg.update({
      where: { id },
      data: { status: 'delivered', delivered_at: new Date() },
      include: {
        unit: { select: { id: true, unit_number: true } },
      },
    });
  }

  async removePackage(companyId: string, id: string) {
    const { pkg } = await this.getModels(companyId);
    const existing = await pkg.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Paquete no encontrado');
    await pkg.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Minuta ──────────────────────────────────────────────────

  async findAllMinuta(
    companyId: string,
    query: {
      condominium_id?: string;
      entry_type?: string;
      date_from?: string;
      date_to?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const { minuta } = await this.getModels(companyId);
    const where: any = {};

    if (query.condominium_id) where.condominium_id = query.condominium_id;
    if (query.entry_type) where.entry_type = query.entry_type;
    if (query.date_from || query.date_to) {
      where.created_at = {};
      if (query.date_from) where.created_at.gte = new Date(query.date_from);
      if (query.date_to) {
        const to = new Date(query.date_to);
        to.setHours(23, 59, 59, 999);
        where.created_at.lte = to;
      }
    }

    const [data, total] = await Promise.all([
      minuta.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: query.skip,
        take: query.take || 50,
      }),
      minuta.count({ where }),
    ]);

    return { data, total };
  }

  async createMinutaEntry(companyId: string, dto: CreateMinutaEntryDto, userId: string) {
    const { minuta } = await this.getModels(companyId);
    return minuta.create({
      data: {
        condominium_id: dto.condominium_id,
        entry_type: dto.entry_type,
        title: dto.title,
        body: dto.body,
        shift: dto.shift,
        created_by: userId,
      },
    });
  }

  async updateMinutaEntry(companyId: string, id: string, dto: UpdateMinutaEntryDto) {
    const { minuta } = await this.getModels(companyId);
    const existing = await minuta.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Entrada de minuta no encontrada');
    return minuta.update({ where: { id }, data: dto });
  }

  async removeMinutaEntry(companyId: string, id: string) {
    const { minuta } = await this.getModels(companyId);
    const existing = await minuta.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Entrada de minuta no encontrada');
    await minuta.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Notificación paquete ────────────────────────────────────

  private async notifyPackageArrival(companyId: string, pkg: any, db: any): Promise<void> {
    try {
      const tercero = await (db as any).thirdParty.findUnique({
        where: { id: pkg.tercero_id },
        select: { name: true, email: true },
      });

      if (tercero?.email) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1e293b; color: #fff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 18px;">📦 Paquete recibido en portería</h2>
            </div>
            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Hola <strong>${tercero.name || ''}</strong>,</p>
              <p>Ha llegado un paquete para usted en la portería:</p>
              <ul>
                <li><strong>Descripción:</strong> ${pkg.description}</li>
                ${pkg.carrier ? `<li><strong>Transportadora:</strong> ${pkg.carrier}</li>` : ''}
                ${pkg.tracking_number ? `<li><strong>Número de guía:</strong> ${pkg.tracking_number}</li>` : ''}
              </ul>
              <p>Por favor pase a reclamarlo cuando le sea posible.</p>
            </div>
          </div>
        `;

        await this.emailService.sendEmail(companyId, {
          to: tercero.email,
          subject: `📦 Paquete recibido en portería`,
          html,
        });

        // Marcar notificación enviada
        await (db as any).phPackage.update({
          where: { id: pkg.id },
          data: { status: 'notified', notification_sent: true },
        });
      }

      // Notificación in-app
      await this.sendNotification(companyId, {
        type: 'ph_package_arrived',
        title: '📦 Paquete recibido',
        message: `Llegó un paquete para ${tercero?.name || 'un residente'} — ${pkg.description}`,
        action_url: `/dashboard/ph/porteria`,
      });
    } catch (err: any) {
      this.logger.warn(`Error notificando paquete: ${err.message}`);
    }
  }

  private async sendNotification(
    companyId: string,
    notification: { type: string; title: string; message: string; action_url: string; exclude_user_id?: string },
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.notificationServiceUrl}/api/notifications`,
          { company_id: companyId, ...notification },
          { timeout: 5000 },
        ),
      );
    } catch (err: any) {
      this.logger.warn(`Error enviando notificación interna: ${err.message}`);
    }
  }
}
