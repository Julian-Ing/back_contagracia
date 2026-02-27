import { ActionDef } from '../types';

// ===== MÓDULO 32: REPORTS (20 permisos) =====
export const reportsActions: ActionDef[] = [
    { action_key: 'reports.view', action_name: 'Ver Reportes', description: 'Ver reportes' },
    { action_key: 'reports.financial.view', action_name: 'Ver Reportes Financieros', description: 'Ver reportes financieros' },
    { action_key: 'reports.income_statement.view', action_name: 'Ver Estado de Resultados', description: 'Ver estado de resultados' },
    { action_key: 'reports.balance_sheet.view', action_name: 'Ver Balance General', description: 'Ver balance general' },
    { action_key: 'reports.trial_balance.view', action_name: 'Ver Balance de Prueba', description: 'Ver balance de prueba' },
    { action_key: 'reports.equity_changes.view', action_name: 'Ver Cambios Patrimonio', description: 'Ver cambios patrimonio' },
    { action_key: 'reports.cash_flow.view', action_name: 'Ver Flujo de Caja', description: 'Ver flujo de caja' },
    { action_key: 'reports.sales.view', action_name: 'Ver Reportes Ventas', description: 'Ver reportes ventas' },
    { action_key: 'reports.purchases.view', action_name: 'Ver Reportes Compras', description: 'Ver reportes compras' },
    { action_key: 'reports.inventory.view', action_name: 'Ver Reportes Inventario', description: 'Ver reportes inventario' },
    { action_key: 'reports.hr.view', action_name: 'Ver Reportes RRHH', description: 'Ver reportes RRHH' },
    { action_key: 'reports.retentions.suppliers.view', action_name: 'Ver Retenciones Proveedores', description: 'Ver retenciones proveedores' },
    { action_key: 'reports.retentions.employees.view', action_name: 'Ver Retenciones Empleados', description: 'Ver retenciones empleados' },
    { action_key: 'reports.export', action_name: 'Exportar Reportes', description: 'Exportar reportes' },
    { action_key: 'reports.custom.create', action_name: 'Crear Reporte Personalizado', description: 'Crear reporte personalizado' },
    { action_key: 'reports.custom.edit', action_name: 'Editar Reporte Personalizado', description: 'Editar reporte personalizado' },
    { action_key: 'reports.custom.delete', action_name: 'Eliminar Reporte Personalizado', description: 'Eliminar reporte personalizado' },
    { action_key: 'reports.custom.execute', action_name: 'Ejecutar Reporte', description: 'Ejecutar reporte' },
    { action_key: 'audit_log.view', action_name: 'Ver Log Auditoría', description: 'Ver log auditoría' },
    { action_key: 'audit_log.export', action_name: 'Exportar Auditoría', description: 'Exportar auditoría' },
  ];
