# Tablas Contables: JournalEntryType y ArApSource

## JournalEntryType (journal_entry_types)
Tipos de asientos contables. **61 registros seed**.

| key | description |
|-----|-------------|
| invoice | Facturas de Venta |
| invoice_receivable_payment | Cobros de Factura |
| purchase | Compras |
| expense | Gastos |
| manual | Asiento Manual |
| ... | (61 tipos en total) |

**Seed:** `prisma/seeds/seed-journal-entry-types.ts`

## ArApSource (ar_ap_sources)
Fuentes de CxC/CxP. **7 registros seed**.

| key | description |
|-----|-------------|
| invoice | Factura de Venta |
| purchase | Compra |
| expense | Gasto |
| invoice_credit_note | Nota Crédito de Venta |
| invoice_debit_note | Nota Débito de Venta |
| purchase_devolution | Devolución de Compra |
| expense_devolution | Devolución de Gasto |

**Seed:** `prisma/seeds/seed-ar-ap-sources.ts`

## Migraciones
- `20260131141911_add_journal_entry_types`
- `20260131152343_add_ar_ap_sources`
