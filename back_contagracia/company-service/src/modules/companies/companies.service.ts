import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../tenant/tenant.service';
import { CompanySettingsHelper } from './company-settings.helper';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RealtimePublisherService, TenantContextService, DianApiService } from '@contagracia/shared-modules';
import { NIT_DEPENDENT_FIELDS } from '../../constants/nit-dependent-fields';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
    private readonly settingsHelper: CompanySettingsHelper,
    private readonly realtimePublisher: RealtimePublisherService,
    private readonly tenantContext: TenantContextService,
    private readonly dianApiService: DianApiService,
  ) {}

  /**
   * Obtener módulos habilitados del plan
   */
  private getEnabledModules(planModules: { module: { module_key: string } }[]): string[] {
    return planModules.map((pm) => pm.module.module_key);
  }

  /**
   * Verificar si un NIT ya está registrado
   */
  async checkNitExists(nit: string): Promise<{ exists: boolean; message?: string }> {
    const company = await this.prisma.company.findUnique({
      where: { nit },
      select: { id: true },
    });

    return {
      exists: !!company,
      message: company ? 'Este NIT ya está registrado' : undefined,
    };
  }

  /**
   * Registrar una nueva empresa con su administrador
   * Este proceso:
   * 1. Crea la empresa en Master
   * 2. Crea la suscripción (trial o plan seleccionado)
   * 3. Crea la base de datos del tenant
   * 4. Corre migraciones y replica paramétricos
   * 5. Crea el TenantUser con rol owner en el tenant
   *
   * NOTA: Los usuarios de empresa solo existen en el tenant (TenantUser).
   * La tabla users en master es solo para admins del sistema.
   */
  async registerCompany(dto: RegisterCompanyDto): Promise<any> {
    // 1. Validar que el NIT no esté registrado
    const existingCompany = await this.prisma.company.findUnique({
      where: { nit: dto.nit },
    });

    if (existingCompany) {
      throw new ConflictException('Ya existe una empresa con este NIT');
    }

    // 2. Obtener el plan (trial por defecto)
    let plan = await this.prisma.plan.findFirst({
      where: dto.plan_id
        ? { id: dto.plan_id, is_active: true }
        : { is_trial: true, is_active: true },
    });

    if (!plan) {
      throw new BadRequestException('Plan no encontrado o no disponible');
    }

    // 3. Hash de la contraseña (para el TenantUser)
    const passwordHash = await bcrypt.hash(dto.admin_password, 12);

    // 4. Generar identificadores únicos para tenant
    const tenantId = this.generateTenantId(dto.company_name);

    // 5. Transacción para crear Company y Subscription en Master
    const result = await this.prisma.$transaction(async (tx) => {
      // Crear empresa en master (solo campos de routing/infraestructura + sync)
      const company = await tx.company.create({
        data: {
          company_name: dto.company_name,
          nit: dto.nit,
          email: dto.company_email,
          tenant_id: tenantId,
          db_host: process.env.TENANT_DB_HOST || 'localhost',
          db_port: parseInt(process.env.TENANT_DB_PORT || '5432', 10),
          db_name: `tenant_${tenantId}`,
          db_user: process.env.TENANT_DB_USER || 'postgres',
          db_password: process.env.TENANT_DB_PASSWORD || 'postgres',
        },
      });

      // Crear suscripción
      const trialDays = plan.trial_days || 14;
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + trialDays);

      const subscription = await tx.subscription.create({
        data: {
          company_id: company.id,
          plan_id: plan.id,
          starts_at: new Date(),
          ends_at: plan.is_trial ? endsAt : null,
          billing_cycle: 'MONTHLY',
        },
      });

      return { company, subscription };
    });

    // 7. Crear la base de datos del tenant y configurar el usuario owner
    // Si falla cualquier paso, se revierte todo (master + tenant DB)
    try {
      this.logger.log(`Creando base de datos para tenant: ${tenantId}`);
      await this.tenantService.createTenantDatabase(result.company.id);

      this.logger.log(`Base de datos creada. Ejecutando migraciones...`);
      await this.tenantService.runTenantMigrations(result.company.id);

      this.logger.log(`Migraciones completadas. Replicando paramétricos...`);
      await this.tenantService.replicateParametrics(result.company.id);

      this.logger.log(`Creando usuario owner en tenant...`);
      await this.tenantService.createOwnerTenantUser(result.company.id, {
        email: dto.admin_email,
        password_hash: passwordHash,
        full_name: dto.admin_full_name,
        phone: dto.admin_phone,
      });

      this.logger.log(`Tenant ${tenantId} provisionado exitosamente`);

      // Escribir datos de perfil en tenant CompanySetting
      this.logger.log(`Escribiendo datos de perfil en tenant CompanySetting...`);
      await this.settingsHelper.upsertCompanyInfo(result.company.id, {
        dv: dto.dv,
        phone: dto.phone,
        address: dto.address,
        country_id: dto.country_id,
        department_id: dto.department_id,
        municipality_id: dto.municipality_id,
      });
      await this.settingsHelper.upsertTaxClassification(result.company.id, {
        type_document_identification_id: dto.type_document_identification_id,
        type_organization_id: dto.type_organization_id,
        type_regime_id: dto.type_regime_id,
        type_liability_id: dto.type_liability_id,
      });

      // Sincronizar con DIAN (no bloquea si falla)
      await this.syncWithDian(result.company.id);
    } catch (error) {
      this.logger.error(`Error provisionando tenant: ${error.message}`);

      // Rollback: eliminar company + subscription de master
      try {
        await this.prisma.subscription.deleteMany({ where: { company_id: result.company.id } });
        await this.prisma.company.delete({ where: { id: result.company.id } });
        this.logger.log(`[ROLLBACK] Company y subscription eliminadas de master`);
      } catch (rollbackError) {
        this.logger.error(`[ROLLBACK] Error eliminando de master: ${rollbackError.message}`);
      }

      // Rollback: dropear la DB del tenant si fue creada
      try {
        await this.tenantService.deleteTenantDatabase(`tenant_${tenantId}`);
        this.logger.log(`[ROLLBACK] Base de datos tenant_${tenantId} eliminada`);
      } catch (dbError) {
        this.logger.error(`[ROLLBACK] Error eliminando DB: ${dbError.message}`);
      }

      throw new BadRequestException(
        'Error al registrar la empresa. Todos los cambios han sido revertidos. Intente nuevamente.',
      );
    }

    return {
      message: 'Empresa registrada exitosamente',
      company: {
        id: result.company.id,
        company_name: result.company.company_name,
        nit: result.company.nit,
        tenant_id: result.company.tenant_id,
      },
      owner: {
        email: dto.admin_email,
        full_name: dto.admin_full_name,
      },
      subscription: {
        id: result.subscription.id,
        plan_name: plan.name,
        ends_at: result.subscription.ends_at,
      },
    };
  }

  /**
   * Obtener información de una empresa
   * NOTA: El acceso se valida en el JWT (company_id viene del login con NIT)
   * El rol del usuario se obtiene del TenantUser en la base de datos del tenant
   */
  async getCompany(companyId: string): Promise<any> {
    try {
      // Solo leer de master lo necesario: routing, licenciamiento, subscription
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          company_name: true,
          nit: true,
          email: true,
          is_active: true,
          subscriptions: {
            where: {
              OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }],
            },
            include: {
              plan: {
                include: {
                  plan_modules: {
                    include: {
                      module: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              created_at: 'desc',
            },
            take: 1,
          },
        },
      });

      if (!company) {
        throw new NotFoundException('Empresa no encontrada');
      }

      // Leer perfil completo desde tenant CompanySetting
      const profile = await this.settingsHelper.getAllCompanyProfile(companyId);

      const subscription = company.subscriptions[0];

      return {
        id: company.id,
        company_name: company.company_name,
        nit: company.nit,
        dv: profile.dv,
        email: company.email,
        phone: profile.phone,
        address: profile.address,
        logo_url: profile.logo_url,
        is_active: company.is_active,
        // IDs directos (desde tenant)
        type_document_identification_id: profile.type_document_identification_id,
        type_organization_id: profile.type_organization_id,
        type_regime_id: profile.type_regime_id,
        type_liability_id: profile.type_liability_id,
        country_id: profile.country_id,
        department_id: profile.department_id,
        municipality_id: profile.municipality_id,
        // Representante Legal
        legal_rep_name: profile.legal_rep_name,
        legal_rep_identification: profile.legal_rep_identification,
        legal_rep_phone: profile.legal_rep_phone,
        legal_rep_email: profile.legal_rep_email,
        legal_rep_signature_url: profile.legal_rep_signature_url,
        // Contador
        contador_name: profile.contador_name,
        contador_identification: profile.contador_identification,
        contador_phone: profile.contador_phone,
        contador_email: profile.contador_email,
        contador_signature_url: profile.contador_signature_url,
        // Revisor Fiscal
        revisor_fiscal_name: profile.revisor_fiscal_name,
        revisor_fiscal_identification: profile.revisor_fiscal_identification,
        revisor_fiscal_phone: profile.revisor_fiscal_phone,
        revisor_fiscal_email: profile.revisor_fiscal_email,
        revisor_fiscal_signature_url: profile.revisor_fiscal_signature_url,
        // Configuración de visualización (desde tenant CompanySetting)
        display_decimals: await this.getDisplayDecimals(companyId),
        // Subscription
        subscription: subscription
          ? {
              plan_name: subscription.plan.name,
              ends_at: subscription.ends_at,
              modules: this.getEnabledModules(subscription.plan.plan_modules),
            }
          : null,
      };
    } catch (error) {
      this.logger.error(`Error getting company ${companyId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calcular dígito de verificación del NIT — algoritmo DIAN Colombia
   */
  private calculateDv(nit: string): string {
    const factors = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let sum = 0;
    const digits = nit.split('').reverse();
    for (let i = 0; i < digits.length && i < factors.length; i++) {
      sum += parseInt(digits[i], 10) * factors[i];
    }
    const remainder = sum % 11;
    return remainder > 1 ? String(11 - remainder) : String(remainder);
  }

  /**
   * Renombrar carpeta de uploads cuando cambia el NIT.
   * Actualiza automáticamente TODOS los campos configurados en NIT_DEPENDENT_FIELDS.
   *
   * @param companyId ID de la empresa
   * @param oldNit NIT anterior
   * @param newNit NIT nuevo
   * @param currentValues Objeto con los valores actuales de los campos (ej: { logo_url: '...', legal_rep_signature_url: '...' })
   * @returns Objeto con los campos actualizados que contienen el nuevo NIT
   */
  private async renameUploadFolders(
    companyId: string,
    oldNit: string,
    newNit: string,
    currentValues: Record<string, string | null>,
  ): Promise<Record<string, string | null>> {
    const uploadsBase = path.resolve(process.cwd(), '..', 'uploads');

    // Renombrar todas las carpetas físicas de uploads
    const foldersToRename = ['logos', 'signatures', 'certificates'];
    for (const folder of foldersToRename) {
      const oldDir = path.join(uploadsBase, folder, oldNit);
      const newDir = path.join(uploadsBase, folder, newNit);
      if (fs.existsSync(oldDir)) {
        fs.renameSync(oldDir, newDir);
        this.logger.log(`Renombrada carpeta ${folder}: ${oldNit} → ${newNit}`);
      }
    }

    const updatedFields: Record<string, string | null> = {};

    // Actualizar campos de master DB (Company table)
    for (const fieldConfig of NIT_DEPENDENT_FIELDS.master) {
      const currentValue = currentValues[fieldConfig.field];
      if (currentValue && typeof currentValue === 'string') {
        // Reemplazar cualquier ocurrencia de /oldNit/ por /newNit/ en la ruta
        const newValue = currentValue.replace(
          new RegExp(`/${oldNit}/`, 'g'),
          `/${newNit}/`,
        );
        updatedFields[fieldConfig.field] = newValue;
        this.logger.log(`Actualizado ${fieldConfig.field}: ${oldNit} → ${newNit}`);
      } else {
        updatedFields[fieldConfig.field] = null;
      }
    }

    // Actualizar campos en tenant DB (CompanySetting rows con rutas de uploads)
    try {
      const tenantDb = await this.tenantContext.getTenantClient(companyId);
      if (tenantDb) {
        for (const fieldConfig of NIT_DEPENDENT_FIELDS.tenant) {
          if (!fieldConfig.where) continue;

          const record = await tenantDb.companySetting.findFirst({
            where: fieldConfig.where,
          });

          if (record && record[fieldConfig.field]) {
            const currentValue = record[fieldConfig.field];
            const newValue = currentValue.replace(
              new RegExp(`/${oldNit}/`, 'g'),
              `/${newNit}/`,
            );

            await tenantDb.companySetting.update({
              where: { id: record.id },
              data: { [fieldConfig.field]: newValue },
            });

            this.logger.log(
              `Actualizado CompanySetting ${fieldConfig.where.category}:${fieldConfig.where.key} en tenant: ${oldNit} → ${newNit}`,
            );
          }
        }
      }
    } catch (error: any) {
      this.logger.warn(`Error actualizando campos en tenant: ${error.message}`);
    }

    return updatedFields;
  }

  /**
   * Actualizar información de una empresa.
   * Si cambia el NIT: recalcula el DV y renombra carpetas de uploads.
   */
  async updateCompany(companyId: string, data: import('./dto/update-company.dto').UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, nit: true, company_name: true, email: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const { display_decimals, logo_url, nit, dv, ...rest } = data;
    const effectiveNit = nit ?? company.nit;
    const effectiveDv = nit ? this.calculateDv(nit) : (dv ?? null);

    // Si cambió el NIT, renombrar carpetas de uploads y actualizar rutas en tenant + master
    let renamedMasterFields: Record<string, string | null> = {};
    if (nit && nit !== company.nit) {
      const profile = await this.settingsHelper.getAllCompanyProfile(companyId);
      renamedMasterFields = await this.renameUploadFolders(companyId, company.nit, nit, {
        logo_url: profile.logo_url,
        legal_rep_signature_url: profile.legal_rep_signature_url,
      });
    }

    // Escribir datos de perfil en tenant CompanySetting
    await this.settingsHelper.upsertCompanyInfo(companyId, {
      dv: effectiveDv,
      phone: rest.phone,
      address: rest.address,
      department_id: rest.department_id,
      municipality_id: rest.municipality_id,
    });
    await this.settingsHelper.upsertTaxClassification(companyId, {
      type_document_identification_id: rest.type_document_identification_id,
      type_organization_id: rest.type_organization_id,
      type_regime_id: rest.type_regime_id,
      type_liability_id: rest.type_liability_id,
    });
    if (logo_url !== undefined) {
      await this.settingsHelper.upsertLogoUrl(companyId, logo_url);
    }
    await this.settingsHelper.upsertLegalRep(companyId, {
      name: rest.legal_rep_name,
      identification: rest.legal_rep_identification,
      phone: rest.legal_rep_phone,
      email: rest.legal_rep_email,
    });

    // Sync routing fields a master
    const masterSync: any = {};
    if (effectiveNit !== company.nit) masterSync.nit = effectiveNit;
    if (rest.company_name !== undefined) masterSync.company_name = rest.company_name;
    if (rest.email !== undefined) masterSync.email = rest.email;
    if (logo_url !== undefined) masterSync.logo_url = logo_url;
    // Si NIT cambió, actualizar logo_url con la ruta renombrada
    Object.assign(masterSync, renamedMasterFields);

    if (Object.keys(masterSync).length > 0) {
      await this.prisma.company.update({
        where: { id: companyId },
        data: masterSync,
      });
    }

    // display_decimals se guarda en tenant CompanySetting
    await this.setDisplayDecimals(companyId, display_decimals);
    this.realtimePublisher.notifyCompanySettingsUpdated(companyId, display_decimals);

    // Sincronizar con DIAN (no bloquea si falla)
    await this.syncWithDian(companyId);

    return {
      message: 'Empresa actualizada exitosamente',
      company: {
        id: company.id,
        nit: effectiveNit,
        dv: effectiveDv,
        company_name: rest.company_name ?? company.company_name,
        email: rest.email ?? company.email,
        phone: rest.phone,
        address: rest.address,
        logo_url: logo_url,
      },
    };
  }

  /**
   * Actualizar solo información general de la empresa
   */
  async updateCompanyInfo(companyId: string, data: import('./dto/update-company-info.dto').UpdateCompanyInfoDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, nit: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Si cambió el NIT, renombrar carpetas de uploads y actualizar rutas
    let renamedMasterFields: Record<string, string | null> = {};
    if (data.nit !== company.nit) {
      const profile = await this.settingsHelper.getAllCompanyProfile(companyId);
      renamedMasterFields = await this.renameUploadFolders(companyId, company.nit, data.nit, {
        logo_url: profile.logo_url,
        legal_rep_signature_url: profile.legal_rep_signature_url,
      });
    }

    // Escribir datos en tenant CompanySetting
    await this.settingsHelper.upsertCompanyInfo(companyId, {
      dv: data.dv,
      phone: data.phone,
      address: data.address,
      department_id: data.department_id,
      municipality_id: data.municipality_id,
    });
    await this.settingsHelper.upsertTaxClassification(companyId, {
      type_document_identification_id: data.type_document_identification_id,
      type_organization_id: data.type_organization_id,
      type_regime_id: data.type_regime_id,
      type_liability_id: data.type_liability_id,
    });

    // Sync routing fields a master (nit, company_name, email + rutas renombradas)
    const masterSync: any = {};
    if (data.nit !== company.nit) masterSync.nit = data.nit;
    if (data.company_name !== undefined) masterSync.company_name = data.company_name;
    if (data.email !== undefined) masterSync.email = data.email;
    Object.assign(masterSync, renamedMasterFields);

    if (Object.keys(masterSync).length > 0) {
      await this.prisma.company.update({
        where: { id: companyId },
        data: masterSync,
      });
    }

    await this.syncWithDian(companyId);

    return { message: 'Información general actualizada' };
  }

  /**
   * Actualizar solo representante legal
   */
  async updateLegalRep(companyId: string, data: import('./dto/update-legal-rep.dto').UpdateLegalRepDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Escribir en tenant CompanySetting
    await this.settingsHelper.upsertLegalRep(companyId, {
      name: data.legal_rep_name,
      identification: data.legal_rep_identification,
      phone: data.legal_rep_phone,
      email: data.legal_rep_email,
    });

    return { message: 'Representante legal actualizado' };
  }

  /**
   * Actualizar datos del contador
   */
  async updateContador(companyId: string, data: import('./dto/update-contador.dto').UpdateContadorDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Escribir en tenant CompanySetting
    await this.settingsHelper.upsertAccountant(companyId, {
      name: data.contador_name,
      identification: data.contador_identification,
      phone: data.contador_phone,
      email: data.contador_email,
    });

    return { message: 'Contador actualizado' };
  }

  /**
   * Actualizar datos del revisor fiscal
   */
  async updateRevisorFiscal(companyId: string, data: import('./dto/update-revisor-fiscal.dto').UpdateRevisorFiscalDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Escribir en tenant CompanySetting
    await this.settingsHelper.upsertTaxAuditor(companyId, {
      name: data.revisor_fiscal_name,
      identification: data.revisor_fiscal_identification,
      phone: data.revisor_fiscal_phone,
      email: data.revisor_fiscal_email,
    });

    return { message: 'Revisor fiscal actualizado' };
  }

  /**
   * Actualizar solo configuración de decimales
   */
  async updateSettings(companyId: string, data: import('./dto/update-settings.dto').UpdateSettingsDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    await this.setDisplayDecimals(companyId, data.display_decimals);
    this.realtimePublisher.notifyCompanySettingsUpdated(companyId, data.display_decimals);

    return { message: 'Configuración actualizada' };
  }

  /**
   * Actualizar logo y/o firma (usa media-service URLs).
   * Guarda en tenant CompanySetting + master Company.
   */
  async updateBrand(companyId: string, data: import('./dto/update-brand.dto').UpdateBrandDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    // Escribir todo en tenant CompanySetting
    if (data.logo_url !== undefined) {
      await this.settingsHelper.upsertLogoUrl(companyId, data.logo_url);
    }

    if (data.legal_rep_signature_url !== undefined) {
      await this.settingsHelper.upsertLegalRep(companyId, {
        signature_url: data.legal_rep_signature_url,
      });
    }

    if (data.contador_signature_url !== undefined) {
      await this.settingsHelper.upsertAccountant(companyId, {
        signature_url: data.contador_signature_url,
      });
    }

    if (data.revisor_fiscal_signature_url !== undefined) {
      await this.settingsHelper.upsertTaxAuditor(companyId, {
        signature_url: data.revisor_fiscal_signature_url,
      });
    }

    // Sync logo_url a master (copia para login response)
    if (data.logo_url !== undefined) {
      await this.prisma.company.update({
        where: { id: companyId },
        data: { logo_url: data.logo_url },
      });
    }

    return {
      message: 'Marca actualizada',
      logo_url: data.logo_url,
      legal_rep_signature_url: data.legal_rep_signature_url,
      contador_signature_url: data.contador_signature_url,
      revisor_fiscal_signature_url: data.revisor_fiscal_signature_url,
    };
  }

  /**
   * Leer display_decimals desde tenant CompanySetting
   */
  private async getDisplayDecimals(companyId: string): Promise<number> {
    try {
      const tenantDb = await this.tenantContext.getTenantClient(companyId);
      if (!tenantDb) return 2;
      const setting = await tenantDb.companySetting.findFirst({
        where: { category: 'general', key: 'display_decimals' },
      });
      return setting ? parseInt(setting.value, 10) : 2;
    } catch (error) {
      this.logger.warn(`Error reading display_decimals from tenant: ${error.message}, using default 2`);
      return 2;
    }
  }

  /**
   * Escribir display_decimals en tenant CompanySetting
   */
  private async setDisplayDecimals(companyId: string, value: number): Promise<void> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) throw new BadRequestException('No se pudo acceder a la base de datos del tenant');
    await tenantDb.companySetting.upsert({
      where: { category_key: { category: 'general', key: 'display_decimals' } },
      update: { value: String(value) },
      create: {
        category: 'general',
        key: 'display_decimals',
        value: String(value),
        value_type: 'number',
        description: 'Decimales a mostrar en UI (0-4). BD siempre guarda 4.',
        is_readonly: false,
      },
    });
  }

  /**
   * Sincronizar empresa con API DIAN si el plan tiene electronic_documents
   * Lee datos de master (Company + paramétricas), el token se guarda en tenant (CompanySetting)
   */
  /**
   * Sincronizar empresa con API DIAN (público, llamado desde controller interno o durante registro/actualización)
   */
  async syncDianByCompanyId(companyId: string): Promise<void> {
    return this.syncWithDian(companyId);
  }

  private async syncWithDian(companyId: string): Promise<void> {
    try {
      // Solo leer de master lo necesario: nit, company_name, email, subscription
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          nit: true,
          company_name: true,
          email: true,
          subscriptions: {
            where: { OR: [{ ends_at: null }, { ends_at: { gte: new Date() } }] },
            include: { plan: { include: { plan_modules: { include: { module: true } } } } },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      });

      if (!company) return;

      // Verificar módulo electronic_documents en el plan
      const subscription = company.subscriptions[0];
      if (!subscription) return;
      const modules = this.getEnabledModules(subscription.plan.plan_modules);
      if (!modules.includes('electronic_documents')) return;

      // Leer datos de perfil desde tenant
      const profile = await this.settingsHelper.getAllCompanyProfile(companyId);

      // Verificar datos mínimos para el API
      if (!company.nit || !profile.dv ||
          !profile.type_document_identification_id || !profile.type_organization_id ||
          !profile.type_regime_id || !profile.type_liability_id ||
          !profile.department_id || !profile.municipality_id) {
        this.logger.warn(`Empresa ${companyId}: datos incompletos para sincronizar con DIAN`);
        return;
      }

      const result = await this.dianApiService.syncCompany(
        companyId,
        {
          nit: company.nit,
          dv: profile.dv,
          company_name: company.company_name,
          address: profile.address || '',
          phone: profile.phone || '',
          email: company.email || '',
          type_document_identification_code: profile.type_document_identification_id,
          type_organization_code: profile.type_organization_id,
          type_regime_code: profile.type_regime_id,
          type_liability_code: profile.type_liability_id,
          department_code: profile.department_id,
          municipality_code: profile.municipality_id,
        },
        this.tenantContext,
      );

      if (result.success) {
        this.logger.log(`Empresa ${company.nit} sincronizada con DIAN`);
      } else {
        this.logger.warn(`Error sincronizando ${company.nit} con DIAN: ${result.message}`);
      }
    } catch (error: any) {
      // No bloquear el flujo principal si falla la sincronización
      this.logger.error(`Error en syncWithDian para ${companyId}: ${error.message}`);
    }
  }

  /**
   * Generar un identificador único para el tenant
   */
  private generateTenantId(companyName: string): string {
    const sanitized = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);
    const timestamp = Date.now().toString(36);
    return `${sanitized}_${timestamp}`;
  }
}
