import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TenantPrismaService } from '../tenant/tenant-prisma.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInsurancePolicyDto, UpdateInsurancePolicyDto } from './dto';
import { PolicyReminderService } from './jobs/policy-reminder.service';

const POLICY_INCLUDE = {
  condominium: { select: { id: true, name: true } },
  insurance_third_party: { select: { id: true, name: true, identification_number: true } },
  insurers: {
    orderBy: { start_date: 'desc' as const },
    include: {
      third_party: { select: { id: true, name: true, identification_number: true } },
    },
  },
};

@Injectable()
export class InsurancePoliciesService {
  private readonly logger = new Logger(InsurancePoliciesService.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly masterPrisma: PrismaService,
    private readonly policyReminderService: PolicyReminderService,
  ) {}

  async findAll(
    companyId: string,
    query: {
      condominium_id?: string;
      policy_type?: string;
      status?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const where: any = {};
    if (query.condominium_id) where.condominium_id = query.condominium_id;
    if (query.policy_type) where.policy_type = query.policy_type;
    if (query.status) where.status = query.status;

    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const [data, total] = await Promise.all([
      db.phInsurancePolicy.findMany({
        where,
        skip,
        take,
        orderBy: { end_date: 'asc' },
        include: POLICY_INCLUDE,
      }),
      db.phInsurancePolicy.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async findOne(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const policy = await db.phInsurancePolicy.findUnique({
      where: { id },
      include: POLICY_INCLUDE,
    });

    if (!policy) throw new NotFoundException('Poliza no encontrada');
    return policy;
  }

  async create(companyId: string, dto: CreateInsurancePolicyDto, userId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const policy = await db.phInsurancePolicy.create({
      data: {
        condominium_id: dto.condominium_id,
        insurance_third_party_id: dto.insurance_third_party_id || null,
        policy_number: dto.policy_number,
        insurance_company: dto.insurance_company,
        policy_type: dto.policy_type,
        coverage_amount: dto.coverage_amount,
        premium: dto.premium,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        renewal_date: dto.renewal_date ? new Date(dto.renewal_date) : null,
        document_url: dto.document_url,
        notes: dto.notes,
        created_by: userId,
      },
      include: POLICY_INCLUDE,
    });

    // Si se asoció un tercero, crear registro en historial
    if (dto.insurance_third_party_id) {
      await db.phInsurancePolicyInsurer.create({
        data: {
          policy_id: policy.id,
          third_party_id: dto.insurance_third_party_id,
          role: 'insurer',
          start_date: new Date(dto.start_date),
          created_by: userId,
        },
      });
    }

    return policy;
  }

  async update(companyId: string, id: string, dto: UpdateInsurancePolicyDto, userId?: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const existing = await db.phInsurancePolicy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Poliza no encontrada');

    const data: any = { ...dto };
    if (dto.start_date) data.start_date = new Date(dto.start_date);
    if (dto.end_date) data.end_date = new Date(dto.end_date);
    if (dto.renewal_date) data.renewal_date = new Date(dto.renewal_date);
    if (dto.insurance_third_party_id === '') data.insurance_third_party_id = null;

    const newThirdPartyId = data.insurance_third_party_id ?? undefined;
    const oldThirdPartyId = existing.insurance_third_party_id;
    const insurerChanged = newThirdPartyId !== undefined && newThirdPartyId !== oldThirdPartyId;

    // Si cambió la aseguradora, actualizar historial automáticamente
    if (insurerChanged) {
      const today = new Date();

      // Cerrar TODOS los registros activos de rol 'insurer' (cubre registros huérfanos)
      await db.phInsurancePolicyInsurer.updateMany({
        where: {
          policy_id: id,
          role: 'insurer',
          end_date: null,
        },
        data: { end_date: today },
      });

      // Crear nuevo registro si se asignó una nueva aseguradora
      if (newThirdPartyId && userId) {
        const newInsurer = await db.phInsurancePolicyInsurer.create({
          data: {
            policy_id: id,
            third_party_id: newThirdPartyId,
            role: 'insurer',
            start_date: today,
            created_by: userId,
          },
          include: { third_party: { select: { name: true } } },
        });

        // Notificación inmediata de cambio de aseguradora
        this.policyReminderService
          .notifyInsurerChanged(companyId, existing.policy_number, newInsurer.third_party?.name || 'Desconocida')
          .catch((err) => this.logger.warn(`Error enviando notificación de cambio: ${err.message}`));
      }
    }

    return db.phInsurancePolicy.update({
      where: { id },
      data,
      include: POLICY_INCLUDE,
    });
  }

  async remove(companyId: string, id: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const exists = await db.phInsurancePolicy.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Poliza no encontrada');

    await db.phInsurancePolicy.delete({ where: { id } });
    return { message: 'Poliza eliminada exitosamente' };
  }

  // ─── Insurer History (N:M) ───

  async findPolicyInsurers(companyId: string, policyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);
    return db.phInsurancePolicyInsurer.findMany({
      where: { policy_id: policyId },
      orderBy: { start_date: 'desc' },
      include: {
        third_party: { select: { id: true, name: true, identification_number: true } },
      },
    });
  }

  async addPolicyInsurer(
    companyId: string,
    policyId: string,
    data: { third_party_id: string; role?: string; start_date: string; end_date?: string; notes?: string },
    userId: string,
  ) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const policy = await db.phInsurancePolicy.findUnique({ where: { id: policyId } });
    if (!policy) throw new NotFoundException('Poliza no encontrada');

    return db.phInsurancePolicyInsurer.create({
      data: {
        policy_id: policyId,
        third_party_id: data.third_party_id,
        role: data.role || 'insurer',
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : null,
        notes: data.notes,
        created_by: userId,
      },
      include: {
        third_party: { select: { id: true, name: true, identification_number: true } },
      },
    });
  }

  async removePolicyInsurer(companyId: string, insurerId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const exists = await db.phInsurancePolicyInsurer.findUnique({ where: { id: insurerId } });
    if (!exists) throw new NotFoundException('Registro no encontrado');

    await db.phInsurancePolicyInsurer.delete({ where: { id: insurerId } });
    return { message: 'Registro eliminado' };
  }

  /**
   * Auto-expire policies whose end_date has passed.
   */
  async expireOverduePolicies(companyId: string) {
    const db = await this.tenantPrisma.getClientForCompany(companyId);

    const result = await db.phInsurancePolicy.updateMany({
      where: {
        status: 'active',
        end_date: { lt: new Date() },
      },
      data: { status: 'expired' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} overdue policies for company ${companyId}`);
    }

    return result;
  }
}
