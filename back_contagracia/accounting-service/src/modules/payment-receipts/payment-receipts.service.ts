import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';
import { PaymentReceiptType, PaymentReceiptLineKind } from '@prisma/client-tenant';
import { createPaymentReceiptWithJournalEntry } from '../../functions/create-payment-receipt-with-journal-entry';
import { voidPaymentReceiptWithJournalEntry } from '../../functions/void-payment-receipt-with-journal-entry';

/* ── DTOs ─────────────────────────────────────────────────── */

export interface CreatePaymentReceiptLineDto {
  kind: PaymentReceiptLineKind;        // DOC | BANK | ACCOUNT | PREP_USED
  account_code: string;                // Cuenta contable
  debit: number;
  credit: number;
  ref_id?: string;                     // ID referencia (ar_ap_id, bank_account_id, prepayment_id)
  applied_to_source_key?: string;      // Source key del doc aplicado
  applied_to_id?: string;              // ID del doc aplicado
  company_payment_method_id?: string;  // Método de pago (obligatorio en líneas DOC para RECEIVABLE/PAYABLE)
  description?: string;
  cost_center_id?: string;
  cost_center_movement_type_key?: string;
}

export interface CreatePaymentReceiptDto {
  type: PaymentReceiptType;            // RECEIVABLE = Recibo de Caja, PAYABLE = Comprobante de Egreso
  date: string;                        // YYYY-MM-DD
  third_party_id: string;              // Tercero (cliente o proveedor)
  description?: string;
  lines: CreatePaymentReceiptLineDto[];
}

/* ── Service ──────────────────────────────────────────────── */

@Injectable()
export class PaymentReceiptsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) throw new NotFoundException('Empresa no encontrada o inactiva');
    return tenantDb;
  }

  /**
   * Obtener detalle de un recibo con sus líneas y relaciones
   */
  async getOne(companyId: string, receiptId: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);

    const receipt = await tenantDb.paymentReceipt.findUnique({
      where: { id: receiptId },
      include: {
        third_party: { select: { id: true, name: true, identification_number: true } },
        lines: {
          select: {
            id: true,
            kind: true,
            account_code: true,
            debit: true,
            credit: true,
            ref_id: true,
            description: true,
            company_payment_method: { select: { id: true, name: true } },
            cost_center: { select: { id: true, consecutive: true, name: true } },
            cost_center_movement_type: { select: { key: true, name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!receipt) throw new NotFoundException('Recibo no encontrado');

    // Enriquecer líneas con datos de las referencias
    const enrichedLines = await Promise.all(
      receipt.lines.map(async (line: any) => {
        const base = {
          id: line.id,
          kind: line.kind,
          account_code: line.account_code,
          debit: Number(line.debit),
          credit: Number(line.credit),
          ref_id: line.ref_id,
          description: line.description,
          company_payment_method: line.company_payment_method,
          cost_center: line.cost_center || null,
          cost_center_movement_type: line.cost_center_movement_type || null,
          account: null as any,
          ref_label: null as string | null,
          ref_current_balance: null as number | null,
        };

        // Cuenta contable
        if (line.account_code) {
          const acct = await tenantDb.chartOfAccount.findUnique({
            where: { code: line.account_code },
            select: { code: true, name: true },
          });
          base.account = acct;
        }

        // Label según tipo de línea
        if ((line.kind === 'DOC' || line.kind === 'CXC_CREATED' || line.kind === 'CXP_CREATED') && line.ref_id) {
          const arAp = await tenantDb.arAp.findUnique({
            where: { id: line.ref_id },
            select: { consecutive: true, source_number: true, balance: true, source: { select: { description: true } } },
          });
          base.ref_label = arAp
            ? [arAp.consecutive || arAp.source_number, arAp.source?.description].filter(Boolean).join(' | ')
            : line.ref_id;
          base.ref_current_balance = arAp ? Number(arAp.balance) : 0;
        } else if (line.kind === 'BANK' && line.ref_id) {
          const bank = await tenantDb.bankAccount.findUnique({
            where: { id: line.ref_id },
            select: { account_name: true, account_number: true },
          });
          base.ref_label = bank ? `${bank.account_name} - ${bank.account_number}` : line.ref_id;
        } else if (line.kind === 'PREP_USED' && line.ref_id) {
          const prep = await tenantDb.prepayment.findUnique({
            where: { id: line.ref_id },
            select: { consecutive: true, prepayment_type: true, balance: true, third_party: { select: { name: true } } },
          });
          if (prep) {
            const typeLabel = { CLIENT: 'Cliente', SUPPLIER: 'Proveedor', EMPLOYEE: 'Empleado' }[prep.prepayment_type] || '';
            base.ref_label = [prep.consecutive, typeLabel, prep.third_party?.name].filter(Boolean).join(' | ');
            base.ref_current_balance = Number(prep.balance);
          }
        } else if (line.kind === 'ACCOUNT') {
          base.ref_label = base.account ? `${base.account.code} - ${base.account.name}` : line.account_code;
        }

        return base;
      }),
    );

    return {
      id: receipt.id,
      type: receipt.type,
      consecutive: receipt.consecutive,
      date: receipt.date,
      amount: Number(receipt.amount),
      description: receipt.description,
      status: receipt.status,
      journal_entry_id: receipt.journal_entry_id,
      third_party: receipt.third_party,
      lines: enrichedLines,
    };
  }

  /**
   * Crear recibo de caja (RECEIVABLE) o comprobante de egreso (PAYABLE)
   *
   * Valida tipo y periodo, luego delega a createPaymentReceiptWithJournalEntry
   * dentro de una $transaction única.
   */
  async createPaymentReceipt(companyId: string, dto: CreatePaymentReceiptDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const date = new Date(dto.date);
    const hasAccounting = await this.tenantContext.hasModule(companyId, 'accounting');
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');

    // Validar tipo (MANUAL se crea desde asientos manuales)
    if ((dto.type as string) === 'MANUAL') {
      throw new BadRequestException('Los recibos tipo MANUAL se crean desde el módulo de asientos manuales');
    }

    // Validar CC si el módulo está activo
    if (hasCostCentersModule) {
      for (const line of dto.lines) {
        if (!line.cost_center_id) throw new BadRequestException('Línea sin centro de costos');
        if (!line.cost_center_movement_type_key) throw new BadRequestException('Línea sin tipo de movimiento CC');
      }
    }

    // Todo en UNA transacción (periodo se valida dentro de createPaymentReceiptWithJournalEntry)
    return tenantDb.$transaction(async (tx: any) => {
      return createPaymentReceiptWithJournalEntry(tx, {
        type: dto.type,
        date,
        third_party_id: dto.third_party_id,
        description: dto.description,
        hasAccounting,
        hasCostCentersModule,
        lines: dto.lines.map(l => ({
          kind: l.kind,
          account_code: l.account_code,
          debit: l.debit,
          credit: l.credit,
          ref_id: l.ref_id,
          company_payment_method_id: l.company_payment_method_id,
          applied_to_source_key: l.applied_to_source_key,
          applied_to_id: l.applied_to_id,
          description: l.description,
          cost_center_id: l.cost_center_id,
          cost_center_movement_type_key: l.cost_center_movement_type_key,
        })),
      });
    });
  }

  /**
   * Editar recibo: anula el existente y crea uno nuevo en una sola transacción
   */
  async editPaymentReceipt(companyId: string, receiptId: string, dto: CreatePaymentReceiptDto): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const date = new Date(dto.date);
    const hasAccounting = await this.tenantContext.hasModule(companyId, 'accounting');
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');

    if ((dto.type as string) === 'MANUAL') {
      throw new BadRequestException('Los recibos tipo MANUAL se crean desde el módulo de asientos manuales');
    }

    // Validar CC si el módulo está activo
    if (hasCostCentersModule) {
      for (const line of dto.lines) {
        if (!line.cost_center_id) throw new BadRequestException('Línea sin centro de costos');
        if (!line.cost_center_movement_type_key) throw new BadRequestException('Línea sin tipo de movimiento CC');
      }
    }

    return tenantDb.$transaction(async (tx: any) => {
      // 1. Anular el recibo existente (restaura saldos, revierte asiento)
      await voidPaymentReceiptWithJournalEntry(tx, {
        payment_receipt_id: receiptId,
        reversal_date: date,
        hasAccounting,
        hasCostCentersModule,
      });

      // 2. Crear el nuevo recibo con los datos actualizados
      return createPaymentReceiptWithJournalEntry(tx, {
        type: dto.type,
        date,
        third_party_id: dto.third_party_id,
        description: dto.description,
        hasAccounting,
        hasCostCentersModule,
        lines: dto.lines.map(l => ({
          kind: l.kind,
          account_code: l.account_code,
          debit: l.debit,
          credit: l.credit,
          ref_id: l.ref_id,
          company_payment_method_id: l.company_payment_method_id,
          applied_to_source_key: l.applied_to_source_key,
          applied_to_id: l.applied_to_id,
          description: l.description,
          cost_center_id: l.cost_center_id,
          cost_center_movement_type_key: l.cost_center_movement_type_key,
        })),
      });
    });
  }

  /**
   * Reversar recibo de caja o comprobante de egreso
   * Sirve para RECEIVABLE (RC) y PAYABLE (CE)
   *
   * Integraciones:
   * - Marcar PaymentReceipt.status = VOIDED
   * - Reversar cada Payment → is_voided = true, revertir ArAp (paid, balance, status)
   * - Reversar movimientos bancarios asociados
   * - Reversar PrepaymentMovements → devolver balance al Prepayment
   * - Crear asiento de reversión (journal entry reversal)
   * - Validar periodo abierto
   */
  async reversePaymentReceipt(companyId: string, receiptId: string, reason?: string): Promise<any> {
    const tenantDb = await this.getTenantDb(companyId);
    const hasAccounting = await this.tenantContext.hasModule(companyId, 'accounting');
    const hasCostCentersModule = await this.tenantContext.hasModule(companyId, 'cost_centers');

    return tenantDb.$transaction(async (tx: any) => {
      return voidPaymentReceiptWithJournalEntry(tx, {
        payment_receipt_id: receiptId,
        reversal_date: new Date(),
        hasAccounting,
        hasCostCentersModule,
      });
    });
  }
}
