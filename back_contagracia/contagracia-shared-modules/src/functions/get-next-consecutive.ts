import { BadRequestException } from '@nestjs/common';

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
export async function getNextConsecutive(tx: any, type: string): Promise<string> {
  const [consecutive] = await tx.$queryRaw<
    Array<{ type: string; last_number: bigint; prefix: string; padding: bigint }>
  >`
    SELECT type, last_number, prefix, padding
    FROM consecutives
    WHERE type = ${type}
    FOR UPDATE
  `;

  if (!consecutive) {
    throw new BadRequestException(`Tipo de consecutivo '${type}' no configurado`);
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
