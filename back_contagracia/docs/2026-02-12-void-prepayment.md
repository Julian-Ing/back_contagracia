# Feature: voidPrepayment — Anular anticipo

**Fecha:** 2026-02-12

## Proposito

Anular un anticipo completo, reversando su asiento contable y creando un movimiento bancario inverso si aplica.

## Endpoint

`POST /prepayments/:id/void`

### Body

```json
{
  "void_date": "2026-02-12",
  "reason": "Error en el registro del anticipo"
}
```

### Response

```json
{
  "id": "uuid",
  "status": "VOIDED",
  "voided_at": "2026-02-12",
  "voided_reason": "Error en el registro del anticipo",
  "reversal_entry_id": "uuid | null",
  "reversal_entry_consecutive": "AC-000123 | null"
}
```

## Permiso

- Backend: el controller pasa `req.user.user_id` como `voided_by`
- Frontend: `can('prepayments.void')` controla visibilidad del boton "Anular"
- Seeder: `prepayments.cancel` renombrado a `prepayments.void` en `ar_ap.ts`

## Logica

1. Validar que el anticipo este en estado `ACTIVE`
2. Validar que **NO** tenga `PrepaymentMovements` activos (no anulados)
3. Validar periodo contable abierto para `void_date` (solo si tiene modulo contable)
4. Si tiene `journal_entry_id` → `reverseJournalEntry()` (funcion standalone)
5. Si tiene `bank_account_id` → crear movimiento bancario **inverso** con `createBankMovement`:
   - `type_key: 'reversal'`
   - Direccion invertida: CLIENT original INCOME → EXPENSE, SUPPLIER/EMPLOYEE original EXPENSE → INCOME
   - **NO se reversa** el movimiento bancario original, se crea uno nuevo inverso
6. Marcar anticipo: `status = VOIDED`, `balance = 0`, `voided_at`, `voided_reason`, `voided_by`

## Cambios en schema

Campos agregados a `Prepayment`:

```prisma
voided_at       DateTime?
voided_reason   String?
voided_by       String?
```

Aplicado con `migrate-all-tenants.ts --force` (prisma db push a todos los tenants).

## Seeders

- `ar_ap.ts`: `prepayments.cancel` → `prepayments.void`
- Aplicado con `prisma db seed` (master) + `seed-all-tenants.ts --force` (tenants)
- La accion obsoleta `prepayments.cancel` fue eliminada automaticamente por el seed

## Cliente Prisma

- `npx prisma generate --schema=./prisma/schema-tenant.prisma` ejecutado para regenerar el cliente

## Frontend

### VoidPrepaymentModal (nuevo)
- Modal de confirmacion con:
  - DatePicker para fecha de anulacion (requerida)
  - Textarea para razon de anulacion (opcional)
  - Nota: "El periodo contable de esta fecha debe estar abierto"
  - Boton destructive con loading state
  - try/catch con `toast.error` (errores del backend: periodo cerrado, movimientos activos, etc.)
  - `toast.success` en exito
  - Refresca detalle y lista principal via `onSuccess`

### Modal de detalle
- Boton "Anular" (rojo, con icono Ban) visible solo si `can('prepayments.void') && status === 'ACTIVE'`
- Seccion "Anticipo anulado" (card con borde rojo) con fecha, razon y usuario
- Prop `onSuccess` para refrescar la lista principal despues de anular

### Tabla principal
- Cuando status es VOIDED, muestra fecha y razon debajo del badge de estado
- Pasa `onSuccess={list.refetch}` al modal de detalle

### Servicio frontend
- `prepaymentsService.voidPrepayment(id, { void_date, reason })` agregado

### Types
- `PrepaymentItem` y `PrepaymentDetailData` incluyen `voided_at`, `voided_reason`, `voided_by`

## Archivos modificados

### Backend
- `contagracia-shared-modules/prisma/schema-tenant.prisma` — campos voided en Prepayment
- `contagracia-shared-modules/prisma/seeds/modules/actions/ar_ap.ts` — prepayments.cancel → prepayments.void
- `accounting-service/src/modules/prepayments/prepayments.service.ts` — implementacion voidPrepayment + campos voided en findAll
- `accounting-service/src/modules/prepayments/prepayments.controller.ts` — void_date y voided_by en body

### Frontend
- `src/modules/ar-ap/types.ts` — voided_at, voided_reason, voided_by
- `src/modules/ar-ap/services/prepayments.service.ts` — voidPrepayment method
- `src/app/dashboard/prepayments/VoidPrepaymentModal.tsx` — **nuevo** modal de confirmacion
- `src/app/dashboard/prepayments/PrepaymentDetailModal.tsx` — boton anular + seccion anulado + onSuccess
- `src/app/dashboard/prepayments/page.tsx` — info anulacion en tabla + onSuccess al modal
