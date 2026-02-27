/**
 * Tipos de Referencia de Movimiento de Centro de Costos (tipo de documento origen)
 *
 * Indica de qué documento/proceso se originó el movimiento.
 * Permite resolver el reference_id sin buscar tabla por tabla.
 */
export const costCenterMovementReferenceTypes: { key: string; name: string }[] = [
  // ===== Documentos de Venta =====
  { key: 'invoice', name: 'Factura de Venta' },
  { key: 'invoice_credit_note', name: 'Nota Crédito Venta' },
  { key: 'invoice_debit_note', name: 'Nota Débito Venta' },

  // ===== Documentos de Compra =====
  { key: 'purchase', name: 'Compra' },
  { key: 'purchase_credit_note', name: 'Nota Crédito Compra' },

  // ===== Documentos de Gasto =====
  { key: 'expense', name: 'Gasto' },
  { key: 'expense_credit_note', name: 'Nota Crédito Gasto' },

  // ===== Contabilidad =====
  { key: 'journal_entry', name: 'Asiento Contable' },
  { key: 'payment_receipt', name: 'Recibo de Caja' },
  { key: 'disbursement', name: 'Comprobante de Egreso' },

  // ===== Cartera =====
  { key: 'prepayment', name: 'Anticipo' },

  // ===== Bancos / Impuestos =====
  { key: 'bank_account_opening', name: 'Saldo Inicial Banco/Caja' },
  { key: 'bank_reconciliation', name: 'Conciliación Bancaria' },
  { key: 'tax_report', name: 'Reporte de Impuestos' },

  // ===== Nómina =====
  { key: 'payroll', name: 'Nómina' },
];
