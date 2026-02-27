import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient as TenantPrismaClient } from '@prisma/client-tenant';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Crear una nueva base de datos para el tenant
   * Usa los datos de conexión almacenados en la empresa
   */
  async createTenantDatabase(companyId: string): Promise<{
    database_name: string;
    database_url: string;
  }> {
    // Obtener los datos de la empresa
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new InternalServerErrorException('Empresa no encontrada');
    }

    const databaseName = company.db_name;
    const databaseUrl = `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${databaseName}?schema=public`;

    try {
      this.logger.log(`[CREATE DB] Iniciando creación de base de datos: ${databaseName}`);
      this.logger.debug(`[CREATE DB] Host: ${company.db_host}:${company.db_port}`);

      // Crear la base de datos usando SQL directo
      await this.prisma.$executeRawUnsafe(
        `CREATE DATABASE "${databaseName}"`,
      );
      this.logger.log(`[CREATE DB] ✓ Base de datos creada exitosamente: ${databaseName}`);
    } catch (error: any) {
      if (error.code === '42P04') {
        // Database already exists
        this.logger.warn(`[CREATE DB] Base de datos ${databaseName} ya existe, continuando...`);
      } else {
        this.logger.error(`[CREATE DB] ✗ Error creando base de datos: ${error.message}`);
        this.logger.error(`[CREATE DB] Código de error: ${error.code}`);
        throw new InternalServerErrorException(
          'Error al crear la base de datos del tenant',
        );
      }
    }

    return {
      database_name: databaseName,
      database_url: databaseUrl,
    };
  }

  /**
   * Ejecutar migraciones de Prisma en el tenant
   */
  async runTenantMigrations(companyId: string): Promise<void> {
    // Obtener los datos de la empresa
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new InternalServerErrorException('Empresa no encontrada');
    }

    const databaseUrl = `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;

    try {
      // Usar path absoluto desde la raíz del proyecto
      const schemaPath = path.resolve(
        process.cwd(),
        '../contagracia-shared-modules/prisma/schema-tenant.prisma',
      );

      this.logger.log(`[MIGRATIONS] Iniciando migraciones para tenant...`);
      this.logger.debug(`[MIGRATIONS] Schema path: ${schemaPath}`);
      this.logger.debug(`[MIGRATIONS] Database URL: ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`);

      // Ejecutar prisma db push para aplicar el schema
      this.logger.log(`[MIGRATIONS] Ejecutando prisma db push...`);
      const { stdout, stderr } = await execAsync(
        `npx prisma db push --schema="${schemaPath}" --accept-data-loss --skip-generate`,
        {
          env: {
            ...process.env,
            DATABASE_TENANT_URL: databaseUrl,
          },
          cwd: path.resolve(process.cwd(), '../contagracia-shared-modules'),
        },
      );

      this.logger.log(`[MIGRATIONS] ✓ Migraciones completadas exitosamente`);
      if (stdout) {
        this.logger.debug(`[MIGRATIONS] Output: ${stdout}`);
      }
      if (stderr) {
        this.logger.warn(`[MIGRATIONS] Advertencias: ${stderr}`);
      }
    } catch (error: any) {
      this.logger.error(`[MIGRATIONS] ✗ Error ejecutando migraciones: ${error.message}`);
      this.logger.error(`[MIGRATIONS] stdout: ${error.stdout}`);
      this.logger.error(`[MIGRATIONS] stderr: ${error.stderr}`);
      throw new InternalServerErrorException(
        'Error al ejecutar migraciones del tenant',
      );
    }
  }

  /**
   * Replicar tablas paramétricas desde Master al Tenant
   * Delega al script seed-all-tenants con --company-id para reutilizar la misma lógica
   */
  async replicateParametrics(companyId: string): Promise<void> {
    this.logger.log(`[PARAMETRICS] Ejecutando seed-all-tenants para company ${companyId}...`);

    try {
      const scriptPath = path.resolve(
        process.cwd(),
        '../contagracia-shared-modules/prisma/scripts/seed-all-tenants.ts',
      );

      const { stdout, stderr } = await execAsync(
        `npx ts-node "${scriptPath}" --force --company-id=${companyId}`,
        {
          cwd: path.resolve(process.cwd(), '../contagracia-shared-modules'),
          env: { ...process.env },
        },
      );

      if (stdout) {
        this.logger.log(`[PARAMETRICS] ${stdout.slice(-500)}`);
      }
      if (stderr) {
        this.logger.warn(`[PARAMETRICS] stderr: ${stderr.slice(-300)}`);
      }

      this.logger.log(`[PARAMETRICS] ✓ Tablas paramétricas replicadas exitosamente`);
    } catch (error: any) {
      this.logger.error(`[PARAMETRICS] ✗ Error replicando tablas paramétricas: ${error.message}`);
      if (error.stdout) this.logger.error(`[PARAMETRICS] stdout: ${error.stdout.slice(-500)}`);
      if (error.stderr) this.logger.error(`[PARAMETRICS] stderr: ${error.stderr.slice(-500)}`);
      throw new InternalServerErrorException(
        'Error al replicar tablas paramétricas',
      );
    }
  }

  /**
   * Crear el usuario owner en el tenant después de provisionar la base de datos
   */
  async createOwnerTenantUser(
    companyId: string,
    userData: {
      email: string;
      password_hash: string;
      full_name: string;
      phone?: string;
    },
  ): Promise<void> {
    // Obtener la información de la empresa para construir la URL
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new InternalServerErrorException('Empresa no encontrada');
    }

    const databaseUrl = `postgresql://${company.db_user}:${company.db_password}@${company.db_host}:${company.db_port}/${company.db_name}?schema=public`;

    this.logger.log(`[OWNER USER] Iniciando creación de usuario owner: ${userData.email}`);

    const tenantPrisma = new TenantPrismaClient({
      datasources: {
        db: { url: databaseUrl },
      },
    });

    try {
      this.logger.debug(`[OWNER USER] Conectando a base de datos del tenant...`);
      await tenantPrisma.$connect();

      // Buscar el rol owner
      this.logger.debug(`[OWNER USER] Buscando rol 'owner'...`);
      let ownerRole = await tenantPrisma.role.findFirst({
        where: { role_key: 'owner' },
      });

      if (!ownerRole) {
        // Crear el rol owner si no existe
        this.logger.log(`[OWNER USER] Rol 'owner' no existe, creándolo...`);
        ownerRole = await tenantPrisma.role.create({
          data: {
            role_key: 'owner',
            role_name: 'Propietario',
            description: 'Propietario de la empresa con todos los permisos',
            is_system: true,
          },
        });
        this.logger.log(`[OWNER USER] ✓ Rol 'owner' creado con ID: ${ownerRole.id}`);
      } else {
        this.logger.debug(`[OWNER USER] ✓ Rol 'owner' encontrado con ID: ${ownerRole.id}`);
      }

      // Crear el rol admin si no existe
      const existingAdmin = await tenantPrisma.role.findFirst({
        where: { role_key: 'admin' },
      });

      if (!existingAdmin) {
        this.logger.log(`[OWNER USER] Creando rol 'admin'...`);
        await tenantPrisma.role.create({
          data: {
            role_key: 'admin',
            role_name: 'Administrador',
            description: 'Administrador de la empresa con todos los permisos',
            is_system: true,
          },
        });
        this.logger.log(`[OWNER USER] ✓ Rol 'admin' creado`);
      }

      // Crear el usuario owner en el tenant
      this.logger.log(`[OWNER USER] Creando usuario en tenant...`);
      const tenantUser = await tenantPrisma.tenantUser.create({
        data: {
          email: userData.email,
          password_hash: userData.password_hash,
          full_name: userData.full_name,
          phone: userData.phone,
          role_id: ownerRole.id,
          is_active: true,
          must_change_password: false,
        },
      });

      this.logger.log(`[OWNER USER] ✓ Usuario owner creado exitosamente`);
      this.logger.log(`[OWNER USER]   - Email: ${userData.email}`);
      this.logger.log(`[OWNER USER]   - ID: ${tenantUser.id}`);
      this.logger.log(`[OWNER USER]   - Rol: ${ownerRole.role_name}`);
    } catch (error: any) {
      this.logger.error(`[OWNER USER] ✗ Error creando usuario owner: ${error.message}`);
      this.logger.error(`[OWNER USER] Stack: ${error.stack}`);
      throw new InternalServerErrorException(
        'Error al crear el usuario owner en el tenant',
      );
    } finally {
      this.logger.debug(`[OWNER USER] Desconectando del tenant...`);
      await tenantPrisma.$disconnect();
    }
  }

  /**
   * Eliminar base de datos de tenant (usar con precaución)
   */
  async deleteTenantDatabase(databaseName: string): Promise<void> {
    try {
      // Terminar conexiones activas
      await this.prisma.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${databaseName}'
        AND pid <> pg_backend_pid()
      `);

      // Eliminar base de datos
      await this.prisma.$executeRawUnsafe(
        `DROP DATABASE IF EXISTS "${databaseName}"`,
      );
      console.log(`Tenant database deleted: ${databaseName}`);
    } catch (error) {
      console.error('Error deleting tenant database:', error);
      throw new InternalServerErrorException(
        'Error al eliminar la base de datos del tenant',
      );
    }
  }
}
