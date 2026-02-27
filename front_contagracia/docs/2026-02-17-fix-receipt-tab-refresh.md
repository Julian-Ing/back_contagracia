# Fix: Recibos de Caja / Comprobantes de Egreso no refrescaban al cambiar de tab

## Problema

Al crear un Recibo de Caja (CxC) o Comprobante de Egreso (CxP), si el usuario estaba en la pestaña "Pendientes", la pestaña de "Recibos/Comprobantes" no se actualizaba con el nuevo registro. Tampoco se refrescaba al cambiar de tab.

## Causa raiz

1. **`usePaymentReceipts.ts`** — `fetchData()` tenia `if (!enabled) return;` al inicio. Cuando el usuario estaba en la pestaña "Pendientes", `enabled = false` para recibos, asi que `receipts.submitSearch()` en el callback `onSuccess` era un no-op.

2. **`handleTabChange`** en ambas paginas (CxC y CxP) solo re-fetchaba al cambiar a "Pendientes", pero NO al cambiar a "Recibos/Comprobantes".

## Archivos modificados

### `src/modules/ar-ap/hooks/usePaymentReceipts.ts`
- Removido `if (!enabled) return;` de `fetchData()` — ahora `submitSearch()` siempre ejecuta el fetch sin importar que tab este activo
- Removido `enabled` del array de dependencias de `useCallback`

### `src/app/dashboard/accounts-receivable/page.tsx`
- `handleTabChange` ahora llama `receipts.submitSearch()` al cambiar a tab "receipts"

### `src/app/dashboard/accounts-payable/page.tsx`
- `handleTabChange` ahora llama `receipts.submitSearch()` al cambiar a tab "vouchers"

## Resultado

- Al crear/editar/anular un recibo o comprobante, ambas pestanas se actualizan
- Al cambiar de tab, la data se refresca automaticamente
