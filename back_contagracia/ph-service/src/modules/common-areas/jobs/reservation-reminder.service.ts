import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantPrismaService } from '../../tenant/tenant-prisma.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ReservationReminderService {
  private readonly logger = new Logger(ReservationReminderService.name);
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

  /**
   * Obtiene todas las empresas activas
   */
  private async getActiveCompanies() {
    return this.masterPrisma.company.findMany({
      where: { is_active: true },
      select: { id: true, company_name: true },
    });
  }

  /**
   * Procesa recordatorios para todas las empresas
   */
  async processReminders(): Promise<{
    totalCompanies: number;
    reservationsFound: number;
    remindersSent: number;
    errors: number;
  }> {
    const companies = await this.getActiveCompanies();
    let reservationsFound = 0;
    let remindersSent = 0;
    let errors = 0;

    for (const company of companies) {
      try {
        const result = await this.processCompany(company.id, company.company_name);
        reservationsFound += result.found;
        remindersSent += result.sent;
      } catch (error) {
        errors++;
        this.logger.error(
          `Error procesando empresa ${company.company_name}: ${error.message}`,
        );
      }
    }

    return {
      totalCompanies: companies.length,
      reservationsFound,
      remindersSent,
      errors,
    };
  }

  /**
   * Procesa recordatorios para una empresa específica
   */
  private async processCompany(
    companyId: string,
    companyName: string,
  ): Promise<{ found: number; sent: number }> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Obtener la fecha de mañana en zona horaria Colombia
    const now = new Date();
    const colombiaOffset = -5 * 60; // UTC-5
    const colombiaNow = new Date(now.getTime() + (colombiaOffset - now.getTimezoneOffset()) * 60000);

    const tomorrow = new Date(colombiaNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
    );
    const tomorrowEnd = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      23, 59, 59, 999,
    );

    // Buscar reservas confirmadas para mañana que no tengan recordatorio enviado
    const reservations = await db.phCommonAreaReservation.findMany({
      where: {
        status: 'confirmed',
        reminder_sent: false,
        reservation_date: {
          gte: tomorrowStart,
          lte: tomorrowEnd,
        },
      },
      include: {
        common_area: { select: { name: true } },
        unit: { select: { unit_number: true } },
      },
    });

    if (reservations.length === 0) {
      return { found: 0, sent: 0 };
    }

    this.logger.log(
      `${companyName}: ${reservations.length} reserva(s) confirmada(s) para mañana`,
    );

    let sent = 0;

    for (const reservation of reservations) {
      try {
        // Formatear fecha para el mensaje
        const dateStr = tomorrowStart.toLocaleDateString('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });

        const areaName = reservation.common_area?.name || 'Zona Común';
        const unitLabel = reservation.unit?.unit_number
          ? ` (Unidad ${reservation.unit.unit_number})`
          : '';

        await this.sendNotification(companyId, {
          type: 'ph_reservation_reminder',
          title: `Recordatorio: Reserva de ${areaName}`,
          message: `Tienes una reserva de ${areaName}${unitLabel} para mañana ${dateStr}, de ${reservation.start_time} a ${reservation.end_time}.`,
          action_url: '/dashboard/ph/common-areas?tab=reservations',
        });

        // Marcar como enviado
        await db.phCommonAreaReservation.update({
          where: { id: reservation.id },
          data: { reminder_sent: true },
        });

        sent++;
      } catch (error) {
        this.logger.error(
          `Error enviando recordatorio para reserva ${reservation.id}: ${error.message}`,
        );
      }
    }

    return { found: reservations.length, sent };
  }

  /**
   * Envía una notificación al notification-service via HTTP
   */
  private async sendNotification(
    companyId: string,
    notification: { type: string; title: string; message: string; action_url: string },
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.notificationServiceUrl}/api/notifications`,
          {
            company_id: companyId,
            ...notification,
          },
          { timeout: 5000 },
        ),
      );
    } catch (error) {
      this.logger.error(`Error enviando notificación: ${error.message}`);
    }
  }
}
