"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companySettings = void 0;
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
exports.companySettings = [
    // ========== 0. GENERAL ==========
    {
        category: 'general',
        key: 'display_decimals',
        value: '2',
        value_type: 'number',
        description: 'Decimales a mostrar en UI (0-4). BD siempre guarda 4.',
        is_readonly: false,
    },
    // ========== 1. PARAMETROS LEGALES (legal_params) ==========
    {
        category: 'legal_params',
        key: 'smlv',
        value: '1423500',
        value_type: 'decimal',
        description: 'Salario Mínimo Legal Vigente 2025',
        is_readonly: false,
    },
    {
        category: 'legal_params',
        key: 'transportation_allowance',
        value: '200000',
        value_type: 'decimal',
        description: 'Auxilio de Transporte 2025',
        is_readonly: false,
    },
    {
        category: 'legal_params',
        key: 'uvt_value_2025',
        value: '49799',
        value_type: 'decimal',
        description: 'Valor UVT 2025 (DIAN)',
        is_readonly: false,
    },
    {
        category: 'legal_params',
        key: 'uvt_value_2026',
        value: '51203',
        value_type: 'decimal',
        description: 'Valor UVT 2026 (DIAN)',
        is_readonly: false,
    },
    // ========== 2. UMBRALES SEGURIDAD SOCIAL (social_security) ==========
    {
        category: 'social_security',
        key: 'fsp_threshold_smmlv',
        value: '4',
        value_type: 'number',
        description: 'Umbral FSP (solo pagan si > 4 SMMLV)',
        is_readonly: false,
    },
    {
        category: 'social_security',
        key: 'exoneration_threshold_smmlv',
        value: '10',
        value_type: 'number',
        description: 'Umbral exoneración ICBF/SENA (Ley 1607/2012)',
        is_readonly: false,
    },
    {
        category: 'social_security',
        key: 'exoneration_enabled',
        value: 'true',
        value_type: 'boolean',
        description: 'Exoneración parafiscales habilitada',
        is_readonly: false,
    },
    // ========== 3. LIMITES HORAS EXTRAS (overtime) ==========
    {
        category: 'overtime',
        key: 'max_overtime_daily',
        value: '2',
        value_type: 'number',
        description: 'Máximo horas extras por día',
        is_readonly: false,
    },
    {
        category: 'overtime',
        key: 'max_overtime_weekly',
        value: '12',
        value_type: 'number',
        description: 'Máximo horas extras por semana',
        is_readonly: false,
    },
    // ========== 4. JORNADA LABORAL ESTANDAR (work_schedule) ==========
    {
        category: 'work_schedule',
        key: 'work_hours_per_day',
        value: '8',
        value_type: 'number',
        description: 'Horas de trabajo por día',
        is_readonly: false,
    },
    {
        category: 'work_schedule',
        key: 'work_days_per_month',
        value: '30',
        value_type: 'number',
        description: 'Días de trabajo por mes',
        is_readonly: false,
    },
    {
        category: 'work_schedule',
        key: 'week_start',
        value: '1',
        value_type: 'number',
        description: 'Inicio semana laboral (1=Lunes)',
        is_readonly: false,
    },
    {
        category: 'work_schedule',
        key: 'week_end',
        value: '5',
        value_type: 'number',
        description: 'Fin semana laboral (5=Viernes)',
        is_readonly: false,
    },
    // ========== 5. HORARIOS TURNOS Y LIMITES (work_hours) ==========
    {
        category: 'work_hours',
        key: 'day_start',
        value: '06:00',
        value_type: 'time',
        description: 'Jornada diurna - inicio',
        is_readonly: false,
    },
    {
        category: 'work_hours',
        key: 'day_end',
        value: '21:00',
        value_type: 'time',
        description: 'Jornada diurna - fin',
        is_readonly: false,
    },
    {
        category: 'work_hours',
        key: 'night_start',
        value: '21:00',
        value_type: 'time',
        description: 'Jornada nocturna - inicio',
        is_readonly: false,
    },
    {
        category: 'work_hours',
        key: 'night_end',
        value: '06:00',
        value_type: 'time',
        description: 'Jornada nocturna - fin',
        is_readonly: false,
    },
    {
        category: 'work_hours',
        key: 'max_daily_hours_legal',
        value: '8',
        value_type: 'number',
        description: 'Máx horas diarias (legal)',
        is_readonly: false,
    },
    {
        category: 'work_hours',
        key: 'max_weekly_hours_legal',
        value: '48',
        value_type: 'number',
        description: 'Máx horas semanales (legal)',
        is_readonly: false,
    },
    {
        category: 'work_hours',
        key: 'min_age_night_work',
        value: '18',
        value_type: 'number',
        description: 'Edad mínima trabajo nocturno',
        is_readonly: false,
    },
    // ========== 6. AUXILIO DE TRANSPORTE (transportation) ==========
    {
        category: 'transportation',
        key: 'auto_apply',
        value: 'true',
        value_type: 'boolean',
        description: 'Aplicar automáticamente',
        is_readonly: false,
    },
    {
        category: 'transportation',
        key: 'salary_limit',
        value: '2847000',
        value_type: 'decimal',
        description: 'Límite salarial (2 SMMLV)',
        is_readonly: false,
    },
    // ========== 7. NUMERACION NOMINA (payroll_numbering) ==========
    {
        category: 'payroll_numbering',
        key: 'prefix',
        value: 'NOM',
        value_type: 'string',
        description: 'Prefijo numeración',
        is_readonly: false,
    },
    {
        category: 'payroll_numbering',
        key: 'consecutive_start',
        value: '1',
        value_type: 'number',
        description: 'Consecutivo inicial',
        is_readonly: false,
    },
    // ========== 8. DIAN — Facturación Electrónica (dian) ==========
    {
        category: 'dian',
        key: 'api_dian_token',
        value: '',
        value_type: 'string',
        description: 'Token de autenticación API DIAN',
        is_readonly: true,
    },
    {
        category: 'dian',
        key: 'certificate_path',
        value: '',
        value_type: 'string',
        description: 'Ruta del archivo de certificado digital (.p12)',
        is_readonly: false,
    },
    {
        category: 'dian',
        key: 'certificate_password',
        value: '',
        value_type: 'string',
        description: 'Contraseña del certificado digital',
        is_readonly: false,
    },
    {
        category: 'dian',
        key: 'certificate_expires_at',
        value: '',
        value_type: 'string',
        description: 'Fecha de expiración del certificado digital',
        is_readonly: true,
    },
    // Software facturación
    {
        category: 'dian',
        key: 'invoice_software_id',
        value: '',
        value_type: 'string',
        description: 'ID del software de facturación electrónica',
        is_readonly: false,
    },
    {
        category: 'dian',
        key: 'invoice_software_pin',
        value: '',
        value_type: 'number',
        description: 'PIN del software de facturación (5 dígitos)',
        is_readonly: false,
    },
    {
        category: 'dian',
        key: 'invoice_test_set_id',
        value: '',
        value_type: 'string',
        description: 'Test Set ID de facturación electrónica',
        is_readonly: false,
    },
    {
        category: 'dian',
        key: 'invoice_dian_environment',
        value: '2',
        value_type: 'number',
        description: 'Ambiente DIAN facturación (1=producción, 2=pruebas)',
        is_readonly: false,
    },
    // Software nómina
    {
        category: 'dian',
        key: 'payroll_software_id',
        value: '',
        value_type: 'string',
        description: 'ID del software de nómina electrónica',
        is_readonly: false,
    },
    {
        category: 'dian',
        key: 'payroll_software_pin',
        value: '',
        value_type: 'number',
        description: 'PIN del software de nómina (5 dígitos)',
        is_readonly: false,
    },
    {
        category: 'dian',
        key: 'payroll_test_set_id',
        value: '',
        value_type: 'string',
        description: 'Test Set ID de nómina electrónica',
        is_readonly: false,
    },
    {
        category: 'dian',
        key: 'payroll_dian_environment',
        value: '2',
        value_type: 'number',
        description: 'Ambiente DIAN nómina (1=producción, 2=pruebas)',
        is_readonly: false,
    },
];
