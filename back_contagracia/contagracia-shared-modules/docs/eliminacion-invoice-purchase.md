# Eliminacion de Tablas Invoice y Purchase

## Descripcion
Se eliminaron las tablas `invoices`, `invoice_items`, `purchases` y `purchase_items` del schema tenant porque seran reemplazadas por la tabla unificada `documents`.

## Tablas Eliminadas

| Tabla | Razon |
|-------|-------|
| invoices | Sera parte de `documents` con doc_type='invoice' |
| invoice_items | Sera parte de `document_items` |
| purchases | Sera parte de `documents` con doc_type='purchase' |
| purchase_items | Sera parte de `document_items` |

## Enums Eliminados

| Enum | Razon |
|------|-------|
| InvoiceStatus | Solo se usaba en Invoice |
| PaymentStatus | Solo se usaba en Invoice |
| PurchaseStatus | Solo se usaba en Purchase |

## Relaciones Eliminadas

En `ThirdParty`:
- `invoices_as_client` -> Invoice[]
- `purchases_as_supplier` -> Purchase[]

En `Product`:
- `invoice_items` -> InvoiceItem[]
- `purchase_items` -> PurchaseItem[]

## Nueva Estructura (Pendiente)
La tabla `documents` unificara:
- Facturas (invoice)
- Compras (purchase)
- Gastos (expense)
- Cotizaciones (quote)
- Ordenes de compra (purchase_order)

Ver `schema.html` tab Documentos para la estructura completa.

## Archivo Modificado
- `prisma/schema-tenant.prisma`
