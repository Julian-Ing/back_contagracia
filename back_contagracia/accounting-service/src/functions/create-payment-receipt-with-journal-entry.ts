import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client-tenant/runtime/library';
import { createPaymentReceipt } from './create-payment-receipt';
import { createPayment } from './create-payment';
import { createBankMovement } from './create-bank-movement';
import { createPrepaymentMovement } from './create-prepayment-movement';
import { createJournalEntry } from './create-journal-entry';
import { validatePeriodOpen } from './validate-period-open';
import { createCostCenterMovement } from '@contagracia/shared-modules';

/* ── Interfaces ──────────────────────────────────────────── */

export interface CreatePRWithJELineInput {
  kind: string;                    // DOC | BANK | ACCOUNT | PREP_USED
  account_code: string;
  debit: number;
  credit: number;
  ref_id?: string;                 // ar_ap_id | bank_account_id | prepayment_id
  company_payment_method_id?: string;
  applied_to_source_key?: string;
  applied_to_id?: string;
  description?: string;
  cost_center_id?: string;
  cost_center_movement_type_key?: string;
}

export interface CreatePRWithJEParams {
  type: string;                    // RECEIVABLE | PAYABLE | MANUAL
  date: Date;
  third_party_id?: string;
  description?: string;
  hasAccounting: boolean;
  hasCostCentersModule?: boolean;
  journalEntryTypeKey?: string;    // default: invoice_voucher / expense_voucher
  bankMovementTypeKey?: string;    // default: mismo que journalEntryTypeKey
  lines: CreatePRWithJELineInput[];
}

export interface CreatePRWithJEResult {
  id: string;
  consecutive: string | null;
  journal_entry_id?: string;
  journal_entry_consecutive?: string;
}

/**
 * Crea un recibo de pago completo con todas sus integraciones.
 *
 * Orden:
 * 1. createPaymentReceipt → receipt + lines + consecutivo + validaciones (balance, método de pago)
 * 2. createPayment por cada línea DOC → actualiza ArAp (paid, balance, status)
 * 3. createPrepaymentMovement por cada línea PREP_USED → actualiza Prepayment (balance, status)
 * 4. createBankMovement por cada línea BANK → actualiza BankAccount (current_balance)
 * 5. Si hasAccounting: createJournalEntry + mapeo receipt lines ↔ JE items ↔ payments
 *
 * El mapeo se hace por (account_code, type, amount, reference_id/bank_account_id) con consumo.
 * Los payments se mapean a JE items VIA su receipt line (no directo).
 *
 * @param tx - Cliente de transacción Prisma (del caller)
 * @param params - Datos del recibo y sus líneas
 */
export async function createPaymentReceiptWithJournalEntry(
  tx: any,
  params: CreatePRWithJEParams,
): Promise<CreatePRWithJEResult> {
  const { type, date, third_party_id, description, hasAccounting, lines } = params;

  const typeKey = params.journalEntryTypeKey
    || (type === 'RECEIVABLE' ? 'invoice_voucher' : 'expense_voucher');
  const bankTypeKey = params.bankMovementTypeKey || typeKey;

  // Validar periodo contable si tiene contabilidad
  if (hasAccounting) {
    await validatePeriodOpen(tx, date);
  }

  // Leer displayDecimals para detección de redondeo
  const displayDecimalsSetting = await tx.companySetting.findFirst({
    where: { category: 'general', key: 'display_decimals' },
  });
  const displayDecimals = displayDecimalsSetting ? parseInt(displayDecimalsSetting.value, 10) : 2;

  // Clasificar líneas
  const docLines = lines.filter(l => l.kind === 'DOC');
  const bankLines = lines.filter(l => l.kind === 'BANK');
  const prepLines = lines.filter(l => l.kind === 'PREP_USED');

  // Calcular amount del receipt (suma de montos DOC)
  const receiptAmount = docLines.reduce(
    (sum, l) => sum.plus(new Decimal(l.debit || l.credit || 0)),
    new Decimal(0),
  ).toNumber();

  // ── 1. Crear PaymentReceipt + lines (sin journal_entry_id aún) ──
  // createPaymentReceipt valida: al menos 2 líneas, débitos=créditos, método de pago en DOC
  const receipt = await createPaymentReceipt(tx, {
    type,
    date,
    amount: receiptAmount,
    third_party_id,
    description: description || null,
    lines: lines.map(l => ({
      kind: l.kind,
      account_code: l.account_code,
      debit: l.debit,
      credit: l.credit,
      ref_id: l.ref_id || null,
      company_payment_method_id: l.company_payment_method_id || null,
      applied_to_source_key: l.applied_to_source_key || null,
      applied_to_id: l.applied_to_id || null,
      description: l.description || null,
      cost_center_id: l.cost_center_id || null,
      cost_center_movement_type_key: l.cost_center_movement_type_key || null,
    })),
  });

  // ── 2. Crear Payments para líneas DOC ──
  const docReceiptLines = receipt.lines.filter(l => l.kind === 'DOC');
  const usedDocRLIds = new Set<string>();
  const createdPayments: Array<{ id: string; receipt_line_id: string }> = [];
  const docResults: Array<{ actual_amount: number; rounding_diff: number; ref_id: string }> = [];

  for (const dtoLine of docLines) {
    // Consumir receipt lines para soportar múltiples DOC al mismo ArAp
    const receiptLine = docReceiptLines.find(
      rl => rl.ref_id === dtoLine.ref_id && !usedDocRLIds.has(rl.id),
    );
    if (receiptLine) usedDocRLIds.add(receiptLine.id);

    const paymentAmount = dtoLine.debit || dtoLine.credit;

    const payment = await createPayment(tx, {
      ar_ap_id: dtoLine.ref_id!,
      date,
      amount: paymentAmount,
      description: dtoLine.description || description || null,
      payment_receipt_id: receipt.id,
      payment_receipt_line_id: receiptLine?.id || null,
      displayDecimals,
    });

    createdPayments.push({
      id: payment.id,
      receipt_line_id: receiptLine?.id || '',
    });
    docResults.push({
      actual_amount: payment.actual_amount,
      rounding_diff: payment.rounding_diff,
      ref_id: dtoLine.ref_id!,
    });
  }

  // ── 3. Crear PrepaymentMovements para líneas PREP_USED ──
  const createdPrepMovements: Array<{ id: string }> = [];
  const prepResults: Array<{ actual_amount: number; rounding_diff: number; ref_id: string }> = [];

  for (const dtoLine of prepLines) {
    const movementAmount = dtoLine.debit || dtoLine.credit;

    const movement = await createPrepaymentMovement(tx, {
      prepayment_id: dtoLine.ref_id!,
      application_date: date,
      amount: movementAmount,
      applied_to_source_key: typeKey,
      applied_to_id: receipt.id,
      applied_to_number: receipt.consecutive || undefined,
      notes: dtoLine.description || description || null,
      displayDecimals,
    });

    createdPrepMovements.push({ id: movement.id });
    prepResults.push({
      actual_amount: movement.actual_amount,
      rounding_diff: movement.rounding_diff,
      ref_id: dtoLine.ref_id!,
    });
  }

  // ── 4. Crear BankMovements para líneas BANK ──
  for (const dtoLine of bankLines) {
    const bankAmount = dtoLine.debit || dtoLine.credit;
    // debit en cuenta de banco/caja = ingreso, credit = egreso
    const direction = dtoLine.debit > 0 ? 'INCOME' : 'EXPENSE';

    await createBankMovement(tx, {
      bank_account_id: dtoLine.ref_id!,
      transaction_date: date,
      amount: bankAmount,
      direction,
      type_key: bankTypeKey,
      description: dtoLine.description || description || '',
      reference_id: receipt.id,
      reference_type: 'payment_receipt',
      reference_consecutive: receipt.consecutive || undefined,
    });
  }

  // ── 5. Crear JournalEntry si tiene contabilidad ──
  const defaultDesc = description
    || (type === 'RECEIVABLE' ? 'Recibo de Caja' : 'Comprobante de Egreso');

  let journalEntryId: string | undefined;
  let journalEntryConsecutive: string | undefined;
  const rlToJeMap = new Map<string, string>(); // receipt_line_id → je_item_id

  if (hasAccounting) {
    // 5a. Obtener third_party_id de ArAps y Prepayments para el asiento
    const arApIds = docLines.map(l => l.ref_id).filter(Boolean) as string[];
    const arApMap = new Map<string, { third_party_id: string; type: string }>();
    if (arApIds.length > 0) {
      const docs = await tx.arAp.findMany({
        where: { id: { in: arApIds } },
        select: { id: true, third_party_id: true, type: true },
      });
      for (const d of docs) arApMap.set(d.id, { third_party_id: d.third_party_id, type: d.type });
    }

    const prepIds = prepLines.map(l => l.ref_id).filter(Boolean) as string[];
    const prepMap = new Map<string, { third_party_id: string; prepayment_type: string }>();
    if (prepIds.length > 0) {
      const preps = await tx.prepayment.findMany({
        where: { id: { in: prepIds } },
        select: { id: true, third_party_id: true, prepayment_type: true },
      });
      for (const p of preps) prepMap.set(p.id, { third_party_id: p.third_party_id, prepayment_type: p.prepayment_type });
    }

    // 5b. Construir items del asiento (MISMO ORDEN que lines)
    let docResultIdx = 0;
    let prepResultIdx = 0;

    const jeItems: any[] = lines.map(line => {
      let amount = line.debit || line.credit;
      const jeType = line.debit > 0 ? 'DEBIT' : 'CREDIT';

      // Usar monto real (post-redondeo) para DOC y PREP_USED
      if (line.kind === 'DOC' && docResultIdx < docResults.length) {
        amount = docResults[docResultIdx].actual_amount;
        docResultIdx++;
      } else if (line.kind === 'PREP_USED' && prepResultIdx < prepResults.length) {
        amount = prepResults[prepResultIdx].actual_amount;
        prepResultIdx++;
      }

      let jeThirdPartyId: string | undefined;
      let jeBankAccountId: string | undefined;
      let jeRefType: string = 'NORMAL';
      let jeRefId: string | undefined;

      if (line.kind === 'DOC') {
        jeThirdPartyId = arApMap.get(line.ref_id!)?.third_party_id || third_party_id;
        jeRefType = type === 'RECEIVABLE' ? 'CXC_PAID' : 'CXP_PAID';
        jeRefId = line.ref_id;
      } else if (line.kind === 'BANK') {
        jeBankAccountId = line.ref_id;
      } else if (line.kind === 'PREP_USED') {
        jeThirdPartyId = prepMap.get(line.ref_id!)?.third_party_id || third_party_id;
        jeRefType = 'PREP_USED';
        jeRefId = line.ref_id;
      } else if (line.kind === 'ACCOUNT') {
        jeThirdPartyId = third_party_id;
      }

      return {
        account_code: line.account_code,
        amount,
        type: jeType as any,
        description: line.description || defaultDesc,
        third_party_id: jeThirdPartyId,
        bank_account_id: jeBankAccountId,
        reference_type: jeRefType as any,
        reference_id: jeRefId,
        cost_center_id: line.cost_center_id,
        cost_center_movement_type_key: line.cost_center_movement_type_key,
      };
    });

    // ── 5c. Líneas de ajuste por redondeo ──
    // Assets (CxC, Supplier/Employee prep): diff > 0 → Income, diff < 0 → Expense
    // Liabilities (CxP, Client prep): diff > 0 → Expense, diff < 0 → Income
    let totalRoundingIncome = new Decimal(0);
    let totalRoundingExpense = new Decimal(0);

    for (const dr of docResults) {
      if (dr.rounding_diff === 0) continue;
      const isAsset = arApMap.get(dr.ref_id)?.type === 'RECEIVABLE';
      const diff = new Decimal(dr.rounding_diff);
      if ((isAsset && diff.gt(0)) || (!isAsset && diff.lt(0))) {
        totalRoundingIncome = totalRoundingIncome.plus(diff.abs());
      } else {
        totalRoundingExpense = totalRoundingExpense.plus(diff.abs());
      }
    }

    for (const pr of prepResults) {
      if (pr.rounding_diff === 0) continue;
      const prepType = prepMap.get(pr.ref_id)?.prepayment_type;
      const isAsset = prepType !== 'CLIENT'; // SUPPLIER, EMPLOYEE = asset; CLIENT = liability
      const diff = new Decimal(pr.rounding_diff);
      if ((isAsset && diff.gt(0)) || (!isAsset && diff.lt(0))) {
        totalRoundingIncome = totalRoundingIncome.plus(diff.abs());
      } else {
        totalRoundingExpense = totalRoundingExpense.plus(diff.abs());
      }
    }

    if (!totalRoundingIncome.isZero()) {
      const incomeConfig = await tx.accountingConfig.findUnique({ where: { key: 'finance_rounding_income' } });
      if (!incomeConfig?.account_code) {
        throw new BadRequestException('No se encontró la configuración contable "finance_rounding_income" para ajuste por redondeo');
      }
      jeItems.push({
        account_code: incomeConfig.account_code,
        amount: totalRoundingIncome.toNumber(),
        type: 'CREDIT',
        description: 'Ajuste por redondeo en decimales',
        third_party_id: third_party_id,
        reference_type: 'NORMAL',
      });
    }
    if (!totalRoundingExpense.isZero()) {
      const expenseConfig = await tx.accountingConfig.findUnique({ where: { key: 'finance_rounding_expense' } });
      if (!expenseConfig?.account_code) {
        throw new BadRequestException('No se encontró la configuración contable "finance_rounding_expense" para ajuste por redondeo');
      }
      jeItems.push({
        account_code: expenseConfig.account_code,
        amount: totalRoundingExpense.toNumber(),
        type: 'DEBIT',
        description: 'Ajuste por redondeo en decimales',
        third_party_id: third_party_id,
        reference_type: 'NORMAL',
      });
    }

    const journalEntry = await createJournalEntry(tx, {
      date,
      description: defaultDesc,
      type_key: typeKey,
      items: jeItems,
    });

    journalEntryId = journalEntry.id;
    journalEntryConsecutive = journalEntry.consecutive;

    // ── 5d. Mapear receipt lines ↔ JE items ──
    const createdJeItems = await tx.journalEntryItem.findMany({
      where: { journal_entry_id: journalEntry.id },
      select: { id: true, account_code: true, type: true, amount: true, reference_id: true, third_party_id: true, bank_account_id: true },
    });

    const usedJeIds = new Set<string>();

    for (let i = 0; i < receipt.lines.length && i < jeItems.length; i++) {
      const rl = receipt.lines[i];
      const je = jeItems[i];
      const match = createdJeItems.find(j =>
        !usedJeIds.has(j.id) &&
        j.account_code === je.account_code &&
        j.type === je.type &&
        new Decimal(j.amount).equals(new Decimal(je.amount)) &&
        (j.reference_id || null) === (je.reference_id || null) &&
        (j.third_party_id || null) === (je.third_party_id || null) &&
        (j.bank_account_id || null) === (je.bank_account_id || null)
      );
      if (match) {
        usedJeIds.add(match.id);
        rlToJeMap.set(rl.id, match.id);
      }
    }

    // 5e. Actualizar receipt lines con journal_entry_item_id
    for (const [rlId, jeItemId] of rlToJeMap) {
      await tx.paymentReceiptLine.update({
        where: { id: rlId },
        data: { journal_entry_item_id: jeItemId },
      });
    }

    // 5f. Actualizar PaymentReceipt con journal_entry_id
    await tx.paymentReceipt.update({
      where: { id: receipt.id },
      data: { journal_entry_id: journalEntry.id },
    });

    // 5g. Actualizar Payments con JE IDs (VIA receipt line mapping, no directo)
    for (const payment of createdPayments) {
      const jeItemId = rlToJeMap.get(payment.receipt_line_id);
      if (jeItemId) {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            journal_entry_id: journalEntry.id,
            journal_entry_item_id: jeItemId,
          },
        });
      }
    }

    // 5h. Actualizar PrepaymentMovements con journal_entry_id
    for (const mov of createdPrepMovements) {
      await tx.prepaymentMovement.update({
        where: { id: mov.id },
        data: { journal_entry_id: journalEntry.id },
      });
    }
  }

  // ── 6. Crear CC movements (independiente de contabilidad) ──
  if (params.hasCostCentersModule) {
    const typeKeys = [...new Set(lines.map(l => l.cost_center_movement_type_key).filter(Boolean))] as string[];
    const ccTypes = typeKeys.length > 0
      ? await tx.costCenterMovementType.findMany({
          where: { key: { in: typeKeys } },
          select: { key: true, nature: true },
        })
      : [];
    const natureMap = new Map(ccTypes.map((t: any) => [t.key, t.nature]));

    // Determinar reference type según tipo de recibo (diferenciando RC vs CE)
    const ccRefTypeKey = journalEntryId
      ? 'journal_entry'
      : (type === 'RECEIVABLE' ? 'payment_receipt' : 'disbursement');
    const ccRefId = journalEntryId || receipt.id;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.cost_center_id || !line.cost_center_movement_type_key) continue;

      const jeType = line.debit > 0 ? 'DEBIT' : 'CREDIT';
      const nature = natureMap.get(line.cost_center_movement_type_key);
      const sign = jeType === nature ? 'POSITIVE' : 'NEGATIVE';
      const amount = line.debit || line.credit;

      const ccMovement = await createCostCenterMovement(tx, {
        cost_center_id: line.cost_center_id,
        movement_date: date,
        type_key: line.cost_center_movement_type_key,
        reference_type_key: ccRefTypeKey,
        sign,
        amount,
        reference_id: ccRefId,
        description: line.description || defaultDesc,
      });

      // Vincular JE item con CC movement (solo si hay JE)
      if (journalEntryId) {
        const rlId = receipt.lines[i]?.id;
        const jeItemId = rlToJeMap.get(rlId);
        if (jeItemId) {
          await tx.journalEntryItem.update({
            where: { id: jeItemId },
            data: { cost_center_movement_id: ccMovement.id },
          });
        }
      }
    }
  }

  return {
    id: receipt.id,
    consecutive: receipt.consecutive,
    ...(journalEntryId && {
      journal_entry_id: journalEntryId,
      journal_entry_consecutive: journalEntryConsecutive,
    }),
  };
}
