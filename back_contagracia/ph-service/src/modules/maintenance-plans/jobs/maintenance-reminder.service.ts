import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantPrismaService } from '../../tenant/tenant-prisma.service';
import { firstValueFrom } from 'rxjs';

const MAINTENANCE_THRESHOLDS = [30, 15, 7, 3, 1, 0];

@Injectable()
export class MaintenanceReminderService {
  private readonly logger = new Logger(MaintenanceReminderService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly masterPrisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServiceUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') || 'http://localhost:3015';
  }

  private async getActiveCompanies() {
    return this.masterPrisma.company.findMany({
      where: { is_active: true },
      select: { id: true, company_name: true },
    });
  }

  async processReminders(): Promise<{
    totalCompanies: number;
    plansChecked: number;
    remindersSent: number;
    errors: number;
  }> {
    const companies = await this.getActiveCompanies();
    let plansChecked = 0;
    let remindersSent = 0;
    let errors = 0;

    for (const company of companies) {
      try {
        const result = await this.processCompany(company.id, company.company_name);
        plansChecked += result.checked;
        remindersSent += result.sent;
      } catch (error) {
        errors++;
        this.logger.error(
          `Error procesando empresa ${company.company_name}: ${error.message}`,
        );
      }
    }

    return { totalCompanies: companies.length, plansChecked, remindersSent, errors };
  }

  private async processCompany(
    companyId: string,
    companyName: string,
  ): Promise<{ checked: number; sent: number }> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const plans = await db.phMaintenancePlan.findMany({
      where: { status: 'active' },
      include: {
        condominium: { select: { name: true } },
        provider: { select: { name: true } },
        unit: { select: { unit_number: true } },
      },
    });

    if (plans.length === 0) return { checked: 0, sent: 0 };

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let sent = 0;

    for (const plan of plans) {
      const nextDate = new Date(plan.next_maintenance_date);
      nextDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const condo = plan.condominium?.name || '';
      const unitLabel = plan.unit?.unit_number ? ` (Unidad ${plan.unit.unit_number})` : '';
      const provider = plan.provider?.name || 'Sin proveedor';

      // Vencido (ayer)
      if (daysUntil === -1) {
        try {
          await this.sendNotification(companyId, {
            type: 'ph_maintenance_overdue',
            title: `Mantenimiento vencido: ${plan.name}`,
            message: `El mantenimiento "${plan.name}" (${provider})${condo ? ` de ${condo}` : ''}${unitLabel} estaba programado para ayer.`,
            action_url: '/dashboard/ph/mantenimiento',
          });
          sent++;
        } catch (error) {
          this.logger.error(`Error notificación mantenimiento vencido ${plan.id}: ${error.message}`);
        }
        continue;
      }

      // Umbral exacto
      if (MAINTENANCE_THRESHOLDS.includes(daysUntil)) {
        try {
          const dayLabel = daysUntil === 0 ? 'hoy' : daysUntil === 1 ? 'mañana' : `en ${daysUntil} días`;
          await this.sendNotification(companyId, {
            type: 'ph_maintenance_upcoming',
            title: `Mantenimiento ${dayLabel}: ${plan.name}`,
            message: `El mantenimiento "${plan.name}" (${provider})${condo ? ` de ${condo}` : ''}${unitLabel} está programado ${dayLabel}.`,
            action_url: '/dashboard/ph/mantenimiento',
          });
          sent++;
        } catch (error) {
          this.logger.error(`Error notificación mantenimiento ${plan.id}: ${error.message}`);
        }
      }
    }

    if (sent > 0) {
      this.logger.log(`${companyName}: ${sent} notificación(es) de mantenimiento enviada(s)`);
    }

    return { checked: plans.length, sent };
  }

  private async sendNotification(
    companyId: string,
    notification: { type: string; title: string; message: string; action_url: string },
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.notificationServiceUrl}/api/notifications`,
          { company_id: companyId, ...notification },
          { timeout: 5000 },
        ),
      );
    } catch (error) {
      this.logger.error(`Error enviando notificación: ${error.message}`);
    }
  }
}
