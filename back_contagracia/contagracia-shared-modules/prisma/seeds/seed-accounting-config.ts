import { PrismaClient } from '@prisma/client-master';

// Configuraciones de contabilidad por módulo
const ACCOUNTING_CONFIGS = [
  // SALES
  { key: 'sales_iva', description: 'IVA Ventas', account_code: '24080501', default: '24080501' },
  { key: 'sales_reteiva', description: 'ReteIVA Ventas', account_code: '13551705', default: '13551705' },
  { key: 'sales_reteica', description: 'ReteICA Ventas', account_code: '13551809', default: '13551809' },
  { key: 'sales_retefuente', description: 'ReteFuente Ventas', account_code: '13551521', default: '13551521' },
  { key: 'sales_discounts', description: 'Descuentos', account_code: '53053501', default: '53053501' },
  { key: 'sales_customer_advance', description: 'Anticipo Cliente', account_code: '28050501', default: '28050501' },
  // PURCHASES
  { key: 'purchases_iva', description: 'IVA Compras', account_code: '24081001', default: '24081001' },
  { key: 'purchases_reteiva', description: 'ReteIVA Compras', account_code: '23670101', default: '23670101' },
  { key: 'purchases_reteica', description: 'ReteICA Compras', account_code: '23680509', default: '23680509' },
  { key: 'purchases_retefuente', description: 'ReteFuente Compras', account_code: '23654001', default: '23654001' },
  { key: 'purchases_discounts', description: 'Descuentos', account_code: '41350502', default: '41350502' },
  { key: 'purchases_supplier_advance', description: 'Anticipo Proveedores', account_code: '13300501', default: '13300501' },
  { key: 'purchases_misc_expenses', description: 'Gastos Diversos', account_code: '52959505', default: '52959505' },
  // INVENTORY
  { key: 'inventory_service_revenue', description: 'Ingresos Servicios', account_code: '413506', default: '413506' },
  { key: 'inventory_products', description: 'Inventario Productos', account_code: '143501', default: '143501' },
  { key: 'inventory_product_revenue', description: 'Ingresos Productos', account_code: '41350501', default: '41350501' },
  { key: 'inventory_product_costs', description: 'Costos Productos', account_code: '61350501', default: '61350501' },
  { key: 'inventory_aiu_administration', description: 'Ingresos AIU Administración', account_code: '413507', default: '413507' },
  { key: 'inventory_aiu_contingencies', description: 'Ingresos AIU Imprevistos', account_code: '413508', default: '413508' },
  { key: 'inventory_aiu_utility', description: 'Ingresos AIU Utilidad', account_code: '413509', default: '413509' },
  { key: 'inventory_surplus_income', description: 'Ganancias por sobrantes de inventarios', account_code: '424520', default: '424520' },
  { key: 'inventory_shrinkage_cost', description: 'Otros costos – mermas y ajustes de inventario', account_code: '613595', default: '613595' },
  // FINANCE
  { key: 'finance_cxc', description: 'Cuentas por Cobrar', account_code: '13050501', default: '13050501' },
  { key: 'finance_cxp', description: 'Cuentas por Pagar', account_code: '22050501', default: '22050501' },
  { key: 'finance_bank_account', description: 'Cuenta Bancos', account_code: '11100501', default: '11100501' },
  { key: 'finance_cash_account', description: 'Cuenta Cajas', account_code: '11050501', default: '11050501' },
  { key: 'finance_reteiva_payable', description: 'ReteIVA por Pagar', account_code: '23670105', default: '23670105' },
  { key: 'finance_reteica_payable', description: 'ReteICA por Pagar', account_code: '23680599', default: '23680599' },
  { key: 'finance_retefuente_payable', description: 'ReteFuente por Pagar', account_code: '23654099', default: '23654099' },
  { key: 'finance_iva_payable', description: 'IVA por Pagar', account_code: '240808', default: '240808' },
  { key: 'finance_inc_sales', description: 'INC en Ventas', account_code: '24950101', default: '24950101' },
  { key: 'finance_inc_payable', description: 'INC por Pagar', account_code: '24950105', default: '24950105' },
  { key: 'finance_bag_tax_sales', description: 'Impuesto Bolsas en Ventas', account_code: '24950201', default: '24950201' },
  { key: 'finance_bag_tax_payable', description: 'Impuesto Bolsas por Pagar', account_code: '24950202', default: '24950202' },
  { key: 'finance_bag_revenue', description: 'Ingreso Venta Bolsas Plásticas', account_code: '41350503', default: '41350503' },
  // ACCOUNTING
  { key: 'accounting_social_capital', description: 'Capital Social', account_code: '310505', default: '310505' },
  { key: 'accounting_iva_in_favor', description: 'IVA a Favor', account_code: '135519', default: '135519' },
  { key: 'accounting_retained_earnings', description: 'Utilidades Retenidas', account_code: '360505', default: '360505' },
  { key: 'accounting_previous_year_results', description: 'Resultados de Ejercicios Anteriores', account_code: '37050501', default: '37050501' },
  { key: 'accounting_employee_salaries', description: 'Salarios de Empleados', account_code: '250505', default: '250505' },
  { key: 'accounting_employee_advance', description: 'Anticipo Empleados', account_code: '13301505', default: '13301505' },
  // ROUNDING ADJUSTMENT
  { key: 'finance_rounding_income', description: 'Ingreso por ajuste de redondeo', account_code: '421095', default: '421095' },
  { key: 'finance_rounding_expense', description: 'Gasto por ajuste de redondeo', account_code: '530595', default: '530595' },
  // FIXED ASSETS
  { key: 'fixed_asset_default', description: 'Activo Fijo por Defecto', account_code: '152005', default: '152005' },
  { key: 'accumulated_depreciation', description: 'Depreciacion Acumulada', account_code: '159205', default: '159205' },
  { key: 'depreciation_expense', description: 'Gasto de Depreciacion', account_code: '516005', default: '516005' },
];

export async function seedAccountingConfig(prisma: PrismaClient) {
  console.log('Seeding Accounting Configs...');

  for (const config of ACCOUNTING_CONFIGS) {
    await prisma.accountingConfig.upsert({
      where: { key: config.key },
      update: {
        description: config.description,
        account_code: config.account_code || null,
        default: config.default || null,
      },
      create: {
        key: config.key,
        description: config.description,
        account_code: config.account_code || null,
        default: config.default || null,
      },
    });
  }

  console.log(`   ${ACCOUNTING_CONFIGS.length} configuraciones creadas`);
}
