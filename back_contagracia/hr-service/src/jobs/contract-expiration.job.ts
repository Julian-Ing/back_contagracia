import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, TenantContextService } from '@contagracia/shared-modules';

@Injectable()
export class ContractExpirationJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContractExpirationJob.name);
  private masterPrisma: PrismaClient;
  private notificationServiceUrl: string;

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServiceUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') || 'http://localhost:3015';
  }

  onModuleInit() {
    this.masterPrisma = new PrismaClient({
      datasources: {
        db: { url: this.configService.get<string>('DATABASE_MASTER_URL') },
      },
    });
    this.logger.log('ContractExpirationJob inicializado:');
    this.logger.log('  - Revisión: Diaria a las 6:00 AM (America/Bogota)');
  }

  async onModuleDestroy() {
    await this.masterPrisma?.$disconnect();
  }

  /**
   * Cron diario a las 6 AM — revisa contratos vencidos en todas las empresas
   */
  @Cron('0 6 * * *', {
    name: 'contract-expiration',
    timeZone: 'America/Bogota',
  })
  async handleContractExpiration() {
    const startTime = Date.now();
    this.logger.log('Iniciando revisión de contratos vencidos...');

    try {
      const companies = await this.masterPrisma.company.findMany({
        where: { is_active: true },
        select: { id: true, company_name: true },
      });

      let totalExpired = 0;

      for (const company of companies) {
        try {
          const count = await this.processCompany(company.id, company.company_name);
          totalExpired += count;
        } catch (err) {
          this.logger.error(
            `Error procesando empresa ${company.company_name} (${company.id}): ${err.message}`,
          );
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(`Revisión completada en ${duration}s — ${totalExpired} contrato(s) vencido(s) procesados en ${companies.length} empresa(s)`);
    } catch (error) {
      this.logger.error('Error en revisión de contratos vencidos:', error);
    }
  }

  /**
   * Procesa una empresa: busca contratos vencidos y desactiva empleados
   */
  private async processCompany(companyId: string, companyName: string): Promise<number> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Contratos vencidos: end_date <= hoy Y sigue marcado como current
    const expiredContracts = await tenantDb.employeeContract.findMany({
      where: {
        end_date: { lte: today },
        is_current: true,
      },
      include: {
        third_party: {
          select: {
            id: true,
            name: true,
            current_contract_id: true,
            current_salary_id: true,
            employee_status: true,
          },
        },
      },
    });

    if (expiredContracts.length === 0) return 0;

    this.logger.log(
      `[${companyName}] ${expiredContracts.length} contrato(s) vencido(s) encontrado(s)`,
    );

    let processed = 0;

    for (const contract of expiredContracts) {
      const employee = contract.third_party;
      if (!employee || employee.employee_status === 'TERMINATED') continue;

      try {
        await tenantDb.$transaction(async (tx) => {
          // 1. Cerrar contrato
          await tx.employeeContract.update({
            where: { id: contract.id },
            data: {
              is_current: false,
              termination_type: 'EXPIRACION_PLAZO',
              termination_reason: 'Contrato vencido — desactivación automática',
            },
          });

          // 2. Cerrar salario actual (si existe)
          if (employee.current_salary_id) {
            await tx.salaryHistory.update({
              where: { id: employee.current_salary_id },
              data: {
                is_current: false,
                end_date: contract.end_date ?? today,
              },
            });
          }

          // 3. Desactivar empleado
          await tx.thirdParty.update({
            where: { id: employee.id },
            data: {
              employee_status: 'INACTIVE',
              current_contract_id: null,
              current_salary_id: null,
            },
          });
        });

        // 4. Notificar a la empresa vía WebSocket
        await this.sendNotification(companyId, {
          type: 'contract_expired',
          title: 'Contrato vencido',
          message: `El contrato de "${employee.name}" ha vencido y fue desactivado automáticamente.`,
          action_url: '/dashboard/hr/employees',
        });

        processed++;
        this.logger.log(`  [${companyName}] ${employee.name} — desactivado por vencimiento de contrato`);
      } catch (err) {
        this.logger.error(
          `  [${companyName}] Error desactivando ${employee.name}: ${err.message}`,
        );
      }
    }

    return processed;
  }

  /**
   * Envía notificación vía HTTP a notification-service
   * (fluye: notification-service → Redis → WebSocket Gateway → Frontend)
   */
  private async sendNotification(
    companyId: string,
    notification: { type: string; title: string; message: string; action_url?: string },
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.notificationServiceUrl}/api/notifications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: companyId, ...notification }),
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!response.ok) {
        this.logger.warn(`Notification service respondió con ${response.status}`);
      }
    } catch (err) {
      this.logger.warn(`Error enviando notificación: ${err.message}`);
    }
  }
}
