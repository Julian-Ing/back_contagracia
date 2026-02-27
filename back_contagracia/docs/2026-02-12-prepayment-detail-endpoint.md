# Feature: endpoint de detalle de anticipo

**Fecha:** 2026-02-12

## Cambios

### Backend
- `prepayments.service.ts` → nuevo método `findOne(companyId, id)`
  - Retorna anticipo con relaciones: third_party, account, counterpart_account, bank_account, company_payment_method
  - Incluye movements ordenados por fecha descendente con applied_source
  - Convierte Decimal a Number en original_amount, balance y movement.amount
- `prepayments.controller.ts` → nuevo `@Get(':id')` antes de las rutas `@Post(':id/...')`

## Archivo
- `prepayments.service.ts` → `findOne`
- `prepayments.controller.ts` → `@Get(':id')`
