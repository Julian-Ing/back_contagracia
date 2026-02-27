import { BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client-tenant/runtime/library';
import { getNextConsecutive } from '@contagracia/shared-modules';

export interface CreateArApParams {
  third_party_id: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  source_key: string;
  source_id: string;
  source_number?: string;
  date: Date;
  due_date?: Date;
  amount: number;
  description?: string;
  account_code?: string;
  journal_entry_id?: string;
}

export interface CreateArApResult {
  id: string;
  consecutive: string;
}

/**
 * Crea una cuenta por cobrar (CXC) o cuenta por pagar (CXP)
 *
 * Validaciones:
 * - Tercero debe existir
 * - Source debe existir en ar_ap_sources
 * - Monto debe ser > 0
 * - due_date >= date si se proporciona
 * - account_code debe existir si se proporciona
 *
 * @param tx - Cliente de transacción Prisma (del caller)
 * @param params - Datos de la CxC/CxP
 */
export async function createArAp(
  tx: any,
  params: CreateArApParams,
): Promise<CreateArApResult> {
  const amount = new Decimal(params.amount).toDecimalPlaces(4);
  if (amount.lte(0)) {
    throw new BadRequestException('El monto debe ser mayor a 0');
  }

  if (params.due_date && params.due_date < params.date) {
    throw new BadRequestException('La fecha de vencimiento no puede ser menor a la fecha de emisión');
  }

  const thirdParty = await tx.thirdParty.findUnique({
    where: { id: params.third_party_id },
    select: { id: true },
  });
  if (!thirdParty) {
    throw new BadRequestException('Tercero no encontrado');
  }

  const source = await tx.arApSource.findUnique({
    where: { key: params.source_key },
    select: { key: true },
  });
  if (!source) {
    throw new BadRequestException(`Fuente '${params.source_key}' no configurada`);
  }

  if (params.account_code) {
    const account = await tx.chartOfAccount.findUnique({
      where: { code: params.account_code },
      select: { code: true },
    });
    if (!account) {
      throw new BadRequestException(`Cuenta contable ${params.account_code} no encontrada`);
    }
  }

  const consecutiveType = params.type === 'RECEIVABLE' ? 'ar_ap_receivable' : 'ar_ap_payable';
  const consecutive = await getNextConsecutive(tx, consecutiveType);

  const record = await tx.arAp.create({
    data: {
      third_party_id: params.third_party_id,
      type: params.type,
      source_key: params.source_key,
      source_id: params.source_id,
      source_number: params.source_number || null,
      consecutive,
      date: params.date,
      due_date: params.due_date || null,
      amount: amount.toNumber(),
      paid: 0,
      balance: amount.toNumber(),
      status: 'PENDING',
      description: params.description || null,
      account_code: params.account_code || null,
      journal_entry_id: params.journal_entry_id || null,
    },
  });

  return {
    id: record.id,
    consecutive: record.consecutive,
  };
}
