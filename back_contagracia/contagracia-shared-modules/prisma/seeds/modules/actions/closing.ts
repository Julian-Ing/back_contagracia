import { ActionDef } from '../types';

// ===== MÓDULO 21: CLOSING - Cierre Contable (10 permisos) =====
export const closingActions: ActionDef[] = [
    // General
    { action_key: 'closing.view', action_name: 'Ver Cierres', description: 'Ver módulo de cierres' },
    { action_key: 'closing.periods.view', action_name: 'Ver Períodos', description: 'Ver períodos contables' },
    // Períodos mensuales
    { action_key: 'closing.monthly.create', action_name: 'Crear Período Mensual', description: 'Crear período mensual' },
    { action_key: 'closing.monthly.edit', action_name: 'Editar Período Mensual', description: 'Editar período mensual' },
    { action_key: 'closing.monthly.close', action_name: 'Cerrar Período Mensual', description: 'Cerrar período mensual' },
    { action_key: 'closing.monthly.reopen', action_name: 'Reabrir Período Mensual', description: 'Reabrir período mensual' },
    // Períodos anuales
    { action_key: 'closing.annual.create', action_name: 'Crear Período Anual', description: 'Crear período anual' },
    { action_key: 'closing.annual.edit', action_name: 'Editar Período Anual', description: 'Editar período anual' },
    { action_key: 'closing.annual.close', action_name: 'Cerrar Período Anual', description: 'Cierre anual (mueve cuentas 4/5/6)' },
    { action_key: 'closing.annual.reopen', action_name: 'Reabrir Período Anual', description: 'Reabrir período anual' },
  ];
