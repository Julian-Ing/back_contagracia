import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantContextService } from '@contagracia/shared-modules';

/* ── DTOs ─────────────────────────────────────────────────── */

export interface CreatePaymentDto {
  ar_ap_id: string;                    // Documento CxC/CxP al que se aplica
  date: string;                        // YYYY-MM-DD
  amount: number;                      // Monto del pago
  payment_receipt_line_id?: string;    // Línea del recibo de pago que originó este pago
  bank_account_id?: string;            // Cuenta bancaria si aplica
  description?: string;
}

/* ── Service ──────────────────────────────────────────────── */

@Injectable()
export class PaymentsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  private async getTenantDb(companyId: string) {
    const tenantDb = await this.tenantContext.getTenantClient(companyId);
    if (!tenantDb) throw new NotFoundException('Empresa no encontrada o inactiva');
    return tenantDb;
  }

  /**
   * Crear pago individual contra un documento CxC/CxP
   *
   * Integraciones:
   * - Actualizar ArAp.paid, ArAp.balance, ArAp.status (PARTIAL / PAID)
   * - Crear asiento contable (createJournalEntry) con reference_type PAYMENT
   * - Si tiene bank_account_id → crear movimiento bancario (createBankMovement)
   * - Asignar consecutivo (getNextConsecutive 'payment')
   * - Validar periodo abierto (validatePeriodOpen)
   * - Validar que amount <= ArAp.balance
   */
  async createPayment(companyId: string, dto: CreatePaymentDto): Promise<any> {
    // TODO: implementar
    throw new BadRequestException('createPayment no implementado aún');
  }
}
