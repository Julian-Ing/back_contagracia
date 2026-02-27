# Anticipos, modales de recibos y permisos

**Fecha:** 2026-02-11

## Página de Anticipos

Se creó la página en blanco `/dashboard/prepayments` con:
- `ProtectedRoute` con permiso `prepayments.view`
- Header con ícono `DollarSign` (amber) y título "Anticipos"

## Entrada en sidebar

Se agregó "Anticipos" al grupo Cartera en `navigation.ts`:
- Ruta: `/dashboard/prepayments`
- Ícono: `DollarSign`
- Módulo: `ar_ap`
- Permiso: `prepayments.view`
- Posición: antes de "Métodos de Pago"

## Modales de Recibos de Caja / Comprobantes de Egreso

### CxC (`accounts-receivable/page.tsx`)
- Se agregó modal vacío "Nuevo Recibo de Caja" (`Dialog` max-w-4xl)
- Botón "Nuevo Recibo de Caja" abre el modal
- Botón "Generar cobro" en cada fila abre el modal
- Permiso cambiado de `ar.payments.register` a `payment_receipts.create`

### CxP (`accounts-payable/page.tsx`)
- Se agregó modal vacío "Nuevo Comprobante de Egreso" (`Dialog` max-w-4xl)
- Botón "Nuevo Comprobante de Egreso" abre el modal
- Botón "Generar pago" en cada fila abre el modal
- Permiso cambiado de `ap.payments.register` a `payment_receipts.create`

## Tipo actualizado

- `CanDeleteBankAccountResponse` → agregado `prepaymentsCount: number` para reflejar la nueva validación del backend
