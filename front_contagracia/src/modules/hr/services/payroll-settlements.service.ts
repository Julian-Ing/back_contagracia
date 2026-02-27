/**
 * Servicio de Liquidaciones de Nómina - HR Service
 * Comunicación con el hr-service (puerto 3012)
 */

import { hrClient } from '@/shared/services/api/apiClient';
import type {
  PayrollSettlement,
  PayrollSettlementDetail,
  SettlementsResponse,
  SettlementFilters,
  CreateSettlementDto,
  UpdateSettlementDto,
  PilaGenerationResult,
  SendPayslipsResult,
  EmployeeHistoryFilters,
  EmployeeHistoryResponse,
} from '../types';

export const payrollSettlementsService = {
  // ==================== CRUD ====================

  async getAll(filters: SettlementFilters = {}): Promise<SettlementsResponse> {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.settlement_type) params.settlement_type = filters.settlement_type;
    if (filters.year) params.year = String(filters.year);
    if (filters.month) params.month = String(filters.month);
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    const response = await hrClient.get<SettlementsResponse>('/payroll-settlements', { params });
    return response.data;
  },

  async getOne(id: string): Promise<PayrollSettlement> {
    const response = await hrClient.get<PayrollSettlement>(`/payroll-settlements/${id}`);
    return response.data;
  },

  async getDetail(settlementId: string, detailId: string): Promise<PayrollSettlementDetail> {
    const response = await hrClient.get<PayrollSettlementDetail>(
      `/payroll-settlements/${settlementId}/details/${detailId}`,
    );
    return response.data;
  },

  async create(data: CreateSettlementDto): Promise<PayrollSettlement> {
    const response = await hrClient.post<PayrollSettlement>('/payroll-settlements', data);
    return response.data;
  },

  async update(id: string, data: UpdateSettlementDto): Promise<PayrollSettlement> {
    const response = await hrClient.patch<PayrollSettlement>(`/payroll-settlements/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await hrClient.delete(`/payroll-settlements/${id}`);
  },

  // ==================== EMPLOYEES ====================

  async addEmployees(settlementId: string, employeeIds: string[]): Promise<{ added: number; total_employees: number }> {
    const response = await hrClient.post<{ added: number; total_employees: number }>(
      `/payroll-settlements/${settlementId}/employees`,
      { employee_ids: employeeIds },
    );
    return response.data;
  },

  async addAllEmployees(settlementId: string): Promise<{ added: number; total_employees: number }> {
    const response = await hrClient.post<{ added: number; total_employees: number }>(
      `/payroll-settlements/${settlementId}/employees/all`,
    );
    return response.data;
  },

  async updateDetailDaysWorked(
    settlementId: string,
    detailId: string,
    daysWorked: number,
  ): Promise<{ updated: boolean; days_worked: number }> {
    const response = await hrClient.patch<{ updated: boolean; days_worked: number }>(
      `/payroll-settlements/${settlementId}/details/${detailId}`,
      { days_worked: daysWorked },
    );
    return response.data;
  },

  async removeEmployee(settlementId: string, detailId: string): Promise<void> {
    await hrClient.delete(`/payroll-settlements/${settlementId}/details/${detailId}`);
  },

  // ==================== CALCULATION ====================

  async calculate(settlementId: string): Promise<PayrollSettlement> {
    const response = await hrClient.post<PayrollSettlement>(
      `/payroll-settlements/${settlementId}/calculate`,
    );
    return response.data;
  },

  async recalculateEmployee(settlementId: string, detailId: string): Promise<PayrollSettlementDetail> {
    const response = await hrClient.post<PayrollSettlementDetail>(
      `/payroll-settlements/${settlementId}/details/${detailId}/recalculate`,
    );
    return response.data;
  },

  // ==================== WORKFLOW ====================

  async approve(settlementId: string): Promise<PayrollSettlement> {
    const response = await hrClient.post<PayrollSettlement>(
      `/payroll-settlements/${settlementId}/approve`,
    );
    return response.data;
  },

  async voidSettlement(settlementId: string, reason?: string): Promise<PayrollSettlement> {
    const response = await hrClient.post<PayrollSettlement>(
      `/payroll-settlements/${settlementId}/void`,
      { reason },
    );
    return response.data;
  },

  // ==================== PILA ====================

  async generatePila(settlementId: string): Promise<PilaGenerationResult> {
    const response = await hrClient.post<PilaGenerationResult>(
      `/payroll-settlements/${settlementId}/generate-pila`,
    );
    return response.data;
  },

  // ==================== PAYSLIPS ====================

  async sendPayslips(settlementId: string, employeeIds?: string[]): Promise<SendPayslipsResult> {
    const response = await hrClient.post<SendPayslipsResult>(
      `/payroll-settlements/${settlementId}/send-payslips`,
      { employee_ids: employeeIds },
    );
    return response.data;
  },

  // ==================== EMPLOYEE HISTORY ====================

  async getEmployeeHistory(employeeId: string, filters: EmployeeHistoryFilters = {}): Promise<EmployeeHistoryResponse> {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.settlement_type) params.settlement_type = filters.settlement_type;
    if (filters.year) params.year = String(filters.year);
    if (filters.month) params.month = String(filters.month);
    if (filters.page) params.page = String(filters.page);
    if (filters.limit) params.limit = String(filters.limit);

    const response = await hrClient.get<EmployeeHistoryResponse>(
      `/payroll-settlements/employee-history/${employeeId}`,
      { params },
    );
    return response.data;
  },
};
