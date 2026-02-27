import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { UpsertSettingDto, BulkUpsertSettingsDto, SettingValueType } from './dto';

@Injectable()
export class CompanySettingsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private verifyCompanyAccess(jwtCompanyId: string, urlCompanyId: string): void {
    if (jwtCompanyId !== urlCompanyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
  }

  /**
   * Parsear valor según tipo
   */
  private parseValue(value: string, valueType: string): any {
    switch (valueType) {
      case 'number':
        return parseInt(value, 10);
      case 'decimal':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case 'time':
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Listar todas las configuraciones
   */
  async findAll(companyId: string, jwtCompanyId: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const settings = await tenantDb.companySetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Agrupar por categoría y parsear valores
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      acc[setting.category][setting.key] = {
        value: this.parseValue(setting.value, setting.value_type),
        raw_value: setting.value,
        value_type: setting.value_type,
        description: setting.description,
        is_readonly: setting.is_readonly,
      };
      return acc;
    }, {} as Record<string, any>);

    return grouped;
  }

  /**
   * Listar configuraciones por categoría
   */
  async findByCategory(companyId: string, jwtCompanyId: string, category: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const settings = await tenantDb.companySetting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });

    return settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: this.parseValue(setting.value, setting.value_type),
        raw_value: setting.value,
        value_type: setting.value_type,
        description: setting.description,
        is_readonly: setting.is_readonly,
      };
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Obtener una configuración específica
   */
  async findOne(companyId: string, jwtCompanyId: string, category: string, key: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const setting = await tenantDb.companySetting.findUnique({
      where: { category_key: { category, key } },
    });

    if (!setting) {
      throw new NotFoundException(`Configuración ${category}.${key} no encontrada`);
    }

    return {
      category: setting.category,
      key: setting.key,
      value: this.parseValue(setting.value, setting.value_type),
      raw_value: setting.value,
      value_type: setting.value_type,
      description: setting.description,
      is_readonly: setting.is_readonly,
    };
  }

  /**
   * Obtener valor de una configuración (helper para servicios)
   */
  async getSetting<T>(
    companyId: string,
    category: string,
    key: string,
    defaultValue?: T,
  ): Promise<T> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      return defaultValue as T;
    }

    const setting = await tenantDb.companySetting.findUnique({
      where: { category_key: { category, key } },
    });

    if (!setting) {
      return defaultValue as T;
    }

    return this.parseValue(setting.value, setting.value_type) as T;
  }

  /**
   * Obtener categoría completa (helper para servicios)
   */
  async getCategory(companyId: string, category: string): Promise<Record<string, any>> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      return {};
    }

    const settings = await tenantDb.companySetting.findMany({
      where: { category },
    });

    return settings.reduce((acc, s) => {
      acc[s.key] = this.parseValue(s.value, s.value_type);
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Actualizar o crear una configuración
   */
  async upsert(
    companyId: string,
    jwtCompanyId: string,
    category: string,
    key: string,
    dto: UpsertSettingDto,
  ) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    // Verificar si existe y es de solo lectura
    const existing = await tenantDb.companySetting.findUnique({
      where: { category_key: { category, key } },
    });

    if (existing?.is_readonly) {
      throw new BadRequestException(`La configuración ${category}.${key} es de solo lectura`);
    }

    const setting = await tenantDb.companySetting.upsert({
      where: { category_key: { category, key } },
      update: {
        value: dto.value,
        description: dto.description || existing?.description,
      },
      create: {
        category,
        key,
        value: dto.value,
        value_type: 'string', // Por defecto string
        description: dto.description,
      },
    });

    return {
      category: setting.category,
      key: setting.key,
      value: this.parseValue(setting.value, setting.value_type),
      raw_value: setting.value,
      value_type: setting.value_type,
      description: setting.description,
      is_readonly: setting.is_readonly,
    };
  }

  /**
   * Actualizar múltiples configuraciones
   */
  async bulkUpsert(companyId: string, jwtCompanyId: string, dto: BulkUpsertSettingsDto) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const results: Array<{ category: string; key: string; value: any }> = [];
    const errors: Array<{ category: string; key: string; error: string }> = [];

    for (const item of dto.settings) {
      try {
        // Verificar si es de solo lectura
        const existing = await tenantDb.companySetting.findUnique({
          where: { category_key: { category: item.category, key: item.key } },
        });

        if (existing?.is_readonly) {
          errors.push({ category: item.category, key: item.key, error: 'Es de solo lectura' });
          continue;
        }

        const setting = await tenantDb.companySetting.upsert({
          where: { category_key: { category: item.category, key: item.key } },
          update: { value: item.value },
          create: {
            category: item.category,
            key: item.key,
            value: item.value,
            value_type: 'string',
          },
        });

        results.push({
          category: setting.category,
          key: setting.key,
          value: this.parseValue(setting.value, setting.value_type),
        });
      } catch (err: any) {
        errors.push({ category: item.category, key: item.key, error: err.message });
      }
    }

    return { updated: results, errors };
  }

  /**
   * Inicializar configuraciones por defecto Colombia 2025
   */
  async initialize(companyId: string, jwtCompanyId: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    // Verificar si ya hay configuraciones
    const existingCount = await tenantDb.companySetting.count();
    if (existingCount > 0) {
      return { message: 'Las configuraciones ya están inicializadas', count: existingCount };
    }

    // Configuraciones por defecto Colombia 2025
    const defaultSettings = [
      // PARAMETROS LEGALES
      { category: 'legal_params', key: 'smlv', value: '1423500', value_type: 'decimal', description: 'Salario Mínimo Legal Vigente 2025', is_readonly: false },
      { category: 'legal_params', key: 'transportation_allowance', value: '200000', value_type: 'decimal', description: 'Auxilio de Transporte 2025', is_readonly: false },
      { category: 'legal_params', key: 'uvt_value', value: '48555', value_type: 'decimal', description: 'Valor UVT 2025', is_readonly: true },
      // SEGURIDAD SOCIAL
      { category: 'social_security', key: 'fsp_threshold_smmlv', value: '4', value_type: 'number', description: 'Umbral FSP', is_readonly: false },
      { category: 'social_security', key: 'exoneration_threshold_smmlv', value: '10', value_type: 'number', description: 'Umbral exoneración', is_readonly: false },
      { category: 'social_security', key: 'exoneration_enabled', value: 'true', value_type: 'boolean', description: 'Exoneración habilitada', is_readonly: false },
      // HORAS EXTRAS
      { category: 'overtime', key: 'max_overtime_daily', value: '2', value_type: 'number', description: 'Máx horas extras/día', is_readonly: false },
      { category: 'overtime', key: 'max_overtime_weekly', value: '12', value_type: 'number', description: 'Máx horas extras/semana', is_readonly: false },
      // JORNADA LABORAL
      { category: 'work_schedule', key: 'work_hours_per_day', value: '8', value_type: 'number', description: 'Horas trabajo/día', is_readonly: false },
      { category: 'work_schedule', key: 'work_days_per_month', value: '30', value_type: 'number', description: 'Días trabajo/mes', is_readonly: false },
      { category: 'work_schedule', key: 'week_start', value: '1', value_type: 'number', description: 'Inicio semana (1=Lunes)', is_readonly: false },
      { category: 'work_schedule', key: 'week_end', value: '5', value_type: 'number', description: 'Fin semana (5=Viernes)', is_readonly: false },
      // HORARIOS
      { category: 'work_hours', key: 'day_start', value: '06:00', value_type: 'time', description: 'Jornada diurna inicio', is_readonly: false },
      { category: 'work_hours', key: 'day_end', value: '21:00', value_type: 'time', description: 'Jornada diurna fin', is_readonly: false },
      { category: 'work_hours', key: 'night_start', value: '21:00', value_type: 'time', description: 'Jornada nocturna inicio', is_readonly: false },
      { category: 'work_hours', key: 'night_end', value: '06:00', value_type: 'time', description: 'Jornada nocturna fin', is_readonly: false },
      // TRANSPORTE
      { category: 'transportation', key: 'auto_apply', value: 'true', value_type: 'boolean', description: 'Aplicar automáticamente', is_readonly: false },
      { category: 'transportation', key: 'salary_limit', value: '2847000', value_type: 'decimal', description: 'Límite salarial (2 SMMLV)', is_readonly: false },
      // NUMERACION NOMINA
      { category: 'payroll_numbering', key: 'prefix', value: 'NOM', value_type: 'string', description: 'Prefijo', is_readonly: false },
      { category: 'payroll_numbering', key: 'consecutive_start', value: '1', value_type: 'number', description: 'Consecutivo inicial', is_readonly: false },
    ];

    let count = 0;
    for (const item of defaultSettings) {
      await tenantDb.companySetting.upsert({
        where: { category_key: { category: item.category, key: item.key } },
        update: {},
        create: item,
      });
      count++;
    }

    return { message: 'Configuraciones inicializadas', count };
  }
}
