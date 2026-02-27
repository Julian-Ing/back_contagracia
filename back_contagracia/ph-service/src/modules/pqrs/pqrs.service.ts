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
import { CreatePqrsDto, UpdatePqrsDto, CreateMessageDto } from './dto';

const PQRS_INCLUDE = {
  condominium: { select: { id: true, name: true } },
  _count: { select: { messages: true } },
};

const PQRS_DETAIL_INCLUDE = {
  condominium: { select: { id: true, name: true } },
  messages: { orderBy: { created_at: 'asc' as const } },
};

const TYPE_LABELS: Record<string, string> = {
  petition: 'Petición',
  complaint: 'Queja',
  claim: 'Reclamo',
  suggestion: 'Sugerencia',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En Proceso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

@Injectable()
export class PqrsService {
  private readonly logger = new Logger(PqrsService.name);

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

  /** Helper: obtiene modelos PQRS del tenant (as any mientras se regenera el client) */
  private async getModels(companyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return {
      db,
      pqrs: (db as any).phPqrs,
      message: (db as any).phPqrsMessage,
    };
  }

  // ─── Listar PQRS ──────────────────────────────────────

  async findAll(
    companyId: string,
    query: {
      condominium_id?: string;
      type?: string;
      status?: string;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const { pqrs } = await this.getModels(companyId);
    const where: any = {};

    if (query.condominium_id) where.condominium_id = query.condominium_id;
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { contact_name: { contains: query.search, mode: 'insensitive' } },
        ...(isNaN(Number(query.search)) ? [] : [{ ticket_number: Number(query.search) }]),
      ];
    }

    const [data, total] = await Promise.all([
      pqrs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: PQRS_INCLUDE,
        skip: query.skip,
        take: query.take || 50,
      }),
      pqrs.count({ where }),
    ]);

    return { data, total };
  }

  // ─── Detalle ───────────────────────────────────────────

  async findOne(companyId: string, id: string) {
    const { pqrs } = await this.getModels(companyId);
    const record = await pqrs.findUnique({
      where: { id },
      include: PQRS_DETAIL_INCLUDE,
    });
    if (!record) throw new NotFoundException('PQRS no encontrado');
    return record;
  }

  // ─── Crear PQRS ───────────────────────────────────────

  async create(companyId: string, dto: CreatePqrsDto, userId: string) {
    const { db, pqrs, message } = await this.getModels(companyId);

    // Generar ticket_number incremental
    const last = await pqrs.findFirst({
      orderBy: { ticket_number: 'desc' },
      select: { ticket_number: true },
    });
    const ticketNumber = (last?.ticket_number ?? 0) + 1;

    const record = await pqrs.create({
      data: {
        condominium_id: dto.condominium_id,
        unit_id: dto.unit_id,
        tercero_id: dto.tercero_id,
        ticket_number: ticketNumber,
        title: dto.title,
        description: dto.description,
        type: dto.type || 'petition',
        priority: dto.priority || 'medium',
        status: 'open',
        contact_name: dto.contact_name,
        contact_email: dto.contact_email,
        contact_phone: dto.contact_phone,
        created_by: userId,
      },
      include: PQRS_DETAIL_INCLUDE,
    });

    // Enviar email de notificación al administrador (smtp_user)
    let emailSent = false;
    let adminEmail: string | null = null;
    try {
      const config = await db.emailSmsConfig.findFirst();
      adminEmail = config?.smtp_user || null;

      if (adminEmail) {
        const typeLabel = TYPE_LABELS[dto.type || 'petition'] || dto.type;
        this.logger.log(`Enviando notificación de PQRS #${ticketNumber} al admin ${adminEmail}...`);
        const result = await this.emailService.sendEmail(companyId, {
          to: adminEmail,
          subject: `Nueva PQRS #${ticketNumber} - ${typeLabel}: ${dto.title}`,
          html: this.buildEmailHtml(
            ticketNumber,
            dto.title,
            dto.description,
            `Solicitante: ${dto.contact_name || 'N/A'} — ${dto.contact_email || ''} ${dto.contact_phone || ''}`,
          ),
        });
        emailSent = result.success;
        if (result.success) {
          this.logger.log(`Notificación enviada al admin ${adminEmail} para PQRS #${ticketNumber}`);
        } else {
          this.logger.error(`Error enviando email PQRS #${ticketNumber}: ${result.error}`);
        }
      } else {
        this.logger.warn(`PQRS #${ticketNumber}: no hay smtp_user configurado, no se envía notificación`);
      }
    } catch (err: any) {
      this.logger.error(`Excepción enviando email PQRS #${ticketNumber}: ${err.message}`);
    }

    // Crear mensaje inicial (la descripción) con registro del email
    await message.create({
      data: {
        pqrs_id: record.id,
        content: dto.description,
        sender_type: 'resident',
        sender_id: userId,
        sender_name: dto.contact_name || 'Residente',
        email_sent: emailSent,
        email_sent_at: emailSent ? new Date() : null,
        email_to: adminEmail,
      },
    });

    // Notificación interna (campanita) — excluir al creador
    const typeLabel = TYPE_LABELS[dto.type || 'petition'] || dto.type;
    this.sendNotification(companyId, {
      type: 'ph_pqrs_created',
      title: `Nueva PQRS #${ticketNumber} — ${typeLabel}`,
      message: `${dto.contact_name || 'Residente'}: ${dto.title}`,
      action_url: `/dashboard/ph/pqrs?id=${record.id}`,
      exclude_user_id: userId,
    }).catch(() => {});

    return this.findOne(companyId, record.id);
  }

  // ─── Actualizar PQRS ──────────────────────────────────

  async update(companyId: string, id: string, dto: UpdatePqrsDto) {
    const { pqrs } = await this.getModels(companyId);
    const existing = await pqrs.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('PQRS no encontrado');

    return pqrs.update({
      where: { id },
      data: dto,
      include: PQRS_INCLUDE,
    });
  }

  // ─── Cambiar estado ────────────────────────────────────

  async changeStatus(companyId: string, id: string, status: string, userId: string) {
    const { pqrs, message } = await this.getModels(companyId);
    const existing = await pqrs.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('PQRS no encontrado');

    const data: any = { status };
    if (status === 'resolved') data.resolved_at = new Date();
    if (status === 'closed') data.closed_at = new Date();

    const updated = await pqrs.update({
      where: { id },
      data,
      include: PQRS_INCLUDE,
    });

    // Notificar por email al contacto
    if (existing.contact_email) {
      const statusLabel = STATUS_LABELS[status] || status;
      await this.emailService.sendEmail(companyId, {
        to: existing.contact_email,
        subject: `PQRS #${existing.ticket_number} - Estado actualizado: ${statusLabel}`,
        html: this.buildEmailHtml(
          existing.ticket_number,
          existing.title,
          `El estado de su solicitud ha cambiado a: <strong>${statusLabel}</strong>`,
          null,
        ),
      });
    }

    // Registrar cambio de estado como mensaje del sistema
    await message.create({
      data: {
        pqrs_id: id,
        content: `Estado cambiado a: ${STATUS_LABELS[status] || status}`,
        sender_type: 'admin',
        sender_id: userId,
        sender_name: 'Sistema',
        email_sent: !!existing.contact_email,
        email_sent_at: existing.contact_email ? new Date() : null,
        email_to: existing.contact_email,
      },
    });

    // Notificación interna (campanita) — excluir al que cambió el estado
    const statusLabel = STATUS_LABELS[status] || status;
    this.sendNotification(companyId, {
      type: 'ph_pqrs_status_changed',
      title: `PQRS #${existing.ticket_number} — ${statusLabel}`,
      message: `La solicitud "${existing.title}" cambió a ${statusLabel}.`,
      action_url: `/dashboard/ph/pqrs?id=${id}`,
      exclude_user_id: userId,
    }).catch(() => {});

    return updated;
  }

  // ─── Eliminar PQRS ────────────────────────────────────

  async remove(companyId: string, id: string, userId: string) {
    const { pqrs } = await this.getModels(companyId);
    const existing = await pqrs.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('PQRS no encontrado');

    // Notificar al usuario antes de eliminar
    const typeLabel = TYPE_LABELS[existing.type] || existing.type;
    this.sendNotification(companyId, {
      type: 'ph_pqrs_deleted',
      title: `PQRS #${existing.ticket_number} eliminada`,
      message: `Su solicitud "${existing.title}" (${typeLabel}) ha sido eliminada por la administración.`,
      action_url: `/dashboard/ph/pqrs`,
      exclude_user_id: userId,
    }).catch(() => {});

    // Enviar email al contacto si tiene email
    if (existing.contact_email) {
      this.emailService.sendEmail(companyId, {
        to: existing.contact_email,
        subject: `PQRS #${existing.ticket_number} - Solicitud eliminada`,
        html: this.buildEmailHtml(
          existing.ticket_number,
          existing.title,
          `Su solicitud de tipo <strong>${typeLabel}</strong> ha sido eliminada por la administración.`,
          null,
        ),
      }).catch((err: any) => {
        this.logger.error(`Error enviando email de eliminación PQRS #${existing.ticket_number}: ${err.message}`);
      });
    }

    await pqrs.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Mensajes ──────────────────────────────────────────

  async getMessages(companyId: string, pqrsId: string) {
    const { message } = await this.getModels(companyId);
    return message.findMany({
      where: { pqrs_id: pqrsId },
      orderBy: { created_at: 'asc' },
    });
  }

  async addMessage(companyId: string, pqrsId: string, dto: CreateMessageDto, userId: string) {
    const { db, pqrs, message } = await this.getModels(companyId);
    const record = await pqrs.findUnique({ where: { id: pqrsId } });
    if (!record) throw new NotFoundException('PQRS no encontrado');

    const senderType = dto.sender_type || 'admin';
    const shouldSendEmail = dto.send_email !== false;

    // Determinar destinatario del email
    let emailTo: string | null = null;
    if (shouldSendEmail) {
      if (senderType === 'admin' && record.contact_email) {
        emailTo = record.contact_email;
      } else if (senderType === 'resident') {
        const config = await db.emailSmsConfig.findFirst();
        if (config?.smtp_user) emailTo = config.smtp_user;
      }
    }

    // Enviar email
    let emailSent = false;
    if (emailTo) {
      const senderLabel = senderType === 'admin' ? 'Administración' : (record.contact_name || 'Residente');
      const contactInfo = senderType === 'resident'
        ? `Respuesta de: ${record.contact_name || 'Residente'} — ${record.contact_email || ''} ${record.contact_phone || ''}`
        : `Respuesta de: ${senderLabel}`;
      const result = await this.emailService.sendEmail(companyId, {
        to: emailTo,
        subject: `PQRS #${record.ticket_number} - ${record.title}`,
        html: this.buildEmailHtml(record.ticket_number, record.title, dto.content, contactInfo),
      });
      emailSent = result.success;
    }

    const newMsg = await message.create({
      data: {
        pqrs_id: pqrsId,
        content: dto.content,
        sender_type: senderType,
        sender_id: userId,
        sender_name: senderType === 'admin' ? 'Administración' : (record.contact_name || 'Residente'),
        email_sent: emailSent,
        email_sent_at: emailSent ? new Date() : null,
        email_to: emailTo,
      },
    });

    // Notificación interna (campanita) — excluir al que envía el mensaje
    const senderLabel2 = senderType === 'admin' ? 'Administración' : (record.contact_name || 'Residente');
    this.sendNotification(companyId, {
      type: 'ph_pqrs_message',
      title: `Respuesta en PQRS #${record.ticket_number}`,
      message: `${senderLabel2}: ${dto.content.substring(0, 100)}${dto.content.length > 100 ? '…' : ''}`,
      action_url: `/dashboard/ph/pqrs?id=${pqrsId}`,
      exclude_user_id: userId,
    }).catch(() => {});

    return newMsg;
  }

  // ─── Estadísticas ──────────────────────────────────────

  async getStats(companyId: string, condominiumId?: string) {
    const { pqrs } = await this.getModels(companyId);
    const where: any = {};
    if (condominiumId) where.condominium_id = condominiumId;

    const [open, in_progress, resolved, closed, total] = await Promise.all([
      pqrs.count({ where: { ...where, status: 'open' } }),
      pqrs.count({ where: { ...where, status: 'in_progress' } }),
      pqrs.count({ where: { ...where, status: 'resolved' } }),
      pqrs.count({ where: { ...where, status: 'closed' } }),
      pqrs.count({ where }),
    ]);

    return { total, open, in_progress, resolved, closed };
  }

  // ─── Notificación interna ─────────────────────────────

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

  // ─── Helpers ───────────────────────────────────────────

  private buildEmailHtml(
    ticketNumber: number,
    title: string,
    content: string,
    footer: string | null,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1e293b; color: #fff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">PQRS #${ticketNumber}: ${title}</h2>
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
          <div style="background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            ${content}
          </div>
          ${footer ? `<p style="color: #64748b; font-size: 13px; margin-top: 16px;">${footer}</p>` : ''}
        </div>
        <div style="background: #f1f5f9; padding: 12px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Este es un mensaje automático. Para responder, ingrese al sistema.
          </p>
        </div>
      </div>
    `;
  }
}
