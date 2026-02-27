import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

export type SocialSecurityType = 'EPS' | 'PENSION_FUND' | 'ARL' | 'COMPENSATION_FUND' | 'SEVERANCE_FUND';

@Injectable()
export class SocialSecurityEntitiesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private verifyCompanyAccess(jwtCompanyId: string, urlCompanyId: string): void {
    if (jwtCompanyId !== urlCompanyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
  }

  /**
   * Listar entidades de seguridad social por tipo
   */
  async findByType(companyId: string, jwtCompanyId: string, type: SocialSecurityType) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const entities = await tenantDb.thirdParty.findMany({
      where: {
        roles: { has: type },
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        identification_number: true,
        codigo_pila: true,
        is_active: true,
      },
      orderBy: { name: 'asc' },
    });

    return entities;
  }

  /**
   * Listar todas las EPS
   */
  async findAllEps(companyId: string, jwtCompanyId: string) {
    return this.findByType(companyId, jwtCompanyId, 'EPS');
  }

  /**
   * Listar todos los Fondos de Pensiones
   */
  async findAllPensionFunds(companyId: string, jwtCompanyId: string) {
    return this.findByType(companyId, jwtCompanyId, 'PENSION_FUND');
  }

  /**
   * Listar todas las ARL
   */
  async findAllArl(companyId: string, jwtCompanyId: string) {
    return this.findByType(companyId, jwtCompanyId, 'ARL');
  }

  /**
   * Listar todas las Cajas de Compensación
   */
  async findAllCompensationFunds(companyId: string, jwtCompanyId: string) {
    return this.findByType(companyId, jwtCompanyId, 'COMPENSATION_FUND');
  }

  /**
   * Listar todos los Fondos de Cesantías
   */
  async findAllSeveranceFunds(companyId: string, jwtCompanyId: string) {
    return this.findByType(companyId, jwtCompanyId, 'SEVERANCE_FUND');
  }

  /**
   * Listar todas las entidades de seguridad social agrupadas
   */
  async findAll(companyId: string, jwtCompanyId: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const types: SocialSecurityType[] = ['EPS', 'PENSION_FUND', 'ARL', 'COMPENSATION_FUND', 'SEVERANCE_FUND'];

    const results = await Promise.all(
      types.map(async (type) => {
        const entities = await tenantDb.thirdParty.findMany({
          where: {
            roles: { has: type },
            is_active: true,
          },
          select: {
            id: true,
            name: true,
            identification_number: true,
            codigo_pila: true,
          },
          orderBy: { name: 'asc' },
        });
        return { type, entities };
      }),
    );

    return results.reduce((acc, { type, entities }) => {
      acc[type.toLowerCase()] = entities;
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Listar niveles de riesgo ARL
   */
  async findAllArlRisks(companyId: string, jwtCompanyId: string): Promise<any[]> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const risks = await tenantDb.arlRisk.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        rate: true,
      },
    });

    return risks;
  }

  /**
   * Listar tipos de contrato
   */
  async findAllContractTypes(companyId: string, jwtCompanyId: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const contractTypes = await tenantDb.typeContract.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    return contractTypes;
  }

  /**
   * Listar tipos de trabajador
   */
  async findAllWorkerTypes(companyId: string, jwtCompanyId: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const workerTypes = await tenantDb.typeWorker.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    return workerTypes;
  }

  /**
   * Listar subtipos de trabajador
   */
  async findAllWorkerSubtypes(companyId: string, jwtCompanyId: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const workerSubtypes = await tenantDb.subTypeWorker.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    return workerSubtypes;
  }

  /**
   * Listar centros de costo
   */
  async findAllCostCenters(companyId: string, jwtCompanyId: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);

    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }

    const costCenters = await tenantDb.costCenter.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        consecutive: true,
        name: true,
        description: true,
      },
    });

    return costCenters;
  }
}
