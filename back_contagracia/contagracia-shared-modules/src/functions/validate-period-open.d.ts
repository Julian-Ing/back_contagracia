/**
 * Valida que exista un período contable abierto para la fecha dada.
 *
 * Reglas:
 * 1. Debe existir un período ANUAL que contenga la fecha
 * 2. El período anual debe estar OPEN o REOPENED
 * 3. Si existe un período MENSUAL para esa fecha:
 *    - Debe estar OPEN o REOPENED
 * 4. Si no existe período mensual, es válido (el anual abierto es suficiente)
 *
 * @param tenantDb - Cliente Prisma del tenant
 * @param date - Fecha de la operación contable
 * @throws BadRequestException si el período está cerrado o no existe
 */
export declare function validatePeriodOpen(tenantDb: any, date: Date): Promise<void>;
/**
 * Versión que retorna booleano en lugar de lanzar excepción.
 * Útil para validaciones en UI o lógica condicional.
 */
export declare function isPeriodOpen(tenantDb: any, date: Date): Promise<{
    isOpen: boolean;
    reason?: string;
    annualPeriod?: {
        id: string;
        name: string;
        status: string;
    };
    monthlyPeriod?: {
        id: string;
        name: string;
        status: string;
    } | null;
}>;
