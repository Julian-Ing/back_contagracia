import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantPrismaService } from '../../tenant/tenant-prisma.service';
import { firstValueFrom } from 'rxjs';

/** Umbrales exactos en los que se envía notificación (días hasta vencimiento) */
const EXPIRY_THRESHOLDS = [60, 30, 15, 7, 3, 1, 0];

@Injectable()
export class PolicyReminderService {
  private readonly logger = new Logger(PolicyReminderService.name);
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
    policiesChecked: number;
    remindersSent: number;
    errors: number;
  }> {
    const companies = await this.getActiveCompanies();
    let policiesChecked = 0;
    let remindersSent = 0;
    let errors = 0;

    for (const company of companies) {
      try {
        const result = await this.processCompany(company.id, company.company_name);
        policiesChecked += result.checked;
        remindersSent += result.sent;
      } catch (error) {
        errors++;
        this.logger.error(
          `Error procesando empresa ${company.company_name}: ${error.message}`,
        );
      }
    }

    return { totalCompanies: companies.length, policiesChecked, remindersSent, errors };
  }

  private async processCompany(
    companyId: string,
    companyName: string,
  ): Promise<{ checked: number; sent: number }> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const policies = await db.phInsurancePolicy.findMany({
      where: { status: 'active' },
      include: {
        condominium: { select: { name: true } },
        insurance_third_party: { select: { name: true } },
      },
    });

    if (policies.length === 0) return { checked: 0, sent: 0 };

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let sent = 0;

    for (const policy of policies) {
      const endDate = new Date(policy.end_date);
      endDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Vencida (ayer)
      if (daysUntil === -1) {
        try {
          const insurer = policy.insurance_third_party?.name || policy.insurance_company || 'Sin aseguradora';
          const condo = policy.condominium?.name || '';
          await this.sendNotification(companyId, {
            type: 'ph_policy_expired',
            title: `Póliza vencida: ${policy.policy_number}`,
            message: `La póliza ${policy.policy_number} (${insurer})${condo ? ` de ${condo}` : ''} venció ayer.`,
            action_url: '/dashboard/ph/polizas',
          });
          sent++;
        } catch (error) {
          this.logger.error(`Error enviando notificación vencimiento póliza ${policy.id}: ${error.message}`);
        }
        continue;
      }

      // Umbral exacto de vencimiento próximo
      if (EXPIRY_THRESHOLDS.includes(daysUntil)) {
        try {
          const insurer = policy.insurance_third_party?.name || policy.insurance_company || 'Sin aseguradora';
          const condo = policy.condominium?.name || '';
          const dayLabel = daysUntil === 0 ? 'hoy' : daysUntil === 1 ? 'mañana' : `en ${daysUntil} días`;
          await this.sendNotification(companyId, {
            type: 'ph_policy_expiring',
            title: `Póliza vence ${dayLabel}: ${policy.policy_number}`,
            message: `La póliza ${policy.policy_number} (${insurer})${condo ? ` de ${condo}` : ''} vence ${dayLabel}.`,
            action_url: '/dashboard/ph/polizas',
          });
          sent++;
        } catch (error) {
          this.logger.error(`Error enviando notificación póliza ${policy.id}: ${error.message}`);
        }
      }
    }

    if (sent > 0) {
      this.logger.log(`${companyName}: ${sent} notificación(es) de pólizas enviada(s)`);
    }

    return { checked: policies.length, sent };
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

  /**
   * Notificación inmediata: cambio de aseguradora
   */
  async notifyInsurerChanged(
    companyId: string,
    policyNumber: string,
    newInsurerName: string,
  ): Promise<void> {
    await this.sendNotification(companyId, {
      type: 'ph_policy_insurer_changed',
      title: `Cambio de aseguradora: ${policyNumber}`,
      message: `La aseguradora de la póliza ${policyNumber} fue cambiada a ${newInsurerName}.`,
      action_url: '/dashboard/ph/polizas',
    });
  }
}
