"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCostCenterMovement = createCostCenterMovement;
async function createCostCenterMovement(tx, data) {
    return tx.costCenterMovement.create({
        data: {
            cost_center_id: data.cost_center_id,
            movement_date: data.movement_date,
            type_key: data.type_key,
            reference_type_key: data.reference_type_key,
            sign: data.sign,
            amount: data.amount,
            reference_id: data.reference_id || null,
            description: data.description || null,
        },
    });
}
