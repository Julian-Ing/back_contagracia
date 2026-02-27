import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client-tenant/runtime/library';
import { getNextConsecutive } from '@contagracia/shared-modules';

export interface CreatePaymentParams {
  ar_ap_id: string;
  date: Date;
  amount: number;
  description?: string;
  journal_entry_id?: string;
  journal_entry_item_id?: string;
  payment_receipt_id?: string;
  payment_receipt_line_id?: string;
  displayDecimals?: number;
}

export interface CreatePaymentResult {
  id: string;
  consecutive: string;
  new_paid: number;
  new_balance: number;
  ar_ap_new_status: string;
  rounding_diff: number; // positivo = usuario envió más, negativo = usuario envió menos
  actual_amount: number; // monto realmente pagado (puede diferir del solicitado por redondeo)
}

/**
 * Crea un pago contra un documento ArAp y actualiza su saldo.
 *
 * - Lock ArAp con FOR UPDATE para evitar race conditions
 * - Valida: ArAp no VOIDED/PAID, amount > 0, amount <= balance
 * - Crea Payment con consecutivo (RP para RECEIVABLE, PP para PAYABLE)
 * - Actualiza ArAp: paid += amount, balance -= amount
 * - Si balance llega a 0 → status PAID, si no → PARTIAL
 *
 * NO valida período contable — eso lo hace el flujo que llama.
 *
 * @param tx - Cliente de transacción de Prisma (debe llamarse dentro de $transaction)
 * @param params - Datos del pago
 */
export async function createPayment(
  tx: any,
  params: CreatePaymentParams
): Promise<CreatePaymentResult> {
  // 1. Lock + leer ArAp actual
  const [locked] = await tx.$queryRaw`
    SELECT id, type, paid, balance, status FROM ar_ap WHERE id = ${params.ar_ap_id} FOR UPDATE
  `;

  if (!locked) {
    throw new BadRequestException('Documento CxC/CxP no encontrado');
  }

  if (locked.status === 'VOIDED' || locked.status === 'PAID') {
    throw new BadRequestException(`El documento ya está ${locked.status === 'VOIDED' ? 'anulado' : 'pagado'}`);
  }

  // 2. Validar monto
  if (!params.amount || params.amount <= 0) {
    throw new BadRequestException('El monto del pago debe ser mayor a 0');
  }

  const currentPaid = new Decimal(locked.paid.toString());
  const currentBalance = new Decimal(locked.balance.toString());
  const paymentAmount = new Decimal(params.amount);

  // 2b. Detectar redondeo: si displayDecimals está definido,
  // verificar si el monto del usuario es el balance redondeado
  let actualPaymentAmount = paymentAmount;
  let roundingDiff = new Decimal(0);

  if (params.displayDecimals !== undefined && !paymentAmount.equals(currentBalance)) {
    const roundedBalance = new Decimal(currentBalance.toFixed(params.displayDecimals));
    if (paymentAmount.equals(roundedBalance)) {
      // Es redondeo: el usuario quiso pagar el saldo completo
      actualPaymentAmount = currentBalance;
      roundingDiff = paymentAmount.minus(currentBalance);
    }
  }

  if (actualPaymentAmount.greaterThan(currentBalance)) {
    throw new BadRequestException(`El monto (${params.amount}) excede el saldo del documento (${currentBalance.toNumber()})`);
  }

  // 3. Calcular nuevos valores
  const newPaid = currentPaid.plus(actualPaymentAmount);
  const newBalance = currentBalance.minus(actualPaymentAmount);
  const newStatus = newBalance.isZero() ? 'PAID' : 'PARTIAL';

  // 4. Consecutivo según tipo de ArAp (después de validaciones)
  const consecutiveType = locked.type === 'RECEIVABLE' ? 'receivable_payment' : 'payable_payment';
  const consecutive = await getNextConsecutive(tx, consecutiveType);

  // 5. Crear Payment
  const payment = await tx.payment.create({
    data: {
      ar_ap_id: params.ar_ap_id,
      consecutive,
      date: params.date,
      amount: actualPaymentAmount.toNumber(),
      description: params.description || null,
      journal_entry_id: params.journal_entry_id || null,
      journal_entry_item_id: params.journal_entry_item_id || null,
      payment_receipt_id: params.payment_receipt_id || null,
      payment_receipt_line_id: params.payment_receipt_line_id || null,
    },
  });

  // 6. Actualizar ArAp
  await tx.arAp.update({
    where: { id: params.ar_ap_id },
    data: {
      paid: newPaid.toNumber(),
      balance: newBalance.toNumber(),
      status: newStatus,
    },
  });

  return {
    id: payment.id,
    consecutive,
    new_paid: newPaid.toNumber(),
    new_balance: newBalance.toNumber(),
    ar_ap_new_status: newStatus,
    rounding_diff: roundingDiff.toNumber(),
    actual_amount: actualPaymentAmount.toNumber(),
  };
}
