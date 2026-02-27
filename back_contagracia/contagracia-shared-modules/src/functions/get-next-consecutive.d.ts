/**
 * Obtiene el siguiente consecutivo con lock FOR UPDATE
 *
 * IMPORTANTE: Usar SOLO después de todas las validaciones y dentro de
 * la transacción donde se crea el registro, para no inflar el consecutivo
 * si algo falla.
 *
 * @param tx - Cliente de transacción de Prisma
 * @param type - Tipo de consecutivo (ej: 'journal_entry', 'bank_movement', 'product_category')
 * @returns Consecutivo formateado (ej: 'JE-000001', 'CAT-0001')
 */
export declare function getNextConsecutive(tx: any, type: string): Promise<string>;
