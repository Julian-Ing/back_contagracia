import { ActionDef } from '../types';

// ===== MÓDULO 29: HR_PERFORMANCE - Evaluaciones (19 permisos) =====
export const hr_performanceActions: ActionDef[] = [
    { action_key: 'performance.view', action_name: 'Ver Evaluaciones', description: 'Ver evaluaciones de todos los empleados' },
    { action_key: 'performance.self_view', action_name: 'Ver Mis Evaluaciones', description: 'Ver mis propias evaluaciones' },
    { action_key: 'performance.create', action_name: 'Crear Evaluación', description: 'Crear evaluación' },
    { action_key: 'performance.edit', action_name: 'Editar Evaluación', description: 'Editar evaluación' },
    { action_key: 'performance.delete', action_name: 'Eliminar Evaluación', description: 'Eliminar evaluación' },
    { action_key: 'performance.complete', action_name: 'Completar Evaluación', description: 'Completar evaluación' },
    { action_key: 'performance.approve', action_name: 'Aprobar Evaluación', description: 'Aprobar evaluación' },
    { action_key: 'performance.auto_generate', action_name: 'Generar Automáticamente', description: 'Generar automáticamente' },
    { action_key: 'goals.view', action_name: 'Ver Objetivos', description: 'Ver objetivos' },
    { action_key: 'goals.create', action_name: 'Crear Objetivo', description: 'Crear objetivo' },
    { action_key: 'goals.edit', action_name: 'Editar Objetivo', description: 'Editar objetivo' },
    { action_key: 'goals.delete', action_name: 'Eliminar Objetivo', description: 'Eliminar objetivo' },
    { action_key: 'observations.view', action_name: 'Ver Observaciones', description: 'Ver observaciones de todos los empleados' },
    { action_key: 'observations.self_view', action_name: 'Ver Mis Observaciones', description: 'Ver mis propias observaciones' },
    { action_key: 'observations.create', action_name: 'Crear Observación', description: 'Crear observación' },
    { action_key: 'observations.edit', action_name: 'Editar Observación', description: 'Editar observación' },
    { action_key: 'observations.delete', action_name: 'Eliminar Observación', description: 'Eliminar observación' },
    { action_key: 'observations.send_report', action_name: 'Enviar Reporte', description: 'Enviar reporte observaciones' },
    { action_key: 'observations.export', action_name: 'Exportar Observaciones', description: 'Exportar observaciones' },
  ];
