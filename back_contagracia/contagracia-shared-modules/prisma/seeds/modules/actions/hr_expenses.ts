import { ActionDef } from '../types';

// ===== MÓDULO 28: HR_EXPENSES - Gastos de Empleados (9 permisos) =====
export const hr_expensesActions: ActionDef[] = [
    { action_key: 'hr_expenses.view', action_name: 'Ver Gastos Empleados', description: 'Ver gastos empleados' },
    { action_key: 'hr_expenses.request', action_name: 'Solicitar Anticipo', description: 'Solicitar anticipo' },
    { action_key: 'hr_expenses.create', action_name: 'Crear Gasto', description: 'Crear gasto (admin)' },
    { action_key: 'hr_expenses.edit', action_name: 'Editar Gasto', description: 'Editar gasto' },
    { action_key: 'hr_expenses.approve', action_name: 'Aprobar Gasto', description: 'Aprobar gasto' },
    { action_key: 'hr_expenses.reject', action_name: 'Rechazar Gasto', description: 'Rechazar gasto' },
    { action_key: 'hr_expenses.reimburse', action_name: 'Procesar Reembolso', description: 'Procesar reembolso' },
    { action_key: 'hr_expenses.export', action_name: 'Exportar Gastos', description: 'Exportar gastos' },
  ];
