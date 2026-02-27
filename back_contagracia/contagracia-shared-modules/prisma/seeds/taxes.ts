/**
 * Tasas de Impuestos - Datos DIAN
 *
 * tax_type_id: 1=IVA, 5=ReteIVA, 6=ReteFuente, 7=ReteICA
 *
 * Cuentas Contables:
 *   IMPUESTOS: tax_sales_account_code (24080501), tax_purchases_account_code (24081001)
 *   RETENCIONES: withholding_sales_account_code (a favor), withholding_purchases_account_code (por pagar)
 */
export const taxes = [
  // IMPUESTOS (IVA)
  { id: '1', code: '01', name: 'IVA 19%', rate: '19.00', tax_type_id: 1, is_system: true, tax_sales_account_code: '24080501', tax_purchases_account_code: '24081001' },
  { id: '2', code: '02', name: 'IVA 5%', rate: '5.00', tax_type_id: 1, is_system: true, tax_sales_account_code: '24080501', tax_purchases_account_code: '24081001' },
  { id: '3', code: '03', name: 'IVA 0%', rate: '0.00', tax_type_id: 1, is_system: true, tax_sales_account_code: '24080501', tax_purchases_account_code: '24081001' },
  // INC Bolsas (impuesto por unidad)
  { id: '7', code: '22-75', name: 'INCBP $75/bolsa', rate: '0', per_unit_amount: '75', tax_type_id: 10, is_system: true, tax_sales_account_code: '24950201', description: 'Impuesto al Consumo de Bolsa Plástica' },
  // RETENCIONES
  { id: '4', code: '04', name: 'ReteICA 0.5%', rate: '0.50', tax_type_id: 7, is_system: true, withholding_sales_account_code: '13551809', withholding_purchases_account_code: '23680509' },
  { id: '5', code: '05', name: 'ReteIVA 15%', rate: '15.00', tax_type_id: 5, is_system: true, withholding_sales_account_code: '13551705', withholding_purchases_account_code: '23670101' },
  { id: '6', code: '06', name: 'ReteFuente 2.5%', rate: '2.50', tax_type_id: 6, is_system: true, withholding_sales_account_code: '13551521', withholding_purchases_account_code: '23654001' },
];
