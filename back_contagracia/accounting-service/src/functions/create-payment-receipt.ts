import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client-tenant/runtime/library';
import { getNextConsecutive } from '@contagracia/shared-modules';

export interface CreatePaymentReceiptLineInput {
  kind: string;             // DOC | BANK | ACCOUNT | PREP_USED | CXC_CREATED | CXP_CREATED
  account_code: string;
  debit: number;
  credit: number;
  ref_id?: string;                    // ID referencia (ar_ap_id, bank_account_id, prepayment_id)
  journal_entry_item_id?: string;
  applied_to_source_key?: string;
  applied_to_id?: string;
  company_payment_method_id?: string;
  description?: string;
  cost_center_id?: string;
  cost_center_movement_type_key?: string;
}

export interface CreatePaymentReceiptParams {
  type: string;             // RECEIVABLE | PAYABLE | MANUAL
  date: Date;
  amount: number;
  third_party_id?: string;
  journal_entry_id?: string;
  description?: string;
  lines: CreatePaymentReceiptLineInput[];
}

export interface CreatePaymentReceiptLineResult {
  id: string;
  kind: string;
  ref_id: string | null;
}

export interface CreatePaymentReceiptResult {
  id: string;
  consecutive: string | null;
  lines: CreatePaymentReceiptLineResult[];
}

/**
 * Crea un recibo de pago con sus líneas.
 *
 * - RECEIVABLE → consecutivo 'payment_receipt' (REC-XXXX)
 * - PAYABLE → consecutivo 'disbursement' (CE-XXXX)
 * - MANUAL → sin consecutivo (null)
 * - Crea PaymentReceipt + PaymentReceiptLines en una sola operación
 *
 * Validaciones:
 * - Al menos 2 líneas
 * - sum(debits) === sum(credits)
 * - Líneas DOC requieren company_payment_method_id (excepto MANUAL)
 *
 * @param tx - Cliente de transacción de Prisma (debe llamarse dentro de $transaction)
 * @param params - Datos del recibo y sus líneas
 */
export async function createPaymentReceipt(
  tx: any,
  params: CreatePaymentReceiptParams
): Promise<CreatePaymentReceiptResult> {
  // 0. Validaciones
  if (!params.lines || params.lines.length < 2) {
    throw new BadRequestException('El recibo debe tener al menos 2 líneas');
  }

  // Validar débitos = créditos
  const totalDebits = params.lines.reduce(
    (sum, l) => sum.plus(new Decimal(l.debit || 0)),
    new Decimal(0),
  );
  const totalCredits = params.lines.reduce(
    (sum, l) => sum.plus(new Decimal(l.credit || 0)),
    new Decimal(0),
  );
  if (!totalDebits.toDecimalPlaces(4).equals(totalCredits.toDecimalPlaces(4))) {
    throw new BadRequestException(
      `El recibo no está balanceado. Débitos: ${totalDebits.toFixed(4)}, Créditos: ${totalCredits.toFixed(4)}`,
    );
  }

  // Líneas DOC requieren método de pago (excepto MANUAL)
  if (params.type !== 'MANUAL') {
    for (const line of params.lines) {
      if (line.kind === 'DOC' && !line.company_payment_method_id) {
        throw new BadRequestException('Las líneas de documento (DOC) requieren un método de pago');
      }
    }
  }

  // Líneas DOC, BANK y PREP_USED requieren ref_id
  for (const line of params.lines) {
    if (line.kind === 'DOC' && !line.ref_id) {
      throw new BadRequestException('Las líneas DOC requieren ref_id (ID del documento CxC/CxP)');
    }
    if (line.kind === 'BANK' && !line.ref_id) {
      throw new BadRequestException('Las líneas BANK requieren ref_id (ID de la cuenta bancaria)');
    }
    if (line.kind === 'PREP_USED' && !line.ref_id) {
      throw new BadRequestException('Las líneas PREP_USED requieren ref_id (ID del anticipo)');
    }
  }

  // 1. Consecutivo según tipo
  let consecutive: string | null = null;
  if (params.type === 'RECEIVABLE') {
    consecutive = await getNextConsecutive(tx, 'payment_receipt');
  } else if (params.type === 'PAYABLE') {
    consecutive = await getNextConsecutive(tx, 'disbursement');
  }
  // MANUAL → null

  // 2. Crear PaymentReceipt con sus líneas
  const receipt = await tx.paymentReceipt.create({
    data: {
      type: params.type,
      consecutive,
      date: params.date,
      amount: params.amount,
      third_party_id: params.third_party_id || null,
      journal_entry_id: params.journal_entry_id || null,
      status: 'ACTIVE',
      description: params.description || null,
      lines: {
        create: params.lines.map((line) => ({
          kind: line.kind,
          account_code: line.account_code,
          debit: line.debit,
          credit: line.credit,
          ref_id: line.ref_id || null,
          journal_entry_item_id: line.journal_entry_item_id || null,
          applied_to_source_key: line.applied_to_source_key || null,
          applied_to_id: line.applied_to_id || null,
          company_payment_method_id: line.company_payment_method_id || null,
          description: line.description || null,
          cost_center_id: line.cost_center_id || null,
          cost_center_movement_type_key: line.cost_center_movement_type_key || null,
        })),
      },
    },
    include: {
      lines: {
        select: { id: true, kind: true, ref_id: true },
      },
    },
  });

  return {
    id: receipt.id,
    consecutive,
    lines: receipt.lines,
  };
}
