import { ActionDef } from '../types';

// ===== MÓDULO 33: SHIFTS - Gestión de Turnos (19 permisos) =====
export const shiftsActions: ActionDef[] = [
  // --- Plantillas de turno: Admin ---
  { action_key: 'shifts.templates.view', action_name: 'Ver Plantillas de Turno', description: 'Ver todas las plantillas de turno configuradas' },
  { action_key: 'shifts.templates.create', action_name: 'Crear Plantilla de Turno', description: 'Crear nuevas plantillas de turno' },
  { action_key: 'shifts.templates.edit', action_name: 'Editar Plantilla de Turno', description: 'Editar plantillas de turno existentes' },
  { action_key: 'shifts.templates.delete', action_name: 'Eliminar Plantilla de Turno', description: 'Eliminar plantillas de turno' },

  // --- Programaciones: Admin ---
  { action_key: 'shifts.schedules.view', action_name: 'Ver Programaciones', description: 'Ver programaciones de turnos (semanales/mensuales)' },
  { action_key: 'shifts.schedules.create', action_name: 'Crear Programación', description: 'Crear nuevas programaciones de turnos' },
  { action_key: 'shifts.schedules.edit', action_name: 'Editar Programación', description: 'Editar programaciones existentes' },
  { action_key: 'shifts.schedules.publish', action_name: 'Publicar Programación', description: 'Publicar programación para que los empleados la vean' },
  { action_key: 'shifts.schedules.delete', action_name: 'Eliminar Programación', description: 'Eliminar programaciones de turnos' },

  // --- Asignaciones: Admin ---
  { action_key: 'shifts.assignments.view', action_name: 'Ver Asignaciones (Todos)', description: 'Ver asignaciones de turno de todos los empleados' },
  { action_key: 'shifts.assignments.create', action_name: 'Asignar Turno', description: 'Asignar turnos a empleados' },
  { action_key: 'shifts.assignments.edit', action_name: 'Editar Asignación', description: 'Editar asignaciones de turno existentes' },
  { action_key: 'shifts.assignments.delete', action_name: 'Eliminar Asignación', description: 'Eliminar asignaciones de turno' },

  // --- Intercambios: Admin ---
  { action_key: 'shifts.swaps.view', action_name: 'Ver Solicitudes de Intercambio', description: 'Ver todas las solicitudes de intercambio de turno' },
  { action_key: 'shifts.swaps.approve', action_name: 'Aprobar Intercambio', description: 'Aprobar solicitudes de intercambio de turno' },
  { action_key: 'shifts.swaps.reject', action_name: 'Rechazar Intercambio', description: 'Rechazar solicitudes de intercambio de turno' },

  // --- Rotaciones: Admin ---
  { action_key: 'shifts.rotations.view', action_name: 'Ver Patrones de Rotación', description: 'Ver patrones de rotación configurados' },
  { action_key: 'shifts.rotations.manage', action_name: 'Gestionar Rotaciones', description: 'Crear, editar y eliminar patrones de rotación' },

  // --- Exportación ---
  { action_key: 'shifts.export', action_name: 'Exportar Turnos', description: 'Exportar reporte de turnos y asignaciones' },

  // --- Self-service: Empleado gestiona sus propios turnos ---
  { action_key: 'shifts.self.view', action_name: 'Ver Mis Turnos', description: 'Ver mis turnos asignados' },
  { action_key: 'shifts.self.schedule_view', action_name: 'Ver Programación General', description: 'Ver la programación publicada de todo el equipo' },
  { action_key: 'shifts.self.swap_request', action_name: 'Solicitar Intercambio', description: 'Solicitar intercambio de turno con otro compañero' },
  { action_key: 'shifts.self.swap_cancel', action_name: 'Cancelar Mi Solicitud', description: 'Cancelar una solicitud de intercambio propia pendiente' },
  { action_key: 'shifts.self.confirm', action_name: 'Confirmar Mi Turno', description: 'Confirmar que he visto y acepto mi turno asignado' },
];
