import { ActionDef } from '../types';

// ===== MÓDULO 17: BANKING - Bancos (18 permisos) =====
export const bankingActions: ActionDef[] = [
    { action_key: 'bank_accounts.view', action_name: 'Ver Cuentas Bancarias', description: 'Ver cuentas bancarias' },
    { action_key: 'bank_accounts.create', action_name: 'Crear Cuenta Bancaria', description: 'Crear cuenta bancaria' },
    { action_key: 'bank_accounts.edit', action_name: 'Editar Cuenta Bancaria', description: 'Editar cuenta bancaria' },
    { action_key: 'bank_accounts.activate', action_name: 'Activar Cuenta', description: 'Activar cuenta' },
    { action_key: 'bank_accounts.deactivate', action_name: 'Desactivar Cuenta', description: 'Desactivar cuenta' },
    { action_key: 'bank_accounts.delete', action_name: 'Eliminar Cuenta Bancaria', description: 'Eliminar cuenta bancaria sin movimientos' },
    { action_key: 'bank_accounts.import', action_name: 'Importar Cuentas', description: 'Importar cuentas' },
    { action_key: 'bank_transactions.view', action_name: 'Ver Movimientos', description: 'Ver movimientos bancarios' },
    { action_key: 'bank_transactions.import', action_name: 'Importar Extractos', description: 'Importar extractos' },
    { action_key: 'bank_transactions.classify', action_name: 'Clasificar Movimientos', description: 'Clasificar movimientos' },
    { action_key: 'bank_reconciliation.view', action_name: 'Ver Conciliaciones', description: 'Ver conciliaciones' },
    { action_key: 'bank_reconciliation.create', action_name: 'Crear Conciliación', description: 'Crear conciliación' },
    { action_key: 'bank_reconciliation.edit', action_name: 'Editar Conciliación', description: 'Editar conciliación' },
    { action_key: 'bank_reconciliation.approve', action_name: 'Aprobar Conciliación', description: 'Aprobar conciliación' },
  ];
