import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client-tenant/runtime/library';

export interface VoidPrepaymentMovementParams {
  prepayment_movement_id: string;
}

export interface VoidPrepaymentMovementResult {
  id: string;
  prepayment_id: string;
  amount_restored: number;
  new_balance: number;
  prepayment_new_status: string;
}

/**
 * Anula un movimiento de anticipo y restaura el saldo del anticipo.
 *
 * - Lock PrepaymentMovement FOR UPDATE para evitar doble anulación
 * - Valida que no esté ya anulado
 * - Lock Prepayment FOR UPDATE
 * - Valida que el anticipo no esté REFUNDED ni VOIDED
 * - Marca PrepaymentMovement.is_voided = true
 * - Restaura Prepayment: balance += amount
 * - Si estaba APPLIED → vuelve a ACTIVE
 *
 * NO valida período contable — eso lo hace el flujo que llama.
 *
 * @param tx - Cliente de transacción de Prisma
 * @param params - ID del movimiento a anular
 */
export async function voidPrepaymentMovement(
  tx: any,
  params: VoidPrepaymentMovementParams
): Promise<VoidPrepaymentMovementResult> {
  // 1. Lock + leer PrepaymentMovement
  const [movement] = await tx.$queryRaw`
    SELECT id, prepayment_id, amount, is_voided FROM prepayment_movements WHERE id = ${params.prepayment_movement_id} FOR UPDATE
  `;

  if (!movement) {
    throw new BadRequestException('Movimiento de anticipo no encontrado');
  }

  if (movement.is_voided) {
    throw new BadRequestException('El movimiento ya fue anulado');
  }

  // 2. Lock + leer Prepayment
  const [prepayment] = await tx.$queryRaw`
    SELECT id, balance, status FROM prepayments WHERE id = ${movement.prepayment_id} FOR UPDATE
  `;

  if (!prepayment) {
    throw new BadRequestException('Anticipo no encontrado');
  }

  if (prepayment.status === 'REFUNDED') {
    throw new BadRequestException('No se puede anular el movimiento: el anticipo ya fue devuelto');
  }

  if (prepayment.status === 'VOIDED') {
    throw new BadRequestException('No se puede anular el movimiento: el anticipo está anulado');
  }

  const movementAmount = new Decimal(movement.amount.toString());
  const currentBalance = new Decimal(prepayment.balance.toString());

  // 3. Marcar movimiento como anulado
  await tx.prepaymentMovement.update({
    where: { id: params.prepayment_movement_id },
    data: { is_voided: true },
  });

  // 4. Restaurar saldo
  const newBalance = currentBalance.plus(movementAmount);

  // 5. Si estaba APPLIED, vuelve a ACTIVE
  const newStatus = prepayment.status === 'APPLIED' ? 'ACTIVE' : prepayment.status;

  // 6. Actualizar Prepayment
  await tx.prepayment.update({
    where: { id: movement.prepayment_id },
    data: {
      balance: newBalance.toNumber(),
      status: newStatus,
    },
  });

  return {
    id: movement.id,
    prepayment_id: movement.prepayment_id,
    amount_restored: movementAmount.toNumber(),
    new_balance: newBalance.toNumber(),
    prepayment_new_status: newStatus,
  };
}
