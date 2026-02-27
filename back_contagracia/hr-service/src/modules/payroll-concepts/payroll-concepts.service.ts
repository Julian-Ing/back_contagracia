import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { UpdateConceptDto } from './dto';

@Injectable()
export class PayrollConceptsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  /**
   * Listar todos los conceptos agrupados por tipo
   */
  async findAll(companyId: string): Promise<any> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const concepts = await tenantDb.payrollConcept.findMany({
      orderBy: [{ concept_type: 'asc' }, { name: 'asc' }],
    });

    const grouped = {
      ACCRUED: [] as any[],
      DEDUCTION: [] as any[],
      PROVISION: [] as any[],
      PARAFISCAL: [] as any[],
    };

    for (const c of concepts) {
      const type = c.concept_type as keyof typeof grouped;
      if (grouped[type]) {
        grouped[type].push(c);
      }
    }

    return {
      data: concepts,
      grouped,
      total: concepts.length,
    };
  }

  /**
   * Obtener un concepto por key
   */
  async findOne(companyId: string, key: string): Promise<any> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const concept = await tenantDb.payrollConcept.findUnique({
      where: { key },
    });

    if (!concept) {
      throw new NotFoundException(`Concepto '${key}' no encontrado`);
    }

    return concept;
  }

  /**
   * Actualizar un concepto (cuentas contables, valores por defecto)
   */
  async update(companyId: string, key: string, dto: UpdateConceptDto): Promise<any> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const existing = await tenantDb.payrollConcept.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new NotFoundException(`Concepto '${key}' no encontrado`);
    }

    const updateData: any = {};

    if (dto.debit_account_code !== undefined) {
      updateData.debit_account_code = dto.debit_account_code || null;
    }
    if (dto.administrative_debit_account_code !== undefined) {
      updateData.administrative_debit_account_code = dto.administrative_debit_account_code || null;
    }
    if (dto.credit_account_code !== undefined) {
      updateData.credit_account_code = dto.credit_account_code || null;
    }
    if (dto.default_value !== undefined) {
      updateData.default_value = dto.default_value;
    }
    if (dto.default_percentage !== undefined) {
      updateData.default_percentage = dto.default_percentage;
    }

    return tenantDb.payrollConcept.update({
      where: { key },
      data: updateData,
    });
  }
}
