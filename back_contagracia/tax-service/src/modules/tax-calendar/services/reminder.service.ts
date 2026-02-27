import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxCalendarService } from '../tax-calendar.service';
import { firstValueFrom } from 'rxjs';

interface ReminderNotification {
  companyId: string;
  companyName: string;
  nit: string;
  obligation: {
    id: string;
    obligationType: string;
    dueDate: Date;
    daysRemaining: number;
    urgency: 'urgent' | 'soon' | 'normal';
    periodName: string;
    isDeclaration: boolean;
    isPayment: boolean;
  };
}

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly taxCalendarService: TaxCalendarService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServiceUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') || 'http://localhost:3015';
  }

  /**
   * Obtiene todas las empresas activas con NIT
   */
  async getActiveCompanies(): Promise<Array<{ id: string; company_name: string; nit: string }>> {
    this.logger.debug('Obteniendo empresas activas con NIT');

    const allCompanies = await this.prisma.company.findMany({
      where: {
        is_active: true,
      },
      select: {
        id: true,
        company_name: true,
        nit: true,
      },
    });

    // Filtrar solo las que tienen NIT
    const companies = allCompanies.filter((c) => c.nit != null && c.nit !== '');

    this.logger.log(`Encontradas ${companies.length} empresas activas con NIT`);
    return companies as Array<{ id: string; company_name: string; nit: string }>;
  }

  /**
   * Determina el tipo de notificación según los días restantes
   */
  determineNotificationType(daysRemaining: number): string {
    if (daysRemaining < 0) {
      return 'tax_overdue'; // Vencida
    } else if (daysRemaining === 0) {
      return 'tax_due_today'; // Vence hoy
    } else if (daysRemaining === 1) {
      return 'tax_due_tomorrow'; // Vence mañana
    } else if (daysRemaining <= 3) {
      return 'tax_urgent'; // Urgente (2-3 días)
    } else if (daysRemaining <= 7) {
      return 'tax_soon'; // Próximamente (4-7 días)
    } else if (daysRemaining <= 15) {
      return 'tax_reminder_15days'; // Recordatorio 15 días
    } else if (daysRemaining <= 30) {
      return 'tax_reminder_30days'; // Recordatorio 30 días
    }

    return 'tax_reminder_general';
  }

  /**
   * Envía una notificación al notification-service
   */
  async sendNotification(notification: ReminderNotification): Promise<void> {
    const { companyId, companyName, nit, obligation } = notification;

    const notificationType = this.determineNotificationType(obligation.daysRemaining);

    // Formatear fecha para mostrar
    const dueDateStr = obligation.dueDate.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Construir título y mensaje según el tipo
    let title = '';
    let message = '';

    const periodLabel = obligation.periodName !== obligation.obligationType
      ? ` (${obligation.periodName})`
      : '';

    if (obligation.daysRemaining < 0) {
      const daysOverdue = Math.abs(obligation.daysRemaining);
      title = `⚠️ Obligación Vencida - ${obligation.obligationType}`;
      message = `${obligation.obligationType}${periodLabel} venció hace ${daysOverdue} día(s) (${dueDateStr}). NIT: ${nit}`;
    } else if (obligation.daysRemaining === 0) {
      title = `🔴 Vence HOY - ${obligation.obligationType}`;
      message = `${obligation.obligationType}${periodLabel} vence hoy (${dueDateStr}). NIT: ${nit}`;
    } else if (obligation.daysRemaining === 1) {
      title = `🟠 Vence MAÑANA - ${obligation.obligationType}`;
      message = `${obligation.obligationType}${periodLabel} vence mañana (${dueDateStr}). NIT: ${nit}`;
    } else if (obligation.daysRemaining <= 3) {
      title = `🟡 Urgente - ${obligation.obligationType}`;
      message = `${obligation.obligationType}${periodLabel} vence en ${obligation.daysRemaining} días (${dueDateStr}). NIT: ${nit}`;
    } else if (obligation.daysRemaining <= 7) {
      title = `📅 Próximamente - ${obligation.obligationType}`;
      message = `${obligation.obligationType}${periodLabel} vence en ${obligation.daysRemaining} días (${dueDateStr}). NIT: ${nit}`;
    } else {
      title = `📋 Recordatorio - ${obligation.obligationType}`;
      message = `${obligation.obligationType}${periodLabel} vence en ${obligation.daysRemaining} días (${dueDateStr}). NIT: ${nit}`;
    }

    const payload = {
      company_id: companyId,
      type: notificationType,
      title,
      message,
      action_url: `/dashboard/tax-calendar?obligation=${obligation.id}`,
    };

    try {
      this.logger.debug(
        `Enviando notificación ${notificationType} a empresa ${companyName} (${companyId})`,
      );

      await firstValueFrom(
        this.httpService.post(`${this.notificationServiceUrl}/api/notifications`, payload, {
          timeout: 5000,
        }),
      );

      this.logger.log(
        `✅ Notificación enviada: ${companyName} - ${obligation.obligationType} (${obligation.daysRemaining} días)`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error enviando notificación a ${companyName}: ${error.message}`,
        error.stack,
      );
      // No lanzar error para que continúe con las demás notificaciones
    }
  }

  /**
   * Procesa recordatorios para todas las empresas activas
   */
  async processReminders(daysAhead: number = 30, includeOverdue: boolean = true): Promise<{
    totalCompanies: number;
    totalObligations: number;
    notificationsSent: number;
    errors: number;
  }> {
    this.logger.log(`Iniciando procesamiento de recordatorios (próximos ${daysAhead} días)`);

    const companies = await this.getActiveCompanies();
    let totalObligations = 0;
    let notificationsSent = 0;
    let errors = 0;

    for (const company of companies) {
      try {
        // Obtener obligaciones próximas de esta empresa
        const result = await this.taxCalendarService.getUpcomingObligations(
          company.id,
          daysAhead,
        );

        const obligations = result.obligations || [];
        totalObligations += obligations.length;

        // Enviar notificación por cada obligación
        for (const obligation of obligations) {
          // Si no incluir vencidas y está vencida, saltar
          if (!includeOverdue && obligation.daysRemaining < 0) {
            continue;
          }

          try {
            await this.sendNotification({
              companyId: company.id,
              companyName: company.company_name,
              nit: company.nit,
              obligation: {
                id: obligation.id,
                obligationType: obligation.tax_obligation_type.name,
                dueDate: obligation.due_date,
                daysRemaining: obligation.daysRemaining,
                urgency: obligation.urgency as 'urgent' | 'soon' | 'normal',
                periodName: obligation.period_name,
                isDeclaration: obligation.is_declaration,
                isPayment: obligation.is_payment,
              },
            });

            notificationsSent++;
          } catch (error) {
            errors++;
            this.logger.error(
              `Error procesando obligación ${obligation.id} para ${company.company_name}`,
            );
          }
        }
      } catch (error) {
        errors++;
        this.logger.error(`Error procesando empresa ${company.company_name}: ${error.message}`);
      }
    }

    const summary = {
      totalCompanies: companies.length,
      totalObligations,
      notificationsSent,
      errors,
    };

    this.logger.log(
      `✅ Procesamiento completado: ${notificationsSent} notificaciones enviadas de ${totalObligations} obligaciones en ${companies.length} empresas (${errors} errores)`,
    );

    return summary;
  }

  /**
   * Procesa recordatorios para una empresa específica (útil para testing)
   */
  async processRemindersForCompany(companyId: string, daysAhead: number = 30): Promise<{
    company: { id: string; name: string; nit: string };
    totalObligations: number;
    notificationsSent: number;
    errors: number;
  }> {
    this.logger.log(`Procesando recordatorios para empresa ${companyId}`);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, company_name: true, nit: true, is_active: true },
    });

    if (!company) {
      throw new Error(`Empresa ${companyId} no encontrada`);
    }

    if (!company.is_active) {
      throw new Error(`Empresa ${company.company_name} no está activa`);
    }

    if (!company.nit) {
      throw new Error(`Empresa ${company.company_name} no tiene NIT configurado`);
    }

    const result = await this.taxCalendarService.getUpcomingObligations(companyId, daysAhead);
    const obligations = result.obligations || [];

    let notificationsSent = 0;
    let errors = 0;

    for (const obligation of obligations) {
      try {
        await this.sendNotification({
          companyId: company.id,
          companyName: company.company_name,
          nit: company.nit,
          obligation: {
            id: obligation.id,
            obligationType: obligation.tax_obligation_type.name,
            dueDate: obligation.due_date,
            daysRemaining: obligation.daysRemaining,
            urgency: obligation.urgency as 'urgent' | 'soon' | 'normal',
            periodName: obligation.period_name,
            isDeclaration: obligation.is_declaration,
            isPayment: obligation.is_payment,
          },
        });

        notificationsSent++;
      } catch (error) {
        errors++;
        this.logger.error(`Error enviando notificación para obligación ${obligation.id}`);
      }
    }

    const summary = {
      company: {
        id: company.id,
        name: company.company_name,
        nit: company.nit,
      },
      totalObligations: obligations.length,
      notificationsSent,
      errors,
    };

    this.logger.log(
      `✅ Completado para ${company.company_name}: ${notificationsSent}/${obligations.length} notificaciones enviadas`,
    );

    return summary;
  }
}
