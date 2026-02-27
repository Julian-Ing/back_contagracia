import { BadRequestException } from '@nestjs/common';
import { reverseJournalEntry } from './reverse-journal-entry';
import { voidPaymentReceipt, VoidPaymentReceiptResult } from './void-payment-receipt';
import { validatePeriodOpen } from './validate-period-open';

export interface VoidPRWithJEParams {
  payment_receipt_id: string;
  reversal_date: Date;
  hasAccounting: boolean;
  hasCostCentersModule?: boolean;
}

export interface VoidPRWithJEResult extends VoidPaymentReceiptResult {
  reversal_entry_id: string | null;
  reversal_entry_consecutive: string | null;
}

/**
 * Anula un PaymentReceipt (RC o CE) con reversión de asiento contable.
 *
 * 1. Lock + validar que no esté ya anulado
 * 2. Si tiene contabilidad + asiento: validatePeriodOpen + reverseJournalEntry
 * 3. voidPaymentReceipt → pagos, anticipos, ArAps creados, banco
 *
 * @param tx - Cliente de transacción Prisma (del caller)
 * @param params - Datos para la anulación
 */
export async function voidPaymentReceiptWithJournalEntry(
  tx: any,
  params: VoidPRWithJEParams,
): Promise<VoidPRWithJEResult> {
  const { payment_receipt_id, reversal_date, hasAccounting } = params;

  // 1. Lock + leer receipt (fail fast antes de reversar asiento)
  const [receipt] = await tx.$queryRaw`
    SELECT id, journal_entry_id, status
    FROM payment_receipts
    WHERE id = ${payment_receipt_id}
    FOR UPDATE
  `;

  if (!receipt) {
    throw new BadRequestException('Recibo de pago no encontrado');
  }

  if (receipt.status === 'VOIDED') {
    throw new BadRequestException('El recibo ya fue anulado');
  }

  // 2. Si tiene contabilidad y asiento asociado: validar periodo + reversar
  let reversalEntryId: string | null = null;
  let reversalEntryConsecutive: string | null = null;

  if (hasAccounting && receipt.journal_entry_id) {
    await validatePeriodOpen(tx, reversal_date);

    const result = await reverseJournalEntry(tx, {
      journal_entry_id: receipt.journal_entry_id,
      reversal_date,
      hasCostCentersModule: params.hasCostCentersModule,
    });
    reversalEntryId = result.id;
    reversalEntryConsecutive = result.consecutive;
  }

  // 3. Void receipt (pagos, anticipos, ArAps creados, movimientos bancarios)
  const voidResult = await voidPaymentReceipt(tx, {
    payment_receipt_id,
    reversal_date,
    reversal_entry_id: reversalEntryId || payment_receipt_id,
    reversal_entry_consecutive: reversalEntryConsecutive || '',
  });

  return {
    ...voidResult,
    reversal_entry_id: reversalEntryId,
    reversal_entry_consecutive: reversalEntryConsecutive,
  };
}
