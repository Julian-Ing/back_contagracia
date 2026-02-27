# ArApSources - Nomina y Viaticos

## Descripcion
Se agregaron dos nuevos tipos de origen para cuentas por cobrar/pagar: nomina y viaticos.

## Cambios

### Antes (7 sources)
```typescript
export const arApSources = [
  { key: 'invoice', description: 'Factura de Venta' },
  { key: 'purchase', description: 'Compra' },
  { key: 'expense', description: 'Gasto' },
  { key: 'invoice_credit_note', description: 'Nota Credito de Venta' },
  { key: 'invoice_debit_note', description: 'Nota Debito de Venta' },
  { key: 'purchase_devolution', description: 'Devolucion de Compra' },
  { key: 'expense_devolution', description: 'Devolucion de Gasto' },
];
```

### Despues (9 sources)
```typescript
export const arApSources = [
  { key: 'invoice', description: 'Factura de Venta' },
  { key: 'purchase', description: 'Compra' },
  { key: 'expense', description: 'Gasto' },
  { key: 'invoice_credit_note', description: 'Nota Credito de Venta' },
  { key: 'invoice_debit_note', description: 'Nota Debito de Venta' },
  { key: 'purchase_devolution', description: 'Devolucion de Compra' },
  { key: 'expense_devolution', description: 'Devolucion de Gasto' },
  { key: 'payroll', description: 'Nomina' },              // NUEVO
  { key: 'travel_expense', description: 'Viaticos' },     // NUEVO
];
```

## Uso

Estos sources se usan en:
- `ar_ap.source_key` - Origen de la cuenta por cobrar/pagar
- `payment_receipt_lines.applied_to_source_key` - Tipo de documento al que se aplica
- `prepayment_movements.applied_to_source_key` - Tipo de documento al que se aplica el anticipo

## Archivo Modificado

- `prisma/seeds/seed-ar-ap-sources.ts`

## Aplicar Cambios

```bash
pnpm prisma:seed
npx ts-node prisma/scripts/seed-all-tenants.ts --force
```
