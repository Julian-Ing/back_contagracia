/**
 * Tipos para el módulo de HR - Empleados
 * Los empleados son ThirdParty con rol EMPLOYEE (datos directos en ThirdParty)
 */

// Estados del empleado
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

// Tipos de cuenta bancaria
export type BankAccountType = 'CHECKING' | 'SAVINGS';

// Tipos de terminación de contrato
export type TerminationType =
  | 'MUTUO_ACUERDO'
  | 'JUSTA_CAUSA_EMPLEADOR'
  | 'JUSTA_CAUSA_TRABAJADOR'
  | 'SIN_JUSTA_CAUSA'
  | 'EXPIRACION_PLAZO'
  | 'OBRA_COMPLETADA'
  | 'RENUNCIA';

export const TERMINATION_TYPE_LABELS: Record<TerminationType, string> = {
  MUTUO_ACUERDO: 'Mutuo acuerdo',
  JUSTA_CAUSA_EMPLEADOR: 'Justa causa (empleador)',
  JUSTA_CAUSA_TRABAJADOR: 'Justa causa (trabajador)',
  SIN_JUSTA_CAUSA: 'Sin justa causa',
  EXPIRACION_PLAZO: 'Expiración del plazo',
  OBRA_COMPLETADA: 'Obra completada',
  RENUNCIA: 'Renuncia',
};

// Razón de terminación para liquidaciones (valores del motor de cálculo)
export type SettlementTerminationReason =
  | 'SIN_JUSTA_CAUSA'
  | 'JUSTA_CAUSA'
  | 'MUTUO_ACUERDO'
  | 'RENUNCIA'
  | 'VENCIMIENTO_CONTRATO';

export const SETTLEMENT_TERMINATION_REASON_LABELS: Record<SettlementTerminationReason, string> = {
  SIN_JUSTA_CAUSA: 'Sin Justa Causa',
  JUSTA_CAUSA: 'Con Justa Causa',
  MUTUO_ACUERDO: 'Mutuo Acuerdo',
  RENUNCIA: 'Renuncia',
  VENCIMIENTO_CONTRATO: 'Vencimiento de Contrato',
};

// Tipos de salario
export type SalaryType = 'ORDINARIO' | 'INTEGRAL';

export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  ORDINARIO: 'Ordinario',
  INTEGRAL: 'Integral',
};

// Labels de estados
export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  ON_LEAVE: 'En Licencia',
  TERMINATED: 'Terminado',
};

// Colores por estado
export const EMPLOYEE_STATUS_COLORS: Record<EmployeeStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  ON_LEAVE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  TERMINATED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// ==================== INTERFACES PRINCIPALES ====================

// Contrato de empleado
export interface EmployeeContract {
  id: string;
  third_party_id: string;
  contract_number?: string | null;
  contract_type_id?: string | null;
  worker_type_id?: string | null;
  worker_subtype_id?: string | null;
  position?: string | null;
  probation_days?: number | null;
  includes_transport: boolean;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  termination_date?: string | null;
  termination_reason?: string | null;
  termination_type?: TerminationType | null;
  observations?: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones expandidas
  contract_type?: { id: string; name: string } | null;
  worker_type?: { id: string; name: string; code: string } | null;
  worker_subtype?: { id: string; name: string; code: string } | null;
  salary_history?: SalaryRecord[];
}

// Registro de salario
export interface SalaryRecord {
  id: string;
  third_party_id: string;
  contract_id?: string | null;
  salary: number;
  salary_type: SalaryType;
  transportation_allowance?: number | null;
  variable_salary: boolean;
  effective_date: string;
  end_date?: string | null;
  is_current: boolean;
  reason?: string | null;
  created_at: string;
}

// Interface principal de Empleado (ThirdParty con rol EMPLOYEE, datos planos)
export interface Employee {
  id: string; // ThirdParty ID

  // Datos de tercero (antes en EmployeeThirdParty)
  name: string | null;
  identification_number: string | null;
  dv?: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  first_name?: string | null;
  second_name?: string | null;
  first_surname?: string | null;
  second_surname?: string | null;
  is_active: boolean;
  // IDs planos (para ThirdPartyForm en modo edición)
  type_organization_id?: string | null;
  type_document_identification_id?: string | null;
  type_regime_id?: string | null;
  type_liability_id?: string | null;
  department_id?: string | null;
  municipality_id?: string | null;
  roles?: string[];

  // Datos laborales del empleado
  hire_date: string;
  employee_status: EmployeeStatus;
  is_administrative: boolean;
  commission_rate?: number | null;

  // IDs de organización
  director_id?: string | null;
  cost_center_id?: string | null;
  payment_method_id?: string | null;

  // IDs de seguridad social
  eps_id?: string | null;
  pension_fund_id?: string | null;
  arl_id?: string | null;
  arl_risk_class_id?: string | null;
  compensation_fund_id?: string | null;
  severance_fund_id?: string | null;

  // Datos bancarios
  bank_name?: string | null;
  bank_account_type?: BankAccountType | null;
  bank_account_number?: string | null;

  // IDs de referencias actuales
  current_contract_id?: string | null;
  current_salary_id?: string | null;

  created_at: string;
  updated_at: string;

  // Relaciones expandidas de tercero
  type_document_identification?: { id: string; name: string; code: string } | null;
  department?: { id: string; name: string } | null;
  municipality?: { id: string; name: string } | null;
  tenant_user?: { id: string; email: string; is_active: boolean } | null;

  // Relaciones expandidas de empleado
  director?: { id: string; name: string; identification_number: string } | null;
  cost_center?: { id: string; name: string; consecutive: string } | null;
  payment_method?: { id: string; name: string } | null;
  eps?: { id: string; name: string; identification_number: string } | null;
  pension_fund?: { id: string; name: string; identification_number: string } | null;
  arl?: { id: string; name: string; identification_number: string } | null;
  arl_risk_class?: { id: string; name: string; rate: number } | null;
  compensation_fund?: { id: string; name: string; identification_number: string } | null;
  severance_fund?: { id: string; name: string; identification_number: string } | null;

  // Contrato y salario actual
  current_contract?: EmployeeContract | null;
  current_salary?: SalaryRecord | null;

  // Historiales (en detalle)
  contracts?: EmployeeContract[];
  salary_history?: SalaryRecord[];
}

// ==================== DTOs ====================

// DTO para crear empleado
export interface CreateEmployeeDto {
  // Datos básicos de tercero
  name: string;
  type_organization_id?: string;
  type_document_identification_id?: string;
  identification_number: string;
  dv?: string;
  email?: string;
  phone?: string;
  address?: string;
  first_name?: string;
  second_name?: string;
  first_surname?: string;
  second_surname?: string;
  department_id?: string;
  municipality_id?: string;

  // Datos laborales
  hire_date: string;
  is_administrative?: boolean;
  director_id?: string;
  cost_center_id?: string;
  payment_method_id?: string;

  // Seguridad social
  eps_id?: string;
  pension_fund_id?: string;
  arl_id?: string;
  arl_risk_id?: string;
  compensation_fund_id?: string;
  severance_fund_id?: string;

  // Datos bancarios
  bank_name?: string;
  bank_account_type?: BankAccountType;
  bank_account_number?: string;

  // Contrato inicial
  contract_type_id?: string;
  worker_type_id?: string;
  worker_subtype_id?: string;
  position?: string;
  probation_days?: number;
  includes_transport?: boolean;
  contract_end_date?: string;

  // Salario inicial
  salary: number;
  salary_type?: SalaryType;
  transportation_allowance?: number;
  variable_salary?: boolean;

  // Cuenta de usuario (opcional)
  create_system_account?: boolean;
  system_email?: string;
  system_password?: string;
  system_role_id?: string;
  existing_user_id?: string;
}

// Rol del sistema
export interface SystemRole {
  id: string;
  role_key: string;
  role_name: string;
  description?: string;
  is_system: boolean;
}

// Usuario sin vincular
export interface UnlinkedUser {
  id: string;
  email: string;
  full_name: string;
  role?: { role_name: string };
}

// DTO para vincular usuario a empleado
export interface LinkUserDto {
  create_system_account?: boolean;
  system_email?: string;
  system_password?: string;
  system_role_id?: string;
  existing_user_id?: string;
}

// Respuesta de vincular/desvincular usuario
export interface LinkUserResponse {
  message: string;
  user?: { id: string; email: string; is_active: boolean };
}

// DTO para actualizar empleado (sin contrato ni salario)
export interface UpdateEmployeeDto {
  // Datos básicos
  name?: string;
  type_organization_id?: string;
  type_document_identification_id?: string;
  dv?: string;
  email?: string;
  phone?: string;
  address?: string;
  first_name?: string;
  second_name?: string;
  first_surname?: string;
  second_surname?: string;
  department_id?: string;
  municipality_id?: string;

  // Datos laborales
  hire_date?: string;
  is_administrative?: boolean;
  director_id?: string;
  cost_center_id?: string;
  payment_method_id?: string;

  // Seguridad social
  eps_id?: string;
  pension_fund_id?: string;
  arl_id?: string;
  arl_risk_id?: string;
  compensation_fund_id?: string;
  severance_fund_id?: string;

  // Datos bancarios
  bank_name?: string;
  bank_account_type?: BankAccountType;
  bank_account_number?: string;
}

// DTO para crear contrato
export interface CreateContractDto {
  contract_type_id?: string;
  worker_type_id?: string;
  worker_subtype_id?: string;
  position?: string;
  probation_days?: number;
  includes_transport?: boolean;
  start_date: string;
  end_date?: string;
  observations?: string;
  // Salario inicial del nuevo contrato (opcional, si se omite se mantiene el actual)
  salary?: number;
  salary_type?: SalaryType;
  transportation_allowance?: number;
  variable_salary?: boolean;
}

// DTO para renovar contrato
export interface RenewContractDto {
  start_date: string;
  end_date?: string;
  observations?: string;
}

// DTO para actualizar salario
export interface UpdateSalaryDto {
  salary: number;
  salary_type?: SalaryType;
  transportation_allowance?: number;
  variable_salary?: boolean;
  effective_date?: string;
  reason?: string;
}

// DTO para terminar empleado
export interface TerminateEmployeeDto {
  termination_date?: string;
  termination_reason?: string;
  termination_type?: TerminationType;
}

// DTO para actualizar estado
export interface UpdateStatusDto {
  status: EmployeeStatus;
}

// ==================== RESPONSES ====================

// Response paginado
export interface EmployeesResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filtros de búsqueda
export interface EmployeeFilters {
  search?: string;
  status?: EmployeeStatus;
  contract_type_id?: string;
  worker_type_id?: string;
  cost_center_id?: string;
  is_active?: boolean;
  is_administrative?: boolean;
  eps_id?: string;
  pension_fund_id?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Estadísticas de empleados
export interface EmployeeStats {
  total: number;
  by_status: {
    ACTIVE: number;
    INACTIVE: number;
    ON_LEAVE: number;
    TERMINATED: number;
  };
  administrative: number;
  total_salary: number;
  average_salary: number;
}

// Resultado de verificar existencia
export interface EmployeeExistsResult {
  exists: boolean;
  is_employee?: boolean;
  third_party?: {
    id: string;
    name: string;
    identification_number: string;
    email: string | null;
    phone: string | null;
    employee_status?: EmployeeStatus;
  } | null;
}

// ==================== PARAMÉTRICAS ====================

// Entidad de seguridad social (ThirdParty con rol específico)
export interface SocialSecurityEntity {
  id: string;
  name: string;
  identification_number: string | null;
  codigo_pila?: string | null;
  is_active: boolean;
}

// Tipo de contrato
export interface ContractType {
  id: string;
  code: string;
  name: string;
}

// Tipo de trabajador
export interface WorkerType {
  id: string;
  code: string;
  name: string;
}

// Subtipo de trabajador
export interface WorkerSubtype {
  id: string;
  code: string;
  name: string;
  worker_type_id: string;
}

// Riesgo ARL
export interface ArlRisk {
  id: string;
  name: string;
  code?: string;
  risk_class?: number;
  rate: number;
}

// Centro de costo
export interface CostCenter {
  id: string;
  name: string;
  consecutive: string;
  description?: string | null;
}

// ==================== LIQUIDACIONES DE NÓMINA ====================

export type SettlementType = 'REGULAR' | 'PRIMA' | 'CESANTIAS' | 'VACACIONES' | 'TERMINACION';

export const SETTLEMENT_TYPE_LABELS: Record<SettlementType, string> = {
  REGULAR: 'Regular',
  PRIMA: 'Prima de Servicios',
  CESANTIAS: 'Cesantias',
  VACACIONES: 'Vacaciones',
  TERMINACION: 'Terminacion',
};

export type SettlementStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'CANCELLED';

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  DRAFT: 'Borrador',
  CALCULATED: 'Calculada',
  APPROVED: 'Aprobada',
  PAID: 'Pagada',
  CANCELLED: 'Anulada',
};

export const SETTLEMENT_STATUS_COLORS: Record<SettlementStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  CALCULATED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export interface PayrollSettlement {
  id: string;
  settlement_name: string;
  settlement_number: string | null;
  settlement_type: SettlementType;
  start_date: string;
  end_date: string;
  payment_date: string | null;
  status: SettlementStatus;
  liquidate_prima: boolean;
  liquidate_cesantias: boolean;
  liquidate_cesantias_interest: boolean;
  liquidate_vacaciones: boolean;
  total_employees: number;
  total_accrued: number;
  total_deductions: number;
  total_net_salary: number;
  total_employer_contributions: number;
  total_provisions: number;
  total_payroll_cost: number;
  is_last_of_month: boolean;
  year: number;
  month: number;
  period_number: number;
  termination_reason: string | null;
  notes: string | null;
  calculated_at: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  _count?: { details: number };
  details?: PayrollSettlementDetailSummary[];
}

export interface PayrollSettlementDetailSummary {
  id: string;
  third_party_id: string;
  employee_name: string;
  employee_document: string | null;
  employee_position: string | null;
  employee_base_salary: number;
  employee_salary_type: string;
  days_worked: number;
  total_accrued: number;
  total_deductions: number;
  net_salary: number;
  total_employer_contributions: number;
  total_provisions: number;
  total_cost: number;
  status: SettlementStatus;
  error_message: string | null;
  payroll_data?: PayrollData | null;
}

export interface PayrollSettlementDetail extends PayrollSettlementDetailSummary {
  payroll_settlement_id: string;
  employee_contract_type: string | null;
  employee_worker_type_code: string | null;
  employee_worker_subtype_code: string | null;
  employee_is_administrative: boolean;
  employee_arl_rate: number | null;
  employee_includes_transport: boolean;
  hours_worked: number | null;
  payroll_data: PayrollData | null;
  notes: string | null;
}

export interface PayrollOvertimeEntry {
  type: string;
  quantity: number;
  rate: number;
  payment: number;
}

export interface PayrollConceptEntry {
  concept_code: string;
  concept_name: string;
  amount: number;
}

export interface PayrollData {
  accrued: {
    worked_days: number;
    salary: number;
    transportation_allowance: number;
    HEDs: PayrollOvertimeEntry[];
    HENs: PayrollOvertimeEntry[];
    HEDDFs: PayrollOvertimeEntry[];
    HENDFs: PayrollOvertimeEntry[];
    HRNs: PayrollOvertimeEntry[];
    HRDDFs: PayrollOvertimeEntry[];
    HRNDFs: PayrollOvertimeEntry[];
    vacation_entries: { leave_type: string; days: number; amount: number }[];
    bonuses: number;
    aids: number;
    other_income: number;
    commissions: number;
    other_concepts: PayrollConceptEntry[];
    accrued_total: number;
  };
  deductions: {
    eps_deduction: number;
    pension_deduction: number;
    fondosp_deduction_SP: number;
    withholding_at_source: number;
    other_deductions: PayrollConceptEntry[];
    deductions_total: number;
  };
  employer_contributions: {
    employer_health: number;
    employer_pension: number;
    arl: number;
    ccf: number;
    icbf: number;
    sena: number;
    total_employer_contributions: number;
  };
  provisions: {
    vacation_provision: number;
    severance_provision: number;
    severance_interest_provision: number;
    service_bonus_provision: number;
    total_provisions: number;
  };
  metadata: {
    ibc: number;
    salary_type: string;
    smlv: number;
    uvt_value: number;
    transportation_limit: number;
    exoneration_applied: boolean;
    // Deduction rates (employee)
    eps_rate?: number;
    pension_rate?: number;
    fsp_rate?: number;
    // Employer contribution rates
    employer_health_rate?: number;
    employer_pension_rate?: number;
    arl_rate?: number | null;
    ccf_rate?: number;
    icbf_rate?: number;
    sena_rate?: number;
    // Provision rates (from PayrollConcept)
    vacation_provision_rate?: number;
    severance_provision_rate?: number;
    severance_interest_provision_rate?: number;
    service_bonus_provision_rate?: number;
    // Worker type info
    worker_type_code?: string | null;
    worker_subtype_code?: string | null;
  };
}

export interface CreateSettlementDto {
  settlement_name: string;
  settlement_type?: SettlementType;
  start_date: string;
  end_date: string;
  payment_date?: string;
  period_number?: number;
  liquidate_prima?: boolean;
  liquidate_cesantias?: boolean;
  liquidate_cesantias_interest?: boolean;
  liquidate_vacaciones?: boolean;
  termination_reason?: SettlementTerminationReason;
  employee_ids?: string[];
  notes?: string;
}

export type PayFrequency = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

// UI-only form state extending the DTO with computed fields
export interface CreateSettlementFormState extends CreateSettlementDto {
  year: number;
  month: number;
  semester: 'first' | 'second' | '';
  salary_had_variations: boolean | null; // null = auto-detect
  pay_frequency: PayFrequency;
}

export interface UpdateSettlementDto {
  settlement_name?: string;
  start_date?: string;
  end_date?: string;
  payment_date?: string;
  period_number?: number;
  liquidate_prima?: boolean;
  liquidate_cesantias?: boolean;
  liquidate_cesantias_interest?: boolean;
  liquidate_vacaciones?: boolean;
  notes?: string;
}

export interface SettlementFilters {
  status?: SettlementStatus;
  settlement_type?: SettlementType;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SettlementsResponse {
  data: PayrollSettlement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== PILA ====================

export interface PilaGenerationResult {
  file_name: string;
  file_content: string;
  total_employees: number;
  total_contribution: number;
  period: string;
}

// ==================== PAYSLIPS ====================

export interface SendPayslipsResult {
  total: number;
  sent: number;
  failed: number;
  results: {
    employee_name: string;
    email: string | null;
    status: 'sent' | 'no_email' | 'error';
  }[];
}

// ==================== EMPLOYEE PAYROLL HISTORY ====================

export interface EmployeePayrollHistoryRecord {
  id: string;
  third_party_id: string;
  employee_name: string;
  employee_document: string | null;
  employee_position: string | null;
  employee_base_salary: number;
  days_worked: number;
  total_accrued: number;
  total_deductions: number;
  net_salary: number;
  total_employer_contributions: number;
  total_provisions: number;
  total_cost: number;
  status: SettlementStatus;
  error_message: string | null;
  created_at: string;
  payroll_settlement: {
    id: string;
    settlement_name: string;
    settlement_type: SettlementType;
    status: SettlementStatus;
    start_date: string;
    end_date: string;
    year: number;
    month: number;
    period_number: number;
  };
}

export interface EmployeeHistoryFilters {
  status?: SettlementStatus;
  settlement_type?: SettlementType;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
}

export interface EmployeeHistoryResponse {
  data: EmployeePayrollHistoryRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
