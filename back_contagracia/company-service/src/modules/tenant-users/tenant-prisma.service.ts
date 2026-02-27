import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantPrismaService {
  private readonly logger = new Logger(TenantPrismaService.name);
  private tenantClients: Map<string, TenantPrismaClient> = new Map();

  constructor(private readonly masterPrisma: PrismaService) {}

  /**
   * Obtener cliente Prisma para un tenant específico
   */
  async getClientForCompany(companyId: string): Promise<TenantPrismaClient> {
    // Verificar si ya tenemos una conexión activa
    const existingClient = this.tenantClients.get(companyId);
    if (existingClient) {
      return existingClient;
    }

    // Obtener información de conexión del tenant desde Master
    const company = await this.masterPrisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        db_host: true,
        db_port: true,
        db_name: true,
        db_user: true,
        db_password: true,
        is_active: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    if (!company.is_active) {
      throw new NotFoundException('La empresa no está activa');
    }

    // Construir URL de conexión
    const connectionUrl = `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;

    // Crear cliente Prisma para el tenant
    const client = new TenantPrismaClient({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
    });

    // Conectar y cachear
    await client.$connect();
    this.tenantClients.set(companyId, client);

    this.logger.log(`Conexión establecida con tenant: ${company.db_name}`);

    return client;
  }

  /**
   * Desconectar un cliente específico
   */
  async disconnectClient(companyId: string): Promise<void> {
    const client = this.tenantClients.get(companyId);
    if (client) {
      await client.$disconnect();
      this.tenantClients.delete(companyId);
      this.logger.log(`Desconectado del tenant: ${companyId}`);
    }
  }

  /**
   * Desconectar todos los clientes (cleanup)
   */
  async disconnectAll(): Promise<void> {
    for (const [companyId, client] of this.tenantClients) {
      await client.$disconnect();
      this.logger.log(`Desconectado del tenant: ${companyId}`);
    }
    this.tenantClients.clear();
  }

  /**
   * Hook para limpiar conexiones al destruir el servicio
   */
  async onModuleDestroy() {
    await this.disconnectAll();
  }
}
