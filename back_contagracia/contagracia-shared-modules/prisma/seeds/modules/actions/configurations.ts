import { ActionDef } from '../types';

// ===== MÓDULO 3: CONFIGURATIONS (18 permisos) =====
export const configurationsActions: ActionDef[] = [
    { action_key: 'config.view', action_name: 'Ver Configuraciones', description: 'Ver configuraciones' },
    { action_key: 'config.general.edit', action_name: 'Editar Config General', description: 'Editar config general' },
    { action_key: 'config.invoicing.edit', action_name: 'Configurar Facturación', description: 'Configurar facturación' },
    { action_key: 'config.accounting.edit', action_name: 'Configurar Contabilidad', description: 'Configurar contabilidad' },
    { action_key: 'config.inventory.edit', action_name: 'Configurar Inventario', description: 'Configurar inventario' },
    { action_key: 'config.payroll.edit', action_name: 'Configurar Nómina', description: 'Configurar nómina' },
    { action_key: 'config.security.edit', action_name: 'Configurar Seguridad', description: 'Configurar seguridad' },
    { action_key: 'config.notifications.edit', action_name: 'Configurar Notificaciones', description: 'Configurar notificaciones' },
    { action_key: 'config.integrations.manage', action_name: 'Gestionar Integraciones', description: 'Gestionar integraciones' },
    { action_key: 'config.import.chart_accounts', action_name: 'Importar Plan de Cuentas', description: 'Importar plan de cuentas' },
    { action_key: 'config.import.bank_accounts', action_name: 'Importar Cuentas Bancarias', description: 'Importar cuentas bancarias' },
    { action_key: 'config.import.terceros', action_name: 'Importar Terceros', description: 'Importar terceros' },
    { action_key: 'config.import.employees', action_name: 'Importar Empleados', description: 'Importar empleados' },
    { action_key: 'config.import.inventory', action_name: 'Importar Inventario', description: 'Importar inventario' },
    { action_key: 'config.import.invoices', action_name: 'Importar Facturas', description: 'Importar facturas' },
    { action_key: 'config.import.purchases', action_name: 'Importar Compras', description: 'Importar compras' },
    { action_key: 'config.import.expenses', action_name: 'Importar Gastos', description: 'Importar gastos' },
    { action_key: 'config.import.journal_entries', action_name: 'Importar Asientos', description: 'Importar asientos' },
  ];
