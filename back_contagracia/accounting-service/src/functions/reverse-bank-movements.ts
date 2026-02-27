import { createBankMovement } from './create-bank-movement';

export interface ReverseBankMovementsParams {
  reference_id: string;           // ID del asiento original
  reversal_reference_id: string;  // ID del asiento de reversión
  reversal_reference_consecutive: string;
  reversal_date: Date;
}

export interface ReverseBankMovementsResult {
  movements_reversed: number;
}

/**
 * Crea movimientos bancarios inversos para todos los movimientos
 * asociados a un reference_id (típicamente un journal_entry_id).
 *
 * - Busca todos los BankMovements con reference_id dado
 * - Por cada uno llama createBankMovement con dirección inversa
 * - INCOME original → EXPENSE inverso, EXPENSE original → INCOME inverso
 *
 * Usa createBankMovement que ya maneja lock FOR UPDATE y consecutivos.
 *
 * @param tx - Cliente de transacción Prisma (del caller)
 * @param params - Datos para la reversión
 */
export async function reverseBankMovements(
  tx: any,
  params: ReverseBankMovementsParams
): Promise<ReverseBankMovementsResult> {
  // 1. Buscar movimientos bancarios del asiento original
  const originalMovements = await tx.bankMovement.findMany({
    where: {
      reference_id: params.reference_id,
      reference_type: 'journal_entry',
    },
    select: {
      id: true,
      bank_account_id: true,
      amount: true,
      direction: true,
      description: true,
    },
  });

  if (originalMovements.length === 0) {
    return { movements_reversed: 0 };
  }

  // 2. Por cada movimiento, crear el inverso usando createBankMovement
  for (const mov of originalMovements) {
    await createBankMovement(tx, {
      bank_account_id: mov.bank_account_id,
      transaction_date: params.reversal_date,
      amount: Number(mov.amount),
      direction: mov.direction === 'INCOME' ? 'EXPENSE' : 'INCOME',
      type_key: 'reversal',
      description: `Reversión: ${mov.description || ''}`,
      reference_id: params.reversal_reference_id,
      reference_type: 'journal_entry',
      reference_consecutive: params.reversal_reference_consecutive,
    });
  }

  return { movements_reversed: originalMovements.length };
}
