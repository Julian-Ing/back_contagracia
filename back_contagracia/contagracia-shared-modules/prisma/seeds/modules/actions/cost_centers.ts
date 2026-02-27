import { ActionDef } from '../types';

// ===== MÓDULO 19: COST_CENTERS - Centros de Costos (12 permisos) =====
export const cost_centersActions: ActionDef[] = [
    { action_key: 'cost_centers.view', action_name: 'Ver Centros de Costos', description: 'Ver listado y detalle de centros de costos' },
    { action_key: 'cost_centers.create', action_name: 'Crear Centro', description: 'Crear centro de costos' },
    { action_key: 'cost_centers.edit', action_name: 'Editar Centro', description: 'Editar centro de costos' },
    { action_key: 'cost_centers.delete', action_name: 'Eliminar Centro', description: 'Eliminar centro de costos' },
    { action_key: 'cost_centers.movements.view', action_name: 'Ver Movimientos', description: 'Ver movimientos de centros de costos' },
    { action_key: 'cost_centers.projections.view', action_name: 'Ver Proyecciones', description: 'Ver listado y detalle de proyecciones' },
    { action_key: 'cost_centers.projections.create', action_name: 'Crear Proyección', description: 'Crear proyección/presupuesto' },
    { action_key: 'cost_centers.projections.edit', action_name: 'Editar Proyección', description: 'Editar proyección' },
    { action_key: 'cost_centers.projections.delete', action_name: 'Eliminar Proyección', description: 'Eliminar proyección' },
    { action_key: 'cost_centers.comparison.view', action_name: 'Ver Real vs Presupuesto', description: 'Ver comparación proyectado vs real' },
    { action_key: 'cost_centers.reports.view', action_name: 'Ver Reportes', description: 'Ver reportes de centros de costos' },
    { action_key: 'cost_centers.export', action_name: 'Exportar Datos', description: 'Exportar datos de centros de costos' },
  ];
