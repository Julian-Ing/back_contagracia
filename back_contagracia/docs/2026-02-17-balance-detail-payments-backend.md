# Balance Detallado — Pagos Backend (Endpoints + Fixes)

**Fecha:** 2026-02-17

## Cambios

### Nuevos endpoints en ar-ap

1. **`GET /ar-ap/sources`** — Lista tipos de documento desde la tabla `ar_ap_sources`
   - Retorna `{ key, description }[]`
   - Usado en el frontend para el SearchableSelect de tipo de documento (NO hardcodeado)

2. **`GET /ar-ap/third-party/:thirdPartyId/payments`** — Pagos paginados de un tercero con filtros
   - Query params: `type`, `search`, `dateFrom`, `dateTo`, `sourceKey`, `paymentMethodId`, `page`, `limit`
   - Búsqueda fuzzy por consecutivo pago, descripción, consecutivo CxC/CxP, número doc origen
   - Filtro por tipo de documento (source_key de ar_ap_sources)
   - Filtro por método de pago (company_payment_method_id)
   - Retorna: `{ data, total, page, totalPages }`
   - Cada pago incluye: `ar_ap_consecutive`, `ar_ap_source_number`, `payment_method_name`, `source_description`, `receipt_id`, `receipt_consecutive`, `description`

### Campos agregados a getThirdPartyDetail

- Los pagos del endpoint existente `GET /ar-ap/third-party/:id/detail` ahora incluyen `ar_ap_consecutive` y `ar_ap_source_number`

### Fix en payment-receipts.service.ts

- `getDetail()`: Las líneas de tipo `CXC_CREATED` y `CXP_CREATED` ahora también resuelven el `ref_label` buscando en la tabla `ar_ap` (antes solo lo hacía para `DOC`)

### Schema

- `PaymentReceipt.date`: Cambiado de `DateTime` a `DateTime @db.Date` para almacenar solo fecha sin hora

### Otros

- `journal-entries.service.ts`: Comentario actualizado (sin cambio funcional)
- `README.md`: Formateo markdown mejorado (saltos de línea en bloques de código)
- `pnpm-lock.yaml`: Lockfile actualizado

## Archivos modificados

- `accounting-service/src/modules/ar-ap/ar-ap.controller.ts`
- `accounting-service/src/modules/ar-ap/ar-ap.service.ts`
- `accounting-service/src/modules/journal-entries/journal-entries.service.ts`
- `accounting-service/src/modules/payment-receipts/payment-receipts.service.ts`
- `contagracia-shared-modules/prisma/schema-tenant.prisma`
- `README.md`
