import { ActionDef } from '../types';

// ===== MÓDULO 20: TAX - Impuestos (17 permisos) =====
export const taxActions: ActionDef[] = [
    { action_key: 'tax.view', action_name: 'Ver Impuestos', description: 'Ver configuración tributaria' },
    { action_key: 'tax.configure', action_name: 'Configurar Impuestos', description: 'Configurar impuestos' },
    { action_key: 'tax.rates.view', action_name: 'Ver impuestos', description: 'Ver impuestos' },
    { action_key: 'tax.rates.create', action_name: 'Crear impuesto', description: 'Crear impuesto' },
    { action_key: 'tax.rates.edit', action_name: 'Editar impuesto', description: 'Editar impuesto' },
    { action_key: 'tax.rates.activate', action_name: 'Activar impuesto', description: 'Activar impuesto' },
    { action_key: 'tax.rates.deactivate', action_name: 'Desactivar impuesto', description: 'Desactivar impuesto' },
    { action_key: 'tax.rates.delete', action_name: 'Eliminar impuesto', description: 'Eliminar impuesto' },
    { action_key: 'withholdings.view', action_name: 'Ver Retenciones', description: 'Ver retenciones' },
    { action_key: 'withholdings.create', action_name: 'Crear Retención', description: 'Crear retención' },
    { action_key: 'withholdings.export', action_name: 'Exportar Retenciones', description: 'Exportar retenciones' },
    { action_key: 'tax_calendar.view', action_name: 'Ver Calendario Tributario', description: 'Ver calendario tributario' },
    { action_key: 'tax_calendar.sync', action_name: 'Sincronizar Calendario', description: 'Sincronizar calendario' },
    { action_key: 'tax_payments.view', action_name: 'Ver Pagos Impuestos', description: 'Ver pagos de impuestos' },
    { action_key: 'tax_payments.create', action_name: 'Registrar Pago Impuesto', description: 'Registrar pago impuesto' },
    { action_key: 'tax_reports.view', action_name: 'Ver Reportes Tributarios', description: 'Ver reportes tributarios' },
    { action_key: 'tax_reports.generate', action_name: 'Generar Reportes', description: 'Generar reportes tributarios' },
  ];
