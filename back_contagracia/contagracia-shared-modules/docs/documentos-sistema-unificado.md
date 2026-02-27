# Sistema de Documentos Unificado

## Descripcion
Se implemento el sistema unificado de documentos que maneja facturas, compras, gastos, cotizaciones y ordenes de compra en una sola tabla.

## Enums Agregados

```prisma
enum DocType {
  INVOICE        // Factura de venta
  PURCHASE       // Compra / Factura de compra
  EXPENSE        // Gasto / Documento soporte
  QUOTE          // Cotizacion
  PURCHASE_ORDER // Orden de compra
}

enum DocSubtype {
  CREDIT_NOTE // Nota credito / Devolucion
  DEBIT_NOTE  // Nota debito
  POS         // Factura POS
  INVOICE     // Cotizacion convertida a factura
  CRM         // CRM
  RECURRENT   // Recurrente
}

enum DocumentStatus {
  DRAFT   // Borrador
  PAID    // Pagado
  PENDING // Pendiente
}

enum PaymentType {
  CASH   // Contado
  CREDIT // Credito
}

enum SentToApi {
  NOT_SENT // No enviado
  SUCCESS  // Exito
  ERROR    // Error
}

enum OrderType {
  PURCHASE    // Compra
  EXPENSE     // Gasto
  FIXED_ASSET // Activo fijo
}
```

## Modelos Agregados

| Modelo | Tabla | Descripcion |
|--------|-------|-------------|
| ExpenseCategory | expense_categories | Categorias de gastos |
| CreditNoteDiscrepancyResponse | credit_note_discrepancy_responses | Conceptos NC Factura Electronica |
| CreditNoteDiscrepancyResponseSd | credit_note_discrepancy_responses_sd | Conceptos NC Documento Soporte |
| DebitNoteDiscrepancyResponse | debit_note_discrepancy_responses | Conceptos ND |
| Document | documents | Tabla unificada de documentos |
| DocumentItem | document_items | Lineas de documentos |
| DocumentItemTax | document_item_taxes | Impuestos por linea |
| DocumentWithholding | document_withholdings | Retenciones del documento |
| DocumentAttachment | document_attachments | Archivos adjuntos |
| DocumentAiu | document_aius | AIU (Administracion, Imprevistos, Utilidad) |
| DocumentReception | document_receptions | Recepciones de ordenes de compra |
| DocumentReceptionItem | document_reception_items | Lineas de recepcion |

## Estructura de Document

```prisma
model Document {
  // Tipo
  doc_type    DocType      // invoice, purchase, expense, quote, purchase_order
  doc_subtype DocSubtype?  // credit_note, debit_note, pos, etc.

  // Tercero
  third_party_id   String?
  third_party_name String?  // cache

  // Consecutivos
  consecutive     String?  // FV-0001, CO-0001, GA-0001
  external_number String?  // numero proveedor

  // Fechas
  doc_date   DateTime
  due_date   DateTime?
  issue_time DateTime?

  // Montos
  subtotal           Decimal
  total_discounts    Decimal
  total_taxes        Decimal
  total_withholdings Decimal
  net_amount         Decimal

  // Estado y Pago
  status       DocumentStatus
  payment_type PaymentType?

  // DIAN
  cufe, cude, qr_code_data, sent_to_api, api_response...

  // Especificos por tipo (ver schema completo)
}
```

## Campos por Tipo de Documento

### Invoice (Factura)
- `purchase_order_consecutive` - Consecutivo OC referenciada
- `purchase_order_date` - Fecha OC

### Expense (Gasto)
- `category_id` - FK expense_categories
- `deductible` - Es deducible
- `dian_cufe` - CUFE importado
- `importado_dian` - Fue importado de DIAN

### Quote (Cotizacion)
- `valid_from`, `valid_to` - Vigencia
- `accepted` - Fue aceptada
- `decision_token` - Token para decision
- `accepted_invoice_id` - Factura generada

### Purchase Order (Orden de Compra)
- `expected_delivery_date` - Fecha esperada
- `order_type` - purchase, expense, fixed_asset
- `generated_doc_id` - Documento generado
- `approved_by`, `approved_at` - Aprobacion
- `cancelled_by`, `cancelled_at`, `cancellation_reason` - Cancelacion

### Recurrente
- `recurrent_name` - Nombre
- `recurrent_period` - Periodo (1 month, 1 week)
- `recurrent_is_active` - Activo

## Self-Relations

```
Document (NC/ND) → referenced_doc_id → Document (original)
Document (Quote) → accepted_invoice_id → Document (Invoice)
Document (PO) → generated_doc_id → Document (Purchase/Expense)
```

## Flujo de Recepciones (OC)

1. Se crea orden de compra (doc_type = PURCHASE_ORDER)
2. Se registra recepcion parcial o total (document_receptions)
3. Se actualizan cantidades recibidas (quantity_received)
4. Se genera compra/gasto cuando se completa (generated_doc_id)

## Resolutions (Resoluciones DIAN)

```prisma
model Resolution {
  id               String   @id
  type_document_id String   // FK → type_documents
  prefix           String   // SETP, SEDS, etc.
  resolution       String   // 18760000001
  resolution_date  DateTime // Fecha resolución
  technical_key    String?  // Clave técnica DIAN
  range_from       BigInt   // Desde (1)
  range_to         BigInt   // Hasta (5000000)
  generated_to_date Int     // Generados hasta ahora
  date_from        DateTime? // Vigencia desde
  date_to          DateTime? // Vigencia hasta
  is_active        Boolean
}
```

Tipos de documento DIAN (type_documents):
- 01 = Factura Electrónica
- 91 = Nota Crédito
- 92 = Nota Débito
- 05 = Documento Soporte

## Archivo Modificado

- `prisma/schema-tenant.prisma`

## Migracion

```bash
pnpm prisma:generate
npx ts-node prisma/scripts/migrate-all-tenants.ts
```
