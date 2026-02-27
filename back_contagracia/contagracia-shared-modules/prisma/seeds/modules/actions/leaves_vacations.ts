import { ActionDef } from '../types';

// ===== MÓDULO 26: LEAVES_VACATIONS - Vacaciones y Ausencias (12 permisos) =====
export const leaves_vacationsActions: ActionDef[] = [
    { action_key: 'leaves.view', action_name: 'Ver Ausencias', description: 'Ver ausencias' },
    { action_key: 'leaves.request', action_name: 'Solicitar Ausencia', description: 'Solicitar ausencia' },
    { action_key: 'leaves.create', action_name: 'Crear Ausencia', description: 'Crear ausencia (admin)' },
    { action_key: 'leaves.edit', action_name: 'Editar Ausencia', description: 'Editar ausencia' },
    { action_key: 'leaves.delete', action_name: 'Eliminar Ausencia', description: 'Eliminar ausencia' },
    { action_key: 'leaves.approve', action_name: 'Aprobar Ausencia', description: 'Aprobar ausencia' },
    { action_key: 'leaves.reject', action_name: 'Rechazar Ausencia', description: 'Rechazar ausencia' },
    { action_key: 'leaves.manage_all', action_name: 'Gestionar Todas', description: 'Gestionar todas las ausencias' },
    { action_key: 'vacations.view', action_name: 'Ver Vacaciones', description: 'Ver vacaciones' },
    { action_key: 'vacations.balance.view', action_name: 'Ver Saldo Vacaciones', description: 'Ver saldo vacaciones' },
    { action_key: 'vacations.calculate', action_name: 'Calcular Vacaciones', description: 'Calcular vacaciones' },
    { action_key: 'leaves.export', action_name: 'Exportar Ausencias', description: 'Exportar ausencias' },
  ];
