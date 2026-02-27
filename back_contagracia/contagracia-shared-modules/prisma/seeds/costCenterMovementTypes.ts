/**
 * Tipos de Movimiento de Centro de Costos (tipo de línea)
 *
 * Cada tipo representa qué concepto es la línea del movimiento.
 * Un documento puede generar varias líneas con tipos distintos
 * y cada una puede ir a un CC diferente.
 *
 * `nature` indica la naturaleza contable del tipo (DEBIT o CREDIT).
 * Se usa para determinar el sign del movimiento:
 *   - Si el JE item type === nature → POSITIVE
 *   - Si el JE item type !== nature → NEGATIVE
 *
 * La empresa puede crear tipos adicionales desde la UI.
 * También se usan en ProjectionItem para presupuestos por tipo.
 */
export const costCenterMovementTypes: { key: string; name: string; nature: 'DEBIT' | 'CREDIT' }[] = [
  // ===== Ingresos / Costos / Gastos =====
  { key: 'income', name: 'Ingreso', nature: 'CREDIT' },
  { key: 'cost', name: 'Costo', nature: 'DEBIT' },
  { key: 'expense', name: 'Gasto', nature: 'DEBIT' },

  // ===== Impuestos =====
  { key: 'tax_iva', name: 'IVA', nature: 'CREDIT' },
  { key: 'tax_inc', name: 'INC', nature: 'CREDIT' },

  // ===== Retenciones =====
  { key: 'withholding_income', name: 'ReteFuente', nature: 'CREDIT' },
  { key: 'withholding_iva', name: 'ReteIVA', nature: 'CREDIT' },
  { key: 'withholding_ica', name: 'ReteICA', nature: 'CREDIT' },

  // ===== Cartera =====
  { key: 'cxc', name: 'Cuentas por Cobrar', nature: 'DEBIT' },
  { key: 'cxp', name: 'Cuentas por Pagar', nature: 'CREDIT' },

  // ===== Tesorería =====
  { key: 'bank_movement', name: 'Movimiento Bancario', nature: 'DEBIT' },
  { key: 'cash_movement', name: 'Movimiento de Caja', nature: 'DEBIT' },

  // ===== Anticipos =====
  { key: 'prepayment_customer', name: 'Anticipo de Cliente', nature: 'CREDIT' },
  { key: 'prepayment_supplier', name: 'Anticipo de Proveedor', nature: 'DEBIT' },
  { key: 'prepayment_employee', name: 'Anticipo de Empleado', nature: 'DEBIT' },

  // ===== Contabilidad =====
  { key: 'tax_settlement', name: 'Liquidación de Impuesto', nature: 'CREDIT' },
  { key: 'reconciliation_adjustment', name: 'Ajuste de Conciliación', nature: 'DEBIT' },
  { key: 'other', name: 'Otro', nature: 'DEBIT' },
];
