import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

@Injectable()
export class PayrollWithholdingUvtService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getClient(companyId: string): Promise<any> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  /**
   * Listar todos los tramos UVT, opcionalmente filtrados por año y procedimiento
   */
  async findAll(companyId: string, year?: number, procedure?: number): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const where: any = {};
    if (year) where.year = year;
    if (procedure) where.procedure = procedure;

    const brackets = await tenantDb.payrollWithholdingUvt.findMany({
      where,
      orderBy: [{ year: 'desc' }, { procedure: 'asc' }, { from_uvt: 'asc' }],
    });

    return {
      data: brackets,
      total: brackets.length,
    };
  }

  /**
   * Listar tramos UVT por año
   */
  async findByYear(companyId: string, year: number): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const brackets = await tenantDb.payrollWithholdingUvt.findMany({
      where: { year },
      orderBy: [{ procedure: 'asc' }, { from_uvt: 'asc' }],
    });

    return {
      data: brackets,
      year,
      total: brackets.length,
    };
  }

  /**
   * Crear un tramo UVT
   */
  async create(companyId: string, dto: {
    year: number;
    procedure?: number;
    from_uvt: number;
    to_uvt?: number | null;
    fixed_fee_uvt?: number;
    marginal_rate: number;
    subtract_uvt?: number;
  }): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    return tenantDb.payrollWithholdingUvt.create({
      data: {
        year: dto.year,
        procedure: dto.procedure ?? 1,
        from_uvt: dto.from_uvt,
        to_uvt: dto.to_uvt ?? null,
        fixed_fee_uvt: dto.fixed_fee_uvt ?? 0,
        marginal_rate: dto.marginal_rate,
        subtract_uvt: dto.subtract_uvt ?? 0,
      },
    });
  }

  /**
   * Actualizar un tramo UVT por ID
   */
  async update(companyId: string, id: string, dto: {
    from_uvt?: number;
    to_uvt?: number | null;
    fixed_fee_uvt?: number;
    marginal_rate?: number;
    subtract_uvt?: number;
  }): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const existing = await tenantDb.payrollWithholdingUvt.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Tramo UVT no encontrado');
    }

    return tenantDb.payrollWithholdingUvt.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Eliminar un tramo UVT por ID
   */
  async remove(companyId: string, id: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);

    const existing = await tenantDb.payrollWithholdingUvt.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Tramo UVT no encontrado');
    }

    await tenantDb.payrollWithholdingUvt.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Replicar tramos UVT de un año origen a un año destino
   */
  async replicate(companyId: string, sourceYear: number, targetYear: number): Promise<any> {
    if (sourceYear === targetYear) {
      throw new BadRequestException('El año origen y destino no pueden ser iguales');
    }

    const tenantDb = await this.getClient(companyId);

    const sourceBrackets = await tenantDb.payrollWithholdingUvt.findMany({
      where: { year: sourceYear },
      orderBy: [{ procedure: 'asc' }, { from_uvt: 'asc' }],
    });

    if (sourceBrackets.length === 0) {
      throw new NotFoundException(`No existen tramos UVT para el año ${sourceYear}`);
    }

    const results = await Promise.all(
      sourceBrackets.map((b: any) =>
        tenantDb.payrollWithholdingUvt.upsert({
          where: {
            year_procedure_from_uvt: {
              year: targetYear,
              procedure: b.procedure,
              from_uvt: b.from_uvt,
            },
          },
          update: {
            to_uvt: b.to_uvt,
            fixed_fee_uvt: b.fixed_fee_uvt,
            marginal_rate: b.marginal_rate,
            subtract_uvt: b.subtract_uvt,
          },
          create: {
            year: targetYear,
            procedure: b.procedure,
            from_uvt: b.from_uvt,
            to_uvt: b.to_uvt,
            fixed_fee_uvt: b.fixed_fee_uvt,
            marginal_rate: b.marginal_rate,
            subtract_uvt: b.subtract_uvt,
          },
        }),
      ),
    );

    return {
      data: results,
      sourceYear,
      targetYear,
      total: results.length,
    };
  }
}
