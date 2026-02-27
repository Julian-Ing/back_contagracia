import { ActionDef } from '../types';

// ===== MÓDULO 25: TIME_ATTENDANCE - Control de Tiempo (17 permisos) =====
export const time_attendanceActions: ActionDef[] = [
    // --- Asistencia: Admin (gestionar asistencia de cualquier empleado) ---
    { action_key: 'attendance.view', action_name: 'Ver Asistencia (Todos)', description: 'Ver asistencia de todos los empleados' },
    { action_key: 'attendance.register_checkin', action_name: 'Marcar Entrada (Admin)', description: 'Marcar entrada de cualquier empleado' },
    { action_key: 'attendance.register_checkout', action_name: 'Marcar Salida (Admin)', description: 'Marcar salida de cualquier empleado' },
    { action_key: 'attendance.edit', action_name: 'Editar Registro', description: 'Editar registro de asistencia' },
    { action_key: 'attendance.reports.view', action_name: 'Ver Reportes', description: 'Ver reportes de asistencia' },
    { action_key: 'attendance.export', action_name: 'Exportar Asistencia', description: 'Exportar asistencia' },

    // --- Asistencia: Self-service (empleado gestiona su propia asistencia) ---
    { action_key: 'attendance.self_view', action_name: 'Ver Mi Asistencia', description: 'Ver mi propia asistencia' },
    { action_key: 'attendance.self_checkin', action_name: 'Marcar Mi Entrada', description: 'Marcar mi propia entrada' },
    { action_key: 'attendance.self_checkout', action_name: 'Marcar Mi Salida', description: 'Marcar mi propia salida' },

    // --- Horas Extras: Admin ---
    { action_key: 'overtime.view', action_name: 'Ver Horas Extras (Todos)', description: 'Ver horas extras de todos' },
    { action_key: 'overtime.create', action_name: 'Registrar Horas Extras (Admin)', description: 'Registrar horas extras de cualquier empleado' },
    { action_key: 'overtime.edit', action_name: 'Editar Horas Extras', description: 'Editar horas extras' },
    { action_key: 'overtime.delete', action_name: 'Eliminar Horas Extras', description: 'Eliminar horas extras' },
    { action_key: 'overtime.approve', action_name: 'Aprobar Horas Extras', description: 'Aprobar horas extras' },
    { action_key: 'overtime.reject', action_name: 'Rechazar Horas Extras', description: 'Rechazar horas extras' },

    // --- Horas Extras: Self-service ---
    { action_key: 'overtime.self_request', action_name: 'Solicitar Mis Horas Extras', description: 'Solicitar horas extras propias' },
  ];
