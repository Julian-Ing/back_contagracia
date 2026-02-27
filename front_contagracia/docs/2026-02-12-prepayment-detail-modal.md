# Feature: modal de detalle de anticipo + condicional contabilidad

**Fecha:** 2026-02-12

## Cambios

### Tipos
- `types.ts` → nuevos tipos `PrepaymentMovementItem` y `PrepaymentDetailData`

### Servicio
- `prepayments.service.ts` → nuevo método `getById(id)`

### Modal de detalle (`PrepaymentDetailModal.tsx`)
- Se abre al hacer clic en una fila de la tabla principal
- Muestra: monto/saldo con barra de progreso, fecha, tercero, banco, metodo de pago, notas
- **Condicional contabilidad** (`useCompanyModules` → `hasModule('accounting')`): oculta cuenta anticipo, contrapartida y boton de asiento si no tiene modulo contable
- **Permiso movimientos**: `can('prepayments.view')` para mostrar seccion de movimientos
- **Permiso asiento**: `can('journal_entries.view_detail')` + `hasAccounting` para boton y modal de asiento
- Asiento contable se abre como modal usando `JournalEntryDetail` con `mode="modal"`

### Tabla principal (`page.tsx`)
- `useCompanyModules` → columnas "Cuenta" y "Cuenta de cruce" condicionales a `hasAccounting`
- Filas clickeables → abren `PrepaymentDetailModal`

## Archivos
- `front_contagracia/src/modules/ar-ap/types.ts`
- `front_contagracia/src/modules/ar-ap/services/prepayments.service.ts`
- `front_contagracia/src/app/dashboard/prepayments/page.tsx`
- `front_contagracia/src/app/dashboard/prepayments/PrepaymentDetailModal.tsx` (nuevo)
