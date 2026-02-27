import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client-tenant/runtime/library';

export interface VoidPaymentParams {
  payment_id: string;
}

export interface VoidPaymentResult {
  id: string;
  ar_ap_id: string;
  amount_restored: number;
  new_paid: number;
  new_balance: number;
  ar_ap_new_status: string;
}

/**
 * Anula un pago y restaura el saldo del documento ArAp.
 *
 * - Lock Payment FOR UPDATE para evitar doble anulación
 * - Valida que no esté ya anulado
 * - Marca Payment.is_voided = true
 * - Lock ArAp FOR UPDATE
 * - Restaura ArAp: paid -= amount, balance += amount
 * - Recalcula status: balance == amount original → PENDING, sino PARTIAL
 *
 * NO valida período contable — eso lo hace el flujo que llama.
 *
 * @param tx - Cliente de transacción de Prisma
 * @param params - ID del pago a anular
 */
export async function voidPayment(
  tx: any,
  params: VoidPaymentParams
): Promise<VoidPaymentResult> {
  // 1. Lock + leer Payment
  const [payment] = await tx.$queryRaw`
    SELECT id, ar_ap_id, amount, is_voided FROM payments WHERE id = ${params.payment_id} FOR UPDATE
  `;

  if (!payment) {
    throw new BadRequestException('Pago no encontrado');
  }

  if (payment.is_voided) {
    throw new BadRequestException('El pago ya fue anulado');
  }

  const paymentAmount = new Decimal(payment.amount.toString());

  // 2. Marcar Payment como anulado
  await tx.payment.update({
    where: { id: params.payment_id },
    data: { is_voided: true },
  });

  // 3. Lock + leer ArAp
  const [arAp] = await tx.$queryRaw`
    SELECT id, amount, paid, balance, status FROM ar_ap WHERE id = ${payment.ar_ap_id} FOR UPDATE
  `;

  if (!arAp) {
    throw new BadRequestException('Documento CxC/CxP no encontrado');
  }

  const currentPaid = new Decimal(arAp.paid.toString());
  const currentBalance = new Decimal(arAp.balance.toString());
  const originalAmount = new Decimal(arAp.amount.toString());

  // 4. Restaurar saldo
  const newPaid = currentPaid.minus(paymentAmount);
  const newBalance = currentBalance.plus(paymentAmount);
  const newStatus = newBalance.equals(originalAmount) ? 'PENDING' : 'PARTIAL';

  // 5. Actualizar ArAp
  await tx.arAp.update({
    where: { id: payment.ar_ap_id },
    data: {
      paid: newPaid.toNumber(),
      balance: newBalance.toNumber(),
      status: newStatus,
    },
  });

  return {
    id: payment.id,
    ar_ap_id: payment.ar_ap_id,
    amount_restored: paymentAmount.toNumber(),
    new_paid: newPaid.toNumber(),
    new_balance: newBalance.toNumber(),
    ar_ap_new_status: newStatus,
  };
}
