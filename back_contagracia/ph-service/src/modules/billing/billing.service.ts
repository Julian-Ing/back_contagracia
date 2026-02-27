import {
  Injectable,
  Logger,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { PrismaService } from '../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { UpdateFeeDto } from './dto/update-fee.dto';
import { GenerateFeesDto } from './dto/generate-fees.dto';
import { CreateBillingConfigDto } from './dto/create-billing-config.dto';
import { UpdateBillingConfigDto } from './dto/update-billing-config.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BillingEmailService } from './email.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly masterPrisma: PrismaService,
    private readonly emailService: BillingEmailService,
  ) {}

  // ─── Period Methods ─────────────────────────────────────────────

  /**
   * Lista periodos de facturacion con filtros y paginacion
   */
  async findAllPeriods(
    companyId: string,
    filters: {
      condominium_id?: string;
      year?: number;
      status?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {};
    if (filters.condominium_id) where.condominium_id = filters.condominium_id;
    if (filters.year) where.year = filters.year;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      db.phBillingPeriod.findMany({
        where,
        include: {
          condominium: { select: { id: true, name: true } },
          _count: { select: { fees: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
      }),
      db.phBillingPeriod.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Obtiene un periodo por ID con sus cobros y relaciones
   */
  async findOnePeriod(companyId: string, periodId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const period = await db.phBillingPeriod.findUnique({
      where: { id: periodId },
      include: {
        condominium: { select: { id: true, name: true } },
        fees: {
          include: {
            unit: { select: { id: true, unit_number: true, floor: true } },
            fee_concept: { select: { id: true, name: true, code: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Periodo de facturacion no encontrado');
    }

    return period;
  }

  /**
   * Crea un nuevo periodo de facturacion
   * Valida constraint unico (condominium_id, year, month)
   */
  async createPeriod(companyId: string, dto: CreatePeriodDto, userId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // Verificar unicidad
    const existing = await db.phBillingPeriod.findUnique({
      where: {
        condominium_id_year_month: {
          condominium_id: dto.condominium_id,
          year: dto.year,
          month: dto.month,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un periodo para el mes ${dto.month}/${dto.year} en este condominio`,
      );
    }

    return db.phBillingPeriod.create({
      data: {
        condominium_id: dto.condominium_id,
        name: dto.name,
        year: dto.year,
        month: dto.month,
        due_date: dto.due_date ? new Date(dto.due_date) : undefined,
        notes: dto.notes || undefined,
        created_by: userId,
      },
      include: {
        condominium: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Actualiza un periodo existente
   */
  async updatePeriod(companyId: string, periodId: string, dto: UpdatePeriodDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const period = await db.phBillingPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Periodo de facturacion no encontrado');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.year !== undefined) data.year = dto.year;
    if (dto.month !== undefined) data.month = dto.month;
    if (dto.due_date !== undefined) data.due_date = new Date(dto.due_date);
    if (dto.notes !== undefined) data.notes = dto.notes;

    return db.phBillingPeriod.update({
      where: { id: periodId },
      data,
      include: {
        condominium: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Elimina un periodo (solo si esta en estado 'draft')
   */
  async deletePeriod(companyId: string, periodId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const period = await db.phBillingPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Periodo de facturacion no encontrado');
    }

    if (period.status !== 'draft') {
      throw new BadRequestException(
        'Solo se pueden eliminar periodos en estado borrador (draft)',
      );
    }

    await db.phBillingPeriod.delete({ where: { id: periodId } });

    return { message: 'Periodo eliminado correctamente' };
  }

  /**
   * Cierra un periodo: establece status 'closed' y closed_at
   */
  async closePeriod(companyId: string, periodId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const period = await db.phBillingPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Periodo de facturacion no encontrado');
    }

    return db.phBillingPeriod.update({
      where: { id: periodId },
      data: {
        status: 'closed',
        closed_at: new Date(),
      },
      include: {
        condominium: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Genera cobros masivamente para un periodo
   *
   * 1. Verifica que el periodo este en estado 'draft' o 'generated'
   * 2. Obtiene todas las unidades activas del condominio
   * 3. Para cada concepto de cobro:
   *    - Calcula el monto segun calculation_type (fixed, per_m2, coefficient)
   *    - Busca residente principal activo de la unidad (opcional)
   *    - Crea PhFee con balance = amount, status 'pending'
   * 4. Actualiza el periodo a status 'generated'
   */
  async generateFees(
    companyId: string,
    periodId: string,
    dto: GenerateFeesDto,
    userId: string,
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // 1. Obtener y validar el periodo
    const period = await db.phBillingPeriod.findUnique({
      where: { id: periodId },
      include: {
        condominium: { select: { id: true, name: true } },
      },
    });

    if (!period) {
      throw new NotFoundException('Periodo de facturacion no encontrado');
    }

    if (!['draft', 'generated'].includes(period.status)) {
      throw new BadRequestException(
        'Solo se pueden generar cobros en periodos con estado borrador (draft) o generado (generated)',
      );
    }

    // 2. Obtener unidades activas del condominio
    const unitWhere: any = {
      condominium_id: period.condominium_id,
      is_active: true,
    };

    // Si se proporciona condominium_id en el DTO, filtrar por ese condominio
    if (dto.condominium_id) {
      unitWhere.condominium_id = dto.condominium_id;
    }

    const units = await db.phUnit.findMany({
      where: unitWhere,
      include: {
        residents: {
          where: {
            is_primary: true,
            is_active: true,
          },
          take: 1,
        },
      },
    });

    if (units.length === 0) {
      throw new BadRequestException(
        'No se encontraron unidades activas para generar cobros',
      );
    }

    // 3. Obtener los conceptos de cobro
    const feeConcepts = await db.phFeeConcept.findMany({
      where: {
        id: { in: dto.fee_concept_ids },
        is_active: true,
      },
    });

    if (feeConcepts.length === 0) {
      throw new BadRequestException(
        'No se encontraron conceptos de cobro activos con los IDs proporcionados',
      );
    }

    // 4. Generar los cobros
    let generatedCount = 0;
    const feesToCreate: any[] = [];

    for (const concept of feeConcepts) {
      for (const unit of units) {
        // Calcular monto segun tipo de calculo
        const amount = this.calculateFeeAmount(concept, unit);

        // Obtener residente principal (si existe)
        const primaryResident = unit.residents.length > 0
          ? unit.residents[0]
          : null;

        feesToCreate.push({
          billing_period_id: periodId,
          unit_id: unit.id,
          fee_concept_id: concept.id,
          resident_id: primaryResident?.id ?? null,
          amount,
          balance: amount,
          due_date: period.due_date,
          status: 'pending',
          fee_type: 'regular',
        });

        generatedCount++;
      }
    }

    // Crear todos los cobros en batch
    await db.phFee.createMany({
      data: feesToCreate,
    });

    // 5. Actualizar estado del periodo
    await db.phBillingPeriod.update({
      where: { id: periodId },
      data: {
        status: 'generated',
        generated_at: new Date(),
      },
    });

    this.logger.log(
      `Generados ${generatedCount} cobros para periodo ${period.name} (${period.condominium.name})`,
    );

    return {
      generated: generatedCount,
      period_id: periodId,
    };
  }

  /**
   * Calcula el monto de un cobro segun el tipo de calculo del concepto
   *
   * - 'fixed': usa el default_amount del concepto tal cual
   * - 'per_m2': default_amount * area_m2 de la unidad
   * - 'coefficient': default_amount * coeficiente de la unidad
   */
  private calculateFeeAmount(concept: any, unit: any): number {
    const defaultAmount = concept.default_amount
      ? Number(concept.default_amount)
      : 0;

    switch (concept.calculation_type) {
      case 'per_m2': {
        const areaM2 = unit.area_m2 ? Number(unit.area_m2) : 0;
        return Math.round(defaultAmount * areaM2 * 100) / 100;
      }
      case 'coefficient': {
        const coefficient = unit.coefficient ? Number(unit.coefficient) : 0;
        return Math.round(defaultAmount * coefficient * 100) / 100;
      }
      case 'fixed':
      default:
        return defaultAmount;
    }
  }

  // ─── Fee Methods ────────────────────────────────────────────────

  /**
   * Lista cobros con filtros y paginacion
   */
  async findAllFees(
    companyId: string,
    filters: {
      billing_period_id?: string;
      unit_id?: string;
      fee_concept_id?: string;
      status?: string;
      month?: number;
      year?: number;
      skip?: number;
      take?: number;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {};
    if (filters.billing_period_id) where.billing_period_id = filters.billing_period_id;
    if (filters.unit_id) where.unit_id = filters.unit_id;
    if (filters.fee_concept_id) where.fee_concept_id = filters.fee_concept_id;
    if (filters.status) where.status = filters.status;

    // Filtrar por mes/año via billing_period
    if (filters.month || filters.year) {
      where.billing_period = {};
      if (filters.month) where.billing_period.month = filters.month;
      if (filters.year) where.billing_period.year = filters.year;
    }

    const [data, total] = await Promise.all([
      db.phFee.findMany({
        where,
        include: {
          unit: { select: { id: true, unit_number: true, floor: true } },
          fee_concept: { select: { id: true, name: true, code: true } },
          billing_period: { select: { id: true, name: true, year: true, month: true } },
          resident: {
            select: {
              id: true,
              tercero_id: true,
              resident_type: true,
              is_primary: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 20,
      }),
      db.phFee.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Obtiene un cobro por ID con todas sus relaciones
   */
  async findOneFee(companyId: string, feeId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const fee = await db.phFee.findUnique({
      where: { id: feeId },
      include: {
        unit: { select: { id: true, unit_number: true, floor: true, condominium_id: true } },
        fee_concept: { select: { id: true, name: true, code: true, calculation_type: true } },
        billing_period: {
          select: { id: true, name: true, year: true, month: true, status: true },
        },
        resident: {
          select: {
            id: true,
            tercero_id: true,
            resident_type: true,
            is_primary: true,
          },
        },
        parent_fee: { select: { id: true, amount: true, status: true } },
        child_fees: { select: { id: true, amount: true, status: true } },
      },
    });

    if (!fee) {
      throw new NotFoundException('Cobro no encontrado');
    }

    return fee;
  }

  /**
   * Actualiza un cobro existente
   */
  async updateFee(companyId: string, feeId: string, dto: UpdateFeeDto) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const fee = await db.phFee.findUnique({ where: { id: feeId } });

    if (!fee) {
      throw new NotFoundException('Cobro no encontrado');
    }

    const data: any = {};
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.due_date !== undefined) data.due_date = new Date(dto.due_date);
    if (dto.paid_at !== undefined) data.paid_at = new Date(dto.paid_at);

    return db.phFee.update({
      where: { id: feeId },
      data,
      include: {
        unit: { select: { id: true, unit_number: true } },
        fee_concept: { select: { id: true, name: true } },
        billing_period: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Elimina un cobro (hard delete, solo si el periodo esta en estado 'draft')
   */
  async deleteFee(companyId: string, feeId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const fee = await db.phFee.findUnique({
      where: { id: feeId },
      include: {
        billing_period: { select: { id: true, status: true } },
      },
    });

    if (!fee) {
      throw new NotFoundException('Cobro no encontrado');
    }

    if (fee.billing_period.status !== 'draft') {
      throw new BadRequestException(
        'Solo se pueden eliminar cobros de periodos en estado borrador (draft)',
      );
    }

    await db.phFee.delete({ where: { id: feeId } });

    return { message: 'Cobro eliminado correctamente' };
  }

  // ─── Billing Config Methods ───────────────────────────────────

  private readonly billingConfigInclude = {
    condominium: { select: { id: true, name: true } },
    concept_associations: {
      include: {
        fee_concept: { select: { id: true, name: true, code: true } },
      },
    },
  };

  /**
   * Lista configuraciones de facturacion con filtros y paginacion
   */
  async findAllBillingConfigs(
    companyId: string,
    filters: {
      condominium_id?: string;
      config_type?: string;
      is_active?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {};
    if (filters.condominium_id) where.condominium_id = filters.condominium_id;
    if (filters.config_type) where.config_type = filters.config_type;
    if (filters.is_active !== undefined && filters.is_active !== '') {
      where.is_active = filters.is_active === 'true';
    }

    const [data, total] = await Promise.all([
      db.phBillingConfig.findMany({
        where,
        include: this.billingConfigInclude,
        orderBy: { created_at: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      db.phBillingConfig.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Obtiene una configuracion por ID con relaciones
   */
  async findOneBillingConfig(companyId: string, configId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const config = await db.phBillingConfig.findUnique({
      where: { id: configId },
      include: this.billingConfigInclude,
    });

    if (!config) {
      throw new NotFoundException('Configuracion de facturacion no encontrada');
    }

    return config;
  }

  /**
   * Crea una configuracion de facturacion con concept associations
   */
  async createBillingConfig(
    companyId: string,
    dto: CreateBillingConfigDto,
    userId: string,
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const conceptIds =
      !dto.applies_to_all_concepts && dto.fee_concept_ids?.length
        ? dto.fee_concept_ids
        : [];

    const config = await db.$transaction(async (tx: any) => {
      const created = await tx.phBillingConfig.create({
        data: {
          condominium_id: dto.condominium_id,
          config_type: dto.config_type,
          name: dto.name,
          description: dto.description || undefined,
          value_type: dto.value_type,
          value: dto.value,
          calculation_period: dto.calculation_period || undefined,
          grace_days: dto.grace_days ?? 0,
          is_compound: dto.is_compound ?? false,
          max_percentage: dto.max_percentage ?? undefined,
          max_amount: dto.max_amount ?? undefined,
          effective_from: new Date(dto.effective_from),
          effective_to: dto.effective_to
            ? new Date(dto.effective_to)
            : undefined,
          applies_to_all_concepts: dto.applies_to_all_concepts ?? true,
          is_active: dto.is_active ?? true,
          created_by: userId,
        },
      });

      if (conceptIds.length > 0) {
        await tx.phBillingConfigConcept.createMany({
          data: conceptIds.map((feeConceptId: string) => ({
            billing_config_id: created.id,
            fee_concept_id: feeConceptId,
          })),
        });
      }

      return created;
    });

    return db.phBillingConfig.findUnique({
      where: { id: config.id },
      include: this.billingConfigInclude,
    });
  }

  /**
   * Actualiza una configuracion y sincroniza concept associations
   */
  async updateBillingConfig(
    companyId: string,
    configId: string,
    dto: UpdateBillingConfigDto,
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phBillingConfig.findUnique({
      where: { id: configId },
    });

    if (!existing) {
      throw new NotFoundException('Configuracion de facturacion no encontrada');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.value_type !== undefined) data.value_type = dto.value_type;
    if (dto.value !== undefined) data.value = dto.value;
    if (dto.calculation_period !== undefined)
      data.calculation_period = dto.calculation_period;
    if (dto.grace_days !== undefined) data.grace_days = dto.grace_days;
    if (dto.is_compound !== undefined) data.is_compound = dto.is_compound;
    if (dto.max_percentage !== undefined)
      data.max_percentage = dto.max_percentage;
    if (dto.max_amount !== undefined) data.max_amount = dto.max_amount;
    if (dto.effective_from !== undefined)
      data.effective_from = new Date(dto.effective_from);
    if (dto.effective_to !== undefined)
      data.effective_to = dto.effective_to
        ? new Date(dto.effective_to)
        : null;
    if (dto.applies_to_all_concepts !== undefined)
      data.applies_to_all_concepts = dto.applies_to_all_concepts;
    if (dto.is_active !== undefined) data.is_active = dto.is_active;

    await db.$transaction(async (tx: any) => {
      await tx.phBillingConfig.update({
        where: { id: configId },
        data,
      });

      if (dto.fee_concept_ids !== undefined) {
        await tx.phBillingConfigConcept.deleteMany({
          where: { billing_config_id: configId },
        });

        if (dto.fee_concept_ids.length > 0) {
          await tx.phBillingConfigConcept.createMany({
            data: dto.fee_concept_ids.map((feeConceptId: string) => ({
              billing_config_id: configId,
              fee_concept_id: feeConceptId,
            })),
          });
        }
      }
    });

    return db.phBillingConfig.findUnique({
      where: { id: configId },
      include: this.billingConfigInclude,
    });
  }

  /**
   * Elimina una configuracion de facturacion
   */
  async removeBillingConfig(companyId: string, configId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phBillingConfig.findUnique({
      where: { id: configId },
    });

    if (!existing) {
      throw new NotFoundException('Configuracion de facturacion no encontrada');
    }

    await db.phBillingConfig.delete({ where: { id: configId } });

    return { message: 'Configuracion eliminada correctamente' };
  }

  /**
   * Alterna el estado activo/inactivo de una configuracion
   */
  async toggleBillingConfig(companyId: string, configId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phBillingConfig.findUnique({
      where: { id: configId },
    });

    if (!existing) {
      throw new NotFoundException('Configuracion de facturacion no encontrada');
    }

    return db.phBillingConfig.update({
      where: { id: configId },
      data: { is_active: !existing.is_active },
      include: this.billingConfigInclude,
    });
  }

  // ─── Cartera (Accounts Receivable) ──────────────────────────────

  /**
   * Resumen de cartera agrupado por unidad
   */
  async getCarteraSummary(
    companyId: string,
    filters: {
      condominium_id?: string;
      userId?: string;
      userRole?: string;
      permissions?: string[];
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {
      status: { in: ['pending', 'partial', 'overdue'] },
    };

    if (filters.condominium_id) {
      where.unit = { condominium_id: filters.condominium_id };
    }

    // Si el usuario NO es admin/owner, filtrar solo por sus unidades vinculadas
    const isAdmin = filters.userRole === 'owner' || filters.userRole === 'admin' || filters.permissions?.includes('*');
    if (!isAdmin && filters.userId) {
      const tenantUser = await db.tenantUser.findFirst({
        where: { id: filters.userId },
        select: { third_party_id: true },
      });

      if (tenantUser?.third_party_id) {
        const residents = await db.phUnitResident.findMany({
          where: { tercero_id: tenantUser.third_party_id, is_active: true },
          select: { unit_id: true },
        });
        const unitIds = residents.map((r) => r.unit_id);
        where.unit_id = { in: unitIds };
      } else {
        // Usuario sin tercero vinculado → no tiene unidades → retornar vacío
        return {
          summary: { total_pending: 0, total_overdue: 0, total_balance: 0, units_with_debt: 0, total_fees: 0 },
          units: [],
        };
      }
    }

    const fees = await db.phFee.findMany({
      where,
      select: {
        id: true,
        unit_id: true,
        amount: true,
        balance: true,
        status: true,
        due_date: true,
        fee_type: true,
        unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            condominium: { select: { id: true, name: true } },
          },
        },
        fee_concept: { select: { name: true } },
        billing_period: { select: { name: true, year: true, month: true } },
      },
      orderBy: { due_date: 'asc' },
    });

    // Agrupar por unidad
    const byUnit = new Map<string, {
      unit_id: string;
      unit_number: string;
      floor: number | null;
      condominium_name: string;
      total_pending: number;
      total_overdue: number;
      total_balance: number;
      fee_count: number;
      oldest_due_date: string | null;
    }>();

    let totalPending = 0;
    let totalOverdue = 0;
    let totalBalance = 0;

    const now = new Date();

    for (const fee of fees) {
      const unitId = fee.unit_id;
      const amount = Number(fee.amount);
      const balance = Number(fee.balance);
      const isOverdue = fee.status === 'overdue' ||
        (fee.due_date && new Date(fee.due_date) < now && fee.status !== 'paid');

      if (!byUnit.has(unitId)) {
        byUnit.set(unitId, {
          unit_id: unitId,
          unit_number: fee.unit?.unit_number || 'N/A',
          floor: fee.unit?.floor ?? null,
          condominium_name: fee.unit?.condominium?.name || '',
          total_pending: 0,
          total_overdue: 0,
          total_balance: 0,
          fee_count: 0,
          oldest_due_date: null,
        });
      }

      const entry = byUnit.get(unitId)!;
      entry.fee_count++;
      entry.total_balance += balance;

      if (isOverdue) {
        entry.total_overdue += balance;
        totalOverdue += balance;
      } else {
        entry.total_pending += balance;
        totalPending += balance;
      }

      totalBalance += balance;

      if (fee.due_date) {
        const dueDateStr = new Date(fee.due_date).toISOString();
        if (!entry.oldest_due_date || dueDateStr < entry.oldest_due_date) {
          entry.oldest_due_date = dueDateStr;
        }
      }
    }

    const units = Array.from(byUnit.values()).sort(
      (a, b) => b.total_balance - a.total_balance,
    );

    return {
      summary: {
        total_pending: totalPending,
        total_overdue: totalOverdue,
        total_balance: totalBalance,
        units_with_debt: units.length,
        total_fees: fees.length,
      },
      units,
    };
  }

  // ─── Delinquent Units ──────────────────────────────────────────

  /**
   * Retorna IDs de unidades con al menos un fee en estado 'overdue'
   */
  async getDelinquentUnits(companyId: string): Promise<{ unit_ids: string[] }> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const fees = await db.phFee.findMany({
      where: { status: 'overdue' },
      select: { unit_id: true },
      distinct: ['unit_id'],
    });

    return { unit_ids: fees.map((f) => f.unit_id) };
  }

  // ─── Payments (Abonos) ──────────────────────────────────────────

  /**
   * Registra un abono/pago parcial a un fee
   */
  async createPayment(
    companyId: string,
    feeId: string,
    dto: CreatePaymentDto,
    userId?: string,
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const fee = await db.phFee.findUnique({ where: { id: feeId } });
    if (!fee) throw new NotFoundException('Cuota no encontrada');

    const balance = Number(fee.balance);
    if (dto.amount > balance) {
      throw new BadRequestException(
        `El monto ($${dto.amount}) supera el saldo pendiente ($${balance})`,
      );
    }

    const newBalance = balance - dto.amount;

    const [payment] = await db.$transaction([
      db.phPayment.create({
        data: {
          fee_id: feeId,
          amount: dto.amount,
          payment_method: dto.payment_method,
          reference: dto.reference,
          notes: dto.notes,
          receipt_url: dto.receipt_url,
          created_by: userId,
        },
      }),
      db.phFee.update({
        where: { id: feeId },
        data: {
          balance: newBalance,
          status: newBalance === 0 ? 'paid' : 'partial',
          paid_at: newBalance === 0 ? new Date() : undefined,
        },
      }),
    ]);

    this.logger.log(`Payment ${payment.id} recorded for fee ${feeId} — amount: ${dto.amount}, new balance: ${newBalance}`);

    return payment;
  }

  /**
   * Lista los pagos/abonos de un fee
   */
  async findFeePayments(companyId: string, feeId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const fee = await db.phFee.findUnique({ where: { id: feeId } });
    if (!fee) throw new NotFoundException('Cuota no encontrada');

    return db.phPayment.findMany({
      where: { fee_id: feeId },
      orderBy: { created_at: 'desc' },
    });
  }

  // ─── PDF Generation ─────────────────────────────────────────────

  private readonly MONTH_NAMES: Record<number, string> = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
  };

  private readonly STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    partial: 'Parcial',
    paid: 'Pagada',
    overdue: 'Vencida',
    cancelled: 'Cancelada',
  };

  private async fetchImageBuffer(url: string): Promise<Buffer | null> {
    try {
      let fullUrl = url;
      if (url.startsWith('/api/media/')) {
        const base = process.env.MEDIA_SERVICE_URL || 'http://localhost:3018';
        fullUrl = `${base}${url}`;
      } else if (!url.startsWith('http')) {
        const base = process.env.COMPANY_SERVICE_URL || 'http://localhost:3003';
        fullUrl = `${base}${url}`;
      }
      const res = await fetch(fullUrl);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  private formatCOP(value: number | string): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(Number(value));
  }

  private formatDatePdf(date?: string | Date | null): string {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /**
   * Genera PDF de una cuota individual
   */
  async generateFeePdf(companyId: string, feeId: string): Promise<Buffer> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const fee = await db.phFee.findUnique({
      where: { id: feeId },
      include: {
        unit: {
          select: {
            unit_number: true,
            floor: true,
            condominium: { select: { name: true, nit: true, address: true, logo_url: true } },
          },
        },
        fee_concept: { select: { name: true, code: true } },
        billing_period: { select: { name: true, year: true, month: true } },
        payments: { orderBy: { created_at: 'asc' } },
      },
    });
    if (!fee) throw new NotFoundException('Cuota no encontrada');

    const company = await this.masterPrisma.company.findUnique({
      where: { id: companyId },
      select: { company_name: true, nit: true, email: true, logo_url: true },
    });

    const condo = fee.unit?.condominium;
    const logoUrl = condo?.logo_url || company?.logo_url;
    const logoBuffer = logoUrl ? await this.fetchImageBuffer(logoUrl) : null;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─── Logo ───
      if (logoBuffer) {
        doc.image(logoBuffer, (612 - 80) / 2, doc.y, { width: 80 });
        doc.moveDown(5);
      }

      // ─── Header ───
      doc.fontSize(16).font('Helvetica-Bold')
        .text(condo?.name ?? company?.company_name ?? 'Copropiedad', { align: 'center' });
      if (condo?.nit) doc.fontSize(9).font('Helvetica').text(`NIT: ${condo.nit}`, { align: 'center' });
      if (condo?.address) doc.fontSize(9).text(condo.address, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold').text('Factura de Cuota', { align: 'center' });
      doc.moveDown(0.3);

      // ─── Separator ───
      doc.strokeColor('#cccccc').lineWidth(0.5)
        .moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.5);

      // ─── Fee info ───
      const leftCol = 50;
      const rightCol = 300;
      const infoFontSize = 10;

      const drawRow = (label: string, value: string, x: number) => {
        const y = doc.y;
        doc.fontSize(infoFontSize).font('Helvetica-Bold').text(label, x, y, { continued: true });
        doc.font('Helvetica').text(` ${value}`);
      };

      drawRow('Periodo:', fee.billing_period?.name ?? '—', leftCol);
      doc.moveUp();
      drawRow('Unidad:', fee.unit?.unit_number ?? '—', rightCol);

      drawRow('Concepto:', fee.fee_concept?.name ?? '—', leftCol);
      doc.moveUp();
      drawRow('Piso:', fee.unit?.floor != null ? String(fee.unit.floor) : '—', rightCol);

      drawRow('Vencimiento:', this.formatDatePdf(fee.due_date), leftCol);
      doc.moveUp();
      drawRow('Estado:', this.STATUS_LABELS[fee.status] ?? fee.status, rightCol);

      doc.moveDown(0.8);

      // ─── Amounts ───
      doc.strokeColor('#cccccc').lineWidth(0.5)
        .moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica-Bold').text('Resumen', leftCol);
      doc.moveDown(0.3);

      const tableTop = doc.y;
      const col1 = 60;
      const col2 = 400;

      doc.fontSize(10).font('Helvetica');
      doc.text('Monto original:', col1, tableTop);
      doc.text(this.formatCOP(Number(fee.amount)), col2, tableTop, { align: 'right', width: 150 });

      doc.text('Total abonado:', col1);
      const totalPaid = Number(fee.amount) - Number(fee.balance);
      doc.text(this.formatCOP(totalPaid), col2, doc.y - 12, { align: 'right', width: 150 });

      doc.font('Helvetica-Bold');
      doc.text('Saldo pendiente:', col1);
      doc.text(this.formatCOP(Number(fee.balance)), col2, doc.y - 12, { align: 'right', width: 150 });

      doc.moveDown(0.8);

      // ─── Payments table ───
      if (fee.payments && fee.payments.length > 0) {
        doc.strokeColor('#cccccc').lineWidth(0.5)
          .moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(11).font('Helvetica-Bold').text('Historial de Pagos', leftCol);
        doc.moveDown(0.3);

        // Table header
        const th = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Fecha', 60, th);
        doc.text('Monto', 200, th);
        doc.text('Método', 310, th);
        doc.text('Referencia', 430, th);
        doc.moveDown(0.2);

        doc.strokeColor('#eeeeee').lineWidth(0.3)
          .moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(0.2);

        doc.font('Helvetica').fontSize(9);
        for (const p of fee.payments) {
          const py = doc.y;
          doc.text(this.formatDatePdf(p.payment_date), 60, py);
          doc.text(this.formatCOP(Number(p.amount)), 200, py);
          doc.text(p.payment_method ?? '—', 310, py);
          doc.text(p.reference ?? '—', 430, py);
          doc.moveDown(0.1);
        }
      }

      // ─── Footer ───
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#999999')
        .text(`Generado el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, { align: 'center' });

      doc.end();
    });
  }

  /**
   * Genera estado de cuenta PDF de una unidad
   */
  async generateUnitStatementPdf(companyId: string, unitId: string): Promise<Buffer> {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const unit = await db.phUnit.findUnique({
      where: { id: unitId },
      include: {
        condominium: { select: { name: true, nit: true, address: true, logo_url: true } },
      },
    });
    if (!unit) throw new NotFoundException('Unidad no encontrada');

    const fees = await db.phFee.findMany({
      where: { unit_id: unitId },
      include: {
        fee_concept: { select: { name: true } },
        billing_period: { select: { name: true, year: true, month: true } },
        payments: { orderBy: { created_at: 'asc' } },
      },
      orderBy: [{ created_at: 'desc' }],
    });

    const company = await this.masterPrisma.company.findUnique({
      where: { id: companyId },
      select: { company_name: true, nit: true, email: true, logo_url: true },
    });

    const condo = unit.condominium;
    const logoUrl2 = condo?.logo_url || company?.logo_url;
    const logoBuffer = logoUrl2 ? await this.fetchImageBuffer(logoUrl2) : null;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─── Logo ───
      if (logoBuffer) {
        doc.image(logoBuffer, (612 - 80) / 2, doc.y, { width: 80 });
        doc.moveDown(5);
      }

      // ─── Header ───
      doc.fontSize(16).font('Helvetica-Bold')
        .text(condo?.name ?? company?.company_name ?? 'Copropiedad', { align: 'center' });
      if (condo?.nit) doc.fontSize(9).font('Helvetica').text(`NIT: ${condo.nit}`, { align: 'center' });
      if (condo?.address) doc.fontSize(9).text(condo.address, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(13).font('Helvetica-Bold').text('Estado de Cuenta', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica')
        .text(`Unidad: ${unit.unit_number}${unit.floor != null ? `  |  Piso: ${unit.floor}` : ''}`, { align: 'center' });
      doc.moveDown(0.5);

      doc.strokeColor('#cccccc').lineWidth(0.5)
        .moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.5);

      // ─── Summary ───
      const totalAmount = fees.reduce((s, f) => s + Number(f.amount), 0);
      const totalBalance = fees.reduce((s, f) => s + Number(f.balance), 0);
      const totalPaid = totalAmount - totalBalance;

      doc.fontSize(10).font('Helvetica');
      doc.text(`Total cuotas: ${fees.length}     |     Facturado: ${this.formatCOP(totalAmount)}     |     Pagado: ${this.formatCOP(totalPaid)}     |     `);
      doc.font('Helvetica-Bold').text(`Saldo: ${this.formatCOP(totalBalance)}`, { continued: false });
      doc.moveDown(0.5);

      // ─── Fees table ───
      doc.strokeColor('#cccccc').lineWidth(0.5)
        .moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.3);

      // Table header
      const headers = ['Periodo', 'Concepto', 'Monto', 'Saldo', 'Estado', 'Vencimiento'];
      const colX = [55, 160, 280, 360, 440, 500];

      doc.fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { continued: i < headers.length - 1, width: 80 }));
      doc.moveDown(0.2);
      doc.strokeColor('#eeeeee').lineWidth(0.3)
        .moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.2);

      doc.font('Helvetica').fontSize(8);
      for (const fee of fees) {
        if (doc.y > 700) {
          doc.addPage();
          doc.y = 50;
        }
        const fy = doc.y;
        doc.text(fee.billing_period?.name ?? '—', colX[0], fy, { width: 100 });
        doc.text(fee.fee_concept?.name ?? '—', colX[1], fy, { width: 115 });
        doc.text(this.formatCOP(Number(fee.amount)), colX[2], fy, { width: 75 });
        doc.text(this.formatCOP(Number(fee.balance)), colX[3], fy, { width: 75 });
        doc.text(this.STATUS_LABELS[fee.status] ?? fee.status, colX[4], fy, { width: 55 });
        doc.text(this.formatDatePdf(fee.due_date), colX[5], fy, { width: 60 });
        doc.moveDown(0.1);
      }

      // ─── Footer ───
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#999999')
        .text(`Generado el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, { align: 'center' });

      doc.end();
    });
  }

  // ─── Send Invoices by Email ─────────────────────────────────────

  async sendPeriodInvoices(companyId: string, periodId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    // 1. Verificar SMTP configurado
    const smtpReady = await this.emailService.isSmtpConfigured(companyId);
    if (!smtpReady) {
      throw new BadRequestException(
        'No hay configuración SMTP. Configura el email en Perfil de Empresa → Integraciones.',
      );
    }

    // 2. Verificar periodo
    const period = await db.phBillingPeriod.findUnique({
      where: { id: periodId },
      include: {
        condominium: { select: { id: true, name: true } },
      },
    });
    if (!period) throw new NotFoundException('Periodo no encontrado');
    if (period.status === 'draft') {
      throw new BadRequestException(
        'No se pueden enviar facturas de un periodo en borrador. Genera las cuotas primero.',
      );
    }

    // 3. Buscar fees del periodo (no canceladas)
    const fees = await db.phFee.findMany({
      where: {
        billing_period_id: periodId,
        status: { not: 'cancelled' },
      },
      include: {
        unit: {
          select: {
            id: true,
            unit_number: true,
            floor: true,
            residents: {
              where: { is_primary: true, is_active: true },
              take: 1,
              select: { id: true, tercero_id: true },
            },
          },
        },
        fee_concept: { select: { id: true, name: true } },
        resident: { select: { id: true, tercero_id: true } },
      },
    });

    if (fees.length === 0) {
      throw new BadRequestException('No hay cuotas en este periodo.');
    }

    // 4. Agrupar fees por unidad
    const feesByUnit = new Map<
      string,
      { unit: (typeof fees)[0]['unit']; fees: typeof fees }
    >();
    for (const fee of fees) {
      const key = fee.unit_id;
      if (!feesByUnit.has(key)) {
        feesByUnit.set(key, { unit: fee.unit, fees: [] });
      }
      feesByUnit.get(key)!.fees.push(fee);
    }

    // 5. Obtener emails de residentes (tercero_id → ThirdParty.email)
    const terceroIds = new Set<string>();
    for (const fee of fees) {
      const terceroId =
        fee.resident?.tercero_id ?? fee.unit?.residents?.[0]?.tercero_id;
      if (terceroId) terceroIds.add(terceroId);
    }

    const thirdParties = terceroIds.size > 0
      ? await db.thirdParty.findMany({
          where: { id: { in: [...terceroIds] } },
          select: { id: true, email: true, name: true, first_name: true, first_surname: true },
        })
      : [];
    const terceroMap = new Map(thirdParties.map((t) => [t.id, t]));

    // 6. Enviar emails por unidad
    let sent = 0;
    let failed = 0;
    let skippedNoEmail = 0;
    const errors: Array<{ unit: string; error: string }> = [];

    for (const [, group] of feesByUnit) {
      const unit = group.unit;
      const unitFees = group.fees;

      // Obtener tercero_id del residente primario
      const terceroId =
        unitFees[0]?.resident?.tercero_id ??
        unit?.residents?.[0]?.tercero_id;

      if (!terceroId) {
        skippedNoEmail++;
        continue;
      }

      const tercero = terceroMap.get(terceroId);
      if (!tercero?.email) {
        skippedNoEmail++;
        continue;
      }

      try {
        // Generar PDFs para cada fee de esta unidad
        const attachments: Array<{ filename: string; content: Buffer }> = [];
        for (const fee of unitFees) {
          const pdf = await this.generateFeePdf(companyId, fee.id);
          attachments.push({
            filename: `cuota-${fee.fee_concept?.name ?? 'factura'}-${unit?.unit_number ?? ''}.pdf`,
            content: pdf,
          });
        }

        // Construir HTML del email
        const residentName =
          tercero.name ||
          [tercero.first_name, tercero.first_surname].filter(Boolean).join(' ') ||
          'Residente';
        const html = this.buildInvoiceEmailHtml({
          residentName,
          unitNumber: unit?.unit_number ?? '',
          condoName: period.condominium?.name ?? '',
          periodName: period.name,
          fees: unitFees.map((f) => ({
            concept: f.fee_concept?.name ?? '',
            amount: Number(f.amount),
            balance: Number(f.balance),
          })),
          dueDate: period.due_date,
        });

        const result = await this.emailService.sendEmail(companyId, {
          to: tercero.email,
          subject: `Factura de Administración — ${period.condominium?.name ?? ''} — ${period.name}`,
          html,
          attachments,
        });

        if (result.success) {
          sent++;
          // Marcar fees como enviadas
          await db.phFee.updateMany({
            where: { id: { in: unitFees.map((f) => f.id) } },
            data: { email_sent_at: new Date() },
          });
        } else {
          failed++;
          errors.push({
            unit: unit?.unit_number ?? '?',
            error: result.error ?? 'Error desconocido',
          });
        }
      } catch (err: any) {
        failed++;
        errors.push({
          unit: unit?.unit_number ?? '?',
          error: err.message ?? 'Error inesperado',
        });
      }
    }

    this.logger.log(
      `[${companyId}] Envío masivo periodo ${period.name}: sent=${sent} failed=${failed} skipped=${skippedNoEmail}`,
    );

    return {
      total_units: feesByUnit.size,
      sent,
      failed,
      skipped_no_email: skippedNoEmail,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private buildInvoiceEmailHtml(data: {
    residentName: string;
    unitNumber: string;
    condoName: string;
    periodName: string;
    fees: Array<{ concept: string; amount: number; balance: number }>;
    dueDate: Date | null;
  }): string {
    const total = data.fees.reduce((sum, f) => sum + f.amount, 0);
    const totalBalance = data.fees.reduce((sum, f) => sum + f.balance, 0);
    const dueDateStr = data.dueDate
      ? new Date(data.dueDate).toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : 'No definida';

    const feeRows = data.fees
      .map(
        (f) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${f.concept}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${this.formatCOP(f.amount)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${this.formatCOP(f.balance)}</td>
          </tr>`,
      )
      .join('');

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
        <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h2 style="margin:0;">Factura de Administración</h2>
          <p style="margin:4px 0 0;opacity:0.9;">${data.condoName}</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
          <p>Estimado(a) <strong>${data.residentName}</strong>,</p>
          <p>Le informamos los cobros correspondientes al periodo <strong>${data.periodName}</strong>
             para la unidad <strong>${data.unitNumber}</strong>:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Concepto</th>
                <th style="padding:8px;text-align:right;border-bottom:2px solid #e5e7eb;">Monto</th>
                <th style="padding:8px;text-align:right;border-bottom:2px solid #e5e7eb;">Saldo</th>
              </tr>
            </thead>
            <tbody>${feeRows}</tbody>
            <tfoot>
              <tr style="font-weight:bold;">
                <td style="padding:8px;border-top:2px solid #e5e7eb;">Total</td>
                <td style="padding:8px;border-top:2px solid #e5e7eb;text-align:right;">${this.formatCOP(total)}</td>
                <td style="padding:8px;border-top:2px solid #e5e7eb;text-align:right;">${this.formatCOP(totalBalance)}</td>
              </tr>
            </tfoot>
          </table>
          <p><strong>Fecha de vencimiento:</strong> ${dueDateStr}</p>
          <p style="margin-top:24px;color:#6b7280;font-size:13px;">
            Adjunto encontrará el detalle en PDF de cada concepto facturado.
          </p>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px;">
          Este correo fue generado automáticamente por Contagracia.
        </p>
      </div>
    `;
  }
}
