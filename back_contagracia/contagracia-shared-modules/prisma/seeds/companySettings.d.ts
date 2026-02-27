/**
 * Configuración de Empresa
 * Usado por seed-all-tenants.ts para sembrar en cada tenant
 *
 * Categorías:
 * - general: Configuración general
 * - legal_params: Parámetros Legales (SMLV, auxilio, UVT)
 * - social_security: Umbrales de Seguridad Social
 * - overtime: Límites de Horas Extras
 * - work_schedule: Jornada Laboral Estándar
 * - work_hours: Horarios de Turnos y Límites Legales
 * - transportation: Auxilio de Transporte
 * - payroll_numbering: Numeración de Nómina
 * - dian: Configuración DIAN (Facturación Electrónica)
 */
export declare const companySettings: {
    category: string;
    key: string;
    value: string;
    value_type: string;
    description: string;
    is_readonly: boolean;
}[];
