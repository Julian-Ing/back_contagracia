"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextConsecutive = getNextConsecutive;
const common_1 = require("@nestjs/common");
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
async function getNextConsecutive(tx, type) {
    const [consecutive] = await tx.$queryRaw `
    SELECT type, last_number, prefix, padding
    FROM consecutives
    WHERE type = ${type}
    FOR UPDATE
  `;
    if (!consecutive) {
        throw new common_1.BadRequestException(`Tipo de consecutivo '${type}' no configurado`);
    }
    const lastNumber = Number(consecutive.last_number);
    const padding = Number(consecutive.padding);
    const nextNumber = lastNumber + 1;
    await tx.consecutive.update({
        where: { type },
        data: { last_number: nextNumber },
    });
    const numStr = nextNumber.toString();
    const padded = numStr.length >= padding ? numStr : numStr.padStart(padding, '0');
    return `${consecutive.prefix}-${padded}`;
}
