import { BadRequestException } from '@nestjs/common';
import { voidPayment } from './void-payment';
import { voidPrepaymentMovement } from './void-prepayment-movement';
import { createBankMovement } from './create-bank-movement';

export interface VoidPaymentReceiptParams {
  payment_receipt_id: string;
  reversal_date: Date;
  reversal_entry_id: string;
  reversal_entry_consecutive: string;
}

export interface VoidPaymentReceiptResult {
  id: string;
  journal_entry_id: string | null;
  payments_voided: number;
  prepayment_movements_voided: number;
  ar_aps_voided: number;
  prepayments_voided: number;
  bank_movements_reversed: number;
}

/**
 * Anula un PaymentReceipt y todo lo que creó:
 *
 * 1. Void Payments → restaura ArAp.paid/balance/status
 * 2. Void PrepaymentMovements → restaura Prepayment.balance/status
 *    (valida que anticipo no esté REFUNDED/VOIDED)
 * 3. Void ArAps creados por CXC_CREATED/CXP_CREATED → status VOIDED
 *    (valida que no tengan pagos activos de otras fuentes)
 * 4. Void Prepayments creados por PREP_CREATED → status VOIDED
 *    (valida que no esté REFUNDED ni tenga movimientos activos de otras fuentes)
 * 5. Marca PaymentReceipt.status = VOIDED
 * 6. Crea movimientos bancarios inversos (createBankMovement)
 *
 * NO revierte asiento contable — eso lo hace el caller con reverseJournalEntry.
 *
 * @param tx - Cliente de transacción Prisma (del caller)
 * @param params - Datos para la anulación
 */
export async function voidPaymentReceipt(
  tx: any,
  params: VoidPaymentReceiptParams
): Promise<VoidPaymentReceiptResult> {
  // 1. Lock + leer PaymentReceipt
  const [receipt] = await tx.$queryRaw`
    SELECT id, status, journal_entry_id FROM payment_receipts WHERE id = ${params.payment_receipt_id} FOR UPDATE
  `;

  if (!receipt) {
    throw new BadRequestException('Recibo de pago no encontrado');
  }

  if (receipt.status === 'VOIDED') {
    throw new BadRequestException('El recibo ya fue anulado');
  }

  // 2. Cargar líneas y payments
  const lines = await tx.paymentReceiptLine.findMany({
    where: { payment_receipt_id: params.payment_receipt_id },
    select: { id: true, kind: true, ref_id: true },
  });

  const payments = await tx.payment.findMany({
    where: { payment_receipt_id: params.payment_receipt_id, is_voided: false },
    select: { id: true },
  });

  // 3. Void Payments → restaurar ArAp balances
  let paymentsVoided = 0;
  for (const payment of payments) {
    await voidPayment(tx, { payment_id: payment.id });
    paymentsVoided++;
  }

  // 4. Void PrepaymentMovements → restaurar Prepayment balances
  let prepMovementsVoided = 0;
  const prepLines = lines.filter((l: any) => l.kind === 'PREP_USED' && l.ref_id);
  for (const line of prepLines) {
    const movement = await tx.prepaymentMovement.findFirst({
      where: {
        prepayment_id: line.ref_id,
        journal_entry_id: receipt.journal_entry_id,
        is_voided: false,
      },
      select: { id: true },
    });

    if (movement) {
      await voidPrepaymentMovement(tx, { prepayment_movement_id: movement.id });
      prepMovementsVoided++;
    }
  }

  // 5. Void ArAps creados (CXC_CREATED / CXP_CREATED)
  let arApsVoided = 0;
  const createdArApLines = lines.filter(
    (l: any) => (l.kind === 'CXC_CREATED' || l.kind === 'CXP_CREATED') && l.ref_id,
  );
  for (const line of createdArApLines) {
    const externalPayments = await tx.payment.count({
      where: {
        ar_ap_id: line.ref_id,
        is_voided: false,
        payment_receipt_id: { not: params.payment_receipt_id },
      },
    });

    if (externalPayments > 0) {
      throw new BadRequestException(
        `No se puede anular: la CxC/CxP (${line.ref_id}) tiene ${externalPayments} pago(s) activo(s) de otras fuentes`,
      );
    }

    await tx.arAp.update({
      where: { id: line.ref_id },
      data: { status: 'VOIDED' },
    });
    arApsVoided++;
  }

  // 5b. Void Prepayments creados (PREP_CREATED)
  let prepaymentsVoided = 0;
  const createdPrepLines = lines.filter(
    (l: any) => l.kind === 'PREP_CREATED' && l.ref_id,
  );
  for (const line of createdPrepLines) {
    const prepayment = await tx.prepayment.findUnique({
      where: { id: line.ref_id },
      select: { id: true, status: true, consecutive: true },
    });

    if (!prepayment) continue;

    if (prepayment.status === 'REFUNDED') {
      throw new BadRequestException(
        `No se puede anular: el anticipo ${prepayment.consecutive} ya fue devuelto`,
      );
    }

    // Verificar que no tenga movimientos activos de otras fuentes
    const externalMovements = await tx.prepaymentMovement.count({
      where: {
        prepayment_id: line.ref_id,
        is_voided: false,
        journal_entry_id: { not: receipt.journal_entry_id },
      },
    });

    if (externalMovements > 0) {
      throw new BadRequestException(
        `No se puede anular: el anticipo ${prepayment.consecutive} tiene ${externalMovements} movimiento(s) activo(s) de otras fuentes`,
      );
    }

    await tx.prepayment.update({
      where: { id: line.ref_id },
      data: { status: 'VOIDED' },
    });
    prepaymentsVoided++;
  }

  // 6. Marcar PaymentReceipt como VOIDED
  await tx.paymentReceipt.update({
    where: { id: params.payment_receipt_id },
    data: { status: 'VOIDED' },
  });

  // 7. Reversar movimientos bancarios
  const originalMovements = await tx.bankMovement.findMany({
    where: {
      reference_id: receipt.journal_entry_id,
      reference_type: 'journal_entry',
    },
    select: { bank_account_id: true, amount: true, direction: true, description: true },
  });

  for (const mov of originalMovements) {
    await createBankMovement(tx, {
      bank_account_id: mov.bank_account_id,
      transaction_date: params.reversal_date,
      amount: Number(mov.amount),
      direction: mov.direction === 'INCOME' ? 'EXPENSE' : 'INCOME',
      type_key: 'reversal',
      description: `Reversión: ${mov.description || ''}`,
      reference_id: params.reversal_entry_id,
      reference_type: 'journal_entry',
      reference_consecutive: params.reversal_entry_consecutive,
    });
  }

  return {
    id: params.payment_receipt_id,
    journal_entry_id: receipt.journal_entry_id as string,
    payments_voided: paymentsVoided,
    prepayment_movements_voided: prepMovementsVoided,
    ar_aps_voided: arApsVoided,
    prepayments_voided: prepaymentsVoided,
    bank_movements_reversed: originalMovements.length,
  };
}
