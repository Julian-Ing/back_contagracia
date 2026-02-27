/**
 * Tipos de Consecutivos
 * Catálogo maestro de todos los tipos de consecutivos del sistema
 *
 * table_name: Nombre del modelo Prisma
 * field_name: Campo donde va el consecutivo (default: 'consecutive')
 * condition_field: Campo para condición (opcional)
 * condition_value: Valor de la condición (opcional)
 */
export const consecutiveTypes = [
  // =====================
  // Documentos - Borrador genérico
  // =====================
  { type: 'document_draft', default_prefix: 'BR', description: 'Borrador de Documento', table_name: 'Document', condition_field: 'status', condition_value: 'DRAFT' },

  // =====================
  // Documentos (usa Document con doc_type)
  // =====================
  { type: 'invoice', default_prefix: 'FV', description: 'Factura de Venta', table_name: 'Document', condition_field: 'doc_type', condition_value: 'INVOICE' },
  { type: 'invoice_credit_note', default_prefix: 'NC', description: 'Nota Crédito Venta', table_name: 'Document', condition_field: 'doc_type', condition_value: 'INVOICE_CREDIT_NOTE' },
  { type: 'invoice_debit_note', default_prefix: 'ND', description: 'Nota Débito Venta', table_name: 'Document', condition_field: 'doc_type', condition_value: 'INVOICE_DEBIT_NOTE' },
  { type: 'invoice_recurrent', default_prefix: 'FVR', description: 'Factura Recurrente', table_name: 'Document', condition_field: 'doc_type', condition_value: 'INVOICE_RECURRENT' },
  { type: 'invoice_pos', default_prefix: 'POS', description: 'Factura POS', table_name: 'Document', condition_field: 'doc_type', condition_value: 'INVOICE_POS' },
  { type: 'purchase', default_prefix: 'CO', description: 'Compra', table_name: 'Document', condition_field: 'doc_type', condition_value: 'PURCHASE' },
  { type: 'purchase_credit_note', default_prefix: 'NCC', description: 'Nota Crédito Compra', table_name: 'Document', condition_field: 'doc_type', condition_value: 'PURCHASE_CREDIT_NOTE' },
  { type: 'expense', default_prefix: 'GA', description: 'Gasto', table_name: 'Document', condition_field: 'doc_type', condition_value: 'EXPENSE' },
  { type: 'expense_credit_note', default_prefix: 'NCG', description: 'Nota Crédito Gasto', table_name: 'Document', condition_field: 'doc_type', condition_value: 'EXPENSE_CREDIT_NOTE' },
  { type: 'expense_recurrent', default_prefix: 'GAR', description: 'Gasto Recurrente', table_name: 'Document', condition_field: 'doc_type', condition_value: 'EXPENSE_RECURRENT' },
  { type: 'purchase_order', default_prefix: 'OC', description: 'Orden de Compra', table_name: 'Document', condition_field: 'doc_type', condition_value: 'PURCHASE_ORDER' },
  { type: 'reception', default_prefix: 'RC', description: 'Recepción de Mercancía', table_name: 'DocumentReception', condition_field: null, condition_value: null },

  // =====================
  // Cotizaciones
  // =====================
  { type: 'quote_sale', default_prefix: 'CTV', description: 'Cotización de Venta', table_name: 'Document', condition_field: 'doc_type', condition_value: 'QUOTE_INVOICE' },
  { type: 'quote_crm', default_prefix: 'CTC', description: 'Cotización CRM', table_name: 'Document', condition_field: 'doc_type', condition_value: 'QUOTE_CRM' },

  // =====================
  // Contabilidad
  // =====================
  { type: 'journal_entry', default_prefix: 'JE', description: 'Asiento Contable', table_name: 'JournalEntry', condition_field: null, condition_value: null },
  { type: 'payment_receipt', default_prefix: 'REC', description: 'Recibo de Caja', table_name: 'PaymentReceipt', condition_field: null, condition_value: null },
  { type: 'disbursement', default_prefix: 'CE', description: 'Comprobante de Egreso', table_name: null, condition_field: null, condition_value: null },
  { type: 'receivable_payment', default_prefix: 'RP', description: 'Pago Recibido', table_name: 'Payment', condition_field: null, condition_value: null },
  { type: 'payable_payment', default_prefix: 'PP', description: 'Pago Realizado', table_name: 'Payment', condition_field: null, condition_value: null },
  { type: 'prepayment', default_prefix: 'AT', description: 'Anticipo', table_name: 'Prepayment', condition_field: null, condition_value: null },
  { type: 'prepayment_movement', default_prefix: 'ATM', description: 'Movimiento de Anticipo', table_name: 'PrepaymentMovement', condition_field: null, condition_value: null },
  { type: 'accounting_period', default_prefix: 'PC', description: 'Periodo Contable', table_name: 'AccountingPeriod', condition_field: null, condition_value: null },
  { type: 'ar_ap_receivable', default_prefix: 'CXC', description: 'Cuenta por Cobrar', table_name: 'ArAp', condition_field: 'type', condition_value: 'RECEIVABLE' },
  { type: 'ar_ap_payable', default_prefix: 'CXP', description: 'Cuenta por Pagar', table_name: 'ArAp', condition_field: 'type', condition_value: 'PAYABLE' },
  { type: 'bank_reconciliation', default_prefix: 'BC', description: 'Conciliación Bancaria', table_name: 'BankReconciliation', condition_field: null, condition_value: null },
  { type: 'bank_reconciliation_adjustment', default_prefix: 'BCA', description: 'Ajuste Conciliación', table_name: null, condition_field: null, condition_value: null },
  { type: 'bank_movement', default_prefix: 'MB', description: 'Movimiento Bancario', table_name: 'BankMovement', condition_field: null, condition_value: null },
  { type: 'tax_report', default_prefix: 'TR', description: 'Reporte de Impuestos', table_name: 'TaxReport', condition_field: null, condition_value: null },

  // =====================
  // Inventario
  // =====================
  { type: 'product', default_prefix: 'ART', description: 'Producto/Artículo', table_name: 'Product', condition_field: null, condition_value: null },
  { type: 'product_category', default_prefix: 'CAT', description: 'Categoría de Producto', table_name: 'ProductCategory', condition_field: null, condition_value: null },
  { type: 'product_attribute', default_prefix: 'ATR', description: 'Atributo de Producto', table_name: 'ProductAttribute', condition_field: null, condition_value: null },
  { type: 'product_movement', default_prefix: 'IM', description: 'Movimiento de Producto', table_name: 'ProductMovement', condition_field: null, condition_value: null },
  { type: 'product_attribute_option', default_prefix: 'OPC', description: 'Opción de Atributo', table_name: 'ProductAttributeOption', condition_field: null, condition_value: null },
  { type: 'storage_transfer', default_prefix: 'TI', description: 'Traslado entre Bodegas', table_name: 'StorageTransfer', condition_field: null, condition_value: null },
  { type: 'product_transfer', default_prefix: 'TP', description: 'Transferencia entre Productos', table_name: 'ProductTransfer', condition_field: null, condition_value: null },
  { type: 'storage', default_prefix: 'BOD', description: 'Bodega', table_name: 'Storage', condition_field: null, condition_value: null },
  { type: 'warehouse', default_prefix: 'ALM', description: 'Almacén', table_name: 'Warehouse', condition_field: null, condition_value: null },

  // =====================
  // Activos Fijos
  // =====================
  { type: 'fixed_asset', default_prefix: 'AF', description: 'Activo Fijo', table_name: 'FixedAsset', condition_field: null, condition_value: null },
  { type: 'fixed_asset_movement', default_prefix: 'AFM', description: 'Movimiento de Activo Fijo', table_name: 'FixedAssetMovement', condition_field: null, condition_value: null },

  // =====================
  // Caja
  // =====================
  { type: 'cash_register', default_prefix: 'CA', description: 'Caja Registradora', table_name: 'CashRegister', condition_field: null, condition_value: null },
  { type: 'cash_session', default_prefix: 'SC', description: 'Sesión de Caja', table_name: 'CashSession', condition_field: null, condition_value: null },
  { type: 'cash_movement', default_prefix: 'MC', description: 'Movimiento de Caja', table_name: 'CashMovement', condition_field: null, condition_value: null },

  // =====================
  // Centros de Costos
  // =====================
  { type: 'cost_center', default_prefix: 'CCT', description: 'Centro de Costos', table_name: 'CostCenter', condition_field: null, condition_value: null },
  { type: 'projection', default_prefix: 'PRJ', description: 'Proyección', table_name: 'Projection', condition_field: null, condition_value: null },

  // =====================
  // Cartera
  // =====================
  { type: 'company_payment_method', default_prefix: 'MP', description: 'Método de Pago', table_name: 'CompanyPaymentMethod', condition_field: null, condition_value: null },

  // =====================
  // Otros (pendiente por compañeros)
  // =====================
  { type: 'expense_legalization', default_prefix: 'LG', description: 'Legalización de Viáticos', table_name: null, condition_field: null, condition_value: null },
  { type: 'payroll', default_prefix: 'NOM', description: 'Nómina', table_name: null, condition_field: null, condition_value: null },
];
