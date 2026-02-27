import { ActionDef } from '../types';

// ===== MÓDULO 35: HR_PORTAL - Portal del Empleado (4 permisos) =====
// Estos permisos son para autoservicio: el empleado solo ve SUS propios datos.
// Los permisos de administración (ver datos de todos) están en core_hr, hr_payroll, etc.
export const hr_portalActions: ActionDef[] = [
    { action_key: 'portal.profile.view',  action_name: 'Ver Mi Perfil',    description: 'Ver propio perfil laboral: cargo, fechas, datos básicos' },
    { action_key: 'portal.contract.view', action_name: 'Ver Mi Contrato',  description: 'Ver propio contrato activo: tipo, fechas, salario' },
    { action_key: 'portal.leaves.view',   action_name: 'Ver Mis Ausencias', description: 'Ver propias solicitudes de ausencia y vacaciones' },
    // payslips.view (hr_payroll.ts) se reutiliza para ver mis propios desprendibles
];
