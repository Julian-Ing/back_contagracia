/**
 * Módulo HR - Recursos Humanos
 * Exporta tipos, servicios, hooks y componentes para gestión de empleados
 */

// Types
export * from './types';

// Services
export { employeesService } from './services/employees.service';
export { payrollSettlementsService } from './services/payroll-settlements.service';

// Hooks
export { useEmployees } from './hooks/useEmployees';
export { useSocialSecurityEntities } from './hooks/useSocialSecurityEntities';
export { usePayrollSettlements } from './hooks/usePayrollSettlements';

// Components
export { EmployeesList, EmployeeForm, EmployeeDetail, NewContractModal, ChangeSalaryModal, EditContractModal, RenewContractModal, TerminateModal } from './components';
export { SettlementsList, SettlementDetail, CreateSettlementModal, EmployeePayrollDetail, AddEmployeesModal } from './components';
