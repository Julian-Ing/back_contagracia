# Bank Movements (Movimientos Bancarios)

## Fecha: 2026-02-05

## Descripción

Sistema de registro de movimientos bancarios que rastrea todas las transacciones en cuentas bancarias y cajas.

## Modelos Prisma

### BankMovementType

Catálogo de tipos de movimientos bancarios (34 tipos).

```prisma
model BankMovementType {
  key         String @id
  description String

  movements BankMovement[]

  @@map("bank_movement_types")
}
```

### BankMovement

Registro de cada movimiento en una cuenta bancaria o caja.

```prisma
model BankMovement {
  id                    String   @id @default(uuid())
  bank_account_id       String
  consecutive           String   // MB-0001
  transaction_date      DateTime @db.Date
  amount                Decimal  @db.Decimal(19, 4)
  type_key              String
  description           String?
  reference_id          String?  // UUID del documento origen
  reference_type        String?  // Tipo: 'journal_entry', 'payment', etc.
  reference_consecutive String   @default("Movimiento desconocido")
  created_at            DateTime @default(now())

  bank_account BankAccount      @relation(...)
  type         BankMovementType @relation(...)

  @@map("bank_movements")
}
```

## Tipos de Movimientos (34 tipos)

### Cobros (Ingresos)
| Key | Descripción |
|-----|-------------|
| `invoice_receivable_payment` | Cobros de Factura de Venta |
| `invoice_debit_note_receivable_payment` | Cobros a Nota Débito |
| `expense_return_receivable_payment` | Cobros a Devoluciones de Gastos |
| `purchase_return_receivable_payment` | Cobros a Devoluciones de Compras |
| `manual_receivable_payment` | Cobros a Documentos Manuales CxC |
| `client_prepayment` | Anticipo de clientes |
| `supplier_prepayment_refund` | Reembolso Anticipo de proveedores |
| `fixed_asset_sale` | Venta de Activo Fijo |

### Pagos (Egresos)
| Key | Descripción |
|-----|-------------|
| `invoice_credit_note_payable_payment` | Abonos a Nota Crédito |
| `expense_payable_payment` | Abonos a Gastos |
| `purchase_payable_payment` | Abonos a Compras |
| `manual_payable_payment` | Abonos a Documentos Manuales CxP |
| `supplier_prepayment` | Anticipo de proveedores |
| `client_prepayment_refund` | Reembolso Anticipo de clientes |
| `travel_expense_advance` | Anticipo gastos de viaje |
| `tax_payable` | Pago de Impuestos |
| `tax_payable_iva` | Pago de IVA |
| `tax_payable_inc` | Pago de INC |
| `tax_payable_retefuente` | Pago de Retefuente |
| `tax_payable_reteiva` | Pago de ReteIVA |
| `tax_payable_reteica` | Pago de ReteICA |
| `payroll` | Pago de Nómina |
| `liquidation_service_bonus` | Pago de Primas |
| `liquidation_severance` | Pago de Cesantías |
| `liquidation_vacation` | Pago de Vacaciones |
| `liquidation_end_contract` | Pago Liquidación de Contrato |

### Recibos y Comprobantes
| Key | Descripción |
|-----|-------------|
| `invoice_voucher` | Recibo de Caja |
| `expense_voucher` | Comprobante de Egreso |

### Bancarios
| Key | Descripción |
|-----|-------------|
| `bank_transfer` | Transferencia Bancaria |
| `bank_adjustment` | Ajuste Bancario |
| `bank_account_opening` | Saldo Inicial Bancario |
| `bank_reconciliation_adjustment` | Ajuste por Conciliación |

### Manuales
| Key | Descripción |
|-----|-------------|
| `manual` | Movimiento Manual |
| `reversal` | Reversión |

## Consecutivo

Se agregó el tipo de consecutivo `bank_movement`:
- **Prefijo**: `MB`
- **Descripción**: Movimiento Bancario
- **Ejemplo**: MB-0001, MB-0002, etc.

## Precisión Decimal

El campo `amount` usa `Decimal(19, 4)` para soportar:
- Hasta 15 dígitos enteros
- 4 decimales de precisión

## Archivos Modificados

- `prisma/schema-tenant.prisma` - Modelos BankMovementType y BankMovement
- `prisma/seeds/seed-bank-movement-types.ts` - Seeder de 34 tipos
- `prisma/seeds/consecutiveTypes.ts` - Agregado tipo `bank_movement`
- `prisma/seeds/seed.ts` - Importación del seeder
- `prisma/scripts/seed-all-tenants.ts` - Replicación a tenants

## Relación con Journal Entries

Los movimientos bancarios se crean automáticamente cuando:
1. Un asiento contable tiene líneas en cuentas 1110* (bancos) o 1105* (caja)
2. Se registra un pago/cobro
3. Se hace una transferencia bancaria
4. Se registra un ajuste bancario

El campo `reference_id` y `reference_type` permiten rastrear el documento origen.
