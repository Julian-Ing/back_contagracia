# Feature: refundPrepayment — Devolver anticipo

**Fecha:** 2026-02-12

## Propósito

Devolver el saldo completo de un anticipo al tercero, creando un asiento contable y movimiento bancario inverso si aplica.

## Endpoint

`POST /prepayments/:id/refund`

### Body

```json
{
  "date": "2026-02-12",
  "reason": "Devolución solicitada por el cliente"
}
```

### Response

```json
{
  "id": "uuid",
  "status": "REFUNDED",
  "refund_amount": 500000,
  "refunded_at": "2026-02-12",
  "refunded_reason": "Devolución solicitada por el cliente",
  "journal_entry_id": "uuid | null",
  "journal_entry_consecutive": "AC-000456 | null"
}
```

## Permiso

- Backend: el controller pasa `req.user.user_id` como `refunded_by`
- Frontend: `can('prepayments.refund')` controla visibilidad del botón "Devolver"
- Seeder: `prepayments.refund` ya existía en `ar_ap.ts`

## Lógica

1. Validar que el anticipo esté en estado `ACTIVE`
2. Obtener el `balance` completo como monto a devolver (siempre devolución total)
3. Validar periodo contable abierto para `date` (solo si tiene módulo contable)
4. Resolver cuenta de contrapartida (del banco si tiene, o la original)
5. Si tiene módulo contable y cuentas → crear asiento contable:
   - CLIENT: DB cuenta anticipo / CR contrapartida (inverso al original)
   - SUPPLIER/EMPLOYEE: CR cuenta anticipo / DB contrapartida (inverso al original)
   - `type_key`: `client_prepayment_refund` | `supplier_prepayment_refund` | `employee_prepayment_refund`
6. Si tiene `bank_account_id` → crear movimiento bancario:
   - CLIENT: `direction = EXPENSE` (devolvemos dinero al cliente)
   - SUPPLIER/EMPLOYEE: `direction = INCOME` (nos devuelven el dinero)
   - `type_key`: mismo que el asiento
7. Marcar anticipo: `status = REFUNDED`, `balance = 0`, `refunded_at`, `refunded_reason`, `refunded_by`

## Diferencia con voidPrepayment

| | voidPrepayment | refundPrepayment |
|---|---|---|
| **Cuándo** | Sin movimientos aplicados | Anticipo ACTIVE con saldo |
| **Asiento** | Reversa el asiento original | Crea asiento nuevo (tipo refund) |
| **Banco** | Movimiento inverso tipo `reversal` | Movimiento nuevo tipo `*_prepayment_refund` |
| **Balance** | Pone balance en 0 | Pone balance en 0 |
| **Status** | VOIDED | REFUNDED |
| **No crea** | PrepaymentMovement | PrepaymentMovement |

## Cambios en schema

Campos agregados a `Prepayment`:

```prisma
refunded_at       DateTime?
refunded_reason   String?
refunded_by       String?
```

Aplicado con `migrate-all-tenants.ts --force` (prisma db push a todos los tenants).

## Cliente Prisma

- `npx prisma generate --schema=./prisma/schema-tenant.prisma` ejecutado para regenerar el cliente

## Frontend

### RefundPrepaymentModal (nuevo)
- Modal de confirmación con:
  - Muestra el saldo completo a devolver
  - DatePicker para fecha de devolución (requerida)
  - Textarea para razón de devolución (opcional)
  - Nota: "El periodo contable de esta fecha debe estar abierto"
  - Botón amber con loading state
  - try/catch con `toast.error` (errores del backend: periodo cerrado, etc.)
  - `toast.success` en éxito
  - Refresca detalle y lista principal via `onSuccess`

### Modal de detalle
- Botón "Devolver" (amber, icono RotateCcw) visible solo si `can('prepayments.refund') && status === 'ACTIVE'`
- Sección "Anticipo devuelto" (card con borde amber) con fecha, razón y usuario
- Prop `onSuccess` para refrescar la lista principal después de devolver

### Tabla principal
- Cuando status es REFUNDED, muestra fecha y razón debajo del badge de estado

### Servicio frontend
- `prepaymentsService.refundPrepayment(id, { date, reason })` agregado

### Types
- `PrepaymentItem` y `PrepaymentDetailData` incluyen `refunded_at`, `refunded_reason`, `refunded_by`

## applyPrepayment removido

Se eliminó `ApplyPrepaymentDto`, el método `applyPrepayment` del service y el endpoint `POST :id/apply` del controller.
La aplicación de anticipos contra documentos CxC/CxP se hace directamente con `createPrepaymentMovement` desde el contexto donde se necesite (recibos de pago, líneas PREP_USED, etc.), no como endpoint standalone.

## Archivos modificados

### Backend
- `contagracia-shared-modules/prisma/schema-tenant.prisma` — campos refunded en Prepayment
- `accounting-service/src/modules/prepayments/prepayments.service.ts` — implementación refundPrepayment + campos refunded en findAll
- `accounting-service/src/modules/prepayments/prepayments.controller.ts` — date, reason y refunded_by en body

### Frontend
- `src/modules/ar-ap/types.ts` — refunded_at, refunded_reason, refunded_by
- `src/modules/ar-ap/services/prepayments.service.ts` — refundPrepayment method
- `src/app/dashboard/prepayments/RefundPrepaymentModal.tsx` — **nuevo** modal de confirmación
- `src/app/dashboard/prepayments/PrepaymentDetailModal.tsx` — botón devolver + sección devuelto
- `src/app/dashboard/prepayments/page.tsx` — info devolución en tabla
