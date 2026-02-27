import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client-tenant/runtime/library';
import { getNextConsecutive } from '@contagracia/shared-modules';

export interface CreateBankMovementParams {
  bank_account_id: string;
  transaction_date: Date;
  amount: number; // Siempre positivo
  direction: 'INCOME' | 'EXPENSE';
  type_key: string;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  reference_consecutive?: string;
}

export interface CreateBankMovementResult {
  id: string;
  consecutive: string;
  new_balance: number;
}

/**
 * Crea un movimiento bancario y actualiza el saldo de la cuenta
 *
 * - direction INCOME: incrementa saldo
 * - direction EXPENSE: decrementa saldo
 * - amount siempre positivo
 * - Balance se lee con FOR UPDATE para evitar race conditions
 *
 * @param tx - Cliente de transacción Prisma (del caller)
 * @param params - Datos del movimiento
 */
export async function createBankMovement(
  tx: any,
  params: CreateBankMovementParams
): Promise<CreateBankMovementResult> {
  // 1. Validar que la cuenta bancaria exista y esté activa
  const bankAccount = await tx.bankAccount.findUnique({
    where: { id: params.bank_account_id },
    select: { id: true, is_active: true },
  });

  if (!bankAccount) {
    throw new BadRequestException('Cuenta bancaria no encontrada');
  }

  if (!bankAccount.is_active) {
    throw new BadRequestException('La cuenta bancaria está inactiva');
  }

  // 2. Validar que el tipo de movimiento exista
  const movementType = await tx.bankMovementType.findUnique({
    where: { key: params.type_key },
  });

  if (!movementType) {
    throw new BadRequestException(`Tipo de movimiento '${params.type_key}' no válido`);
  }

  // 3. Validar que el monto sea mayor a 0
  if (!params.amount || params.amount <= 0) {
    throw new BadRequestException('El monto del movimiento debe ser mayor a 0');
  }

  // 4. Lock de la cuenta bancaria para evitar race conditions
  const [locked] = await tx.$queryRaw`
    SELECT current_balance FROM bank_accounts WHERE id = ${params.bank_account_id} FOR UPDATE
  `;

  const currentBalance = new Decimal(locked.current_balance.toString());
  const movementAmount = new Decimal(params.amount);
  const newBalance = params.direction === 'INCOME'
    ? currentBalance.plus(movementAmount)
    : currentBalance.minus(movementAmount);

  const consecutive = await getNextConsecutive(tx, 'bank_movement');

  const movement = await tx.bankMovement.create({
    data: {
      bank_account: { connect: { id: params.bank_account_id } },
      consecutive,
      transaction_date: params.transaction_date,
      amount: params.amount,
      direction: params.direction,
      type: { connect: { key: params.type_key } },
      description: params.description,
      reference_id: params.reference_id,
      reference_type: params.reference_type,
      reference_consecutive: params.reference_consecutive || 'Sin referencia',
    },
  });

  await tx.bankAccount.update({
    where: { id: params.bank_account_id },
    data: { current_balance: newBalance.toNumber() },
  });

  return {
    id: movement.id,
    consecutive,
    new_balance: newBalance.toNumber(),
  };
}

/**
 * Crea múltiples movimientos bancarios
 *
 * @param tx - Cliente de transacción Prisma (del caller)
 * @param movements - Lista de movimientos a crear
 */
export async function createBankMovements(
  tx: any,
  movements: CreateBankMovementParams[]
): Promise<CreateBankMovementResult[]> {
  if (movements.length === 0) {
    return [];
  }

  const results: CreateBankMovementResult[] = [];

  for (const params of movements) {
    const result = await createBankMovement(tx, params);
    results.push(result);
  }

  return results;
}
