import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { BillingEmailService } from '../billing/email.service';
import { CreateComunicadoDto, UpdateComunicadoDto } from './dto';

const COMUNICADO_INCLUDE = {
  condominium: { select: { id: true, name: true } },
  _count: { select: { recipients: true } },
};

const COMUNICADO_DETAIL_INCLUDE = {
  condominium: { select: { id: true, name: true } },
  recipients: { orderBy: { created_at: 'asc' as const } },
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Copropietarios',
  tenant: 'Arrendatarios',
};

@Injectable()
export class ComunicadosService {
  private readonly logger = new Logger(ComunicadosService.name);
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
      comunicado: (db as any).phComunicado,
      recipient: (db as any).phComunicadoRecipient,
    };
  }

  // ─── Listar ──────────────────────────────────────────────

  async findAll(
    companyId: string,
    query: {
      condominium_id?: string;
      status?: string;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const { comunicado } = await this.getModels(companyId);
    const where: any = {};

    if (query.condominium_id) where.condominium_id = query.condominium_id;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      comunicado.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: COMUNICADO_INCLUDE,
        skip: query.skip,
        take: query.take || 50,
      }),
      comunicado.count({ where }),
    ]);

    return { data, total };
  }

  // ─── Detalle ─────────────────────────────────────────────

  async findOne(companyId: string, id: string) {
    const { comunicado } = await this.getModels(companyId);
    const record = await comunicado.findUnique({
      where: { id },
      include: COMUNICADO_DETAIL_INCLUDE,
    });
    if (!record) throw new NotFoundException('Comunicado no encontrado');
    return record;
  }

  // ─── Crear borrador ──────────────────────────────────────

  async create(companyId: string, dto: CreateComunicadoDto, userId: string) {
    const { comunicado } = await this.getModels(companyId);

    return comunicado.create({
      data: {
        condominium_id: dto.condominium_id,
        title: dto.title,
        body: dto.body,
        target_roles: dto.target_roles,
        status: 'draft',
        created_by: userId,
      },
      include: COMUNICADO_INCLUDE,
    });
  }

  // ─── Editar borrador ─────────────────────────────────────

  async update(companyId: string, id: string, dto: UpdateComunicadoDto) {
    const { comunicado } = await this.getModels(companyId);
    const existing = await comunicado.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Comunicado no encontrado');
    if (existing.status !== 'draft') {
      throw new BadRequestException('Solo se pueden editar comunicados en borrador');
    }

    return comunicado.update({
      where: { id },
      data: dto,
      include: COMUNICADO_INCLUDE,
    });
  }

  // ─── Eliminar ────────────────────────────────────────────

  async remove(companyId: string, id: string) {
    const { comunicado } = await this.getModels(companyId);
    const existing = await comunicado.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Comunicado no encontrado');

    await comunicado.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Enviar ──────────────────────────────────────────────

  async send(companyId: string, id: string, userId: string) {
    const { db, comunicado, recipient } = await this.getModels(companyId);
    const record = await comunicado.findUnique({
      where: { id },
      include: { condominium: { select: { name: true } } },
    });
    if (!record) throw new NotFoundException('Comunicado no encontrado');
    if (record.status !== 'draft') {
      throw new BadRequestException('Este comunicado ya fue enviado');
    }

    const targetRoles: string[] = record.target_roles as string[];

    // 1. Resolver destinatarios: PhUnitResident → ThirdParty (distinct por tercero_id)
    const residents = await db.phUnitResident.findMany({
      where: {
        unit: { condominium_id: record.condominium_id },
        resident_type: { in: targetRoles },
        is_active: true,
      },
      select: {
        tercero_id: true,
        resident_type: true,
        unit: { select: { unit_number: true } },
      },
    });

    const uniqueTerceroIds = [...new Set(residents.map((r: any) => r.tercero_id))];

    if (uniqueTerceroIds.length === 0) {
      throw new BadRequestException('No se encontraron destinatarios para los roles seleccionados');
    }

    // 2. Obtener emails de ThirdParty
    const terceros = await db.thirdParty.findMany({
      where: { id: { in: uniqueTerceroIds } },
      select: { id: true, name: true, email: true },
    });

    const terceroMap = new Map(terceros.map((t: any) => [t.id, t]));

    // Mapa: terceroId → { role, units[] } para personalización de variables
    const residentDataMap = new Map<string, { role: string; units: string[] }>();
    for (const r of residents as any[]) {
      if (!residentDataMap.has(r.tercero_id)) {
        residentDataMap.set(r.tercero_id, { role: r.resident_type, units: [] });
      }
      const unitName: string = r.unit?.unit_number || '';
      const entry = residentDataMap.get(r.tercero_id)!;
      if (unitName && !entry.units.includes(unitName)) {
        entry.units.push(unitName);
      }
    }

    // 3. Crear recipients y enviar emails
    let totalSent = 0;
    let totalFailed = 0;
    let totalNoEmail = 0;

    const condominiumName = record.condominium?.name || '';
    const roleLabels = targetRoles.map((r: string) => ROLE_LABELS[r] || r).join(', ');

    for (const terceroId of uniqueTerceroIds) {
      const tercero = terceroMap.get(terceroId);
      const email = tercero?.email || null;
      const residentData = residentDataMap.get(terceroId as string) || { role: '', units: [] };

      // Personalizar cuerpo con variables del destinatario
      const personalizedBody = this.replaceVariables(record.body, {
        recipient_name: tercero?.name || '',
        recipient_email: email || '',
        recipient_role: ROLE_LABELS[residentData.role] || residentData.role,
        unit_name: residentData.units.join(', '),
        condominium_name: condominiumName,
      });

      const html = this.buildEmailHtml(record.title, personalizedBody, condominiumName);

      let emailSent = false;
      let emailError: string | null = null;

      if (email) {
        try {
          const result = await this.emailService.sendEmail(companyId, {
            to: email,
            subject: `Comunicado: ${record.title}`,
            html,
          });
          if (result.success) {
            emailSent = true;
            totalSent++;
          } else {
            emailError = result.error || 'Error desconocido';
            totalFailed++;
          }
        } catch (err: any) {
          emailError = err.message;
          totalFailed++;
        }
      } else {
        totalNoEmail++;
      }

      await recipient.create({
        data: {
          comunicado_id: id,
          tercero_id: terceroId as string,
          email,
          email_sent: emailSent,
          email_error: emailError,
        },
      });
    }

    // 4. Actualizar comunicado
    const updated = await comunicado.update({
      where: { id },
      data: {
        status: 'sent',
        sent_at: new Date(),
        total_recipients: uniqueTerceroIds.length,
        total_sent: totalSent,
        total_failed: totalFailed,
        total_no_email: totalNoEmail,
      },
      include: COMUNICADO_DETAIL_INCLUDE,
    });

    this.logger.log(
      `Comunicado "${record.title}" enviado: ${totalSent} OK, ${totalFailed} fallidos, ${totalNoEmail} sin email`,
    );

    // 5. Notificación in-app
    this.sendNotification(companyId, {
      type: 'ph_comunicado_sent',
      title: `Nuevo comunicado: ${record.title}`,
      message: `Comunicado enviado a ${roleLabels} de ${record.condominium?.name || 'la copropiedad'}.`,
      action_url: `/dashboard/ph/comunicados`,
      exclude_user_id: userId,
    }).catch(() => {});

    return updated;
  }

  // ─── Preview destinatarios ────────────────────────────────

  async resolveRecipients(
    companyId: string,
    condominiumId: string,
    targetRoles: string[],
  ) {
    const { db } = await this.getModels(companyId);

    const residents = await db.phUnitResident.findMany({
      where: {
        unit: { condominium_id: condominiumId },
        resident_type: { in: targetRoles },
        is_active: true,
      },
      select: { tercero_id: true, resident_type: true },
    });

    const uniqueTerceroIds = [...new Set(residents.map((r: any) => r.tercero_id))];

    if (uniqueTerceroIds.length === 0) return [];

    const terceros = await db.thirdParty.findMany({
      where: { id: { in: uniqueTerceroIds } },
      select: { id: true, name: true, email: true },
    });

    // Mapear tipo de residente por tercero
    const roleByTercero = new Map<string, string>();
    for (const r of residents) {
      if (!roleByTercero.has(r.tercero_id)) {
        roleByTercero.set(r.tercero_id, r.resident_type);
      }
    }

    return terceros.map((t: any) => ({
      tercero_id: t.id,
      name: t.name || '(sin nombre)',
      email: t.email || null,
      role: ROLE_LABELS[roleByTercero.get(t.id) || ''] || roleByTercero.get(t.id) || '',
    }));
  }

  // ─── Estadísticas ────────────────────────────────────────

  async getStats(companyId: string, condominiumId?: string) {
    const { comunicado } = await this.getModels(companyId);
    const where: any = {};
    if (condominiumId) where.condominium_id = condominiumId;

    const [total, draft, sent] = await Promise.all([
      comunicado.count({ where }),
      comunicado.count({ where: { ...where, status: 'draft' } }),
      comunicado.count({ where: { ...where, status: 'sent' } }),
    ]);

    return { total, draft, sent };
  }

  // ─── Notificación interna ────────────────────────────────

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

  // ─── Helpers ─────────────────────────────────────────────

  private replaceVariables(body: string, vars: Record<string, string>): string {
    const now = new Date();
    const dateVars: Record<string, string> = {
      current_date: now.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      current_time: now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      current_year: String(now.getFullYear()),
      current_month: now.toLocaleDateString('es-CO', { month: 'long' }),
      current_day: now.toLocaleDateString('es-CO', { weekday: 'long' }),
    };
    const allVars = { ...vars, ...dateVars };
    return body.replace(/\{\{(\w+)\}\}/g, (match, key) => allVars[key] ?? match);
  }

  private buildEmailHtml(title: string, body: string, condominiumName: string): string {
    const bodyHtml = body.replace(/\n/g, '<br>');
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1e293b; color: #fff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">${title}</h2>
          ${condominiumName ? `<p style="margin: 4px 0 0; font-size: 13px; opacity: 0.8;">${condominiumName}</p>` : ''}
        </div>
        <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
          <div style="background: #fff; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.6;">
            ${bodyHtml}
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 12px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Este es un mensaje automático enviado por la administración de su copropiedad.
          </p>
        </div>
      </div>
    `;
  }
}
