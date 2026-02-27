/**
 * Crea un movimiento de centro de costos dentro de una transacción existente.
 *
 * Debe llamarse DENTRO de una transacción (tx) para que si algo falla
 * en el proceso padre, el movimiento se revierta automáticamente.
 *
 * @param tx - Cliente de transacción de Prisma
 * @param data - Datos del movimiento
 * @returns El movimiento creado
 */
export interface CreateCostCenterMovementData {
    cost_center_id: string;
    movement_date: Date;
    type_key: string;
    reference_type_key: string;
    sign: 'POSITIVE' | 'NEGATIVE';
    amount: number | string;
    reference_id?: string;
    description?: string;
}
export declare function createCostCenterMovement(tx: any, data: CreateCostCenterMovementData): Promise<any>;
