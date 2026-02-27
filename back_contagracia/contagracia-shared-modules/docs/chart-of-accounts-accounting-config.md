# Plan Unico de Cuentas (PUC) y Configuracion Contable

## Descripcion General

Sistema de cuentas contables basado en el PUC colombiano con configuracion parametrica para mapear conceptos de negocio a cuentas contables.

## Modelos de Datos

### ChartOfAccount (Plan de Cuentas)

Tabla que almacena las cuentas contables siguiendo la estructura jerarquica del PUC colombiano.

```prisma
model ChartOfAccount {
  code        String      @id    // Codigo PUC (ej: "1", "11", "1105", "110505")
  name        String             // Nombre de la cuenta
  type        AccountType        // Tipo de cuenta (ASSET, LIABILITY, etc.)
  parent_code String?            // Codigo del padre (jerarquia)
  is_active   Boolean     @default(true)
}
```

**Jerarquia de codigos:**
- 1 digito: Clases (1-Activo, 2-Pasivo, 3-Patrimonio, etc.)
- 2 digitos: Grupos (11-Efectivo, 13-Deudores, etc.)
- 4 digitos: Cuentas (1105-Caja, 1110-Bancos, etc.)
- 6 digitos: Subcuentas (110505-Caja general, etc.)
- 8 digitos: Auxiliares

**Tipos de cuenta (AccountType):**
- `ASSET` - Activo (clase 1)
- `LIABILITY` - Pasivo (clase 2)
- `EQUITY` - Patrimonio (clase 3)
- `INCOME` - Ingresos (clase 4)
- `EXPENSE` - Gastos (clase 5)
- `COST` - Costos de venta (clase 6)
- `PRODUCTION_COST` - Costos de produccion (clase 7)
- `DEBTOR_ACCOUNTS` - Cuentas de orden deudoras (clase 8)
- `CREDITOR_ACCOUNTS` - Cuentas de orden acreedoras (clase 9)

### AccountingConfig (Configuracion Contable)

Tabla parametrica que mapea conceptos de negocio a cuentas contables.

```prisma
model AccountingConfig {
  key                  String   @id    // Identificador unico (ej: "sales_iva")
  description          String          // Descripcion del concepto
  account_code         String?         // Cuenta para configs simples
  debit_account_code   String?         // Cuenta debito (para nomina)
  credit_account_code  String?         // Cuenta credito (para nomina)
  default              String?         // Valor por defecto (configs simples)
  default_debit        String?         // Default debito (nomina)
  default_credit       String?         // Default credito (nomina)
}
```

**Tipos de configuracion:**

1. **Configuracion simple** (una sola cuenta):
   - Usa `account_code` y `default`
   - Ejemplo: `sales_iva`, `finance_cxc`, `inventory_products`

2. **Configuracion doble** (debito y credito - usado en nomina):
   - Usa `debit_account_code`, `credit_account_code`, `default_debit`, `default_credit`
   - Ejemplo: `payroll_salary`, `payroll_arl`, `payroll_eps_deduction`

## Modulos de Configuracion

### Sales (Ventas)
| Key | Descripcion | Cuenta |
|-----|-------------|--------|
| sales_iva | IVA Ventas | 24080501 |
| sales_reteiva | ReteIVA Ventas | 13551705 |
| sales_reteica | ReteICA Ventas | 13551809 |
| sales_retefuente | ReteFuente Ventas | 13551521 |
| sales_discounts | Descuentos | 53053501 |
| sales_customer_advance | Anticipo Cliente | 28050501 |

### Purchases (Compras)
| Key | Descripcion | Cuenta |
|-----|-------------|--------|
| purchases_iva | IVA Compras | 24081001 |
| purchases_reteiva | ReteIVA Compras | 23670101 |
| purchases_reteica | ReteICA Compras | 23680509 |
| purchases_retefuente | ReteFuente Compras | 23654001 |
| purchases_discounts | Descuentos | 41350502 |
| purchases_supplier_advance | Anticipo Proveedores | 13300501 |
| purchases_misc_expenses | Gastos Diversos | 52959505 |

### Inventory (Inventario)
| Key | Descripcion | Cuenta |
|-----|-------------|--------|
| inventory_service_revenue | Ingresos Servicios | 413506 |
| inventory_products | Inventario Productos | 143501 |
| inventory_product_revenue | Ingresos Productos | 41350501 |
| inventory_product_costs | Costos Productos | 61350501 |
| inventory_aiu_administration | AIU Administracion | 413507 |
| inventory_aiu_contingencies | AIU Imprevistos | 413508 |
| inventory_aiu_utility | AIU Utilidad | 413509 |

### Finance (Finanzas)
| Key | Descripcion | Cuenta |
|-----|-------------|--------|
| finance_cxc | Cuentas por Cobrar | 13050501 |
| finance_cxp | Cuentas por Pagar | 22050501 |
| finance_bank_account | Cuenta Bancos | 11100501 |
| finance_cash_account | Cuenta Cajas | 11050501 |
| finance_iva_payable | IVA por Pagar | 240808 |
| finance_inc_sales | INC en Ventas | 24950101 |
| finance_inc_payable | INC por Pagar | 24950105 |

### Accounting (Contabilidad)
| Key | Descripcion | Cuenta |
|-----|-------------|--------|
| accounting_social_capital | Capital Social | 310505 |
| accounting_iva_in_favor | IVA a Favor | 135519 |
| accounting_retained_earnings | Utilidades Retenidas | 360505 |
| accounting_previous_year_results | Resultados Anteriores | 37050501 |
| accounting_employee_salaries | Salarios Empleados | 250505 |
| accounting_employee_advance | Anticipo Empleados | 13301505 |

### Payroll (Nomina)

Los conceptos de nomina usan cuentas de debito y credito.

| Key | Descripcion | Debito | Credito |
|-----|-------------|--------|---------|
| payroll_salary | Salario | 510505 | 250505 |
| payroll_transportation_allowance | Auxilio Transporte | 513065 | 250505 |
| payroll_arl | ARL | 513005 | 237055 |
| payroll_eps_deduction | Deduccion Salud | 250505 | 237035 |
| payroll_pension_deduction | Deduccion Pension | 250505 | 237040 |
| payroll_ccf | Caja Compensacion | 513050 | 237060 |
| payroll_sena | SENA | 512545 | 237050 |
| payroll_icbf | ICBF | 143501 | 237045 |
| payroll_severance | Cesantias | 510600 | 250505 |
| payroll_service_bonus | Prima Servicios | 513060 | 250505 |
| payroll_vacation_provision | Provision Vacaciones | 530505 | 270515 |

## Seeds

### seed-puc.ts
Genera las 172 cuentas necesarias (solo las referenciadas en accounting configs + sus padres hasta nivel 1).

### seed-accounting-config.ts
Genera los 99 mapeos de configuracion contable.

## Uso

Las cuentas y configuraciones se replican automaticamente a cada tenant mediante:
- `seed-all-tenants.ts` - Seed inicial
- `tenant.service.ts` - Al crear nuevo tenant

## Scripts de Generacion

El archivo `C:\projects\py\generate_puc_seed.py` genera los seeds a partir de:
- Excel con PUC completo: `PUC_inicial.xlsx`
- Conceptos de contabilidad definidos en el script

Ejecutar:
```bash
cd C:\projects\py
source venv/Scripts/activate
python generate_puc_seed.py
```

Genera:
- `seed-puc.ts` - Solo cuentas necesarias + padres
- `seed-accounting-config.ts` - Configuraciones contables
