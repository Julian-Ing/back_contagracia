/**
 * Servicio de Empleados - HR Service
 * Comunicación con el hr-service (puerto 3012)
 */

import { hrClient } from '@/shared/services/api/apiClient';
import type {
  Employee,
  EmployeesResponse,
  EmployeeFilters,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  UpdateSalaryDto,
  TerminateEmployeeDto,
  EmployeeStats,
  EmployeeExistsResult,
  EmployeeContract,
  SalaryRecord,
  CreateContractDto,
  RenewContractDto,
  SocialSecurityEntity,
  ContractType,
  WorkerType,
  WorkerSubtype,
  ArlRisk,
  CostCenter,
  SystemRole,
  UnlinkedUser,
  LinkUserDto,
  LinkUserResponse,
} from '../types';

export const employeesService = {
  // ==================== CRUD EMPLEADOS ====================

  /**
   * Obtener lista de empleados con filtros y paginación
   */
  async getAll(filters: EmployeeFilters = {}): Promise<EmployeesResponse> {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.contract_type_id) params.contract_type_id = filters.contract_type_id;
    if (filters.worker_type_id) params.worker_type_id = filters.worker_type_id;
    if (filters.cost_center_id) params.cost_center_id = filters.cost_center_id;
    if (filters.is_active !== undefined) params.is_active = String(filters.is_active);
    if (filters.is_administrative !== undefined) params.is_administrative = String(filters.is_administrative);
    if (filters.eps_id) params.eps_id = filters.eps_id;
    if (filters.pension_fund_id) params.pension_fund_id = filters.pension_fund_id;
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    const response = await hrClient.get<EmployeesResponse>('/employees', { params });
    return response.data;
  },

  /**
   * Obtener un empleado por ID (ThirdParty ID)
   */
  async getOne(id: string): Promise<Employee> {
    const response = await hrClient.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  /**
   * Crear un nuevo empleado
   */
  async create(data: CreateEmployeeDto): Promise<Employee> {
    const response = await hrClient.post<Employee>('/employees', data);
    return response.data;
  },

  /**
   * Actualizar un empleado existente
   */
  async update(id: string, data: UpdateEmployeeDto): Promise<Employee> {
    const response = await hrClient.patch<Employee>(`/employees/${id}`, data);
    return response.data;
  },

  /**
   * Activar empleado
   */
  async activate(id: string): Promise<Employee> {
    const response = await hrClient.patch<Employee>(`/employees/${id}/activate`);
    return response.data;
  },

  /**
   * Desactivar empleado
   */
  async deactivate(id: string): Promise<Employee> {
    const response = await hrClient.patch<Employee>(`/employees/${id}/deactivate`);
    return response.data;
  },

  /**
   * Terminar contrato del empleado
   */
  async terminate(id: string, data?: TerminateEmployeeDto): Promise<{ message: string }> {
    const response = await hrClient.patch<{ message: string }>(`/employees/${id}/terminate`, data || {});
    return response.data;
  },

  /**
   * Eliminar empleado (soft delete)
   */
  async delete(id: string): Promise<void> {
    await hrClient.delete(`/employees/${id}`);
  },

  /**
   * Obtener estadísticas de empleados
   */
  async getStats(): Promise<EmployeeStats> {
    const response = await hrClient.get<EmployeeStats>('/employees/stats');
    return response.data;
  },

  /**
   * Verificar si existe un empleado por número de identificación
   */
  async exists(identificationNumber: string): Promise<EmployeeExistsResult> {
    const response = await hrClient.get<EmployeeExistsResult>(
      `/employees/exists/${encodeURIComponent(identificationNumber)}`
    );
    return response.data;
  },

  // ==================== CONTRATOS ====================

  /**
   * Obtener historial de contratos del empleado
   */
  async getContracts(employeeId: string): Promise<EmployeeContract[]> {
    const response = await hrClient.get<EmployeeContract[]>(`/employees/${employeeId}/contracts`);
    return response.data;
  },

  /**
   * Crear nuevo contrato (cierra el anterior)
   */
  async createContract(employeeId: string, data: CreateContractDto): Promise<EmployeeContract> {
    const response = await hrClient.post<EmployeeContract>(`/employees/${employeeId}/contracts`, data);
    return response.data;
  },

  /**
   * Editar un contrato existente
   */
  async updateContract(employeeId: string, contractId: string, data: CreateContractDto): Promise<EmployeeContract> {
    const response = await hrClient.patch<EmployeeContract>(`/employees/${employeeId}/contracts/${contractId}`, data);
    return response.data;
  },

  /**
   * Renovar contrato
   */
  async renewContract(employeeId: string, contractId: string, data: RenewContractDto): Promise<EmployeeContract> {
    const response = await hrClient.post<EmployeeContract>(`/employees/${employeeId}/contracts/${contractId}/renew`, data);
    return response.data;
  },

  // ==================== SALARIO ====================

  /**
   * Obtener salario actual del empleado
   */
  async getCurrentSalary(employeeId: string): Promise<SalaryRecord | null> {
    const response = await hrClient.get<SalaryRecord | null>(`/employees/${employeeId}/salary`);
    return response.data;
  },

  /**
   * Obtener historial de salarios del empleado
   */
  async getSalaryHistory(employeeId: string): Promise<SalaryRecord[]> {
    const response = await hrClient.get<SalaryRecord[]>(`/employees/${employeeId}/salary/history`);
    return response.data;
  },

  /**
   * Cambiar salario del empleado (crea nuevo registro)
   */
  async updateSalary(employeeId: string, data: UpdateSalaryDto): Promise<SalaryRecord> {
    const response = await hrClient.patch<SalaryRecord>(`/employees/${employeeId}/salary`, data);
    return response.data;
  },

  // ==================== ENTIDADES DE SEGURIDAD SOCIAL ====================

  /**
   * Obtener lista de EPS
   */
  async getEps(): Promise<SocialSecurityEntity[]> {
    const response = await hrClient.get<SocialSecurityEntity[]>('/social-security/eps');
    return response.data;
  },

  /**
   * Obtener lista de Fondos de Pensiones
   */
  async getPensionFunds(): Promise<SocialSecurityEntity[]> {
    const response = await hrClient.get<SocialSecurityEntity[]>('/social-security/pension-funds');
    return response.data;
  },

  /**
   * Obtener lista de ARL
   */
  async getArl(): Promise<SocialSecurityEntity[]> {
    const response = await hrClient.get<SocialSecurityEntity[]>('/social-security/arl');
    return response.data;
  },

  /**
   * Obtener lista de Cajas de Compensación
   */
  async getCompensationFunds(): Promise<SocialSecurityEntity[]> {
    const response = await hrClient.get<SocialSecurityEntity[]>('/social-security/compensation-funds');
    return response.data;
  },

  /**
   * Obtener lista de Fondos de Cesantías
   */
  async getSeveranceFunds(): Promise<SocialSecurityEntity[]> {
    const response = await hrClient.get<SocialSecurityEntity[]>('/social-security/severance-funds');
    return response.data;
  },

  // ==================== PARAMÉTRICAS LABORALES ====================

  /**
   * Obtener tipos de contrato
   */
  async getContractTypes(): Promise<ContractType[]> {
    const response = await hrClient.get<ContractType[]>('/social-security/contract-types');
    return response.data;
  },

  /**
   * Obtener tipos de trabajador
   */
  async getWorkerTypes(): Promise<WorkerType[]> {
    const response = await hrClient.get<WorkerType[]>('/social-security/worker-types');
    return response.data;
  },

  /**
   * Obtener subtipos de trabajador por tipo
   */
  async getWorkerSubtypes(workerTypeId?: string): Promise<WorkerSubtype[]> {
    const params: Record<string, string> = {};
    if (workerTypeId) params.worker_type_id = workerTypeId;

    const response = await hrClient.get<WorkerSubtype[]>('/social-security/worker-subtypes', { params });
    return response.data;
  },

  /**
   * Obtener riesgos ARL
   */
  async getArlRisks(): Promise<ArlRisk[]> {
    const response = await hrClient.get<ArlRisk[]>('/social-security/arl-risks');
    return response.data;
  },

  /**
   * Obtener centros de costo
   */
  async getCostCenters(): Promise<CostCenter[]> {
    const response = await hrClient.get<CostCenter[]>('/social-security/cost-centers');
    return response.data;
  },

  // ==================== USUARIOS DEL SISTEMA ====================

  /**
   * Obtener roles disponibles para asignar a empleados
   */
  async getRoles(): Promise<SystemRole[]> {
    const response = await hrClient.get<SystemRole[]>('/employees/roles');
    return response.data;
  },

  /**
   * Obtener usuarios sin vincular a un tercero
   */
  async getUnlinkedUsers(): Promise<UnlinkedUser[]> {
    const response = await hrClient.get<UnlinkedUser[]>('/employees/unlinked-users');
    return response.data;
  },

  /**
   * Vincular o crear cuenta de usuario para un empleado existente
   */
  async linkUser(employeeId: string, data: LinkUserDto): Promise<LinkUserResponse> {
    const response = await hrClient.post<LinkUserResponse>(`/employees/${employeeId}/link-user`, data);
    return response.data;
  },

  /**
   * Desvincular cuenta de usuario de un empleado
   */
  async unlinkUser(employeeId: string): Promise<{ message: string }> {
    const response = await hrClient.delete<{ message: string }>(`/employees/${employeeId}/unlink-user`);
    return response.data;
  },
};
