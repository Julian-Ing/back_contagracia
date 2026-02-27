import { ActionDef } from '../types';

// ===== MÓDULO 8: CASH_REGISTERS - Cajas (12 permisos) =====
export const cash_registersActions: ActionDef[] = [
    { action_key: 'cash_registers.view', action_name: 'Ver Cajas', description: 'Ver cajas registradoras' },
    { action_key: 'cash_registers.create', action_name: 'Crear Caja', description: 'Crear nueva caja' },
    { action_key: 'cash_registers.edit', action_name: 'Editar Caja', description: 'Editar configuración de caja' },
    { action_key: 'cash_registers.activate', action_name: 'Activar Caja', description: 'Activar caja' },
    { action_key: 'cash_registers.deactivate', action_name: 'Desactivar Caja', description: 'Desactivar caja' },
    { action_key: 'cash_sessions.view', action_name: 'Ver Sesiones', description: 'Ver sesiones de caja' },
    { action_key: 'cash_sessions.open', action_name: 'Abrir Caja', description: 'Abrir sesión de caja' },
    { action_key: 'cash_sessions.close', action_name: 'Cerrar Caja', description: 'Cerrar sesión de caja' },
    { action_key: 'cash_sessions.movements.view', action_name: 'Ver Movimientos', description: 'Ver movimientos de caja' },
    { action_key: 'cash_sessions.movements.create', action_name: 'Crear Movimiento', description: 'Crear movimiento de caja' },
    { action_key: 'cash_sessions.report', action_name: 'Generar Reporte Cierre', description: 'Generar reporte de cierre' },
  ];
