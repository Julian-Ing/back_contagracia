import { BadRequestException } from '@nestjs/common';
import { createJournalEntry, CreateJournalEntryResult } from './create-journal-entry';
import { validatePeriodOpen } from './validate-period-open';
import { createCostCenterMovement } from '@contagracia/shared-modules';

export interface ReverseJournalEntryParams {
  journal_entry_id: string;
  reversal_date?: Date | null; // null para reversión de period_close
  hasCostCentersModule?: boolean;
}

/**
 * Reversa un asiento contable creando uno nuevo con líneas invertidas.
 *
 * - Valida período contable ANTES de tocar cualquier tabla
 * - FOR UPDATE para evitar doble reversión
 * - Mantiene TODA la info de las líneas: account_code, amount, description,
 *   third_party_id, bank_account_id, reference_type, reference_id
 * - Solo invierte el tipo: DEBIT→CREDIT, CREDIT→DEBIT
 * - Descripción incluye consecutivo del original
 * - Marca el original como is_reversed = true
 * - NO toca bancos, CxC ni CxP — eso lo maneja el caller
 *
 * @param tx - Cliente de transacción Prisma (del caller)
 * @param params - ID del asiento y fecha de reversión
 */
export async function reverseJournalEntry(
  tx: any,
  params: ReverseJournalEntryParams
): Promise<CreateJournalEntryResult> {
  // 1. Validar período contable ANTES de tocar cualquier tabla
  // (solo si hay fecha — reversiones de period_close no tienen fecha)
  if (params.reversal_date) {
    await validatePeriodOpen(tx, params.reversal_date);
  }

  // 2. Lock del asiento para evitar doble reversión
  const [entry] = await tx.$queryRaw`
    SELECT id, consecutive, type_key, is_reversed, description, date
    FROM journal_entries
    WHERE id = ${params.journal_entry_id}
    FOR UPDATE
  `;

  if (!entry) {
    throw new BadRequestException('Asiento contable no encontrado');
  }

  if (entry.is_reversed) {
    throw new BadRequestException('El asiento ya fue reversado');
  }

  // Determinar fecha de reversión
  const date = params.reversal_date !== undefined ? params.reversal_date : entry.date;

  // 3. Obtener items del asiento con TODA la información
  const items = await tx.journalEntryItem.findMany({
    where: { journal_entry_id: params.journal_entry_id },
    select: {
      account_code: true,
      type: true,
      amount: true,
      description: true,
      third_party_id: true,
      bank_account_id: true,
      reference_type: true,
      reference_id: true,
      cost_center_id: true,
      cost_center_movement_type_key: true,
    },
  });

  // 4. Marcar original como reversado
  await tx.journalEntry.update({
    where: { id: params.journal_entry_id },
    data: { is_reversed: true },
  });

  // 5. Items invertidos: DEBIT→CREDIT, CREDIT→DEBIT
  //    Misma cuenta, monto, descripción, tercero, banco, tipo de línea, ref_id
  const reversalItems = items.map((item: any) => ({
    account_code: item.account_code,
    type: item.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
    amount: Number(item.amount),
    description: item.description,
    third_party_id: item.third_party_id,
    bank_account_id: item.bank_account_id,
    reference_type: item.reference_type,
    reference_id: item.reference_id,
    cost_center_id: item.cost_center_id || undefined,
    cost_center_movement_type_key: item.cost_center_movement_type_key || undefined,
  }));

  // 6. Descripción incluye consecutivo del original
  const description = `Reversión de ${entry.consecutive}: ${entry.description || 'asiento'}`;

  // 7. Crear asiento de reversión (createJournalEntry maneja consecutivo y validaciones)
  const reversalEntry = await createJournalEntry(tx, {
    date,
    description,
    type_key: 'reversal',
    reference_id: params.journal_entry_id,
    items: reversalItems,
  });

  // 8. Crear CC movements inversos si tiene el módulo
  if (params.hasCostCentersModule) {
    const typeKeys = [...new Set(reversalItems.map(i => i.cost_center_movement_type_key).filter(Boolean))] as string[];
    if (typeKeys.length > 0) {
      const ccTypes = await tx.costCenterMovementType.findMany({ where: { key: { in: typeKeys } }, select: { key: true, nature: true } });
      const natureMap = new Map(ccTypes.map((t: any) => [t.key, t.nature]));

      const jeItems = await tx.journalEntryItem.findMany({
        where: { journal_entry_id: reversalEntry.id },
        select: { id: true, account_code: true, type: true, amount: true, third_party_id: true, bank_account_id: true },
      });
      const usedIds = new Set<string>();

      for (const item of reversalItems) {
        if (!item.cost_center_id || !item.cost_center_movement_type_key) continue;
        const nature = natureMap.get(item.cost_center_movement_type_key);
        const sign = item.type === nature ? 'POSITIVE' : 'NEGATIVE';

        const ccMov = await createCostCenterMovement(tx, {
          cost_center_id: item.cost_center_id,
          movement_date: date,
          type_key: item.cost_center_movement_type_key,
          reference_type_key: 'journal_entry',
          sign,
          amount: item.amount,
          reference_id: reversalEntry.id,
          description: item.description || description,
        });

        const jeItem = jeItems.find((j: any) =>
          !usedIds.has(j.id) && j.account_code === item.account_code && j.type === item.type
          && Number(j.amount) === item.amount
          && (j.third_party_id || null) === (item.third_party_id || null)
          && (j.bank_account_id || null) === (item.bank_account_id || null),
        );
        if (jeItem) {
          usedIds.add(jeItem.id);
          await tx.journalEntryItem.update({ where: { id: jeItem.id }, data: { cost_center_movement_id: ccMov.id } });
        }
      }
    }
  }

  return reversalEntry;
}
