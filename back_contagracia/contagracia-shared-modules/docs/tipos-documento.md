# Tipos de Documento (DocType)

## Descripcion

El enum `DocType` define todos los tipos de documentos del sistema. Se eliminó `DocSubtype` para simplificar - ahora cada tipo de documento tiene su propio valor en el enum.

## Enum DocType (17 tipos)

### Facturas de Venta
| Tipo | Descripcion | Prefijo |
|------|-------------|---------|
| INVOICE | Factura de venta | FV |
| INVOICE_CREDIT_NOTE | Nota crédito venta | NC |
| INVOICE_DEBIT_NOTE | Nota débito venta | ND |
| INVOICE_POS | Factura POS | POS |
| INVOICE_RECURRENT | Factura recurrente | FVR |

### Compras
| Tipo | Descripcion | Prefijo |
|------|-------------|---------|
| PURCHASE | Compra | CO |
| PURCHASE_CREDIT_NOTE | Nota crédito compra | NCC |
| PURCHASE_RECURRENT | Compra recurrente | COR |

### Gastos
| Tipo | Descripcion | Prefijo |
|------|-------------|---------|
| EXPENSE | Gasto / Documento soporte | GA |
| EXPENSE_CREDIT_NOTE | Nota crédito gasto | NCG |
| EXPENSE_RECURRENT | Gasto recurrente | GAR |

### Cotizaciones
| Tipo | Descripcion | Prefijo |
|------|-------------|---------|
| QUOTE_INVOICE | Cotizacion de venta | CTV |
| QUOTE_CRM | Cotizacion CRM | CTC |
| QUOTE_INVOICE_RECURRENT | Cotizacion venta recurrente | CTVR |
| QUOTE_CRM_RECURRENT | Cotizacion CRM recurrente | CTCR |

### Ordenes de Compra
| Tipo | Descripcion | Prefijo |
|------|-------------|---------|
| PURCHASE_ORDER | Orden de compra | OC |
| PURCHASE_ORDER_RECURRENT | Orden de compra recurrente | OCR |

## Notas

- **Sin notas debito**: Solo `INVOICE` tiene nota débito. Compras y gastos solo tienen nota crédito.
- **Recurrentes**: Los tipos `*_RECURRENT` usan los campos `recurrent_name`, `recurrent_period` y `recurrent_is_active` en la tabla `documents`.
- **POS**: `INVOICE_POS` se vincula a sesiones de caja mediante `cash_movements`.

## Migracion desde sistema anterior

El sistema anterior usaba:
- `doc_type`: invoice, purchase, expense, quote, purchase_order
- `doc_subtype`: credit_note, debit_note, pos, invoice, crm, recurrent

Ahora todo está consolidado en un solo campo `doc_type`.

## Archivos

- `prisma/schema-tenant.prisma` - Enum DocType
- `docs/tipos-documento.md` - Esta documentacion
