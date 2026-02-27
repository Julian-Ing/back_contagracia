import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import * as bcrypt from 'bcryptjs';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  TerminateEmployeeDto,
  QueryEmployeesDto,
  EmployeeStatus,
  CreateContractDto,
  RenewContractDto,
  UpdateSalaryDto,
  LinkUserDto,
} from './dto';

// Includes reutilizables para queries — ahora directamente en ThirdParty
const EMPLOYEE_LIST_INCLUDE = {
  type_document_identification: { select: { id: true, name: true, code: true } },
  cost_center: { select: { id: true, name: true, consecutive: true } },
  current_contract: {
    include: {
      contract_type: { select: { id: true, name: true } },
      worker_type: { select: { id: true, name: true, code: true } },
    },
  },
  current_salary: true,
};

const EMPLOYEE_DETAIL_INCLUDE = {
  type_document_identification: { select: { id: true, name: true, code: true } },
  department: { select: { id: true, name: true } },
  municipality: { select: { id: true, name: true } },
  tenant_user: { select: { id: true, email: true, is_active: true } },
  director: { select: { id: true, name: true, identification_number: true } },
  cost_center: { select: { id: true, name: true, consecutive: true } },
  payment_method: { select: { id: true, name: true } },
  eps: { select: { id: true, name: true, identification_number: true } },
  pension_fund: { select: { id: true, name: true, identification_number: true } },
  arl: { select: { id: true, name: true, identification_number: true } },
  arl_risk_class: { select: { id: true, name: true, rate: true } },
  compensation_fund: { select: { id: true, name: true, identification_number: true } },
  severance_fund: { select: { id: true, name: true, identification_number: true } },
  current_contract: {
    include: {
      contract_type: { select: { id: true, name: true } },
      worker_type: { select: { id: true, name: true, code: true } },
      worker_subtype: { select: { id: true, name: true, code: true } },
    },
  },
  current_salary: true,
  contracts: {
    orderBy: { created_at: 'desc' as const },
    include: {
      contract_type: { select: { id: true, name: true } },
      worker_type: { select: { id: true, name: true, code: true } },
      worker_subtype: { select: { id: true, name: true, code: true } },
      salary_history: { orderBy: { effective_date: 'desc' as const }, take: 10 },
    },
  },
  salary_history: {
    orderBy: { effective_date: 'desc' as const },
    take: 5,
  },
};

@Injectable()
export class EmployeesService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private verifyCompanyAccess(jwtCompanyId: string, urlCompanyId: string): void {
    if (jwtCompanyId !== urlCompanyId) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }
  }

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) {
      throw new NotFoundException('Empresa no encontrada o inactiva');
    }
    return tenantDb;
  }

  // ==================== CRUD EMPLEADOS ====================

  /**
   * Listar empleados con filtros y paginación
   */
  async findAll(companyId: string, jwtCompanyId: string, query: QueryEmployeesDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const {
      search,
      status,
      is_active,
      is_administrative,
      contract_type_id,
      worker_type_id,
      eps_id,
      pension_fund_id,
      cost_center_id,
      page = 1,
      limit = 50,
      sortBy = 'hire_date',
      sortOrder = 'desc',
    } = query;

    const where: any = {
      roles: { has: 'EMPLOYEE' },
    };

    if (status) {
      // employee_status es nullable; null se trata como 'ACTIVE' por defecto
      if (status === 'ACTIVE') {
        where.AND = where.AND || [];
        where.AND.push({
          OR: [{ employee_status: 'ACTIVE' }, { employee_status: null }],
        });
      } else {
        where.employee_status = status;
      }
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (is_administrative !== undefined) {
      where.is_administrative = is_administrative;
    }

    if (cost_center_id) {
      where.cost_center_id = cost_center_id;
    }

    if (eps_id) {
      where.eps_id = eps_id;
    }

    if (pension_fund_id) {
      where.pension_fund_id = pension_fund_id;
    }

    // Filtros sobre contrato actual
    if (contract_type_id || worker_type_id) {
      where.current_contract = {};
      if (contract_type_id) where.current_contract.contract_type_id = contract_type_id;
      if (worker_type_id) where.current_contract.worker_type_id = worker_type_id;
    }

    // Búsqueda por texto
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { identification_number: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Orden
    let orderBy: any;
    const directSortFields = ['hire_date', 'employee_status', 'created_at', 'name'];
    if (directSortFields.includes(sortBy)) {
      orderBy = { [sortBy]: sortOrder };
    } else if (sortBy === 'salary') {
      orderBy = { current_salary: { salary: sortOrder } };
    } else {
      orderBy = { hire_date: 'desc' };
    }

    const [data, total] = await Promise.all([
      tenantDb.thirdParty.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: EMPLOYEE_LIST_INCLUDE,
      }),
      tenantDb.thirdParty.count({ where }),
    ]);

    return {
      data: data.map((emp) => ({
        ...emp,
        employee_status: emp.employee_status || 'ACTIVE',
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener empleado por ID (ThirdParty ID) con detalle completo
   */
  async findOne(companyId: string, jwtCompanyId: string, id: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id },
      include: EMPLOYEE_DETAIL_INCLUDE,
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return { ...employee, employee_status: employee.employee_status || 'ACTIVE' };
  }

  /**
   * Crear empleado: ThirdParty (con rol EMPLOYEE) + EmployeeContract + SalaryHistory
   */
  async create(companyId: string, jwtCompanyId: string, dto: CreateEmployeeDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    // Verificar si ya existe ThirdParty con esa identificación
    const existing = await tenantDb.thirdParty.findFirst({
      where: { identification_number: dto.identification_number },
    });

    if (existing?.roles?.includes('EMPLOYEE')) {
      throw new ConflictException('Ya existe un empleado con este número de identificación');
    }

    // Usar transacción para atomicidad
    const result = await tenantDb.$transaction(async (tx) => {
      // 1. Crear o actualizar ThirdParty con rol EMPLOYEE + datos de empleado
      let thirdPartyId: string;

      const employeeFields = {
        hire_date: new Date(dto.hire_date),
        employee_status: 'ACTIVE' as const,
        is_administrative: dto.is_administrative || false,
        director_id: dto.director_id,
        cost_center_id: dto.cost_center_id,
        payment_method_id: dto.payment_method_id,
        eps_id: dto.eps_id,
        pension_fund_id: dto.pension_fund_id,
        arl_id: dto.arl_id,
        arl_risk_class_id: dto.arl_risk_id,
        compensation_fund_id: dto.compensation_fund_id,
        severance_fund_id: dto.severance_fund_id,
        bank_name: dto.bank_name,
        bank_account_type: dto.bank_account_type,
        bank_account_number: dto.bank_account_number,
      };

      if (existing) {
        // ThirdParty existe pero no es empleado → agregar rol EMPLOYEE + datos HR
        await tx.thirdParty.update({
          where: { id: existing.id },
          data: {
            roles: { push: 'EMPLOYEE' },
            name: dto.name,
            first_name: dto.first_name || existing.first_name,
            second_name: dto.second_name || existing.second_name,
            first_surname: dto.first_surname || existing.first_surname,
            second_surname: dto.second_surname || existing.second_surname,
            dv: dto.dv || existing.dv,
            email: dto.email || existing.email,
            phone: dto.phone || existing.phone,
            address: dto.address || existing.address,
            type_organization_id: dto.type_organization_id || existing.type_organization_id,
            type_document_identification_id: dto.type_document_identification_id || existing.type_document_identification_id,
            department_id: dto.department_id || existing.department_id,
            municipality_id: dto.municipality_id || existing.municipality_id,
            ...employeeFields,
          },
        });
        thirdPartyId = existing.id;
      } else {
        // Crear nuevo ThirdParty con rol EMPLOYEE
        const newThirdParty = await tx.thirdParty.create({
          data: {
            name: dto.name,
            identification_number: dto.identification_number,
            dv: dto.dv,
            roles: ['EMPLOYEE'],
            first_name: dto.first_name,
            second_name: dto.second_name,
            first_surname: dto.first_surname,
            second_surname: dto.second_surname,
            email: dto.email,
            phone: dto.phone,
            address: dto.address,
            type_organization_id: dto.type_organization_id,
            type_document_identification_id: dto.type_document_identification_id,
            department_id: dto.department_id,
            municipality_id: dto.municipality_id,
            ...employeeFields,
          },
        });
        thirdPartyId = newThirdParty.id;
      }

      // 2. Crear EmployeeContract (contrato inicial)
      const contract = await tx.employeeContract.create({
        data: {
          third_party_id: thirdPartyId,
          contract_type_id: dto.contract_type_id,
          worker_type_id: dto.worker_type_id,
          worker_subtype_id: dto.worker_subtype_id,
          position: dto.position,
          probation_days: dto.probation_days,
          includes_transport: dto.includes_transport ?? true,
          start_date: new Date(dto.hire_date),
          end_date: dto.contract_end_date ? new Date(dto.contract_end_date) : null,
          is_current: true,
        },
      });

      // 3. Crear SalaryHistory (salario inicial, vinculado al contrato)
      const salary = await tx.salaryHistory.create({
        data: {
          third_party_id: thirdPartyId,
          contract_id: contract.id,
          salary: dto.salary,
          salary_type: (dto.salary_type as any) || 'ORDINARIO',
          transportation_allowance: dto.transportation_allowance || null,
          variable_salary: dto.variable_salary || false,
          effective_date: new Date(dto.hire_date),
          is_current: true,
          reason: 'Ingreso',
        },
      });

      // 4. Actualizar ThirdParty con current_contract_id y current_salary_id
      const updatedEmployee = await tx.thirdParty.update({
        where: { id: thirdPartyId },
        data: {
          current_contract_id: contract.id,
          current_salary_id: salary.id,
        },
        include: EMPLOYEE_DETAIL_INCLUDE,
      });

      // 5. Crear/vincular cuenta de usuario si se solicitó
      if (dto.create_system_account && dto.system_email && dto.system_password) {
        const existingEmail = await tx.tenantUser.findUnique({
          where: { email: dto.system_email },
        });
        if (existingEmail) {
          throw new ConflictException(`Ya existe un usuario con el email ${dto.system_email}`);
        }

        const roleId = dto.system_role_id || (await this.getDefaultEmployeeRoleId(tx));
        const passwordHash = await bcrypt.hash(dto.system_password, 12);

        await tx.tenantUser.create({
          data: {
            email: dto.system_email,
            password_hash: passwordHash,
            full_name: dto.name,
            phone: dto.phone,
            role_id: roleId,
            third_party_id: thirdPartyId,
            must_change_password: true,
          },
        });
      } else if (dto.existing_user_id) {
        // Vincular TenantUser existente
        const user = await tx.tenantUser.findUnique({
          where: { id: dto.existing_user_id },
        });
        if (!user) {
          throw new NotFoundException('Usuario no encontrado');
        }
        if (user.third_party_id) {
          throw new ConflictException('Este usuario ya está vinculado a otro tercero');
        }
        await tx.tenantUser.update({
          where: { id: dto.existing_user_id },
          data: { third_party_id: thirdPartyId },
        });
      }

      return updatedEmployee;
    });

    return result;
  }

  /**
   * Actualizar datos del empleado (todo en ThirdParty)
   */
  async update(companyId: string, jwtCompanyId: string, id: string, dto: UpdateEmployeeDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id },
      select: { id: true, roles: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Un solo update en ThirdParty (persona + HR)
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.dv !== undefined) data.dv = dto.dv;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.first_name !== undefined) data.first_name = dto.first_name;
    if (dto.second_name !== undefined) data.second_name = dto.second_name;
    if (dto.first_surname !== undefined) data.first_surname = dto.first_surname;
    if (dto.second_surname !== undefined) data.second_surname = dto.second_surname;
    if (dto.type_organization_id !== undefined) data.type_organization_id = dto.type_organization_id;
    if (dto.type_document_identification_id !== undefined) data.type_document_identification_id = dto.type_document_identification_id;
    if (dto.department_id !== undefined) data.department_id = dto.department_id;
    if (dto.municipality_id !== undefined) data.municipality_id = dto.municipality_id;
    if (dto.hire_date !== undefined) data.hire_date = new Date(dto.hire_date);
    if (dto.is_administrative !== undefined) data.is_administrative = dto.is_administrative;
    if (dto.director_id !== undefined) data.director_id = dto.director_id;
    if (dto.cost_center_id !== undefined) data.cost_center_id = dto.cost_center_id;
    if (dto.payment_method_id !== undefined) data.payment_method_id = dto.payment_method_id;
    if (dto.eps_id !== undefined) data.eps_id = dto.eps_id;
    if (dto.pension_fund_id !== undefined) data.pension_fund_id = dto.pension_fund_id;
    if (dto.arl_id !== undefined) data.arl_id = dto.arl_id;
    if (dto.arl_risk_id !== undefined) data.arl_risk_class_id = dto.arl_risk_id;
    if (dto.compensation_fund_id !== undefined) data.compensation_fund_id = dto.compensation_fund_id;
    if (dto.severance_fund_id !== undefined) data.severance_fund_id = dto.severance_fund_id;
    if (dto.bank_name !== undefined) data.bank_name = dto.bank_name;
    if (dto.bank_account_type !== undefined) data.bank_account_type = dto.bank_account_type;
    if (dto.bank_account_number !== undefined) data.bank_account_number = dto.bank_account_number;

    return tenantDb.thirdParty.update({
      where: { id },
      data,
      include: EMPLOYEE_DETAIL_INCLUDE,
    });
  }

  /**
   * Activar empleado
   */
  async activate(companyId: string, jwtCompanyId: string, id: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id },
      select: { id: true, roles: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    await tenantDb.thirdParty.update({
      where: { id },
      data: { employee_status: 'ACTIVE' },
    });

    return { message: 'Empleado activado exitosamente' };
  }

  /**
   * Desactivar empleado
   */
  async deactivate(companyId: string, jwtCompanyId: string, id: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id },
      select: { id: true, roles: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    await tenantDb.thirdParty.update({
      where: { id },
      data: { employee_status: 'INACTIVE' },
    });

    return { message: 'Empleado desactivado exitosamente' };
  }

  /**
   * Retirar empleado (terminar contrato + cerrar salario)
   */
  async terminate(companyId: string, jwtCompanyId: string, id: string, dto?: TerminateEmployeeDto) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id },
      select: { id: true, roles: true, current_contract_id: true, current_salary_id: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const terminationDate = dto?.termination_date ? new Date(dto.termination_date) : new Date();

    await tenantDb.$transaction(async (tx) => {
      // Cerrar contrato actual
      if (employee.current_contract_id) {
        await tx.employeeContract.update({
          where: { id: employee.current_contract_id },
          data: {
            is_current: false,
            end_date: terminationDate,
            termination_type: dto?.termination_type as any || 'RENUNCIA',
            termination_reason: dto?.termination_reason || 'Retiro',
          },
        });
      }

      // Cerrar salario actual
      if (employee.current_salary_id) {
        await tx.salaryHistory.update({
          where: { id: employee.current_salary_id },
          data: {
            is_current: false,
            end_date: terminationDate,
          },
        });
      }

      // Actualizar ThirdParty
      await tx.thirdParty.update({
        where: { id },
        data: {
          employee_status: 'TERMINATED',
          current_contract_id: null,
          current_salary_id: null,
        },
      });
    });

    return { message: 'Empleado retirado exitosamente' };
  }

  /**
   * Eliminar empleado (elimina child records + quita rol EMPLOYEE)
   */
  async delete(companyId: string, jwtCompanyId: string, id: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id },
      select: { id: true, roles: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    await tenantDb.$transaction(async (tx) => {
      // Limpiar current references antes de borrar hijos
      await tx.thirdParty.update({
        where: { id },
        data: { current_contract_id: null, current_salary_id: null },
      });

      // Eliminar child records en cascada
      await tx.employeeContract.deleteMany({ where: { third_party_id: id } });
      await tx.salaryHistory.deleteMany({ where: { third_party_id: id } });
      await tx.attendanceRecord.deleteMany({ where: { third_party_id: id } });
      await tx.overtimeRecord.deleteMany({ where: { third_party_id: id } });
      await tx.leaveRequest.deleteMany({ where: { third_party_id: id } });
      await tx.employeeTravelExpense.deleteMany({ where: { third_party_id: id } });

      // Quitar rol EMPLOYEE y limpiar campos HR
      const newRoles = employee.roles.filter((r) => r !== 'EMPLOYEE');
      await tx.thirdParty.update({
        where: { id },
        data: {
          roles: newRoles,
          is_active: newRoles.length > 0,
          employee_status: null,
          hire_date: null,
          is_administrative: false,
          director_id: null,
          current_contract_id: null,
          current_salary_id: null,
        },
      });
    });

    return { message: 'Empleado eliminado exitosamente' };
  }

  /**
   * Verificar si existe un empleado por número de identificación
   */
  async exists(companyId: string, jwtCompanyId: string, identificationNumber: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const thirdParty = await tenantDb.thirdParty.findFirst({
      where: { identification_number: identificationNumber },
      select: {
        id: true,
        name: true,
        identification_number: true,
        email: true,
        phone: true,
        roles: true,
        employee_status: true,
      },
    });

    if (!thirdParty) {
      return { exists: false };
    }

    return {
      exists: true,
      is_employee: thirdParty.roles?.includes('EMPLOYEE') || false,
      third_party: {
        id: thirdParty.id,
        name: thirdParty.name,
        identification_number: thirdParty.identification_number,
        email: thirdParty.email,
        phone: thirdParty.phone,
      },
      employee_status: thirdParty.roles?.includes('EMPLOYEE') ? thirdParty.employee_status : null,
    };
  }

  /**
   * Estadísticas de empleados
   */
  async getStats(companyId: string, jwtCompanyId: string) {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employeeFilter = { roles: { has: 'EMPLOYEE' as const } };

    const [total, active, inactive, onLeave, terminated, administrative] = await Promise.all([
      tenantDb.thirdParty.count({ where: employeeFilter }),
      tenantDb.thirdParty.count({ where: { ...employeeFilter, employee_status: 'ACTIVE' } }),
      tenantDb.thirdParty.count({ where: { ...employeeFilter, employee_status: 'INACTIVE' } }),
      tenantDb.thirdParty.count({ where: { ...employeeFilter, employee_status: 'ON_LEAVE' } }),
      tenantDb.thirdParty.count({ where: { ...employeeFilter, employee_status: 'TERMINATED' } }),
      tenantDb.thirdParty.count({ where: { ...employeeFilter, is_administrative: true } }),
    ]);

    // Calcular nómina total (solo activos con salario vigente)
    const activeSalaries = await tenantDb.salaryHistory.findMany({
      where: {
        is_current: true,
        third_party: { roles: { has: 'EMPLOYEE' }, employee_status: 'ACTIVE' },
      },
      select: { salary: true },
    });

    const totalSalary = activeSalaries.reduce((sum, s) => sum + Number(s.salary), 0);
    const averageSalary = activeSalaries.length > 0 ? totalSalary / activeSalaries.length : 0;

    return {
      total,
      by_status: {
        ACTIVE: active,
        INACTIVE: inactive,
        ON_LEAVE: onLeave,
        TERMINATED: terminated,
      },
      administrative,
      total_salary: totalSalary,
      average_salary: Math.round(averageSalary),
    };
  }

  // ==================== CONTRATOS ====================

  /**
   * Obtener historial de contratos de un empleado
   */
  async getContracts(companyId: string, jwtCompanyId: string, employeeId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id: employeeId },
      select: { id: true, roles: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return tenantDb.employeeContract.findMany({
      where: { third_party_id: employeeId },
      orderBy: { start_date: 'desc' },
      include: {
        contract_type: { select: { id: true, name: true } },
        worker_type: { select: { id: true, name: true, code: true } },
        worker_subtype: { select: { id: true, name: true, code: true } },
      },
    });
  }

  /**
   * Crear nuevo contrato (cierra el anterior)
   */
  async createContract(companyId: string, jwtCompanyId: string, employeeId: string, dto: CreateContractDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id: employeeId },
      select: { id: true, roles: true, current_contract_id: true, current_salary_id: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const result = await tenantDb.$transaction(async (tx) => {
      // Cerrar contrato anterior
      if (employee.current_contract_id) {
        await tx.employeeContract.update({
          where: { id: employee.current_contract_id },
          data: {
            is_current: false,
            end_date: new Date(dto.start_date),
          },
        });
      }

      // Crear nuevo contrato
      const contract = await tx.employeeContract.create({
        data: {
          third_party_id: employeeId,
          contract_type_id: dto.contract_type_id,
          worker_type_id: dto.worker_type_id,
          worker_subtype_id: dto.worker_subtype_id,
          position: dto.position,
          probation_days: dto.probation_days,
          includes_transport: dto.includes_transport ?? true,
          start_date: new Date(dto.start_date),
          end_date: dto.end_date ? new Date(dto.end_date) : null,
          observations: dto.observations,
          is_current: true,
        },
        include: {
          contract_type: { select: { id: true, name: true } },
          worker_type: { select: { id: true, name: true, code: true } },
          worker_subtype: { select: { id: true, name: true, code: true } },
        },
      });

      // Si se envían datos de salario, crear nuevo registro de salario
      if (dto.salary !== undefined && dto.salary !== null) {
        // Cerrar salario anterior
        if (employee.current_salary_id) {
          await tx.salaryHistory.update({
            where: { id: employee.current_salary_id },
            data: { is_current: false, end_date: new Date(dto.start_date) },
          });
        }

        const newSalary = await tx.salaryHistory.create({
          data: {
            third_party_id: employeeId,
            contract_id: contract.id,
            salary: dto.salary,
            salary_type: (dto.salary_type as any) || 'ORDINARIO',
            transportation_allowance: dto.transportation_allowance ?? 0,
            variable_salary: dto.variable_salary ?? false,
            effective_date: new Date(dto.start_date),
            is_current: true,
            reason: 'Salario inicial del nuevo contrato',
          },
        });

        // Actualizar referencia en ThirdParty y reactivar si estaba terminado
        await tx.thirdParty.update({
          where: { id: employeeId },
          data: { current_contract_id: contract.id, current_salary_id: newSalary.id, employee_status: 'ACTIVE' },
        });
      } else {
        // Sin salario nuevo: vincular salario vigente al nuevo contrato
        if (employee.current_salary_id) {
          await tx.salaryHistory.update({
            where: { id: employee.current_salary_id },
            data: { contract_id: contract.id },
          });

          await tx.thirdParty.update({
            where: { id: employeeId },
            data: { current_contract_id: contract.id, employee_status: 'ACTIVE' },
          });
        } else {
          // No hay salario vigente (ej: empleado terminado y recontratado)
          // Buscar el último salario del historial para reactivarlo
          const lastSalary = await tx.salaryHistory.findFirst({
            where: { third_party_id: employeeId },
            orderBy: { effective_date: 'desc' },
          });

          if (lastSalary) {
            // Reactivar el último salario vinculándolo al nuevo contrato
            await tx.salaryHistory.update({
              where: { id: lastSalary.id },
              data: {
                contract_id: contract.id,
                is_current: true,
                end_date: null,
              },
            });

            await tx.thirdParty.update({
              where: { id: employeeId },
              data: {
                current_contract_id: contract.id,
                current_salary_id: lastSalary.id,
                employee_status: 'ACTIVE',
              },
            });
          } else {
            // No existe historial de salario - requiere que se ingrese
            throw new BadRequestException(
              'El empleado no tiene salario registrado. Debe marcar "Cambiar salario" e ingresar el salario para este contrato.',
            );
          }
        }
      }

      return contract;
    });

    return result;
  }

  /**
   * Editar un contrato existente
   */
  async updateContract(companyId: string, jwtCompanyId: string, employeeId: string, contractId: string, dto: CreateContractDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const contract = await tenantDb.employeeContract.findFirst({
      where: { id: contractId, third_party_id: employeeId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato no encontrado');
    }

    return tenantDb.employeeContract.update({
      where: { id: contractId },
      data: {
        contract_type_id: dto.contract_type_id,
        worker_type_id: dto.worker_type_id,
        worker_subtype_id: dto.worker_subtype_id,
        position: dto.position,
        includes_transport: dto.includes_transport,
        start_date: new Date(dto.start_date),
        end_date: dto.end_date ? new Date(dto.end_date) : null,
        observations: dto.observations,
      },
      include: {
        contract_type: { select: { id: true, name: true } },
        worker_type: { select: { id: true, name: true, code: true } },
        worker_subtype: { select: { id: true, name: true, code: true } },
      },
    });
  }

  /**
   * Renovar contrato (nuevo contrato basado en el actual)
   */
  async renewContract(companyId: string, jwtCompanyId: string, employeeId: string, contractId: string, dto: RenewContractDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const currentContract = await tenantDb.employeeContract.findFirst({
      where: { id: contractId, third_party_id: employeeId },
    });

    if (!currentContract) {
      throw new NotFoundException('Contrato no encontrado');
    }

    const result = await tenantDb.$transaction(async (tx) => {
      // Cerrar contrato actual
      await tx.employeeContract.update({
        where: { id: contractId },
        data: {
          is_current: false,
          end_date: new Date(dto.start_date),
        },
      });

      // Crear nuevo contrato con mismos datos base
      const renewed = await tx.employeeContract.create({
        data: {
          third_party_id: employeeId,
          contract_type_id: currentContract.contract_type_id,
          worker_type_id: currentContract.worker_type_id,
          worker_subtype_id: currentContract.worker_subtype_id,
          position: currentContract.position,
          includes_transport: currentContract.includes_transport,
          start_date: new Date(dto.start_date),
          end_date: dto.end_date ? new Date(dto.end_date) : null,
          observations: dto.observations || `Renovación de contrato ${contractId}`,
          is_current: true,
        },
        include: {
          contract_type: { select: { id: true, name: true } },
          worker_type: { select: { id: true, name: true, code: true } },
          worker_subtype: { select: { id: true, name: true, code: true } },
        },
      });

      // Vincular salario vigente al nuevo contrato
      const emp = await tx.thirdParty.findUnique({
        where: { id: employeeId },
        select: { current_salary_id: true },
      });
      if (emp?.current_salary_id) {
        await tx.salaryHistory.update({
          where: { id: emp.current_salary_id },
          data: { contract_id: renewed.id },
        });
      }

      // Actualizar referencia
      await tx.thirdParty.update({
        where: { id: employeeId },
        data: { current_contract_id: renewed.id },
      });

      return renewed;
    });

    return result;
  }

  // ==================== SALARIO ====================

  /**
   * Obtener salario actual del empleado
   */
  async getCurrentSalary(companyId: string, jwtCompanyId: string, employeeId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id: employeeId },
      select: { id: true, roles: true, current_salary_id: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (!employee.current_salary_id) {
      return null;
    }

    return tenantDb.salaryHistory.findUnique({
      where: { id: employee.current_salary_id },
    });
  }

  /**
   * Obtener historial de salarios
   */
  async getSalaryHistory(companyId: string, jwtCompanyId: string, employeeId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id: employeeId },
      select: { id: true, roles: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return tenantDb.salaryHistory.findMany({
      where: { third_party_id: employeeId },
      orderBy: { effective_date: 'desc' },
    });
  }

  /**
   * Cambiar salario del empleado (crea nuevo registro, cierra anterior)
   */
  async updateSalary(companyId: string, jwtCompanyId: string, employeeId: string, dto: UpdateSalaryDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id: employeeId },
      select: { id: true, roles: true, current_salary_id: true, current_contract_id: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const effectiveDate = dto.effective_date ? new Date(dto.effective_date) : new Date();

    const result = await tenantDb.$transaction(async (tx) => {
      // Cerrar salario anterior
      if (employee.current_salary_id) {
        await tx.salaryHistory.update({
          where: { id: employee.current_salary_id },
          data: {
            is_current: false,
            end_date: effectiveDate,
          },
        });
      }

      // Crear nuevo registro de salario vinculado al contrato vigente
      const salary = await tx.salaryHistory.create({
        data: {
          third_party_id: employeeId,
          contract_id: employee.current_contract_id,
          salary: dto.salary,
          salary_type: (dto.salary_type as any) || 'ORDINARIO',
          transportation_allowance: dto.transportation_allowance || null,
          variable_salary: dto.variable_salary || false,
          effective_date: effectiveDate,
          is_current: true,
          reason: dto.reason || 'Cambio de salario',
        },
      });

      // Actualizar referencia
      await tx.thirdParty.update({
        where: { id: employeeId },
        data: { current_salary_id: salary.id },
      });

      return salary;
    });

    return result;
  }

  // ==================== ROLES Y USUARIOS ====================

  /**
   * Obtener el rol por defecto "employee"
   */
  private async getDefaultEmployeeRoleId(tx: any): Promise<string> {
    const role = await tx.role.findFirst({ where: { role_key: 'employee' } });
    if (!role) {
      throw new NotFoundException('Rol de empleado no configurado en el sistema');
    }
    return role.id;
  }

  /**
   * Listar roles disponibles para asignar a usuarios
   */
  async findRoles(companyId: string, jwtCompanyId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.role.findMany({
      where: { is_active: true },
      select: { id: true, role_key: true, role_name: true, description: true, is_system: true },
      orderBy: { role_name: 'asc' },
    });
  }

  /**
   * Listar usuarios del tenant que NO están vinculados a un tercero
   */
  async findUnlinkedUsers(companyId: string, jwtCompanyId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    return tenantDb.tenantUser.findMany({
      where: { third_party_id: null, is_active: true },
      select: { id: true, email: true, full_name: true, role: { select: { role_name: true } } },
      orderBy: { full_name: 'asc' },
    });
  }

  /**
   * Vincular o crear una cuenta de usuario para un empleado existente
   */
  async linkUser(companyId: string, jwtCompanyId: string, employeeId: string, dto: LinkUserDto): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id: employeeId },
      include: { tenant_user: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (employee.tenant_user) {
      throw new ConflictException('Este empleado ya tiene una cuenta de usuario vinculada');
    }

    if (dto.create_system_account && dto.system_email && dto.system_password) {
      const existingEmail = await tenantDb.tenantUser.findUnique({
        where: { email: dto.system_email },
      });
      if (existingEmail) {
        throw new ConflictException(`Ya existe un usuario con el email ${dto.system_email}`);
      }

      const roleId = dto.system_role_id || (await this.getDefaultEmployeeRoleId(tenantDb));
      const passwordHash = await bcrypt.hash(dto.system_password, 12);

      const user = await tenantDb.tenantUser.create({
        data: {
          email: dto.system_email,
          password_hash: passwordHash,
          full_name: employee.name || '',
          phone: employee.phone,
          role_id: roleId,
          third_party_id: employeeId,
          must_change_password: true,
        },
        select: { id: true, email: true, is_active: true },
      });

      return { message: 'Cuenta de usuario creada y vinculada', user };
    } else if (dto.existing_user_id) {
      const user = await tenantDb.tenantUser.findUnique({
        where: { id: dto.existing_user_id },
      });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
      if (user.third_party_id) {
        throw new ConflictException('Este usuario ya está vinculado a otro tercero');
      }

      const updated = await tenantDb.tenantUser.update({
        where: { id: dto.existing_user_id },
        data: { third_party_id: employeeId },
        select: { id: true, email: true, is_active: true },
      });

      return { message: 'Usuario vinculado exitosamente', user: updated };
    }

    throw new BadRequestException('Debe indicar create_system_account o existing_user_id');
  }

  /**
   * Desvincular la cuenta de usuario de un empleado (no elimina el TenantUser)
   */
  async unlinkUser(companyId: string, jwtCompanyId: string, employeeId: string): Promise<any> {
    this.verifyCompanyAccess(jwtCompanyId, companyId);
    const tenantDb = await this.getTenantDb(companyId);

    const employee = await tenantDb.thirdParty.findUnique({
      where: { id: employeeId },
      include: { tenant_user: true },
    });

    if (!employee || !employee.roles?.includes('EMPLOYEE')) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (!employee.tenant_user) {
      throw new BadRequestException('Este empleado no tiene una cuenta de usuario vinculada');
    }

    await tenantDb.tenantUser.update({
      where: { id: employee.tenant_user.id },
      data: { third_party_id: null },
    });

    return { message: 'Usuario desvinculado exitosamente' };
  }
}
