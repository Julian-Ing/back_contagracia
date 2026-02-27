import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { PortalPayslipsQueryDto } from './dto/portal-payslips-query.dto';
import { PortalLeavesQueryDto } from './dto/portal-leaves-query.dto';

@Injectable()
export class HrPortalService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getClient(companyId: string): Promise<any> {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) throw new NotFoundException('Empresa no encontrada o inactiva');
    return tenantDb;
  }

  /**
   * Resuelve el third_party_id del TenantUser logueado.
   * Lanza ForbiddenException si el usuario no tiene perfil de empleado vinculado.
   */
  private async resolveThirdPartyId(tenantDb: any, userId: string): Promise<string> {
    const user = await tenantDb.tenantUser.findUnique({
      where: { id: userId },
      select: { third_party_id: true },
    });
    if (!user?.third_party_id) {
      throw new ForbiddenException('Tu usuario no tiene un perfil de empleado asociado');
    }
    return user.third_party_id;
  }

  // ==================== PERFIL ====================

  async getMyProfile(companyId: string, userId: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);
    const thirdPartyId = await this.resolveThirdPartyId(tenantDb, userId);

    const third = await tenantDb.thirdParty.findUnique({
      where: { id: thirdPartyId },
      include: {
        employee_profile: {
          include: {
            current_salary: {
              select: {
                base_salary: true,
                salary_type: true,
                effective_date: true,
              },
            },
            current_contract: {
              select: {
                contract_type: true,
                start_date: true,
                end_date: true,
                worker_type_code: true,
              },
            },
          },
        },
      },
    });

    if (!third) throw new NotFoundException('Perfil de empleado no encontrado');

    return {
      id: third.id,
      full_name: `${third.first_name ?? ''} ${third.last_name ?? ''}`.trim(),
      document_type: third.document_type,
      document: third.document,
      email: third.email,
      phone: third.phone,
      position: third.employee_profile?.position ?? null,
      start_date: third.employee_profile?.start_date ?? null,
      is_active: third.employee_profile?.is_active ?? null,
      salary: third.employee_profile?.current_salary?.base_salary ?? null,
      salary_type: third.employee_profile?.current_salary?.salary_type ?? null,
      contract_type: third.employee_profile?.current_contract?.contract_type ?? null,
      worker_type_code: third.employee_profile?.current_contract?.worker_type_code ?? null,
    };
  }

  // ==================== CONTRATO ====================

  async getMyContract(companyId: string, userId: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);
    const thirdPartyId = await this.resolveThirdPartyId(tenantDb, userId);

    const profile = await tenantDb.employeeProfile.findUnique({
      where: { third_party_id: thirdPartyId },
      include: {
        current_contract: true,
      },
    });

    if (!profile?.current_contract) {
      return { message: 'No tienes un contrato activo registrado', contract: null };
    }

    return { contract: profile.current_contract };
  }

  // ==================== AUSENCIAS ====================

  async getMyLeaves(companyId: string, userId: string, query: PortalLeavesQueryDto): Promise<any> {
    const tenantDb = await this.getClient(companyId);
    const thirdPartyId = await this.resolveThirdPartyId(tenantDb, userId);

    const where: any = { third_party_id: thirdPartyId };
    if (query.status) where.status = query.status;
    if (query.year) {
      where.start_date = {
        gte: new Date(query.year, 0, 1),
        lt: new Date(query.year + 1, 0, 1),
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await Promise.all([
      tenantDb.leaveRequest.findMany({
        where,
        orderBy: { start_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      tenantDb.leaveRequest.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ==================== DESPRENDIBLES ====================

  async getMyPayslips(companyId: string, userId: string, query: PortalPayslipsQueryDto): Promise<any> {
    const tenantDb = await this.getClient(companyId);
    const thirdPartyId = await this.resolveThirdPartyId(tenantDb, userId);

    const where: any = {
      third_party_id: thirdPartyId,
      settlement: {
        status: { in: ['APPROVED', 'PAID'] },
      },
    };
    if (query.year) where.settlement = { ...where.settlement, year: query.year };
    if (query.month) where.settlement = { ...where.settlement, month: query.month };

    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const [data, total] = await Promise.all([
      tenantDb.payrollSettlementDetail.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          settlement: {
            select: {
              id: true,
              settlement_name: true,
              settlement_number: true,
              settlement_type: true,
              start_date: true,
              end_date: true,
              payment_date: true,
              status: true,
              year: true,
              month: true,
            },
          },
        },
      }),
      tenantDb.payrollSettlementDetail.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getMyPayslipDetail(companyId: string, userId: string, detailId: string): Promise<any> {
    const tenantDb = await this.getClient(companyId);
    const thirdPartyId = await this.resolveThirdPartyId(tenantDb, userId);

    const detail = await tenantDb.payrollSettlementDetail.findUnique({
      where: { id: detailId },
      include: {
        settlement: {
          select: {
            id: true,
            settlement_name: true,
            settlement_number: true,
            settlement_type: true,
            start_date: true,
            end_date: true,
            payment_date: true,
            status: true,
            year: true,
            month: true,
          },
        },
      },
    });

    if (!detail) throw new NotFoundException('Desprendible no encontrado');

    // Verificar que el desprendible pertenece al empleado que hace la consulta
    if (detail.third_party_id !== thirdPartyId) {
      throw new ForbiddenException('No tienes acceso a este desprendible');
    }

    return detail;
  }
}
