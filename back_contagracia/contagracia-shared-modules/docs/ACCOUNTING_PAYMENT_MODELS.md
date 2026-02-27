# Modelos Contables y de Pagos

## Fecha: 2026-01-31

## Resumen
Se agregaron los modelos para el sistema contable completo: asientos, cuentas por cobrar/pagar, recibos de pago, pagos y anticipos.

## Modelos Agregados

### JournalEntry (journal_entries)
Asientos contables.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| consecutive | String? | Consecutivo automático (JE-0001) |
| date | DateTime | Fecha del asiento |
| description | String? | Descripción |
| type_key | String | FK a JournalEntryType |
| reference_id | String? | ID del documento origen |
| is_reversed | Boolean | Si está reversado |

### JournalEntryItem (journal_entry_items)
Líneas de asientos contables (débitos/créditos).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| account_code | String | FK a ChartOfAccount |
| type | String | 'debit' o 'credit' |
| amount | Decimal(19,4) | Monto |
| third_party_id | String? | FK a ThirdParty |
| bank_account_id | String? | FK a BankAccount |

### ArAp (ar_ap)
Cuentas por Cobrar y Pagar.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| type | String | 'receivable' o 'payable' |
| consecutive | String? | CXC-0001 / CXP-0001 |
| source_key | String | FK a ArApSource |
| source_id | String | ID del documento origen |
| source_number | String? | Número del documento origen |
| amount | Decimal(19,4) | Monto total |
| paid | Decimal(19,4) | Monto pagado |
| balance | Decimal(19,4) | Saldo pendiente |
| status | String | 'pending', 'partial', 'paid' |

### PaymentReceipt (payment_receipts)
Recibos de Caja (RC) y Comprobantes de Egreso (CE).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| type | String | 'receivable' (RC) o 'payable' (CE) |
| consecutive | String? | RC-0001 / CE-0001 |
| amount | Decimal(19,4) | Monto total |
| status | Int | 0=anulado, 1=activo |

### PaymentReceiptLine (payment_receipt_lines)
Líneas de recibos de pago.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| kind | String | 'doc', 'bank', 'account', 'prep_used' |
| account_code | String | FK a ChartOfAccount |
| debit | Decimal(19,4) | Débito |
| credit | Decimal(19,4) | Crédito |
| applied_to_source_key | String? | FK a ArApSource |
| applied_to_id | String? | ID del documento aplicado |

### Payment (payments)
Pagos aplicados a CxC/CxP.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| ar_ap_id | String | FK a ArAp |
| consecutive | String? | RP-0001 / PP-0001 |
| amount | Decimal(19,4) | Monto |
| company_payment_method_id | String? | FK a CompanyPaymentMethod |
| prepayment_id | String? | FK a Prepayment (si aplica anticipo) |

### Prepayment (prepayments)
Anticipos de clientes/proveedores.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| prepayment_type | String | 'client', 'supplier', 'eps', etc. |
| consecutive | String? | AT-0001 |
| original_amount | Decimal(19,4) | Monto original |
| balance | Decimal(19,4) | Saldo disponible |
| status | Int | 0=activo, 1=aplicado, 2=anulado |

### PrepaymentMovement (prepayment_movements)
Movimientos de aplicación de anticipos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| consecutive | String? | ATM-0001 |
| amount | Decimal(19,4) | Monto aplicado |
| applied_to_source_key | String? | FK a ArApSource |
| applied_to_id | String? | ID del documento aplicado |

### CompanyPaymentMethod (company_payment_methods)
Métodos de pago personalizados por empresa. Existe en master y tenant.

**Master:** Contiene los defaults que se replican a cada tenant.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| payment_method_code | String | Código DIAN (FK a PaymentMethod.code) |
| name | String | Nombre del método |
| description | String? | Descripción |

**Tenant:** Métodos personalizados de cada empresa.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| payment_method_id | String | FK a PaymentMethod.id |
| name | String | Nombre del método |
| description | String? | Descripción |

**Seed:** `prisma/seeds/companyPaymentMethods.ts` (se llama desde seed.ts)

## Consecutivos Automáticos
**PENDIENTE**: Implementar secuencias y triggers de PostgreSQL para generar consecutivos automáticamente en INSERT.

Prefijos esperados:
- JournalEntry: JE-0001
- ArAp receivable: CXC-0001
- ArAp payable: CXP-0001
- PaymentReceipt receivable: RC-0001
- PaymentReceipt payable: CE-0001
- Payment receivable: RP-0001
- Payment payable: PP-0001
- Prepayment: AT-0001
- PrepaymentMovement: ATM-0001

## Archivos Modificados
- `prisma/schema-tenant.prisma` - Modelos agregados
- `prisma/scripts/seed-all-tenants.ts` - Seed de CompanyPaymentMethod
- `prisma/seeds/companyPaymentMethods.ts` - Datos seed
