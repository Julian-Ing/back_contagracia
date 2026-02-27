import { PrismaClient } from '@prisma/client-master';

/**
 * Tipos de Movimientos Bancarios
 * Solo los tipos de asiento que generan movimientos en cuentas bancarias (1110*) o cajas (1105*)
 */
export const bankMovementTypes = [
  // Cobros (Ingresos)
  { key: 'invoice_receivable_payment', description: 'Cobros de Factura de Venta' },
  { key: 'invoice_debit_note_receivable_payment', description: 'Cobros a Nota Débito' },
  { key: 'expense_return_receivable_payment', description: 'Cobros a Devoluciones de Gastos' },
  { key: 'purchase_return_receivable_payment', description: 'Cobros a Devoluciones de Compras' },
  { key: 'manual_receivable_payment', description: 'Cobros a Documentos Manuales CxC' },
  { key: 'client_prepayment', description: 'Anticipo de clientes' },
  { key: 'supplier_prepayment_refund', description: 'Reembolso Anticipo de proveedores' },
  { key: 'fixed_asset_sale', description: 'Venta de Activo Fijo' },

  // Pagos (Egresos)
  { key: 'invoice_credit_note_payable_payment', description: 'Abonos a Nota Crédito' },
  { key: 'expense_payable_payment', description: 'Abonos a Gastos' },
  { key: 'purchase_payable_payment', description: 'Abonos a Compras' },
  { key: 'manual_payable_payment', description: 'Abonos a Documentos Manuales CxP' },
  { key: 'supplier_prepayment', description: 'Anticipo de proveedores' },
  { key: 'client_prepayment_refund', description: 'Reembolso Anticipo de clientes' },
  { key: 'employee_prepayment', description: 'Anticipo a empleados' },
  { key: 'employee_prepayment_refund', description: 'Reembolso Anticipo de empleados' },
  { key: 'travel_expense_advance', description: 'Anticipo gastos de viaje' },
  { key: 'tax_payable', description: 'Pago de Impuestos' },
  { key: 'tax_payable_iva', description: 'Pago de IVA' },
  { key: 'tax_payable_inc', description: 'Pago de INC' },
  { key: 'tax_payable_retefuente', description: 'Pago de Retefuente' },
  { key: 'tax_payable_reteiva', description: 'Pago de ReteIVA' },
  { key: 'tax_payable_reteica', description: 'Pago de ReteICA' },
  { key: 'payroll', description: 'Pago de Nómina' },
  { key: 'liquidation_service_bonus', description: 'Pago de Primas' },
  { key: 'liquidation_severance', description: 'Pago de Cesantías' },
  { key: 'liquidation_vacation', description: 'Pago de Vacaciones' },
  { key: 'liquidation_end_contract', description: 'Pago Liquidación de Contrato' },

  // Recibos y Comprobantes
  { key: 'invoice_voucher', description: 'Recibo de Caja' },
  { key: 'expense_voucher', description: 'Comprobante de Egreso' },

  // Bancarios
  { key: 'bank_transfer', description: 'Transferencia Bancaria' },
  { key: 'bank_adjustment', description: 'Ajuste Bancario' },
  { key: 'bank_account_opening', description: 'Saldo Inicial Bancario' },
  { key: 'bank_reconciliation_adjustment', description: 'Ajuste por Conciliación' },

  // Manuales
  { key: 'manual', description: 'Movimiento Manual' },
  { key: 'reversal', description: 'Reversión' },
];

export async function seedBankMovementTypes(prisma: PrismaClient) {
  console.log('Seeding bank_movement_types...');

  for (const type of bankMovementTypes) {
    await prisma.bankMovementType.upsert({
      where: { key: type.key },
      update: { description: type.description },
      create: type,
    });
  }

  console.log(`  ✓ ${bankMovementTypes.length} bank movement types`);
}
