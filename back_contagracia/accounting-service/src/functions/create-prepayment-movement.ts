import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client-tenant/runtime/library';
import { getNextConsecutive } from '@contagracia/shared-modules';

export interface CreatePrepaymentMovementParams {
  prepayment_id: string;
  application_date: Date;
  amount: number;
  applied_to_source_key?: string;
  applied_to_id?: string;
  applied_to_number?: string;
  journal_entry_id?: string;
  notes?: string;
  displayDecimals?: number;
}

export interface CreatePrepaymentMovementResult {
  id: string;
  consecutive: string;
  new_balance: number;
  prepayment_fully_applied: boolean;
  rounding_diff: number;
  actual_amount: number;
}

/**
 * Crea un movimiento de anticipo y reduce el saldo del anticipo.
 *
 * - Lee balance con FOR UPDATE para evitar race conditions
 * - Valida amount > 0 y amount <= balance
 * - Reduce Prepayment.balance
 * - Si balance llega a 0 → status = APPLIED
 * - getNextConsecutive('prepayment_movement') DESPUÉS de validaciones
 *
 * @param tx - Cliente de transacción de Prisma (debe llamarse dentro de $transaction)
 * @param params - Datos del movimiento
 */
export async function createPrepaymentMovement(
  tx: any,
  params: CreatePrepaymentMovementParams
): Promise<CreatePrepaymentMovementResult> {
  // 1. Lock + leer balance actual del anticipo
  const [locked] = await tx.$queryRaw`
    SELECT id, balance, status FROM prepayments WHERE id = ${params.prepayment_id} FOR UPDATE
  `;

  if (!locked) {
    throw new BadRequestException('Anticipo no encontrado');
  }

  if (locked.status !== 'ACTIVE') {
    throw new BadRequestException(`El anticipo no está activo (estado: ${locked.status})`);
  }

  const currentBalance = new Decimal(locked.balance.toString());

  // 2. Validar monto
  if (!params.amount || params.amount <= 0) {
    throw new BadRequestException('El monto del movimiento debe ser mayor a 0');
  }

  const movementAmount = new Decimal(params.amount);

  // 2b. Detectar redondeo
  let actualMovementAmount = movementAmount;
  let roundingDiff = new Decimal(0);

  if (params.displayDecimals !== undefined && !movementAmount.equals(currentBalance)) {
    const roundedBalance = new Decimal(currentBalance.toFixed(params.displayDecimals));
    if (movementAmount.equals(roundedBalance)) {
      actualMovementAmount = currentBalance;
      roundingDiff = movementAmount.minus(currentBalance);
    }
  }

  if (actualMovementAmount.greaterThan(currentBalance)) {
    throw new BadRequestException(`El monto (${params.amount}) excede el saldo disponible (${currentBalance.toNumber()})`);
  }

  // 3. Calcular nuevo balance
  const newBalance = currentBalance.minus(actualMovementAmount);
  const fullyApplied = newBalance.isZero();

  // 4. Consecutivo (después de todas las validaciones)
  const consecutive = await getNextConsecutive(tx, 'prepayment_movement');

  // 5. Crear movimiento
  const movement = await tx.prepaymentMovement.create({
    data: {
      prepayment_id: params.prepayment_id,
      consecutive,
      application_date: params.application_date,
      amount: actualMovementAmount.toNumber(),
      applied_to_source_key: params.applied_to_source_key || null,
      applied_to_id: params.applied_to_id || null,
      applied_to_number: params.applied_to_number || null,
      journal_entry_id: params.journal_entry_id || null,
      notes: params.notes || null,
    },
  });

  // 6. Actualizar balance y status del anticipo
  await tx.prepayment.update({
    where: { id: params.prepayment_id },
    data: {
      balance: newBalance.toNumber(),
      ...(fullyApplied ? { status: 'APPLIED' } : {}),
    },
  });

  return {
    id: movement.id,
    consecutive,
    new_balance: newBalance.toNumber(),
    prepayment_fully_applied: fullyApplied,
    rounding_diff: roundingDiff.toNumber(),
    actual_amount: actualMovementAmount.toNumber(),
  };
}
